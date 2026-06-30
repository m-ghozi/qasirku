import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the shared axios instance ──────────────────────────────────────────
// Semua service mengimpor `api` (default export) dari '@/lib/api'.
// vi.hoisted agar `api` tersedia saat factory vi.mock (yang di-hoist) berjalan.
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock('@/lib/api', () => ({ default: api }));

import { categoryService } from '@/services/category.service';
import { customerService } from '@/services/customer.service';
import { dashboardService } from '@/services/dashboard.service';
import { expenseService, expenseCategoryService } from '@/services/expense.service';
import { paymentMethodService } from '@/services/paymentMethod.service';
import { productService } from '@/services/product.service';
import { reportService } from '@/services/report.service';
import { stockService } from '@/services/stock.service';
import { storeSettingService } from '@/services/storeSetting.service';
import { supplierService } from '@/services/supplier.service';
import { unitService } from '@/services/unit.service';
import { userService } from '@/services/user.service';
import { transactionService } from '@/services/transaction.service';

/** Helper: bikin api.<method> resolve `{ data: { data: payload } }` (bentuk respons backend). */
function resolveData(method: keyof typeof api, payload: unknown) {
  api[method].mockResolvedValueOnce({ data: { data: payload } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── CRUD services (pola identik: unwrap data.data) ──────────────────────────

describe('categoryService', () => {
  it('getAll → GET /categories dan unwrap data.data', async () => {
    resolveData('get', [{ id: 1, name: 'Minuman' }]);
    const res = await categoryService.getAll();
    expect(api.get).toHaveBeenCalledWith('/categories');
    expect(res).toEqual([{ id: 1, name: 'Minuman' }]);
  });

  it('getById → GET /categories/:id', async () => {
    resolveData('get', { id: 5 });
    await categoryService.getById(5);
    expect(api.get).toHaveBeenCalledWith('/categories/5');
  });

  it('create → POST /categories meneruskan payload', async () => {
    const payload = { name: 'Snack', color: '#fff', icon: 'x' };
    resolveData('post', { id: 9, ...payload });
    const res = await categoryService.create(payload);
    expect(api.post).toHaveBeenCalledWith('/categories', payload);
    expect(res.id).toBe(9);
  });

  it('update → PUT /categories/:id', async () => {
    resolveData('put', { id: 3 });
    await categoryService.update(3, { name: 'Baru' });
    expect(api.put).toHaveBeenCalledWith('/categories/3', { name: 'Baru' });
  });

  it('delete → DELETE /categories/:id', async () => {
    api.delete.mockResolvedValueOnce({});
    await categoryService.delete(7);
    expect(api.delete).toHaveBeenCalledWith('/categories/7');
  });
});

describe('customerService', () => {
  it('getAll tanpa search → params undefined', async () => {
    resolveData('get', []);
    await customerService.getAll();
    expect(api.get).toHaveBeenCalledWith('/customers', { params: undefined });
  });

  it('getAll dengan search → kirim params.search', async () => {
    resolveData('get', []);
    await customerService.getAll('budi');
    expect(api.get).toHaveBeenCalledWith('/customers', { params: { search: 'budi' } });
  });

  it('getTransactions → GET /customers/:id/transactions', async () => {
    resolveData('get', { customer: { id: 1 }, summary: {}, transactions: [] });
    const res = await customerService.getTransactions(1);
    expect(api.get).toHaveBeenCalledWith('/customers/1/transactions');
    expect(res.customer.id).toBe(1);
  });
});

describe('dashboardService', () => {
  it('getSummary → GET /dashboard', async () => {
    resolveData('get', { stats: { todayRevenue: 100 } });
    const res = await dashboardService.getSummary();
    expect(api.get).toHaveBeenCalledWith('/dashboard');
    expect(res.stats.todayRevenue).toBe(100);
  });
});

describe('expenseService', () => {
  it('getAll meneruskan filters sebagai params', async () => {
    resolveData('get', []);
    await expenseService.getAll({ range: '7', categoryId: 2 });
    expect(api.get).toHaveBeenCalledWith('/expenses', { params: { range: '7', categoryId: 2 } });
  });

  it('getAll default → params kosong', async () => {
    resolveData('get', []);
    await expenseService.getAll();
    expect(api.get).toHaveBeenCalledWith('/expenses', { params: {} });
  });

  it('getSummary → GET /expenses/summary', async () => {
    resolveData('get', { totalAmount: '0', totalCount: 0, byCategory: [] });
    await expenseService.getSummary({ range: 'today' });
    expect(api.get).toHaveBeenCalledWith('/expenses/summary', { params: { range: 'today' } });
  });

  it('create → POST /expenses', async () => {
    const payload = { title: 'Listrik', categoryId: 1, amount: 5000, date: '2026-01-01' };
    resolveData('post', { id: 1, ...payload });
    await expenseService.create(payload);
    expect(api.post).toHaveBeenCalledWith('/expenses', payload);
  });
});

describe('expenseCategoryService', () => {
  it('getAll → GET /expense-categories', async () => {
    resolveData('get', []);
    await expenseCategoryService.getAll();
    expect(api.get).toHaveBeenCalledWith('/expense-categories');
  });

  it('delete → DELETE /expense-categories/:id', async () => {
    api.delete.mockResolvedValueOnce({});
    await expenseCategoryService.delete(4);
    expect(api.delete).toHaveBeenCalledWith('/expense-categories/4');
  });
});

describe('paymentMethodService', () => {
  it('getAll default → tanpa includeInactive', async () => {
    resolveData('get', []);
    await paymentMethodService.getAll();
    expect(api.get).toHaveBeenCalledWith('/payment-methods', { params: undefined });
  });

  it('getAll(true) → params.includeInactive', async () => {
    resolveData('get', []);
    await paymentMethodService.getAll(true);
    expect(api.get).toHaveBeenCalledWith('/payment-methods', { params: { includeInactive: 'true' } });
  });

  it('deactivate → PATCH .../deactivate', async () => {
    resolveData('patch', { id: 1, isActive: false });
    const res = await paymentMethodService.deactivate(1);
    expect(api.patch).toHaveBeenCalledWith('/payment-methods/1/deactivate');
    expect(res.isActive).toBe(false);
  });

  it('setDefault → PATCH .../set-default', async () => {
    resolveData('patch', { id: 2, isDefault: true });
    await paymentMethodService.setDefault(2);
    expect(api.patch).toHaveBeenCalledWith('/payment-methods/2/set-default');
  });

  it('hardDelete → DELETE /payment-methods/:id', async () => {
    api.delete.mockResolvedValueOnce({});
    await paymentMethodService.hardDelete(3);
    expect(api.delete).toHaveBeenCalledWith('/payment-methods/3');
  });
});

describe('productService', () => {
  it('getAll → GET /products', async () => {
    resolveData('get', [{ id: 1, name: 'Kopi' }]);
    const res = await productService.getAll();
    expect(api.get).toHaveBeenCalledWith('/products');
    expect(res[0].name).toBe('Kopi');
  });

  it('create → POST /products', async () => {
    const payload = { name: 'Teh', sku: 'TEH', categoryId: 1, price: 5000, hpp: 2000, unit: 'pcs' };
    resolveData('post', { id: 2, ...payload });
    await productService.create(payload);
    expect(api.post).toHaveBeenCalledWith('/products', payload);
  });
});

describe('reportService', () => {
  it('getReport → GET /reports?period', async () => {
    resolveData('get', { period: 7 });
    await reportService.getReport(7);
    expect(api.get).toHaveBeenCalledWith('/reports', { params: { period: 7 } });
  });

  it('getDailyReport → GET /reports?date', async () => {
    resolveData('get', { stats: {} });
    await reportService.getDailyReport('2026-06-30');
    expect(api.get).toHaveBeenCalledWith('/reports', { params: { date: '2026-06-30' } });
  });
});

describe('stockService', () => {
  it('getAllStockIn tanpa from → params undefined', async () => {
    resolveData('get', []);
    await stockService.getAllStockIn();
    expect(api.get).toHaveBeenCalledWith('/stocks/in', { params: undefined });
  });

  it('getAllStockIn dengan from → params.from', async () => {
    resolveData('get', []);
    await stockService.getAllStockIn('2026-01-01');
    expect(api.get).toHaveBeenCalledWith('/stocks/in', { params: { from: '2026-01-01' } });
  });

  it('createStockOut → POST /stocks/out', async () => {
    const payload = { productId: 1, quantity: 2, reason: 'rusak' };
    resolveData('post', { id: 1, ...payload });
    await stockService.createStockOut(payload);
    expect(api.post).toHaveBeenCalledWith('/stocks/out', payload);
  });

  it('getReport → GET /stocks/report?period', async () => {
    resolveData('get', { summary: {} });
    await stockService.getReport('30');
    expect(api.get).toHaveBeenCalledWith('/stocks/report', { params: { period: '30' } });
  });
});

describe('storeSettingService', () => {
  it('get → GET /store-settings', async () => {
    resolveData('get', { id: 1, storeName: 'Toko' });
    const res = await storeSettingService.get();
    expect(api.get).toHaveBeenCalledWith('/store-settings');
    expect(res.storeName).toBe('Toko');
  });

  it('update memetakan field FE → nama field backend', async () => {
    resolveData('put', { id: 1, storeName: 'Baru' });
    await storeSettingService.update({
      storeName: 'Baru',
      address: 'Jl. A',
      phone: '08',
      receiptFooter: 'Terima kasih',
    });
    expect(api.put).toHaveBeenCalledWith('/store-settings', {
      name: 'Baru',
      address: 'Jl. A',
      phone: '08',
      footerReceipt: 'Terima kasih',
    });
  });

  it('update menyertakan logo/themeColor/onboardingDone hanya jika dikirim', async () => {
    resolveData('put', { id: 1 });
    await storeSettingService.update({ storeName: 'X', themeColor: '25', logo: null });
    const body = api.put.mock.calls[0][1];
    expect(body.themeColor).toBe('25');
    expect(body.logo).toBeNull();
    expect('onboardingDone' in body).toBe(false);
  });
});

describe('supplierService & unitService (CRUD pola sama)', () => {
  it('supplier.getAll → GET /suppliers', async () => {
    resolveData('get', []);
    await supplierService.getAll();
    expect(api.get).toHaveBeenCalledWith('/suppliers');
  });

  it('unit.create → POST /units', async () => {
    resolveData('post', { id: 1, name: 'box' });
    await unitService.create({ name: 'box' });
    expect(api.post).toHaveBeenCalledWith('/units', { name: 'box' });
  });
});

describe('userService', () => {
  it('getMe → GET /users/me', async () => {
    resolveData('get', { id: 1, role: 'owner' });
    const res = await userService.getMe();
    expect(api.get).toHaveBeenCalledWith('/users/me');
    expect(res.role).toBe('owner');
  });

  it('create → POST /users', async () => {
    const payload = { username: 'staff1', name: 'Staff', pin: '1234' };
    resolveData('post', { id: 2, ...payload });
    await userService.create(payload);
    expect(api.post).toHaveBeenCalledWith('/users', payload);
  });
});

// ── transactionService: logika normalisasi & idempotency ────────────────────

describe('transactionService.create (idempotency)', () => {
  it('meneruskan receiptNumber sebagai idempotency key', async () => {
    resolveData('post', { id: 1, receiptNumber: 'TX123', total: '0', subtotal: '0' });
    await transactionService.create({
      items: [{ productId: 1, quantity: 1 }],
      receiptNumber: 'TX123',
    });
    expect(api.post).toHaveBeenCalledWith('/transactions', {
      items: [{ productId: 1, quantity: 1 }],
      receiptNumber: 'TX123',
    });
  });
});

describe('transactionService normalisasi', () => {
  it('mengubah string angka backend → number, dan mengisi getter item', async () => {
    resolveData('get', [
      {
        id: 1,
        receiptNumber: 'TX1',
        subtotal: '15000',
        total: '15000',
        discountValue: '0',
        change: '5000',
        profit: '7000',
        status: 'completed',
        items: [
          { id: 1, productId: 9, totalPrice: 15000, product: { id: 9, name: 'Kopi', sku: 'K' } },
        ],
      },
    ]);
    const [tx] = await transactionService.getAll();
    expect(tx.subtotal).toBe(15000);
    expect(typeof tx.total).toBe('number');
    expect(tx.change).toBe(5000);
    // getter item: productName dari product.name, subtotal alias totalPrice
    expect(tx.items![0].productName).toBe('Kopi');
    expect(tx.items![0].subtotal).toBe(15000);
  });

  it('getById menormalkan satu transaksi', async () => {
    resolveData('get', { id: 2, receiptNumber: 'TX2', subtotal: '1000', total: '1000' });
    const tx = await transactionService.getById(2);
    expect(api.get).toHaveBeenCalledWith('/transactions/2');
    expect(tx.subtotal).toBe(1000);
  });

  it('payHold mem-fetch ulang bila response tanpa items (struk lengkap)', async () => {
    // PUT /pay → tanpa items
    resolveData('put', { id: 3, receiptNumber: 'TX3', subtotal: '2000', total: '2000', items: [] });
    // fallback getById → dengan items
    resolveData('get', {
      id: 3,
      receiptNumber: 'TX3',
      subtotal: '2000',
      total: '2000',
      items: [{ id: 1, productId: 1, totalPrice: 2000 }],
    });
    const tx = await transactionService.payHold(3, { paymentMethodId: 1, paymentAmount: 2000, change: 0 });
    expect(api.put).toHaveBeenCalledWith('/transactions/3/pay', {
      paymentMethodId: 1,
      paymentAmount: 2000,
      change: 0,
    });
    expect(api.get).toHaveBeenCalledWith('/transactions/3');
    expect(tx.items).toHaveLength(1);
  });

  it('cancel → DELETE /transactions/:id', async () => {
    api.delete.mockResolvedValueOnce({});
    await transactionService.cancel(5);
    expect(api.delete).toHaveBeenCalledWith('/transactions/5');
  });
});
