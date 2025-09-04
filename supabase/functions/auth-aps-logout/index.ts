import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authCors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = authCors(origin);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, code: "method_not_allowed" }), { 
      status: 405, 
      headers: { "content-type": "application/json", ...corsHeaders } 
    });
  }

  // Clear APS cookies
  const clearCookies = [
    "aps_at=; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=0",
    "aps_rt=; Path=/; Secure; HttpOnly; SameSite=None; Max-Age=0",
  ].join(", ");

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "Set-Cookie": clearCookies,
      ...corsHeaders,
    },
  });
});