export function env(name: string) {
  const v = Deno.env.get(name);
  return (typeof v === "string" ? v.trim() : v) || undefined;
}

export const APS_CLIENT_ID     = env("APS_CLIENT_ID");
export const APS_CLIENT_SECRET = env("APS_CLIENT_SECRET");
export const WEB_ORIGIN        = env("WEB_ORIGIN");
export const APS_SCOPES_2L     = env("APS_SCOPES_2L") ?? "data:read bucket:read viewables:read";
export const APS_SCOPES_3L     = env("APS_SCOPES_3L") ?? "data:read viewables:read account:read offline_access";

// Log environment presence at module load (no secret values)
console.log("[env] has_id:", !!APS_CLIENT_ID, "has_secret:", !!APS_CLIENT_SECRET, "origin:", WEB_ORIGIN);