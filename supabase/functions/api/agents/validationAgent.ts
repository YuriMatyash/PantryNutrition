export function validateRecipe(recipe: Record<string, unknown>): Record<string, unknown> {
  if (!recipe.title || typeof recipe.title !== "string") throw new Error("Recipe title is required.");
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) throw new Error("Recipe ingredients are required.");
  if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) throw new Error("Recipe instructions are required.");

  const servings = Number(recipe.servings);
  if (!Number.isInteger(servings) || servings <= 0) throw new Error("Recipe servings must be a positive integer.");

  const allowed = new Set(["g", "ml", "unit"]);
  for (const ing of recipe.ingredients as Array<Record<string, unknown>>) {
    if (!ing.name || !ing.unit || ing.amount === undefined) throw new Error("Each ingredient must include name, amount, and unit.");
    if (!allowed.has(String(ing.unit))) throw new Error("Ingredient units must be g, ml, or unit.");
  }
  return recipe;
}
