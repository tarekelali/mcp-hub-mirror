import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Map, Building2, ArrowRight, Settings, Info, AlertCircle } from "lucide-react";
import { APSStatusWidget } from "../components/APSStatusWidget";
import { DebugPanel } from "../components/DebugPanel";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { useState, useEffect } from "react";

export default function Index() {
  const navigate = useNavigate();
  const [apsConnected, setApsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Check APS connection status
    fetch("https://kuwrhanybqhfnwvshedl.functions.supabase.co/auth-aps-status", {
      credentials: 'include'
    })
    .then(res => res.json())
    .then(data => setApsConnected(data.connected))
    .catch(() => setApsConnected(false));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Geo Scope Pilot</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore global construction projects through interactive maps, detailed project listings, and comprehensive analytics.
        </p>
        
        <div className="mt-6 max-w-md mx-auto">
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-2">Autodesk Connection</h3>
            <APSStatusWidget onDataRefreshed={() => window.location.reload()} />
          </div>
        </div>
        
        {/* Guidance Banner */}
        {apsConnected === false && (
          <Alert className="mt-6 max-w-2xl mx-auto">
            <Info className="h-4 w-4" />
            <AlertTitle>Getting Started</AlertTitle>
            <AlertDescription>
              To view project data and maps, please connect to Autodesk above, then click "Refresh Data" to sync your projects.
            </AlertDescription>
          </Alert>
        )}
        
        {apsConnected === true && (
          <Alert className="mt-6 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Data Status</AlertTitle>
            <AlertDescription>
              If maps appear empty, click "Refresh Data" above to sync the latest project information from Autodesk.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/map")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Global Map
            </CardTitle>
            <CardDescription>
              Interactive world map of projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Explore projects worldwide through an interactive map interface with country-level statistics.
            </p>
            <div className="flex items-center text-sm text-blue-600">
              <ArrowRight className="w-4 h-4 mr-1" />
              View Map
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/projects")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Project Explorer
            </CardTitle>
            <CardDescription>
              Browse and search ACC projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Search and filter through the ACC project database with advanced filtering options and detailed project information.
            </p>
            <div className="flex items-center text-sm text-blue-600">
              <ArrowRight className="w-4 h-4 mr-1" />
              Explore Projects
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/_diag")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Diagnostics
            </CardTitle>
            <CardDescription>
              System health and administration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Internal diagnostics, system health monitoring, and administrative tools.
            </p>
            <div className="flex items-center text-sm text-orange-600">
              <ArrowRight className="w-4 h-4 mr-1" />
              Admin Access
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Built with modern web technologies for seamless project exploration and analysis.
        </p>
      </div>

      <div className="mt-8">
        <DebugPanel />
      </div>
    </div>
  );
}