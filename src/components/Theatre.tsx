import React from "react";
import { Tabs } from "../../packages/ui/src/Tabs";
import { ForgeViewer } from "./ForgeViewer";

export function Theatre({ 
  dsId, 
  fetcher 
}: { 
  dsId: string; 
  fetcher: (id: string) => Promise<any>;
}) {
  const [tab, setTab] = React.useState<"current" | "crs" | "country" | "similar">("current");
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => { 
    (async () => {
      try {
        setData(await fetcher(dsId));
      } catch (error) {
        console.error("Failed to load theatre data:", error);
      }
    })(); 
  }, [dsId, fetcher]);
  
  const urn = data?.viewer?.[tab] || "";

  return (
    <div>
      <Tabs
        value={tab}
        onChange={(v) => setTab(v as any)}
        tabs={[
          { id: "current", label: "Current" },
          { id: "crs", label: "CRS" },
          { id: "country", label: "Country" },
          { id: "similar", label: "Similar" },
        ]}
      />
      <div style={{ marginTop: 12 }}>
        <ForgeViewer urn={urn} />
      </div>
    </div>
  );
}