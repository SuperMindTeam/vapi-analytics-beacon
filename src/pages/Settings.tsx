
import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const Settings = () => {
  const { userId, orgId, user } = useAuth();
  
  useEffect(() => {
    const checkUserOrg = async () => {
      if (userId) {
        console.log("Settings page - checking user organization for:", userId);
        try {
          const { data, error } = await supabase
            .from('org_members')
            .select('org_id, is_default')
            .eq('user_id', userId);
          
          if (error) {
            console.error("Error fetching organization data:", error);
            toast.error(`Error checking organization membership: ${error.message}`);
          } else {
            console.log("Organization memberships found:", data);
            if (data.length === 0 && userId) {
              toast.error("No organization membership found for your account");
            }
          }
        } catch (err) {
          console.error("Error in org check:", err);
          toast.error(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    };
    
    checkUserOrg();
  }, [userId]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {!orgId && userId && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Organization ID Missing</AlertTitle>
          <AlertDescription>
            Your user account doesn't have a default organization assigned. This might affect some features.
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
              <Label htmlFor="orgId">Organization ID</Label>
              <Input 
                id="orgId" 
                value={orgId || 'Not available'} 
                readOnly 
                className="font-mono bg-muted"
              />
              <p className="text-xs text-muted-foreground">Your organization's unique identifier</p>
            </div>
            
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
