// Deno runtime Edge Function (Supabase). Exposes:
//   GET /api/countries
//   GET /api/countries/:code/cmp
//
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

type CountryRow = { code: string; name: string };
type CmpRow = { id: string; name: string; country_code: string; published: boolean };

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");
  
  console.log(`API Countries: ${req.method} ${path}`);
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")! // read-only public routes
  );

  // GET /api/countries
  if (path.endsWith("/api/countries") && req.method === "GET") {
    console.log("Fetching countries list");
    
    // If mv_country_counts exists, use it; else compute on the fly.
    const { data: mv, error: mvErr } = await supabase
      .from("mv_country_counts")
      .select("code,name,centroid,total,published,unpublished")
      .order("code", { ascending: true });
    if (!mvErr && mv) {
      console.log("Using materialized view for countries");
      return json(mv);
    }
    
    // Fallback: compute counts on the fly
    const { data: countries, error: cErr } = await supabase
      .from("countries")
      .select("code,name,centroid")
      .order("code", { ascending: true });
    if (cErr) {
      console.error("Error fetching countries:", cErr);
      return err(500, "countries_select_failed", cErr.message);
    }
    
    console.log(`Computing counts for ${countries?.length || 0} countries`);
    const results = [];
    
    for (const c of countries as CountryRow[]) {
      const [{ count: total }, { count: pub }, { count: unpub }] = await Promise.all([
        supabase.from("cmps").select("*", { count: "exact", head: true }).eq("country_code", c.code),
        supabase.from("cmps").select("*", { count: "exact", head: true }).eq("country_code", c.code).eq("published", true),
        supabase.from("cmps").select("*", { count: "exact", head: true }).eq("country_code", c.code).eq("published", false),
      ]);
      results.push({ 
        code: c.code, 
        name: c.name, 
        centroid: (c as any).centroid ?? null,
        total: total ?? 0, 
        published: pub ?? 0, 
        unpublished: unpub ?? 0 
      });
    }
    
    console.log(`Returning ${results.length} countries with counts`);
    return json(results);
  }

  // GET /api/countries/:code/cmp
  const match = path.match(/\/api\/countries\/([A-Za-z0-9_-]+)\/cmp$/);
  if (match && req.method === "GET") {
    const code = match[1];
    console.log(`Fetching CMPs for country: ${code}`);
    
    const { data, error } = await supabase
      .from("cmps")
      .select("id, name, country_code, published")
      .eq("country_code", code)
      .order("name", { ascending: true });

    if (error) {
      console.error(`Error fetching CMPs for ${code}:`, error);
      return err(500, "cmp_list_failed", error.message);
    }
    
    console.log(`Found ${data?.length || 0} CMPs for country ${code}`);
    return json({ country: code, cmps: data ?? [] });
  }

  console.log("Route not found:", path);
  return err(404, "not_found", "Route not found");

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 
        "content-type": "application/json", 
        "cache-control": "public, s-maxage=300",
        ...corsHeaders 
      },
    });
  }
  
  function err(status: number, code: string, message: string) {
    return json({ ok: false, code, message }, status);
  }
});