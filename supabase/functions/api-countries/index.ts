// Deno runtime Edge Function (Supabase). Exposes:
//   GET /api/countries
//   GET /api/countries/:code/cmp
//
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import { dataCors } from "../_shared/cors.ts";
import { CountriesResponseSchema, validateSchema } from "../_shared/schemas.ts";

type CountryRow = { code: string; name: string };
type CmpRow = { id: string; name: string; country_code: string; published: boolean };

// Helper to normalize centroid data from various formats
function normalizeCentroid(centroid: any): { lat: number; lng: number } | null {
  if (!centroid) return null;
  
  // Handle GeoJSON Point format
  if (centroid.type === 'Point' && Array.isArray(centroid.coordinates)) {
    return { lat: centroid.coordinates[1], lng: centroid.coordinates[0] };
  }
  
  // Handle array format [lng, lat]
  if (Array.isArray(centroid) && centroid.length >= 2) {
    return { lat: centroid[1], lng: centroid[0] };
  }
  
  // Handle object with lat/lng properties
  if (typeof centroid === 'object' && centroid.lat !== undefined && centroid.lng !== undefined) {
    return { lat: Number(centroid.lat), lng: Number(centroid.lng) };
  }
  
  // Handle WKT POINT format
  if (typeof centroid === 'string') {
    const wktMatch = centroid.match(/POINT\s*\(\s*([^)]+)\s*\)/i);
    if (wktMatch) {
      const coords = wktMatch[1].split(/\s+/).map(Number);
      if (coords.length >= 2) {
        return { lat: coords[1], lng: coords[0] };
      }
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin") || "";
  const corsHeaders = dataCors(requestOrigin);
  
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

  // GET /api/countries (both /api-countries and /api-countries/api/countries for compatibility)
  if ((path === "/api-countries" || path.endsWith("/api/countries")) && req.method === "GET") {
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
        total: Number(country.total_projects || 0),
        published: Number(country.high_confidence_projects || 0),
        unpublished: Number((country.total_projects || 0) - (country.high_confidence_projects || 0)),
        centroid: normalizeCentroid(country.centroid)
      })).filter(country => country.code && country.name); // Filter out invalid entries
      
      // Validate response schema
      const validation = validateSchema(response, CountriesResponseSchema);
      if (!validation.valid) {
        console.error("ACC materialized view schema validation failed:", validation.errors);
        console.error("Sample ACC data:", JSON.stringify(response.slice(0, 2), null, 2));
        // Instead of returning 500, filter out invalid items and continue
        const validItems = response.filter((item, index) => {
          const itemValidation = validateSchema([item], CountriesResponseSchema);
          if (!itemValidation.valid) {
            console.error(`Invalid item at index ${index}:`, JSON.stringify(item, null, 2));
            console.error(`Validation error:`, itemValidation.errors);
            return false;
          }
          return true;
        });
        console.log(`Filtered ${response.length - validItems.length} invalid items, returning ${validItems.length} valid items`);
        return json(validItems);
      }
      
      return json(response);
    }
    
    // No fallback - require materialized view
    console.error("Country counts materialized view not available");
    return err(503, "mv_unavailable", "Country counts not ready. Run acc-projects-sync.");
  }

  // GET /api/countries/cmps (all CMPs)
  if ((path === "/api-countries/cmps" || path.endsWith("/api/countries/cmps")) && req.method === "GET") {
    console.log("Fetching all CMPs");
    
    const { data, error } = await supabase
      .from("cmps")
      .select(`
        id, 
        name, 
        country_code, 
        published,
        countries!inner(name, centroid)
      `)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching all CMPs:", error);
      return err(500, "all_cmps_failed", error.message);
    }
    
    const cmps = (data ?? []).map((cmp: any) => ({
      id: cmp.id,
      name: cmp.name,
      country_code: cmp.country_code,
      country_name: cmp.countries?.name || cmp.country_code,
      published: cmp.published,
      centroid: normalizeCentroid(cmp.countries?.centroid)
    }));
    
    console.log(`Returning ${cmps.length} CMPs`);
    return json(cmps);
  }

  // GET /api/countries/:code/cmp (both /api-countries/:code/cmp and /api-countries/api/countries/:code/cmp)
  const match = path.match(/\/(?:api-countries|api\/countries)\/([A-Za-z0-9_-]+)\/cmp$/);
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