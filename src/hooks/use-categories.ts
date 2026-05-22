import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  categoryService,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '@/services/category.service';

// ── Query key ─────────────────────────────────────────────────────────────────

export const CATEGORY_KEY = ['categories'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: CATEGORY_KEY,
    queryFn: categoryService.getAll,
  });
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: [...CATEGORY_KEY, id],
    queryFn: () => categoryService.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoryService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORY_KEY });
      toast.success('Kategori berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambah kategori');
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCategoryPayload }) =>
      categoryService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORY_KEY });
      toast.success('Kategori berhasil diubah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah kategori');
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORY_KEY });
      toast.success('Kategori berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus kategori');
    },
  });
}