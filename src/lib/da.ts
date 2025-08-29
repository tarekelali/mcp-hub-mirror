const BASE = import.meta.env.VITE_FUNCTIONS_BASE || (window.location.hostname === "localhost"
  ? "http://127.0.0.1:54321"
  : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");

export async function daStatus(cmpId: string) {
  const r = await fetch(`${BASE}/api-da-status/api-da-status?cmpId=${encodeURIComponent(cmpId)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ ok:boolean; jobs: Array<{ id:string; task:string; status:string; created_at:string; workitem_id?:string }> }>;
}

export async function enqueueDA(cmpId: string, sheet: { acc_item_id:string; acc_version_id:string }) {
  const r = await fetch(`${BASE}/api-da-revit-job`, {
    method: "POST",
    headers: { "content-type":"application/json" },
    body: JSON.stringify({
      cmpId,
      task: "export_sheets",
      input_item_id: sheet.acc_item_id,
      input_version_id: sheet.acc_version_id
    })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ ok:boolean; job:any }>;
}