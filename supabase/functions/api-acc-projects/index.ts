import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { dataCors } from "../_shared/cors.ts";
import { ProjectsResponseSchema, validateSchema } from "../_shared/schemas.ts";

function j(body: unknown, status = 200, extraHeaders: HeadersInit = {}, corsHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

async function trackMetrics(functionName: string, statusClass: string) {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("aps_metrics").upsert({
      day: new Date().toISOString().split('T')[0],
      function_name: functionName,
      status_class: statusClass,
      count: 1
    }, {
      onConflict: "day,function_name,status_class",
      ignoreDuplicates: false
    });
  } catch (error) {
    console.error("Metrics tracking failed:", error);
  }
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin") || "";
  const corsHeaders = dataCors(requestOrigin);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    await trackMetrics("api-acc-projects", "method_not_allowed");
    return j({ error: "method_not_allowed" }, 405, {}, corsHeaders);
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);

    // Extract query parameters
    const countryCode = url.searchParams.get("country")?.toUpperCase();
    const searchQuery = url.searchParams.get("q");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    console.log(`Projects query: country=${countryCode}, search=${searchQuery}, limit=${limit}, offset=${offset}`);

    // Build query
    let query = supabase
      .from("acc_projects")
      .select("project_id, name_raw, country_name, country_code, unit_code, unit_number, city, parse_confidence, ingested_at");

    // Apply country filter
    if (countryCode) {
      query = query.eq("country_code", countryCode);
    }

    // Apply search filter across multiple fields
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      query = query.or(`name_raw.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,unit_code.ilike.%${searchTerm}%`);
    }

    // Apply pagination and ordering
    query = query
      .order("parse_confidence", { ascending: false })
      .order("name_raw", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: projects, error } = await query;

    if (error) {
      console.error("Projects query error:", error);
      await trackMetrics("api-acc-projects", "error");
      return j({ error: "database_error", details: error.message }, 500, {}, corsHeaders);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("acc_projects")
      .select("*", { count: "exact", head: true });

    if (countryCode) {
      countQuery = countQuery.eq("country_code", countryCode);
    }

    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      countQuery = countQuery.or(`name_raw.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,unit_code.ilike.%${searchTerm}%`);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error("Count query error:", countError);
    }

    await trackMetrics("api-acc-projects", "success");

    const response = {
      items: projects || [],
      total_count: totalCount || 0,
      has_more: (projects?.length || 0) === limit && offset + limit < (totalCount || 0),
      offset,
      limit,
      filters: {
        ...(countryCode && { country: countryCode }),
        ...(searchQuery && { search: searchQuery })
      }
    };

    // Validate response schema
    const validation = validateSchema(response, ProjectsResponseSchema);
    if (!validation.valid) {
      console.error("Projects response schema validation failed:", validation.errors);
      await trackMetrics("api-acc-projects", "schema_error");
      return j({ error: "schema_validation_failed", details: validation.errors }, 500, {}, corsHeaders);
    }

    return j(response, 200, {}, corsHeaders);

  } catch (error) {
    console.error("API ACC projects error:", error);
    await trackMetrics("api-acc-projects", "error");
    return j({ error: "internal_error", details: String(error) }, 500, {}, corsHeaders);
  }
});