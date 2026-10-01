import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const stockService = vi.hoisted(() => ({
  getAllStockIn: vi.fn(),
  getAllStockOut: vi.fn(),
  getAllStockInPaginated: vi.fn(),
  getAllStockOutPaginated: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/services/stock.service', () => ({ stockService }));
vi.mock('sonner', () => ({ toast }));

import {
  useStockInPaginated,
  useStockOutPaginated,
  STOCK_IN_KEY,
  STOCK_OUT_KEY,
  STOCK_IN_LIST_KEY,
  STOCK_OUT_LIST_KEY,
} from '@/hooks/use-stock';
import { makeHookWrapper, makeQueryClient } from '@/test/utils';

beforeEach(() => vi.clearAllMocks());

const pageOf = (meta = { page: 1, limit: 20, total: 3, totalPages: 1 }) => ({
  items: [{ id: 1, quantity: 5 }],
  meta,
});

describe('useStockInPaginated', () => {
  it('mengembalikan items + meta dan meneruskan filter ke service', async () => {
    stockService.getAllStockInPaginated.mockResolvedValue(pageOf());
    const params = { page: 2, limit: 10, supplierId: 7, from: '2026-01-01', to: '2026-01-31' };

    const { result } = renderHook(() => useStockInPaginated(params), {
      wrapper: makeHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items?.[0].quantity).toBe(5);
    expect(result.current.data?.meta.total).toBe(3);
    expect(stockService.getAllStockInPaginated).toHaveBeenCalledWith(params);
  });

  // Mutasi stock in hanya meng-invalidate STOCK_IN_KEY.
  it('invalidasi STOCK_IN_KEY menyegarkan daftar ber-paginasi', async () => {
    stockService.getAllStockInPaginated.mockResolvedValue(pageOf());
    const client = makeQueryClient();

    const { result } = renderHook(() => useStockInPaginated({ page: 1, limit: 20 }), {
      wrapper: makeHookWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await client.invalidateQueries({ queryKey: STOCK_IN_KEY });
    });

    await waitFor(() =>
      expect(stockService.getAllStockInPaginated).toHaveBeenCalledTimes(2),
    );
  });

  it('sub-key daftar berada di bawah STOCK_IN_KEY', () => {
    expect(STOCK_IN_LIST_KEY.slice(0, STOCK_IN_KEY.length)).toEqual([...STOCK_IN_KEY]);
  });
});

describe('useStockOutPaginated', () => {
  it('mengembalikan items + meta dari service', async () => {
    stockService.getAllStockOutPaginated.mockResolvedValue(pageOf());
    const params = { page: 1, limit: 20 };

    const { result } = renderHook(() => useStockOutPaginated(params), {
      wrapper: makeHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.meta).toEqual(pageOf().meta);
    expect(stockService.getAllStockOutPaginated).toHaveBeenCalledWith(params);
  });

  it('invalidasi STOCK_OUT_KEY menyegarkan daftar ber-paginasi', async () => {
    stockService.getAllStockOutPaginated.mockResolvedValue(pageOf());
    const client = makeQueryClient();

    const { result } = renderHook(() => useStockOutPaginated({ page: 1, limit: 20 }), {
      wrapper: makeHookWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await client.invalidateQueries({ queryKey: STOCK_OUT_KEY });
    });

    await waitFor(() =>
      expect(stockService.getAllStockOutPaginated).toHaveBeenCalledTimes(2),
    );
  });

  it('sub-key daftar berada di bawah STOCK_OUT_KEY', () => {
    expect(STOCK_OUT_LIST_KEY.slice(0, STOCK_OUT_KEY.length)).toEqual([...STOCK_OUT_KEY]);
  });
});
