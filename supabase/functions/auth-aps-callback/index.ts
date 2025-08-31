import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN } from "../_shared/env.ts";
import { cors } from "../_shared/cors.ts";

const ORIGIN = WEB_ORIGIN || "*";
const CORS = cors(ORIGIN);

function getCookie(header: string| null, name: string) {
  return (`; ${header ?? ""}`).split(`; ${name}=`).pop()?.split(";")[0];
}

function html(body: string, extraHeaders: HeadersInit = {}) {
  return new Response(body, { headers: { "content-type": "text/html", ...CORS, ...extraHeaders } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = req.headers.get("cookie") ?? "";
  const stateCookie = getCookie(cookies, "aps_state");

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return html(`<p>OAuth failed (state/session).</p>`, {
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
    return html(`<pre>Token exchange failed: ${tokenRes.status}\n${text}</pre>`);
  }
  const t = await tokenRes.json();

  const returnTo = getCookie(cookies, "aps_return");

  const setCookies = [
    `aps_at=${t.access_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=${Math.max(60, (t.expires_in ?? 3600) - 60)}`,
    t.refresh_token ? `aps_rt=${t.refresh_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=2592000` : "",
    `aps_return=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=None`,
    `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`,
  ].filter(Boolean).join(", ");

  const APP = WEB_ORIGIN + "/_diag";
  const query = `?aps_at=${encodeURIComponent(t.access_token)}&aps_rt=${encodeURIComponent(t.refresh_token || "")}`;

  // 1) If aps_return cookie present: redirect to returnTo with query params
  if (returnTo) {
    const redirectUrl = returnTo + query;
    return new Response(null, {
      status: 302,
      headers: {
        "Location": redirectUrl,
        "Set-Cookie": setCookies,
        ...CORS
      }
    });
  }

  // 2) No returnTo: redirect to APP with query params (works for both popup and same-tab)
  const redirectUrl = APP + query;
  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
      "Set-Cookie": setCookies,
      ...CORS
    }
  });
});