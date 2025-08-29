import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { WEB_ORIGIN } from "../_shared/env.ts";

const ORIGIN = WEB_ORIGIN || "*";
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type, x-aps-at, x-aps-rt",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-credentials": "true",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, code: "method_not_allowed" }), { 
      status: 405, 
      headers: { "content-type": "application/json", ...cors } 
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
      ...cors,
    },
  });
});