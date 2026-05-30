/**
 * Reports.tsx — MIGRATED (API hooks)
 *
 * API response shape (actual):
 *  report.data = {
 *    stats: { totalRevenue, totalProfit, totalSalesCount },
 *    chartData: [{ date: 'dd/MM', revenue, transactions }],
 *    topProducts: [{ name, revenue, profit, quantity }],
 *  }
 *
 * Field mapping (API → komponen):
 *  stats.totalRevenue      → totalSales (nilai yang sudah dibayar customer)
 *  stats.totalProfit       → totalProfit / grossProfit
 *  stats.totalSalesCount   → txCount
 *  chartData[].revenue     → sales (untuk bar chart)
 *  chartData[].date        → sudah dalam format 'dd/MM', tidak perlu re-format
 *  topProducts[].revenue   → totalRevenue
 *  topProducts[].profit    → totalProfit
 *  topProducts[].quantity  → totalQty
 */

import { useState } from 'react';
import {
  BarChart3, TrendingUp, ShoppingCart, Package,
  DollarSign, ArrowDown, ArrowUp, Minus, Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useReport } from '@/hooks/use-report';
import { useExpenseSummary } from '@/hooks/use-expenses';
import type { RangePreset } from '@/services/expense.service';

export default function Laporan() {
  const { can } = useAuth();
  const [period, setPeriod] = useState<'7' | '30'>('7');
  const days = Number(period) as 7 | 30;

  // ── API hooks (selalu dipanggil sebelum permission gate) ─────────────────
  const { data: report, isLoading: reportLoading } = useReport(days);
  const expenseRange = period as RangePreset;
  const { data: expenseSummary, isLoading: expenseLoading } = useExpenseSummary({
    range: expenseRange,
  });

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!can('view_reports')) {
    return <LockedPage title="Laporan" permissionLabel="Lihat Laporan & Profit" />;
  }

  const isLoading = reportLoading || expenseLoading;

  // ── Derived values dari report.data.stats ────────────────────────────────
  // API: { stats: { totalRevenue, totalProfit, totalSalesCount }, chartData, topProducts }
  const stats = (report as any)?.stats ?? report ?? {};
  const totalSales = Number(stats.totalRevenue ?? 0);   // pendapatan = harga jual
  const grossProfit = Number(stats.totalProfit ?? 0);   // profit setelah HPP
  const totalProfit = grossProfit;                          // alias untuk summary card
  const txCount = Number(stats.totalSalesCount ?? stats.totalTransactions ?? 0);

  // Field-field yang belum ada di endpoint ini → tampil 0 (tidak merusak UI)
  const totalRevenue = totalSales;   // gross = net karena belum ada diskon di response
  const totalDiscount = Number(stats.totalDiscount ?? 0);
  const totalHpp = totalSales - grossProfit;            // HPP = revenue - profit
  const marginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

  // ── Derived values dari expenseSummary ────────────────────────────────────
  const totalExpenses = parseFloat(expenseSummary?.totalAmount ?? '0');
  const netProfit = grossProfit - totalExpenses;
  const netMarginPercent = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // ── Expense breakdown per kategori (top 5) ────────────────────────────────
  const topExpenseCategories = (expenseSummary?.byCategory ?? [])
    .map((item: any) => ({
      name: item.category?.name ?? 'Tanpa kategori',
      icon: item.category?.icon ?? '📦',
      color: item.category?.color ?? '#6B7280',
      amount: parseFloat(item.totalAmount),
    }))
    .sort((a: any, b: any) => b.amount - a.amount)
    .slice(0, 5);

  // ── Chart data ────────────────────────────────────────────────────────────
  // API mengembalikan chartData[].date sudah 'dd/MM' & field revenue (bukan sales)
  const rawChartData = (report as any)?.chartData ?? report?.dailyStats ?? [];
  const chartData = rawChartData.map((stat: any) => ({
    date: stat.date,                                   // sudah 'dd/MM' dari backend
    sales: Number(stat.revenue ?? stat.sales ?? 0),   // normalise field name
  }));

  // ── Top products ──────────────────────────────────────────────────────────
  // API: { name, revenue, profit, quantity }  (bukan totalRevenue/totalProfit/totalQty)
  const rawTopProducts = (report as any)?.topProducts ?? report?.topProducts ?? [];
  const topProducts = rawTopProducts.map((p: any, idx: number) => ({
    productId: p.productId ?? p.name ?? idx,          // key fallback jika tidak ada id
    name: p.name,
    totalRevenue: Number(p.totalRevenue ?? p.revenue ?? 0),
    totalProfit: Number(p.totalProfit ?? p.profit ?? 0),
    totalQty: Number(p.totalQty ?? p.quantity ?? 0),
  }));

  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  // ── Loading state ─────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-20 space-y-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Laporan
      </h1>

      <Tabs value={period} onValueChange={v => setPeriod(v as '7' | '30')}>
        <TabsList className="w-full">
          <TabsTrigger value="7" className="flex-1">7 Hari</TabsTrigger>
          <TabsTrigger value="30" className="flex-1">30 Hari</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary */}
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
            <p className="text-sm font-bold">{rp(totalProfit)}</p>
            <p className="text-[10px] text-muted-foreground">Profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit & Loss */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />
            Laba Rugi
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
            <div className="flex justify-between items-center text-sm text-warning">
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" />
                <span>Pengeluaran Operasional</span>
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

      {/* Expense Breakdown */}
      {topExpenseCategories.length > 0 && (
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

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tren Penjualan</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => [`Rp ${v.toLocaleString('id-ID')}`, 'Penjualan']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="sales" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            Produk Terlaris
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Belum ada data penjualan
            </p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center justify-between">
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