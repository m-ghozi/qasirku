import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  supplierService,
  type CreateSupplierPayload,
  type UpdateSupplierPayload,
} from '@/services/supplier.service';

// ── Query key ─────────────────────────────────────────────────────────────────

export const SUPPLIER_KEY = ['suppliers'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: SUPPLIER_KEY,
    queryFn: supplierService.getAll,
  });
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: [...SUPPLIER_KEY, id],
    queryFn: () => supplierService.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => supplierService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIER_KEY });
      toast.success('Supplier berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambah supplier');
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSupplierPayload }) =>
      supplierService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIER_KEY });
      toast.success('Data supplier berhasil diubah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah supplier');
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => supplierService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIER_KEY });
      toast.success('Supplier berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus supplier');
    },
  });
}