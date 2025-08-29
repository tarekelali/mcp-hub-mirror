import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { readSessionCookie } from "../_shared/cookies.ts";

const ORIGIN = Deno.env.get("WEB_ORIGIN")!;
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type, x-aps-at, x-aps-rt",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-credentials": "true",
};

function getCookie(header: string | null, name: string) {
  return (`; ${header ?? ""}`).split(`; ${name}=`).pop()?.split(";")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  // Check headers first, then cookies
  const headerAt = req.headers.get("x-aps-at");
  const headerRt = req.headers.get("x-aps-rt");
  const cookies = req.headers.get("cookie") ?? "";
  const cookieAt = getCookie(cookies, "aps_at");
  const cookieRt = getCookie(cookies, "aps_rt");
  
  let via = "none";
  let connected = false;
  
  if (headerAt || headerRt) {
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
  
  return j({ 
    connected,
    via, 
    has_at_cookie: !!cookieAt, 
    has_rt_cookie: !!cookieRt 
  });
  
  function j(b:any){ return new Response(JSON.stringify(b), { headers: { "content-type":"application/json", ...cors } }); }
});