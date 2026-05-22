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

// ── Service ───────────────────────────────────────────────────────────────────

export const reportService = {
  getReport: async (period: 7 | 30): Promise<ReportData> => {
    const { data } = await api.get('/reports', { params: { period } });
    return data.data;
  },
};