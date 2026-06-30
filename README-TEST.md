# 🧪 Panduan Test — QasirKu (Frontend)

Test frontend memakai **Vitest** + **React Testing Library** (environment `jsdom`).

## Menjalankan test

```bash
npm test               # jalankan semua test sekali (CI)
npm run test:watch     # watch mode — re-run otomatis saat file disimpan

# Subset tertentu
npx vitest run src/services                              # satu folder
npx vitest run src/hooks/__tests__/use-auth.test.tsx     # satu file
npx vitest run -t "idempotency"                          # filter by nama test
npx vitest run --reporter=verbose                        # tampilkan nama tiap test
```

## Struktur

Test diletakkan di folder `__tests__/` bersebelahan dengan kode yang diuji:

```
src/
├── services/__tests__/services.test.ts   # 14 service — endpoint, params, normalisasi, idempotency key
├── lib/__tests__/                         # auth, utils, api interceptor (401), image scaling
├── hooks/__tests__/                       # use-auth, use-transactions, use-products, use-mobile
├── components/__tests__/                  # NumberInput, SearchableSelect, guards, ErrorBoundary
├── pages/__tests__/                       # Login (flow PIN), Cashier (gerbang izin)
└── test/
    ├── setup.ts                           # global (matchMedia stub) — dari vitest.config.ts
    └── utils.tsx                          # renderWithProviders, makeHookWrapper
```

Konfigurasi ada di `vitest.config.ts` (alias `@` → `src/`, setup file, environment jsdom).

## Cakupan

| Layer | Fokus |
|-------|-------|
| **Services** | Semua service memanggil endpoint benar, meneruskan params, unwrap `data.data`. Transaksi: normalisasi angka string→number + idempotency `receiptNumber`. |
| **Lib** | Decode JWT & permission, login/logout, `cn`, interceptor 401 (logout vs hindari loop di `/login`), scaling gambar. |
| **Hooks** | Inisialisasi sesi (token→server, akun nonaktif, offline), toast & invalidate cache pada mutation, breakpoint mobile. |
| **Components** | Format/parse angka id-ID, dropdown cari & pilih, LockedPage owner-vs-staff, redirect RequireAuth, fallback ErrorBoundary. |
| **Pages** | Login: flow username→PIN, auto-submit 6 digit, error reset. Cashier: gerbang izin `create_transaction`. |

## Menulis test baru

Gunakan helper di `src/test/utils.tsx`:

```tsx
// Komponen yang butuh react-query + router
import { renderWithProviders } from '@/test/utils';
renderWithProviders(<MyPage />, { route: '/products' });

// Hook react-query
import { renderHook } from '@testing-library/react';
import { makeHookWrapper } from '@/test/utils';
renderHook(() => useProducts(), { wrapper: makeHookWrapper() });
```

Mock `@/lib/api` dengan `vi.hoisted` agar tersedia saat factory `vi.mock` di-hoist:

```ts
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: api }));
```

Konvensi: file `*.test.ts(x)` di dalam `__tests__/`, deskripsi test berbahasa Indonesia mengikuti gaya kode yang ada.
