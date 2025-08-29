const BASE = import.meta.env.VITE_FUNCTIONS_BASE || (window.location.hostname === "localhost"
  ? "http://127.0.0.1:54321"
  : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");

export async function getCmpOverview(id: string) {
  const r = await fetch(`${BASE}/api-cmp-overview/api/cmp/${id}/overview`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getCmpSheets(id: string) {
  const r = await fetch(`${BASE}/api-cmp-files/api/cmp/${id}/sheets`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ 
    sheets: Array<{ 
      id: string; 
      name: string; 
      number: string; 
      pdf_url?: string;
    }>;
  }>;
}

export async function getCmpContact(id: string) {
  const r = await fetch(`${BASE}/api-cmp-files/api/contacts/${id}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ 
    contact: { 
      name: string; 
      role?: string; 
      email: string; 
      phone?: string;
    } | null;
  }>;
}