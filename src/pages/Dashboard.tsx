import { useState, useEffect } from 'react';
import {
  ShoppingCart, Package, BarChart3, TrendingUp,
  AlertTriangle, Receipt, ChevronRight, ClipboardList, Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useDashboard } from '@/hooks/use-dashboard';
import { useStoreSetting } from '@/hooks/use-store-setting';
import type { PermissionKey } from '@/lib/auth';

export default function Dashboard() {
  const { can } = useAuth();
  const [backupDismissed, setBackupDismissed] = useState(false);

  // ── Remote data ──────────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useDashboard();
  const { data: storeSettings, isLoading: settingsLoading } = useStoreSetting();

  useEffect(() => {
    if (settingsLoading) return;
    if (!storeSettings?.onboardingDone) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading]);

  // ── Loading guard ─────────────────────────────────────────────────────────────
  if (settingsLoading && !storeSettings) return null;

  // ── Derived values ────────────────────────────────────────────────────────────
  const stats = summary?.stats;
  const totalSales = stats?.todayRevenue ?? 0;
  const totalProfit = stats?.todayProfit ?? 0;
  const txCount = stats?.todaySalesCount ?? 0;
  const openBillsCount = stats?.openBillsCount ?? 0;
  const totalExpensesToday = stats?.todayExpenses ?? 0;
  const expenseCount = stats?.todayExpenseCount ?? 0;
  const lowStockProducts = summary?.lowStockProducts ?? [];
  const recentTransactions = summary?.recentTransactions ?? [];

  // ── Quick actions ─────────────────────────────────────────────────────────────
  const quickActions: {
    to: string;
    icon: typeof ShoppingCart;
    label: string;
    color: string;
    perm?: PermissionKey;
  }[] = [
      { to: '/cashier', icon: ShoppingCart, label: 'Kasir', color: 'bg-primary/10 text-primary', perm: 'create_transaction' },
      { to: '/products', icon: Package, label: 'Produk', color: 'bg-accent/10 text-accent' },
      { to: '/reports', icon: BarChart3, label: 'Laporan', color: 'bg-success/10 text-success', perm: 'view_reports' },
    ];
  const visibleActions = quickActions.filter((a) => !a.perm || can(a.perm));

  return (
    <div className="px-4 pt-6 space-y-5">

      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {storeSettings?.storeName || 'KasirGratisan'}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-xs opacity-80">Penjualan Hari Ini</p>
            <p className="text-xl font-bold mt-1">
              Rp {totalSales.toLocaleString('id-ID')}
            </p>
            <p className="text-xs opacity-70 mt-1">{txCount} transaksi</p>
          </CardContent>
        </Card>

        {can('view_reports') && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-success">
                <TrendingUp className="w-4 h-4" />
                <p className="text-xs font-medium">Profit Hari Ini</p>
              </div>
              <p className="text-xl font-bold mt-1">
                Rp {totalProfit.toLocaleString('id-ID')}
              </p>
            </CardContent>
          </Card>
        )}

        {(can('view_expenses') || can('manage_expenses')) && (
          <Link to="/expenses" className="contents">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-warning">
                  <Wallet className="w-4 h-4" />
                  <p className="text-xs font-medium">Pengeluaran Hari Ini</p>
                </div>
                <p className="text-xl font-bold mt-1">
                  Rp {totalExpensesToday.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{expenseCount} catatan</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Open Bills */}
      {openBillsCount > 0 && (
        <Link to="/cashier">
          <Card className="border-0 shadow-sm bg-warning/10 hover:shadow-md transition-shadow cursor-pointer mt-2">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Open Bills</p>
                <p className="text-xs text-muted-foreground">
                  {openBillsCount} bill menunggu pembayaran
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick Actions */}
      {visibleActions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Akses Cepat</h2>
          <div
            className={`grid gap-3 ${visibleActions.length === 1
                ? 'grid-cols-1'
                : visibleActions.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              }`}
          >
            {visibleActions.map(({ to, icon: Icon, label, color }) => (
              <Link key={to} to={to}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center gap-2">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold">{label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-primary" />
              Transaksi Terakhir
            </h2>
            <Link to="/history">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                Lihat Semua <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <Link key={tx.id} to={`/history?txId=${tx.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow mb-2">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.itemNames ?? `#${tx.receiptNumber}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {format(new Date(tx.date), 'HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-sm font-bold text-primary">
                          Rp {tx.total.toLocaleString('id-ID')}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {tx.paymentMethod}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Stok Menipis
          </h2>
          <div className="space-y-2">
            {lowStockProducts.slice(0, 5).map((product) => (
              <Card key={product.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-full">
                    Sisa {product.stock} {product.unit}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}