import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// HashRouter, not BrowserRouter: this app also runs packaged inside Electron,
// loaded via a file:// URL, where History-API routing doesn't resolve paths
// the same way a real HTTP server would. The app only ever renders one route
// (Index, driven entirely by internal state, no navigate() calls anywhere),
// so this swap has no behavioral effect other than making file:// safe.
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
