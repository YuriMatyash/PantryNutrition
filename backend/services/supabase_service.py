"""Supabase service setup used by backend routes and agents."""

import base64
import hashlib
import hmac
import os
from datetime import datetime, timezone
from typing import Optional

from supabase import Client, create_client


class SupabaseConfigError(Exception):
    pass


class DuplicateUsernameError(Exception):
    pass


class SupabaseInsertError(Exception):
    pass


class SupabaseService:
    def __init__(self) -> None:
        self.url: str = os.getenv("SUPABASE_URL", "")
        self.key: str = os.getenv("SUPABASE_KEY", "")
        self._client: Optional[Client] = None

    def get_client(self) -> Client:
        if not self.url or not self.key:
            raise SupabaseConfigError(
                "Supabase is not configured. Missing SUPABASE_URL or SUPABASE_KEY in backend/.env."
            )
        if self._client is None:
            self._client = create_client(self.url, self.key)
        return self._client

    def hash_password(self, password: str) -> str:
        salt = os.urandom(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"

    def verify_password(self, plain_password: str, stored_hash: str) -> bool:
        try:
            salt_b64, digest_b64 = stored_hash.split("$", maxsplit=1)
            salt = base64.b64decode(salt_b64)
            expected_digest = base64.b64decode(digest_b64)
        except Exception:
            return False

        actual_digest = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(actual_digest, expected_digest)

    def find_user_by_username(self, username: str) -> Optional[dict]:
        client = self.get_client()
        result = client.table("users").select("id, username, password_hash").eq("username", username).limit(1).execute()
        data = result.data or []
        return data[0] if data else None

    def create_user(self, username: str, password: str) -> dict:
        existing = self.find_user_by_username(username)
        if existing:
            raise DuplicateUsernameError("Username already exists.")

        client = self.get_client()
        password_hash = self.hash_password(password)

        try:
            result = client.table("users").insert({"username": username, "password_hash": password_hash}).execute()
            data = result.data or []
            if not data:
                print("[SupabaseService.create_user] Insert returned no rows.")
                raise SupabaseInsertError("Supabase insert returned no rows.")

            created = data[0]
            return {"user_id": created["id"], "username": created["username"]}
        except Exception as exc:
            print(f"[SupabaseService.create_user] Insert failed: {type(exc).__name__}: {exc}")
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
        result = client.table("pantries").select("items").eq("user_id", user_id).limit(1).execute()
        data = result.data or []
        return data[0].get("items", []) if data else []

    def save_pantry(self, user_id: str, items: list[dict]) -> list[dict]:
        client = self.get_client()
        payload = {"user_id": user_id, "items": items}
        result = client.table("pantries").upsert(payload, on_conflict="user_id").execute()
        data = result.data or []
        return data[0].get("items", items) if data else items

    def save_recipe(self, recipe_data: dict) -> dict:
        client = self.get_client()
        result = client.table("recipes").insert(recipe_data).execute()
        data = result.data or []
        if not data:
            raise SupabaseInsertError("Failed to save recipe.")
        return data[0]

    def list_user_recipes(self, user_id: str) -> list[dict]:
        client = self.get_client()
        result = client.table("recipes").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data or []

    def get_recipe_by_id(self, recipe_id: str, user_id: str) -> Optional[dict]:
        client = self.get_client()
        result = client.table("recipes").select("*").eq("id", recipe_id).eq("user_id", user_id).limit(1).execute()
        data = result.data or []
        return data[0] if data else None

    def delete_recipe(self, recipe_id: str, user_id: str) -> bool:
        recipe = self.get_recipe_by_id(recipe_id, user_id)
        if not recipe:
            return False
        client = self.get_client()
        client.table("recipes").delete().eq("id", recipe_id).eq("user_id", user_id).execute()
        return True

    def create_conversation(self, user_id: str, recipe_id: str | None = None) -> str:
        client = self.get_client()
        payload = {"user_id": user_id, "recipe_id": recipe_id, "messages": []}
        result = client.table("conversations").insert(payload).execute()
        data = result.data or []
        if not data:
            raise SupabaseInsertError("Failed to create conversation.")
        return data[0]["id"]

    def add_conversation_message(self, conversation_id: str, role: str, content: str) -> None:
        client = self.get_client()
        convo = client.table("conversations").select("messages").eq("id", conversation_id).limit(1).execute()
        data = convo.data or []
        if not data:
            return

        messages = data[0].get("messages", [])
        messages.append(
            {"role": role, "content": content, "created_at": datetime.now(timezone.utc).isoformat()}
        )
        client.table("conversations").update({"messages": messages}).eq("id", conversation_id).execute()

    def link_conversation_to_recipe(self, conversation_id: str, recipe_id: str) -> None:
        client = self.get_client()
        client.table("conversations").update({"recipe_id": recipe_id}).eq("id", conversation_id).execute()
