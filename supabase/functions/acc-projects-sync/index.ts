import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { readSessionCookie } from "../_shared/cookies.ts";

const ORIGIN = Deno.env.get("WEB_ORIGIN")!;
const cors = {
  "access-control-allow-origin": ORIGIN,
  "access-control-allow-headers": "authorization, x-client-info, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-credentials": "true",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ ok: false, code: "method_not_allowed" }, 405);

  // Read-only guard (belt & braces)
  if ((Deno.env.get("READ_ONLY_MODE") ?? "true") !== "true") {
    // we still won't write to ACC, but leave hook here
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // (Phase 1) No live call to ACC yet—just parse & upsert mapping for given names
  const body = await req.json().catch(() => ({}));
  const names: string[] = body?.names ?? [];
  const parsed = names.map((name: string) => {
    const [countryName, unit, city] = name.split("_");
    return {
      name,
      country_code: countryName === "Australia" ? "AU" :
                    countryName === "Netherlands" ? "NL" :
                    countryName === "Sweden" ? "SE" : null,
      unit_code: unit ?? null,
      city: city ?? null
    };
  });

  // Upsert into acc_project_map (db only)
  for (const p of parsed) {
    await supabase.from("acc_project_map").upsert({
      acc_project_id: crypto.randomUUID(),  // placeholder if unknown
      name: p.name,
      country_code: p.country_code,
      unit_code: p.unit_code,
      city: p.city,
      parsed: { source: "manual" }
    }, { onConflict: "acc_project_id" });
  }

  return j({ ok: true, items: parsed });

  function j(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors } });
  }
});