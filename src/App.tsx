import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FeishuGuard } from "./components/FeishuGuard";
import PC from "./pages/PC";
import Phone from "./pages/Phone";
import Reports from "./pages/Reports";
import Auth from "./pages/Auth";
import AutoRedirect from "./pages/AutoRedirect";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<FeishuGuard><AutoRedirect /></FeishuGuard>} />
          <Route path="/pc" element={<FeishuGuard><PC /></FeishuGuard>} />
          <Route path="/phone" element={<FeishuGuard><Phone /></FeishuGuard>} />
          <Route path="/reports" element={<FeishuGuard><Reports /></FeishuGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
