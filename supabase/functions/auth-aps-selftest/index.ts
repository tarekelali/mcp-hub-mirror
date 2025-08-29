import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN, APS_SCOPES_2L } from "../_shared/env.ts";

const ORIGIN = WEB_ORIGIN || "*";
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type, x-aps-at, x-aps-rt",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-credentials": "true",
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors } });
}

function mask(v?: string) {
  if (!v) return "";
  return v.length < 8 ? "****" : `${v.slice(0,4)}${"*".repeat(Math.max(4, v.length-8))}${v.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Only proceed with token test if we have credentials
  let tokenStatus = 0;
  let tokenBody = "No credentials";
  let hadBasic = false;

  if (APS_CLIENT_ID && APS_CLIENT_SECRET) {
    const basic = "Basic " + btoa(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`);
    hadBasic = !!basic;
    const form = new URLSearchParams({ grant_type: "client_credentials", scope: APS_SCOPES_2L });

    const r = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", authorization: basic },
      body: form,
    });

    tokenStatus = r.status;
    tokenBody = r.ok ? "SUCCESS" : await r.text();
  }

  return j({
    client_id_masked: mask(APS_CLIENT_ID),
    secret_len: (APS_CLIENT_SECRET?.length ?? 0),
    scopes_2l: APS_SCOPES_2L,
    missing: {
      APS_CLIENT_ID: !APS_CLIENT_ID,
      APS_CLIENT_SECRET: !APS_CLIENT_SECRET,
      WEB_ORIGIN: !WEB_ORIGIN,
    },
    token_status: tokenStatus,
    token_body: tokenBody,
    had_basic: hadBasic,
  }, 200);
});