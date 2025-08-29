import React from "react";
import { useNavigate } from "react-router-dom";
import { SegmentedControl } from "../../packages/ui/src/SegmentedControl";
import { AppList } from "../components/AppList";
import { AppMap } from "../components/AppMap";
import { CountryDrawer } from "../components/CountryDrawer";
import { getCountries, getCountryCmps } from "../lib/api";

export default function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<"map" | "list">("list");
  const [countries, setCountries] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [drawer, setDrawer] = React.useState<{open:boolean; country:{code:string;name?:string}|null; cmps:any[]}>({open:false, country:null, cmps:[]});

  React.useEffect(() => {
    (async () => {
      try { 
        setCountries(await getCountries()); 
      } catch (error) {
        console.error("Failed to load countries:", error);
      } finally { 
        setLoading(false); 
      }
    })();
  }, []);

  const openCountry = async (code: string) => {
    try {
      const res = await getCountryCmps(code);
      setDrawer({ open:true, country:{ code, name:res.country }, cmps: res.cmps });
    } catch (error) {
      console.error("Failed to load CMPs:", error);
      alert("Failed to load CMPs");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>MCP Hub — Global Overview</h1>
      <SegmentedControl
        value={mode}
        options={[
          { value: "map", label: "Map" }, 
          { value: "list", label: "List" }
        ]}
        onChange={(v) => setMode(v as any)}
      />
      <div style={{ marginTop: 16 }}>
        {loading && <div>Loading…</div>}
        {!loading && mode === "list" && (
          <AppList countries={countries} onOpen={openCountry} />
        )}
        {!loading && mode === "map" && (
          <AppMap
            countries={countries}
            onCountryClick={openCountry}
          />
        )}
      </div>

      <CountryDrawer
        open={drawer.open}
        onClose={()=>setDrawer(d => ({...d, open:false}))}
        country={drawer.country}
        cmps={drawer.cmps}
        onOpenCmp={(id)=>navigate(`/cmp/${id}`)}
      />
    </div>
  );
}
