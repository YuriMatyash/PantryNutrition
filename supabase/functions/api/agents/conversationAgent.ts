import { addConversationMessage, createConversation, linkConversationToRecipe } from "../services/supabaseService.ts";

export async function startConversation(userId: string, userMessage: string): Promise<string> {
  const id = await createConversation(userId);
  await addConversationMessage(id, "user", userMessage);
  return id;
}

export async function completeConversation(conversationId: string, recipeId: string, assistantMessage: string): Promise<void> {
  await linkConversationToRecipe(conversationId, recipeId);
  await addConversationMessage(conversationId, "assistant", assistantMessage);
}
