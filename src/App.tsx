
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/Dashboard/DashboardLayout";
import Index from "./pages/Index";
import Calls from "./pages/Calls";
import AgentsList from "./components/Dashboard/AgentsList";
import AuthPage from "./pages/AuthPage";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Settings from "./pages/Settings";

// Create a persistent query client with staleTime to maintain data between tab switches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false, // Prevent refetching when window regains focus
      retry: 1, // Limit retries
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/dashboard">
        <AuthProvider>
          <Routes>
            {/* Auth routes - now at /login instead of /auth */}
            <Route path="/login" element={<AuthPage />} />
            
            {/* Protected dashboard routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={
                <OrganizationProvider>
                  <DashboardLayout />
                </OrganizationProvider>
              }>
                <Route path="/" element={<Index />} />
                <Route path="/calls" element={<Calls />} />
                <Route path="/agents" element={<AgentsList />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
