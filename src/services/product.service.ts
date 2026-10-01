import api from '@/lib/api';
import type { Paginated } from './pagination';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  supplierId: number | null;
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
  supplier?: {
    id: number;
    name: string;
  } | null;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  categoryId: number;
  // null dikirim eksplisit saat supplier dikosongkan
  supplierId?: number | null;
  price: number;
  hpp: number;
  stock?: number;
  unit: string;
  // null dikirim eksplisit saat dikosongkan agar backend ikut mengosongkan kolomnya
  description?: string | null;
  photo?: string | null;
  barcode?: string | null;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

// ── Service ───────────────────────────────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  /** Dicocokkan ke nama, SKU, dan deskripsi (dilakukan di server). */
  search?: string;
  categoryId?: number;
}

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const { data } = await api.get('/products');
    return data.data;
  },

  // Halaman produk untuk halaman kelola produk. `getAll` di atas tetap dipakai
  // Cashier/ProductPicker yang butuh seluruh daftar untuk pencarian lokal.
  getPaginated: async (params: ProductListParams = {}): Promise<Paginated<Product>> => {
    const { data } = await api.get('/products', { params });
    return { items: data.data, meta: data.meta };
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