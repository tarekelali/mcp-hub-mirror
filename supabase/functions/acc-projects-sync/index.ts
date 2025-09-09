import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { WEB_ORIGIN } from "../_shared/env.ts";
import { authCors } from "../_shared/cors.ts";
import { readSessionCookie } from "../_shared/cookies.ts";
import { accessTokenForSession } from "../_shared/aps3l.ts";

// Dynamic CORS based on request origin

// Enhanced country mapping with IKEA-specific aliases
const COUNTRY_MAP: Record<string,string> = {
  // Core countries with common aliases
  Australia: "AU", Netherlands: "NL", Sweden: "SE", "United Kingdom": "GB", UK: "GB", Britain: "GB",
  Italy: "IT", Germany: "DE", Deutschland: "DE", France: "FR", Spain: "ES", España: "ES", Poland: "PL", Polska: "PL",
  Belgium: "BE", Danmark: "DK", Denmark: "DK", Norway: "NO", Norge: "NO", Finland: "FI", Suomi: "FI", 
  Switzerland: "CH", Schweiz: "CH", Austria: "AT", Österreich: "AT",
  Czech: "CZ", "Czech Republic": "CZ", Czechia: "CZ", Slovakia: "SK", Hungary: "HU", Slovenia: "SI",
  Croatia: "HR", Hrvatska: "HR", Serbia: "RS", Srbija: "RS", Romania: "RO", România: "RO",
  Bulgaria: "BG", България: "BG", Greece: "GR", Ελλάδα: "GR", Portugal: "PT", Ireland: "IE", Éire: "IE",
  Lithuania: "LT", Lietuva: "LT", Latvia: "LV", Latvija: "LV", Estonia: "EE", Eesti: "EE",
  Malta: "MT", Cyprus: "CY", Κύπρος: "CY", Luxembourg: "LU", Iceland: "IS", Ísland: "IS",
  
  // North America with aliases
  Canada: "CA", "United States": "US", USA: "US", "U.S.": "US", "U.S.A.": "US", America: "US",
  Mexico: "MX", México: "MX",
  
  // Asia Pacific with aliases  
  Japan: "JP", 日本: "JP", "South Korea": "KR", Korea: "KR", 한국: "KR", Taiwan: "TW", 臺灣: "TW", 台湾: "TW",
  Singapore: "SG", "Hong Kong": "HK", 香港: "HK", Malaysia: "MY", Thailand: "TH", ประเทศไทย: "TH",
  India: "IN", भारत: "IN", China: "CN", 中国: "CN", 中國: "CN", Indonesia: "ID", Philippines: "PH",
  Vietnam: "VN", "Viet Nam": "VN", Việt: "VN", Cambodia: "KH", Laos: "LA", Myanmar: "MM",
  Bangladesh: "BD", "Sri Lanka": "LK", Nepal: "NP", Bhutan: "BT", Maldives: "MV",
  Pakistan: "PK", Afghanistan: "AF", Iran: "IR", Iraq: "IQ", Syria: "SY", Lebanon: "LB", Yemen: "YE",
  
  // Middle East & Africa with aliases
  UAE: "AE", "United Arab Emirates": "AE", "Saudi Arabia": "SA", Israel: "IL", ישראל: "IL",
  Jordan: "JO", Kuwait: "KW", Qatar: "QA", Bahrain: "BH", Oman: "OM",
  "South Africa": "ZA", Egypt: "EG", مصر: "EG", Morocco: "MA", المغرب: "MA", Tunisia: "TN", Algeria: "DZ",
  Turkey: "TR", Türkiye: "TR", Turkiye: "TR", "Russian Federation": "RU", Russia: "RU", Россия: "RU",
  
  // Americas
  Brazil: "BR", Brasil: "BR", Argentina: "AR", Chile: "CL", Colombia: "CO", Peru: "PE", Perú: "PE",
  Venezuela: "VE", Ecuador: "EC", Uruguay: "UY", Paraguay: "PY", Bolivia: "BO",
  "Costa Rica": "CR", Panama: "PA", Panamá: "PA", "Dominican Republic": "DO", "Puerto Rico": "PR",
  Jamaica: "JM", "Trinidad and Tobago": "TT", Barbados: "BB", "New Zealand": "NZ",
  
  // Eastern Europe & Central Asia
  Ukraine: "UA", Україна: "UA", Belarus: "BY", Kazakhstan: "KZ", Uzbekistan: "UZ",
  Georgia: "GE", Armenia: "AM", Azerbaijan: "AZ", Kyrgyzstan: "KG", Tajikistan: "TJ", 
  Turkmenistan: "TM", Moldova: "MD", Mongolia: "MN",
  
  // Africa continued
  Ethiopia: "ET", Kenya: "KE", Uganda: "UG", Tanzania: "TZ", Rwanda: "RW", Burundi: "BI",
  Madagascar: "MG", Mauritius: "MU", Seychelles: "SC", Comoros: "KM", Djibouti: "DJ",
  Somalia: "SO", Eritrea: "ER", Sudan: "SD", "South Sudan": "SS", Chad: "TD",
  "Central African Republic": "CF", Cameroon: "CM", "Equatorial Guinea": "GQ", Gabon: "GA",
  "Republic of the Congo": "CG", "Democratic Republic of the Congo": "CD", Angola: "AO",
  Zambia: "ZM", Zimbabwe: "ZW", Botswana: "BW", Namibia: "NA", "Sao Tome and Principe": "ST",
  "Cape Verde": "CV", "Guinea-Bissau": "GW", Guinea: "GN", "Sierra Leone": "SL", Liberia: "LR",
  "Ivory Coast": "CI", Ghana: "GH", "Burkina Faso": "BF", Mali: "ML", Niger: "NE", Nigeria: "NG",
  Benin: "BJ", Togo: "TG", Senegal: "SN", Gambia: "GM", Mauritania: "MR", "Western Sahara": "EH", Libya: "LY"
};

function parseProjectName(name: string) {
  const parts = name.split("_").filter(Boolean);
  if (parts.length === 0) return { 
    country_code: null, 
    country_name: null, 
    unit_code: null, 
    unit_number: null, 
    city: null, 
    name_raw: name,
    parse_confidence: 0 
  };

  const countryName = parts[0];
  const country_code = COUNTRY_MAP[countryName] ?? null;
  
  let unit_code: string | null = null;
  let unit_number: number | null = null;
  let city: string | null = null;
  let confidence = 0.5; // Base confidence

  if (parts.length >= 2) {
    const maybeUnit = parts[1];
    if (/^[A-Za-z0-9]+$/.test(maybeUnit) && maybeUnit !== "XX" && maybeUnit !== "xxx") {
      unit_code = maybeUnit;
      // Check if it's a pure number
      if (/^\d+$/.test(maybeUnit)) {
        unit_number = parseInt(maybeUnit, 10);
      }
      confidence += 0.2;
    }
  }
  
  if (parts.length >= 3) {
    const rawCity = parts[2];
    if (rawCity && rawCity !== "XX" && rawCity !== "xxx") {
      // Title case the city name
      city = rawCity.split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      confidence += 0.2;
    }
  }

  // Boost confidence if we found a known country
  if (country_code) {
    confidence += 0.3;
  }

  return { 
    country_code, 
    country_name: countryName,
    unit_code, 
    unit_number,
    city, 
    name_raw: name,
    parse_confidence: Math.min(confidence, 1.0)
  };
}

async function verifyScopes(accessToken: string): Promise<boolean> {
  try {
    const hubsRes = await fetch("https://developer.api.autodesk.com/project/v1/hubs", {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    return hubsRes.ok;
  } catch {
    return false;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Throttled API caller with retry and backoff
class ThrottledAPICaller {
  private concurrency: number;
  private activeRequests: number = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  async fetch(url: string, headers: Record<string, string>): Promise<Response> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          this.activeRequests++;
          
          // Backoff between requests
          await sleep(Math.random() * 250 + 250); // 250-500ms
          
          const response = await fetch(url, { headers });
          this.activeRequests--;
          
          // Process next queued request
          this.processQueue();
          
          resolve(response);
        } catch (error) {
          this.activeRequests--;
          this.processQueue();
          reject(error);
        }
      };

      if (this.activeRequests < this.concurrency) {
        task();
      } else {
        this.queue.push(task);
      }
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeRequests < this.concurrency) {
      const task = this.queue.shift()!;
      task();
    }
  }
}

async function ingestAllProjects(triggeredBy: string = 'manual', sessionId?: string) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  
  // Create ingest job record
  const { data: job, error: jobError } = await supabase
    .from("acc_ingest_jobs")
    .insert({
      status: 'running',
      triggered_by: triggeredBy
    })
    .select()
    .single();

  if (jobError || !job) {
    console.error("Failed to create ingest job:", jobError);
    throw new Error("Failed to create ingest job");
  }

  const jobId = job.id;
  console.log(`Starting ingest job ${jobId}`);

  try {
    // Require 3-legged token - fail loudly if not available
    if (!sessionId) {
      throw { 
        code: "auth_required", 
        message: "Editor login required for ingest" 
      };
    }

    let accessToken: string;
    try {
      accessToken = await accessTokenForSession(sessionId);
      console.log(`Got 3-legged token (length: ${accessToken.length})`);
    } catch (err) {
      console.error("Failed to get 3-legged token:", err instanceof Error ? err.message : err);
      throw { 
        code: "auth_failed", 
        message: "Failed to authenticate with Autodesk - please reconnect" 
      };
    }
    
    // Verify scopes before proceeding
    const hasScopes = await verifyScopes(accessToken);
    if (!hasScopes) {
      throw { 
        code: "insufficient_scopes", 
        message: "Missing permissions: data:read viewables:read account:read" 
      };
    }

    const headers = { authorization: `Bearer ${accessToken}` };
    const caller = new ThrottledAPICaller(3);

    // Get hubs first
    console.log("Fetching hubs...");
    const hubsRes = await caller.fetch("https://developer.api.autodesk.com/project/v1/hubs", headers);
    if (!hubsRes.ok) {
      throw new Error(`Hubs fetch failed: ${hubsRes.status}`);
    }

    const hubs = await hubsRes.json();
    if (!hubs?.data?.length) {
      throw new Error("No hubs found");
    }

    console.log(`Found ${hubs.data.length} hubs`);

    let totalProcessed = 0;
    let totalErrors = 0;
    const allProjects: any[] = [];

    // Process each hub
    for (const hub of hubs.data) {
      const hubId = hub.id;
      console.log(`Processing hub: ${hubId}`);

      let hasMore = true;
      let offset = 0;
      const pageSize = 200; // Cap at 200 per spec

      while (hasMore) {
        console.log(`Hub ${hubId} page offset=${offset} size=200`);
        
        const projectsUrl = `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects?limit=${pageSize}&offset=${offset}`;
        const projectsRes = await caller.fetch(projectsUrl, headers);

        if (!projectsRes.ok) {
          if (projectsRes.status === 429) {
            console.log(`Rate limited on hub ${hubId}, retrying with backoff...`);
            await sleep(2000); // Wait 2 seconds on 429
            continue;
          }
          console.error(`Projects fetch failed for hub ${hubId}: ${projectsRes.status}`);
          totalErrors++;
          break;
        }

        const projects = await projectsRes.json();
        const projectData = projects?.data || [];
        
        console.log(`Hub ${hubId} returned ${projectData.length} projects`);

        if (projectData.length === 0) {
          hasMore = false;
          break;
        }

        // Process and parse projects
        for (const project of projectData) {
          try {
            const projectId = project.id;
            const nameRaw = project?.attributes?.name || "";
            
            const parsed = parseProjectName(nameRaw);
            
            const projectRecord = {
              project_id: projectId,
              name_raw: nameRaw,
              country_name: parsed.country_name,
              country_code: parsed.country_code,
              unit_code: parsed.unit_code,
              unit_number: parsed.unit_number,
              city: parsed.city,
              parse_confidence: parsed.parse_confidence,
            };

            allProjects.push(projectRecord);
            totalProcessed++;

            // Update job progress every 100 projects
            if (totalProcessed % 100 === 0) {
              console.log(`Upserted ${totalProcessed} / total projects so far`);
              await supabase
                .from("acc_ingest_jobs")
                .update({
                  processed_projects: totalProcessed,
                  errors_count: totalErrors
                })
                .eq("id", jobId);
            }

          } catch (error) {
            console.error(`Error processing project ${project?.id}:`, error);
            totalErrors++;
          }
        }

        offset += pageSize;
        
        // Stop if we got less than page size (last page)
        if (projectData.length < pageSize) {
          hasMore = false;
        }
      }
    }

    console.log(`Parsed ${allProjects.length} projects, upserting to database...`);
    console.log(`Final counts: ${totalProcessed} processed, ${totalErrors} errors`);

    // Batch upsert projects in chunks of 1000
    const chunkSize = 1000;
    for (let i = 0; i < allProjects.length; i += chunkSize) {
      const chunk = allProjects.slice(i, i + chunkSize);
      
      const { error: upsertError } = await supabase
        .from("acc_projects")
        .upsert(chunk, { 
          onConflict: 'project_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error(`Upsert error for chunk ${i}-${i + chunk.length}:`, upsertError);
        totalErrors++;
      } else {
        console.log(`Successfully upserted chunk ${i}-${i + chunk.length}`);
      }
    }

    // Refresh materialized view
    console.log("Refreshing country counts materialized view...");
    const { error: refreshError } = await supabase.rpc('refresh_acc_country_counts');
    if (refreshError) {
      console.error("Failed to refresh materialized view:", refreshError);
    }

    // Mark job as completed
    await supabase
      .from("acc_ingest_jobs")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_projects: allProjects.length,
        processed_projects: totalProcessed,
        errors_count: totalErrors,
        notes: `Successfully ingested ${totalProcessed} projects with ${totalErrors} errors`
      })
      .eq("id", jobId);

    console.log(`Ingest job ${jobId} completed: ${totalProcessed} projects processed, ${totalErrors} errors`);
    
    return {
      success: true,
      jobId,
      totalProcessed,
      totalErrors,
      totalProjects: allProjects.length
    };

  } catch (error) {
    console.error(`Ingest job ${jobId} failed:`, error);
    
    // Mark job as failed
    await supabase
      .from("acc_ingest_jobs")
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        notes: `Job failed: ${String(error)}`
      })
      .eq("id", jobId);

    const errorObj = error as any;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: errorObj?.code || "unknown_error",
      totalProcessed: 0,
      totalErrors: 0,
      totalProjects: 0
    };
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = authCors(origin);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, code: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", ...corsHeaders }
    });
  }

  try {
    const url = new URL(req.url);
    const triggeredBy = url.searchParams.get("triggered_by") || "manual";
    
    console.log(`Starting ACC projects sync (triggered by: ${triggeredBy})`);
    
    // Get session from cookie for 3-legged auth
    const sessionId = await readSessionCookie(req);
    if (!sessionId) {
      console.error("3-legged authentication required for ingest");
      return new Response(JSON.stringify({
        ok: false,
        code: "auth_required",
        message: "3-legged authentication required - please connect to Autodesk first"
      }), {
        status: 401,
        headers: { "content-type": "application/json", ...corsHeaders }
      });
    }
    
    // Start the ingestion process
    const result = await ingestAllProjects(triggeredBy, sessionId);
    
    const status = result.success ? 200 : (result.code === "insufficient_scopes" || result.code === "auth_required" ? 422 : 500);
    
    return new Response(JSON.stringify(result), {
      status,
      headers: { "content-type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error("ACC projects sync error:", error);
    
    const errorObj = error as any;
    const status = errorObj?.code === "insufficient_scopes" || errorObj?.code === "auth_required" ? 422 : 500;
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: errorObj?.code || "unknown_error"
    }), {
      status,
      headers: { "content-type": "application/json", ...corsHeaders }
    });
  }
});