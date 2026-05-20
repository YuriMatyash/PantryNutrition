import type { USDAFoodCandidate } from "../services/usdaService.ts";

type Rejected = { description: string; reason: string };

const noisyTerms = ["roll", "spread", "sauce", "soup", "baby food", "formula", "restaurant", "fast food", "prepared", "product"];

function lc(s: string): string { return s.toLowerCase(); }
function hasAny(text: string, terms: string[]): boolean { return terms.some((t) => text.includes(t)); }

function dataTypeScore(dt: string): number {
  const t = lc(dt);
  if (t.includes("foundation")) return 50;
  if (t.includes("sr legacy")) return 40;
  if (t.includes("survey")) return 30;
  if (t.includes("branded")) return 5;
  return 15;
}

function queryType(query: string): "egg" | "rice" | "milk" | "cheddar" | "other" {
  const q = lc(query);
  if (q.includes("cheddar")) return "cheddar";
  if (q.includes("egg")) return "egg";
  if (q.includes("rice")) return "rice";
  if (q.includes("milk")) return "milk";
  return "other";
}

function rejectionReason(qType: ReturnType<typeof queryType>, query: string, desc: string): string | null {
  const q = lc(query);
  const d = lc(desc);

  if (qType === "egg" && !hasAny(q, ["white", "yolk", "substitute"])) {
    if (hasAny(d, ["egg white", "whites", "egg yolk", "substitute", "powder", "dried"])) {
      return "egg query rejected white/yolk/substitute/powder variant";
    }
  }
  if (qType === "rice" && !hasAny(q, ["flour", "noodles", "dirty", "fried", "risotto", "pudding"])) {
    if (hasAny(d, ["flour", "noodles", "dirty rice", "rice mix", "cereal", "crackers", "baby food", "restaurant", "fried rice", "risotto", "pudding"])) {
      return "rice query rejected non-plain rice variant";
    }
  }
  if (qType === "milk" && !hasAny(q, ["cheese", "ricotta", "yogurt", "formula", "cream", "condensed", "evaporated"])) {
    if (hasAny(d, ["cheese", "ricotta", "yogurt", "formula", "cream", "condensed", "evaporated"])) {
      return "milk query rejected dairy product variant";
    }
  }
  return null;
}

function similarityScore(query: string, desc: string): number {
  const q = lc(query);
  const d = lc(desc);
  let score = 0;

  for (const token of q.split(/\s+/).filter(Boolean)) if (d.includes(token)) score += 10;

  const type = queryType(query);
  if (type === "egg") {
    if (hasAny(d, ["whole egg", "egg whole", "whole, raw", "whole, cooked", "grade a, large, egg whole"])) score += 35;
    if (hasAny(d, ["egg white", "whites", "egg yolk", "substitute", "powder", "dried", "product"])) score -= 45;
  }
  if (type === "rice") {
    if (hasAny(d, ["rice, white", "rice, brown", "rice, cooked", "white rice", "brown rice", "rice, regular, cooked", "rice, long-grain"])) score += 30;
    if (hasAny(d, ["flour", "noodles", "dirty rice", "rice mix", "cereal", "crackers", "baby food", "restaurant", "fried rice", "risotto", "pudding"])) score -= 50;
  }
  if (type === "milk") {
    if (hasAny(d, ["whole milk", "lowfat milk", "reduced fat milk", "2% milk", "1% milk"])) score += 30;
    if (hasAny(d, ["cheese", "ricotta", "yogurt", "powder", "chocolate", "flavored", "formula", "cream", "condensed", "evaporated"])) score -= 45;
  }
  if (type === "cheddar") {
    if (hasAny(d, ["cheese, cheddar", "cheddar cheese", "cheddar"])) score += 35;
    if (hasAny(d, ["spread", "sauce", "product", "flavored", "snack", "crackers"])) score -= 35;
  }

  for (const n of noisyTerms) if (d.includes(n)) score -= 12;
  score -= Math.min(12, Math.floor(desc.length / 45));
  return score;
}

export function chooseUSDAFood(query: string, candidates: USDAFoodCandidate[]) {
  const warnings: string[] = [];
  const rejected: Rejected[] = [];
  if (!candidates.length) return { food: null, confidence: 0, reason: "No USDA candidates", warnings, rejected, accepted: false };

  const qType = queryType(query);
  const scored = candidates.map((c) => {
    const reject = rejectionReason(qType, query, c.description);
    if (reject) {
      rejected.push({ description: c.description, reason: reject });
      return { c, score: -9999, rejected: true };
    }

    let score = dataTypeScore(c.data_type) + similarityScore(query, c.description);
    if (lc(c.data_type).includes("branded") && candidates.some((x) => !lc(x.data_type).includes("branded"))) score -= 12;
    return { c, score, rejected: false };
  }).sort((a, b) => b.score - a.score);

  const best = scored.find((x) => !x.rejected);
  if (!best || best.score < 20) {
    warnings.push(`No reliable USDA match found for '${query}'.`);
    return { food: null, confidence: 0, reason: "All candidates rejected or low score", warnings, rejected, accepted: false };
  }

  const confidence = Math.max(0, Math.min(1, best.score / 100));
  if (confidence < 0.45) {
    warnings.push(`No reliable USDA match found for '${query}'.`);
    return { food: null, confidence, reason: "Low confidence", warnings, rejected, accepted: false };
  }

  return {
    food: best.c,
    confidence,
    reason: `Top acceptable score ${best.score}.`,
    warnings,
    rejected,
    accepted: true,
  };
}
