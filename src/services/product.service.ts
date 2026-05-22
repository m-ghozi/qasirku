import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  price: number;
  hpp: number;
  stock: number;
  unit: string;
  description?: string;
  photo?: string;
  barcode?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Relasi yang di-include backend
  category?: {
    id: number;
    name: string;
    color: string;
    icon: string;
  };
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  categoryId: number;
  price: number;
  hpp: number;
  stock?: number;
  unit: string;
  description?: string;
  photo?: string;
  barcode?: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

// ── Service ───────────────────────────────────────────────────────────────────

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const { data } = await api.get('/products');
    return data.data;
  },

  getById: async (id: number): Promise<Product> => {
    const { data } = await api.get(`/products/${id}`);
    return data.data;
  },

  create: async (payload: CreateProductPayload): Promise<Product> => {
    const { data } = await api.post('/products', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateProductPayload): Promise<Product> => {
    const { data } = await api.put(`/products/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};