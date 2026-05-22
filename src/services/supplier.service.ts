import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface CreateSupplierPayload {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

// ── Service ───────────────────────────────────────────────────────────────────

export const supplierService = {
  getAll: async (): Promise<Supplier[]> => {
    const { data } = await api.get('/suppliers');
    return data.data;
  },

  getById: async (id: number): Promise<Supplier> => {
    const { data } = await api.get(`/suppliers/${id}`);
    return data.data;
  },

  create: async (payload: CreateSupplierPayload): Promise<Supplier> => {
    const { data } = await api.post('/suppliers', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateSupplierPayload): Promise<Supplier> => {
    const { data } = await api.put(`/suppliers/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },
};