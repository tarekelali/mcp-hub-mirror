import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { readSessionCookie } from "../_shared/cookies.ts";
import { WEB_ORIGIN } from "../_shared/env.ts";
import { authCors } from "../_shared/cors.ts";

const ORIGIN = WEB_ORIGIN || "*";
const CORS = authCors(ORIGIN);

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const hdrAT = readAT(req);
  const hdrRT = readRT(req);
  const cookies = req.headers.get("cookie") ?? "";
  const cookieAt = getCookie(cookies, "aps_at");
  const cookieRt = getCookie(cookies, "aps_rt");
  
  // Log token lengths only for debugging
  console.log("[auth-aps-status] Token lengths:", { 
    "at_header": hdrAT ? hdrAT.length : 0,
    "rt_header": hdrRT ? hdrRT.length : 0,
    "at_cookie": cookieAt ? cookieAt.length : 0,
    "rt_cookie": cookieRt ? cookieRt.length : 0
  });
  
  let via = "none";
  let connected = false;
  
  if (hdrAT || hdrRT) {
    via = "header";
    connected = true;
  } else if (cookieAt || cookieRt) {
    via = "cookie"; 
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
    has_at_header: !!hdrAT,
    has_rt_header: !!hdrRT,
    has_at_cookie: !!cookieAt,
    has_rt_cookie: !!cookieRt
  }), { headers: { "content-type":"application/json", ...CORS } });
});