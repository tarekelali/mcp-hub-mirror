import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get("WEB_ORIGIN") || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return json({ ok: false, code: "method_not_allowed" }, 405);
  }

  console.log("Viewer Sign: Processing token request");

  const clientId = Deno.env.get("APS_CLIENT_ID");
  const clientSecret = Deno.env.get("APS_CLIENT_SECRET");
  const scopes = Deno.env.get("APS_SCOPES_2L") ?? "data:read bucket:read viewables:read";

  if (!clientId || !clientSecret) {
    console.error("Missing APS credentials");
    return json({ ok: false, code: "missing_aps_env", message: "APS env vars missing" }, 500);
  }

  console.log(`Using scopes: ${scopes}`);

  // 2-legged OAuth
  const authHeader = "Basic " + btoa(`${clientId}:${clientSecret}`);

  try {
    const res = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
      method: "POST",
      headers: { 
        "content-type": "application/x-www-form-urlencoded",
        "authorization": authHeader
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: scopes,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`APS token request failed: ${res.status} - ${text}`);
      return json({ ok: false, code: "aps_token_failed", status: res.status, body: text }, 502);
    }

    const token = await res.json();
    console.log("Successfully obtained APS token");
    
    // Expected: { access_token, token_type, expires_in }
    return json({ 
      access_token: token.access_token, 
      expires_in: token.expires_in 
    });

  } catch (error) {
    console.error("Error requesting APS token:", error);
    return json({ 
      ok: false, 
      code: "aps_request_error", 
      message: "Failed to request token from APS" 
    }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }
});