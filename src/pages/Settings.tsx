import { useState } from 'react';
import {
  Settings,
  ChevronRight,
  Tag,
  CreditCard,
  Ruler,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  Palette,
  Package,
  Users as UsersIcon,
  ShieldCheck,
  LogOut,
  Smartphone,
  Share2,
  Info,
  Download,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useUsers } from '@/hooks/use-users';
import { useCategories } from '@/hooks/use-categories';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { useExpenseCategories } from '@/hooks/use-expenses';
import { useUnits } from '@/hooks/use-units';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import StoreInfoCard from './settings/StoreInfoCard';

export default function Pengaturan() {
  const { currentUser, isOwner, can, logout } = useAuth();
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const { data: users = [] } = useUsers(isOwner);
  const { data: categories = [] } = useCategories();
  const { data: paymentMethods = [] } = usePaymentMethods(true);
  const { data: expenseCategories = [] } = useExpenseCategories();
  const { data: units = [] } = useUnits();

  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLogoutOpen(false);
    window.location.replace('/login');
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        Pengaturan
      </h1>

      {/* ── Info Toko ────────────────────────────────────────────────────── */}
      <StoreInfoCard canEdit={can('manage_store_settings')} />

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
                  if (ok) toast.success('Berhasil install QasirKu!');
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

      {/* ── Data Master ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Data Master</h2>

        {can('manage_categories_payments') && (
          <>
            <Link to="/settings/category" className="block">
              <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Tag className="w-4 h-4" /></div>
                  <div className="flex-1"><p className="text-sm font-semibold">Kategori Produk</p><p className="text-[10px] text-muted-foreground">{categories.length} kategori</p></div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/settings/payment-method" className="block">
              <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><CreditCard className="w-4 h-4" /></div>
                  <div className="flex-1"><p className="text-sm font-semibold">Metode Pembayaran</p><p className="text-[10px] text-muted-foreground">{paymentMethods.length} metode</p></div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/settings/expense-category" className="block">
              <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-2">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
                  <div className="flex-1"><p className="text-sm font-semibold">Kategori Pengeluaran</p><p className="text-[10px] text-muted-foreground">{expenseCategories.length} kategori</p></div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </>
        )}

        <Link to="/settings/unit" className="block">
          <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Ruler className="w-4 h-4" /></div>
              <div className="flex-1"><p className="text-sm font-semibold">Satuan</p><p className="text-[10px] text-muted-foreground">{units.length} satuan</p></div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Warna Tema ───────────────────────────────────────────────────── */}
      {can('manage_store_settings') && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> Warna Tema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemeColorPicker />
          </CardContent>
        </Card>
      )}

      {/* ── About ────────────────────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center space-y-2">
          <p className="text-sm font-bold">QasirKu</p>
          <p className="text-[10px] text-muted-foreground">v2.0 • Data tersimpan di server</p>
        </CardContent>
      </Card>

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
