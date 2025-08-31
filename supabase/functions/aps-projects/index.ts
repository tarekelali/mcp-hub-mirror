import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN, APS_SCOPES_3L } from "../_shared/env.ts";
import { cors } from "../_shared/cors.ts";

const ORIGIN = WEB_ORIGIN || "*";
const CORS = cors(ORIGIN);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return j({ ok: false, code: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const hubId = url.searchParams.get("hub_id");
  if (!hubId) return j({ ok: false, code: "missing_hub_id" }, 400);

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

  console.log(`Projects - Token source: ${tokenSource}, has AT: ${!!accessToken}, has RT: ${!!refreshToken}`);

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

  // List projects for the hub
  const projectsRes = await fetch(`https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!projectsRes.ok) {
    const text = await projectsRes.text();
    return j({ ok: false, code: "projects_failed", status: projectsRes.status, body: text }, 502);
  }

  const projects = await projectsRes.json().catch(() => ({}));
  // Normalize payload with parsed metadata
  const items =
    Array.isArray(projects?.data)
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

  return j({ ok: true, items });
});