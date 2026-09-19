import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  productService,
  type ProductListParams,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '@/services/product.service';

// ── Query key ─────────────────────────────────────────────────────────────────

export const PRODUCT_KEY = ['products'] as const;

// Sub-key terpisah dari detail produk (`[...PRODUCT_KEY, id]`) agar tidak bentrok.
// Karena invalidateQueries mencocokkan berdasarkan prefix, mutasi yang meng-
// invalidate PRODUCT_KEY di bawah otomatis menyegarkan daftar ber-paginasi ini.
export const PRODUCT_LIST_KEY = [...PRODUCT_KEY, 'list'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

/** Seluruh produk — dipakai Cashier & ProductPicker yang mencari di sisi klien. */
export function useProducts() {
  return useQuery({
    queryKey: PRODUCT_KEY,
    queryFn: productService.getAll,
  });
}

/**
 * Satu halaman produk untuk halaman kelola produk.
 * keepPreviousData menjaga baris lama tetap tampil saat pindah halaman, supaya
 * daftar tidak berkedip ke skeleton.
 */
export function useProductsPaginated(params: ProductListParams) {
  return useQuery({
    queryKey: [...PRODUCT_LIST_KEY, params],
    queryFn: () => productService.getPaginated(params),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: [...PRODUCT_KEY, id],
    queryFn: () => productService.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
      toast.success('Produk berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambah produk');
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProductPayload }) =>
      productService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
      toast.success('Produk berhasil diubah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah produk');
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
      toast.success('Produk berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus produk');
    },
  });
}