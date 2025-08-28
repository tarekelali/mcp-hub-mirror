type TokenResp = { access_token: string; token_type: string; expires_in: number };
type Cache = { token?: string; expiresAt?: number };
const cache2L: Cache = {};

export async function get2LToken(scopes: string): Promise<string> {
  const now = Date.now() / 1000;
  if (cache2L.token && cache2L.expiresAt && cache2L.expiresAt - now > 60) return cache2L.token;

  const clientId = Deno.env.get("APS_CLIENT_ID")!;
  const clientSecret = Deno.env.get("APS_CLIENT_SECRET")!;
  const body = new URLSearchParams({ grant_type: "client_credentials", scope: scopes });

  const res = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      // Basic auth per APS v2
      Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
    },
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  const tok: TokenResp = await res.json();
  cache2L.token = tok.access_token;
  cache2L.expiresAt = Math.floor(Date.now() / 1000) + tok.expires_in;
  return tok.access_token;
}