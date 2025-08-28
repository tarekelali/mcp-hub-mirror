import { get2LToken } from "./token.ts";

export const scopes = {
  viewer: Deno.env.get("APS_SCOPES_2L") ?? "data:read bucket:read viewables:read",
};

export async function bearer(scope = scopes.viewer) {
  const token = await get2LToken(scope);
  return { Authorization: `Bearer ${token}` };
}