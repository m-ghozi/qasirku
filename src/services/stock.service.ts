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
  /** Relasi yang dikirim endpoint daftar: { name, sku }. */
  product?: { name: string; sku: string };
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
  /** Relasi yang dikirim endpoint daftar: { name, sku, stock }. */
  product?: { name: string; sku: string; stock: number };
  createdBy?: { id: number; name: string };
}

/** Rentang laporan: preset cepat, atau rentang bebas from/to ('YYYY-MM-DD'). */
export interface StockRangeParams {
  range?: string;
  from?: string;
  to?: string;
}

export interface StockRange {
  from: string;
  to: string;
}

export interface StockReport {
  range: StockRange;
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

/** Satu baris kartu stok — rekap mutasi satu produk dalam rentang. */
export interface StockMovementRow {
  productId: number;
  name: string;
  sku: string;
  unit: string;
  categoryName: string | null;
  hpp: number;
  openingStock: number;
  stockIn: number;
  sold: number;
  adjustIn: number;
  adjustOut: number;
  closingStock: number;
  closingValue: number;
  /** Stok sistem saat ini — untuk merekonsiliasi bila rentang berakhir hari ini. */
  currentStock: number;
}

export interface StockMovementTotals {
  openingStock: number;
  stockIn: number;
  sold: number;
  adjustIn: number;
  adjustOut: number;
  closingStock: number;
  closingValue: number;
  currentStock: number;
}

export interface StockMovements {
  range: StockRange;
  totals: StockMovementTotals;
  products: StockMovementRow[];
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

  getReport: async (params: StockRangeParams): Promise<StockReport> => {
    const { data } = await api.get('/stocks/report', { params });
    return data.data;
  },

  /** Kartu stok: rekap mutasi per produk untuk satu rentang. */
  getMovements: async (params: StockRangeParams): Promise<StockMovements> => {
    const { data } = await api.get('/stocks/report/movements', { params });
    return data.data;
  },
};
