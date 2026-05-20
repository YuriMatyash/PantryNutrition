import { buildCorsHeaders } from "./cors.ts";

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
  origin: string | null = null,
): Response {
  const headers = {
    "Content-Type": "application/json",
    ...buildCorsHeaders(origin),
    ...extraHeaders,
  };

  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(
  message: string,
  status = 400,
  origin: string | null = null,
): Response {
  return jsonResponse({ error: message }, status, {}, origin);
}

export function notFoundResponse(origin: string | null = null): Response {
  return errorResponse("Not found", 404, origin);
}
