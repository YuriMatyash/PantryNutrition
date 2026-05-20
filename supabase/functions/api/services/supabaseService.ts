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
