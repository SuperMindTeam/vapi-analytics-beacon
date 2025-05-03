
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  isDefault: boolean;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: Error | null;
  refreshOrganizations: () => Promise<void>;
  setCurrentOrganization: (orgId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use the RPC function to get the user's organizations
      const { data: orgMembers, error: membersError } = await supabase
        .rpc('get_user_org_memberships', { user_id_param: user.id });
      
      if (membersError) {
        throw membersError;
      }
      
      if (!orgMembers || orgMembers.length === 0) {
        setOrganizations([]);
        setCurrentOrganization(null);
        setLoading(false);
        return;
      }
      
      // Get the full organization details
      const orgIds = orgMembers.map(member => member.org_id);
      
      const { data: orgs, error: orgsError } = await supabase
        .from('orgs')
        .select('*')
        .in('id', orgIds);
        
      if (orgsError) {
        throw orgsError;
      }
      
      if (!orgs || orgs.length === 0) {
        setOrganizations([]);
        setCurrentOrganization(null);
        setLoading(false);
        return;
      }
      
      // Combine org data with membership data
      const formattedOrgs = orgs.map(org => {
        const membership = orgMembers.find(member => member.org_id === org.id);
        return {
          id: org.id,
          name: org.name,
          isDefault: membership?.is_default || false
        };
      });
      
      setOrganizations(formattedOrgs);
      
      // Set current organization to the default one or the first one
      const defaultOrg = formattedOrgs.find(org => org.isDefault) || formattedOrgs[0];
      setCurrentOrganization(defaultOrg);
      
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
      setError(error instanceof Error ? error : new Error("Failed to fetch organizations"));
      toast.error("Failed to load your organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [user]);

  const handleSetCurrentOrganization = (orgId: string) => {
    const org = organizations.find(org => org.id === orgId);
    if (org) {
      setCurrentOrganization(org);
    }
  };

  return (
    <OrganizationContext.Provider 
      value={{ 
        organizations, 
        currentOrganization, 
        loading, 
        error,
        refreshOrganizations: fetchOrganizations,
        setCurrentOrganization: handleSetCurrentOrganization
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
