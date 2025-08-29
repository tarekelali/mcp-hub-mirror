import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function env(name: string) {
  const v = Deno.env.get(name);
  return (typeof v === "string" ? v.trim() : v) || undefined;
}

const APS_CLIENT_ID = env("APS_CLIENT_ID");
const APS_CLIENT_SECRET = env("APS_CLIENT_SECRET");
const WEB_ORIGIN = env("WEB_ORIGIN");

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const buildTimestamp = new Date().toISOString(); // Current deployment time
  const gitSha = env("GIT_SHA") || "unknown"; // Git SHA if available

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