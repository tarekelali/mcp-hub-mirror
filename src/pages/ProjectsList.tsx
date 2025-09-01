import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, MapPin, Building2, Filter, Loader2 } from "lucide-react";
import { tokenManager } from "../lib/tokenManager";

const FNS = import.meta.env.VITE_FUNCTIONS_BASE || 
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:54321"
    : "https://kuwrhanybqhfnwvshedl.functions.supabase.co");

interface Project {
  project_id: string;
  name_raw: string;
  country_name?: string;
  country_code?: string;
  unit_code?: string;
  unit_number?: number;
  city?: string;
  parse_confidence: number;
  ingested_at: string;
}

interface ProjectsResponse {
  projects: Project[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    country?: string;
    search?: string;
  };
}

export default function ProjectsList() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [countryFilter, setCountryFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    offset: 0,
    limit: 50,
    total: 0,
    hasMore: false
  });
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchProjects = React.useCallback(async (offset = 0, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString()
      });
      
      if (countryFilter) params.set("country", countryFilter);
      if (searchQuery) params.set("q", searchQuery);

      const response = await tokenManager.retryRequest(
        `${FNS}/api-acc-projects?${params}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ProjectsResponse = await response.json();
      
      if (reset) {
        setProjects(data.projects);
      } else {
        setProjects(prev => [...prev, ...data.projects]);
      }
      
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, countryFilter, pagination.limit]);

  // Initial load
  React.useEffect(() => {
    fetchProjects(0, true);
  }, [searchQuery, countryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects(0, true);
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchProjects(pagination.offset + pagination.limit, false);
    }
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await tokenManager.retryRequest(
        `${FNS}/acc-projects-sync?triggered_by=manual`,
        { 
          method: "POST",
          credentials: "include" 
        }
      );

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Refresh result:", result);
      
      // Refresh the current view
      await fetchProjects(0, true);
      
      alert(`Refresh completed: ${result.totalProcessed} projects processed`);
    } catch (error) {
      console.error("Refresh failed:", error);
      alert("Refresh failed. Check console for details.");
    } finally {
      setRefreshing(false);
    }
  };

  const openSampleModel = async (project: Project) => {
    try {
      const response = await tokenManager.retryRequest(
        `${FNS}/aps-sample-urn?project_id=${project.project_id}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error(`Failed to get URN: ${response.status}`);
      }

      const urnData = await response.json();
      
      if (!urnData.ok || !urnData.urn) {
        alert(`No URN available for this project: ${urnData.code || 'unknown error'}`);
        return;
      }

      // Get viewer token
      const viewerResponse = await fetch(`${FNS}/api-viewer-sign/api/viewer/sign`, { method: "POST" });
      const viewerData = await viewerResponse.json();
      
      if (!viewerData.access_token) {
        alert("Failed to get viewer token");
        return;
      }

      // Open viewer in new tab
      const viewerUrl = `/viewer?urn=${encodeURIComponent(urnData.urn)}&token=${encodeURIComponent(viewerData.access_token)}`;
      window.open(viewerUrl, '_blank');

    } catch (error) {
      console.error("Failed to open model:", error);
      alert("Failed to open model viewer");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">ACC Projects</h1>
          <p className="text-muted-foreground">
            {pagination.total.toLocaleString()} projects total
          </p>
        </div>
        <Button 
          onClick={triggerRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          {refreshing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Data"
          )}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search projects by name, city, or unit code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="w-48">
              <Input
                placeholder="Country code (e.g., SE)"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value.toUpperCase())}
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
          
          {(countryFilter || searchQuery) && (
            <div className="flex gap-2 mt-4">
              {countryFilter && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Country: {countryFilter}
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Search: {searchQuery}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="grid gap-4">
        {projects.map((project) => (
          <Card key={project.project_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{project.name_raw}</h3>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {project.country_name && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {project.country_name} ({project.country_code})
                          </Badge>
                        )}
                        {project.unit_code && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            Unit: {project.unit_code}
                            {project.unit_number && ` (${project.unit_number})`}
                          </Badge>
                        )}
                        {project.city && (
                          <Badge variant="outline">
                            📍 {project.city}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Project ID: {project.project_id}</span>
                        <span>
                          Confidence: 
                          <Badge 
                            className={`ml-1 ${getConfidenceColor(project.parse_confidence)}`}
                          >
                            {Math.round(project.parse_confidence * 100)}%
                          </Badge>
                        </span>
                        <span>
                          Ingested: {new Date(project.ingested_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => openSampleModel(project)}
                        className="whitespace-nowrap"
                      >
                        Open Model
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {pagination.hasMore && (
        <div className="flex justify-center mt-6">
          <Button 
            onClick={loadMore} 
            disabled={loading}
            variant="outline"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${projects.length} of ${pagination.total})`
            )}
          </Button>
        </div>
      )}

      {!loading && projects.length === 0 && (
        <Card className="mt-6">
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No projects found</p>
              <p>Try adjusting your search criteria or refresh the data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}