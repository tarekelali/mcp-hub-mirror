import React from "react";

const FNS =
  import.meta.env.VITE_FUNCTIONS_BASE ||
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:54321"
    : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");
const PILOT_CMP = "11111111-1111-1111-1111-111111111111"; // seeded CMP id

export default function Diag() {
  const [out, setOut] = React.useState<any>({});

  React.useEffect(() => {
    (async () => {
  const j = async (u: string, init?: RequestInit) => {
    try {
      const r = await fetch(u, init);
      const txt = await r.text();
      try { return { ok: r.ok, status: r.status, body: JSON.parse(txt) }; }
      catch { return { ok: r.ok, status: r.status, body: txt }; }
    } catch (e) { return String(e); }
  };

      setOut({
        countries:   await j(`${FNS}/api-countries/api/countries`),                       // no credentials
        cmpOverview: await j(`${FNS}/api-cmp-overview/api/cmp/${PILOT_CMP}/overview`),    // no credentials
        viewerSign:  await j(`${FNS}/api-viewer-sign/api/viewer/sign`, { method: "POST" } ), // no credentials
        apsStatus:   await j(`${FNS}/auth-aps-status`, { credentials: "include" }),       // needs cookies
        hubs:        await j(`${FNS}/aps-hubs`, { credentials: "include" }),              // needs cookies
        apsDebug:    await j(`${FNS}/auth-aps-debug`),                                   // debug info
      });
    })();
  }, []);

  const connectAPS = () => {
    const w = window.open(
      `${FNS}/auth-aps-start`,
      "aps_oauth",
      "width=520,height=680,menubar=no,status=no"
    );
    // listen for postMessage from callback
    const onMsg = (e: MessageEvent) => {
      if (e?.data?.aps_connected) {
        window.removeEventListener("message", onMsg);
        // re-run diagnostics
        window.location.reload();
      }
    };
    window.addEventListener("message", onMsg);
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Diagnostics</h1>
      <div style={{ opacity:.7, marginBottom:8 }}>FNS = {FNS}</div>
      
      {/* APS Connection Status */}
      <div style={{ marginBottom: 16 }}>
        <strong>APS Status:</strong> {out?.apsStatus?.connected ? "Connected" : "Not Connected"}
        {!out?.apsStatus?.connected && (
          <button 
            onClick={connectAPS}
            style={{ marginLeft: 8, padding: "4px 8px", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Connect Autodesk
          </button>
        )}
      </div>

      {/* Hubs Count */}
      <div style={{ marginBottom: 16 }}>
        <strong>Hubs count:</strong> {Array.isArray(out?.hubs?.items) ? out.hubs.items.length : 0}
      </div>

      {/* Debug Info */}
      <div style={{ marginBottom: 16 }}>
        <strong>Origin check:</strong> {window.location.origin}
      </div>

      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(out, null, 2)}</pre>
    </div>
  );
}