export const cors = (requestOrigin: string, allowedOrigins?: string) => {
  // Get allowed origins from environment or use wildcard
  const allowed = allowedOrigins || Deno.env.get("WEB_ORIGIN") || "*";
  
  // For wildcard, echo the request origin to support credentials
  if (allowed === "*") {
    return {
      "access-control-allow-origin": requestOrigin || "*",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-aps-at, x-aps-rt",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-credentials": "true",
      "vary": "Origin",
    };
  }
  
  // Check if request origin is in allowed list
  const allowedList = allowed.split(",").map(o => o.trim());
  const origin = allowedList.includes(requestOrigin) ? requestOrigin : allowedList[0] || "*";
  
  return {
    "access-control-allow-origin": origin,
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