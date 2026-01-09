import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { Layout } from "@/shared/components/Layout";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import AdminRoute from "@/features/auth/components/AdminRoute";
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import Customers from "@/pages/Customers";
import TaskDistribution from "@/pages/TaskDistribution";
import CampaignPerformance from "@/pages/CampaignPerformance";
import RoutePlanning from "@/pages/RoutePlanning";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/routes" element={<ProtectedRoute><Layout><RoutePlanning /></Layout></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><AdminRoute><Layout><Campaigns /></Layout></AdminRoute></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><AdminRoute><Layout><Customers /></Layout></AdminRoute></ProtectedRoute>} />
            <Route path="/task-distribution" element={<ProtectedRoute><AdminRoute><Layout><TaskDistribution /></Layout></AdminRoute></ProtectedRoute>} />
            <Route path="/campaign-performance" element={<ProtectedRoute><AdminRoute><Layout><CampaignPerformance /></Layout></AdminRoute></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
