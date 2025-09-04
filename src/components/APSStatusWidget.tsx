import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { BASE } from '@/lib/api';

interface APSStatus {
  connected: boolean;
  via: string;
}

interface APSStatusWidgetProps {
  onDataRefreshed?: () => void;
}

export function APSStatusWidget({ onDataRefreshed }: APSStatusWidgetProps) {
  const [status, setStatus] = useState<APSStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${BASE}/auth-aps-status`, {
        credentials: 'include'
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking APS status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const currentUrl = window.location.href;
    const connectUrl = `${BASE}/auth-aps-start?return=${encodeURIComponent(currentUrl)}`;
    window.location.href = connectUrl;
  };

  const handleRefresh = async () => {
    if (!status?.connected) {
      toast({
        title: "Authentication Required",
        description: "Please connect to Autodesk first",
        variant: "destructive"
      });
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch(`${BASE}/acc-projects-sync?triggered_by=manual`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Data Refresh Started",
          description: "Syncing projects from Autodesk. This may take a minute.",
        });
        
        // Call the refresh callback if provided
        setTimeout(() => {
          onDataRefreshed?.();
        }, 2000); // Give the backend 2 seconds to start processing
      } else {
        const error = await response.json();
        toast({
          title: "Refresh Failed",
          description: error.message || "Failed to start data refresh",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Checking connection...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status?.connected ? (
        <>
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            Connected via {status.via}
          </span>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            size="sm"
            variant="outline"
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">
            Not connected
          </span>
          <Button 
            onClick={handleConnect}
            size="sm"
          >
            Connect Autodesk
          </Button>
        </>
      )}
    </div>
  );
}