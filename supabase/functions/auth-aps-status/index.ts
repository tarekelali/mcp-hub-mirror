import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { readSessionCookie } from "../_shared/cookies.ts";

Deno.serve(async (req) => {
  const sess = await readSessionCookie(req);
  if (!sess) return j({ connected:false });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data } = await supabase.from("editor_tokens").select("session_id").eq("session_id", sess).maybeSingle();
  return j({ connected: !!data });
  function j(b:any){ return new Response(JSON.stringify(b), { headers: { "content-type":"application/json" } }); }
});