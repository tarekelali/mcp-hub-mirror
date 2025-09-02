import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppMap } from "@/components/AppMap";
import { SegmentedControl } from "../../packages/ui/src/SegmentedControl";
import { getCountries, getAllCmps } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

type Country = {
  code: string;
  name: string;
  total: number;
  published: number;
  unpublished: number;
  centroid?: { lat: number; lng: number } | null;
};

type CMP = {
  id: string;
  name: string;
  country_code: string;
  country_name: string;
  published: boolean;
  centroid: { lat: number; lng: number } | null;
};

export default function Explore() {
  const [view, setView] = useState<string>("Map");
  const [countries, setCountries] = useState<Country[]>([]);
  const [cmps, setCmps] = useState<CMP[]>([]);
  const [groupedCmps, setGroupedCmps] = useState<Record<string, CMP[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCountries, setOpenCountries] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (cmps.length > 0) {
      const grouped = cmps.reduce((acc, cmp) => {
        const key = cmp.country_code;
        if (!acc[key]) acc[key] = [];
        acc[key].push(cmp);
        return acc;
      }, {} as Record<string, CMP[]>);
      setGroupedCmps(grouped);
    }
  }, [cmps]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [countriesData, cmpsData] = await Promise.all([
        getCountries(),
        getAllCmps()
      ]);
      setCountries(countriesData);
      setCmps(cmpsData);
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
        <h1 className="text-3xl font-bold mb-2">CMP Explorer</h1>
        <p className="text-muted-foreground mb-4">
          Explore {cmps.length} CMPs across {countries.length} countries
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
            .filter(country => groupedCmps[country.code]?.length > 0)
            .sort((a, b) => b.total - a.total)
            .map(country => {
              const countryCmps = groupedCmps[country.code] || [];
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
                              {countryCmps.length} CMP{countryCmps.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600">
                              {countryCmps.filter(c => c.published).length} Published
                            </Badge>
                            <Badge variant="outline" className="text-orange-600">
                              {countryCmps.filter(c => !c.published).length} Unpublished
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
                          {countryCmps
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(cmp => (
                              <div 
                                key={cmp.id}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="font-medium">{cmp.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {cmp.published ? (
                                        <span className="text-green-600">✅ Published</span>
                                      ) : (
                                        <span className="text-orange-600">⏳ Unpublished</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => navigate(`/cmp/${cmp.id}`)}
                                >
                                  Open
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