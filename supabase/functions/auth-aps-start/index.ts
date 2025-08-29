import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { setSessionCookie, readSessionCookie, ensureSession } from "../_shared/cookies.ts";

const ORIGIN = Deno.env.get("WEB_ORIGIN")!;
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-credentials": "true",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const h = new Headers({ "cache-control": "no-store", ...cors });
  // session
  const sess = ensureSession(h, await readSessionCookie(req));
  const params = new URLSearchParams({
    response_type: "code",
    client_id: Deno.env.get("APS_CLIENT_ID")!,
    redirect_uri: Deno.env.get("APS_REDIRECT_URL")!,
    scope: "data:read bucket:read viewables:read account:read",
    state: sess
  });
  setSessionCookie(h, sess);
  return new Response(null, { status: 302, headers: { ...h, location: `https://developer.api.autodesk.com/authentication/v2/authorize?${params}` } });
});