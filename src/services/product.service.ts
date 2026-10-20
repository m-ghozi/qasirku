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

// Backend membatasi `limit` ke MAX_LIMIT = 100 (lihat
// qasirku-backend/src/utils/pagination.ts), jadi "seluruh produk" harus diambil
// per halaman lalu digabung — bukan satu request yang diam-diam terpotong 20.
const ALL_PRODUCTS_PAGE_SIZE = 100;

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const fetchPage = async (page: number) => {
      const { data } = await api.get('/products', {
        params: { page, limit: ALL_PRODUCTS_PAGE_SIZE },
      });
      return { items: (data.data ?? []) as Product[], totalPages: data.meta?.totalPages ?? 1 };
    };

    // Halaman 1 wajib lebih dulu karena hanya responsnya yang membawa meta;
    // sisanya diambil paralel supaya latensi tidak bertambah per halaman.
    const first = await fetchPage(1);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => fetchPage(i + 2)),
    );

    // Produk bisa bertambah/berpindah antar-request saat halaman bergeser;
    // dedupe by id supaya picker tidak merender baris kembar.
    const items = [first, ...rest].flatMap((r) => r.items);
    return Array.from(new Map(items.map((p) => [p.id, p])).values());
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

  /**
   * SKU usulan untuk produk baru di kategori ini — lanjutan dari SKU terakhir
   * yang dipakai kategori tersebut. Dihitung di server karena daftar produk di
   * halaman ini ber-paginasi, jadi SKU terakhir belum tentu ada di sisi klien.
   */
  getNextSku: async (categoryId: number): Promise<string> => {
    const { data } = await api.get('/products/next-sku', { params: { categoryId } });
    return data.data.sku;
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