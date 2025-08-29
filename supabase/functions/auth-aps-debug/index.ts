import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

function getCookie(header: string | null, name: string) {
  return (`; ${header ?? ""}`).split(`; ${name}=`).pop()?.split(";")[0];
}

function maskClientId(clientId: string | undefined): string {
  if (!clientId || clientId.length < 8) return "****";
  const start = clientId.slice(0, 4);
  const end = clientId.slice(-4);
  const middle = "*".repeat(Math.max(4, clientId.length - 8));
  return `${start}${middle}${end}`;
}

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "GET") {
    return json({ ok: false, code: "method_not_allowed" }, 405);
  }

  const clientId = Deno.env.get("APS_CLIENT_ID");
  const webOrigin = Deno.env.get("WEB_ORIGIN");
  const scopes2L = Deno.env.get("APS_SCOPES_2L") ?? "data:read bucket:read viewables:read";
  const scopes3L = Deno.env.get("APS_SCOPES_3L") ?? "data:read viewables:read account:read";
  
  const cookies = req.headers.get("cookie") ?? "";
  const hasAtCookie = !!getCookie(cookies, "aps_at");
  const hasRtCookie = !!getCookie(cookies, "aps_rt");

  return json({
    web_origin: webOrigin,
    scopes_2l: scopes2L,
    scopes_3l: scopes3L,
    has_at_cookie: hasAtCookie,
    has_rt_cookie: hasRtCookie,
    client_id_masked: maskClientId(clientId),
  });
});