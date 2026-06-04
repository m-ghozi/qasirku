/**
 * seed-default-data.ts
 *
 * seedDefaultData() — dipanggil SELALU saat onboarding selesai.
 *   Mengisi master data awal via API: satuan, kategori produk,
 *   kategori pengeluaran, dan metode pembayaran.
 *   Idempotent: GET dulu, POST hanya untuk yang belum ada.
 *
 * seedDummyData() — dipanggil HANYA jika user toggle "Muat data contoh".
 *   Mengisi produk, supplier, dan transaksi demo khas toserba.
 *   Bergantung pada seedDefaultData() yang sudah berjalan terlebih dahulu.
 */

import api from '@/lib/api';

// ─── Master data ─────────────────────────────────────────────────────────────

const DEFAULT_UNITS = [
  'pcs', 'buah', 'lusin', 'kodi', 'gross',
  'dus', 'karton', 'pak',
  'kg', 'gram', 'ons',
  'liter', 'ml', 'botol', 'kaleng',
  'bungkus', 'sachet',
  'meter', 'roll', 'lembar',
  'set', 'pasang',
];

const DEFAULT_PRODUCT_CATEGORIES = [
  { name: 'Sembako',         color: '#F97316', icon: '🛒' },
  { name: 'Minuman',         color: '#3B82F6', icon: '🥤' },
  { name: 'Makanan & Snack', color: '#F59E0B', icon: '🍿' },
  { name: 'Kebersihan',      color: '#10B981', icon: '🧼' },
  { name: 'Perawatan Diri',  color: '#EC4899', icon: '🧴' },
  { name: 'Kesehatan',       color: '#EF4444', icon: '💊' },
  { name: 'Rumah Tangga',    color: '#8B5CF6', icon: '🏠' },
  { name: 'Alat Tulis',      color: '#6366F1', icon: '✏️'  },
  { name: 'Pulsa & Token',   color: '#06B6D4', icon: '📱' },
  { name: 'Rokok',           color: '#78716C', icon: '🚬' },
  { name: 'Lainnya',         color: '#6B7280', icon: '📦' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Listrik & Air', color: '#FBBF24', icon: '💡' },
  { name: 'Sewa',          color: '#8B5CF6', icon: '🏠' },
  { name: 'Gaji',          color: '#10B981', icon: '👤' },
  { name: 'Transport',     color: '#3B82F6', icon: '🚚' },
  { name: 'Operasional',   color: '#F97316', icon: '🧰' },
  { name: 'Pembelian',     color: '#EF4444', icon: '🛍️' },
  { name: 'Perawatan',     color: '#06B6D4', icon: '🔧' },
  { name: 'Lainnya',       color: '#6B7280', icon: '📦' },
];

const DEFAULT_PAYMENT_METHODS = [
  { name: 'Tunai',         category: 'tunai',    isDefault: true  },
  { name: 'Transfer Bank', category: 'transfer', isDefault: false },
  { name: 'QRIS',          category: 'qris',     isDefault: false },
  { name: 'E-Wallet',      category: 'e-wallet', isDefault: false },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

/** POST satu item, abaikan 409 (sudah ada) — lempar error lain. */
async function postIfNotConflict(endpoint: string, body: object): Promise<void> {
  try {
    await api.post(endpoint, body);
  } catch (err: any) {
    if (err.response?.status !== 409) throw err;
  }
}

// ─── seedDefaultData ──────────────────────────────────────────────────────────

export async function seedDefaultData(): Promise<void> {
  // Jalankan semua GET secara paralel untuk efisiensi
  const [unitsRes, categoriesRes, expCatsRes, paymentMethodsRes] = await Promise.all([
    api.get('/units'),
    api.get('/categories'),
    api.get('/expense-categories'),
    api.get('/payment-methods?includeInactive=true'),
  ]);

  const existingUnits      = new Set<string>((unitsRes.data.data          ?? []).map((u: any) => u.name));
  const existingCategories = new Set<string>((categoriesRes.data.data     ?? []).map((c: any) => c.name));
  const existingExpCats    = new Set<string>((expCatsRes.data.data        ?? []).map((c: any) => c.name));
  const existingPMs        = new Set<string>((paymentMethodsRes.data.data ?? []).map((p: any) => p.name));

  // POST secara sekuensial untuk menghindari race condition di DB
  for (const name of DEFAULT_UNITS) {
    if (!existingUnits.has(name)) {
      await postIfNotConflict('/units', { name, isDefault: true });
    }
  }

  for (const cat of DEFAULT_PRODUCT_CATEGORIES) {
    if (!existingCategories.has(cat.name)) {
      await postIfNotConflict('/categories', cat);
    }
  }

  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    if (!existingExpCats.has(cat.name)) {
      await postIfNotConflict('/expense-categories', cat);
    }
  }

  for (const pm of DEFAULT_PAYMENT_METHODS) {
    if (!existingPMs.has(pm.name)) {
      await postIfNotConflict('/payment-methods', pm);
    }
  }
}

// ─── seedDummyData ────────────────────────────────────────────────────────────

export async function seedDummyData(): Promise<void> {
  // Ambil kategori yang sudah dibuat oleh seedDefaultData()
  const { data: catRes } = await api.get('/categories');
  const categories: { id: number; name: string }[] = catRes.data ?? [];
  const catId = (name: string): number => categories.find(c => c.name === name)?.id ?? categories[0]?.id;

  const dummyProducts = [
    // Sembako
    { name: 'Beras Premium 5kg',      sku: 'BR001', categoryId: catId('Sembako'),         price: 75000, hpp: 62000, stock: 50,  unit: 'karton'  },
    { name: 'Minyak Goreng 2L',       sku: 'MG001', categoryId: catId('Sembako'),         price: 32000, hpp: 26000, stock: 40,  unit: 'botol'   },
    { name: 'Gula Pasir 1kg',         sku: 'GP001', categoryId: catId('Sembako'),         price: 16000, hpp: 13000, stock: 60,  unit: 'bungkus' },
    { name: 'Tepung Terigu 1kg',      sku: 'TT001', categoryId: catId('Sembako'),         price: 13000, hpp: 10500, stock: 45,  unit: 'bungkus' },
    // Minuman
    { name: 'Air Mineral 600ml',      sku: 'AM001', categoryId: catId('Minuman'),         price:  4000, hpp:  2500, stock: 120, unit: 'botol'   },
    { name: 'Teh Botol Sosro 350ml',  sku: 'TB001', categoryId: catId('Minuman'),         price:  5000, hpp:  3500, stock: 96,  unit: 'botol'   },
    { name: 'Susu UHT Full Cream 1L', sku: 'SU001', categoryId: catId('Minuman'),         price: 20000, hpp: 16000, stock: 36,  unit: 'karton'  },
    // Makanan & Snack
    { name: 'Mie Instan Goreng',      sku: 'MI001', categoryId: catId('Makanan & Snack'), price:  3500, hpp:  2500, stock: 200, unit: 'pcs'     },
    { name: 'Kerupuk Udang 200g',     sku: 'KU001', categoryId: catId('Makanan & Snack'), price: 12000, hpp:  8500, stock: 60,  unit: 'bungkus' },
    // Kebersihan
    { name: 'Sabun Mandi Batang',     sku: 'SM001', categoryId: catId('Kebersihan'),      price:  5000, hpp:  3500, stock: 80,  unit: 'buah'    },
    { name: 'Deterjen Bubuk 1kg',     sku: 'DB001', categoryId: catId('Kebersihan'),      price: 18000, hpp: 13000, stock: 50,  unit: 'bungkus' },
    // Rokok
    { name: 'Rokok Kretek Filter',    sku: 'RK001', categoryId: catId('Rokok'),           price: 25000, hpp: 22000, stock: 100, unit: 'bungkus' },
  ];

  const dummySuppliers = [
    { name: 'PT Sembako Makmur', phone: '08111222333', address: 'Jl. Pasar Induk No. 5',    notes: 'Supplier sembako & minuman' },
    { name: 'UD Sumber Jaya',    phone: '08222333444', address: 'Jl. Raya Industri No. 12', notes: 'Supplier snack & rokok'     },
  ];

  // POST produk & supplier — abaikan duplikat (409)
  for (const product of dummyProducts) {
    await postIfNotConflict('/products', product);
  }
  for (const supplier of dummySuppliers) {
    await postIfNotConflict('/suppliers', supplier);
  }

  // Ambil produk yang baru dibuat untuk dapat id-nya
  const { data: prodRes } = await api.get('/products');
  const products: { id: number; sku: string }[] = prodRes.data ?? [];
  const pid = (sku: string): number => products.find(p => p.sku === sku)?.id ?? products[0]?.id;

  // Transaksi demo
  const transactions = [
    {
      receiptNumber: 'TX-DEMO-001',
      subtotal: 79000, discountType: null, discountValue: 0, discountAmount: 0, total: 79000,
      paymentMethodId: 1, paymentAmount: 80000, change: 1000, profit: 13000,
      items: [
        { productId: pid('BR001'), quantity: 1, price: 75000, hpp: 62000, discountType: null, discountValue: 0, discountAmount: 0 },
        { productId: pid('AM001'), quantity: 1, price:  4000, hpp:  2500, discountType: null, discountValue: 0, discountAmount: 0 },
      ],
    },
    {
      receiptNumber: 'TX-DEMO-002',
      subtotal: 27500, discountType: null, discountValue: 0, discountAmount: 0, total: 27500,
      paymentMethodId: 3, paymentAmount: 27500, change: 0, profit: 8000,
      items: [
        { productId: pid('MI001'), quantity: 5, price: 3500, hpp: 2500, discountType: null, discountValue: 0, discountAmount: 0 },
        { productId: pid('SM001'), quantity: 2, price: 5000, hpp: 3500, discountType: null, discountValue: 0, discountAmount: 0 },
      ],
    },
    {
      receiptNumber: 'TX-DEMO-003',
      subtotal: 68000, discountType: 'percentage', discountValue: 5, discountAmount: 3400, total: 64600,
      paymentMethodId: 1, paymentAmount: 65000, change: 400, profit: 9100,
      items: [
        { productId: pid('MG001'), quantity: 1, price: 32000, hpp: 26000, discountType: null, discountValue: 0, discountAmount: 0 },
        { productId: pid('GP001'), quantity: 1, price: 16000, hpp: 13000, discountType: null, discountValue: 0, discountAmount: 0 },
        { productId: pid('TB001'), quantity: 4, price:  5000, hpp:  3500, discountType: null, discountValue: 0, discountAmount: 0 },
      ],
    },
  ];

  for (const tx of transactions) {
    await postIfNotConflict('/transactions', tx);
  }
}