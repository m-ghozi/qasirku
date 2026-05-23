import api from '@/lib/api';
// ── Types ─────────────────────────────────────────────────────────────────────

export type PaymentCategory = 'tunai' | 'transfer' | 'qris' | 'e-wallet';

export interface PaymentMethod {
  id: number;
  name: string;
  category: PaymentCategory;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePaymentMethodPayload {
  name: string;
  category: PaymentCategory;
  isDefault?: boolean;
}

export interface UpdatePaymentMethodPayload {
  name?: string;
  category?: PaymentCategory;
  isDefault?: boolean;
  isActive?: boolean;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const paymentMethodService = {
  /** GET /api/payment-methods — hanya aktif (default). Tambah ?includeInactive=true untuk semua */
  getAll: async (includeInactive = false): Promise<PaymentMethod[]> => {
    const res = await api.get('/payment-methods', {
      params: includeInactive ? { includeInactive: 'true' } : undefined,
    });
    return res.data.data;
  },

  getById: async (id: number): Promise<PaymentMethod> => {
    const res = await api.get(`/payment-methods/${id}`);
    return res.data.data;
  },

  create: async (payload: CreatePaymentMethodPayload): Promise<PaymentMethod> => {
    const res = await api.post('/payment-methods', payload);
    return res.data.data;
  },

  update: async (id: number, payload: UpdatePaymentMethodPayload): Promise<PaymentMethod> => {
    const res = await api.put(`/payment-methods/${id}`, payload);
    return res.data.data;
  },

  /** Soft delete — nonaktifkan. Metode default tidak bisa dinonaktifkan. */
  deactivate: async (id: number): Promise<PaymentMethod> => {
    const res = await api.patch(`/payment-methods/${id}/deactivate`);
    return res.data.data;
  },

  /** Hard delete — hanya berhasil jika metode belum dipakai transaksi. */
  hardDelete: async (id: number): Promise<void> => {
    await api.delete(`/payment-methods/${id}`);
  },

  setDefault: async (id: number): Promise<PaymentMethod> => {
    const res = await api.patch(`/payment-methods/${id}/set-default`);
    return res.data.data;
  },
};