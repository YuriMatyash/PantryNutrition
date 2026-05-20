import { preflightResponse } from "./utils/cors.ts";
import { jsonResponse, notFoundResponse } from "./utils/response.ts";

// Local run command (Phase 1 migration):
// npx supabase functions serve api --env-file supabase/functions/.env.local --no-verify-jwt
Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");

  console.log("api edge function received:", req.method, url.pathname);

  if (req.method === "OPTIONS") {
    return preflightResponse(origin);
  }

  const isHealthRoute =
    req.method === "GET" &&
    (url.pathname === "/" ||
      url.pathname === "/health" ||
      url.pathname === "/api/health");

  if (isHealthRoute) {
    return jsonResponse(
      {
        status: "ok",
        runtime: "supabase-edge-function",
      },
      200,
      {},
      origin,
    );
  }

  return notFoundResponse(origin);
});
