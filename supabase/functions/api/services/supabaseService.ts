import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashPassword, verifyPassword } from "../utils/crypto.ts";

export class SupabaseConfigError extends Error {}
export class DuplicateUsernameError extends Error {}

let cachedClient: SupabaseClient | null = null;

function getEnvOrThrow(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new SupabaseConfigError(`Missing required configuration: ${name}`);
  }
  return value;
}

function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = getEnvOrThrow("APP_SUPABASE_URL");
  const serviceRoleKey = getEnvOrThrow("APP_SUPABASE_SERVICE_ROLE_KEY");

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export async function createUser(username: string, password: string): Promise<{ user_id: string; username: string }> {
  const client = getClient();

  const { data: existingUser, error: existingError } = await client
    .from("users")
    .select("id")
    .eq("username", username)
    .limit(1)
    .maybeSingle();

  if (existingError) throw new Error("Failed to check existing user.");
  if (existingUser) throw new DuplicateUsernameError("Username already exists.");

  const password_hash = await hashPassword(password);

  const { data, error } = await client
    .from("users")
    .insert({ username, password_hash })
    .select("id, username")
    .single();

  if (error || !data) throw new Error("Failed to create user.");

  return { user_id: data.id as string, username: data.username as string };
}

export async function verifyLogin(username: string, password: string): Promise<{ user_id: string; username: string } | null> {
  const client = getClient();
  const { data, error } = await client
    .from("users")
    .select("id, username, password_hash")
    .eq("username", username)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const valid = await verifyPassword(password, String(data.password_hash ?? ""));
  if (!valid) return null;

  return { user_id: data.id as string, username: data.username as string };
}


export async function userExists(userId: string): Promise<boolean> {
  const client = getClient();
  const { data, error } = await client
    .from("users")
    .select("id")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to check user existence.");
  }

  return Boolean(data);
}

export async function getPantry(userId: string): Promise<Array<{ name: string; amount: number; unit: string }>> {
  const client = getClient();
  const { data, error } = await client
    .from("pantries")
    .select("items")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load pantry.");
  }

  const items = data?.items;
  return Array.isArray(items) ? (items as Array<{ name: string; amount: number; unit: string }>) : [];
}

export async function upsertPantry(
  userId: string,
  items: Array<{ name: string; amount: number; unit: string }>,
): Promise<Array<{ name: string; amount: number; unit: string }>> {
  const client = getClient();
  const { data, error } = await client
    .from("pantries")
    .upsert({ user_id: userId, items }, { onConflict: "user_id" })
    .select("items")
    .single();

  if (error || !data) {
    throw new Error("Failed to save pantry.");
  }

  const saved = data.items;
  return Array.isArray(saved) ? (saved as Array<{ name: string; amount: number; unit: string }>) : items;
}


export async function listUserRecipes(userId: string): Promise<Record<string, unknown>[]> {
  const client = getClient();
  const { data, error } = await client
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to list recipes.");
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export async function getRecipeById(recipeId: string, userId: string): Promise<Record<string, unknown> | null> {
  const client = getClient();
  const { data, error } = await client
    .from("recipes")
    .select("id, user_id, title, description, ingredients, instructions, servings, nutrition, tags, created_at, updated_at")
    .eq("id", recipeId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Failed to fetch recipe.");
  return data ? (data as Record<string, unknown>) : null;
}

export async function deleteRecipe(recipeId: string, userId: string): Promise<boolean> {
  const client = getClient();
  const recipe = await getRecipeById(recipeId, userId);
  if (!recipe) return false;

  const { error } = await client
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", userId);

  if (error) throw new Error("Failed to delete recipe.");
  return true;
}


export async function saveRecipe(userId: string, recipe: Record<string, unknown>): Promise<Record<string, unknown>> {
  const client = getClient();

  const payload = {
    user_id: userId,
    title: recipe.title,
    description: recipe.description ?? null,
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? [],
    servings: recipe.servings ?? 1,
    nutrition: recipe.nutrition ?? {},
    tags: recipe.tags ?? [],
  };

  const { data, error } = await client.from("recipes").insert(payload).select("*").single();

  if (error || !data) {
    if (String(Deno.env.get("APP_ENV") ?? "").toLowerCase() === "local") {
      console.error("[saveRecipe] Supabase insert failed", {
        insert_keys: Object.keys(payload),
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
    }
    throw new Error("Failed to save recipe to Supabase.");
  }

  return data as Record<string, unknown>;
}

export async function createConversation(userId: string): Promise<string> {
  const client = getClient();
  const { data, error } = await client
    .from("conversations")
    .insert({ user_id: userId, recipe_id: null, messages: [] })
    .select("id")
    .single();
  if (error || !data) throw new Error("Failed to create conversation.");
  return String((data as Record<string, unknown>).id);
}

export async function addConversationMessage(conversationId: string, role: string, content: string): Promise<void> {
  const client = getClient();
  const { data, error } = await client.from("conversations").select("messages").eq("id", conversationId).limit(1).maybeSingle();
  if (error) throw new Error("Failed to load conversation.");
  const messages = Array.isArray((data as Record<string, unknown> | null)?.messages)
    ? ([...(data as Record<string, unknown>).messages as Array<Record<string, unknown>>])
    : [];
  messages.push({ role, content, created_at: new Date().toISOString() });
  const { error: updateError } = await client
    .from("conversations")
    .update({ messages, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (updateError) throw new Error("Failed to update conversation.");
}

export async function linkConversationToRecipe(conversationId: string, recipeId: string): Promise<void> {
  const client = getClient();
  const { error } = await client
    .from("conversations")
    .update({ recipe_id: recipeId, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) throw new Error("Failed to link conversation.");
}


export async function updateRecipe(recipeId: string, userId: string, recipePayload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const client = getClient();
  const updates = {
    title: recipePayload.title,
    description: recipePayload.description ?? null,
    ingredients: recipePayload.ingredients ?? [],
    instructions: recipePayload.instructions ?? [],
    servings: recipePayload.servings ?? 1,
    nutrition: recipePayload.nutrition ?? {},
    tags: recipePayload.tags ?? [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("recipes")
    .update(updates)
    .eq("id", recipeId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) throw new Error("Failed to update recipe.");
  return data as Record<string, unknown>;
}

export async function getConversationByRecipe(recipeId: string, userId: string): Promise<Record<string, unknown> | null> {
  const client = getClient();
  const { data, error } = await client
    .from("conversations")
    .select("id, user_id, recipe_id, messages")
    .eq("recipe_id", recipeId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Failed to load recipe conversation.");
  return data ? (data as Record<string, unknown>) : null;
}

export async function getOrCreateRecipeConversation(recipeId: string, userId: string): Promise<string> {
  const existing = await getConversationByRecipe(recipeId, userId);
  if (existing?.id) return String(existing.id);
  const conversationId = await createConversation(userId);
  await linkConversationToRecipe(conversationId, recipeId);
  return conversationId;
}
