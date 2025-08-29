import React from "react";
import { Modal } from "../../packages/ui/src/Modal";
import { BASE } from "../lib/api";

async function listFolder(projectId: string, folderId: string) {
  const r = await fetch(`${BASE}/acc-proxy/acc-proxy?path=${encodeURIComponent(`/data/v1/projects/${projectId}/folders/${folderId}/contents`)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function latestVersion(projectId: string, itemId: string) {
  const r = await fetch(`${BASE}/acc-proxy/acc-proxy?path=${encodeURIComponent(`/data/v1/projects/${projectId}/items/${itemId}/versions`)}&page[limit]=1`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function AccPicker({
  open, onClose, projectId, folderId, onPick,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  folderId: string;
  onPick: (sel: { itemId:string; versionId:string; name:string }) => void;
}) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setErr(null); setLoading(true);
        const j = await listFolder(projectId, folderId);
        const items = (j.data || []).filter((e:any) => e.type === "items");
        setRows(items);
      } catch (e:any) {
        setErr(e?.message ?? String(e));
      } finally { setLoading(false); }
    })();
  }, [open, projectId, folderId]);

  const pick = async (it:any) => {
    try {
      const v = await latestVersion(projectId, it.id);
      const ver = (v.data && v.data[0]) || null;
      if (!ver) return alert("No versions found.");
      onPick({ itemId: it.id, versionId: ver.id, name: it.attributes?.displayName || it.id });
      onClose();
    } catch (e:any) {
      alert("Failed to fetch latest version: " + (e?.message ?? e));
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 720 }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Pick from ACC</div>
        {loading && <div>Loading…</div>}
        {err && <div style={{ color:"crimson" }}>{err}</div>}
        {!loading && !err && (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr><th align="left">Name</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((r:any) => (
                <tr key={r.id} style={{ borderTop:"1px solid #eee" }}>
                  <td>{r.attributes?.displayName || r.id}</td>
                  <td align="center">
                    <button onClick={()=>pick(r)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #0058A3", background:"#0058A3", color:"#fff" }}>
                      Select
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={2} style={{ opacity:.7 }}>No items found in this folder.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}