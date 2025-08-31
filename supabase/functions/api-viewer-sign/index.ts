import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN, APS_SCOPES_2L } from "../_shared/env.ts";

const ORIGIN = WEB_ORIGIN || "*";
const corsHeaders = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-aps-at, x-aps-rt',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

async function trackMetrics(functionName: string, statusClass: string) {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("aps_metrics").upsert({
      day: new Date().toISOString().split('T')[0],
      function_name: functionName,
      status_class: statusClass,
      count: 1
    }, {
      onConflict: "day,function_name,status_class",
      ignoreDuplicates: false
    });
  } catch (error) {
    console.error("Metrics tracking failed:", error);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    await trackMetrics("api-viewer-sign", "error");
    return json({ ok: false, code: "method_not_allowed" }, 405);
  }

  console.log("Viewer Sign: Processing token request");

  // Only require APS_CLIENT_ID and APS_CLIENT_SECRET for 2-legged
  if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) {
    console.error("Missing required APS credentials");
    await trackMetrics("api-viewer-sign", "error");
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

  console.log(`Using scopes: ${APS_SCOPES_2L}`);

  // 2-legged OAuth with Basic auth
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
        scope: APS_SCOPES_2L,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`APS token request failed: ${res.status} - ${text}`);
      await trackMetrics("api-viewer-sign", "error");
      return json({ ok: false, code: "aps_token_failed", status: res.status, body: text }, 502);
    }

    const token = await res.json();
    console.log("Successfully obtained APS token");
    await trackMetrics("api-viewer-sign", "success");
    
    // Expected: { access_token, token_type, expires_in }
    return json({ 
      access_token: token.access_token, 
      expires_in: token.expires_in 
    });

  } catch (error) {
    console.error("Error requesting APS token:", error);
    await trackMetrics("api-viewer-sign", "error");
    return json({ 
      ok: false, 
      code: "aps_request_error", 
      message: "Failed to request token from APS" 
    }, 500);
  }
});