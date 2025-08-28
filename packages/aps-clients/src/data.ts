import { http } from "./http.ts";
import { bearer } from "./auth.ts";

const BASE = "https://developer.api.autodesk.com";

export async function getItem(projectId: string, itemId: string) {
  return http<any>(`${BASE}/data/v1/projects/${projectId}/items/${itemId}`, { 
    headers: await bearer() 
  });
}