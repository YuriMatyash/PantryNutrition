import { cleanPantryItems, PantryValidationError } from "../agents/pantryAgent.ts";
import { getPantry, SupabaseConfigError, upsertPantry, userExists } from "../services/supabaseService.ts";
import { errorResponse, jsonResponse } from "../utils/response.ts";

function getUserIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/users\/([^/]+)\/pantry$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function handleGetPantry(pathname: string, origin: string | null): Promise<Response> {
  const userId = getUserIdFromPath(pathname);
  if (!userId) return errorResponse("Not found", 404, origin);

  try {
    const exists = await userExists(userId);
    if (!exists) return errorResponse("User does not exist.", 404, origin);

    const items = await getPantry(userId);
    return jsonResponse({ items }, 200, {}, origin);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return errorResponse("Server configuration error.", 500, origin);
    }
    return errorResponse("Failed to load pantry.", 500, origin);
  }
}

export async function handlePutPantry(req: Request, pathname: string, origin: string | null): Promise<Response> {
  const userId = getUserIdFromPath(pathname);
  if (!userId) return errorResponse("Not found", 404, origin);

  let payload: { items?: unknown };
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid pantry payload.", 400, origin);
  }

  try {
    const exists = await userExists(userId);
    if (!exists) return errorResponse("User does not exist.", 404, origin);

    const cleanedItems = cleanPantryItems(payload.items ?? []);
    const savedItems = await upsertPantry(userId, cleanedItems);
    return jsonResponse({ items: savedItems }, 200, {}, origin);
  } catch (error) {
    if (error instanceof PantryValidationError) {
      return errorResponse(error.message, 400, origin);
    }
    if (error instanceof SupabaseConfigError) {
      return errorResponse("Server configuration error.", 500, origin);
    }
    return errorResponse("Failed to save pantry.", 500, origin);
  }
}
