"""Supabase service setup used by backend routes and agents."""

import base64
import hashlib
import hmac
import os
from typing import Optional

from supabase import Client, create_client


class SupabaseConfigError(Exception):
    """Raised when required Supabase configuration is missing."""


class DuplicateUsernameError(Exception):
    """Raised when username already exists."""


class SupabaseInsertError(Exception):
    """Raised when Supabase insert operation fails."""


class SupabaseService:
    """Wrapper for Supabase client plus common database operations."""

    def __init__(self) -> None:
        self.url: str = os.getenv("SUPABASE_URL", "")
        self.key: str = os.getenv("SUPABASE_KEY", "")
        self._client: Optional[Client] = None

    def get_client(self) -> Client:
        """Create and cache a Supabase client instance."""
        if not self.url or not self.key:
            raise SupabaseConfigError(
                "Supabase is not configured. Missing SUPABASE_URL or SUPABASE_KEY in backend/.env."
            )

        if self._client is None:
            self._client = create_client(self.url, self.key)

        return self._client

    def hash_password(self, password: str) -> str:
        """Hash a password using PBKDF2 (salt + hash)."""
        salt = os.urandom(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"

    def verify_password(self, plain_password: str, stored_hash: str) -> bool:
        """Verify plain password against stored salt$hash string."""
        try:
            salt_b64, digest_b64 = stored_hash.split("$", maxsplit=1)
            salt = base64.b64decode(salt_b64)
            expected_digest = base64.b64decode(digest_b64)
        except Exception:
            return False

        actual_digest = hashlib.pbkdf2_hmac(
            "sha256", plain_password.encode("utf-8"), salt, 100_000
        )
        return hmac.compare_digest(actual_digest, expected_digest)

    def find_user_by_username(self, username: str) -> Optional[dict]:
        client = self.get_client()
        result = (
            client.table("users")
            .select("id, username, password_hash")
            .eq("username", username)
            .limit(1)
            .execute()
        )
        data = result.data or []
        return data[0] if data else None

    def create_user(self, username: str, password: str) -> dict:
        existing = self.find_user_by_username(username)
        if existing:
            raise DuplicateUsernameError("Username already exists.")

        client = self.get_client()
        password_hash = self.hash_password(password)

        try:
            result = (
                client.table("users")
                .insert({"username": username, "password_hash": password_hash})
                .execute()
            )
            data = result.data or []
            if not data:
                print("[SupabaseService.create_user] Insert returned no rows.")
                raise SupabaseInsertError("Supabase insert returned no rows.")

            created = data[0]
            return {"user_id": created["id"], "username": created["username"]}
        except DuplicateUsernameError:
            raise
        except SupabaseConfigError:
            raise
        except Exception as exc:
            # Safe debug log: print exception type + message only.
            print(
                f"[SupabaseService.create_user] Insert failed: {type(exc).__name__}: {exc}"
            )
            raise SupabaseInsertError("Failed to insert user into Supabase.")

    def verify_login(self, username: str, password: str) -> Optional[dict]:
        user = self.find_user_by_username(username)
        if not user:
            return None

        if not self.verify_password(password, user.get("password_hash", "")):
            return None

        return {"user_id": user["id"], "username": user["username"]}

    def user_exists(self, user_id: str) -> bool:
        client = self.get_client()
        result = client.table("users").select("id").eq("id", user_id).limit(1).execute()
        data = result.data or []
        return len(data) > 0

    def get_pantry(self, user_id: str) -> list[dict]:
        client = self.get_client()
        result = (
            client.table("pantries")
            .select("items")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        data = result.data or []
        if not data:
            return []
        return data[0].get("items", [])

    def save_pantry(self, user_id: str, items: list[dict]) -> list[dict]:
        client = self.get_client()
        payload = {"user_id": user_id, "items": items}
        result = client.table("pantries").upsert(payload, on_conflict="user_id").execute()
        data = result.data or []
        if not data:
            return items
        return data[0].get("items", items)
