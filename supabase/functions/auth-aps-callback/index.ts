import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN } from "../_shared/env.ts";

const ORIGIN = WEB_ORIGIN || "*";
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type, x-aps-at, x-aps-rt",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-credentials": "true",
};

function getCookie(header: string| null, name: string) {
  return (`; ${header ?? ""}`).split(`; ${name}=`).pop()?.split(";")[0];
}

function html(body: string, extraHeaders: HeadersInit = {}) {
  return new Response(body, { headers: { "content-type": "text/html", ...cors, ...extraHeaders } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
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

  const setCookies = [
    // short-lived access token
    `aps_at=${t.access_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=${Math.max(60, (t.expires_in ?? 3600) - 60)}`,
    // refresh token (lives longer; use conservative TTL if none provided)
    t.refresh_token ? `aps_rt=${t.refresh_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=2592000` : "",
    // clear one-time state
    `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`,
  ].filter(Boolean).join(", ");

  return html(`
    <script>
      localStorage.setItem("aps_connected","1");
      window.opener?.postMessage(
        { aps_connected: true, aps_at: "${t.access_token}", aps_rt: "${t.refresh_token || ""}", expires_in: ${t.expires_in || 3600} },
        "*"
      );
      window.close();
    </script>
    Connected. You can close this window.
  `, { "Set-Cookie": setCookies });
});