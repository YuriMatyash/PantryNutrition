import { handleLogin, handleRegister } from "./routes/auth.ts";
import { handleGetPantry, handlePutPantry } from "./routes/pantry.ts";
import { handleDeleteRecipe, handleGetRecipe, handleListRecipes } from "./routes/recipes.ts";
import { handleDebugUSDASearch, handleGenerate } from "./routes/generate.ts";
import { preflightResponse } from "./utils/cors.ts";
import { jsonResponse, notFoundResponse } from "./utils/response.ts";

// Local run command (Phase 4 migration):
// npx supabase functions serve api --env-file supabase/functions/.env.local --no-verify-jwt
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");

  console.log("api edge function received:", req.method, url.pathname);

  if (req.method === "OPTIONS") return preflightResponse(origin);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return jsonResponse({ status: "ok", runtime: "supabase-edge-function" }, 200, {}, origin);
  }
  if (req.method === "POST" && url.pathname === "/api/register") return handleRegister(req, origin);
  if (req.method === "POST" && url.pathname === "/api/login") return handleLogin(req, origin);

  if (req.method === "GET" && /^\/api\/users\/[^/]+\/pantry$/.test(url.pathname)) {
    return handleGetPantry(url.pathname, origin);
  }
  if (req.method === "PUT" && /^\/api\/users\/[^/]+\/pantry$/.test(url.pathname)) {
    return handlePutPantry(req, url.pathname, origin);
  }

  if (req.method === "GET" && /^\/api\/users\/[^/]+\/recipes$/.test(url.pathname)) {
    return handleListRecipes(url.pathname, origin);
  }
  if (req.method === "POST" && /^\/api\/users\/[^/]+\/recipes\/generate$/.test(url.pathname)) {
    return handleGenerate(req, url.pathname, origin);
  }
  if (req.method === "GET" && /^\/api\/recipes\/[^/]+$/.test(url.pathname)) {
    return handleGetRecipe(url.pathname, url, origin);
  }
  if (req.method === "DELETE" && /^\/api\/recipes\/[^/]+$/.test(url.pathname)) {
    return handleDeleteRecipe(url.pathname, url, origin);
  }
  if (req.method === "GET" && url.pathname === "/api/debug/usda-search") {
    return handleDebugUSDASearch(url, origin);
  }

  return notFoundResponse(origin);
});
