export function extractIngredients(recipe: Record<string, unknown>): Array<{ name: string; amount: number; unit: string }> {
  const rows = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  return rows.map((r) => ({
    name: String((r as Record<string, unknown>).name || "").trim().toLowerCase(),
    amount: Number((r as Record<string, unknown>).amount || 0),
    unit: String((r as Record<string, unknown>).unit || "").trim().toLowerCase(),
  }));
}
