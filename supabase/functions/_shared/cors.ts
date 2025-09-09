export const cors = (requestOrigin: string, allowedOrigins?: string) => {
  const allowed = (allowedOrigins || Deno.env.get("WEB_ORIGIN") || "*").trim();

  // helper to test wildcard tokens like "*.lovable.app"
  const matches = (origin: string, token: string) => {
    if (token === "*") return true;
    if (token === origin) return true;
    if (token.startsWith("*.")) {
      const suffix = token.slice(1); // ".lovable.app"
      return origin.endsWith(suffix);
    }
    return false;
  };

  // If "*" → echo the request origin (needed when credentials: 'include')
  if (allowed === "*") {
    return {
      "access-control-allow-origin": requestOrigin || "*",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-aps-at, x-aps-rt",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-credentials": "true",
      "vary": "Origin",
    };
  }

  const tokens = allowed.split(",").map(s => s.trim()).filter(Boolean);
  const ok = requestOrigin && tokens.some(t => matches(requestOrigin, t));
  const effective = ok ? requestOrigin : (tokens.find(t => t !== "*") || "");

  return {
    "access-control-allow-origin": effective,
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-aps-at, x-aps-rt",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-credentials": "true",
    "vary": "Origin",
  };
};

export const authCors = (requestOrigin: string, allowedOrigins?: string) => ({
  ...cors(requestOrigin, allowedOrigins),
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
});

export const dataCors = (requestOrigin: string, allowedOrigins?: string) => ({
  ...cors(requestOrigin, allowedOrigins),
  "cache-control": "public, max-age=30",
});