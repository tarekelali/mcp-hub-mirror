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

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "GET") {
    return json({ ok: false, code: "method_not_allowed" }, 405);
  }

  const clientId = Deno.env.get("APS_CLIENT_ID");
  const clientSecret = Deno.env.get("APS_CLIENT_SECRET");
  const redirectUrl = Deno.env.get("APS_REDIRECT_URL");
  const webOrigin = Deno.env.get("WEB_ORIGIN");

  return json({
    hasId: !!clientId,
    idLen: clientId?.length || 0,
    hasSecret: !!clientSecret,
    secretLen: clientSecret?.length || 0,
    redirect: redirectUrl,
    origin: webOrigin,
  });
});