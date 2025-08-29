import React from "react";
import { Modal } from "../../packages/ui/src/Modal";

export function CountryDrawer({
  open, onClose, country, cmps, onOpenCmp,
}: {
  open: boolean;
  onClose: () => void;
  country: { code: string; name?: string } | null;
  cmps: Array<{ id:string; name:string; published:boolean; unit_code?:string; city?:string }>;
  onOpenCmp: (id: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 520 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          {country ? `${country.name ?? country.code} (${country.code})` : "Country"}
        </div>
        <div style={{ display:"grid", gap:8 }}>
          {cmps.map(c => (
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #eee", borderRadius:12, padding:12 }}>
              <div>
                <div style={{ fontWeight:600 }}>
                  {c.name}
                  {c.unit_code && <span style={{ opacity: 0.7 }}> — Unit {c.unit_code}</span>}
                </div>
                <div style={{ fontSize:12, opacity:.7 }}>
                  {c.published ? "Published" : "Unpublished"}
                  {c.city && <span> • {c.city}</span>}
                </div>
              </div>
              <button onClick={()=>onOpenCmp(c.id)} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #0058A3", background:"#0058A3", color:"#fff" }}>
                Open
              </button>
            </div>
          ))}
          {cmps.length === 0 && <div style={{ opacity:.7 }}>No CMPs in this country yet.</div>}
        </div>
      </div>
    </Modal>
  );
}