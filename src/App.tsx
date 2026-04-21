import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import AddStock from "./pages/AddStock";
import RemoveStock from "./pages/RemoveStock";
import History from "./pages/History";
import Utilities from "./pages/Utilities";
import Settings from "./pages/Settings";
import Businesses from "./pages/Businesses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BusinessProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/businesses" element={<Businesses />} />
              <Route path="/add" element={<AddStock />} />
              <Route path="/remove" element={<RemoveStock />} />
              <Route path="/history" element={<History />} />
              <Route path="/utilities" element={<Utilities />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BusinessProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
