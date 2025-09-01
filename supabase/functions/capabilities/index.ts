import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { cors } from "../_shared/cors.ts";

const WEB_ORIGIN = Deno.env.get("WEB_ORIGIN") || "*";
const corsHeaders = cors(WEB_ORIGIN);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", ...corsHeaders }
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Test database connectivity
    const { data: healthCheck } = await supabase.from("countries").select("count", { count: "exact", head: true });
    const dbConnected = healthCheck !== null;

    // Check for required tables
    const { data: tables } = await supabase.from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", ["countries", "acc_projects", "cmps", "acc_country_counts"]);

    const hasRequiredTables = tables && tables.length >= 4;

    // Check for materialized view
    const { data: mvCheck } = await supabase.from("acc_country_counts").select("count", { count: "exact", head: true });
    const hasMaterializedView = mvCheck !== null;

    const capabilities = {
      routes: {
        map: true,
        projects: true,
        cmp: true,
        viewer: true
      },
      auth: {
        three_leg: Boolean(Deno.env.get("APS_CLIENT_ID")),
        two_leg: Boolean(Deno.env.get("APS_CLIENT_SECRET"))
      },
      data: {
        countries: dbConnected && hasRequiredTables,
        projects: dbConnected && hasRequiredTables && hasMaterializedView,
        cmps: dbConnected && hasRequiredTables
      },
      ui: {
        skapa: true // UI is always available if the function runs
      },
      diag_hidden: true,
      build: {
        timestamp: new Date().toISOString(),
        sha: Deno.env.get("DENO_DEPLOYMENT_ID") || "unknown",
        version: "1.0.0"
      },
      dependencies: {
        database: dbConnected,
        materialized_views: hasMaterializedView,
        required_tables: hasRequiredTables
      }
    };

    return new Response(JSON.stringify(capabilities, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60",
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error("Capabilities check failed:", error);
    
    const errorCapabilities = {
      routes: { map: false, projects: false, cmp: false, viewer: false },
      auth: { three_leg: false, two_leg: false },
      data: { countries: false, projects: false, cmps: false },
      ui: { skapa: false },
      diag_hidden: true,
      build: {
        timestamp: new Date().toISOString(),
        sha: "unknown",
        version: "1.0.0"
      },
      error: String(error)
    };

    return new Response(JSON.stringify(errorCapabilities, null, 2), {
      status: 503,
      headers: {
        "content-type": "application/json",
        ...corsHeaders
      }
    });
  }
});