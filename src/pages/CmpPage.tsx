import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs } from "../../packages/ui/src/Tabs";
import { Modal } from "../../packages/ui/src/Modal";
import { getCmpOverview, getCmpSheets, getCmpContact } from "../lib/cmp";
import { enqueueDA, daStatus } from "../lib/da";
import { AccPicker } from "../components/AccPicker";
import { BASE } from "../lib/api";

export default function CmpPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<"structure" | "review" | "contact">("structure");
  const [data, setData] = React.useState<any>(null);
  const [sheets, setSheets] = React.useState<any[]>([]);
  const [contact, setContact] = React.useState<any>(null);
  const [openPdf, setOpenPdf] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [ov, sh, ct] = await Promise.all([
          getCmpOverview(id), 
          getCmpSheets(id), 
          getCmpContact(id)
        ]);
        setData(ov);
        setSheets(sh.sheets);
        setContact(ct.contact);
        // Expose CMP's ACC IDs to the page
        if (ov?.cmp) {
          (window as any).__cmp = {
            id: ov.cmp.id,
            accProjectId: ov.cmp.accProjectId,
            accFolderId: ov.cmp.accFolderId
          };
        }
      } catch (error) {
        console.error("Failed to load CMP data:", error);
      }
    })();
  }, [id]);

  if (!data) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>{data.cmp.name}</h1>
      <div style={{ opacity: 0.7, marginBottom: 16 }}>
        {data.cmp.countryCode} • {data.cmp.published ? "Published" : "Unpublished"}
        {data.cmp.unitCode && <span> • Unit {data.cmp.unitCode}</span>}
        {data.cmp.city && <span> • {data.cmp.city}</span>}
      </div>
      <Tabs
        value={tab}
        onChange={(v) => setTab(v as any)}
        tabs={[
          { id: "structure", label: "Structure" },
          { id: "review", label: "Review" },
          { id: "contact", label: "Contact" },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        {tab === "structure" && <StructureTreemap data={data.structure} />}
        {tab === "review" && <ReviewTable sheets={sheets} onOpen={(url) => setOpenPdf(url)} cmpId={data.cmp.id} />}
        {tab === "contact" && <ContactCard contact={contact} />}
      </div>

      <Modal open={!!openPdf} onClose={() => setOpenPdf(null)}>
        {openPdf ? (
          <iframe 
            src={openPdf} 
            title="Revit Sheet" 
            style={{ width: "80vw", height: "70vh", border: 0 }} 
          />
        ) : null}
      </Modal>
    </div>
  );
}

function StructureTreemap({ data }: { data: any }) {
  const navigate = useNavigate();
  // super-minimal "puzzle" as stacked rows sized by percentage
  const Block = ({ item }: any) => (
    <div 
      title={`${item.name} • ${item.percentage.toFixed(1)}%`} 
      onClick={() => navigate(`/hfb/${item.id}`)}
      style={{
        flex: item.percentage, 
        minWidth: 40, 
        minHeight: 48, 
        display: "grid", 
        placeItems: "center",
        background: "#FFDB00", 
        color: "#111", 
        border: "1px solid #fff", 
        borderRadius: 8,
        cursor: "pointer"
      }}
    >
      {item.name}
    </div>
  );
  
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
      <div>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>
          Market hall ({Math.round(data.marketHall.totalPct)}%)
        </div>
        <div style={{ 
          display: "flex", 
          gap: 8, 
          flexWrap: "wrap", 
          background: "#f8f8f8", 
          padding: 8, 
          borderRadius: 12 
        }}>
          {data.marketHall.items.map((i: any) => <Block key={i.id} item={i} />)}
        </div>
      </div>
      <div>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>
          Showroom ({Math.round(data.showroom.totalPct)}%)
        </div>
        <div style={{ 
          display: "flex", 
          gap: 8, 
          flexWrap: "wrap", 
          background: "#f8f8f8", 
          padding: 8, 
          borderRadius: 12 
        }}>
          {data.showroom.items.map((i: any) => <Block key={i.id} item={i} />)}
        </div>
      </div>
    </div>
  );
}

async function checkApsConnected() {
  try {
    const r = await fetch(`${BASE}/auth-aps-status`);
    if (!r.ok) return false; 
    const j = await r.json(); 
    return !!j.connected;
  } catch { 
    return false; 
  }
}

function ReviewTable({ sheets, onOpen, cmpId }: { sheets: any[]; onOpen: (url:string)=>void; cmpId: string }) {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [connected, setConnected] = React.useState<boolean>(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  React.useEffect(() => {
    (async () => { try { setJobs((await daStatus(cmpId)).jobs); } catch {} })();
    const t = setInterval(async () => { try { setJobs((await daStatus(cmpId)).jobs); } catch {} }, 5000);
    return () => clearInterval(t);
  }, [cmpId]);

  React.useEffect(() => { 
    (async () => setConnected(await checkApsConnected()))(); 
  }, []);

  const connect = () => {
    const w = window.open(`${BASE}/auth-aps-start`, "aps", "width=640,height=720");
    const handler = (e: any) => { 
      if (e.data?.aps_connected) { 
        setConnected(true); 
        window.removeEventListener("message", handler); 
        w?.close(); 
      } 
    };
    window.addEventListener("message", handler);
  };

  const runDA = async () => {
    if (!sheets.length) return alert("No sheets to export.");
    setBusy(true);
    try {
      const first = sheets[0]; // pilot shortcut
      await enqueueDA(cmpId, { acc_item_id:first.acc_item_id, acc_version_id:first.acc_version_id });
      setJobs((await daStatus(cmpId)).jobs);
    } catch (e:any) {
      alert("Failed to enqueue DA: " + (e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const runDAFromACC = async (sel: { itemId:string; versionId:string; name:string }) => {
    setBusy(true);
    try {
      await enqueueDA(cmpId, { acc_item_id: sel.itemId, acc_version_id: sel.versionId });
      setJobs((await daStatus(cmpId)).jobs);
    } catch (e:any) { 
      alert("Failed to enqueue DA: " + (e?.message ?? e)); 
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontWeight:700 }}>Revit Sheets</div>
        <div style={{ display:"flex", gap:8 }}>
          {!connected && (
            <button onClick={connect} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #0058A3", background:"#fff", color:"#0058A3" }}>
              Connect Autodesk
            </button>
          )}
          <button onClick={()=>setPickerOpen(true)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #0058A3", background:"#fff", color:"#0058A3" }}>
            Pick from ACC
          </button>
          <button onClick={runDA} disabled={busy} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #0058A3", background:"#0058A3", color:"#fff" }}>
            {busy ? "Enqueuing…" : "Export sheets (DA)"}
          </button>
        </div>
      </div>

      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:12 }}>
        <thead><tr><th align="left">Number</th><th align="left">Name</th><th>PDF</th></tr></thead>
        <tbody>
          {sheets.map(s => (
            <tr key={s.id} style={{ borderTop:"1px solid #eee" }}>
              <td>{s.number}</td><td>{s.name}</td>
              <td align="center">{s.pdf_url ? <button onClick={()=>onOpen(s.pdf_url)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #0058A3", background:"#0058A3", color:"#fff" }}>Open</button> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize:12, opacity:.8 }}>
        <div style={{ fontWeight:700, marginBottom:4 }}>Recent DA jobs</div>
        {jobs.length === 0 && <div>No jobs yet.</div>}
        {jobs.map(j => (
          <div key={j.id} style={{ display:"flex", gap:8 }}>
            <div>{new Date(j.created_at).toLocaleString()}</div>
            <div>• {j.task}</div>
            <div>• <strong>{j.status}</strong></div>
            {j.workitem_id && <div>• {j.workitem_id}</div>}
          </div>
        ))}
      </div>

      <AccPicker
        open={pickerOpen}
        onClose={()=>setPickerOpen(false)}
        projectId={(window as any).__cmp?.accProjectId || ""}
        folderId={(window as any).__cmp?.accFolderId || ""}
        onPick={runDAFromACC}
      />
    </>
  );
}

function ContactCard({ contact }: { contact: any }) {
  if (!contact) return <div>No contact on file yet.</div>;
  
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 700 }}>{contact.name}</div>
      <div style={{ opacity: 0.7 }}>{contact.role || "Country superuser"}</div>
      <div style={{ marginTop: 8 }}>
        <a href={`mailto:${contact.email}`}>{contact.email}</a>
        {contact.phone ? ` • ${contact.phone}` : ""}
      </div>
    </div>
  );
}