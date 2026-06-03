import { useState } from 'react';
import { format } from 'date-fns';
import {
  BarChart3, TrendingUp, ShoppingCart, Package,
  DollarSign, ArrowDown, ArrowUp, Minus, Wallet, CreditCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useReport, useDailyReport } from '@/hooks/use-report';
import { useExpenseSummary } from '@/hooks/use-expenses';
import type { RangePreset } from '@/services/expense.service';

export default function Laporan() {
  const { can } = useAuth();
  const [period, setPeriod] = useState<'daily' | '7' | '30'>('7');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [includeExpenses, setIncludeExpenses] = useState(true);

  const isDaily = period === 'daily';
  const days = isDaily ? null : (Number(period) as 7 | 30);

  // ── Hooks (selalu dipanggil sebelum permission gate) ──────────────────────
  const { data: report, isLoading: reportLoading } =
    useReport(days ?? 7);

  const { data: dailyReport, isLoading: dailyLoading } =
    useDailyReport(isDaily ? selectedDate : '');

  const expenseRange = isDaily ? 'today' : (period as RangePreset);
  const { data: expenseSummary, isLoading: expenseLoading } = useExpenseSummary({
    range: expenseRange,
    ...(isDaily ? { date: selectedDate } : {}),
  });

  if (!can('view_reports')) {
    return <LockedPage title="Laporan" permissionLabel="Lihat Laporan & Profit" />;
  }

  const isLoading = isDaily ? dailyLoading : (reportLoading || expenseLoading);

  // ── Derived values ─────────────────────────────────────────────────────────
  const stats = isDaily ? dailyReport?.stats : ((report as any)?.stats ?? report ?? {});

  const totalSales = Number(stats?.totalRevenue ?? 0);
  const grossProfit = Number(stats?.totalProfit ?? 0);
  const txCount = Number(stats?.totalSalesCount ?? 0);
  const avgTx = Number(stats?.avgTransaction ?? (txCount > 0 ? totalSales / txCount : 0));

  const totalRevenue = totalSales;
  const totalDiscount = Number((report as any)?.stats?.totalDiscount ?? 0);
  const totalHpp = totalSales - grossProfit;
  const marginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  const totalExpenses = parseFloat(expenseSummary?.totalAmount ?? '0');
  const appliedExpenses = includeExpenses ? totalExpenses : 0;
  const netProfit = grossProfit - appliedExpenses;
  const netMarginPercent = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // Payment breakdown (harian saja)
  const paymentBreakdown = dailyReport?.paymentBreakdown ?? [];

  // Expense categories
  const topExpenseCategories = (expenseSummary?.byCategory ?? [])
    .map((item: any) => ({
      name: item.category?.name ?? 'Tanpa kategori',
      icon: item.category?.icon ?? '📦',
      color: item.category?.color ?? '#6B7280',
      amount: parseFloat(item.totalAmount),
    }))
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 5);

  // Chart data (hanya untuk periode 7/30)
  const rawChartData = (report as any)?.chartData ?? [];
  const chartData = rawChartData.map((stat: any) => ({
    date: stat.date,
    sales: Number(stat.revenue ?? stat.sales ?? 0),
  }));

  // Top products
  const rawTopProducts = isDaily
    ? (dailyReport?.topProducts ?? [])
    : ((report as any)?.topProducts ?? []);

  const topProducts = rawTopProducts.map((p: any, idx: number) => ({
    key: p.productId ?? p.name ?? idx,
    name: p.name,
    totalRevenue: Number(p.totalRevenue ?? p.revenue ?? 0),
    totalProfit: Number(p.totalProfit ?? p.profit ?? 0),
    totalQty: Number(p.totalQty ?? p.quantity ?? 0),
  }));

  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  if (isLoading) {
    return (
      <div className="px-4 pt-6 pb-20 space-y-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Laporan
        </h1>
        <p className="text-xs text-muted-foreground text-center py-16">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-20 space-y-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Laporan
      </h1>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={v => setPeriod(v as 'daily' | '7' | '30')}>
        <TabsList className="w-full">
          <TabsTrigger value="daily" className="flex-1">Harian</TabsTrigger>
          <TabsTrigger value="7" className="flex-1">7 Hari</TabsTrigger>
          <TabsTrigger value="30" className="flex-1">30 Hari</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Date picker + toggle pengeluaran (harian) */}
      {isDaily && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-date" className="text-xs">Tanggal Laporan</Label>
              <Input
                id="report-date"
                type="date"
                value={selectedDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <Label htmlFor="include-expenses" className="text-sm font-medium">
                  Masukkan pengeluaran
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Pengeluaran akan mengurangi laba bersih
                </p>
              </div>
              <Switch
                id="include-expenses"
                checked={includeExpenses}
                onCheckedChange={setIncludeExpenses}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle pengeluaran (periode 7/30) */}
      {!isDaily && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Masukkan pengeluaran</p>
                <p className="text-[10px] text-muted-foreground">
                  Pengeluaran akan mengurangi laba bersih
                </p>
              </div>
              <Switch
                id="include-expenses-period"
                checked={includeExpenses}
                onCheckedChange={setIncludeExpenses}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <ShoppingCart className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{txCount}</p>
            <p className="text-[10px] text-muted-foreground">Transaksi</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-success mb-1" />
            <p className="text-sm font-bold">{rp(totalSales)}</p>
            <p className="text-[10px] text-muted-foreground">Penjualan</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-accent mb-1" />
            <p className="text-sm font-bold">{rp(grossProfit)}</p>
            <p className="text-[10px] text-muted-foreground">Profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment breakdown (harian) */}
      {isDaily && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              Ringkasan Penjualan Harian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Total Omzet</p>
                <p className="text-sm font-bold">{rp(totalSales)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground">Rata-rata Transaksi</p>
                <p className="text-sm font-bold">{rp(avgTx)}</p>
              </div>
            </div>
            {paymentBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">Belum ada penjualan</p>
            ) : (
              <div className="space-y-2">
                {paymentBreakdown.map(method => (
                  <div key={method.name} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-[10px] text-muted-foreground">{method.count} transaksi</p>
                    </div>
                    <p className="font-bold">{rp(method.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Laba Rugi */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />
            Laba Rugi{isDaily ? ' Harian' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <ArrowUp className="w-3.5 h-3.5 text-success" />
              <span>Pendapatan Kotor</span>
            </div>
            <span className="font-semibold">{rp(totalRevenue)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-destructive">
              <div className="flex items-center gap-2">
                <Minus className="w-3.5 h-3.5" />
                <span>Diskon</span>
              </div>
              <span className="font-semibold">-{rp(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm border-t pt-2">
            <span className="font-medium">Penjualan Bersih</span>
            <span className="font-bold">{rp(totalSales)}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-destructive">
            <div className="flex items-center gap-2">
              <ArrowDown className="w-3.5 h-3.5" />
              <span>HPP (Modal)</span>
            </div>
            <span className="font-semibold">-{rp(totalHpp)}</span>
          </div>
          <div className="flex justify-between items-center text-base border-t pt-2">
            <span className="font-bold">Laba Kotor</span>
            <span className={`font-bold ${grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {rp(grossProfit)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Margin Kotor</span>
            <span className="font-semibold">{marginPercent.toFixed(1)}%</span>
          </div>
          {totalExpenses > 0 && (
            <div className={`flex justify-between items-center text-sm ${includeExpenses ? 'text-warning' : 'text-muted-foreground'
              }`}>
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" />
                <span>
                  Pengeluaran Operasional
                  {!includeExpenses && ' (tidak dihitung)'}
                </span>
              </div>
              <span className="font-semibold">-{rp(totalExpenses)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-base border-t pt-2">
            <span className="font-bold">Laba Bersih</span>
            <span className={`font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {rp(netProfit)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Margin Bersih</span>
            <span className="font-semibold">{netMarginPercent.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Expense per kategori */}
      {topExpenseCategories.length > 0 && includeExpenses && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              Pengeluaran per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topExpenseCategories.map(cat => {
                const percent = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-sm"
                          style={{ backgroundColor: cat.color + '20' }}
                        >
                          {cat.icon}
                        </span>
                        <span className="text-sm">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold">{rp(cat.amount)}</p>
                        <p className="text-[10px] text-muted-foreground">{percent.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percent}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tren Penjualan (hanya periode 7/30) */}
      {!isDaily && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tren Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [`Rp ${v.toLocaleString('id-ID')}`, 'Penjualan']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Products */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            Produk Terlaris{isDaily ? ' Harian' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Belum ada data penjualan</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{rp(p.totalRevenue)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.totalQty} terjual · laba {rp(p.totalProfit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}