const MOCK_DB: Record<string, { calories:number; protein_g:number; carbs_g:number; fat_g:number }> = {
  egg: { calories: 143, protein_g: 13, carbs_g: 1.1, fat_g: 9.5 },
  pasta: { calories: 371, protein_g: 13, carbs_g: 75, fat_g: 1.5 },
  rice: { calories: 360, protein_g: 7, carbs_g: 80, fat_g: 0.7 },
  chicken: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
  milk: { calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3 },
  "cheddar cheese": { calories: 403, protein_g: 25, carbs_g: 1.3, fat_g: 33 },
  cheese: { calories: 350, protein_g: 22, carbs_g: 3, fat_g: 28 },
};

export function mockLookupNutrition(ingredients: Array<{name:string;amount:number;unit:string}>) {
  if (String(Deno.env.get("USE_MOCK_USDA") ?? "true").toLowerCase() !== "true") {
    throw new Error("Real USDA lookup is not implemented in Edge Functions yet.");
  }
  const warnings: string[] = [];
  const items = ingredients.map((i) => {
    const key = i.name in MOCK_DB ? i.name : Object.keys(MOCK_DB).find((k) => i.name.includes(k));
    const per100 = key ? MOCK_DB[key] : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    if (!key) warnings.push(`No mock nutrition for ${i.name}. Using 0 values.`);
    return { ...i, per_100g: per100, matched_usda_food: key || "unknown" };
  });
  return { items, warnings };
}
