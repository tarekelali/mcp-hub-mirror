import { BASE } from "./api";

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