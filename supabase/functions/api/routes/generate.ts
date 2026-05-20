import { extractIngredients } from "../agents/ingredientExtractorAgent.ts";
import { mockLookupNutrition } from "../agents/nutritionLookupAgent.ts";
import { calculateNutrition } from "../agents/nutritionCalculatorAgent.ts";
import { generateMockRecipe } from "../agents/recipeGeneratorAgent.ts";
import { applyRecipeSanity } from "../agents/recipeSanityAgent.ts";
import { validateRecipe } from "../agents/validationAgent.ts";
import { cleanPantryItems } from "../agents/pantryAgent.ts";
import { completeConversation, startConversation } from "../agents/conversationAgent.ts";
import { getPantry, saveRecipe, SupabaseConfigError, userExists } from "../services/supabaseService.ts";
import { errorResponse, jsonResponse } from "../utils/response.ts";

export async function handleGenerate(req: Request, pathname: string, origin: string | null): Promise<Response> {
  const match = pathname.match(/^\/api\/users\/([^/]+)\/recipes\/generate$/);
  const userId = match ? decodeURIComponent(match[1]) : null;
  if (!userId) return errorResponse("Not found", 404, origin);

  let payload: any = {};
  try { payload = await req.json(); } catch {}

  try {
    if (!(await userExists(userId))) return errorResponse("User does not exist.", 404, origin);

    const pantry = cleanPantryItems(await getPantry(userId));
    const message = String(payload.message ?? payload.prompt ?? "Generate a recipe");
    const servings = Number(payload.servings ?? 1) || 1;
    const mealType = String(payload.meal_type ?? payload.mealType ?? "lunch");
    const preference = String(payload.preference ?? "high protein");
    const useOnlyPantry = Boolean(payload.use_only_pantry ?? payload.useOnlyPantry ?? true);

    const conversationId = await startConversation(userId, message);

    const draft = generateMockRecipe({ pantryItems: pantry, mealType, preference, useOnlyPantry, message, servings });
    validateRecipe(draft as unknown as Record<string, unknown>);

    const sanity = applyRecipeSanity(draft as unknown as Record<string, unknown>, useOnlyPantry, pantry);
    const ingredients = extractIngredients(sanity.recipe);
    const lookup = mockLookupNutrition(ingredients);
    const nutrition = calculateNutrition(lookup.items, servings, [...lookup.warnings, ...sanity.warnings]);
    const nutritionWithMissing = {
      ...nutrition,
      missing_ingredients: draft.missing_ingredients ?? [],
    };

    const saved = await saveRecipe(userId, {
      title: draft.title,
      description: draft.description,
      ingredients: sanity.recipe.ingredients,
      instructions: draft.instructions,
      servings,
      nutrition: nutritionWithMissing,
      tags: draft.tags,
    });

    await completeConversation(conversationId, String(saved.id), `Created recipe: ${saved.title}`);
    return jsonResponse({ recipe: saved, conversation_id: conversationId }, 200, {}, origin);
  } catch (e) {
    if (e instanceof SupabaseConfigError) return errorResponse("Server configuration error.", 500, origin);
    return errorResponse(e instanceof Error ? e.message : "Recipe generation failed.", 500, origin);
  }
}
