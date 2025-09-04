import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppMap } from "@/components/AppMap";
import { SegmentedControl } from "../../packages/ui/src/SegmentedControl";
import { APSStatusWidget } from "@/components/APSStatusWidget";
import { getCountries, fetchAllProjects, getAllCmps, Project } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Country = {
  code: string;
  name: string;
  total: number;
  published: number;
  unpublished: number;
  centroid?: { lat: number; lng: number } | null;
};

// Using Project type from API instead of CMP

export default function Explore() {
  const [view, setView] = useState<string>("Map");
  const [countries, setCountries] = useState<Country[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [groupedProjects, setGroupedProjects] = useState<Record<string, Project[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCountries, setOpenCountries] = useState<Record<string, boolean>>({});
  const [usingFallback, setUsingFallback] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      const grouped = projects.reduce((acc, project) => {
        const key = project.country_code || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(project);
        return acc;
      }, {} as Record<string, Project[]>);
      setGroupedProjects(grouped);
    }
  }, [projects]);

  const computeCountriesFromProjects = (projects: Project[]) => {
    // Get known centroids from CMPs data if available
    const knownCentroids: Record<string, { lat: number; lng: number }> = {};
    
    // Group projects by country
    const countryGroups = projects.reduce((acc, project) => {
      const countryCode = project.country_code || 'unknown';
      if (!acc[countryCode]) {
        acc[countryCode] = {
          code: countryCode,
          name: project.country_name || countryCode,
          projects: []
        };
      }
      acc[countryCode].projects.push(project);
      return acc;
    }, {} as Record<string, { code: string; name: string; projects: Project[] }>);

    // Convert to Country format
    return Object.values(countryGroups).map(group => ({
      code: group.code,
      name: group.name,
      total: group.projects.length,
      published: group.projects.filter(p => (p.parse_confidence || 0) >= 0.7).length,
      unpublished: group.projects.filter(p => (p.parse_confidence || 0) < 0.7).length,
      centroid: knownCentroids[group.code] || null
    }));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setUsingFallback(false);
      
      // Try to get countries from materialized view first
      try {
        const [countriesData, projectsData] = await Promise.all([
          getCountries(),
          fetchAllProjects()
        ]);
        setCountries(countriesData);
        setProjects(projectsData);
        return;
      } catch (countriesError) {
        console.log("Countries API failed, checking if it's mv_unavailable...", countriesError);
        
        // Check if it's specifically the mv_unavailable error
        const errorMessage = countriesError instanceof Error ? countriesError.message : String(countriesError);
        if (errorMessage.includes('mv_unavailable') || errorMessage.includes('503')) {
          console.log("Materialized view unavailable, falling back to live computation...");
          setUsingFallback(true);
          
          // Fallback: get projects and optionally CMPs, compute countries locally
          const [projectsData, cmpsData] = await Promise.all([
            fetchAllProjects(),
            getAllCmps().catch(() => []) // Optional - don't fail if CMPs aren't available
          ]);
          
          // Add centroid data from CMPs to improve map display
          const centroidMap: Record<string, { lat: number; lng: number }> = {};
          cmpsData.forEach(cmp => {
            if (cmp.centroid && cmp.country_code) {
              centroidMap[cmp.country_code] = cmp.centroid;
            }
          });
          
          // Compute countries from projects
          const computedCountries = computeCountriesFromProjects(projectsData).map(country => ({
            ...country,
            centroid: centroidMap[country.code] || country.centroid
          }));
          
          setCountries(computedCountries);
          setProjects(projectsData);
          return;
        }
        
        // Re-throw if it's not the expected error
        throw countriesError;
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCountryClick = (code: string) => {
    navigate(`/projects?country=${code}`);
  };

  const toggleCountry = (code: string) => {
    setOpenCountries(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-center mb-4">
          <APSStatusWidget onDataRefreshed={loadData} />
        </div>
        
        {usingFallback && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Using live project counts (catalog rebuilding). Run <strong>Refresh Data</strong> to persist country catalog.
            </AlertDescription>
          </Alert>
        )}
        
        <h1 className="text-3xl font-bold mb-2">CMP Explorer</h1>
        <p className="text-muted-foreground mb-4">
          Explore {projects.length} projects across {countries.length} countries
        </p>
        
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "Map", label: "Map" },
            { value: "List", label: "List" }
          ]}
        />
      </div>

      {view === "Map" ? (
        <Card>
          <CardContent className="p-6">
            <AppMap 
              countries={countries} 
              onCountryClick={handleCountryClick}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {countries
            .filter(country => groupedProjects[country.code]?.length > 0)
            .sort((a, b) => b.total - a.total)
            .map(country => {
              const countryProjects = groupedProjects[country.code] || [];
              const isOpen = openCountries[country.code] || false;
              
              return (
                <Card key={country.code}>
                  <Collapsible 
                    open={isOpen} 
                    onOpenChange={() => toggleCountry(country.code)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg">
                              {country.name} ({country.code})
                            </CardTitle>
                            <Badge variant="secondary">
                              {countryProjects.length} project{countryProjects.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {countryProjects.length} total projects
                            </Badge>
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid gap-2">
                          {countryProjects
                            .sort((a, b) => a.name_raw.localeCompare(b.name_raw))
                            .map(project => (
                              <div 
                                key={project.project_id}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="font-medium">{project.name_raw}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {project.city && <span>📍 {project.city}</span>}
                                      {project.unit_code && <span className="ml-2">🏢 {project.unit_code}</span>}
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.open(`https://construction.autodesk.com/projects/${project.project_id}`, '_blank')}
                                >
                                  View Project
                                </Button>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}