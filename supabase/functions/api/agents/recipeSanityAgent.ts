export function applyRecipeSanity(recipe: Record<string, unknown>, useOnlyPantry: boolean, pantry: Array<{name:string;amount:number;unit:string}>): { recipe: Record<string, unknown>; warnings: string[] } {
  const warnings: string[] = [];
  const servings = Number(recipe.servings || 1);
  const pantryMap = new Map(pantry.map((p) => [p.name, p]));

  const adjusted = (recipe.ingredients as Array<Record<string, unknown>>).map((ing) => {
    const name = String(ing.name).toLowerCase();
    let amount = Number(ing.amount);
    const unit = String(ing.unit);

    if (name.includes("egg") && unit === "unit") {
      const per = amount / servings;
      if (per < 1) { amount = servings; warnings.push("Adjusted eggs to 1 per serving."); }
      if (per > 3) { amount = servings * 3; warnings.push("Adjusted eggs to 3 per serving."); }
    }

    if (useOnlyPantry) {
      const p = pantryMap.get(name);
      if (!p) { amount = 0; warnings.push(`Removed ${name} because it is not in pantry.`); }
      else if (unit === p.unit && amount > Number(p.amount)) { amount = Number(p.amount); warnings.push(`Reduced ${name} to pantry limit.`); }
    }

    return { ...ing, amount };
  }).filter((i) => Number(i.amount) > 0);

  return { recipe: { ...recipe, ingredients: adjusted }, warnings };
}
