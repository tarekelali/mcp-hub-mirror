import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, APS_SCOPES_3L } from "../_shared/env.ts";
import { authCors } from "../_shared/cors.ts";
import { setSessionCookie, readSessionCookie, ensureSession } from "../_shared/cookies.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = authCors(origin);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok:false, code:"method_not_allowed" }), { status:405, headers: { "content-type":"application/json", ...corsHeaders }});
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return");
  
  // Handle session management
  const headers = new Headers();
  const sessionId = readSessionCookie(req) || ensureSession(headers, null);
  await setSessionCookie(headers, sessionId);
  
  const state = crypto.randomUUID();
  const authUrl = new URL("https://developer.api.autodesk.com/authentication/v2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", APS_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", Deno.env.get("APS_REDIRECT_URL")!);
  authUrl.searchParams.set("scope", APS_SCOPES_3L);
  authUrl.searchParams.set("state", state);

  const setCookies = [
    `aps_state=${state}; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=600`,
    returnTo ? `aps_return=${encodeURIComponent(returnTo)}; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=None` : "",
  ].filter(Boolean);
  
  // Add session cookie
  for (const [key, value] of headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      setCookies.push(value);
    }
  }
  
  const responseHeaders = new Headers({
    Location: authUrl.toString(),
    ...corsHeaders,
    "Set-Cookie": setCookies.join(", "),
  });

  return new Response(null, { status: 302, headers: responseHeaders });
});