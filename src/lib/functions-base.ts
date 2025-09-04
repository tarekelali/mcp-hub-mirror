/**
 * Centralized function base URL utility
 * Handles localhost, 127.0.0.1, and [::1] (including /functions/v1 for local development)
 */

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || 
         hostname === "127.0.0.1" || 
         hostname === "[::1]" ||
         hostname.startsWith("localhost:") ||
         hostname.startsWith("127.0.0.1:") ||
         hostname.startsWith("[::1]:");
}

export function getFunctionsBaseUrl(): string {
  // Check for explicit environment override first
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_FUNCTIONS_BASE) {
    return import.meta.env.VITE_FUNCTIONS_BASE;
  }

  // For browser environments
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    if (isLocalhost(hostname)) {
      // Local development - include /functions/v1 path
      return "http://127.0.0.1:54321/functions/v1";
    } else {
      // Production/staging - direct to function domain
      return "https://kuwrhanybqhfnwvshedl.functions.supabase.co";
    }
  }

  // Fallback for non-browser environments
  return "https://kuwrhanybqhfnwvshedl.functions.supabase.co";
}

export const FUNCTIONS_BASE = getFunctionsBaseUrl();