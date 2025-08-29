import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { encrypt } from "../_shared/crypto.ts";
import { readSessionCookie } from "../_shared/cookies.ts";

const ORIGIN = Deno.env.get("WEB_ORIGIN")!;
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-credentials": "true",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const sess = await readSessionCookie(req);
  if (!code || !state || !sess || state !== sess) return html("OAuth failed (state/session).");

  // Exchange code → tokens
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: Deno.env.get("APS_REDIRECT_URL")!
  });
  const res = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "authorization": "Basic " + btoa(`${Deno.env.get("APS_CLIENT_ID")!}:${Deno.env.get("APS_CLIENT_SECRET")!}`)
    },
    body
  });
  if (!res.ok) return html("Token exchange failed.");
  const tok = await res.json(); // { access_token, refresh_token, expires_in, ... }
  if (!tok.refresh_token) return html("No refresh_token returned.");

  // Store encrypted refresh token
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await supabase.from("editor_tokens").upsert({
    session_id: sess,
    refresh_token_enc: await encrypt(tok.refresh_token),
    scope: "data:read data:write bucket:read bucket:create viewables:read",
    updated_at: new Date().toISOString()
  });
  if (error) return html("Failed to save connection.");

  return html(`<script>
    localStorage.setItem("aps_connected","1");
    window.opener && window.opener.postMessage({aps_connected:true},"*");
    window.close();
  </script>Connected. You can close this window.`);
  function html(s: string) { return new Response(s, { headers: { "content-type": "text/html", ...cors } }); }
});