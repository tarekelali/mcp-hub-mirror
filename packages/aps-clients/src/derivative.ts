import { http } from "./http.ts";
import { bearer } from "./auth.ts";

const BASE = "https://developer.api.autodesk.com";

export async function getManifest(urn: string) {
  return http<any>(`${BASE}/modelderivative/v2/designdata/${urn}/manifest`, { 
    headers: await bearer() 
  });
}