import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  productService,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '@/services/product.service';

// ── Query key ─────────────────────────────────────────────────────────────────

export const PRODUCT_KEY = ['products'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useProducts() {
  return useQuery({
    queryKey: PRODUCT_KEY,
    queryFn: productService.getAll,
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