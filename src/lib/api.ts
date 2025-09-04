import { FUNCTIONS_BASE } from './functions-base';

export const BASE = FUNCTIONS_BASE;

export async function getCountries() {
  const r = await fetch(`${BASE}/api-countries`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<
    Array<{ code: string; name: string; total: number; published: number; unpublished: number }>
  >;
}

export async function getCountryCmps(code: string) {
  const r = await fetch(`${BASE}/api-countries/${code}/cmp`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ 
    country: string; 
    cmps: Array<{ id: string; name: string; country_code: string; published: boolean }> 
  }>;
}

// Fetch all projects (replacing getAllCmps to get all ACC projects)
export async function fetchAllProjects(): Promise<Project[]> {
  const allProjects: Project[] = [];
  let offset = 0;
  const limit = 200; // Cap at 200 per server limit
  
  while (true) {
    const response = await getProjects({ limit, offset });
    allProjects.push(...response.items);
    
    if (!response.has_more || response.items.length === 0) break;
    offset += response.items.length; // Use actual items returned, not limit
  }
  
  return allProjects;
}

// Fetch all projects for a specific country
export async function fetchAllProjectsByCountry(countryCode: string): Promise<{ country: string; projects: Project[] }> {
  const allProjects: Project[] = [];
  let offset = 0;
  const limit = 200; // Cap at 200 per server limit
  
  while (true) {
    const response = await getProjects({ country: countryCode, limit, offset });
    allProjects.push(...response.items);
    
    if (!response.has_more || response.items.length === 0) break;
    offset += response.items.length; // Use actual items returned, not limit
  }
  
  return {
    country: countryCode,
    projects: allProjects
  };
}

export async function getAllCmps() {
  const r = await fetch(`${BASE}/api-countries/cmps`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<Array<{ 
    id: string; 
    name: string; 
    country_code: string; 
    country_name: string; 
    published: boolean; 
    centroid: { lat: number; lng: number } | null;
  }>>;
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

// CMP API functions
export async function getCmpOverview(cmpId: string) {
  const r = await fetch(`${BASE}/api-cmp-overview/api/cmp/${cmpId}/overview`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getCmpFiles(cmpId: string) {
  const r = await fetch(`${BASE}/api-cmp-files/api/cmp/${cmpId}/sheets`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getCmpContact(cmpId: string) {
  const r = await fetch(`${BASE}/api-cmp-files/api/contacts/${cmpId}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// HFB and DS API functions
export async function getHfbDetailedSolutions(hfbId: string) {
  const r = await fetch(`${BASE}/api-hfb/api/hfb/${hfbId}/detailed-solutions`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getDetailedSolution(dsId: string) {
  const r = await fetch(`${BASE}/api-detailed-solution/api/detailed-solution/${dsId}/theatre`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}