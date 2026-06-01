import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import CustomersPage from "./pages/Customers";
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
    <ErrorBoundary>
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
                    <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                    <Route path="/cashier" element={<ErrorBoundary><Cashier /></ErrorBoundary>} />
                    <Route path="/products" element={<ErrorBoundary><Products /></ErrorBoundary>} />
                    <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
                    <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
                    <Route path="/supplier" element={<ErrorBoundary><SupplierPage /></ErrorBoundary>} />
                    <Route path="/stock-in" element={<ErrorBoundary><StockInPage /></ErrorBoundary>} />
                    <Route path="/stock-out" element={<ErrorBoundary><StockOutPage /></ErrorBoundary>} />
                    <Route path="/history" element={<ErrorBoundary><TransactionHistory /></ErrorBoundary>} />
                    <Route path="/stock-report" element={<ErrorBoundary><StockReport /></ErrorBoundary>} />
                    <Route path="/users" element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />
                    <Route path="/expenses" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
                    <Route path="/customers" element={<ErrorBoundary><CustomersPage /></ErrorBoundary>} />
                  </Route>
                </Route>

                {/* ── Fallback ───────────────────────────── */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}