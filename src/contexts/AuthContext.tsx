import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";

// Define the shape of our context
interface AuthContextProps {
  user: User | null;
  loading: boolean;
  userId: string | null;  // Added userId property
  orgId: string | null;   // Added orgId property
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshOrgId: () => Promise<void>; // Added refreshOrgId function
}

// Create context with default values
const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  userId: null,  // Added default value
  orgId: null,   // Added default value
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  refreshOrgId: async () => {}, // Added default value
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Initialize user on mount - improved to be more reliable
  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error fetching session:", error.message);
          return;
        }
        
        // Set user from session
        if (session) {
          console.info("Auth state changed: SIGNED_IN");
          console.info("User in auth state change:", session.user.id);
          setUser(session.user);
          setUserId(session.user.id);
          
          // Fetch user's organization ID
          try {
            const { data: orgData, error: orgError } = await supabase
              .from('org_members')
              .select('org_id')
              .eq('user_id', session.user.id)
              .eq('is_default', true)
              .maybeSingle();
              
            if (orgError) {
              console.error("Error fetching organization:", orgError.message);
            } else if (orgData?.org_id) {
              setOrgId(orgData.org_id);
              console.info("User's organization fetched successfully:", orgData.org_id);
            }
          } catch (err) {
            console.error("Unexpected error fetching organization:", err);
          }
        } else {
          console.info("No active session found");
          setUser(null);
          setUserId(null);
          setOrgId(null);
        }
      } catch (error) {
        console.error("Unexpected error during session check:", error);
      } finally {
        setLoading(false);
        setSessionChecked(true);
      }
    };

    fetchSession();

    // Set up auth state change listener - with improved stability
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.info("Auth state changed: SIGNED_IN");
        console.info("User in auth state change:", session.user.id);
        setUser(session.user);
        setUserId(session.user.id);
        
        // Fetch user's organization ID after sign in
        setTimeout(async () => {
          try {
            const { data: orgData, error: orgError } = await supabase
              .from('org_members')
              .select('org_id')
              .eq('user_id', session.user.id)
              .eq('is_default', true)
              .maybeSingle();
              
            if (orgError) {
              console.error("Error fetching organization:", orgError.message);
            } else if (orgData?.org_id) {
              setOrgId(orgData.org_id);
              console.info("User's organization fetched successfully:", orgData.org_id);
            }
          } catch (err) {
            console.error("Unexpected error fetching organization:", err);
          }
        }, 0);
        
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.info("Auth state changed: SIGNED_OUT");
        setUser(null);
        setUserId(null);
        setOrgId(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.info("Auth state changed: TOKEN_REFRESHED");
        if (session) {
          setUser(session.user);
          setUserId(session.user.id);
        }
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to refresh organization ID
  const refreshOrgId = async () => {
    if (!userId) return;
    
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();
        
      if (orgError) {
        console.error("Error refreshing organization:", orgError.message);
        throw orgError;
      } else if (orgData?.org_id) {
        setOrgId(orgData.org_id);
        console.info("User's organization refreshed successfully:", orgData.org_id);
        return orgData.org_id;
      } else {
        console.warn("No organization found during refresh");
        return null;
      }
    } catch (err) {
      console.error("Unexpected error refreshing organization:", err);
      throw err;
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      console.error("Sign in error:", error.message);
      throw error;
    }
  };

  // Sign up function with improved error handling for email already in use
  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      
      if (error) {
        // Check if the error is related to an email that already exists
        if (error.message.includes("already") && error.message.includes("registered")) {
          throw new Error("Email address is already registered. Please use a different email or try logging in.");
        }
        throw error;
      }
    } catch (error: any) {
      console.error("Sign up error:", error.message);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("Sign out error:", error.message);
      throw error;
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error: any) {
      console.error("Reset password error:", error.message);
      throw error;
    }
  };

  // Only render children after initial session check to prevent flickering
  if (!sessionChecked) {
    return null; // Or a minimal loading indicator if preferred
  }

  return (
    <AuthContext.Provider value={{ user, loading, userId, orgId, signIn, signUp, signOut, resetPassword, refreshOrgId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
