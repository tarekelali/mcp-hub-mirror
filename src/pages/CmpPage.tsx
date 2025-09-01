import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs } from "../../packages/ui/src/Tabs";
import { Modal } from "../../packages/ui/src/Modal";
import { getCmpOverview, getCmpFiles, getCmpContact } from "../lib/api";
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
          getCmpFiles(id), 
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

  if (!data) return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading CMP data...</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="skapa-card mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{data.cmp.name}</h1>
          <div className="text-muted-foreground mb-4">
            {data.cmp.countryCode} • {data.cmp.published ? "Published" : "Unpublished"}
            {data.cmp.unitCode && <span> • Unit {data.cmp.unitCode}</span>}
            {data.cmp.city && <span> • {data.cmp.city}</span>}
          </div>
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

        <div className="mt-6">
          {tab === "structure" && <StructureTreemap data={data.structure} />}
          {tab === "review" && <ReviewTable sheets={sheets} onOpen={(url) => setOpenPdf(url)} cmpId={data.cmp.id} />}
          {tab === "contact" && <ContactCard contact={contact} />}
        </div>

        <Modal open={!!openPdf} onClose={() => setOpenPdf(null)}>
          {openPdf ? (
            <iframe 
              src={openPdf} 
              title="Revit Sheet" 
              className="w-[80vw] h-[70vh] border-0" 
            />
          ) : null}
        </Modal>
      </div>
    </div>
  );
}

function StructureTreemap({ data }: { data: any }) {
  const navigate = useNavigate();
  
  const Block = ({ item }: any) => (
    <div 
      title={`${item.name} • ${item.percentage.toFixed(1)}%`} 
      onClick={() => navigate(`/hfb/${item.id}`)}
      className="skapa-accent cursor-pointer rounded-lg p-4 text-center min-w-[80px] min-h-[64px] flex items-center justify-center transition-all hover:scale-105"
      style={{ flex: item.percentage }}
    >
      <span className="font-medium text-sm">{item.name}</span>
    </div>
  );
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Market hall ({Math.round(data.marketHall.totalPct)}%)
        </h3>
        <div className="skapa-card bg-muted/20 p-4">
          <div className="flex gap-2 flex-wrap">
            {data.marketHall.items.map((i: any) => <Block key={i.id} item={i} />)}
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Showroom ({Math.round(data.showroom.totalPct)}%)
        </h3>
        <div className="skapa-card bg-muted/20 p-4">
          <div className="flex gap-2 flex-wrap">
            {data.showroom.items.map((i: any) => <Block key={i.id} item={i} />)}
          </div>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Revit Sheets</h3>
        <div className="flex gap-3">
          {!connected && (
            <button onClick={connect} className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors">
              Connect Autodesk
            </button>
          )}
          <button onClick={()=>setPickerOpen(true)} className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors">
            Pick from ACC
          </button>
          <button onClick={runDA} disabled={busy} className="skapa-primary px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
            {busy ? "Enqueuing…" : "Export sheets (DA)"}
          </button>
        </div>
      </div>

      <div className="skapa-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Number</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-center py-3 px-4">PDF</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map(s => (
                <tr key={s.id} className="border-b last:border-b-0">
                  <td className="py-3 px-4">{s.number}</td>
                  <td className="py-3 px-4">{s.name}</td>
                  <td className="py-3 px-4 text-center">
                    {s.pdf_url ? (
                      <button onClick={()=>onOpen(s.pdf_url)} className="skapa-primary px-3 py-1 rounded text-sm">
                        Open
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <h4 className="font-semibold mb-2">Recent DA jobs</h4>
        {jobs.length === 0 && <div>No jobs yet.</div>}
        {jobs.map(j => (
          <div key={j.id} className="flex gap-3 mb-1">
            <span>{new Date(j.created_at).toLocaleString()}</span>
            <span>• {j.task}</span>
            <span>• <strong>{j.status}</strong></span>
            {j.workitem_id && <span>• {j.workitem_id}</span>}
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
    </div>
  );
}

function ContactCard({ contact }: { contact: any }) {
  if (!contact) return (
    <div className="skapa-card text-center py-8">
      <div className="text-muted-foreground">No contact on file yet.</div>
    </div>
  );
  
  return (
    <div className="skapa-card">
      <h3 className="text-lg font-semibold mb-3">{contact.name}</h3>
      <div className="text-muted-foreground mb-4">{contact.role || "Country superuser"}</div>
      <div className="space-y-2">
        <div>
          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
            {contact.email}
          </a>
        </div>
        {contact.phone && (
          <div className="text-muted-foreground">
            {contact.phone}
          </div>
        )}
      </div>
    </div>
  );
}