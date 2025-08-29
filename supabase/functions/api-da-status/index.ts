import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  const url = new URL(req.url);
  const cmpId = url.searchParams.get("cmpId");
  if (!cmpId) return j({ ok:false, code:"missing_cmpId" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await supabase
    .from("da_jobs")
    .select("id, task, status, attempts, created_at, workitem_id")
    .eq("cmp_id", cmpId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return j({ ok:false, code:"select_failed", message:error.message }, 500);
  return j({ ok:true, jobs: data ?? [] });

  function j(body: unknown, status=200) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type":"application/json", ...cors } });
  }
});