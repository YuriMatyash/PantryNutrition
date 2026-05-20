export class USDAConfigError extends Error {}
export class USDAServiceError extends Error {}

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

type USDAFoodNutrient = Record<string, unknown>;
export interface USDAFoodCandidate {
  fdc_id: number;
  description: string;
  data_type: string;
  food_nutrients: USDAFoodNutrient[];
}

function isLocal(): boolean {
  return String(Deno.env.get("APP_ENV") ?? "").toLowerCase() === "local";
}

function getApiKey(): string {
  const key = Deno.env.get("USDA_API_KEY")?.trim();
  if (!key) throw new USDAConfigError("Missing USDA_API_KEY for Edge Function USDA lookup.");
  return key;
}

function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function normalizeFoods(raw: unknown): USDAFoodCandidate[] {
  const foods = (raw as Record<string, unknown>)?.foods;
  if (!Array.isArray(foods)) return [];
  return foods.map((f) => {
    const r = f as Record<string, unknown>;
    return {
      fdc_id: Number(r.fdcId ?? 0),
      description: String(r.description ?? "").trim(),
      data_type: String(r.dataType ?? "").trim(),
      food_nutrients: Array.isArray(r.foodNutrients) ? (r.foodNutrients as USDAFoodNutrient[]) : [],
    };
  }).filter((f) => f.fdc_id > 0 && !!f.description);
}

export async function searchUSDAFoods(query: string, pageSize = 20): Promise<{ candidates: USDAFoodCandidate[]; method: "POST"|"GET" }> {
  const apiKey = getApiKey();
  const q = query.trim();
  if (!q) return { candidates: [], method: "POST" };

  const postUrl = `${USDA_SEARCH_URL}?api_key=${encodeURIComponent(apiKey)}`;

  try {
    const postRes = await fetch(postUrl, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, pageSize }),
      signal: timeoutSignal(12000),
    });

    const ct = postRes.headers.get("content-type") || "";
    if (isLocal()) console.log("[usda] search", { query: q, method: "POST", status: postRes.status, content_type: ct });
    if (!postRes.ok) throw new USDAServiceError(`USDA request failed with status ${postRes.status}.`);
    if (!ct.toLowerCase().includes("application/json")) throw new USDAServiceError("USDA returned non-JSON response.");

    const postJson = await postRes.json().catch(() => null);
    const postCandidates = normalizeFoods(postJson);
    return { candidates: postCandidates, method: "POST" };
  } catch (postError) {
    const getUrl = `${USDA_SEARCH_URL}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(q)}&pageSize=${pageSize}`;
    const getRes = await fetch(getUrl, { method: "GET", headers: { "Accept": "application/json" }, signal: timeoutSignal(12000) });
    const ct = getRes.headers.get("content-type") || "";
    if (isLocal()) console.log("[usda] search", { query: q, method: "GET", status: getRes.status, content_type: ct, fallback_from_post: true });
    if (!getRes.ok) throw new USDAServiceError(`USDA request failed with status ${getRes.status}.`);
    if (!ct.toLowerCase().includes("application/json")) throw new USDAServiceError("USDA returned non-JSON response.");
    const getJson = await getRes.json().catch(() => null);
    const getCandidates = normalizeFoods(getJson);
    return { candidates: getCandidates, method: "GET" };
  }
}
