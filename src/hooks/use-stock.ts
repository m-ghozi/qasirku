import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  stockService,
  type CreateStockInPayload,
  type CreateStockOutPayload,
} from '@/services/stock.service';
import { PRODUCT_KEY } from './use-products';

// ── Query keys ────────────────────────────────────────────────────────────────

export const STOCK_IN_KEY = ['stocks', 'in'] as const;
export const STOCK_OUT_KEY = ['stocks', 'out'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useStockIn() {
  return useQuery({
    queryKey: STOCK_IN_KEY,
    queryFn: stockService.getAllStockIn,
  });
}

export function useStockOut() {
  return useQuery({
    queryKey: STOCK_OUT_KEY,
    queryFn: stockService.getAllStockOut,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateStockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStockInPayload) => stockService.createStockIn(payload),
    onSuccess: () => {
      // Stok produk berubah di backend, invalidasi keduanya
      qc.invalidateQueries({ queryKey: STOCK_IN_KEY });
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
      toast.success('Stok masuk berhasil dicatat');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat stock in');
    },
  });
}

export function useCreateStockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStockOutPayload) => stockService.createStockOut(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_OUT_KEY });
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
      toast.success('Stok keluar berhasil dicatat');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat stock out');
    },
  });
}