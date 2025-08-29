import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function env(name: string) {
  const v = Deno.env.get(name);
  return (typeof v === "string" ? v.trim() : v) || undefined;
}

const APS_CLIENT_ID = env("APS_CLIENT_ID");
const APS_CLIENT_SECRET = env("APS_CLIENT_SECRET");
const WEB_ORIGIN = env("WEB_ORIGIN");

const ORIGIN = WEB_ORIGIN || "*";
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type",
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

  const scopes2 = env("APS_SCOPES_2L") ?? "data:read bucket:read viewables:read";

  // Only proceed with token test if we have credentials
  let tokenStatus = 0;
  let tokenBody = "No credentials";
  let hadBasic = false;

  if (APS_CLIENT_ID && APS_CLIENT_SECRET) {
    const basic = "Basic " + btoa(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`);
    hadBasic = !!basic;
    const form = new URLSearchParams({ grant_type: "client_credentials", scope: scopes2 });

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
    scopes_2l: scopes2,
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