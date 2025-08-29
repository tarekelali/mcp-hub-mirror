import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { setSessionCookie, readSessionCookie, ensureSession } from "../_shared/cookies.ts";

Deno.serve(async (req) => {
  const h = new Headers({ "cache-control": "no-store" });
  // session
  const sess = ensureSession(h, await readSessionCookie(req));
  const params = new URLSearchParams({
    response_type: "code",
    client_id: Deno.env.get("APS_CLIENT_ID")!,
    redirect_uri: Deno.env.get("APS_REDIRECT_URL")!,
    scope: "data:read data:write bucket:read bucket:create viewables:read",
    state: sess
  });
  setSessionCookie(h, sess);
  return new Response(null, { status: 302, headers: { ...h, location: `https://developer.api.autodesk.com/authentication/v2/authorize?${params}` } });
});