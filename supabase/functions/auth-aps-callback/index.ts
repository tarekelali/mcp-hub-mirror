import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN } from "../_shared/env.ts";
import { authCors } from "../_shared/cors.ts";
import { setSessionCookie, readSessionCookie, ensureSession } from "../_shared/cookies.ts";
import { encrypt } from "../_shared/crypto.ts";

function getCookie(header: string| null, name: string) {
  return (`; ${header ?? ""}`).split(`; ${name}=`).pop()?.split(";")[0];
}

// Helper to safely decode base64url (handles PKCE-style encoding)
function decodeBase64Url(str: string): string {
  try {
    // Convert base64url to base64: replace - with +, _ with /
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  } catch (error) {
    throw new Error(`Failed to decode base64url: ${error.message}`);
  }
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

  if (!code || !state || !stateCookie) {
    return new Response(JSON.stringify({ 
      ok: false, 
      code: "missing_oauth_params",
      details: "Missing required OAuth parameters" 
    }), {
      status: 400,
      headers: { 
        "content-type": "application/json", 
        ...corsHeaders,
        "Set-Cookie": `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`
      }
    });
  }

  // Validate state cookie - handle potential base64url encoding issues
  try {
    if (state !== stateCookie) {
      return new Response(JSON.stringify({ 
        ok: false, 
        code: "state_mismatch",
        details: "OAuth state validation failed" 
      }), {
        status: 400,
        headers: { 
          "content-type": "application/json", 
          ...corsHeaders,
          "Set-Cookie": `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`
        }
      });
    }
  } catch (error) {
    console.error("State validation error (length only):", stateCookie?.length || 0);
    return new Response(JSON.stringify({ 
      ok: false, 
      code: "invalid_state_encoding",
      details: "Failed to validate state parameter" 
    }), {
      status: 400,
      headers: { 
        "content-type": "application/json", 
        ...corsHeaders,
        "Set-Cookie": `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`
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
        grant_type: "authorization_code",
        code,
        redirect_uri: Deno.env.get("APS_REDIRECT_URL")!,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return new Response(JSON.stringify({ 
        ok: false, 
        code: "token_exchange_failed", 
        details: text 
      }), {
        status: 401,
        headers: { "content-type": "application/json", ...corsHeaders }
      });
    }
    const t = await tokenRes.json();

    const returnToCookie = getCookie(cookies, "aps_return");
    const returnTo = returnToCookie ? decodeURIComponent(returnToCookie) : null;

    // Handle session management
    const headers = new Headers();
    const sessionId = readSessionCookie(req) || ensureSession(headers, null);
    await setSessionCookie(headers, sessionId);

    // Store encrypted refresh token in database
    if (t.refresh_token) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const refreshTokenEnc = await encrypt(t.refresh_token);
      await supabase.from("editor_tokens").upsert({
        session_id: sessionId,
        refresh_token_enc: refreshTokenEnc,
        scope: "data:read account:read viewables:read offline_access",
        updated_at: new Date().toISOString()
      });
    }

    const setCookies = [
      `aps_at=${t.access_token}; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=${Math.max(60, (t.expires_in ?? 3600) - 60)}`,
      `aps_return=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=None`,
      `aps_state=; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=0`,
    ].filter(Boolean);
    
    // Add session cookie to existing cookies
    const allCookies = [...setCookies];
    for (const [key, value] of headers.entries()) {
      if (key.toLowerCase() === 'set-cookie') {
        allCookies.push(value);
      }
    }

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
        "Set-Cookie": allCookies.join(", "),
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      ok: false, 
      code: "callback_error", 
      details: error.message 
    }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders }
    });
  }
});