import React from "react";

const FNS =
  import.meta.env.VITE_FUNCTIONS_BASE ||
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:54321"
    : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");
const PILOT_CMP = "11111111-1111-1111-1111-111111111111"; // seeded CMP id

// Token Manager for silent refresh and retry logic
class TokenManager {
  private refreshTimer: number | null = null;
  
  scheduleRefresh(expiresIn: number) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Schedule refresh 60 seconds before expiry
    const refreshDelay = Math.max(60000, (expiresIn * 1000) - 60000);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTokens();
    }, refreshDelay);
    
    console.log(`[TokenManager] Refresh scheduled in ${refreshDelay}ms`);
  }
  
  async refreshTokens(): Promise<boolean> {
    try {
      const response = await fetch(`${FNS}/auth-aps-refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-APS-RT": localStorage.getItem("aps_rt") || "",
        },
      });
      
      if (!response.ok) {
        console.error("[TokenManager] Refresh failed:", response.status);
        return false;
      }
      
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem("aps_at", data.access_token);
        this.scheduleRefresh(data.expires_in || 3600);
        console.log("[TokenManager] Tokens refreshed successfully");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("[TokenManager] Refresh error:", error);
      return false;
    }
  }
  
  cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export default function Diag() {
  const [out, setOut] = React.useState<any>({});
  const [debugOut, setDebugOut] = React.useState<any>(null);
  const [ready, setReady] = React.useState(false);
  const [tokenManager] = React.useState(() => new TokenManager());

  // Cleanup token manager on unmount
  React.useEffect(() => {
    return () => tokenManager.cleanup();
  }, [tokenManager]);

  // 1) Parse tokens from URL query and hash BEFORE any fetch runs
  React.useLayoutEffect(() => {
    let updated = false;
    let newExpiresIn: number | null = null;

    // Query first
    const q = new URLSearchParams(window.location.search);
    const qAT = q.get("aps_at");
    const qRT = q.get("aps_rt");
    if (qAT) { 
      localStorage.setItem("aps_at", qAT); 
      updated = true;
      newExpiresIn = 3600; // Default to 1 hour if not specified
    }
    if (qRT) { localStorage.setItem("aps_rt", qRT); updated = true; }
    if (qAT || qRT) {
      const url = new URL(window.location.href);
      url.search = ""; // remove query
      history.replaceState(null, "", url.toString());
      console.log("[APS] query tokens saved");
    }

    // Hash next
    const raw = window.location.hash.slice(1);
    if (raw) {
      const sp = new URLSearchParams(raw);
      const hAT = sp.get("aps_at") || sp.get("at");
      const hRT = sp.get("aps_rt") || sp.get("rt");
      if (hAT) { 
        localStorage.setItem("aps_at", hAT); 
        updated = true;
        newExpiresIn = 3600; // Default to 1 hour if not specified
      }
      if (hRT) { localStorage.setItem("aps_rt", hRT); updated = true; }
      if (hAT || hRT) {
        history.replaceState(null, "", window.location.pathname); // strip hash
        console.log("[APS] hash tokens saved");
      }
    }

    // Schedule token refresh if we received new tokens
    if (newExpiresIn) {
      tokenManager.scheduleRefresh(newExpiresIn);
    }

    setReady(true);
  }, [tokenManager]);

  const getHeaders = (): Record<string, string> => {
    const hdrs: Record<string, string> = {};
    const at = localStorage.getItem("aps_at") || "";
    const rt = localStorage.getItem("aps_rt") || "";
    if (at) {
      hdrs["Authorization"] = `Bearer ${at}`; // standard
      hdrs["X-APS-AT"] = at;                  // custom, server also accepts
    }
    if (rt) hdrs["X-APS-RT"] = rt;
    console.log("[DEBUG] AT length:", at ? at.length : 0, "RT length:", rt ? rt.length : 0);
    return hdrs;
  };

  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e?.data?.aps_connected) {
        if (e.data.aps_at) localStorage.setItem("aps_at", e.data.aps_at);
        if (e.data.aps_rt) localStorage.setItem("aps_rt", e.data.aps_rt);
        console.log("[APS] postMessage received; tokens saved. Reloading…");
        window.location.reload();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // 2) Run diagnostics only after ready=true so tokens are available
  React.useEffect(() => {
    if (!ready) return;
    
    (async () => {
      const j = async (u: string, init?: RequestInit): Promise<any> => {
        try {
          const headers = { ...getHeaders(), ...(init?.headers || {}) };
          const r = await fetch(u, { ...init, headers, credentials: "include" as RequestCredentials });
          
          // Handle 401 with one-shot retry for APS endpoints
          if (r.status === 401 && (u.includes('/aps-') || u.includes('/auth-aps-'))) {
            console.log("[Retry] 401 detected, attempting token refresh...");
            const refreshed = await tokenManager.refreshTokens();
            if (refreshed) {
              // Retry with fresh tokens
              const newHeaders = { ...getHeaders(), ...(init?.headers || {}) };
              const retryR = await fetch(u, { ...init, headers: newHeaders, credentials: "include" as RequestCredentials });
              const retryTxt = await retryR.text();
              try { return { ok: retryR.ok, status: retryR.status, body: JSON.parse(retryTxt) }; }
              catch { return { ok: retryR.ok, status: retryR.status, body: retryTxt }; }
            }
          }
          
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
        version:     await j(`${FNS}/__version`),                                        // no credentials
      };

      // If we have hubs, also fetch projects for the first hub
      if (initialData.hubs && typeof initialData.hubs === 'object' && initialData.hubs.body?.items?.length > 0) {
        const firstHub = initialData.hubs.body.items[0];
        const firstHubId = firstHub.id;
        initialData.projects = await j(`${FNS}/aps-projects?hub_id=${firstHubId}&limit=50`, { credentials: "include" });
        initialData.firstHubName = firstHub.attributes?.name || firstHubId;
      }

      setOut(initialData);
    })();
  }, [ready, tokenManager]);

  // 3) Same-tab connect
  const connectAPS = () => {
    const ret = `${window.location.origin}/_diag`;
    window.location.href = `${FNS}/auth-aps-start?return=${encodeURIComponent(ret)}`;
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

  const openSampleModel = async () => {
    if (!out?.projects?.body?.sample?.length) {
      alert("No sample projects available");
      return;
    }
    
    try {
      // Get viewer token
      const viewerResult = await fetch(`${FNS}/api-viewer-sign/api/viewer/sign`, { method: "POST" });
      const viewerData = await viewerResult.json();
      
      if (!viewerData.access_token) {
        alert("Failed to get viewer token");
        return;
      }
      
      const sampleProject = out.projects.body.sample[0];
      alert(`Sample model flow would open project: ${sampleProject.name} (${sampleProject.country}/${sampleProject.unit}/${sampleProject.city})\nViewer token ready: ${viewerData.access_token.substring(0, 20)}...`);
    } catch (error) {
      console.error("Sample model error:", error);
      alert("Failed to prepare sample model");
    }
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
          <>
            <button 
              onClick={connectAPS}
              style={{ marginLeft: 8, padding: "4px 8px", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
            >
              Connect Autodesk
            </button>
          </>
        )}
      </div>

      {/* Hubs Count */}
      <div style={{ marginBottom: 16 }}>
        <strong>Hubs count:</strong> {Array.isArray(out?.hubs?.body?.items) ? out.hubs.body.items.length : 0}
        {out?.firstHubName && (
          <div style={{ marginTop: 4, fontSize: "12px", color: "#666" }}>
            Hub: {out.firstHubName} ({out?.hubs?.body?.items?.[0]?.id})
          </div>
        )}
      </div>

      {/* Projects Count */}
      <div style={{ marginBottom: 16 }}>
        <strong>Projects count:</strong> {Array.isArray(out?.projects?.body?.items) ? out.projects.body.items.length : 0}
        {out?.projects?.body?.total_estimate && (
          <span style={{ marginLeft: 8, color: "#666" }}>
            (showing {out.projects.body.items.length} of {out.projects.body.total_estimate} total)
          </span>
        )}
        {out?.firstHubName && (
          <div style={{ marginTop: 4, fontSize: "12px", color: "#666" }}>
            Hub: {out.firstHubName}
          </div>
        )}
        {out?.projects?.body?.sample?.length > 0 && (
          <div style={{ marginTop: 4, fontSize: "12px", color: "#666" }}>
            Sample: {out.projects.body.sample.map((p: any) => 
              `${p.name} (${p.country || 'N/A'}/${p.unit || 'N/A'}/${p.city || 'N/A'})`
            ).join(', ')}
          </div>
        )}
      </div>

      {/* Version & Environment Status */}
      <div style={{ marginBottom: 16 }}>
        <strong>Environment Status:</strong>
        {out?.version?.body && (
          <div style={{ marginTop: 4, fontSize: "12px", fontFamily: "monospace" }}>
            <div>Build: {out.version.body.build_timestamp}</div>
            <div>Env Check: ID={out.version.body.has_id ? "✓" : "✗"}, Secret={out.version.body.has_secret ? "✓" : "✗"}, Origin={out.version.body.has_origin ? "✓" : "✗"}</div>
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
        {out?.projects?.body?.sample?.length > 0 && (
          <button 
            onClick={openSampleModel}
            style={{ marginLeft: 8, padding: "4px 8px", backgroundColor: "#9944cc", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Open sample model
          </button>
        )}
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