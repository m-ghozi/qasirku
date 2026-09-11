import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Ditangkap agar payload yang dikirim ke backend bisa diperiksa.
const createMutate = vi.hoisted(() => vi.fn());

// Halaman Produk bergantung pada banyak hook — semuanya di-stub agar render
// deterministik. Fokus test: keterkaitan Harga Jual / HPP / Margin %.
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ can: () => true, isOwner: true }) }));
vi.mock('@/hooks/use-products', () => ({
  useProducts: () => ({
    data: [
      {
        id: 1,
        name: 'Kopi Susu',
        sku: 'KS001',
        categoryId: 1,
        price: 15000,
        hpp: 10000,
        stock: 12,
        unit: 'pcs',
        isDeleted: false,
      },
    ],
    isLoading: false,
  }),
  useCreateProduct: () => ({ mutate: createMutate, isPending: false }),
  useUpdateProduct: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProduct: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/use-categories', () => ({
  useCategories: () => ({ data: [{ id: 1, name: 'Minuman', icon: '🥤', color: '#f00' }] }),
}));
vi.mock('@/hooks/use-units', () => ({
  useUnits: () => ({ data: [{ name: 'pcs', isDefault: true }] }),
}));
// Komponen kamera/scanner berat — stub agar tidak load di jsdom
vi.mock('@/components/BarcodeScanner', () => ({ default: () => null }));
vi.mock('@/components/CameraCapture', () => ({ default: () => null }));

import Produk from '@/pages/Products';

const renderPage = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Produk />
    </MemoryRouter>,
  );

/** Buka dialog tambah produk dan kembalikan ketiga kolom harga. */
function openAddDialog() {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /^tambah$/i }));
  return {
    priceInput: screen.getByPlaceholderText('15.000'),
    hppInput: screen.getByPlaceholderText('10.000'),
    marginInput: screen.getByPlaceholderText('33,3'),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Produk — kolom margin', () => {
  it('kolom margin mati sampai HPP diisi', () => {
    const { marginInput } = openAddDialog();
    expect(marginInput).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('10.000'), { target: { value: '10000' } });
    expect(marginInput).not.toBeDisabled();
  });

  it('mengisi margin menghitung harga jual otomatis', () => {
    const { priceInput, hppInput, marginInput } = openAddDialog();
    fireEvent.change(hppInput, { target: { value: '10000' } });
    fireEvent.change(marginInput, { target: { value: '50' } });

    // margin 50% dari HPP 10.000 → harga jual 20.000
    expect(priceInput).toHaveValue('20.000');
  });

  it('mengisi harga jual menghitung margin otomatis', () => {
    const { priceInput, hppInput, marginInput } = openAddDialog();
    fireEvent.change(hppInput, { target: { value: '10000' } });
    fireEvent.change(priceInput, { target: { value: '15000' } });

    expect(marginInput).toHaveValue('33,3');
  });

  it('menampilkan laba per unit', () => {
    const { hppInput } = openAddDialog();
    fireEvent.change(hppInput, { target: { value: '10000' } });
    fireEvent.change(screen.getByPlaceholderText('15.000'), { target: { value: '15000' } });

    expect(screen.getByText('Laba Rp 5.000/pcs • margin 33,3%')).toBeInTheDocument();
  });

  it('menolak margin >= 100% dan tidak mengubah harga jual', () => {
    const { priceInput, hppInput, marginInput } = openAddDialog();
    fireEvent.change(hppInput, { target: { value: '10000' } });
    fireEvent.change(marginInput, { target: { value: '100' } });

    expect(priceInput).toHaveValue('');
    expect(screen.getByText('Margin harus di bawah 100%.')).toBeInTheDocument();
  });

  it('margin tidak ikut terkirim ke backend', () => {
    const { hppInput, marginInput } = openAddDialog();
    fireEvent.change(screen.getByPlaceholderText('Contoh: Nasi Goreng'), {
      target: { value: 'Teh Manis' },
    });
    fireEvent.change(screen.getByPlaceholderText('Wajib diisi, contoh: NG001'), {
      target: { value: 'TM001' },
    });
    fireEvent.change(hppInput, { target: { value: '10000' } });
    fireEvent.change(marginInput, { target: { value: '50' } });

    fireEvent.click(screen.getByRole('button', { name: /^tambah produk$/i }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    const payload = createMutate.mock.calls[0][0];
    expect(payload.price).toBe(20000);
    expect(payload.hpp).toBe(10000);
    expect(payload).not.toHaveProperty('margin');
    expect(payload).not.toHaveProperty('marginPercent');
  });
});
