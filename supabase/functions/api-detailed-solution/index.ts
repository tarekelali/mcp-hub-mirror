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
  
  if (req.method !== "GET") {
    return j({ ok: false, code: "method_not_allowed" }, 405);
  }

  const url = new URL(req.url);
  const match = url.pathname.replace(/\/+$/, "").match(/\/api\/detailed-solution\/([0-9a-f-]{36})\/theatre$/i);
  
  if (!match) {
    return j({ ok: false, code: "not_found" }, 404);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, 
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  
  const id = match[1];
  console.log(`Detailed Solution Theatre: Fetching theatre data for DS ${id}`);

  const { data, error } = await supabase
    .from("detailed_solutions")
    .select("id, code, name, urn_current, urn_crs, urn_country, urn_similar")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching detailed solution:", error);
    return j({ ok: false, code: "select_failed", message: error.message }, 500);
  }
  
  if (!data) {
    console.log(`Detailed solution ${id} not found`);
    return j({ ok: false, code: "not_found" }, 404);
  }

  console.log(`Found detailed solution: ${data.name} (${data.code})`);

  return j({
    id: data.id,
    code: data.code,
    name: data.name,
    viewer: {
      current: data.urn_current || null,
      crs: data.urn_crs || null,
      country: data.urn_country || null,
      similar: data.urn_similar || null
    }
  });

  function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { 
      status, 
      headers: { "content-type": "application/json", ...corsHeaders } 
    });
  }
});