export async function http<T>(url: string, init: RequestInit, retries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, init);
    if (res.ok) return (await res.json()) as T;
    if (res.status >= 500 || res.status === 429) {
      await new Promise(r => setTimeout(r, 250 * Math.pow(2, i)));
      continue;
    }
    lastErr = await res.text();
    break;
  }
  throw new Error(typeof lastErr === "string" ? lastErr : "APS request failed");
}