import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

type Cmp = { 
  id: string; 
  name: string; 
  country_code: string; 
  published: boolean; 
  area_sqm: number | null;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "GET") {
    return err(405, "method_not_allowed", "Use GET");
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  const match = path.match(/\/api\/cmp\/([0-9a-f-]{36})\/overview$/i);
  
  if (!match) {
    return err(404, "not_found", "Route not found");
  }

  const cmpId = match[1];
  console.log(`CMP Overview: Fetching overview for CMP ${cmpId}`);
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  // Fetch CMP details
  const { data: cmp, error: cmpErr } = await supabase
    .from("cmps")
    .select("id, name, country_code, published, area_sqm, acc_project_id, acc_folder_id")
    .eq("id", cmpId)
    .maybeSingle();

  if (cmpErr) {
    console.error("Error fetching CMP:", cmpErr);
    return err(500, "cmp_select_failed", cmpErr.message);
  }
  
  if (!cmp) {
    console.log(`CMP ${cmpId} not found`);
    return err(404, "cmp_not_found", "CMP not found");
  }

  console.log(`Found CMP: ${cmp.name} (${cmp.country_code})`);

  // HFBs grouped by level with totals and percentages
  const { data: hfbs, error: hErr } = await supabase
    .from("hfbs")
    .select("id, name, level, area_sqm, pct")
    .eq("cmp_id", cmpId);

  if (hErr) {
    console.error("Error fetching HFBs:", hErr);
    return err(500, "hfbs_select_failed", hErr.message);
  }

  console.log(`Found ${hfbs?.length || 0} HFBs for CMP`);

  const left = hfbs?.filter((h: any) => h.level === "marketHall") ?? [];
  const right = hfbs?.filter((h: any) => h.level === "showroom") ?? [];

  const res = {
    cmp: {
      id: cmp.id,
      name: cmp.name,
      countryCode: cmp.country_code,
      published: cmp.published,
      areaSqm: cmp.area_sqm,
      accProjectId: (cmp as any).acc_project_id,
      accFolderId: (cmp as any).acc_folder_id,
    },
    structure: {
      marketHall: summarize(left),
      showroom: summarize(right),
    },
    counts: {
      hfbs: hfbs?.length ?? 0,
    },
  };

  console.log(`Returning overview for ${cmp.name} with ${res.counts.hfbs} HFBs`);
  return json(res);

  function summarize(items: any[]) {
    const totalPct = sum(items.map((i) => Number(i.pct ?? 0)));
    return {
      totalPct,
      items: items
        .map((i) => ({
          id: i.id,
          name: i.name,
          areaSqm: Number(i.area_sqm ?? 0),
          percentage: Number(i.pct ?? 0),
        }))
        .sort((a, b) => b.percentage - a.percentage),
    };
  }
  
  function sum(arr: number[]) { 
    return arr.reduce((a, b) => a + b, 0); 
  }
  
  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { 
      status, 
      headers: { 
        "content-type": "application/json", 
        "cache-control": "public, s-maxage=300",
        ...corsHeaders 
      } 
    });
  }
  
  function err(status: number, code: string, message: string) {
    return json({ ok: false, code, message }, status);
  }
});