import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import Customers from "./pages/Customers";
import TaskDistribution from "./pages/TaskDistribution";
import CampaignPerformance from "./pages/CampaignPerformance";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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
