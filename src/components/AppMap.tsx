import React from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type C = { 
  code: string; 
  name: string; 
  total: number; 
  published: number; 
  unpublished: number; 
  centroid?: { lat: number; lng: number } | null;
};

export function AppMap({ 
  countries, 
  onCountryClick 
}: { 
  countries: C[]; 
  onCountryClick: (code: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);

  React.useEffect(() => {
    if (!ref.current || mapRef.current) return;
    
    // Set Mapbox token from environment
    (mapboxgl as any).accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [12, 20],
      zoom: 1.2,
      attributionControl: false,
    });
    
    mapRef.current = map;

    map.on("load", () => {
      const features = countries
        .filter(c => c.centroid && typeof c.centroid.lat === "number" && typeof c.centroid.lng === "number")
        .map(c => ({
          type: "Feature",
          properties: { 
            code: c.code, 
            name: c.name, 
            total: c.total, 
            published: c.published, 
            unpublished: c.unpublished 
          },
          geometry: { 
            type: "Point", 
            coordinates: [c.centroid!.lng, c.centroid!.lat] 
          }
        }));
        
      map.addSource("countries", { 
        type: "geojson", 
        data: { type: "FeatureCollection", features } as any 
      });

      map.addLayer({
        id: "country-dots",
        type: "circle",
        source: "countries",
        paint: {
          // IKEA blue
          "circle-color": "#0058A3",
          "circle-radius": [
            "interpolate", ["linear"], ["get", "total"],
            0, 4, 10, 6, 50, 8, 100, 10, 400, 12
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#FFFFFF"
        }
      });

      map.on("click", "country-dots", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p: any = f.properties;
        const [lng, lat] = (f.geometry as any).coordinates;
        
        new mapboxgl.Popup({ closeButton: true })
          .setLngLat([lng, lat])
          .setHTML(`
            <div style="font-weight:700">${p.name} (${p.code})</div>
            <div style="font-size:12px">Total ${p.total} • High Conf ${p.published} • Low Conf ${p.unpublished}</div>
            <button id="open-${p.code}" style="margin-top:8px;padding:6px 10px;border-radius:8px;border:1px solid #0058A3;background:#0058A3;color:#fff;cursor:pointer">View Projects</button>
          `)
          .addTo(map);

        // attach once the popup is in DOM
        setTimeout(() => {
          const btn = document.getElementById(`open-${p.code}`);
          if (btn) btn.onclick = () => onCountryClick(p.code);
        }, 0);
      });

      map.on("mouseenter", "country-dots", () => map.getCanvas().style.cursor = "pointer");
      map.on("mouseleave", "country-dots", () => map.getCanvas().style.cursor = "");
    });

    return () => map.remove();
  }, [countries]);

  return (
    <div 
      ref={ref} 
      style={{ 
        height: 480, 
        borderRadius: 12, 
        overflow: "hidden" 
      }} 
    />
  );
}