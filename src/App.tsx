import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CmpPage from "./pages/CmpPage";
import HfbPage from "./pages/HfbPage";
import DsPage from "./pages/DsPage";
import Diag from "./pages/Diag";
import Viewer from "./pages/Viewer";
import ProjectsList from "./pages/ProjectsList";
import Map from "./pages/Map";
import Projects from "./pages/Projects";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/map" element={<Map />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/cmp/:id" element={<CmpPage />} />
          <Route path="/hfb/:id" element={<HfbPage />} />
          <Route path="/ds/:id" element={<DsPage />} />
          <Route path="/viewer" element={<Viewer />} />
          <Route path="/_diag" element={<Diag />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
