import React from "react";
import { getViewerToken } from "../../packages/aps-clients/src/viewer";

declare global { 
  interface Window { 
    Autodesk?: any;
  } 
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; 
    s.onload = () => resolve(); 
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadCss(href: string) {
  const l = document.createElement("link");
  l.rel = "stylesheet"; 
  l.href = href;
  document.head.appendChild(l);
}

export function ForgeViewer({ urn }: { urn: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let viewer: any;
    
    (async () => {
      if (!urn || !ref.current) return;
      
      try {
        // Load viewer assets once
        if (!window.Autodesk) {
          console.log("Loading Autodesk Viewer assets");
          loadCss("https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css");
          await loadScript("https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js");
        }
        
        console.log("Getting viewer token");
        // Check if token is provided via sessionStorage (from viewer page)
        const storedToken = sessionStorage.getItem("viewer_token");
        let tokenResp;
        
        if (storedToken) {
          tokenResp = { access_token: storedToken };
          sessionStorage.removeItem("viewer_token"); // Clean up after use
        } else {
          tokenResp = await getViewerToken(); // calls your /api-viewer-sign
        }
        
        const options = {
          env: "AutodeskProduction2",
          accessToken: tokenResp.access_token,
        };
        
        console.log("Initializing Autodesk Viewer");
        window.Autodesk.Viewing.Initializer(options, () => {
          viewer = new window.Autodesk.Viewing.GuiViewer3D(ref.current);
          viewer.start();
          
          console.log(`Loading document with URN: ${urn}`);
          window.Autodesk.Viewing.Document.load(
            `urn:${urn}`,
            (doc: any) => {
              console.log("Document loaded successfully");
              const defaultModel = doc.getRoot().getDefaultGeometry();
              viewer.loadDocumentNode(doc, defaultModel);
            },
            (err: any) => {
              console.error("Document load error:", err);
            }
          );
        });
      } catch (error) {
        console.error("Error initializing viewer:", error);
      }
    })();
    
    return () => { 
      try { 
        viewer?.finish(); 
      } catch (error) {
        console.warn("Error cleaning up viewer:", error);
      }
    };
  }, [urn]);

  if (!urn) {
    return (
      <div style={{ 
        padding: 12, 
        opacity: 0.7, 
        textAlign: "center",
        height: "70vh",
        display: "grid",
        placeItems: "center",
        background: "#f6f6f6",
        borderRadius: 12
      }}>
        No model available.
      </div>
    );
  }
  
  return (
    <div 
      ref={ref} 
      style={{ 
        height: "100%", 
        width: "100%", 
        background: "#f6f6f6"
      }}
    />
  );
}