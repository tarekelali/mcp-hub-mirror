import React from "react";
import { useParams } from "react-router-dom";
import { Theatre } from "../components/Theatre";
import { getDetailedSolution } from "../lib/api";

export default function DsPage() {
  const { id = "" } = useParams();
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Detailed Solution</h1>
        <Theatre dsId={id} fetcher={getDetailedSolution} />
      </div>
    </div>
  );
}