import {
  deleteRecipe,
  getRecipeById,
  listUserRecipes,
  SupabaseConfigError,
  userExists,
} from "../services/supabaseService.ts";
import { errorResponse, jsonResponse } from "../utils/response.ts";

function extractUserId(pathname: string): string | null {
  const userRecipesMatch = pathname.match(/^\/api\/users\/([^/]+)\/recipes$/);
  if (userRecipesMatch) return decodeURIComponent(userRecipesMatch[1]);
  return null;
}

function extractRecipeId(pathname: string): string | null {
  const recipeMatch = pathname.match(/^\/api\/recipes\/([^/]+)$/);
  if (recipeMatch) return decodeURIComponent(recipeMatch[1]);
  return null;
}

export async function handleListRecipes(pathname: string, origin: string | null): Promise<Response> {
  const userId = extractUserId(pathname);
  if (!userId) return errorResponse("Not found", 404, origin);

  try {
    const exists = await userExists(userId);
    if (!exists) return errorResponse("User does not exist.", 404, origin);

    const recipes = await listUserRecipes(userId);
    return jsonResponse(recipes, 200, {}, origin);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return errorResponse("Server configuration error.", 500, origin);
    }
    return errorResponse("Failed to list recipes.", 500, origin);
  }
}

export async function handleGetRecipe(pathname: string, url: URL, origin: string | null): Promise<Response> {
  const recipeId = extractRecipeId(pathname);
  if (!recipeId) return errorResponse("Not found", 404, origin);

  const userId = url.searchParams.get("user_id")?.trim();
  if (!userId) return errorResponse("user_id is required.", 400, origin);

  try {
    const recipe = await getRecipeById(recipeId, userId);
    if (!recipe) return errorResponse("Recipe not found.", 404, origin);
    return jsonResponse(recipe, 200, {}, origin);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return errorResponse("Server configuration error.", 500, origin);
    }
    return errorResponse("Failed to get recipe.", 500, origin);
  }
}

export async function handleDeleteRecipe(pathname: string, url: URL, origin: string | null): Promise<Response> {
  const recipeId = extractRecipeId(pathname);
  if (!recipeId) return errorResponse("Not found", 404, origin);

  const userId = url.searchParams.get("user_id")?.trim();
  if (!userId) return errorResponse("user_id is required.", 400, origin);

  try {
    const deleted = await deleteRecipe(recipeId, userId);
    if (!deleted) return errorResponse("Recipe not found.", 404, origin);
    return jsonResponse({ success: true }, 200, {}, origin);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return errorResponse("Server configuration error.", 500, origin);
    }
    return errorResponse("Failed to delete recipe.", 500, origin);
  }
}
