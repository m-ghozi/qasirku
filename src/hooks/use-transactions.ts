import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  transactionService,
  type CreateTransactionPayload,
  type PayHoldPayload,
} from '@/services/transaction.service';
import { PRODUCT_KEY } from './use-products';

// ── Query key ─────────────────────────────────────────────────────────────────

export const TRANSACTION_KEY = ['transactions'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useTransactions() {
  return useQuery({
    queryKey: TRANSACTION_KEY,
    queryFn: transactionService.getAll,
  });
}

/** Hanya open bills (filter di sisi klien agar tidak butuh endpoint baru). */
export function useOpenBills() {
  return useQuery({
    queryKey: TRANSACTION_KEY,
    queryFn: transactionService.getAll,
    select: (data) => data.filter((t) => t.status === 'open'),
  });
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: [...TRANSACTION_KEY, id],
    queryFn: () => transactionService.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) => transactionService.create(payload),
    onSuccess: (newTx) => {
      qc.invalidateQueries({ queryKey: TRANSACTION_KEY });
      // Backend sudah kurangi stok — refresh produk
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
      if (newTx.status === 'completed') {
        toast.success(`Transaksi berhasil! ${newTx.receiptNumber}`);
      } else {
        toast.success(`Bill ${newTx.receiptNumber} disimpan!`);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memproses transaksi');
    },
  });
}

export function usePayHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PayHoldPayload }) =>
      transactionService.payHold(id, payload),
    onSuccess: (updatedTx) => {
      qc.invalidateQueries({ queryKey: TRANSACTION_KEY });
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
      toast.success(`Hold Bill ${updatedTx.receiptNumber} berhasil dilunasi`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal melunasi bill');
    },
  });
}

export function useCancelTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => transactionService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTION_KEY });
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membatalkan bill');
    },
  });
}