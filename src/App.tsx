import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BackButtonHandler } from "@/components/BackButtonHandler";
import { useEffect } from "react";
import Login from "./pages/Login";
import Index from "./pages/Index";
import History from "./pages/History";
import Utilities from "./pages/Utilities";
import Settings from "./pages/Settings";
import Businesses from "./pages/Businesses";
import Categories from "./pages/Categories";
import Properties from "./pages/Properties";
import ServicesPage from "./pages/Services";
import Analytics from "./pages/Analytics";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import TeamPage from "./pages/Team";
import BackupRestore from "./pages/BackupRestore";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";
import { useAutoSync } from "@/hooks/use-auto-sync";
import Warehouses from "./pages/Warehouses";
import Suppliers from "./pages/Suppliers";
import Accounting from "./pages/Accounting";
import { Toaster as ToasterSonner } from "@/components/ui/sonner";

const queryClient = new QueryClient();

const App = () => {
  useAutoSync();

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <ToasterSonner />
      <HashRouter>
        <BackButtonHandler />
        <AuthProvider>
          <BusinessProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected shell */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/businesses" element={<ProtectedRoute permission="businesses.manage"><Businesses /></ProtectedRoute>} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/properties" element={<Properties />} />
                        <Route path="/services" element={<ServicesPage />} />
                        <Route path="/warehouses" element={<ProtectedRoute permission="warehouses.manage"><Warehouses /></ProtectedRoute>} />
                        <Route path="/suppliers" element={<ProtectedRoute permission="suppliers.manage"><Suppliers /></ProtectedRoute>} />
                        <Route path="/accounting" element={<ProtectedRoute permission="accounting.view"><Accounting /></ProtectedRoute>} />
                        <Route path="/analytics" element={<ProtectedRoute permission="analytics.view"><Analytics /></ProtectedRoute>} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/utilities" element={<ProtectedRoute permission="settings.manage"><Utilities /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute permission="settings.manage"><Settings /></ProtectedRoute>} />
                        <Route path="/team" element={<ProtectedRoute permission="users.manage"><TeamPage /></ProtectedRoute>} />
                        <Route path="/backup" element={<ProtectedRoute permission="export.data"><BackupRestore /></ProtectedRoute>} />
                        <Route path="/audit-logs" element={<ProtectedRoute permission="settings.manage"><AuditLogs /></ProtectedRoute>} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BusinessProvider>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};


export default App;
