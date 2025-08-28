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
  const path = url.pathname.replace(/\/+$/, "");
  
  console.log(`CMP Files API: ${req.method} ${path}`);
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, 
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  // GET /api/cmp/:id/sheets
  const m1 = path.match(/\/api\/cmp\/([0-9a-f-]{36})\/sheets$/i);
  if (m1 && req.method === "GET") {
    const cmpId = m1[1];
    console.log(`Fetching sheets for CMP: ${cmpId}`);
    
    const { data, error } = await supabase
      .from("revit_sheets")
      .select("id,name,number,acc_item_id,acc_version_id,pdf_url,last_synced_at")
      .eq("cmp_id", cmpId)
      .order("number", { ascending: true });
      
    if (error) {
      console.error("Error fetching sheets:", error);
      return j({ ok: false, code: "sheets_failed", message: error.message }, 500);
    }
    
    console.log(`Found ${data?.length || 0} sheets`);
    return j({ sheets: data ?? [] });
  }

  // GET /api/contacts/:cmpId
  const m2 = path.match(/\/api\/contacts\/([0-9a-f-]{36})$/i);
  if (m2 && req.method === "GET") {
    const cmpId = m2[1];
    console.log(`Fetching contact for CMP: ${cmpId}`);
    
    const { data, error } = await supabase
      .from("contacts")
      .select("name,role,email,phone")
      .eq("cmp_id", cmpId)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching contact:", error);
      return j({ ok: false, code: "contact_failed", message: error.message }, 500);
    }
    
    console.log(`Contact found: ${data ? 'yes' : 'no'}`);
    return j({ contact: data ?? null });
  }

  console.log("Route not found:", path);
  return j({ ok: false, code: "not_found" }, 404);
  
  function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { 
      status, 
      headers: { "content-type": "application/json", ...corsHeaders } 
    });
  }
});