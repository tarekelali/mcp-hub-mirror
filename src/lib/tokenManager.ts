const FNS = import.meta.env.VITE_FUNCTIONS_BASE || 
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:54321"
    : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");

export class TokenManager {
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

  // Helper to get current headers for API calls
  getHeaders(): Record<string, string> {
    const hdrs: Record<string, string> = {};
    const at = localStorage.getItem("aps_at") || "";
    const rt = localStorage.getItem("aps_rt") || "";
    if (at) {
      hdrs["Authorization"] = `Bearer ${at}`;
      hdrs["X-APS-AT"] = at;
    }
    if (rt) hdrs["X-APS-RT"] = rt;
    return hdrs;
  }

  // Retry wrapper for APS API calls with automatic token refresh
  async retryRequest(url: string, init?: RequestInit): Promise<Response> {
    const headers = { ...this.getHeaders(), ...(init?.headers || {}) };
    let response = await fetch(url, { ...init, headers, credentials: "include" });
    
    // Handle 401 with one-shot retry for APS endpoints
    if (response.status === 401 && (url.includes('/aps-') || url.includes('/auth-aps-'))) {
      console.log("[TokenManager] 401 detected, attempting token refresh...");
      const refreshed = await this.refreshTokens();
      if (refreshed) {
        // Retry with fresh tokens
        const newHeaders = { ...this.getHeaders(), ...(init?.headers || {}) };
        response = await fetch(url, { ...init, headers: newHeaders, credentials: "include" });
      }
    }
    
    return response;
  }
}

// Singleton instance
export const tokenManager = new TokenManager();