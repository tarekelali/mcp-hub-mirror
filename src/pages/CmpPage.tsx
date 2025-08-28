import React from "react";
import { useParams } from "react-router-dom";
import { Tabs } from "../../packages/ui/src/Tabs";
import { Modal } from "../../packages/ui/src/Modal";
import { getCmpOverview, getCmpSheets, getCmpContact } from "../lib/cmp";

export default function CmpPage() {
  const { id = "" } = useParams();
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
        {tab === "review" && <ReviewTable sheets={sheets} onOpen={(url) => setOpenPdf(url)} />}
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
  // super-minimal "puzzle" as stacked rows sized by percentage
  const Block = ({ item }: any) => (
    <div 
      title={`${item.name} • ${item.percentage.toFixed(1)}%`} 
      style={{
        flex: item.percentage, 
        minWidth: 40, 
        minHeight: 48, 
        display: "grid", 
        placeItems: "center",
        background: "#FFDB00", 
        color: "#111", 
        border: "1px solid #fff", 
        borderRadius: 8
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

function ReviewTable({ sheets, onOpen }: { sheets: any[]; onOpen: (url: string) => void }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th align="left">Number</th>
          <th align="left">Name</th>
          <th>PDF</th>
        </tr>
      </thead>
      <tbody>
        {sheets.map(s => (
          <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
            <td>{s.number}</td>
            <td>{s.name}</td>
            <td align="center">
              {s.pdf_url ? (
                <button 
                  onClick={() => onOpen(s.pdf_url)} 
                  style={{ 
                    padding: "6px 10px", 
                    borderRadius: 8, 
                    border: "1px solid #0058A3", 
                    background: "#0058A3", 
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Open
                </button>
              ) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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