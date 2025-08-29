export async function getKey() {
  const b64 = Deno.env.get("OAUTH_ENC_KEY")!;
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt","decrypt"]);
}

export async function encrypt(text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const enc = new TextEncoder().encode(text);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc));
  // store iv:ct as base64.iv.base64.ct
  return btoa(String.fromCharCode(...iv)) + "." + btoa(String.fromCharCode(...ct));
}

export async function decrypt(payload: string) {
  const [ivb, ctb] = payload.split(".");
  const iv = Uint8Array.from(atob(ivb), c => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctb), c => c.charCodeAt(0));
  const key = await getKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}