import { http } from "./http.ts";
import { bearer } from "./auth.ts";

const BASE = "https://developer.api.autodesk.com/da/us-east/v3";

export async function createWorkItem(payload: Record<string, unknown>) {
  return http<any>(`${BASE}/workitems`, {
    method: "POST",
    headers: { 
      "content-type": "application/json", 
      ...(await bearer("code:all data:read data:write bucket:read bucket:create")) 
    },
    body: JSON.stringify(payload),
  });
}