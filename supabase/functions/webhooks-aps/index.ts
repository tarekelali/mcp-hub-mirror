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
    return err(405, "method_not_allowed", "Use POST");
  }

  console.log("APS Webhook: Processing webhook callback");

  // Validate webhook secret
  const secret = Deno.env.get("APS_WEBHOOK_SECRET");
  const sig = req.headers.get("x-aps-signature");
  if (!secret || !sig || sig !== secret) {
    console.error("Unauthorized webhook request - invalid signature");
    return new Response(JSON.stringify({ ok: false, code: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  console.log("Webhook signature validated successfully");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: any;
  try { 
    payload = await req.json(); 
  } catch { 
    return err(400, "bad_json", "Invalid JSON"); 
  }

  // Expecting APS webhook formats. For now, accept a minimal DA result shape:
  // { workitem_id, status, output_urls, cmp_id }
  const { workitem_id, status, output_urls, cmp_id } = payload ?? {};
  
  if (!workitem_id || !status) {
    return err(400, "missing_fields", "workitem_id and status required");
  }

  console.log(`Updating DA job with workitem_id: ${workitem_id}, status: ${status}`);

  const { error } = await supabase
    .from("da_jobs")
    .update({ 
      status, 
      output_urls,
      ...(output_urls && { output_urls })
    })
    .eq("workitem_id", workitem_id);

  if (error) {
    console.error("Failed to update DA job:", error);
    return err(500, "da_job_update_failed", error.message);
  }

  console.log(`Successfully updated DA job for workitem: ${workitem_id}`);
  return json({ ok: true });

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { 
      status, 
      headers: { "content-type": "application/json", ...corsHeaders } 
    });
  }
  
  function err(status: number, code: string, message: string) {
    return json({ ok: false, code, message }, status);
  }
});