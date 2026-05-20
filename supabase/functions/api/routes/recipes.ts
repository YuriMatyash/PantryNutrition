import { editRecipe } from "../agents/recipeEditorAgent.ts";
import { extractIngredients } from "../agents/ingredientExtractorAgent.ts";
import { lookupNutrition } from "../agents/nutritionLookupAgent.ts";
import { calculateNutrition } from "../agents/nutritionCalculatorAgent.ts";
import { applyRecipeSanity } from "../agents/recipeSanityAgent.ts";
import { validateRecipe } from "../agents/validationAgent.ts";
import { cleanPantryItems } from "../agents/pantryAgent.ts";
import {
  addConversationMessage,
  deleteRecipe,
  getOrCreateRecipeConversation,
  getPantry,
  getRecipeById,
  listUserRecipes,
  SupabaseConfigError,
  updateRecipe,
  userExists,
} from "../services/supabaseService.ts";
import { OpenAIConfigError, OpenAIJSONError, OpenAIRequestError } from "../services/openaiService.ts";
import { errorResponse, jsonResponse } from "../utils/response.ts";

function extractUserId(pathname: string): string | null {
  const userRecipesMatch = pathname.match(/^\/api\/users\/([^/]+)\/recipes$/);
  if (userRecipesMatch) return decodeURIComponent(userRecipesMatch[1]);
  return null;
}

function extractRecipeId(pathname: string): string | null {
  const recipeMatch = pathname.match(/^\/api\/recipes\/([^/]+)$/);
  if (recipeMatch) return decodeURIComponent(recipeMatch[1]);
  const editMatch = pathname.match(/^\/api\/recipes\/([^/]+)\/edit$/);
  if (editMatch) return decodeURIComponent(editMatch[1]);
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

export async function handleEditRecipe(req: Request, pathname: string, origin: string | null): Promise<Response> {
  const recipeId = extractRecipeId(pathname);
  if (!recipeId) return errorResponse("Not found", 404, origin);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return errorResponse("user_id and message are required.", 400, origin); }
  const userId = String(body.user_id ?? "").trim();
  const message = String(body.message ?? "").trim();
  if (!userId || !message) return errorResponse("user_id and message are required.", 400, origin);

  try {
    const existingRecipe = await getRecipeById(recipeId, userId);
    if (!existingRecipe) return errorResponse("Recipe not found.", 404, origin);

    const conversationId = await getOrCreateRecipeConversation(recipeId, userId);
    await addConversationMessage(conversationId, "user", message);

    const edited = await editRecipe(existingRecipe, message);
    validateRecipe(edited);

    const pantry = cleanPantryItems(await getPantry(userId));
    const sanity = applyRecipeSanity(edited, true, pantry);
    const ingredients = extractIngredients(sanity.recipe);
    const lookup = await lookupNutrition(ingredients);
    const nutrition = calculateNutrition(lookup.items as any, Number((sanity.recipe as Record<string, unknown>).servings ?? 1), [...lookup.warnings, ...sanity.warnings]);

    const updated = await updateRecipe(recipeId, userId, {
      title: sanity.recipe.title,
      description: sanity.recipe.description,
      ingredients: sanity.recipe.ingredients,
      instructions: sanity.recipe.instructions,
      servings: sanity.recipe.servings,
      nutrition: { ...nutrition, missing_ingredients: (sanity.recipe as Record<string, unknown>).missing_ingredients ?? [] },
      tags: sanity.recipe.tags,
    });

    await addConversationMessage(conversationId, "assistant", `Updated recipe: ${updated.title}`);
    return jsonResponse({ recipe: updated, conversation_id: conversationId }, 200, {}, origin);
  } catch (error) {
    if (error instanceof OpenAIConfigError) return errorResponse("OpenAI configuration error.", 500, origin);
    if (error instanceof OpenAIJSONError) return errorResponse("OpenAI returned invalid JSON.", 502, origin);
    if (error instanceof OpenAIRequestError) return errorResponse("OpenAI request failed.", 500, origin);
    if (error instanceof SupabaseConfigError) return errorResponse("Server configuration error.", 500, origin);
    return errorResponse("Failed to edit recipe.", 500, origin);
  }
}
