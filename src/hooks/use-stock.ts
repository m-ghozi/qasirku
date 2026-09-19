import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  stockService,
  type StockListParams,
  type CreateStockInPayload,
  type CreateStockOutPayload,
} from '@/services/stock.service';
import { PRODUCT_KEY } from './use-products';

// ── Query keys ────────────────────────────────────────────────────────────────

export const STOCK_IN_KEY = ['stocks', 'in'] as const;
export const STOCK_OUT_KEY = ['stocks', 'out'] as const;
export const STOCK_REPORT_KEY = ['stocks', 'report'] as const;

// Sub-key untuk daftar ber-paginasi. Mutasi meng-invalidate STOCK_IN_KEY /
// STOCK_OUT_KEY, dan invalidateQueries mencocokkan prefix — jadi daftar ini ikut
// tersegarkan tanpa perubahan tambahan di sisi mutasi.
export const STOCK_IN_LIST_KEY = [...STOCK_IN_KEY, 'list'] as const;
export const STOCK_OUT_LIST_KEY = [...STOCK_OUT_KEY, 'list'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useStockIn(from?: string | number) {
  const fromParam = from !== undefined ? String(from) : undefined;
  return useQuery({
    queryKey: fromParam ? [...STOCK_IN_KEY, fromParam] : STOCK_IN_KEY,
    queryFn: () => stockService.getAllStockIn(fromParam),
  });
}

export function useStockInPaginated(params: StockListParams) {
  return useQuery({
    queryKey: [...STOCK_IN_LIST_KEY, params],
    queryFn: () => stockService.getAllStockInPaginated(params),
    placeholderData: keepPreviousData,
  });
}

export function useStockOut(from?: string | number) {
  const fromParam = from !== undefined ? String(from) : undefined;
  return useQuery({
    queryKey: fromParam ? [...STOCK_OUT_KEY, fromParam] : STOCK_OUT_KEY,
    queryFn: () => stockService.getAllStockOut(fromParam),
  });
}

export function useStockOutPaginated(params: StockListParams) {
  return useQuery({
    queryKey: [...STOCK_OUT_LIST_KEY, params],
    queryFn: () => stockService.getAllStockOutPaginated(params),
    placeholderData: keepPreviousData,
  });
}

export function useStockReport(period: '7' | '30') {
  return useQuery({
    queryKey: [...STOCK_REPORT_KEY, period],
    queryFn: () => stockService.getReport(period),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateStockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStockInPayload) => stockService.createStockIn(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_IN_KEY });
      qc.invalidateQueries({ queryKey: STOCK_REPORT_KEY });
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
      qc.invalidateQueries({ queryKey: STOCK_REPORT_KEY });
      qc.invalidateQueries({ queryKey: PRODUCT_KEY });
      toast.success('Stok keluar berhasil dicatat');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat stock out');
    },
  });
}