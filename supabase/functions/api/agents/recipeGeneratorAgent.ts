import type { PantryItem } from "./pantryAgent.ts";

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

export function generateMockRecipe(input: GenerateInput): RecipeDraft {
  if (String(Deno.env.get("USE_MOCK_OPENAI") ?? "true").toLowerCase() !== "true") {
    throw new Error("Real OpenAI generation is not implemented in Edge Functions yet.");
  }

  const servings = Math.max(1, Math.floor(input.servings || 1));
  const preferred = input.preference || "quick meal";
  const mealType = input.mealType || "meal";

  const pantryByName = new Map(input.pantryItems.map((i) => [i.name, i]));
  const pick = (name: string, fallbackAmount: number, unit: "g" | "ml" | "unit") => {
    const p = pantryByName.get(name);
    if (!p) return { name, amount: fallbackAmount, unit };
    return { name, amount: Math.min(Number(p.amount), fallbackAmount), unit: p.unit as "g" | "ml" | "unit" };
  };

  const base = [
    pick("egg", 2 * servings, "unit"),
    pick("rice", 90 * servings, "g"),
    pick("milk", 120 * servings, "ml"),
  ];

  const missing = [] as Array<{ name: string; amount: number; unit: "g" | "ml" | "unit" }>;
  if (!input.useOnlyPantry) {
    if (!pantryByName.has("chicken")) missing.push({ name: "chicken", amount: 120 * servings, unit: "g" });
  }

  const ingredients = base.filter((i) => i.amount > 0);

  return {
    title: `${preferred} ${mealType} bowl`.replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Mock recipe generated for ${mealType} with ${preferred}. ${input.message || ""}`.trim(),
    ingredients,
    instructions: [
      "Prepare ingredients and measure quantities.",
      "Cook main ingredients until done.",
      "Combine, season lightly, and serve warm.",
    ],
    servings,
    tags: [preferred, mealType, "mock"],
    missing_ingredients: input.useOnlyPantry ? [] : missing,
  };
}
