import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getHfbDetailedSolutions } from "../lib/api";

export default function HfbPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = React.useState<any[]>([]);

  React.useEffect(() => { 
    (async () => {
      try {
        setItems((await getHfbDetailedSolutions(id)).items);
      } catch (error) {
        console.error("Failed to load detailed solutions:", error);
      }
    })(); 
  }, [id]);

  const Block = ({ item }: any) => (
    <div 
      onClick={() => navigate(`/ds/${item.id}`)} 
      title={`${item.code} • ${item.pct}%`} 
      className="skapa-accent cursor-pointer rounded-lg p-4 text-center min-w-[80px] min-h-[64px] flex items-center justify-center transition-all hover:scale-105"
      style={{ flex: item.pct }}
    >
      <span className="font-medium text-sm">{item.code}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Detailed Solutions</h1>
        <div className="skapa-card">
          <div className="flex gap-2 flex-wrap">
            {items.map(i => <Block key={i.id} item={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}