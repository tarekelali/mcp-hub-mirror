import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN } from "../_shared/env.ts";
import { authCors } from "../_shared/cors.ts";

function getCookie(header: string| null, name: string) {
  return (`; ${header ?? ""}`).split(`; ${name}=`).pop()?.split(";")[0];
}

function html(body: string, corsHeaders: Record<string, string>, extraHeaders: HeadersInit = {}) {
  return new Response(body, { headers: { "content-type": "text/html", ...corsHeaders, ...extraHeaders } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = authCors(origin);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = req.headers.get("cookie") ?? "";
  const stateCookie = getCookie(cookies, "aps_state");

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return html(`<p>OAuth failed (state/session).</p>`, corsHeaders, {
      "Set-Cookie": `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`,
    });
  }

  const tokenRes = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "authorization": "Basic " + btoa(`${APS_CLIENT_ID}:${APS_CLIENT_SECRET}`),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: Deno.env.get("APS_REDIRECT_URL")!,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return html(`<pre>Token exchange failed: ${tokenRes.status}\n${text}</pre>`, corsHeaders);
  }
  const t = await tokenRes.json();

  const returnToCookie = getCookie(cookies, "aps_return");
  const returnTo = returnToCookie ? decodeURIComponent(returnToCookie) : null;

  const setCookies = [
    `aps_at=${t.access_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=${Math.max(60, (t.expires_in ?? 3600) - 60)}`,
    t.refresh_token ? `aps_rt=${t.refresh_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=2592000` : "",
    `aps_return=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=None`,
    `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`,
  ].filter(Boolean).join(", ");

  const APP = WEB_ORIGIN || "https://preview--geo-scope-pilot.lovable.app";
  
  // Determine redirect target
  let redirectUrl = APP; // Default to main app
  
  if (returnTo) {
    // Validate and normalize the returnTo URL
    try {
      const returnURL = new URL(returnTo, APP);
      // Only allow same-origin redirects for security
      if (returnURL.origin === new URL(APP).origin) {
        redirectUrl = returnURL.toString();
      }
    } catch {
      // Invalid URL, use default
    }
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
      "Set-Cookie": setCookies,
      ...corsHeaders
    }
  });
});