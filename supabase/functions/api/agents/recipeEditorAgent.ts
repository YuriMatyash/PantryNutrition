import { generateRecipeWithOpenAI } from "../services/openaiService.ts";

export async function editRecipe(currentRecipe: Record<string, unknown>, userMessage: string): Promise<Record<string, unknown>> {
  const useMock = String(Deno.env.get("USE_MOCK_OPENAI") ?? "true").toLowerCase() === "true";
  if (useMock) return mockEdit(currentRecipe, userMessage);

  const systemPrompt = `Return strict JSON only. No markdown. No extra text.
JSON schema:
{"title":"...","description":"...","ingredients":[{"name":"...","amount":100,"unit":"g"}],"instructions":["..."],"servings":1,"tags":["..."],"missing_ingredients":[]}
Rules:
- Preserve valid recipe structure.
- Respect requested servings.
- Ingredient quantities are total quantities for recipe.
- Allowed units only: g, ml, unit.
- Forbidden units: cups, tbsp, tsp, pinch, handful, to taste.
- Keep quantities realistic.
- If user asks remove/replace ingredient, apply it.
- If user asks lower calorie or add protein, adjust reasonably.
- Do not produce absurd quantities.`;

  const userPrompt = JSON.stringify({ current_recipe: currentRecipe, edit_message: userMessage });
  return await generateRecipeWithOpenAI(systemPrompt, userPrompt);
}

function mockEdit(currentRecipe: Record<string, unknown>, userMessage: string): Record<string, unknown> {
  const msg = userMessage.toLowerCase();
  const recipe = structuredClone(currentRecipe);
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients as Array<Record<string, unknown>> : [];

  const servingsMatch = msg.match(/for\s+(\d+)\s+servings?/);
  if (servingsMatch) {
    const nextServings = Math.max(1, Number(servingsMatch[1]));
    const prevServings = Math.max(1, Number(recipe.servings ?? 1));
    const factor = nextServings / prevServings;
    recipe.servings = nextServings;
    recipe.ingredients = ingredients.map((i) => ({ ...i, amount: Math.max(0, Number(i.amount ?? 0) * factor) }));
  }

  if (msg.includes("lower calorie")) {
    recipe.ingredients = (recipe.ingredients as Array<Record<string, unknown>>).map((i) => {
      const n = String(i.name ?? "").toLowerCase();
      if (n.includes("cheese") || n.includes("oil") || n.includes("butter")) return { ...i, amount: Math.max(0, Number(i.amount ?? 0) * 0.7) };
      return i;
    });
  }

  if (msg.includes("add more protein")) {
    recipe.ingredients = (recipe.ingredients as Array<Record<string, unknown>>).map((i) => {
      const n = String(i.name ?? "").toLowerCase();
      if (n.includes("egg") || n.includes("chicken")) return { ...i, amount: Number(i.amount ?? 0) * 1.25 };
      return i;
    });
  }

  if (msg.includes("remove milk")) recipe.ingredients = (recipe.ingredients as Array<Record<string, unknown>>).filter((i) => !String(i.name ?? "").toLowerCase().includes("milk"));
  if (msg.includes("replace milk with water")) recipe.ingredients = (recipe.ingredients as Array<Record<string, unknown>>).map((i) => String(i.name ?? "").toLowerCase().includes("milk") ? { ...i, name: "water", unit: "ml" } : i);
  if (msg.includes("remove egg")) recipe.ingredients = (recipe.ingredients as Array<Record<string, unknown>>).filter((i) => !String(i.name ?? "").toLowerCase().includes("egg"));

  return {
    title: recipe.title ?? "Updated Recipe",
    description: recipe.description ?? "Updated based on user request.",
    ingredients: recipe.ingredients ?? [],
    instructions: recipe.instructions ?? [],
    servings: Math.max(1, Number(recipe.servings ?? 1)),
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    missing_ingredients: [],
  };
}
