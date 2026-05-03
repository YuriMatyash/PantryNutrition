"""Supabase service setup used by backend routes and agents."""

import os
from typing import Optional

from supabase import Client, create_client


class SupabaseService:
    """Small wrapper around Supabase client creation."""

    def __init__(self) -> None:
        self.url: str = os.getenv("SUPABASE_URL", "")
        self.key: str = os.getenv("SUPABASE_KEY", "")
        self._client: Optional[Client] = None

    def get_client(self) -> Client:
        """Create and cache a Supabase client instance."""
        if not self.url or not self.key:
            raise ValueError(
                "Missing SUPABASE_URL or SUPABASE_KEY. "
                "Set them in backend/.env before using Supabase."
            )

        if self._client is None:
            self._client = create_client(self.url, self.key)

        return self._client
