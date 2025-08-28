export function signedViewerToken() {
  // In web app, call our edge function /api/viewer/sign instead.
  return fetch("/api/viewer/sign", { method: "POST" }).then(r => r.json());
}