import api from '@/lib/api';
import type { Paginated } from './pagination';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StockIn {
  id: number;
  productId: number;
  supplierId?: number;
  quantity: number;
  buyPrice: number;
  totalPrice: number;
  expireDate?: string | null;
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
    expired: ExpiringBatch[];
    expiringSoon: ExpiringBatch[];
  };
}

export interface ExpiringBatch {
  id: number;
  productId: number;
  productName: string;
  unit: string;
  quantity: number;
  expireDate: string;
}

export interface CreateStockInPayload {
  productId: number;
  supplierId?: number;
  quantity: number;
  buyPrice: number;
  expireDate?: string | null;
  notes?: string;
}

export interface CreateStockOutPayload {
  productId: number;
  quantity: number;
  reason: string;
  notes?: string;
}

export interface StockListParams {
  page?: number;
  limit?: number;
  /** Hanya dipakai endpoint stock in. */
  supplierId?: number;
  /** Tanggal 'YYYY-MM-DD'; berlaku sebagai rentang inklusif. */
  from?: string;
  to?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const stockService = {
  getAllStockIn: async (from?: string): Promise<StockIn[]> => {
    const { data } = await api.get('/stocks/in', { params: from ? { from } : undefined });
    return data.data;
  },

  getAllStockInPaginated: async (params: StockListParams = {}): Promise<Paginated<StockIn>> => {
    const { data } = await api.get('/stocks/in', { params });
    return { items: data.data, meta: data.meta };
  },

  createStockIn: async (payload: CreateStockInPayload): Promise<StockIn> => {
    const { data } = await api.post('/stocks/in', payload);
    return data.data;
  },

  getAllStockOut: async (from?: string): Promise<StockOut[]> => {
    const { data } = await api.get('/stocks/out', { params: from ? { from } : undefined });
    return data.data;
  },

  getAllStockOutPaginated: async (params: StockListParams = {}): Promise<Paginated<StockOut>> => {
    const { data } = await api.get('/stocks/out', { params });
    return { items: data.data, meta: data.meta };
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