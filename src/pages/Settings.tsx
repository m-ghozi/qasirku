/**
 * Settings.tsx
 *
 * Perubahan dari versi sebelumnya:
 *  - Tambah section "Kategori Pengeluaran" di bawah Metode Pembayaran
 *  - Tambah link navigasi ke /expenses di section Transaksi & Stok
 *  - Hooks: useExpenseCategories / useCreateExpenseCategory /
 *           useUpdateExpenseCategory / useDeleteExpenseCategory
 *  - Guard: can('manage_categories_payments') — sama dengan kategori lain
 */

import { useState } from 'react';
import {
  Settings,
  Store,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Receipt,
  Palette,
  Package,
  Ruler,
  Users as UsersIcon,
  ShieldCheck,
  LogOut,
  Smartphone,
  Share2,
  Info,
  Download,
  CreditCard,
  Star,
  EyeOff,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-categories';
import {
  useUnits,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from '@/hooks/use-units';
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeactivatePaymentMethod,
  useDeletePaymentMethod,
  useSetDefaultPaymentMethod,
} from '@/hooks/use-payment-methods';
import {
  useExpenseCategories,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
} from '@/hooks/use-expenses';
import { useStoreSetting, useUpdateStoreSetting } from '@/hooks/use-store-setting';
import { useUsers } from '@/hooks/use-users';
import type { Category } from '@/services/category.service';
import type { Unit } from '@/services/unit.service';
import type { PaymentMethod, PaymentCategory } from '@/services/paymentMethod.service';
import type { ExpenseCategory } from '@/services/expense.service';

// ── Konstanta ─────────────────────────────────────────────────────────────────

const PAYMENT_CATEGORIES: { value: PaymentCategory; label: string; emoji: string }[] = [
  { value: 'tunai', label: 'Tunai', emoji: '💵' },
  { value: 'transfer', label: 'Transfer', emoji: '🏦' },
  { value: 'qris', label: 'QRIS', emoji: '📷' },
  { value: 'e-wallet', label: 'E-Wallet', emoji: '📱' },
];

const THEME_COLORS = [
  { name: 'Oranye', hue: '25', saturation: '95%', lightness: '53%' },
  { name: 'Biru', hue: '217', saturation: '91%', lightness: '60%' },
  { name: 'Hijau', hue: '142', saturation: '71%', lightness: '45%' },
  { name: 'Ungu', hue: '262', saturation: '83%', lightness: '58%' },
  { name: 'Merah', hue: '0', saturation: '84%', lightness: '60%' },
  { name: 'Pink', hue: '330', saturation: '81%', lightness: '60%' },
  { name: 'Teal', hue: '172', saturation: '66%', lightness: '50%' },
  { name: 'Kuning', hue: '45', saturation: '93%', lightness: '47%' },
] as const;

function getThemeHSL(hue: string) {
  const preset = THEME_COLORS.find(c => c.hue === hue);
  if (preset) return `${preset.hue} ${preset.saturation} ${preset.lightness}`;
  return `${hue} 95% 53%`;
}

function applyThemeColor(hue: string) {
  const hsl = getThemeHSL(hue);
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', `hsl(${hsl})`);
  localStorage.setItem('themeColorHue', hue);
}

function getStoredThemeHue(): string {
  return localStorage.getItem('themeColorHue') ?? '217';
}

const EXPENSE_EMOJI_OPTIONS = ['💡', '🏠', '👤', '🚚', '🧰', '📦', '💧', '📞', '🌐', '☕', '🧾', '💼'];

// ── Komponen utama ────────────────────────────────────────────────────────────

export default function Pengaturan() {
  const { currentUser, isOwner, can, logout } = useAuth();
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();

  // ── API data ──────────────────────────────────────────────────────────────
  const { data: storeSetting } = useStoreSetting();
  const updateStoreSetting = useUpdateStoreSetting();

  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const { data: units = [] } = useUnits();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  const { data: paymentMethods = [] } = usePaymentMethods(true);
  const createPaymentMethod = useCreatePaymentMethod();
  const updatePaymentMethod = useUpdatePaymentMethod();
  const deactivatePaymentMethod = useDeactivatePaymentMethod();
  const deletePaymentMethod = useDeletePaymentMethod();
  const setDefaultPaymentMethod = useSetDefaultPaymentMethod();

  const { data: expenseCategories = [] } = useExpenseCategories();
  const createExpenseCategory = useCreateExpenseCategory();
  const updateExpenseCategory = useUpdateExpenseCategory();
  const deleteExpenseCategory = useDeleteExpenseCategory();

  const { data: users = [] } = useUsers();

  // ── Tema warna lokal ──────────────────────────────────────────────────────
  const [themeHue, setThemeHue] = useState(getStoredThemeHue);

  // ── Dialog states ─────────────────────────────────────────────────────────
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Store edit
  const [storeDialog, setStoreDialog] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeAddr, setStoreAddr] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeFooter, setStoreFooter] = useState('');

  // Category
  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catColor, setCatColor] = useState('#FF6B35');
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catDeleteId, setCatDeleteId] = useState<number | null>(null);

  // Unit
  const [unitDialog, setUnitDialog] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [unitIsDefault, setUnitIsDefault] = useState(false);
  const [unitEditId, setUnitEditId] = useState<number | null>(null);
  const [unitDeleteTarget, setUnitDeleteTarget] = useState<Unit | null>(null);

  // Payment Method
  const [pmDialog, setPmDialog] = useState(false);
  const [pmName, setPmName] = useState('');
  const [pmCategory, setPmCategory] = useState<PaymentCategory>('tunai');
  const [pmIsDefault, setPmIsDefault] = useState(false);
  const [pmEditId, setPmEditId] = useState<number | null>(null);
  const [pmDeactivateTarget, setPmDeactivateTarget] = useState<PaymentMethod | null>(null);
  const [pmDeleteTarget, setPmDeleteTarget] = useState<PaymentMethod | null>(null);

  // Expense Category
  const [expCatDialog, setExpCatDialog] = useState(false);
  const [expCatName, setExpCatName] = useState('');
  const [expCatIcon, setExpCatIcon] = useState('📦');
  const [expCatColor, setExpCatColor] = useState('#FBBF24');
  const [expCatEditId, setExpCatEditId] = useState<number | null>(null);
  const [expCatDeleteTarget, setExpCatDeleteTarget] = useState<ExpenseCategory | null>(null);

  // ── Store handlers ────────────────────────────────────────────────────────

  const openStoreEdit = () => {
    setStoreName(storeSetting?.storeName ?? '');
    setStoreAddr(storeSetting?.address ?? '');
    setStorePhone(storeSetting?.phone ?? '');
    setStoreFooter(storeSetting?.receiptFooter ?? '');
    setStoreDialog(true);
  };

  const saveStore = () => {
    updateStoreSetting.mutate(
      { storeName: storeName.trim(), address: storeAddr.trim(), phone: storePhone.trim(), receiptFooter: storeFooter.trim() },
      { onSuccess: () => setStoreDialog(false) },
    );
  };

  // ── Category handlers ─────────────────────────────────────────────────────

  const openCatAdd = () => {
    setCatEditId(null); setCatName(''); setCatIcon('📦'); setCatColor('#FF6B35');
    setCatDialog(true);
  };

  const openCatEdit = (c: Category) => {
    setCatEditId(c.id); setCatName(c.name); setCatIcon(c.icon); setCatColor(c.color);
    setCatDialog(true);
  };

  const saveCat = () => {
    if (!catName.trim()) return;
    if (catEditId) {
      updateCategory.mutate(
        { id: catEditId, payload: { name: catName.trim(), icon: catIcon, color: catColor } },
        { onSuccess: () => setCatDialog(false) },
      );
    } else {
      createCategory.mutate(
        { name: catName.trim(), icon: catIcon, color: catColor },
        { onSuccess: () => setCatDialog(false) },
      );
    }
  };

  const confirmDeleteCat = () => {
    if (catDeleteId == null) return;
    deleteCategory.mutate(catDeleteId, { onSuccess: () => setCatDeleteId(null) });
  };

  // ── Unit handlers ─────────────────────────────────────────────────────────

  const openUnitAdd = () => {
    setUnitEditId(null); setUnitName(''); setUnitIsDefault(false);
    setUnitDialog(true);
  };

  const openUnitEdit = (u: Unit) => {
    setUnitEditId(u.id); setUnitName(u.name); setUnitIsDefault(u.isDefault);
    setUnitDialog(true);
  };

  const saveUnit = () => {
    if (!unitName.trim()) return;
    if (unitEditId) {
      updateUnit.mutate(
        { id: unitEditId, payload: { name: unitName.trim(), isDefault: unitIsDefault } },
        { onSuccess: () => setUnitDialog(false) },
      );
    } else {
      createUnit.mutate(
        { name: unitName.trim(), isDefault: unitIsDefault },
        { onSuccess: () => setUnitDialog(false) },
      );
    }
  };

  const confirmDeleteUnit = () => {
    if (!unitDeleteTarget) return;
    deleteUnit.mutate(unitDeleteTarget.id, { onSuccess: () => setUnitDeleteTarget(null) });
  };

  // ── Payment Method handlers ───────────────────────────────────────────────

  const openPmAdd = () => {
    setPmEditId(null); setPmName(''); setPmCategory('tunai'); setPmIsDefault(false);
    setPmDialog(true);
  };

  const openPmEdit = (pm: PaymentMethod) => {
    setPmEditId(pm.id); setPmName(pm.name); setPmCategory(pm.category); setPmIsDefault(pm.isDefault);
    setPmDialog(true);
  };

  const savePm = () => {
    if (!pmName.trim()) return;
    if (pmEditId) {
      updatePaymentMethod.mutate(
        { id: pmEditId, payload: { name: pmName.trim(), category: pmCategory, isDefault: pmIsDefault } },
        { onSuccess: () => setPmDialog(false) },
      );
    } else {
      createPaymentMethod.mutate(
        { name: pmName.trim(), category: pmCategory, isDefault: pmIsDefault },
        { onSuccess: () => setPmDialog(false) },
      );
    }
  };

  const confirmDeactivatePm = () => {
    if (!pmDeactivateTarget) return;
    deactivatePaymentMethod.mutate(pmDeactivateTarget.id, { onSuccess: () => setPmDeactivateTarget(null) });
  };

  const confirmDeletePm = () => {
    if (!pmDeleteTarget) return;
    deletePaymentMethod.mutate(pmDeleteTarget.id, { onSuccess: () => setPmDeleteTarget(null) });
  };

  // ── Expense Category handlers ─────────────────────────────────────────────

  const openExpCatAdd = () => {
    setExpCatEditId(null); setExpCatName(''); setExpCatIcon('📦'); setExpCatColor('#FBBF24');
    setExpCatDialog(true);
  };

  const openExpCatEdit = (c: ExpenseCategory) => {
    setExpCatEditId(c.id); setExpCatName(c.name); setExpCatIcon(c.icon); setExpCatColor(c.color);
    setExpCatDialog(true);
  };

  const saveExpCat = () => {
    if (!expCatName.trim()) return;
    if (expCatEditId) {
      updateExpenseCategory.mutate(
        { id: expCatEditId, payload: { name: expCatName.trim(), icon: expCatIcon, color: expCatColor } },
        { onSuccess: () => setExpCatDialog(false) },
      );
    } else {
      createExpenseCategory.mutate(
        { name: expCatName.trim(), icon: expCatIcon, color: expCatColor },
        { onSuccess: () => setExpCatDialog(false) },
      );
    }
  };

  const confirmDeleteExpCat = () => {
    if (!expCatDeleteTarget) return;
    deleteExpenseCategory.mutate(expCatDeleteTarget.id, {
      onSuccess: () => setExpCatDeleteTarget(null),
    });
  };

  // ── Theme ─────────────────────────────────────────────────────────────────

  const handleThemeChange = (hue: string) => {
    setThemeHue(hue);
    applyThemeColor(hue);
  };

  const handleLogout = () => {
    logout();
    setLogoutOpen(false);
    window.location.replace('/login');
  };

  const emojiOptions = ['📦', '🍕', '🥤', '🍜', '🧃', '🎽', '💊', '🧹', '📱', '🛒', '🎁', '✂️'];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        Pengaturan
      </h1>

      {/* ── Info Toko ────────────────────────────────────────────────────── */}
      <Card
        className={`border-0 shadow-sm ${can('manage_store_settings') ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
        onClick={() => can('manage_store_settings') && openStoreEdit()}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{storeSetting?.storeName || 'Toko Saya'}</p>
            <p className="text-xs text-muted-foreground">{storeSetting?.address || 'Belum diatur'}</p>
          </div>
          {can('manage_store_settings') && <Edit2 className="w-4 h-4 text-muted-foreground" />}
        </CardContent>
      </Card>

      {/* ── Install sebagai App ──────────────────────────────────────────── */}
      {!isInstalled && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Install sebagai Aplikasi</p>
              <p className="text-[10px] text-muted-foreground">Buka langsung dari home screen, tanpa browser</p>
            </div>
            {canInstall ? (
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={async () => {
                  const ok = await install();
                  if (ok) toast.success('Berhasil install KasirGratisan!');
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Install
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setInstallHelpOpen(true)}>
                Cara Install
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Akun yang sedang login ───────────────────────────────────────── */}
      {currentUser && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentUser.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{currentUser.name}</p>
              <p className="text-[10px] text-muted-foreground">
                @{currentUser.username} · {currentUser.role === 'owner' ? 'Pemilik' : 'Karyawan'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 text-destructive"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Karyawan & Akses ─────────────────────────────────────────────── */}
      {isOwner && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Karyawan & Akses</h2>
          <Link to="/users">
            <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Kelola Karyawan</p>
                  <p className="text-[10px] text-muted-foreground">
                    {users.length} akun terdaftar · atur akses per karyawan
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* ── Transaksi & Stok ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Transaksi & Stok</h2>

        <Link to="/history">
          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Riwayat Transaksi</p>
                <p className="text-[10px] text-muted-foreground">Lihat semua transaksi & cetak ulang struk</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {can('manage_customers') && (
          <Link to="/customers">
            <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Pelanggan</p>
                  <p className="text-[10px] text-muted-foreground">Kelola data pelanggan & riwayat transaksi</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        {can('manage_supplier') && (
          <Link to="/supplier">
            <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Supplier</p>
                  <p className="text-[10px] text-muted-foreground">Kelola data supplier</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        {can('manage_stock_inout') && (
          <>
            <Link to="/stock-in">
              <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Stock In</p>
                    <p className="text-[10px] text-muted-foreground">Catat barang masuk & HPP otomatis</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
            <Link to="/stock-out">
              <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <ArrowUpFromLine className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Stock Out</p>
                    <p className="text-[10px] text-muted-foreground">Catat barang keluar non-penjualan</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </>
        )}

        {/* ── Link Pengeluaran ── */}
        {(can('manage_expenses') || can('view_expenses')) && (
          <Link to="/expenses">
            <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Pengeluaran</p>
                  <p className="text-[10px] text-muted-foreground">Catat biaya operasional (listrik, gaji, sewa, dll)</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        {can('view_reports') && (
          <Link to="/stock-report">
            <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Laporan Stok</p>
                  <p className="text-[10px] text-muted-foreground">Lihat pergerakan stok per periode</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* ── Kategori Produk, Metode Pembayaran & Kategori Pengeluaran ───── */}
      {can('manage_categories_payments') && (
        <>
          {/* Kategori Produk */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Tag className="w-4 h-4" /> Kategori Produk
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openCatAdd}>
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {categories.length === 0 && (
                <p className="text-xs text-muted-foreground py-1.5">Belum ada kategori</p>
              )}
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-sm"
                      style={{ backgroundColor: c.color + '20' }}
                    >
                      {c.icon}
                    </span>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCatEdit(c)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setCatDeleteId(c.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Metode Pembayaran */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> Metode Pembayaran
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openPmAdd}>
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {paymentMethods.length === 0 && (
                <p className="text-xs text-muted-foreground py-1.5">Belum ada metode pembayaran</p>
              )}
              {paymentMethods.map(pm => {
                const cat = PAYMENT_CATEGORIES.find(c => c.value === pm.category);
                return (
                  <div
                    key={pm.id}
                    className={`flex items-center justify-between py-1.5 ${!pm.isActive ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base w-6 text-center shrink-0">{cat?.emoji ?? '💳'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{pm.name}</p>
                        <p className="text-[10px] text-muted-foreground">{cat?.label ?? pm.category}</p>
                      </div>
                      {pm.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                          Default
                        </span>
                      )}
                      {!pm.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium shrink-0">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!pm.isDefault && pm.isActive && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                          title="Jadikan Default"
                          onClick={() => setDefaultPaymentMethod.mutate(pm.id)}
                        >
                          <Star className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPmEdit(pm)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      {!pm.isDefault && pm.isActive && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                          title="Nonaktifkan"
                          onClick={() => setPmDeactivateTarget(pm)}
                        >
                          <EyeOff className="w-3 h-3" />
                        </Button>
                      )}
                      {!pm.isActive && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          title="Hapus Permanen"
                          onClick={() => setPmDeleteTarget(pm)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* ── Kategori Pengeluaran ── */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" /> Kategori Pengeluaran
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openExpCatAdd}>
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {expenseCategories.length === 0 && (
                <p className="text-xs text-muted-foreground py-1.5">Belum ada kategori pengeluaran</p>
              )}
              {expenseCategories.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-sm"
                      style={{ backgroundColor: c.color + '20' }}
                    >
                      {c.icon}
                    </span>
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openExpCatEdit(c)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setExpCatDeleteTarget(c)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Satuan ───────────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Ruler className="w-4 h-4" /> Satuan
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openUnitAdd}>
              <Plus className="w-3 h-3" /> Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {units.length === 0 && (
            <p className="text-xs text-muted-foreground py-1.5">Belum ada satuan</p>
          )}
          {units.map(u => (
            <div key={u.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{u.name}</span>
                {u.isDefault && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    Default
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openUnitEdit(u)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setUnitDeleteTarget(u)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Warna Tema ───────────────────────────────────────────────────── */}
      {can('manage_store_settings') && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> Warna Tema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {THEME_COLORS.map(tc => (
                <button
                  key={tc.hue}
                  title={tc.name}
                  onClick={() => handleThemeChange(tc.hue)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${themeHue === tc.hue ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: `hsl(${tc.hue} ${tc.saturation} ${tc.lightness})` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── About ────────────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center space-y-2">
          <p className="text-sm font-bold">KasirGratisan</p>
          <p className="text-xs text-muted-foreground">POS Gratis untuk UMKM Indonesia 🇮🇩</p>
          <p className="text-[10px] text-muted-foreground">v2.0 • Data tersimpan di server</p>
          <div className="flex flex-col gap-2 pt-2">
            <a
              href="https://kasirgratisan.fider.io"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-border bg-muted/50 text-xs font-semibold text-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
            >
              💡 Request Fitur
            </a>
            <a
              href="https://traktir.jipraks.com"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-warning/30 bg-warning/5 text-xs font-semibold text-warning hover:bg-warning/10 transition-colors"
            >
              ☕ Traktir Kopi untuk Developer
            </a>
            <a
              href="https://t.me/kasirgratisan"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-sky-500/30 bg-sky-500/5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors"
            >
              💬 Gabung Grup Telegram
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Install Help */}
      <Dialog open={installHelpOpen} onOpenChange={setInstallHelpOpen}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" /> Cara Install Aplikasi
            </DialogTitle>
            <DialogDescription>
              Browser kamu belum menampilkan tombol install otomatis. Ikuti langkah berikut.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {isIOS ? (
              <>
                <Step n={1}>Buka di <strong>Safari</strong> (bukan Chrome).</Step>
                <Step n={2}>Ketuk tombol <Share2 className="w-3.5 h-3.5 inline mx-0.5" /> <strong>Share</strong> di bawah layar.</Step>
                <Step n={3}>Pilih <strong>"Add to Home Screen"</strong>, lalu ketuk <strong>Add</strong>.</Step>
              </>
            ) : (
              <>
                <Step n={1}>Buka di browser <strong>Chrome</strong> atau <strong>Edge</strong>.</Step>
                <Step n={2}>Ketuk menu <strong>(⋮)</strong> di pojok kanan atas.</Step>
                <Step n={3}>Pilih <strong>"Install app"</strong> atau <strong>"Add to Home screen"</strong>.</Step>
                <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Kalau opsi tidak muncul, refresh halaman dulu lalu coba lagi.</span>
                </div>
              </>
            )}
          </div>
          <Button className="w-full mt-2" variant="outline" onClick={() => setInstallHelpOpen(false)}>Tutup</Button>
        </DialogContent>
      </Dialog>

      {/* Store Edit */}
      <Dialog open={storeDialog} onOpenChange={setStoreDialog}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>Info Toko</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>Nama Toko</Label><Input value={storeName} onChange={e => setStoreName(e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Alamat</Label><Input value={storeAddr} onChange={e => setStoreAddr(e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Telepon</Label><Input value={storePhone} onChange={e => setStorePhone(e.target.value)} className="h-11" type="tel" /></div>
            <div className="space-y-1.5"><Label>Receipt Footer</Label><Input value={storeFooter} onChange={e => setStoreFooter(e.target.value)} className="h-11" /></div>
            <Button className="w-full h-11" onClick={saveStore} disabled={updateStoreSetting.isPending}>
              {updateStoreSetting.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>{catEditId ? 'Edit' : 'Tambah'} Kategori</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>Nama Kategori</Label><Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Contoh: Snack" className="h-11" /></div>
            <div className="space-y-1.5">
              <Label>Ikon</Label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(e => (
                  <button key={e} onClick={() => setCatIcon(e)} className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border-2 transition-colors ${catIcon === e ? 'border-primary bg-primary/5' : 'border-muted'}`}>{e}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Warna</Label><Input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} className="h-11 w-20" /></div>
            <Button className="w-full h-11" onClick={saveCat} disabled={!catName.trim() || createCategory.isPending || updateCategory.isPending}>
              {createCategory.isPending || updateCategory.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Delete */}
      <AlertDialog open={catDeleteId !== null} onOpenChange={open => { if (!open) setCatDeleteId(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>Produk yang menggunakan kategori ini perlu dikaitkan ulang ke kategori lain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCat} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Method Dialog */}
      <Dialog open={pmDialog} onOpenChange={setPmDialog}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>{pmEditId ? 'Edit' : 'Tambah'} Metode Pembayaran</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>Nama</Label><Input value={pmName} onChange={e => setPmName(e.target.value)} placeholder="Contoh: GoPay, Dana, BCA" className="h-11" /></div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_CATEGORIES.map(c => (
                  <button key={c.value} type="button" onClick={() => setPmCategory(c.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${pmCategory === c.value ? 'border-primary bg-primary/5 text-primary' : 'border-muted text-muted-foreground'}`}>
                    <span>{c.emoji}</span>{c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Jadikan Default</p>
                <p className="text-[10px] text-muted-foreground">Otomatis terpilih saat kasir buka transaksi baru</p>
              </div>
              <button type="button" role="switch" aria-checked={pmIsDefault} onClick={() => setPmIsDefault(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pmIsDefault ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${pmIsDefault ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <Button className="w-full h-11" onClick={savePm} disabled={!pmName.trim() || createPaymentMethod.isPending || updatePaymentMethod.isPending}>
              {createPaymentMethod.isPending || updatePaymentMethod.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Deactivate */}
      <AlertDialog open={!!pmDeactivateTarget} onOpenChange={open => { if (!open) setPmDeactivateTarget(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan "{pmDeactivateTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Metode ini tidak akan muncul di pilihan transaksi baru, tapi riwayat lama tetap aman.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivatePm} disabled={deactivatePaymentMethod.isPending}>
              {deactivatePaymentMethod.isPending ? 'Memproses…' : 'Nonaktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Method Hard Delete */}
      <AlertDialog open={!!pmDeleteTarget} onOpenChange={open => { if (!open) setPmDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Permanen "{pmDeleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Metode yang masih dipakai di transaksi tidak dapat dihapus. Data tidak bisa dipulihkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePm} className="bg-destructive text-destructive-foreground" disabled={deletePaymentMethod.isPending}>
              {deletePaymentMethod.isPending ? 'Menghapus…' : 'Hapus Permanen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expense Category Dialog */}
      <Dialog open={expCatDialog} onOpenChange={setExpCatDialog}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>{expCatEditId ? 'Edit' : 'Tambah'} Kategori Pengeluaran</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Kategori</Label>
              <Input value={expCatName} onChange={e => setExpCatName(e.target.value)} placeholder="Contoh: Internet, Marketing" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Ikon</Label>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => setExpCatIcon(e)}
                    className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border-2 transition-colors ${expCatIcon === e ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Warna</Label>
              <Input type="color" value={expCatColor} onChange={e => setExpCatColor(e.target.value)} className="h-11 w-20" />
            </div>
            <Button className="w-full h-11" onClick={saveExpCat}
              disabled={!expCatName.trim() || createExpenseCategory.isPending || updateExpenseCategory.isPending}>
              {createExpenseCategory.isPending || updateExpenseCategory.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Category Delete */}
      <AlertDialog open={!!expCatDeleteTarget} onOpenChange={open => { if (!open) setExpCatDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori "{expCatDeleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori yang masih dipakai oleh pengeluaran aktif tidak dapat dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteExpCat}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteExpenseCategory.isPending}
            >
              {deleteExpenseCategory.isPending ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unit Dialog */}
      <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>{unitEditId ? 'Edit' : 'Tambah'} Satuan</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Satuan</Label>
              <Input value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="Contoh: pak, lusin, mangkok" className="h-11" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Jadikan Default</p>
                <p className="text-[10px] text-muted-foreground">Satuan ini otomatis terpilih saat tambah produk baru</p>
              </div>
              <button type="button" role="switch" aria-checked={unitIsDefault} onClick={() => setUnitIsDefault(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${unitIsDefault ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${unitIsDefault ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <Button className="w-full h-11" onClick={saveUnit} disabled={!unitName.trim() || createUnit.isPending || updateUnit.isPending}>
              {createUnit.isPending || updateUnit.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unit Delete */}
      <AlertDialog open={!!unitDeleteTarget} onOpenChange={open => { if (!open) setUnitDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Satuan "{unitDeleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk yang sudah memakai satuan ini tetap tersimpan, tapi satuan tidak akan muncul lagi di pilihan saat tambah atau edit produk baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUnit} className="bg-destructive text-destructive-foreground" disabled={deleteUnit.isPending}>
              {deleteUnit.isPending ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari Akun?</AlertDialogTitle>
            <AlertDialogDescription>Anda akan diarahkan ke halaman login. Pastikan tidak ada open bill yang belum disimpan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Keluar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">{n}</div>
      <p className="text-sm flex-1">{children}</p>
    </div>
  );
}