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

export interface Project {
  project_id: string;
  name_raw: string;
  country_name?: string;
  country_code?: string;
  unit_code?: string;
  unit_number?: number;
  city?: string;
  parse_confidence?: number;
  ingested_at: string;
  updated_at: string;
}

export interface ProjectsResponse {
  items: Project[];
  total_count: number;
  has_more: boolean;
  offset: number;
  limit: number;
  filters: {
    country?: string;
    search?: string;
  };
}

export async function getProjects(params: {
  country?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ProjectsResponse> {
  const searchParams = new URLSearchParams();
  if (params.country) searchParams.set('country', params.country);
  if (params.search) searchParams.set('q', params.search);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const url = `${BASE}/api-acc-projects?${searchParams.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getCapabilities() {
  const r = await fetch(`${BASE}/capabilities`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getHealth(endpoint: string) {
  const r = await fetch(`${BASE}/health/${endpoint}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}