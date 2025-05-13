
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const [showLoading, setShowLoading] = useState(true);
  const location = useLocation();
  
  // Reduce the timeout to make the loading state shorter
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 800); // 0.8 second maximum loading time (reduced from 1 second)
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading screen if still loading and within timeout
  if (loading && showLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[hsl(var(--dashboard-purple))] mb-4" />
        <p className="text-muted-foreground">Loading your account...</p>
      </div>
    );
  }
  
  // Force navigation to auth page if not authenticated after loading
  if (!user) {
    // Save the current location to redirect back after login
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  
  // Check if we have a stored path to navigate to
  const lastPath = sessionStorage.getItem('lastPath');
  if (lastPath && location.pathname === '/' && lastPath !== '/') {
    console.info(`Restoring previous path: ${lastPath}`);
    return <Navigate to={lastPath} replace />;
  }
  
  // Render outlet if authenticated or loading timeout exceeded
  return <Outlet />;
};

export default ProtectedRoute;
