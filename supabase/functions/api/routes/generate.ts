import { completeConversation, startConversation } from "../agents/conversationAgent.ts";
import { extractIngredients } from "../agents/ingredientExtractorAgent.ts";
import { calculateNutrition } from "../agents/nutritionCalculatorAgent.ts";
import { extractPer100, lookupNutrition } from "../agents/nutritionLookupAgent.ts";
import { cleanPantryItems } from "../agents/pantryAgent.ts";
import { generateRecipe, getOpenAIModel } from "../agents/recipeGeneratorAgent.ts";
import { applyRecipeSanity } from "../agents/recipeSanityAgent.ts";
import { chooseUSDAFood } from "../agents/usdaFoodMatchAgent.ts";
import { validateRecipe } from "../agents/validationAgent.ts";
import { searchUSDAFoods } from "../services/usdaService.ts";
import { getPantry, saveRecipe, SupabaseConfigError, userExists } from "../services/supabaseService.ts";
import { errorResponse, jsonResponse } from "../utils/response.ts";

export async function handleGenerate(req: Request, pathname: string, origin: string | null): Promise<Response> {
  const match = pathname.match(/^\/api\/users\/([^/]+)\/recipes\/generate$/);
  const userId = match ? decodeURIComponent(match[1]) : null;
  if (!userId) return errorResponse("Not found", 404, origin);

  let payload: Record<string, unknown> = {};
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

    if (String(Deno.env.get("APP_ENV") ?? "").toLowerCase() === "local") {
      console.log("[generate] openai_mode", {
        mode: String(Deno.env.get("USE_MOCK_OPENAI") ?? "true").toLowerCase() === "true" ? "mock" : "real",
        model: getOpenAIModel(),
      });
    }

    const draft = await generateRecipe({ pantryItems: pantry, mealType, preference, useOnlyPantry, message, servings });

    if (String(Deno.env.get("APP_ENV") ?? "").toLowerCase() === "local") {
      console.log("[generate] recipe_summary", {
        title: draft.title,
        ingredient_count: Array.isArray(draft.ingredients) ? draft.ingredients.length : 0,
        servings,
      });
    }

    validateRecipe(draft as unknown as Record<string, unknown>);

    const sanity = applyRecipeSanity(draft as unknown as Record<string, unknown>, useOnlyPantry, pantry);
    const ingredients = extractIngredients(sanity.recipe);
    const lookup = await lookupNutrition(ingredients);
    const nutrition = calculateNutrition(lookup.items, servings, [...lookup.warnings, ...sanity.warnings]);
    const nutritionWithMissing = { ...nutrition, missing_ingredients: draft.missing_ingredients ?? [] };

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

export async function handleDebugUSDASearch(url: URL, origin: string | null): Promise<Response> {
  if (String(Deno.env.get("APP_ENV") ?? "").toLowerCase() !== "local") return errorResponse("Not found", 404, origin);
  const query = (url.searchParams.get("query") || "").trim();
  if (!query) return errorResponse("query is required.", 400, origin);

  try {
    const { candidates } = await searchUSDAFoods(query, 20);
    const chosen = chooseUSDAFood(query, candidates);
    const normalized = candidates.map((c) => ({
      fdc_id: c.fdc_id,
      description: c.description,
      data_type: c.data_type,
      per_100g: extractPer100(c).per100,
    }));

    return jsonResponse({
      query,
      count: normalized.length,
      candidates: normalized,
      chosen: chosen.food ? {
        fdc_id: chosen.food.fdc_id,
        description: chosen.food.description,
        data_type: chosen.food.data_type,
        confidence: chosen.confidence,
        reason: chosen.reason,
        per_100g: extractPer100(chosen.food).per100,
      } : null,
      warnings: chosen.warnings,
    }, 200, {}, origin);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "USDA debug failed.", 500, origin);
  }
}
