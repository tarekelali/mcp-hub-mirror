export const BASE = import.meta.env.VITE_FUNCTIONS_BASE || (window.location.hostname === "localhost"
  ? "http://127.0.0.1:54321"
  : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");

export async function getCountries() {
  const r = await fetch(`${BASE}/api-countries/api/countries`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<
    Array<{ code: string; name: string; total: number; published: number; unpublished: number }>
  >;
}

export async function getCountryCmps(code: string) {
  const r = await fetch(`${BASE}/api-countries/api/countries/${code}/cmp`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ 
    country: string; 
    cmps: Array<{ id: string; name: string; country_code: string; published: boolean }> 
  }>;
}