import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  unitService,
  type CreateUnitPayload,
  type UpdateUnitPayload,
} from '@/services/unit.service';

// ── Query key ─────────────────────────────────────────────────────────────────

export const UNIT_KEY = ['units'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useUnits() {
  return useQuery({
    queryKey: UNIT_KEY,
    queryFn: unitService.getAll,
  });
}

export function useUnit(id: number) {
  return useQuery({
    queryKey: [...UNIT_KEY, id],
    queryFn: () => unitService.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUnitPayload) => unitService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNIT_KEY });
      toast.success('Unit berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambah unit');
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUnitPayload }) =>
      unitService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNIT_KEY });
      toast.success('Unit berhasil diubah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah unit');
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unitService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNIT_KEY });
      toast.success('Unit berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus unit');
    },
  });
}