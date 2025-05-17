
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

const Settings = () => {
  const { userId, orgId, user, refreshOrgId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [directOrgId, setDirectOrgId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Force refresh org data directly from database
  useEffect(() => {
    const fetchDirectOrgData = async () => {
      if (userId) {
        try {
          console.log("Directly fetching default org for user:", userId);
          const { data, error } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', userId)
            .eq('is_default', true)
            .limit(1)
            .maybeSingle();
            
          if (error) {
            console.error("Error directly fetching org ID:", error);
            toast.error(`Error fetching organization: ${error.message}`);
          } else if (data?.org_id) {
            console.log("Found direct org ID:", data.org_id);
            setDirectOrgId(data.org_id);
          } else {
            console.warn("No default org found in direct query");
            
            // Try without the is_default filter as fallback
            const { data: anyOrgData, error: anyOrgError } = await supabase
              .from('org_members')
              .select('org_id')
              .eq('user_id', userId)
              .limit(1)
              .maybeSingle();
              
            if (!anyOrgError && anyOrgData?.org_id) {
              console.log("Found any org ID as fallback:", anyOrgData.org_id);
              setDirectOrgId(anyOrgData.org_id);
            }
          }
        } catch (err) {
          console.error("Error in direct org fetch:", err);
        }
      }
    };
    
    fetchDirectOrgData();
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshOrgId();
      toast.success("Organization data refreshed");
    } catch (error) {
      toast.error("Failed to refresh organization data");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-muted-foreground">Loading organization data...</span>
        </div>
      )}

      {!orgId && userId && !directOrgId && !loading && (
        <Alert className="mb-6" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Organization ID Missing</AlertTitle>
          <AlertDescription>
            Your user account doesn't have a default organization assigned. This might affect some features.
          </AlertDescription>
        </Alert>
      )}

      {((directOrgId) && !orgId) && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Organization ID Found in Database</AlertTitle>
          <AlertDescription>
            A default organization was found in the database ({directOrgId}), but it's not loaded in the current session. 
            Use the 'Refresh Data' button above to reload your organization data.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View your account's unique identifiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                value={user?.user_metadata?.name || user?.user_metadata?.full_name || 'Not available'} 
                readOnly 
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">Your full name</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input 
                id="userId" 
                value={userId || 'Not available'} 
                readOnly 
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">Your unique user identifier</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orgId">Organization ID (Session)</Label>
              <div className="flex gap-2">
                <Input 
                  id="orgId" 
                  value={orgId || 'Not available'} 
                  readOnly 
                  className={`font-mono bg-muted flex-1 ${!orgId ? "text-red-500" : ""}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">Your organization's unique identifier from current session</p>
            </div>
            
            {directOrgId && !orgId && (
              <div className="space-y-2">
                <Label htmlFor="directOrgId">Organization ID (Database)</Label>
                <Input 
                  id="directOrgId" 
                  value={directOrgId} 
                  readOnly 
                  className="font-mono bg-muted border-yellow-500"
                />
                <p className="text-xs text-yellow-500">This org ID was found directly in the database but is not loaded in your session</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={user?.email || 'Not available'} 
                readOnly 
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">Your email address</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
