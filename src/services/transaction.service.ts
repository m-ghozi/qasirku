import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TransactionItem {
  id: number;
  transactionId: number;
  productId: number;
  quantity: number;
  price: number;
  hpp: number;
  totalPrice: number;
  profit: number;
  // Field tambahan dari frontend (tidak ada di schema Prisma TransactionItem,
  // tapi backend bisa include via join atau kita simpan di payload)
  productName?: string;
  discountType?: 'percentage' | 'nominal' | null;
  discountValue?: number;
  discountAmount?: number;
  subtotal?: number;
  notes?: string;
  product?: { id: number; name: string };
}

export interface Transaction {
  id: number;
  receiptNumber: string;
  subtotal: number;
  discountType?: 'percentage' | 'nominal' | null;
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethodId?: number;
  paymentAmount: number;
  change: number;
  profit: number;
  status: 'open' | 'completed' | 'cancelled';
  date: string;
  createdById: number;
  // Metadata opsional
  customerName?: string;
  tableNumber?: string;
  remarks?: string;
  openedAt?: string;
  closedAt?: string;
  // Relasi
  items?: TransactionItem[];
  createdBy?: { id: number; name: string; username: string };
}

// ── Payload untuk buat transaksi baru ────────────────────────────────────────

export interface CreateTransactionItemPayload {
  productId: number;
  quantity: number;
  price: number;
  hpp: number;
  totalPrice?: number;
  profit?: number;
  discountType?: 'percentage' | 'nominal' | null;
  discountValue?: number;
  discountAmount?: number;
  subtotal?: number;
  notes?: string;
}

export interface CreateTransactionPayload {
  items: CreateTransactionItemPayload[];
  subtotal: number;
  discountType?: 'percentage' | 'nominal' | null;
  discountValue?: number;
  discountAmount?: number;
  total: number;
  paymentMethodId: number;
  paymentAmount: number;
  change: number;
  profit?: number;
  status?: 'open' | 'completed';
  customerName?: string;
  tableNumber?: string;
  remarks?: string;
}

export interface PayHoldPayload {
  paymentMethodId: number;
  paymentAmount: number;
  change: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const transactionService = {
  getAll: async (): Promise<Transaction[]> => {
    const { data } = await api.get('/transactions');
    return data.data;
  },

  getById: async (id: number): Promise<Transaction> => {
    const { data } = await api.get(`/transactions/${id}`);
    return data.data;
  },

  create: async (payload: CreateTransactionPayload): Promise<Transaction> => {
    const { data } = await api.post('/transactions', payload);
    return data.data;
  },

  /** Melunasi open bill */
  payHold: async (id: number, payload: PayHoldPayload): Promise<Transaction> => {
    const { data } = await api.put(`/transactions/${id}/pay`, payload);
    return data.data;
  },

  cancel: async (id: number): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  },
};