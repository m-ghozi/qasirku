import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardTransaction {
  id: number;
  receiptNumber: string;
  subtotal: number;
  discountType: 'percentage' | 'nominal' | null;
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethodId: number;
  paymentMethod: string;       // nama metode bayar, e.g. "Tunai"
  paymentAmount: number;
  change: number;
  profit: number;
  status: 'open' | 'completed';
  date: string;                // ISO string
  createdById: number;
  createdBy: { name: string };
  itemNames: string | null;    // "Kopi, Roti Bakar" — null jika tidak ada item
}

export interface DashboardStats {
  todayRevenue: number;
  todayProfit: number;
  todaySalesCount: number;
  openBillsCount: number;
  productsCount: number;
  todayExpenses: number;
  todayExpenseCount: number;
}

export interface DashboardLowStockProduct {
  id: number;
  name: string;
  sku: string;
  stock: number;
  unit: string;
}

export interface DashboardSummary {
  todayTransactions: DashboardTransaction[];
  stats: DashboardStats;
  lowStockProducts: DashboardLowStockProduct[];
  recentTransactions: DashboardTransaction[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await api.get('/dashboard');
    return data.data;
  },
};