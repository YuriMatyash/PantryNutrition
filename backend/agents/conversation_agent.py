"""Conversation agent for creating and updating conversation history."""

from services.supabase_service import SupabaseService


class ConversationAgent:
    def __init__(self, supabase_service: SupabaseService) -> None:
        self.supabase_service = supabase_service

    def create_conversation(self, user_id: str, recipe_id: str | None = None) -> str:
        return self.supabase_service.create_conversation(user_id=user_id, recipe_id=recipe_id)

    def add_message(self, conversation_id: str, role: str, content: str) -> None:
        self.supabase_service.add_conversation_message(
            conversation_id=conversation_id,
            role=role,
            content=content,
        )
