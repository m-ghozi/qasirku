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
  // Relasi yang di-include backend
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
  // Relasi yang di-include backend
  product?: { id: number; name: string; unit: string };
  createdBy?: { id: number; name: string };
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
  // Stock In
  getAllStockIn: async (): Promise<StockIn[]> => {
    const { data } = await api.get('/stocks/in');
    return data.data;
  },

  createStockIn: async (payload: CreateStockInPayload): Promise<StockIn> => {
    const { data } = await api.post('/stocks/in', payload);
    return data.data;
  },

  // Stock Out
  getAllStockOut: async (): Promise<StockOut[]> => {
    const { data } = await api.get('/stocks/out');
    return data.data;
  },

  createStockOut: async (payload: CreateStockOutPayload): Promise<StockOut> => {
    const { data } = await api.post('/stocks/out', payload);
    return data.data;
  },
};