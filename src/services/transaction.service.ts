import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TransactionItem {
  id: number;
  transactionId: number;
  productId: number;
  quantity: number;
  price: number;
  hpp: number;
  totalPrice: number;   // dari backend (server-calculated)
  profit: number;
  discountType?: 'percentage' | 'nominal' | null;
  discountValue?: number;
  discountAmount?: number;
  notes?: string | null;
  product?: { id: number; name: string; sku: string };

  // Helper getters — diisi saat normalisasi response (lihat normalizeItem)
  productName?: string;  // shortcut ke product.name
  subtotal?: number;     // alias totalPrice, dipakai Receipt component
}

export interface Transaction {
  id: number;
  receiptNumber: string;
  subtotal: number;
  discountType?: 'percentage' | 'nominal' | null;
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethodId?: number | null;
  paymentAmount: number;
  change: number;
  profit: number;
  status: 'open' | 'completed' | 'cancelled';
  date: string;
  createdById: number;
  customerName?: string;
  tableNumber?: string;
  remarks?: string;
  openedAt?: string;
  closedAt?: string;
  items?: TransactionItem[];
  createdBy?: { id: number; name: string; username: string };
  paymentMethod?: { name: string; category: string };
}

// ── Payload untuk buat transaksi baru ────────────────────────────────────────

export interface CreateTransactionItemPayload {
  productId: number;
  quantity: number;
  // price & hpp TIDAK perlu dikirim — backend selalu ambil dari DB.
  price?: number;
  hpp?: number;
  discountType?: 'percentage' | 'nominal' | null;
  discountValue?: number;
  notes?: string;
}

export interface CreateTransactionPayload {
  items: CreateTransactionItemPayload[];
  // subtotal, discountAmount, total, profit TIDAK perlu dikirim —
  // backend menghitung ulang semua nilai ini dari DB.
  subtotal?: number;
  discountType?: 'percentage' | 'nominal' | null;
  discountValue?: number;
  discountAmount?: number;
  total?: number;
  paymentMethodId?: number | null;
  paymentAmount?: number;
  change?: number;
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

// ── Normalisasi helper ────────────────────────────────────────────────────────

function normalizeItem(item: TransactionItem): TransactionItem {
  return {
    ...item,
    productName: item.productName ?? item.product?.name ?? `Produk #${item.productId}`,
    subtotal: item.subtotal ?? item.totalPrice,
  };
}

function normalizeTransaction(tx: Transaction): Transaction {
  return {
    ...tx,
    subtotal: Number(tx.subtotal),
    discountValue: Number(tx.discountValue ?? 0),
    discountAmount: Number(tx.discountAmount ?? 0),
    total: Number(tx.total),
    paymentAmount: Number(tx.paymentAmount ?? 0),
    change: Number(tx.change ?? 0),
    profit: Number(tx.profit ?? 0),
    items: tx.items?.map(normalizeItem),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const transactionService = {
  getAll: async (): Promise<Transaction[]> => {
    const { data } = await api.get('/transactions');
    return (data.data as Transaction[]).map(normalizeTransaction);
  },

  getById: async (id: number): Promise<Transaction> => {
    const { data } = await api.get(`/transactions/${id}`);
    return normalizeTransaction(data.data);
  },

  create: async (payload: CreateTransactionPayload): Promise<Transaction> => {
    const { data } = await api.post('/transactions', payload);
    return normalizeTransaction(data.data);
  },

  /** Melunasi open bill */
  payHold: async (id: number, payload: PayHoldPayload): Promise<Transaction> => {
    const { data } = await api.put(`/transactions/${id}/pay`, payload);
    const tx = normalizeTransaction(data.data) as Transaction;
    // payHold response tidak include items — fetch ulang agar struk lengkap
    if (!tx.items || tx.items.length === 0) {
      return transactionService.getById(tx.id);
    }
    return tx;
  },

  cancel: async (id: number): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  },
};