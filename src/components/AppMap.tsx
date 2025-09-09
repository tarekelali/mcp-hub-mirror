import React from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fetchAllProjectsByCountry } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

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
    
    // Fetch Mapbox token securely and initialize map
    const initializeMap = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        
        if (error || !data?.token) {
          console.error('Failed to fetch Mapbox token:', error);
          return;
        }
        
        // Set Mapbox token
        (mapboxgl as any).accessToken = data.token;
        
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

      map.on("click", "country-dots", async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p: any = f.properties;
        const [lng, lat] = (f.geometry as any).coordinates;
        
        // Create popup with loading state
        const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '300px' })
          .setLngLat([lng, lat])
          .setHTML(`
            <div style="font-weight:700; margin-bottom: 8px;">${p.name} (${p.code})</div>
            <div style="font-size:12px; margin-bottom: 12px;">Total ${p.total} • Published ${p.published} • Unpublished ${p.unpublished}</div>
            <div style="font-size:12px;">Loading projects...</div>
          `)
          .addTo(map);

        try {
          // Fetch all projects for this country
          const { projects } = await fetchAllProjectsByCountry(p.code);
          
          // Update popup with project list
          const maxDisplay = 8;
          const hasMore = projects.length > maxDisplay;
          const displayProjects = projects.slice(0, maxDisplay);
          
          const projectList = displayProjects.map(project => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
              <div style="flex: 1;">
                <div style="font-weight: 500; font-size: 13px;">${project.name_raw}</div>
                <div style="font-size: 11px; color: #666;">
                  ${project.city ? '📍 ' + project.city : ''}
                  ${project.unit_code ? '🏢 ' + project.unit_code : ''}
                </div>
              </div>
              <button class="project-open-btn" data-project-id="${project.project_id}" style="margin-left: 8px; padding: 4px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #0058A3; background: white; color: #0058A3; cursor: pointer;">View</button>
            </div>
          `).join('');
          
          popup.setHTML(`
            <div style="font-weight:700; margin-bottom: 8px;">${p.name} (${p.code})</div>
            <div style="font-size:12px; margin-bottom: 12px;">Total ${p.total} projects</div>
            <div style="max-height: 240px; overflow-y: auto;">
              ${projectList}
              ${hasMore ? `<div style="padding: 8px 0; text-align: center;"><button id="view-all-${p.code}" style="font-size: 11px; color: #0058A3; background: none; border: none; cursor: pointer; text-decoration: underline;">View all ${projects.length} projects</button></div>` : ''}
            </div>
          `);
          
          // Add click handlers for project buttons
          setTimeout(() => {
            const popup_element = popup.getElement();
            if (popup_element) {
              // Handle individual project open buttons
              popup_element.querySelectorAll('.project-open-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const projectId = (e.target as HTMLElement).getAttribute('data-project-id');
                  if (projectId) {
                    window.open(`https://construction.autodesk.com/projects/${projectId}`, '_blank');
                  }
                });
              });
              
              // Handle "View all" button
              const viewAllBtn = popup_element.querySelector(`#view-all-${p.code}`);
              if (viewAllBtn) {
                viewAllBtn.addEventListener('click', () => onCountryClick(p.code));
              }
            }
          }, 0);
          
        } catch (error) {
          console.error('Error loading projects:', error);
          popup.setHTML(`
            <div style="font-weight:700; margin-bottom: 8px;">${p.name} (${p.code})</div>
            <div style="font-size:12px; margin-bottom: 12px;">Total ${p.total} projects</div>
            <div style="color: red; font-size: 12px;">Error loading projects</div>
            <button id="fallback-${p.code}" style="margin-top:8px;padding:6px 10px;border-radius:8px;border:1px solid #0058A3;background:#0058A3;color:#fff;cursor:pointer">View Projects</button>
          `);
          
          setTimeout(() => {
            const btn = document.getElementById(`fallback-${p.code}`);
            if (btn) btn.onclick = () => onCountryClick(p.code);
          }, 0);
        }
      });

        map.on("mouseenter", "country-dots", () => map.getCanvas().style.cursor = "pointer");
        map.on("mouseleave", "country-dots", () => map.getCanvas().style.cursor = "");
      });

        return () => map.remove();
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    initializeMap();
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