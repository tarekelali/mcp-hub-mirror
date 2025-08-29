import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = Deno.env.get("WEB_ORIGIN")!;
const CLIENT_ID = Deno.env.get("APS_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("APS_CLIENT_SECRET")!;
const READ_ONLY = (Deno.env.get("READ_ONLY_MODE") ?? "true") === "true";

const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-credentials": "true",
};

function getCookie(cookies: string, name: string) {
  return (`; ${cookies}`).split(`; ${name}=`).pop()?.split(";")[0];
}

function j(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...cors,
      ...extraHeaders,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return j({ ok: false, code: "method_not_allowed" }, 405);

  // Read-only guard (belt & braces). We never write to ACC anyway.
  if (!READ_ONLY) {
    // no-op placeholder
  }

  const cookies = req.headers.get("cookie") ?? "";
  // We expect 3-legged tokens set by your existing APS OAuth flow.
  let accessToken = getCookie(cookies, "aps_at");
  const refreshToken = getCookie(cookies, "aps_rt");

  // If no AT, try refresh
  if (!accessToken && refreshToken) {
    const tokenRes = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "authorization": "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "data:read bucket:read viewables:read account:read",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return j({ ok: false, code: "refresh_failed", status: tokenRes.status, body: text }, 502);
    }
    const t = await tokenRes.json();
    accessToken = t.access_token;
    // (Optional) Rotate cookies here if you have a shared cookie writer; safe to skip for this read.
  }

  if (!accessToken) {
    return j({ ok: false, code: "not_connected", message: "Connect Autodesk first." }, 401);
  }

  // List hubs (ACC/BIM 360) for the signed-in Autodesk user
  const hubsRes = await fetch("https://developer.api.autodesk.com/project/v1/hubs", {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!hubsRes.ok) {
    const text = await hubsRes.text();
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
        }))
      : [];

  return j({ ok: true, items });
});