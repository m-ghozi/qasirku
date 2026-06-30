import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const productService = vi.hoisted(() => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/services/product.service', () => ({ productService }));
vi.mock('sonner', () => ({ toast }));

import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/use-products';
import { makeHookWrapper } from '@/test/utils';

beforeEach(() => vi.clearAllMocks());

describe('useProducts (query wrapper representatif)', () => {
  it('mengembalikan data dari service', async () => {
    productService.getAll.mockResolvedValue([{ id: 1, name: 'Kopi' }]);
    const { result } = renderHook(() => useProducts(), { wrapper: makeHookWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('Kopi');
  });
});

describe('mutations produk (pola toast sukses/error)', () => {
  it('create sukses → toast sukses', async () => {
    productService.create.mockResolvedValue({ id: 1 });
    const { result } = renderHook(() => useCreateProduct(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ name: 'X', sku: 'X', categoryId: 1, price: 1, hpp: 0, unit: 'pcs' });
    });
    expect(toast.success).toHaveBeenCalledWith('Produk berhasil ditambahkan');
  });

  it('update error → toast pesan backend', async () => {
    productService.update.mockRejectedValue({ response: { data: { message: 'SKU duplikat' } } });
    const { result } = renderHook(() => useUpdateProduct(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: 1, payload: { sku: 'DUP' } }).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith('SKU duplikat');
  });

  it('delete error tanpa pesan → fallback default', async () => {
    productService.delete.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDeleteProduct(), { wrapper: makeHookWrapper() });
    await act(async () => {
      await result.current.mutateAsync(1).catch(() => {});
    });
    expect(toast.error).toHaveBeenCalledWith('Gagal menghapus produk');
  });
});
