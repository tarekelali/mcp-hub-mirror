import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = Deno.env.get("WEB_ORIGIN")!;
const CLIENT_ID = Deno.env.get("APS_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("APS_CLIENT_SECRET")!;
const REDIRECT = Deno.env.get("APS_REDIRECT_URL")!;

const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type",
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
      "authorization": "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return html(`<pre>Token exchange failed: ${tokenRes.status}\n${text}</pre>`);
  }
  const t = await tokenRes.json();

  const setCookies = [
    // short-lived access token
    `aps_at=${t.access_token}; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=${Math.max(60, (t.expires_in ?? 3600) - 60)}`,
    // refresh token (lives longer; use conservative TTL if none provided)
    t.refresh_token ? `aps_rt=${t.refresh_token}; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=${60*60*24*7}` : "",
    // clear one-time state
    `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`,
  ].filter(Boolean).join(", ");

  return html(`
    <script>
      localStorage.setItem("aps_connected","1");
      window.opener && window.opener.postMessage({aps_connected:true},"*");
      window.close();
    </script>
    Connected. You can close this window.
  `, { "Set-Cookie": setCookies });
});