function sign(value: string) {
  const secret = Deno.env.get("OAUTH_COOKIE_SECRET")!;
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value + secret))
    .then(buf => btoa(String.fromCharCode(...new Uint8Array(buf))));
}

export async function setSessionCookie(headers: Headers, sessionId: string) {
  const sig = await sign(sessionId);
  headers.append("set-cookie", `mcp_sess=${sessionId}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
}

export async function readSessionCookie(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;)\s*mcp_sess=([^;]+)/);
  if (!m) return null;
  const [sid, sig] = decodeURIComponent(m[1]).split(".");
  const expected = await sign(sid);
  return expected === sig ? sid : null;
}

export function ensureSession(headers: Headers, maybeId: string | null) {
  if (maybeId) return maybeId;
  // simple random session id
  const sid = crypto.randomUUID();
  headers.append("set-cookie", `mcp_sess=${sid}.x; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
  return sid;
}