import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, WEB_ORIGIN, APS_SCOPES_3L } from "../_shared/env.ts";

const ORIGIN = WEB_ORIGIN || "*";
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type, x-aps-at, x-aps-rt",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-credentials": "true",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok:false, code:"method_not_allowed" }), { status:405, headers: { "content-type":"application/json", ...cors }});
  }

  const state = crypto.randomUUID();
  const authUrl = new URL("https://developer.api.autodesk.com/authentication/v2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", APS_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", Deno.env.get("APS_REDIRECT_URL")!);
  authUrl.searchParams.set("scope", APS_SCOPES_3L);
  authUrl.searchParams.set("state", state);

  // IMPORTANT: cookies must be cross-site friendly for the popup:
  // Secure; HttpOnly; SameSite=None; Path=/
  const headers = new Headers({
    Location: authUrl.toString(),
    ...cors,
    "Set-Cookie": [
      `aps_state=${state}; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=600`,
      // (optional) remember where we started from
      `aps_o=1; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=600`,
    ].join(", "),
  });

  return new Response(null, { status: 302, headers });
});