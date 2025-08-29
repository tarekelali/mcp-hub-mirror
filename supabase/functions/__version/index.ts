import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { APS_CLIENT_ID, APS_CLIENT_SECRET, WEB_ORIGIN } from "../_shared/env.ts";

const ORIGIN = WEB_ORIGIN || "*";
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type, x-aps-at, x-aps-rt",
  "access-control-allow-methods": "GET, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const buildTimestamp = new Date().toISOString(); // Current deployment time
  const gitSha = Deno.env.get("GIT_SHA") || "unknown"; // Git SHA if available

  return new Response(JSON.stringify({
    build_timestamp: buildTimestamp,
    git_sha: gitSha,
    has_id: !!APS_CLIENT_ID,
    has_secret: !!APS_CLIENT_SECRET,
    has_origin: !!WEB_ORIGIN,
    env_check: {
      APS_CLIENT_ID: APS_CLIENT_ID ? `${APS_CLIENT_ID.slice(0,4)}...` : "MISSING",
      APS_CLIENT_SECRET: APS_CLIENT_SECRET ? `[${APS_CLIENT_SECRET.length} chars]` : "MISSING",
      WEB_ORIGIN: WEB_ORIGIN || "MISSING"
    }
  }), {
    headers: { "content-type": "application/json", ...cors }
  });
});