import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors } });
}

function mask(s?: string) { 
  if (!s) return ""; 
  return s.slice(0, 4) + "*".repeat(Math.max(4, s.length - 8)) + s.slice(-4); 
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const id = Deno.env.get("APS_CLIENT_ID") ?? "";
  const secret = Deno.env.get("APS_CLIENT_SECRET") ?? "";
  const scopes2 = Deno.env.get("APS_SCOPES_2L") ?? "data:read bucket:read viewables:read";

  const basic = "Basic " + btoa(`${id}:${secret}`);
  const form = new URLSearchParams({ grant_type: "client_credentials", scope: scopes2 });

  const r = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: basic },
    body: form,
  });

  const text = await r.text();
  return j({
    client_id_masked: mask(id),
    secret_len: secret.length,
    scopes_2l: scopes2,
    token_status: r.status,
    token_body: text,
    had_basic: !!basic,
  }, 200);
});