import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Cashier bergantung pada banyak hook — semua di-stub agar render deterministik.
// Fokus test: gerbang izin (LockedPage saat tanpa create_transaction) + render dasar.
const can = vi.hoisted(() => vi.fn());
const isPending = vi.hoisted(() => ({ value: false }));

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ can, isOwner: false }) }));
vi.mock('@/hooks/use-products', () => ({
  useProducts: () => ({ data: [{ id: 1, name: 'Kopi', price: 5000, stock: 10, sku: 'K1', categoryId: 1 }], isLoading: false }),
  PRODUCT_KEY: ['products'],
}));
vi.mock('@/hooks/use-categories', () => ({ useCategories: () => ({ data: [] }) }));
vi.mock('@/hooks/use-payment-methods', () => ({ usePaymentMethods: () => ({ data: [] }) }));
vi.mock('@/hooks/use-customers', () => ({ useCustomers: () => ({ data: [] }) }));
vi.mock('@/hooks/use-store-setting', () => ({ useStoreSetting: () => ({ data: undefined }) }));
vi.mock('@/hooks/use-transactions', () => ({
  useOpenBills: () => ({ data: [] }),
  useCreateTransaction: () => ({ mutate: vi.fn(), get isPending() { return isPending.value; } }),
  usePayHold: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelTransaction: () => ({ mutate: vi.fn(), isPending: false }),
}));
// Komponen berat (kamera/canvas) — stub agar tidak load di jsdom
vi.mock('@/components/BarcodeScanner', () => ({ default: () => null }));
vi.mock('@/components/Receipt', () => ({ default: () => null }));
vi.mock('@/components/CustomerPicker', () => ({ default: () => null }));

import Kasir from '@/pages/Cashier';

function renderKasir() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Kasir /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  isPending.value = false;
});

describe('Cashier — gerbang izin', () => {
  it('tanpa izin create_transaction → LockedPage', () => {
    can.mockReturnValue(false);
    renderKasir();
    expect(screen.getByText('Akses dikunci')).toBeInTheDocument();
    expect(screen.queryByText('Kopi')).not.toBeInTheDocument();
  });

  it('dengan izin → render kasir & daftar produk', () => {
    can.mockImplementation((k: string) => k === 'create_transaction');
    renderKasir();
    expect(screen.queryByText('Akses dikunci')).not.toBeInTheDocument();
    expect(screen.getByText('Kopi')).toBeInTheDocument();
  });
});
