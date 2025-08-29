import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { readSessionCookie } from "../_shared/cookies.ts";
import { accessTokenForSession } from "../_shared/aps3l.ts";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};

const ALLOWED = [
  /^\/data\/v1\/projects\/[^/]+\/folders\/[^/]+\/contents$/i,
  /^\/data\/v1\/projects\/[^/]+\/items\/[^/]+\/versions$/i,
  /^\/data\/v1\/projects$/i, // optional, harmless
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return J({ ok:false, code:"method_not_allowed" }, 405);

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "";
  if (!ALLOWED.some(rx => rx.test(path))) return J({ ok:false, code:"path_not_allowed" }, 400);

  const sess = await readSessionCookie(req);
  if (!sess) return J({ ok:false, code:"not_connected" }, 401);

  let q = new URLSearchParams(url.search);
  q.delete("path"); // forward the rest
  const target = `https://developer.api.autodesk.com${path}${q.toString() ? "?" + q.toString() : ""}`;

  try {
    const token = await accessTokenForSession(sess);
    const resp = await fetch(target, { headers: { authorization: `Bearer ${token}` } });
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { "content-type": resp.headers.get("content-type") ?? "application/json", ...cors }
    });
  } catch (e: any) {
    return J({ ok:false, code:"proxy_failed", message: String(e?.message ?? e) }, 502);
  }

  function J(b:any, s=200){ return new Response(JSON.stringify(b), { status:s, headers:{ "content-type":"application/json", ...cors } }); }
});