import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────
// Sesuaikan dengan shape yang dikembalikan dashboardService.getSummary() di backend

export interface DashboardSummary {
  todaySales: number;
  todayProfit: number;
  todayTransactionCount: number;
  lowStockProducts: {
    id: number;
    name: string;
    stock: number;
    unit: string;
  }[];
  recentTransactions: {
    id: number;
    receiptNumber: string;
    total: number;
    date: string;
    status: string;
    paymentMethod: string;
  }[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await api.get('/dashboard');
    return data.data;
  },
};