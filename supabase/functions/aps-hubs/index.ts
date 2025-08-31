import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN, APS_SCOPES_3L } from "../_shared/env.ts";
import { dataCors } from "../_shared/cors.ts";

const ORIGIN = WEB_ORIGIN || "*";
const CORS = dataCors(ORIGIN);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") {
    await trackMetrics("aps-hubs", "error");
    return j({ ok: false, code: "method_not_allowed" }, 405);
  }

  const READ_ONLY = (Deno.env.get("READ_ONLY_MODE") ?? "true") === "true";
  
  // Read-only guard (belt & braces). We never write to ACC anyway.
  if (!READ_ONLY) {
    // no-op placeholder
  }

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

  console.log(`Hubs - Token source: ${tokenSource}, AT length: ${accessToken ? accessToken.length : 0}, RT length: ${refreshToken ? refreshToken.length : 0}`);

  // If no AT, try refresh
  if (!accessToken && refreshToken) {
    console.log("Attempting token refresh for hubs");
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
      await trackMetrics("aps-hubs", "error");
      return j({ ok: false, code: "refresh_failed", status: tokenRes.status, body: text }, 502);
    }
    const t = await tokenRes.json();
    accessToken = t.access_token;
    tokenSource = "refresh";
    console.log("Token refreshed successfully for hubs");
  }

  if (!accessToken) {
    console.log("No access token available for hubs");
    await trackMetrics("aps-hubs", "error");
    return j({ ok: false, code: "not_connected", message: "Connect Autodesk first." }, 401);
  }

  // List hubs (ACC/BIM 360) for the signed-in Autodesk user
  try {
    const hubsRes = await fetch("https://developer.api.autodesk.com/project/v1/hubs", {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!hubsRes.ok) {
      const text = await hubsRes.text();
      await trackMetrics("aps-hubs", "error");
      return j({ ok: false, code: "hubs_failed", status: hubsRes.status, body: text }, 502);
    }

    const hubs = await hubsRes.json().catch(() => ({}));
    // Normalize minimal payload (id, name, type)
    const items =
      Array.isArray(hubs?.data)
        ? hubs.data.map((h: any) => ({
            id: h?.id,
            name: h?.attributes?.name ?? h?.attributes?.displayName ?? "",
            type: h?.attributes?.extension?.type ?? "",
            attributes: h?.attributes, // Keep full attributes for debugging
          }))
        : [];

    await trackMetrics("aps-hubs", "success");
    return j({ ok: true, items });
  } catch (error) {
    console.error("Hubs fetch failed:", error);
    await trackMetrics("aps-hubs", "error");
    return j({ ok: false, code: "hubs_failed", error: String(error) }, 502);
  }
});