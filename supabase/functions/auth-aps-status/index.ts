import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { readSessionCookie } from "../_shared/cookies.ts";
import { WEB_ORIGIN } from "../_shared/env.ts";

const ORIGIN = WEB_ORIGIN || "*";
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-aps-at, x-aps-rt",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-credentials": "true",
};

function readAT(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-aps-at");
}

function readRT(req: Request): string | null {
  return req.headers.get("x-aps-rt");
}

function getCookie(header: string | null, name: string) {
  return (`; ${header ?? ""}`).split(`; ${name}=`).pop()?.split(";")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  let accessToken = readAT(req);
  let refreshToken = readRT(req);
  const cookies = req.headers.get("cookie") ?? "";
  const cookieAt = getCookie(cookies, "aps_at");
  const cookieRt = getCookie(cookies, "aps_rt");

  accessToken ||= cookieAt || null;
  refreshToken ||= cookieRt || null;
  
  // Log what we're receiving for debugging
  console.log("[auth-aps-status] Headers:", { 
    "authorization": req.headers.get("authorization") ? "present" : "missing",
    "x-aps-at": req.headers.get("x-aps-at") ? "present" : "missing",
    "x-aps-rt": req.headers.get("x-aps-rt") ? "present" : "missing"
  });
  console.log("[auth-aps-status] Cookies:", {
    "aps_at": cookieAt ? "present" : "missing", 
    "aps_rt": cookieRt ? "present" : "missing"
  });
  
  let via = "none";
  let connected = false;
  
  if (accessToken || refreshToken) {
    via = (readAT(req) || readRT(req)) ? "header" : "cookie";
    connected = true;
  } else {
    // Fallback to session check
    const sess = await readSessionCookie(req);
    if (sess) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data } = await supabase.from("editor_tokens").select("session_id").eq("session_id", sess).maybeSingle();
      if (data) {
        via = "session";
        connected = true;
      }
    }
  }
  
  return new Response(JSON.stringify({ 
    connected,
    via, 
    has_at_cookie: !!cookieAt, 
    has_rt_cookie: !!cookieRt,
    has_at_header: !!(req.headers.get("x-aps-at") || (req.headers.get("authorization") || "").startsWith("Bearer ")),
    has_rt_header: !!req.headers.get("x-aps-rt")
  }), { headers: { "content-type":"application/json", ...cors } });
});