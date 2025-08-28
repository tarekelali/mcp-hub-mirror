import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Payload = {
  cmpId: string;
  task: string;              // e.g. "export_sheets"
  input_item_id: string;     // ACC item id
  input_version_id: string;  // ACC version id
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return err(405, "method_not_allowed", "Use POST");
  }

  console.log("DA Revit Job: Processing job enqueue request");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // requires service role to bypass RLS for inserts
  );

  let payload: Payload;
  try { 
    payload = await req.json(); 
  } catch { 
    return err(400, "bad_json", "Invalid JSON"); 
  }

  if (!payload?.cmpId || !payload?.task || !payload?.input_item_id || !payload?.input_version_id) {
    return err(400, "missing_fields", "cmpId, task, input_item_id, input_version_id required");
  }

  console.log(`Enqueueing DA job for CMP ${payload.cmpId}, task: ${payload.task}`);

  // Insert job (queued)
  const { data, error } = await supabase.from("da_jobs").insert({
    cmp_id: payload.cmpId,
    task: payload.task,
    input_item_id: payload.input_item_id,
    input_version_id: payload.input_version_id,
    status: "queued"
  }).select().single();

  if (error) {
    console.error("Failed to insert DA job:", error);
    return err(500, "da_job_insert_failed", error.message);
  }

  console.log(`DA job created with ID: ${data.id}`);

  // TODO: submit APS Design Automation WorkItem here (future task)
  // For now, return job id and status=queued.
  return json({ ok: true, job: data });

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