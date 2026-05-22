import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StockIn {
  id: number;
  productId: number;
  supplierId?: number;
  quantity: number;
  buyPrice: number;
  totalPrice: number;
  date: string;
  notes?: string;
  createdById?: number;
  product?: { id: number; name: string; unit: string };
  supplier?: { id: number; name: string };
  createdBy?: { id: number; name: string };
}

export interface StockOut {
  id: number;
  productId: number;
  quantity: number;
  reason: string;
  date: string;
  notes?: string;
  createdById?: number;
  product?: { id: number; name: string; unit: string };
  createdBy?: { id: number; name: string };
}

export interface StockReport {
  summary: {
    totalStockIn: number;
    totalStockOut: number;
    totalStockInValue: number;
    avgBuyPrice: number;
    currentStock: number;
  };
  stockOutByReason: { reason: string; quantity: number }[];
  chart: {
    stockIn: { date: string; quantity: number }[];
    stockOut: { date: string; quantity: number }[];
  };
  alerts: {
    lowStock: { id: number; name: string; stock: number; unit: string }[];
    outOfStock: { id: number; name: string; stock: number; unit: string }[];
  };
}

export interface CreateStockInPayload {
  productId: number;
  supplierId?: number;
  quantity: number;
  buyPrice: number;
  notes?: string;
}

export interface CreateStockOutPayload {
  productId: number;
  quantity: number;
  reason: string;
  notes?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const stockService = {
  getAllStockIn: async (from?: string): Promise<StockIn[]> => {
    const { data } = await api.get('/stocks/in', { params: from ? { from } : undefined });
    return data.data;
  },

  createStockIn: async (payload: CreateStockInPayload): Promise<StockIn> => {
    const { data } = await api.post('/stocks/in', payload);
    return data.data;
  },

  getAllStockOut: async (from?: string): Promise<StockOut[]> => {
    const { data } = await api.get('/stocks/out', { params: from ? { from } : undefined });
    return data.data;
  },

  createStockOut: async (payload: CreateStockOutPayload): Promise<StockOut> => {
    const { data } = await api.post('/stocks/out', payload);
    return data.data;
  },

  getReport: async (period: string): Promise<StockReport> => {
    const { data } = await api.get('/stocks/report', { params: { period } });
    return data.data;
  },
};