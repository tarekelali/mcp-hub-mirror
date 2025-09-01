import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { cors } from "../_shared/cors.ts";

const WEB_ORIGIN = Deno.env.get("WEB_ORIGIN") || "*";
const corsHeaders = cors(WEB_ORIGIN);

interface HealthCheck {
  ok: boolean;
  latency_ms: number;
  deps: string[];
  endpoint?: string;
  error?: string;
}

async function checkEndpointHealth(endpoint: string): Promise<HealthCheck> {
  const start = Date.now();
  const deps: string[] = [];
  
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (endpoint) {
      case "api-countries":
        deps.push("database", "countries_table", "acc_country_counts_mv");
        const { data: countries, error: countriesError } = await supabase
          .from("acc_country_counts")
          .select("country_code")
          .limit(1);
        
        if (countriesError) throw countriesError;
        
        return {
          ok: true,
          latency_ms: Date.now() - start,
          deps,
          endpoint
        };

      case "api-acc-projects":
        deps.push("database", "acc_projects_table");
        const { data: projects, error: projectsError } = await supabase
          .from("acc_projects")
          .select("project_id")
          .limit(1);
        
        if (projectsError) throw projectsError;
        
        return {
          ok: true,
          latency_ms: Date.now() - start,
          deps,
          endpoint
        };

      case "viewer-sign":
        deps.push("aps_client_credentials");
        const hasCredentials = Boolean(Deno.env.get("APS_CLIENT_ID") && Deno.env.get("APS_CLIENT_SECRET"));
        
        if (!hasCredentials) {
          throw new Error("Missing APS credentials");
        }
        
        return {
          ok: true,
          latency_ms: Date.now() - start,
          deps,
          endpoint
        };

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  } catch (error) {
    return {
      ok: false,
      latency_ms: Date.now() - start,
      deps,
      endpoint,
      error: String(error)
    };
  }
}

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

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  
  // Expected: /health/endpoint-name
  if (pathSegments.length !== 2 || pathSegments[0] !== 'health') {
    return new Response(JSON.stringify({ error: "Invalid path format. Use /health/{endpoint}" }), {
      status: 400,
      headers: { "content-type": "application/json", ...corsHeaders }
    });
  }

  const endpoint = pathSegments[1];
  const validEndpoints = ["api-countries", "api-acc-projects", "viewer-sign"];
  
  if (!validEndpoints.includes(endpoint)) {
    return new Response(JSON.stringify({ 
      error: "Invalid endpoint", 
      valid_endpoints: validEndpoints 
    }), {
      status: 400,
      headers: { "content-type": "application/json", ...corsHeaders }
    });
  }

  const health = await checkEndpointHealth(endpoint);
  const status = health.ok ? 200 : 503;

  return new Response(JSON.stringify(health, null, 2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache",
      ...corsHeaders
    }
  });
});