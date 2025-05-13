
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
  refreshOrgId: () => Promise<void>;
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

  // Function to fetch and set the user's organization ID - critical for application functionality
  const fetchUserOrg = async (userId: string) => {
    if (!userId) return;
    
    try {
      console.log("Fetching organization for user:", userId);
      setOrgFetchAttempted(true);
      
      // Direct query to get default org membership - using maybeSingle for better error handling
      const { data, error } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching default organization:", error.message);
        
        // Try to get any org membership as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
          
        if (fallbackError) {
          console.error("Error fetching any organization:", fallbackError.message);
          toast.error("Failed to load your organization data", {
            description: "Some features may not work correctly. Please refresh or contact support.",
            duration: 5000,
          });
        } else if (fallbackData?.org_id) {
          console.log("Found organization via fallback:", fallbackData.org_id);
          setOrgId(fallbackData.org_id);
        } else {
          console.warn("No organization found for user via fallback");
          setOrgId(null);
        }
      } else if (data?.org_id) {
        console.log("User's organization fetched successfully:", data.org_id);
        setOrgId(data.org_id);
      } else {
        console.warn("No default organization found for user");
        setOrgId(null);
      }
    } catch (err) {
      console.error("Error in org fetch:", err);
      setOrgId(null);
    } finally {
      setLoading(false);
    }
  };

  // Add a function to manually refresh the org ID
  const refreshOrgId = async () => {
    if (userId) {
      setLoading(true);
      await fetchUserOrg(userId);
      toast.success("Organization data refreshed");
    }
  };

  // Handle initial session and setup auth state listener
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth state");
        setLoading(true);
        
        // First get the current session - with fast timeout
        const { data: sessionData } = await supabase.auth.getSession();
        const currentSession = sessionData.session;
        
        if (mounted) {
          setSession(currentSession);
          
          if (currentSession?.user) {
            console.log("User found in session:", currentSession.user.id);
            setUser(currentSession.user);
            setUserId(currentSession.user.id);
            
            // Fetch organization immediately
            await fetchUserOrg(currentSession.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event);
        
        if (mounted) {
          setSession(currentSession);
          
          if (currentSession?.user) {
            console.log("User in auth state change:", currentSession.user.id);
            setUser(currentSession.user);
            setUserId(currentSession.user.id);
            
            // Set a timeout to ensure navigation happens quickly
            if (event === 'SIGNED_IN') {
              setTimeout(() => {
                navigate('/');
              }, 300);
            }
            
            // Fetch org in the background
            setTimeout(() => {
              fetchUserOrg(currentSession.user.id);
            }, 100);
          } else {
            setUser(null);
            setUserId(null);
            setOrgId(null);
            setLoading(false);
            
            if (event === 'SIGNED_OUT') {
              navigate('/auth');
            }
          }
        }
      }
    );

    // Initialize auth state
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.log("Safety timeout reached: forcing loading state to complete");
        setLoading(false);
      }
    }, 1500); // Reduced from 2 seconds to 1.5 seconds for faster experience

    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      if (data.user) {
        // Set user data immediately for faster perceived performance
        setUser(data.user);
        setUserId(data.user.id);
        setSession(data.session);
        toast.success("Signed in successfully");
      }

      // Navigation is handled in the auth state change listener
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        // Pass the detailed error message up to the component
        throw error;
      }

      toast.success("Registration successful! Please check your email to verify your account.");
    } catch (error: any) {
      // Forward the error to be handled by the component
      console.error("Sign up error:", error);
      throw error;
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
    signOut,
    refreshOrgId
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
