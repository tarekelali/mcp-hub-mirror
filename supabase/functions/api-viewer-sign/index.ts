import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Updated with proper error handling for missing env vars

function env(name: string) {
  const v = Deno.env.get(name);
  return (typeof v === "string" ? v.trim() : v) || undefined;
}

const APS_CLIENT_ID = env("APS_CLIENT_ID");
const APS_CLIENT_SECRET = env("APS_CLIENT_SECRET");
const WEB_ORIGIN = env("WEB_ORIGIN");

const ORIGIN = WEB_ORIGIN || "*";
const corsHeaders = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-aps-at, x-aps-rt',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
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

  const scopes = env("APS_SCOPES_2L") ?? "data:read bucket:read viewables:read";

  // Only require APS_CLIENT_ID and APS_CLIENT_SECRET for 2-legged
  if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) {
    console.error("Missing required APS credentials");
    return json({ 
      ok: false, 
      code: "missing_aps_env", 
      missing: {
        "APS_CLIENT_ID": !APS_CLIENT_ID,
        "APS_CLIENT_SECRET": !APS_CLIENT_SECRET,
        "WEB_ORIGIN": !WEB_ORIGIN
      }
    }, 500);
  }

  console.log(`Using scopes: ${scopes}`);

  // 2-legged OAuth
  const authHeader = "Basic " + btoa(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`);

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