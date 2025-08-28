import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listDS } from "../lib/ds";

export default function HfbPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = React.useState<any[]>([]);

  React.useEffect(() => { 
    (async () => {
      try {
        setItems((await listDS(id)).items);
      } catch (error) {
        console.error("Failed to load detailed solutions:", error);
      }
    })(); 
  }, [id]);

  const Block = ({ item }: any) => (
    <div 
      onClick={() => navigate(`/ds/${item.id}`)} 
      title={`${item.code} • ${item.pct}%`} 
      style={{
        flex: item.pct, 
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
      {item.code}
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <h1>Detailed solutions</h1>
      <div style={{ 
        display: "flex", 
        gap: 8, 
        flexWrap: "wrap", 
        background: "#f8f8f8", 
        padding: 8, 
        borderRadius: 12 
      }}>
        {items.map(i => <Block key={i.id} item={i} />)}
      </div>
    </div>
  );
}