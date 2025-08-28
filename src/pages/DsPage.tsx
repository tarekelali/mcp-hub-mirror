import React from "react";
import { useParams } from "react-router-dom";
import { Theatre } from "../components/Theatre";
import { getTheatre } from "../lib/ds";

export default function DsPage() {
  const { id = "" } = useParams();
  
  return (
    <div style={{ padding: 24 }}>
      <h1>Detailed Solution</h1>
      <Theatre dsId={id} fetcher={getTheatre} />
    </div>
  );
}