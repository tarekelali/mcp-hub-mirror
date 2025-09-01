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

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Global Map
          </h1>
          <p className="text-muted-foreground">
            Explore IKEA projects worldwide by clicking on country dots
          </p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading countries...</div>
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
            Error: {error}
          </div>
        )}
        
        {!loading && !error && countries.length > 0 && (
          <>
            <div className="skapa-card mb-6">
              <h2 className="text-xl font-semibold mb-3">Summary</h2>
              <div className="text-foreground">
                <span className="font-bold">{countries.reduce((sum, c) => sum + c.total, 0)}</span> total projects 
                across <span className="font-bold">{countries.length}</span> countries
              </div>
            </div>
            
            <div className="bg-card rounded-lg border overflow-hidden">
              <AppMap countries={countries} onCountryClick={handleCountryClick} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}