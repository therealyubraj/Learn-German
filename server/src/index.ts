import { json, withCorsHeaders } from "./lib/http";
import { route } from "./router";
import { Env } from "./types";

export default {
  async fetch(request: Request, env: Env) {
    try {
      const response = await route(request, env);
      return withCorsHeaders(response, request, env);
    } catch (error) {
      console.error("Unhandled worker error", error);
      return withCorsHeaders(
        json({ error: "Internal server error." }, { status: 500 }),
        request,
        env,
      );
    }
  },
};
