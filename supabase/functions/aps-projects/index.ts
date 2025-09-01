import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN, APS_SCOPES_3L } from "../_shared/env.ts";
import { dataCors } from "../_shared/cors.ts";

const ORIGIN = WEB_ORIGIN || "*";
const CORS = dataCors(ORIGIN);

function readAT(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-aps-at");
}

function readRT(req: Request): string | null {
  return req.headers.get("x-aps-rt");
}

function getCookie(cookies: string, name: string) {
  return (`; ${cookies}`).split(`; ${name}=`).pop()?.split(";")[0];
}

function j(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...CORS,
      ...extraHeaders,
    },
  });
}

const COUNTRY_MAP: Record<string,string> = {
  Australia: "AU",
  Netherlands: "NL", 
  Sweden: "SE",
  "United Kingdom": "GB",
  Italy: "IT",
  Germany: "DE",
  France: "FR",
  Spain: "ES",
  Poland: "PL",
  Belgium: "BE",
  Denmark: "DK",
  Norway: "NO",
  Finland: "FI",
  Switzerland: "CH",
  Austria: "AT",
  Czech: "CZ",
  Slovakia: "SK",
  Hungary: "HU",
  Slovenia: "SI",
  Croatia: "HR",
  Serbia: "RS",
  Romania: "RO",
  Bulgaria: "BG",
  Greece: "GR",
  Portugal: "PT",
  Ireland: "IE",
  Lithuania: "LT",
  Latvia: "LV",
  Estonia: "EE",
  Malta: "MT",
  Cyprus: "CY",
  Luxembourg: "LU",
  Iceland: "IS",
  Canada: "CA",
  Japan: "JP",
  "South Korea": "KR",
  Taiwan: "TW",
  Singapore: "SG",
  "Hong Kong": "HK",
  Malaysia: "MY",
  Thailand: "TH",
  India: "IN",
  China: "CN",
  UAE: "AE",
  "Saudi Arabia": "SA",
  Israel: "IL",
  Jordan: "JO",
  Kuwait: "KW",
  Qatar: "QA",
  Bahrain: "BH",
  Oman: "OM",
  "South Africa": "ZA",
  Egypt: "EG",
  Morocco: "MA",
  Tunisia: "TN",
  Algeria: "DZ",
  Turkey: "TR",
  "United States": "US",
  USA: "US",
  Mexico: "MX",
  Brazil: "BR",
  Argentina: "AR",
  Chile: "CL",
  Colombia: "CO",
  Peru: "PE",
  Venezuela: "VE",
  Ecuador: "EC",
  Uruguay: "UY",
  Paraguay: "PY",
  Bolivia: "BO",
  "Costa Rica": "CR",
  Panama: "PA",
  "Dominican Republic": "DO",
  "Puerto Rico": "PR",
  Jamaica: "JM",
  "Trinidad and Tobago": "TT",
  Barbados: "BB",
  "New Zealand": "NZ",
  Russia: "RU",
  Ukraine: "UA",
  Belarus: "BY",
  Kazakhstan: "KZ",
  Uzbekistan: "UZ",
  Georgia: "GE",
  Armenia: "AM",
  Azerbaijan: "AZ",
  Kyrgyzstan: "KG",
  Tajikistan: "TJ",
  Turkmenistan: "TM",
  Moldova: "MD",
  Mongolia: "MN",
  Indonesia: "ID",
  Philippines: "PH",
  Vietnam: "VN",
  Cambodia: "KH",
  Laos: "LA",
  Myanmar: "MM",
  Bangladesh: "BD",
  "Sri Lanka": "LK",
  Nepal: "NP",
  Bhutan: "BT",
  Maldives: "MV",
  Pakistan: "PK",
  Afghanistan: "AF",
  Iran: "IR",
  Iraq: "IQ",
  Syria: "SY",
  Lebanon: "LB",
  Yemen: "YE",
  Ethiopia: "ET",
  Kenya: "KE",
  Uganda: "UG",
  Tanzania: "TZ",
  Rwanda: "RW",
  Burundi: "BI",
  Madagascar: "MG",
  Mauritius: "MU",
  Seychelles: "SC",
  Comoros: "KM",
  Djibouti: "DJ",
  Somalia: "SO",
  Eritrea: "ER",
  Sudan: "SD",
  "South Sudan": "SS",
  Chad: "TD",
  "Central African Republic": "CF",
  Cameroon: "CM",
  "Equatorial Guinea": "GQ",
  Gabon: "GA",
  "Republic of the Congo": "CG",
  "Democratic Republic of the Congo": "CD",
  Angola: "AO",
  Zambia: "ZM",
  Zimbabwe: "ZW",
  Botswana: "BW",
  Namibia: "NA",
  "Sao Tome and Principe": "ST",
  "Cape Verde": "CV",
  "Guinea-Bissau": "GW",
  Guinea: "GN",
  "Sierra Leone": "SL",
  Liberia: "LR",
  "Ivory Coast": "CI",
  Ghana: "GH",
  "Burkina Faso": "BF",
  Mali: "ML",
  Niger: "NE",
  Nigeria: "NG",
  Benin: "BJ",
  Togo: "TG",
  Senegal: "SN",
  Gambia: "GM",
  Mauritania: "MR",
  "Western Sahara": "EH",
  Libya: "LY",
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
    if (/^[A-Za-z0-9]+$/.test(maybeUnit)) {
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

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return j({ ok: false, code: "method_not_allowed" }, 405);

  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(clientIP)) {
    await trackMetrics("aps-projects", "rate_limited");
    return j({ ok: false, code: "rate_limited" }, 429);
  }

  const url = new URL(req.url);
  const hubId = url.searchParams.get("hub_id");
  if (!hubId) return j({ ok: false, code: "missing_hub_id" }, 400);

  // Pagination and search parameters
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const cursor = url.searchParams.get("cursor") || "";
  const searchQuery = url.searchParams.get("q") || "";
  const countryFilter = url.searchParams.get("country") || "";

  // Check headers first, then cookies
  let accessToken = readAT(req);
  let refreshToken = readRT(req);
  const cookies = req.headers.get("cookie") ?? "";
  let tokenSource = "none";
  
  if (!accessToken) {
    accessToken = getCookie(cookies, "aps_at");
    tokenSource = accessToken ? "cookie" : "none";
  } else {
    tokenSource = "header";
  }
  
  if (!refreshToken) {
    refreshToken = getCookie(cookies, "aps_rt");
  }

  console.log(`Projects - Token source: ${tokenSource}, AT length: ${accessToken ? accessToken.length : 0}, RT length: ${refreshToken ? refreshToken.length : 0}`);

  // If no AT, try refresh
  if (!accessToken && refreshToken) {
    console.log("Attempting token refresh for projects");
    const tokenRes = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "authorization": "Basic " + btoa(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: APS_SCOPES_3L,
      }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error(`Token refresh failed: ${tokenRes.status} - ${text}`);
      return j({ ok: false, code: "refresh_failed", status: tokenRes.status, body: text }, 502);
    }
    const t = await tokenRes.json();
    accessToken = t.access_token;
    tokenSource = "refresh";
    console.log("Token refreshed successfully for projects");
  }

  if (!accessToken) {
    console.log("No access token available for projects");
    return j({ ok: false, code: "not_connected", message: "Connect Autodesk first." }, 401);
  }

  // List projects for the hub with retry and backoff
  let projects: any;
  try {
    projects = await retryWithBackoff(async () => {
      const projectsRes = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });

      if (!projectsRes.ok) {
        const text = await projectsRes.text();
        if (projectsRes.status === 429 || projectsRes.status >= 500) {
          throw new Error(`Retryable error: ${projectsRes.status} - ${text}`);
        }
        throw new Error(`Non-retryable error: ${projectsRes.status} - ${text}`);
      }

      return await projectsRes.json();
    });
  } catch (error) {
    console.error("Projects fetch failed:", error);
    await trackMetrics("aps-projects", "error");
    return j({ ok: false, code: "projects_failed", error: String(error) }, 502);
  }

  // Normalize payload with parsed metadata
  const allItems = Array.isArray(projects?.data)
    ? projects.data.map((p: any) => {
        const name = p?.attributes?.name ?? "";
        const parsed = parseProjectName(name);
        return {
          id: p?.id,
          name,
          type: p?.attributes?.extension?.type ?? "",
          ...parsed,
        };
      })
    : [];

  // Apply country filter first
  let filteredItems = allItems;
  if (countryFilter) {
    filteredItems = allItems.filter((item: any) => 
      item.country_code === countryFilter.toUpperCase()
    );
  }

  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter((item: any) => 
      item.name.toLowerCase().includes(query) ||
      (item.country_name && item.country_name.toLowerCase().includes(query)) ||
      (item.country_code && item.country_code.toLowerCase().includes(query)) ||
      (item.unit_code && item.unit_code.toLowerCase().includes(query)) ||
      (item.city && item.city.toLowerCase().includes(query))
    );
  }

  // Apply cursor-based pagination
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = filteredItems.findIndex((item: any) => item.id === cursor);
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1;
    }
  }

  const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);
  const nextCursor = paginatedItems.length === limit && startIndex + limit < filteredItems.length 
    ? paginatedItems[paginatedItems.length - 1].id 
    : null;

  // Create sample array (first 3 items after filters)
  const sample = filteredItems.slice(0, 3);

  await trackMetrics("aps-projects", "success");
  return j({ 
    ok: true, 
    items: paginatedItems,
    next_cursor: nextCursor,
    total_estimate: filteredItems.length,
    sample: sample
  });
});