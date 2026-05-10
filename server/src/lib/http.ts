import { Env } from "../types";

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function getOrigin(request: Request, env: Env) {
  const requestOrigin = request.headers.get("Origin");
  if (env.ALLOWED_ORIGIN) {
    return env.ALLOWED_ORIGIN;
  }

  return requestOrigin ?? "*";
}

export function withCorsHeaders(response: Response, request: Request, env: Env) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", getOrigin(request, env));
  headers.set("Access-Control-Allow-Headers", "content-type, authorization");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized.") {
  return json({ error: message }, { status: 401 });
}

export function notFound() {
  return json({ error: "Not found." }, { status: 404 });
}

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
