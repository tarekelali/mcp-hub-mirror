export function getViewerToken() {
  const base = "https://kuwrhanybqhfnwvshedl.functions.supabase.co";
  return fetch(`${base}/api-viewer-sign/api/viewer/sign`, { method: "POST" }).then(r => r.json());
}