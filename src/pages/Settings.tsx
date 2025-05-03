
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const Settings = () => {
  const { userId, orgId } = useAuth();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
