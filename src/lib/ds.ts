const BASE = import.meta.env.VITE_FUNCTIONS_BASE || (window.location.hostname === "localhost"
  ? "http://127.0.0.1:54321"
  : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");

export async function listDS(hfbId: string) {
  const r = await fetch(`${BASE}/api-hfb/api/hfb/${hfbId}/detailed-solutions`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ 
    items: Array<{ 
      id: string; 
      code: string; 
      name: string; 
      area_sqm: number; 
      pct: number;
    }>;
  }>;
}

export async function getTheatre(dsId: string) {
  const r = await fetch(`${BASE}/api-detailed-solution/api/detailed-solution/${dsId}/theatre`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}