import type { USDAFoodCandidate } from "../services/usdaService.ts";

const noisyTerms = ["roll","spread","sauce","soup","baby food","formula","restaurant","fast food","prepared","product"];

function dataTypeScore(dt: string): number {
  const t = dt.toLowerCase();
  if (t.includes("foundation")) return 40;
  if (t.includes("sr legacy")) return 30;
  if (t.includes("survey")) return 20;
  if (t.includes("branded")) return 5;
  return 10;
}

function similarityScore(query: string, desc: string): number {
  const q = query.toLowerCase();
  const d = desc.toLowerCase();
  let score = 0;
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (d.includes(token)) score += 12;
  }
  if ((q.includes("egg") || q.includes("eggs")) && (d.includes("whole") || d.includes("grade a"))) score += 15;
  if (q.includes("cheddar") && d.includes("cheddar")) score += 20;
  if (q.includes("milk") && d.includes("milk")) score += 10;
  return score;
}

export function chooseUSDAFood(query: string, candidates: USDAFoodCandidate[]) {
  const warnings: string[] = [];
  if (!candidates.length) return { food: null, confidence: 0, reason: "No USDA candidates", warnings };

  const scored = candidates.map((c) => {
    const d = c.description.toLowerCase();
    let score = dataTypeScore(c.data_type) + similarityScore(query, c.description);
    for (const term of noisyTerms) if (d.includes(term)) score -= 15;
    if (c.data_type.toLowerCase().includes("branded") && candidates.some((x) => !x.data_type.toLowerCase().includes("branded"))) score -= 10;
    score -= Math.min(12, Math.floor(c.description.length / 40));
    return { c, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const confidence = Math.max(0, Math.min(1, best.score / 100));
  const reason = `Top score ${best.score} from data_type and description match.`;
  if (confidence < 0.45) warnings.push("Low-confidence USDA match.");
  return { food: best.c, confidence, reason, warnings };
}
