import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cashier from "./pages/Cashier";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SupplierPage from "./pages/Supplier";
import StockInPage from "./pages/StockIn";
import StockOutPage from "./pages/StockOut";
import TransactionHistory from "./pages/TransactionHistory";
import StockReport from "./pages/StockReport";
import UsersPage from "./pages/Users";
import Expenses from "./pages/Expenses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      placeholderData: (prev: any) => prev,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* ── Public ─────────────────────────────── */}
              <Route path="/login" element={<Login />} />

              {/* ── Protected ──────────────────────────── */}
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/cashier" element={<Cashier />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/supplier" element={<SupplierPage />} />
                  <Route path="/stock-in" element={<StockInPage />} />
                  <Route path="/stock-out" element={<StockOutPage />} />
                  <Route path="/history" element={<TransactionHistory />} />
                  <Route path="/stock-report" element={<StockReport />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/expenses" element={<Expenses />} /> 
                </Route>
              </Route>

              {/* ── Fallback ───────────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}