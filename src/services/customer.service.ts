import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isDeleted: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface CustomerTransaction {
  id: number;
  receiptNumber: string;
  total: number;
  status: string;
  date: string;
  paymentMethod: { name: string } | null;
}

export interface CustomerSummary {
  totalTransactions: number;
  totalSpent: number;
}

export interface CustomerWithHistory {
  customer: Customer;
  summary: CustomerSummary;
  transactions: CustomerTransaction[];
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

// ── Service ───────────────────────────────────────────────────────────────────

export const customerService = {
  getAll: async (search?: string): Promise<Customer[]> => {
    const { data } = await api.get('/customers', {
      params: search ? { search } : undefined,
    });
    return data.data;
  },

  getById: async (id: number): Promise<Customer> => {
    const { data } = await api.get(`/customers/${id}`);
    return data.data;
  },

  getTransactions: async (id: number): Promise<CustomerWithHistory> => {
    const { data } = await api.get(`/customers/${id}/transactions`);
    return data.data;
  },

  create: async (payload: CreateCustomerPayload): Promise<Customer> => {
    const { data } = await api.post('/customers', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateCustomerPayload): Promise<Customer> => {
    const { data } = await api.put(`/customers/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
};