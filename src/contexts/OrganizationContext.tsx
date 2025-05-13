
import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Simplified context without organization logic
interface OrganizationContextType {
  loading: boolean;
  error: Error | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, orgId } = useAuth(); // Access the userId and orgId from AuthContext
  const [loading, setLoading] = useState(false); // Changed to false since we're not fetching anything
  const [error, setError] = useState<Error | null>(null);

  // No need to fetch org information since we already have it from AuthContext
  // This component is now mostly a placeholder that could be extended later if needed

  return (
    <OrganizationContext.Provider 
      value={{ 
        loading, 
        error
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
