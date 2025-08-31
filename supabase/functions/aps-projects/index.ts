import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
};

function parseProjectName(name: string) {
  const parts = name.split("_").filter(Boolean);
  if (parts.length === 0) return { country: null, unit: null, city: null };

  const countryName = parts[0];
  const country = COUNTRY_MAP[countryName] ?? null;

  let unit: string | null = null;
  let city: string | null = null;

  if (parts.length >= 2) {
    const maybeUnit = parts[1];
    unit = /^[A-Za-z0-9]+$/.test(maybeUnit) ? maybeUnit : null;
  }
  if (parts.length >= 3) {
    city = parts[2] || null;
  }

  return { country, unit, city };
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
    return j({ ok: false, code: "rate_limited" }, 429);
  }

  const url = new URL(req.url);
  const hubId = url.searchParams.get("hub_id");
  if (!hubId) return j({ ok: false, code: "missing_hub_id" }, 400);

  // Pagination and search parameters
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const cursor = url.searchParams.get("cursor") || "";
  const searchQuery = url.searchParams.get("q") || "";

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

  // Apply search filter
  let filteredItems = allItems;
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredItems = allItems.filter((item: any) => 
      item.name.toLowerCase().includes(query) ||
      (item.country && item.country.toLowerCase().includes(query)) ||
      (item.unit && item.unit.toLowerCase().includes(query)) ||
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

  return j({ 
    ok: true, 
    items: paginatedItems,
    next_cursor: nextCursor,
    total_estimate: filteredItems.length,
    sample: sample
  });
});