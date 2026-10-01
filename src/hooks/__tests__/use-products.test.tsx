import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const productService = vi.hoisted(() => ({
  getAll: vi.fn(),
  getPaginated: vi.fn(),
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
  useProductsPaginated,
  PRODUCT_KEY,
  PRODUCT_LIST_KEY,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/use-products';
import { makeHookWrapper, makeQueryClient } from '@/test/utils';

beforeEach(() => vi.clearAllMocks());

describe('useProducts (query wrapper representatif)', () => {
  it('mengembalikan data dari service', async () => {
    productService.getAll.mockResolvedValue([{ id: 1, name: 'Kopi' }]);
    const { result } = renderHook(() => useProducts(), { wrapper: makeHookWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('Kopi');
  });
});

describe('useProductsPaginated', () => {
  const meta = { page: 1, limit: 20, total: 42, totalPages: 3 };

  beforeEach(() => {
    productService.getPaginated.mockResolvedValue({
      items: [{ id: 1, name: 'Kopi' }],
      meta,
    });
  });

  it('mengembalikan items + meta dari service', async () => {
    const { result } = renderHook(() => useProductsPaginated({ page: 1, limit: 20 }), {
      wrapper: makeHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items?.[0].name).toBe('Kopi');
    expect(result.current.data?.meta).toEqual(meta);
  });

  it('meneruskan kriteria halaman ke service', async () => {
    const params = { page: 3, limit: 50, search: 'kopi', categoryId: 7 };
    const { result } = renderHook(() => useProductsPaginated(params), {
      wrapper: makeHookWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(productService.getPaginated).toHaveBeenCalledWith(params);
  });

  it('halaman berbeda memakai cache terpisah', async () => {
    const client = makeQueryClient();
    const wrapper = makeHookWrapper(client);

    renderHook(() => useProductsPaginated({ page: 1, limit: 20 }), { wrapper });
    renderHook(() => useProductsPaginated({ page: 2, limit: 20 }), { wrapper });

    await waitFor(() => expect(productService.getPaginated).toHaveBeenCalledTimes(2));
    expect(productService.getPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(productService.getPaginated).toHaveBeenCalledWith({ page: 2, limit: 20 });
  });

  // Inti dari penataan query key: mutasi produk hanya meng-invalidate
  // PRODUCT_KEY, jadi daftar ber-paginasi harus berada di bawah prefix itu.
  it('sub-key daftar berada di bawah PRODUCT_KEY', () => {
    expect(PRODUCT_LIST_KEY.slice(0, PRODUCT_KEY.length)).toEqual([...PRODUCT_KEY]);
  });

  it('invalidasi PRODUCT_KEY menyegarkan daftar ber-paginasi', async () => {
    const client = makeQueryClient();
    const { result } = renderHook(() => useProductsPaginated({ page: 1, limit: 20 }), {
      wrapper: makeHookWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(productService.getPaginated).toHaveBeenCalledTimes(1);

    await act(async () => {
      await client.invalidateQueries({ queryKey: PRODUCT_KEY });
    });

    await waitFor(() => expect(productService.getPaginated).toHaveBeenCalledTimes(2));
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
