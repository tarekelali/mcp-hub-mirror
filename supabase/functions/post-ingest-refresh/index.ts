import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async () => {
  console.log("Post-Ingest Refresh: Refreshing materialized views");
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, 
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  const { error } = await supabase.rpc("refresh_mv_country_counts");
  
  if (error) {
    console.error("Failed to refresh materialized view:", error);
    return json({ ok: false, code: "refresh_failed", message: error.message }, 500);
  }
  
  console.log("Successfully refreshed mv_country_counts");
  return json({ ok: true });

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { 
      status, 
      headers: { "content-type": "application/json" } 
    });
  }
});