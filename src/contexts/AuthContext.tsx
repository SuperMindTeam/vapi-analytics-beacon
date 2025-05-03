
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

  // Function to fetch and set the user's organization ID - optimized version
  const fetchUserOrg = async (userId: string) => {
    if (!userId) return;
    
    try {
      console.log("Fetching organization for user:", userId);
      setOrgFetchAttempted(true);
      
      // Use a more direct query approach with a short timeout
      const orgPromise = new Promise<void>(async (resolve) => {
        try {
          // First try to get default org
          const { data, error } = await supabase
            .from('org_members')
            .select('org_id')
            .eq('user_id', userId)
            .eq('is_default', true)
            .limit(1)
            .maybeSingle();

          if (error) {
            console.warn("Error fetching default organization:", error.message);
            
            // If no default, try any org membership as fallback
            const fallbackQuery = await supabase
              .from('org_members')
              .select('org_id')
              .eq('user_id', userId)
              .limit(1)
              .maybeSingle();
              
            if (!fallbackQuery.error && fallbackQuery.data) {
              console.log("Found organization via fallback query:", fallbackQuery.data.org_id);
              setOrgId(fallbackQuery.data.org_id);
            } else {
              console.warn("No organization found for user");
              // Don't show toast here, will show on Settings page when needed
            }
          } else if (data) {
            console.log("User's organization fetched successfully:", data.org_id);
            setOrgId(data.org_id);
          }
        } catch (err) {
          console.error("Error in org fetch:", err);
        }
        resolve();
      });
      
      // Set a timeout for the org fetch to ensure it doesn't block auth flow
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log("Organization fetch timeout reached");
          resolve();
        }, 2000); // 2 second timeout
      });
      
      // Race between fetch and timeout - this ensures we'll continue with auth flow
      await Promise.race([orgPromise, timeoutPromise]);
      
    } catch (error) {
      console.error("Error in fetchUserOrg:", error);
    } finally {
      // Always finish loading regardless of outcome
      setLoading(false);
    }
  };

  // Handle initial session and setup auth state listener
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // First get the current session - with fast timeout
        const sessionPromise = supabase.auth.getSession();
        
        // Set a timeout to ensure we don't wait too long for the session
        const timeoutPromise = new Promise<{data: {session: Session | null}}>((resolve) => {
          setTimeout(() => {
            console.log("Session fetch timeout reached");
            resolve({data: {session: null}});
          }, 3000); // 3 second timeout
        });
        
        // Race between fetch and timeout
        const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]);
        const currentSession = sessionData.session;
        
        if (mounted) {
          setSession(currentSession);
          
          if (currentSession?.user) {
            console.log("User found in session:", currentSession.user.id);
            setUser(currentSession.user);
            setUserId(currentSession.user.id);
            // Fetch organization after user is set
            await fetchUserOrg(currentSession.user.id);
          } else {
            setLoading(false); // No user, finish loading
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
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
            console.log("User in auth state change:", currentSession.user.id);
            setUser(currentSession.user);
            setUserId(currentSession.user.id);
            
            // Set a timeout to ensure navigation happens quickly
            if (event === 'SIGNED_IN') {
              setTimeout(() => {
                navigate('/');
              }, 300);
            }
            
            // Fetch org but don't wait for it
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
    }, 3000); // 3 second safety timeout (reduced from 5 seconds)

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
