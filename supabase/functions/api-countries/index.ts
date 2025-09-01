// Deno runtime Edge Function (Supabase). Exposes:
//   GET /api/countries
//   GET /api/countries/:code/cmp
//
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { cors } from "../_shared/cors.ts";
import { CountriesResponseSchema, validateSchema } from "../_shared/schemas.ts";

const WEB_ORIGIN = Deno.env.get("WEB_ORIGIN") || "*";
const corsHeaders = cors(WEB_ORIGIN);

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
    console.log("Fetching countries list from acc_country_counts");
    
    // Use service role to access materialized view
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data: accCountries, error: accErr } = await serviceSupabase
      .from("acc_country_counts")
      .select("country_code, country_name, total_projects, high_confidence_projects, centroid")
      .order("total_projects", { ascending: false });

    if (!accErr && Array.isArray(accCountries) && accCountries.length > 0) {
      console.log(`Using ACC materialized view: ${accCountries.length} countries`);
      const response = accCountries.map(country => ({
        code: country.country_code,
        name: country.country_name,
        total: country.total_projects,
        published: country.high_confidence_projects,
        unpublished: country.total_projects - country.high_confidence_projects,
        centroid: country.centroid
      }));
      
      // Validate response schema
      const validation = validateSchema(response, CountriesResponseSchema);
      if (!validation.valid) {
        console.error("Countries response schema validation failed:", validation.errors);
        return err(500, "schema_validation_failed", "Response does not match expected schema");
      }
      
      return json(response);
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
    
    // Validate response schema
    const validation = validateSchema(results, CountriesResponseSchema);
    if (!validation.valid) {
      console.error("Countries response schema validation failed:", validation.errors);
      return err(500, "schema_validation_failed", "Response does not match expected schema");
    }
    
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