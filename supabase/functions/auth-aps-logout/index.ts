import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function env(name: string) {
  const v = Deno.env.get(name);
  return (typeof v === "string" ? v.trim() : v) || undefined;
}

const WEB_ORIGIN = env("WEB_ORIGIN")!;
const cors = {
  "access-control-allow-origin": WEB_ORIGIN,
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