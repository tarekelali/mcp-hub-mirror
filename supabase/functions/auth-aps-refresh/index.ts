import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN } from "../_shared/env.ts";
import { cors } from "../_shared/cors.ts";

const ORIGIN = WEB_ORIGIN || "*";
const CORS = cors(ORIGIN);

function getCookie(header: string | null, name: string) {
  return (`; ${header ?? ""}`).split(`; ${name}=`).pop()?.split(";")[0];
}

function readRT(req: Request): string | null {
  return req.headers.get("x-aps-rt");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", ...CORS }
    });
  }

  // Try refresh token from header first, then cookie
  let refreshToken = readRT(req);
  if (!refreshToken) {
    const cookies = req.headers.get("cookie") ?? "";
    refreshToken = getCookie(cookies, "aps_rt");
  }

  if (!refreshToken) {
    return new Response(JSON.stringify({ error: "no_refresh_token" }), {
      status: 401,
      headers: { 
        "content-type": "application/json",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        ...CORS 
      }
    });
  }

  try {
    const tokenRes = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "authorization": "Basic " + btoa(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error(`Token refresh failed: ${tokenRes.status} - ${text}`);
      return new Response(JSON.stringify({ error: "refresh_failed", details: text }), {
        status: 502,
        headers: { 
          "content-type": "application/json",
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
          ...CORS 
        }
      });
    }

    const tokens = await tokenRes.json();
    
    // Set secure cookies for new tokens
    const setCookies = [
      `aps_at=${tokens.access_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=${Math.max(60, (tokens.expires_in ?? 3600) - 60)}`,
      tokens.refresh_token ? `aps_rt=${tokens.refresh_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=2592000` : "",
    ].filter(Boolean).join(", ");

    return new Response(JSON.stringify({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in || 3600
    }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "set-cookie": setCookies,
        ...CORS
      }
    });

  } catch (error) {
    console.error("Token refresh error:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { 
        "content-type": "application/json",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        ...CORS 
      }
    });
  }
});