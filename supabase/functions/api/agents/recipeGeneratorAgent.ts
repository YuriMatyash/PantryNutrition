import type { PantryItem } from "./pantryAgent.ts";
import { generateRecipeWithOpenAI, getOpenAIModel } from "../services/openaiService.ts";

export interface GenerateInput {
  pantryItems: PantryItem[];
  mealType: string;
  preference: string;
  useOnlyPantry: boolean;
  message: string;
  servings: number;
}

export interface RecipeDraft {
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: number; unit: "g" | "ml" | "unit" }>;
  instructions: string[];
  servings: number;
  tags: string[];
  missing_ingredients: Array<{ name: string; amount: number; unit: "g" | "ml" | "unit" }>;
}

function mockRecipe(input: GenerateInput): RecipeDraft {
  const servings = Math.max(1, Math.floor(input.servings || 1));
  const preferred = input.preference || "quick meal";
  const mealType = input.mealType || "meal";
  const pantryByName = new Map(input.pantryItems.map((i) => [i.name, i]));
  const pick = (name: string, fallbackAmount: number, unit: "g" | "ml" | "unit") => {
    const p = pantryByName.get(name);
    if (!p) return { name, amount: fallbackAmount, unit };
    return { name, amount: Math.min(Number(p.amount), fallbackAmount), unit: p.unit as "g" | "ml" | "unit" };
  };
  const base = [pick("egg", 2 * servings, "unit"), pick("rice", 90 * servings, "g"), pick("milk", 120 * servings, "ml")];
  const missing = [] as Array<{ name: string; amount: number; unit: "g" | "ml" | "unit" }>;
  if (!input.useOnlyPantry && !pantryByName.has("chicken")) missing.push({ name: "chicken", amount: 120 * servings, unit: "g" });
  return {
    title: `${preferred} ${mealType} bowl`.replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Mock recipe generated for ${mealType} with ${preferred}. ${input.message || ""}`.trim(),
    ingredients: base.filter((i) => i.amount > 0),
    instructions: ["Prepare ingredients and measure quantities.", "Cook main ingredients until done.", "Combine, season lightly, and serve warm."],
    servings,
    tags: [preferred, mealType, "mock"],
    missing_ingredients: input.useOnlyPantry ? [] : missing,
  };
}

export async function generateRecipe(input: GenerateInput): Promise<RecipeDraft> {
  const mock = String(Deno.env.get("USE_MOCK_OPENAI") ?? "true").toLowerCase() === "true";
  if (mock) return mockRecipe(input);

  const systemPrompt = `Return strict JSON only. No markdown. No extra text.
JSON schema:
{"title":"...","description":"...","ingredients":[{"name":"...","amount":100,"unit":"g"}],"instructions":["..."],"servings":1,"tags":["..."],"missing_ingredients":[]}
Rules:
- Exactly requested servings.
- Quantities are total recipe quantities.
- Realistic per-serving quantities.
- Pantry amounts are limits only.
- If use_only_pantry=true: use only pantry items and do not exceed pantry amounts.
- If use_only_pantry=false: missing ingredients allowed and must appear in missing_ingredients.
- Allowed units only: g, ml, unit.
- Forbidden units: cups, tbsp, tsp, pinch, handful, to taste.
- Avoid absurd quantities and do not use whole pantry unless appropriate.`;

  const userPrompt = JSON.stringify({
    request: {
      meal_type: input.mealType,
      preference: input.preference,
      use_only_pantry: input.useOnlyPantry,
      message: input.message,
      servings: input.servings,
    },
    pantry_items: input.pantryItems,
  });

  const json = await generateRecipeWithOpenAI(systemPrompt, userPrompt);
  return json as unknown as RecipeDraft;
}

export { getOpenAIModel };
