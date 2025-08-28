import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async () => {
  console.log("Monthly Ingest: Starting scheduled ingest run");
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, 
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Start run
  const { data: run, error: e1 } = await supabase.from("ingest_runs")
    .insert({ 
      status: "running", 
      cadence: Deno.env.get("INGEST_CADENCE") ?? "monthly" 
    })
    .select().single();
    
  if (e1) {
    console.error("Failed to start ingest run:", e1);
    return json({ ok: false, code: "start_failed", message: e1.message }, 500);
  }

  console.log(`Started ingest run ${run.id}`);

  try {
    // TODO: pull pilot CMP ids from config/table; process in batches; update cmps/hfbs/... tables
    console.log("Processing ingest batches - placeholder for ACC integration");
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Finish run successfully
    const { error: e2 } = await supabase.from("ingest_runs")
      .update({ 
        status: "succeeded", 
        finished_at: new Date().toISOString() 
      })
      .eq("id", run.id);
      
    if (e2) {
      console.error("Failed to finish ingest run:", e2);
      return json({ ok: false, code: "finish_failed", message: e2.message }, 500);
    }

    console.log(`Successfully completed ingest run ${run.id}`);
    
    // Refresh materialized views
    try {
      const functionsUrl = Deno.env.get("SUPABASE_FUNCTIONS_URL") || "https://kuwrhanybqhfnwvshedl.functions.supabase.co";
      await fetch(`${functionsUrl}/post-ingest-refresh`, { method: "POST" });
      console.log("Materialized view refresh triggered");
    } catch (error) {
      console.warn("Failed to trigger materialized view refresh:", error);
    }
    
    return json({ ok: true, runId: run.id });
    
  } catch (error) {
    console.error("Ingest run failed:", error);
    
    // Mark run as failed
    await supabase.from("ingest_runs")
      .update({ 
        status: "failed", 
        finished_at: new Date().toISOString(),
        notes: error instanceof Error ? error.message : "Unknown error"
      })
      .eq("id", run.id);
      
    return json({ ok: false, code: "processing_failed", message: String(error) }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { 
      status, 
      headers: { "content-type": "application/json" } 
    });
  }
});