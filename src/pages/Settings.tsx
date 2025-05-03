
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Loader2 } from "lucide-react";

interface OrgMembership {
  org_id: string;
  is_default: boolean;
  role?: string;
}

const Settings = () => {
  const { userId, orgId, user } = useAuth();
  const [orgMemberships, setOrgMemberships] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const [directOrgId, setDirectOrgId] = useState<string | null>(null);
  
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
          } else if (data) {
            console.log("Found direct org ID:", data.org_id);
            setDirectOrgId(data.org_id);
          }
        } catch (err) {
          console.error("Error in direct org fetch:", err);
        }
      }
    };
    
    fetchDirectOrgData();
  }, [userId]);
  
  useEffect(() => {
    const checkUserOrg = async () => {
      if (userId) {
        console.log("Settings page - checking user organization for:", userId);
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('org_members')
            .select('org_id, is_default, role')
            .eq('user_id', userId);
          
          if (error) {
            console.error("Error fetching organization data:", error);
            toast.error(`Error checking organization membership: ${error.message}`);
          } else {
            console.log("Organization memberships found:", data);
            setOrgMemberships(data || []);
            if (data?.length === 0 && userId) {
              toast.error("No organization membership found for your account");
            }
          }
        } catch (err) {
          console.error("Error in org check:", err);
          toast.error(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
          setLoading(false);
        }
      }
    };
    
    checkUserOrg();
  }, [userId]);

  // Find default org from memberships
  const defaultOrg = orgMemberships.find(membership => membership.is_default);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
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

      {((defaultOrg || directOrgId) && !orgId) && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Organization ID Found in Database</AlertTitle>
          <AlertDescription>
            A default organization was found in the database ({directOrgId || defaultOrg?.org_id}), but it's not loaded in the current session. Try refreshing the page or signing out and back in.
          </AlertDescription>
        </Alert>
      )}

      {orgMemberships.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Organization Memberships</CardTitle>
            <CardDescription>Your organization memberships</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orgMemberships.map((membership, index) => (
                <div key={index} className="p-4 border rounded-md bg-muted/50">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Organization ID</Label>
                      <div className="font-mono text-sm">{membership.org_id}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Default</Label>
                      <div>{membership.is_default ? 'Yes' : 'No'}</div>
                    </div>
                    {membership.role && (
                      <div>
                        <Label className="text-xs">Role</Label>
                        <div className="capitalize">{membership.role}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View your account's unique identifiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Input 
                id="orgId" 
                value={orgId || 'Not available'} 
                readOnly 
                className="font-mono bg-muted"
              />
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
