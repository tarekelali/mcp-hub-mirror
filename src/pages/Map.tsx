import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { AppMap } from "../components/AppMap";
import { useNavigate } from "react-router-dom";
import { getCountries } from "../lib/api";

export default function Map() {
  const [countries, setCountries] = React.useState<Array<{
    code: string;
    name: string;
    total: number;
    published: number;
    unpublished: number;
    centroid?: { lat: number; lng: number };
  }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    async function fetchCountries() {
      try {
        setLoading(true);
        const data = await getCountries();
        setCountries(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load countries:", err);
        setError("Failed to load country data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchCountries();
  }, []);

  const handleCountryClick = (countryCode: string) => {
    navigate(`/projects?country=${countryCode}`);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center">Loading map data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalProjects = countries.reduce((sum, country) => sum + country.total, 0);
  const totalPublished = countries.reduce((sum, country) => sum + country.published, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Global Project Map</h1>
        <p className="text-muted-foreground">
          {totalProjects.toLocaleString()} projects across {countries.length} countries
          ({totalPublished.toLocaleString()} published)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Map</CardTitle>
          <CardDescription>
            Click on a country to view its projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppMap 
            countries={countries}
            onCountryClick={handleCountryClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}