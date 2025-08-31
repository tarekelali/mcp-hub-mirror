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

  if (returnTo) {
    return html(`
      <script>
        (function () {
          var at = ${JSON.stringify(t.access_token)};
          var rt = ${JSON.stringify(t.refresh_token || "")};
          var url = ${JSON.stringify(returnTo)} + "#aps_at=" + encodeURIComponent(at) + "&aps_rt=" + encodeURIComponent(rt);
          location.replace(url);
        })();
      </script>
      Redirecting…
    `, { "Set-Cookie": setCookies, ...CORS });
  }

  const APP = WEB_ORIGIN + "/_diag";
  const hash = `#aps_at=${encodeURIComponent(t.access_token)}&aps_rt=${encodeURIComponent(t.refresh_token || "")}`;

  return html(`
    <script>
      (function () {
        var at = ${JSON.stringify(t.access_token)};
        var rt = ${JSON.stringify(t.refresh_token || "")};
        var exp = ${JSON.stringify(t.expires_in || 3600)};
        try {
          if (window.opener) {
            window.opener.postMessage({ aps_connected: true, aps_at: at, aps_rt: rt, expires_in: exp }, "*");
            try { 
              window.opener.location.href = ${JSON.stringify(APP)} + ${JSON.stringify(hash)}; 
            } catch (e) { /* ignore */ }
            window.close();
          } else {
            location.replace(${JSON.stringify(APP)} + ${JSON.stringify(hash)});
          }
        } catch (e) {
          location.replace(${JSON.stringify(APP)} + ${JSON.stringify(hash)});
        }
      })();
    </script>
    Redirecting…
  `, { "Set-Cookie": setCookies, ...CORS });
});