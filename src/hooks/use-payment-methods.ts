import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  paymentMethodService,
  type CreatePaymentMethodPayload,
  type UpdatePaymentMethodPayload,
} from '@/services/paymentMethod.service';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const PAYMENT_METHOD_KEYS = {
  all: ['paymentMethods'] as const,
  list: (includeInactive?: boolean) =>
    [...PAYMENT_METHOD_KEYS.all, { includeInactive }] as const,
  detail: (id: number) => [...PAYMENT_METHOD_KEYS.all, id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/** Ambil semua payment method aktif */
export function usePaymentMethods(includeInactive = false) {
  return useQuery({
    queryKey: PAYMENT_METHOD_KEYS.list(includeInactive),
    queryFn: () => paymentMethodService.getAll(includeInactive),
  });
}

/** Ambil satu payment method by ID */
export function usePaymentMethod(id: number) {
  return useQuery({
    queryKey: PAYMENT_METHOD_KEYS.detail(id),
    queryFn: () => paymentMethodService.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentMethodPayload) =>
      paymentMethodService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENT_METHOD_KEYS.all });
      toast.success('Metode pembayaran berhasil ditambahkan');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Gagal menambahkan metode pembayaran';
      toast.error(msg);
    },
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdatePaymentMethodPayload }) =>
      paymentMethodService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENT_METHOD_KEYS.all });
      toast.success('Metode pembayaran berhasil diperbarui');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Gagal memperbarui metode pembayaran';
      toast.error(msg);
    },
  });
}

export function useDeactivatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => paymentMethodService.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENT_METHOD_KEYS.all });
      toast.success('Metode pembayaran dinonaktifkan');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Gagal menonaktifkan metode pembayaran';
      toast.error(msg);
    },
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => paymentMethodService.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENT_METHOD_KEYS.all });
      toast.success('Metode pembayaran berhasil dihapus');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Gagal menghapus. Mungkin sudah dipakai transaksi.';
      toast.error(msg);
    },
  });
}

export function useSetDefaultPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => paymentMethodService.setDefault(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENT_METHOD_KEYS.all });
      toast.success('Metode pembayaran default diperbarui');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Gagal mengubah default';
      toast.error(msg);
    },
  });
}