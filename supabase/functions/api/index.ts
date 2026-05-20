import { handleLogin, handleRegister } from "./routes/auth.ts";
import { preflightResponse } from "./utils/cors.ts";
import { jsonResponse, notFoundResponse } from "./utils/response.ts";

// Local run command (Phase 2 migration):
// npx supabase functions serve api --env-file supabase/functions/.env.local --no-verify-jwt
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");

  console.log("api edge function received:", req.method, url.pathname);

  if (req.method === "OPTIONS") {
    return preflightResponse(origin);
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
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

  if (req.method === "POST" && url.pathname === "/api/register") {
    return handleRegister(req, origin);
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    return handleLogin(req, origin);
  }

  return notFoundResponse(origin);
});
