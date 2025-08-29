import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { decrypt, encrypt } from "./crypto.ts";

export async function accessTokenForSession(sessionId: string) {
  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await svc.from("editor_tokens").select("refresh_token_enc").eq("session_id", sessionId).maybeSingle();
  if (!data?.refresh_token_enc) throw new Error("not_connected");

  const refresh = await decrypt(data.refresh_token_enc);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
  const res = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "authorization": "Basic " + btoa(`${Deno.env.get("APS_CLIENT_ID")!}:${Deno.env.get("APS_CLIENT_SECRET")!}`)
    },
    body
  });
  if (!res.ok) throw new Error("refresh_failed:" + (await res.text()));
  const tok = await res.json(); // { access_token, refresh_token, expires_in ... }

  // Persist new refresh token if provided
  if (tok.refresh_token) {
    await svc.from("editor_tokens").update({
      refresh_token_enc: await encrypt(tok.refresh_token),
      updated_at: new Date().toISOString()
    }).eq("session_id", sessionId);
  }
  return tok.access_token as string;
}