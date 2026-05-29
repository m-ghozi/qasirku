import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export type PermissionKey =
  | 'create_transaction'
  | 'delete_transaction'
  | 'manage_products'
  | 'manage_categories_payments'
  | 'manage_stock_inout'
  | 'manage_supplier'
  | 'view_reports'
  | 'manage_backup'
  | 'manage_store_settings'
  | 'manage_expenses'
  | 'view_expenses'

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: 'owner' | 'staff';
  permissions: PermissionKey[];
  isActive?: boolean;
}

export interface LoginResult {
  ok: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

// ── Permission labels (untuk UI Settings/Users) ───────────────────────────────

export const ALL_PERMISSIONS: PermissionKey[] = [
  'create_transaction',
  'delete_transaction',
  'manage_products',
  'manage_categories_payments',
  'manage_stock_inout',
  'manage_supplier',
  'view_reports',
  'manage_backup',
  'manage_store_settings',
  'manage_expenses',
  'view_expenses'
];

export const PERMISSION_LABELS: Record<PermissionKey, { title: string; desc: string }> = {
  create_transaction: { title: 'Buat Transaksi', desc: 'Akses Kasir, simpan open bill, dan checkout pembayaran' },
  delete_transaction: { title: 'Hapus / Batalkan Transaksi', desc: 'Hapus transaksi di Riwayat dan batalkan open bill' },
  manage_products: { title: 'Kelola Produk', desc: 'Tambah, edit, dan hapus produk' },
  manage_categories_payments: { title: 'Kelola Kategori & Metode Bayar', desc: 'CRUD kategori produk dan metode pembayaran' },
  manage_stock_inout: { title: 'Stock In / Stock Out', desc: 'Catat barang masuk dari supplier dan barang keluar non-penjualan' },
  manage_supplier: { title: 'Kelola Supplier', desc: 'Tambah, edit, dan hapus data supplier' },
  view_reports: { title: 'Lihat Laporan & Profit', desc: 'Akses laporan penjualan, profit, HPP, dan laporan stok' },
  manage_backup: { title: 'Backup & Restore', desc: 'Export dan import data toko' },
  manage_store_settings: { title: 'Edit Info Toko & Tema', desc: 'Ubah nama toko, alamat, telepon, logo, warna tema' },
  manage_expenses: { title: 'Kelola Pengeluaran', desc: 'Tambah, edit, dan hapus data pengeluaran' },
  view_expenses: { title: 'Lihat Pengeluaran', desc: 'Akses laporan pengeluaran' },
};

export const DEFAULT_STAFF_PERMISSIONS: PermissionKey[] = ['create_transaction'];

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Decode JWT payload (tanpa verifikasi signature — verifikasi ada di backend).
 * Dipakai hanya untuk inisialisasi awal sebelum /users/me selesai dipanggil.
 */
export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.userId,
      username: payload.username ?? '',
      name: payload.name ?? '',
      role: payload.role,
      permissions: payload.permissions ?? [],
    };
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function saveToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

/**
 * Ambil user dari token lokal (offline / sinkron).
 * Dipakai hanya untuk inisialisasi state sebelum server merespons.
 */
export function getUserFromToken(): AuthUser | null {
  const token = getStoredToken();
  if (!token) return null;
  return decodeToken(token);
}

// ── Auth API calls ────────────────────────────────────────────────────────────

export async function login(username: string, pin: string): Promise<LoginResult> {
  try {
    const { data } = await api.post('/auth/login', { username, pin });
    if (data.success) {
      saveToken(data.data.token);
      return { ok: true, user: data.data.user, token: data.data.token };
    }
    return { ok: false, error: data.message };
  } catch (err: any) {
    return { ok: false, error: err.response?.data?.message || 'Login gagal' };
  }
}

export function logout(): void {
  clearToken();
}

// ── Permission helper ─────────────────────────────────────────────────────────

export function hasPermission(user: AuthUser | null, key: PermissionKey): boolean {
  if (!user) return false;
  if (user.role === 'owner') return true;
  return user.permissions.includes(key);
}