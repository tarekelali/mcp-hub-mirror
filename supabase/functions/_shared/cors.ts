export const cors = (origin: string) => {
  // Support comma-separated allowlist and wildcard
  const allowedOrigins = origin || "*";
  return {
    "access-control-allow-origin": allowedOrigins,
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-aps-at, x-aps-rt",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-credentials": "true",
  };
};

export const authCors = (origin: string) => ({
  ...cors(origin),
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
});

export const dataCors = (origin: string) => ({
  ...cors(origin),
  "cache-control": "public, max-age=30",
});