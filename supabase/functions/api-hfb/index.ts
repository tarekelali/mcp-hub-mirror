import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  const match = url.pathname.replace(/\/+$/, "").match(/\/api\/hfb\/([0-9a-f-]{36})\/detailed-solutions$/i);
  
  if (!match) {
    return j({ ok: false, code: "not_found" }, 404);
  }

  console.log(`HFB API: Fetching detailed solutions for HFB ${match[1]}`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, 
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  
  const { data, error } = await supabase
    .from("detailed_solutions")
    .select("id, code, name, area_sqm, pct")
    .eq("hfb_id", match[1])
    .order("code", { ascending: true });

  if (error) {
    console.error("Error fetching detailed solutions:", error);
    return j({ ok: false, code: "select_failed", message: error.message }, 500);
  }
  
  console.log(`Found ${data?.length || 0} detailed solutions`);
  return j({ items: data ?? [] });

  function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { 
      status, 
      headers: { "content-type": "application/json", ...corsHeaders } 
    });
  }
});