
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const [showLoading, setShowLoading] = useState(true);
  
  // Reduce the timeout to make the loading state shorter
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 2000); // 2 second maximum loading time (reduced from 5 seconds)
    
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
    return <Navigate to="/auth" replace />;
  }
  
  // Render outlet if authenticated or loading timeout exceeded
  return <Outlet />;
};

export default ProtectedRoute;
