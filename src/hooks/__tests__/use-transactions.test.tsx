import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const transactionService = vi.hoisted(() => ({
  getAll: vi.fn(),
  create: vi.fn(),
  payHold: vi.fn(),
  cancel: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/services/transaction.service', () => ({ transactionService }));
vi.mock('sonner', () => ({ toast }));

import {
  useTransactions,
  useOpenBills,
  useCreateTransaction,
} from '@/hooks/use-transactions';
import { makeHookWrapper, makeQueryClient } from '@/test/utils';

beforeEach(() => vi.clearAllMocks());

describe('useTransactions / useOpenBills', () => {
  const data = [
    { id: 1, status: 'open', receiptNumber: 'A' },
    { id: 2, status: 'completed', receiptNumber: 'B' },
  ];

  it('useTransactions mengambil semua transaksi', async () => {
    transactionService.getAll.mockResolvedValue(data);
    const { result } = renderHook(() => useTransactions(), { wrapper: makeHookWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('useOpenBills memfilter hanya status open (di sisi klien)', async () => {
    transactionService.getAll.mockResolvedValue(data);
    const { result } = renderHook(() => useOpenBills(), { wrapper: makeHookWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 1, status: 'open', receiptNumber: 'A' }]);
  });
});

describe('useCreateTransaction', () => {
  it('sukses completed → toast sukses + invalidate transactions & products', async () => {
    const qc = makeQueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    transactionService.create.mockResolvedValue({ status: 'completed', receiptNumber: 'TX9' });
    const { result } = renderHook(() => useCreateTransaction(), { wrapper: makeHookWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ items: [{ productId: 1, quantity: 1 }] });
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('TX9'));
    // invalidate dipanggil untuk dua key (transactions + products)
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('sukses open bill → toast "Bill ... disimpan"', async () => {
    transactionService.create.mockResolvedValue({ status: 'open', receiptNumber: 'TX10' });
    const { result } = renderHook(() => useCreateTransaction(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ items: [{ productId: 1, quantity: 1 }], status: 'open' });
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('disimpan'));
  });

  it('error → toast pesan dari backend', async () => {
    transactionService.create.mockRejectedValue({ response: { data: { message: 'Stok habis' } } });
    const { result } = renderHook(() => useCreateTransaction(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ items: [] }).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith('Stok habis');
  });
});
