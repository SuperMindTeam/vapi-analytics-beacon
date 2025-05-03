
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simple initialization for context, without org fetching
    const initialize = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }
        
        // Just finish loading
        setLoading(false);
      } catch (error) {
        console.error("Error in OrganizationContext:", error);
        setError(error instanceof Error ? error : new Error("Unknown error"));
        setLoading(false);
      }
    };

    initialize();
  }, [user]);

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
