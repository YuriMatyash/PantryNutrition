export function calculateNutrition(items: Array<{name:string;amount:number;unit:string;per_100g:{calories:number;protein_g:number;carbs_g:number;fat_g:number};matched_usda_food:string}>, servings:number, initialWarnings:string[] = []) {
  const warnings = [...initialWarnings];
  const ingredientRows = [] as Array<Record<string, unknown>>;
  const total = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

  for (const i of items) {
    let gramsFactor = 0;
    if (i.unit === "g" || i.unit === "ml") gramsFactor = i.amount / 100;
    else if (i.unit === "unit") {
      if (i.name.includes("egg")) gramsFactor = (i.amount * 50) / 100;
      else warnings.push(`Unknown unit conversion for ${i.name}.`);
    }

    const cals = i.per_100g.calories * gramsFactor;
    const protein = i.per_100g.protein_g * gramsFactor;
    const carbs = i.per_100g.carbs_g * gramsFactor;
    const fat = i.per_100g.fat_g * gramsFactor;

    total.calories += cals; total.protein_g += protein; total.carbs_g += carbs; total.fat_g += fat;
    ingredientRows.push({ name: i.name, matched_usda_food: i.matched_usda_food, amount: i.amount, unit: i.unit, calories: +cals.toFixed(1), protein_g: +protein.toFixed(1), carbs_g: +carbs.toFixed(1), fat_g: +fat.toFixed(1) });
  }

  const per = {
    calories: +(total.calories / servings).toFixed(1),
    protein_g: +(total.protein_g / servings).toFixed(1),
    carbs_g: +(total.carbs_g / servings).toFixed(1),
    fat_g: +(total.fat_g / servings).toFixed(1),
  };

  return {
    total: { calories: +total.calories.toFixed(1), protein_g: +total.protein_g.toFixed(1), carbs_g: +total.carbs_g.toFixed(1), fat_g: +total.fat_g.toFixed(1) },
    per_serving: per,
    ingredients: ingredientRows,
    warnings,
  };
}
