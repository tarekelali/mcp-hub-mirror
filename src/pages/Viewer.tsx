import React from "react";
import { useSearchParams } from "react-router-dom";
import { ForgeViewer } from "../components/ForgeViewer";

export default function Viewer() {
  const [searchParams] = useSearchParams();
  const urn = searchParams.get("urn");
  const token = searchParams.get("token");

  React.useEffect(() => {
    if (token) {
      // Store the viewer token temporarily for the ForgeViewer component
      sessionStorage.setItem("viewer_token", token);
    }
  }, [token]);

  if (!urn) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Viewer</h1>
        <p>No URN provided. Please provide a valid model URN in the URL parameters.</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #e0e0e0" }}>
        <h1 style={{ margin: 0, fontSize: "1.2em" }}>Model Viewer</h1>
        <p style={{ margin: "4px 0 0 0", fontSize: "0.9em", color: "#666" }}>
          URN: {urn.substring(0, 30)}...
        </p>
      </div>
      <div style={{ flex: 1 }}>
        <ForgeViewer urn={urn} />
      </div>
    </div>
  );
}