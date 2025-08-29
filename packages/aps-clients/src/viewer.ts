const FNS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_FUNCTIONS_BASE) ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost"
    ? "http://127.0.0.1:54321"
    : "https://kuwrhanybqhfnwvshedl.functions.supabase.co"));

export function getViewerToken() {
  return fetch(`${FNS}/api-viewer-sign/api/viewer/sign`, { method: "POST" }).then(r => r.json());
}