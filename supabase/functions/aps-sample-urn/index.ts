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
      ...CORS,
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

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute per IP

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return j({ ok: false, code: "method_not_allowed" }, 405);

  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(clientIP)) {
    await trackMetrics("aps-sample-urn", "rate_limited");
    return j({ ok: false, code: "rate_limited" }, 429);
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("project_id");
  if (!projectId) return j({ ok: false, code: "missing_project_id" }, 400);

  // Get access token
  let accessToken = readAT(req);
  let refreshToken = readRT(req);
  const cookies = req.headers.get("cookie") ?? "";
  
  if (!accessToken) {
    accessToken = getCookie(cookies, "aps_at");
  }
  
  if (!refreshToken) {
    refreshToken = getCookie(cookies, "aps_rt");
  }

  console.log(`Sample URN - AT length: ${accessToken ? accessToken.length : 0}, RT length: ${refreshToken ? refreshToken.length : 0}`);

  // If no AT, try refresh
  if (!accessToken && refreshToken) {
    console.log("Attempting token refresh for sample URN");
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
      await trackMetrics("aps-sample-urn", "refresh_failed");
      return j({ ok: false, code: "refresh_failed", status: tokenRes.status, body: text }, 502);
    }
    const t = await tokenRes.json();
    accessToken = t.access_token;
    console.log("Token refreshed successfully for sample URN");
  }

  if (!accessToken) {
    console.log("No access token available for sample URN");
    await trackMetrics("aps-sample-urn", "unauthorized");
    return j({ ok: false, code: "not_connected", message: "Connect Autodesk first." }, 401);
  }

  try {
    // Get project's top folders
    const foldersRes = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/topFolders`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!foldersRes.ok) {
      const text = await foldersRes.text();
      console.error(`Top folders failed: ${foldersRes.status} - ${text}`);
      await trackMetrics("aps-sample-urn", "folders_failed");
      return j({ ok: false, code: "folders_failed", status: foldersRes.status, body: text }, 502);
    }

    const folders = await foldersRes.json();
    const projectFilesFolder = folders.data?.find((f: any) => f.attributes?.displayName === "Project Files");
    
    if (!projectFilesFolder) {
      await trackMetrics("aps-sample-urn", "no_project_files");
      return j({ ok: false, code: "no_project_files" }, 404);
    }

    // Get items in Project Files folder
    const itemsRes = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/folders/${projectFilesFolder.id}/contents`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!itemsRes.ok) {
      const text = await itemsRes.text();
      console.error(`Items failed: ${itemsRes.status} - ${text}`);
      await trackMetrics("aps-sample-urn", "items_failed");
      return j({ ok: false, code: "items_failed", status: itemsRes.status, body: text }, 502);
    }

    const items = await itemsRes.json();
    
    // Find first Revit file (.rvt)
    const revitItem = items.data?.find((item: any) => 
      item.attributes?.displayName?.toLowerCase().endsWith('.rvt')
    );

    if (!revitItem) {
      await trackMetrics("aps-sample-urn", "no_revit_files");
      return j({ ok: false, code: "no_revit_files" }, 404);
    }

    // Get item versions to find the tip version
    const versionsRes = await fetch(`https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${revitItem.id}/versions`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!versionsRes.ok) {
      const text = await versionsRes.text();
      console.error(`Versions failed: ${versionsRes.status} - ${text}`);
      await trackMetrics("aps-sample-urn", "versions_failed");
      return j({ ok: false, code: "versions_failed", status: versionsRes.status, body: text }, 502);
    }

    const versions = await versionsRes.json();
    const tipVersion = versions.data?.[0]; // First version is usually the tip

    if (!tipVersion) {
      await trackMetrics("aps-sample-urn", "no_versions");
      return j({ ok: false, code: "no_versions" }, 404);
    }

    // Extract URN from version derivatives
    const derivativeUrn = tipVersion.relationships?.derivatives?.data?.id;
    
    if (!derivativeUrn) {
      await trackMetrics("aps-sample-urn", "no_derivative_urn");
      return j({ ok: false, code: "no_derivative_urn" }, 404);
    }

    // Return the URN and metadata
    await trackMetrics("aps-sample-urn", "success");
    return j({
      ok: true,
      urn: derivativeUrn,
      item: {
        id: revitItem.id,
        name: revitItem.attributes?.displayName,
        size: revitItem.attributes?.storageSize
      },
      version: {
        id: tipVersion.id,
        number: tipVersion.attributes?.versionNumber,
        createTime: tipVersion.attributes?.createTime
      }
    });

  } catch (error) {
    console.error("Sample URN error:", error);
    await trackMetrics("aps-sample-urn", "error");
    return j({ ok: false, code: "internal_error", error: String(error) }, 500);
  }
});