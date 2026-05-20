import { chooseUSDAFood } from "./usdaFoodMatchAgent.ts";
import { searchUSDAFoods, type USDAFoodCandidate } from "../services/usdaService.ts";

type Per100 = { calories:number; protein_g:number; carbs_g:number; fat_g:number; fiber_g:number; sugar_g:number; sodium_mg:number };

const MOCK_DB: Record<string, Per100> = {
  egg: { calories: 143, protein_g: 13, carbs_g: 1.1, fat_g: 9.5, fiber_g: 0, sugar_g: 1.1, sodium_mg: 140 },
  pasta: { calories: 371, protein_g: 13, carbs_g: 75, fat_g: 1.5, fiber_g: 3.2, sugar_g: 2.7, sodium_mg: 6 },
  rice: { calories: 360, protein_g: 7, carbs_g: 80, fat_g: 0.7, fiber_g: 1.3, sugar_g: 0.1, sodium_mg: 5 },
  chicken: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, fiber_g: 0, sugar_g: 0, sodium_mg: 74 },
  milk: { calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, fiber_g: 0, sugar_g: 5.1, sodium_mg: 43 },
  "cheddar cheese": { calories: 403, protein_g: 25, carbs_g: 1.3, fat_g: 33, fiber_g: 0, sugar_g: 0.5, sodium_mg: 621 },
  cheese: { calories: 350, protein_g: 22, carbs_g: 3, fat_g: 28, fiber_g: 0, sugar_g: 1.2, sodium_mg: 500 },
};

const fallbackMap: Record<string, string[]> = {
  pasta: ["pasta cooked", "spaghetti", "macaroni", "noodles"],
  rice: ["rice white cooked", "rice brown cooked", "rice white long grain cooked", "rice white long grain raw", "rice white uncooked"],
  "cheddar cheese": ["Cheese, cheddar", "cheddar cheese"],
  milk: ["milk whole", "whole milk", "milk reduced fat", "milk lowfat"],
  chicken: ["chicken breast", "chicken cooked", "chicken"],
  egg: ["whole egg", "egg whole", "Eggs, Grade A, Large, egg whole"],
  eggs: ["whole egg", "egg whole", "Eggs, Grade A, Large, egg whole"],
};

function nutrientValue(n: Record<string, unknown>): number {
  return Number(n.value ?? n.amount ?? 0) || 0;
}

function extractPer100(food: USDAFoodCandidate): { per100: Per100 | null; warnings: string[] } {
  const warnings: string[] = [];
  const per: Per100 = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 };

  let kcal: number | null = null;
  let kj: number | null = null;

  for (const raw of food.food_nutrients) {
    const n = raw as Record<string, unknown>;
    const number = String(n.nutrientNumber ?? "").trim();
    const id = Number(n.nutrientId ?? 0);
    const name = String(n.nutrientName ?? n.name ?? "").toLowerCase();
    const unit = String(n.unitName ?? n.unit ?? "").toLowerCase();
    const v = nutrientValue(n);

    if (number === "208" || id === 1008 || name.includes("energy")) {
      if (unit.includes("kj")) kj = v;
      else kcal = v;
    }
    if (number === "203" || id === 1003 || name.includes("protein")) per.protein_g = v;
    if (number === "205" || id === 1005 || name.includes("carbohydrate")) per.carbs_g = v;
    if (number === "204" || id === 1004 || name.includes("total lipid") || name.includes("fat")) per.fat_g = v;
    if (number === "291" || id === 1079 || name.includes("fiber")) per.fiber_g = v;
    if (number === "269" || id === 2000 || name.includes("sugars")) per.sugar_g = v;
    if (number === "307" || id === 1093 || name.includes("sodium")) per.sodium_mg = v;
  }

  if (kcal === null && kj !== null) kcal = kj / 4.184;
  per.calories = kcal ?? 0;
  if (per.calories > 950) warnings.push("Suspicious calories per 100g (>950). Parsed carefully.");

  const hasAny = Object.values(per).some((x) => Number(x) > 0);
  return { per100: hasAny ? per : null, warnings };
}

async function lookupOneReal(name: string): Promise<{ food: USDAFoodCandidate | null; per100: Per100 | null; warnings: string[]; confidence: number; reason: string; usedQuery: string }> {
  const warnings: string[] = [];
  const queries = [name, ...(fallbackMap[name] || [])];

  let bestFood: USDAFoodCandidate | null = null;
  let bestConf = 0;
  let bestReason = "No USDA candidates";
  let usedQuery = name;

  for (let i = 0; i < queries.length; i += 1) {
    const q = queries[i];
    const { candidates, method } = await searchUSDAFoods(q, 20);
    const chosen = chooseUSDAFood(name, candidates);
    if (String(Deno.env.get("APP_ENV") ?? "").toLowerCase() === "local") {
      console.log("[usda] match", { query: q, method, candidate_count: candidates.length, chosen: chosen.food?.description ?? null, confidence: chosen.confidence, warnings: chosen.warnings });
    }
    if (i > 0 && chosen.food) warnings.push(`Used fallback USDA query: ${q}`);
    warnings.push(...chosen.warnings);

    if (chosen.food && chosen.confidence >= bestConf) {
      bestFood = chosen.food;
      bestConf = chosen.confidence;
      bestReason = chosen.reason;
      usedQuery = q;
    }

    if (chosen.food && chosen.confidence >= 0.6) break;
  }

  if (!bestFood) return { food: null, per100: null, warnings: [...warnings, `No reliable USDA match found for '${name}'.`], confidence: bestConf, reason: bestReason, usedQuery };
  const ex = extractPer100(bestFood);
  return { food: bestFood, per100: ex.per100, warnings: [...warnings, ...ex.warnings], confidence: bestConf, reason: bestReason, usedQuery };
}

export async function lookupNutrition(ingredients: Array<{name:string;amount:number;unit:string}>) {
  const useMock = String(Deno.env.get("USE_MOCK_USDA") ?? "true").toLowerCase() === "true";
  const warnings: string[] = [];

  if (useMock) {
    const items = ingredients.map((i) => {
      const key = i.name in MOCK_DB ? i.name : Object.keys(MOCK_DB).find((k) => i.name.includes(k));
      const per100 = key ? MOCK_DB[key] : null;
      if (!key) warnings.push(`No mock nutrition for ${i.name}. Using 0 values.`);
      return { ...i, matched_usda_food: key || null, usda_food_id: null, data_type: null, per_100g: per100, warning: key ? null : `No mock nutrition for ${i.name}` };
    });
    return { items, warnings };
  }

  const items = [] as Array<Record<string, unknown>>;
  for (const ing of ingredients) {
    try {
      const r = await lookupOneReal(ing.name);
      items.push({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        matched_usda_food: r.food?.description ?? null,
        usda_food_id: r.food?.fdc_id ?? null,
        data_type: r.food?.data_type ?? null,
        per_100g: r.per100,
        warning: r.warnings.length ? r.warnings.join(" | ") : null,
      });
      if (r.warnings.length) warnings.push(...r.warnings.map((w) => `${ing.name}: ${w}`));
    } catch {
      items.push({ name: ing.name, amount: ing.amount, unit: ing.unit, matched_usda_food: null, usda_food_id: null, data_type: null, per_100g: null, warning: "USDA lookup failed." });
      warnings.push(`${ing.name}: USDA lookup failed.`);
    }
  }

  return { items, warnings };
}

export { extractPer100 };
