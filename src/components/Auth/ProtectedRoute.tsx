
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const [showLoading, setShowLoading] = useState(true);
  
  // Add a timeout so we don't show the loading screen forever
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 10000); // 10 second maximum loading time
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading screen if still loading and within timeout
  if (loading && showLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[hsl(var(--dashboard-purple))] mb-4"></div>
        <p className="text-muted-foreground">Loading your account...</p>
      </div>
    );
  }
  
  // Force navigation to auth page if not authenticated after loading
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Render outlet if authenticated or loading timeout exceeded
  return <Outlet />;
};

export default ProtectedRoute;
