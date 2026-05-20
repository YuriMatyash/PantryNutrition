import { createUser, DuplicateUsernameError, SupabaseConfigError, verifyLogin } from "../services/supabaseService.ts";
import { errorResponse, jsonResponse } from "../utils/response.ts";

interface AuthPayload {
  username?: string;
  password?: string;
}

function parseAuthFields(payload: AuthPayload): { username: string; password: string } | null {
  const username = payload.username?.trim();
  const password = payload.password?.trim();
  if (!username || !password) return null;
  return { username, password };
}

export async function handleRegister(req: Request, origin: string | null): Promise<Response> {
  let payload: AuthPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Missing username or password.", 400, origin);
  }

  const fields = parseAuthFields(payload);
  if (!fields) return errorResponse("Missing username or password.", 400, origin);

  try {
    const result = await createUser(fields.username, fields.password);
    return jsonResponse(result, 200, {}, origin);
  } catch (error) {
    if (error instanceof DuplicateUsernameError) {
      return errorResponse("Username already exists.", 409, origin);
    }
    if (error instanceof SupabaseConfigError) {
      return errorResponse("Server configuration error.", 500, origin);
    }
    return errorResponse("Failed to register user.", 500, origin);
  }
}

export async function handleLogin(req: Request, origin: string | null): Promise<Response> {
  let payload: AuthPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Missing username or password.", 400, origin);
  }

  const fields = parseAuthFields(payload);
  if (!fields) return errorResponse("Missing username or password.", 400, origin);

  try {
    const result = await verifyLogin(fields.username, fields.password);
    if (!result) return errorResponse("Invalid username or password.", 401, origin);
    return jsonResponse(result, 200, {}, origin);
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return errorResponse("Server configuration error.", 500, origin);
    }
    return errorResponse("Failed to login user.", 500, origin);
  }
}
