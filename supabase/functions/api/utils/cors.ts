const ALLOWED_ORIGINS = new Set<string>([
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  // TODO: Add the production Netlify URL here in a future migration phase.
]);

export function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Vary": "Origin",
  };
}

export function preflightResponse(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}
