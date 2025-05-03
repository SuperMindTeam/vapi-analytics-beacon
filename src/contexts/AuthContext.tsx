import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  userId: string | null;
  orgId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgFetchAttempted, setOrgFetchAttempted] = useState(false);
  const navigate = useNavigate();

  // Function to fetch and set the user's organization ID
  const fetchUserOrg = async (userId: string) => {
    if (!userId) return;
    
    try {
      console.log("Fetching organization for user:", userId);
      setOrgFetchAttempted(true);
      
      const { data, error } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (error) {
        console.error("Error fetching user's organization:", error);
        // Even with an error, we don't want to keep the app in loading state
        setLoading(false);
        return;
      }

      if (data) {
        console.log("User's organization fetched successfully:", data.org_id);
        setOrgId(data.org_id);
      } else {
        console.log("No default organization found for user");
        setOrgId(null);
      }
    } catch (error) {
      console.error("Error in fetchUserOrg:", error);
    } finally {
      // Always make sure to finish loading regardless of outcome
      setLoading(false);
    }
  };

  // Handle initial session and setup auth state listener
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // First get the current session
        const { data: sessionData } = await supabase.auth.getSession();
        const currentSession = sessionData.session;
        
        if (mounted) {
          setSession(currentSession);
          
          if (currentSession?.user) {
            setUser(currentSession.user);
            setUserId(currentSession.user.id);
            // Fetch organization after user is set
            await fetchUserOrg(currentSession.user.id);
          } else {
            setLoading(false); // No user, so we're done loading
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setLoading(false); // Error occurred, so we're done loading
        }
      }
    };

    // Initialize auth state
    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        
        if (mounted) {
          setSession(currentSession);
          
          if (currentSession?.user) {
            setUser(currentSession.user);
            setUserId(currentSession.user.id);
            
            // Fetch org when auth state changes and we have a user
            await fetchUserOrg(currentSession.user.id);
          } else {
            setUser(null);
            setUserId(null);
            setOrgId(null);
            setLoading(false); // No user, so we're done loading
          }
          
          if (event === 'SIGNED_OUT') {
            navigate('/auth');
          } else if (event === 'SIGNED_IN') {
            navigate('/');
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Add a safety mechanism to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading && user && !orgFetchAttempted) {
        console.log("Safety timeout reached: forcing loading state to complete");
        setLoading(false);
      }
    }, 5000); // 5 second safety timeout

    return () => clearTimeout(safetyTimeout);
  }, [loading, user, orgFetchAttempted]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Successfully signed in!");
      // Navigation is handled in the auth state change listener
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
      console.error("Sign in error:", error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Registration successful! Please check your email to verify your account.");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
      console.error("Sign up error:", error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast.success("Successfully signed out!");
      // Navigation is handled in the auth state change listener
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out");
      console.error("Sign out error:", error);
    }
  };

  const contextValue = {
    session, 
    user, 
    loading, 
    userId, 
    orgId,
    signIn, 
    signUp, 
    signOut 
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
