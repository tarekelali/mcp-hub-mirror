import React from "react";

const FNS = import.meta.env.VITE_FUNCTIONS_BASE; // e.g. https://<ref>.functions.supabase.co
const PILOT_CMP = "11111111-1111-1111-1111-111111111111"; // seeded CMP id

export default function Diag() {
  const [out, setOut] = React.useState<any>({});

  React.useEffect(() => {
    (async () => {
      const j = async (u: string, init?: RequestInit) => {
        try {
          const r = await fetch(u, init);
          const txt = await r.text();
          try { return JSON.parse(txt); } catch { return txt; }
        } catch (e) { return String(e); }
      };

      setOut({
        countries: await j(`${FNS}/api-countries/api/countries`),
        cmpOverview: await j(`${FNS}/api-cmp-overview/api/cmp/${PILOT_CMP}/overview`),
        viewerSign: await j(`${FNS}/api-viewer-sign/api/viewer/sign`, { method: "POST" }),
        apsStatus:  await j(`${FNS}/auth-aps-status`, { credentials: "include" }),
      });
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Diagnostics</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(out, null, 2)}</pre>
    </div>
  );
}