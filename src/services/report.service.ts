import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────
// Sesuaikan dengan shape yang dikembalikan reportService.getReportData() di backend

export interface DailyStat {
  date: string;
  sales: number;
  profit: number;
  transactionCount: number;
}

export interface TopProduct {
  productId: number;
  name: string;
  totalQty: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface ReportData {
  period: number; // 7 atau 30
  totalSales: number;
  totalProfit: number;
  totalTransactions: number;
  totalRevenue: number;
  totalDiscount: number;
  totalHpp: number;
  grossProfit: number;
  marginPercent: number;
  dailyStats: DailyStat[];
  topProducts: TopProduct[];
}

export interface PaymentBreakdown {
  name: string;
  amount: number;
  count: number;
}

export interface DailyReportData {
  stats: {
    totalRevenue: number;
    totalProfit: number;
    totalSalesCount: number;
    avgTransaction: number;
  };
  paymentBreakdown: PaymentBreakdown[];
  topProducts: TopProduct[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export const reportService = {
  getReport: async (period: 7 | 30): Promise<ReportData> => {
    const { data } = await api.get('/reports', { params: { period } });
    return data.data;
  },

  getDailyReport: async (date: string): Promise<DailyReportData> => {
    const { data } = await api.get('/reports', { params: { date } });
    return data.data;
  },
};