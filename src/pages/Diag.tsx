import React from "react";

const FNS =
  import.meta.env.VITE_FUNCTIONS_BASE ||
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:54321"
    : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");
const PILOT_CMP = "11111111-1111-1111-1111-111111111111"; // seeded CMP id

export default function Diag() {
  const [out, setOut] = React.useState<any>({});
  const [debugOut, setDebugOut] = React.useState<any>(null);

  const getHeaders = () => {
    const hdrs: Record<string, string> = {};
    const at = localStorage.getItem("aps_at");
    const rt = localStorage.getItem("aps_rt");
    if (at) hdrs["X-APS-AT"] = at;
    if (rt) hdrs["X-APS-RT"] = rt;
    return hdrs;
  };

  React.useEffect(() => {
    // Listen for tokens from popup
    const handleMessage = (e: MessageEvent) => {
      if (e?.data?.aps_connected) {
        if (e.data.aps_at) localStorage.setItem("aps_at", e.data.aps_at);
        if (e.data.aps_rt) localStorage.setItem("aps_rt", e.data.aps_rt);
        window.location.reload();
      }
    };
    window.addEventListener("message", handleMessage);

    (async () => {
  const j = async (u: string, init?: RequestInit) => {
    try {
      const headers = { ...getHeaders(), ...(init?.headers || {}) };
      const r = await fetch(u, { ...init, headers });
      const txt = await r.text();
      try { return { ok: r.ok, status: r.status, body: JSON.parse(txt) }; }
      catch { return { ok: r.ok, status: r.status, body: txt }; }
    } catch (e) { return String(e); }
  };

      const initialData: any = {
        countries:   await j(`${FNS}/api-countries/api/countries`),                       // no credentials
        cmpOverview: await j(`${FNS}/api-cmp-overview/api/cmp/${PILOT_CMP}/overview`),    // no credentials
        viewerSign:  await j(`${FNS}/api-viewer-sign/api/viewer/sign`, { method: "POST" } ), // no credentials
        apsStatus:   await j(`${FNS}/auth-aps-status`, { credentials: "include" }),       // needs cookies + headers
        hubs:        await j(`${FNS}/aps-hubs`, { credentials: "include" }),              // needs cookies + headers
        selftest:    await j(`${FNS}/auth-aps-selftest`),                                // no credentials
      };

      // If we have hubs, also fetch projects for the first hub
      if (initialData.hubs && typeof initialData.hubs === 'object' && initialData.hubs.body?.items?.length > 0) {
        const firstHubId = initialData.hubs.body.items[0].id;
        initialData.projects = await j(`${FNS}/aps-projects?hub_id=${firstHubId}`, { credentials: "include" });
      }

      setOut(initialData);
    })();

    return () => window.removeEventListener("message", handleMessage);
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

  const debugAPS = async () => {
    const j = async (u: string, init?: RequestInit) => {
      try {
        const headers = { ...getHeaders(), ...(init?.headers || {}) };
        const r = await fetch(u, { ...init, headers });
        const txt = await r.text();
        try { return { ok: r.ok, status: r.status, body: JSON.parse(txt) }; }
        catch { return { ok: r.ok, status: r.status, body: txt }; }
      } catch (e) { return String(e); }
    };
    const result = await j(`${FNS}/auth-aps-debug`, { credentials: "include" });
    setDebugOut(result);
  };

  const clearAPS = () => {
    localStorage.removeItem("aps_at");
    localStorage.removeItem("aps_rt");
    window.location.reload();
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Diagnostics</h1>
      <div style={{ opacity:.7, marginBottom:8 }}>FNS = {FNS}</div>
      
      {/* APS Connection Status */}
      <div style={{ marginBottom: 16 }}>
        <strong>APS Status:</strong> {out?.apsStatus?.body?.connected ? "Connected" : "Not Connected"}
        {out?.apsStatus?.body?.via && (
          <span style={{ 
            marginLeft: 8, 
            padding: "2px 6px", 
            backgroundColor: "#e0e0e0", 
            borderRadius: 3, 
            fontSize: "12px" 
          }}>
            via: {out.apsStatus.body.via}
          </span>
        )}
        {!out?.apsStatus?.body?.connected && (
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
        <strong>Hubs count:</strong> {Array.isArray(out?.hubs?.body?.items) ? out.hubs.body.items.length : 0}
      </div>

      {/* Projects Count */}
      <div style={{ marginBottom: 16 }}>
        <strong>Projects count:</strong> {Array.isArray(out?.projects?.body?.items) ? out.projects.body.items.length : 0}
        {out?.projects?.body?.items?.length > 0 && (
          <div style={{ marginTop: 4, fontSize: "12px", color: "#666" }}>
            Sample projects: {out.projects.body.items.slice(0, 3).map((p: any) => 
              `${p.name} (${p.country || 'Unknown'}/${p.unit || 'N/A'}/${p.city || 'N/A'})`
            ).join(', ')}
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div style={{ marginBottom: 16 }}>
        <strong>Origin check:</strong> {window.location.origin}
      </div>

      {/* Debug APS Button */}
      <div style={{ marginBottom: 16 }}>
        <button 
          onClick={debugAPS}
          style={{ padding: "4px 8px", backgroundColor: "#00aa44", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Debug APS
        </button>
        <button 
          onClick={clearAPS}
          style={{ marginLeft: 8, padding: "4px 8px", backgroundColor: "#cc6600", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Clear APS
        </button>
        {debugOut && (
          <pre style={{ marginTop: 8, padding: 8, backgroundColor: "#f5f5f5", borderRadius: 4, fontSize: "12px" }}>
            {JSON.stringify(debugOut, null, 2)}
          </pre>
        )}
      </div>

      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(out, null, 2)}</pre>
    </div>
  );
}