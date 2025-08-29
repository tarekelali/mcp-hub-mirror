import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

  console.log("Post-Ingest Refresh: Refreshing materialized views");
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, 
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  try {
    const { error } = await supabase.rpc("refresh_mv_country_counts");
    
    if (error) {
      console.error("Failed to refresh materialized view:", error);
      return json({ ok: false, code: "refresh_failed", message: error.message }, 500);
    }
    
    console.log("Successfully refreshed mv_country_counts");
    return json({ ok: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ ok: false, code: "unexpected_error", message: String(err) }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { 
      status, 
      headers: { "content-type": "application/json", ...corsHeaders } 
    });
  }
});