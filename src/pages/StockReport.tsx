import { useState } from 'react';
import { Package, ArrowDownToLine, ArrowUpFromLine, TrendingUp, AlertTriangle, Warehouse, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useStockReport } from '@/hooks/use-stock';

export default function StockReport() {
  const { can } = useAuth();
  const [period, setPeriod] = useState<'7' | '30'>('7');

  const { data: report } = useStockReport(period);

  if (!can('view_reports')) {
    return <LockedPage title="Laporan Stok" permissionLabel="Lihat Laporan & Profit" />;
  }

  // ── Destructure report data ───────────────────────────────────────────────

  const summary = report?.summary ?? {
    totalStockIn: 0,
    totalStockOut: 0,
    totalStockInValue: 0,
    avgBuyPrice: 0,
    currentStock: 0,
  };

  const stockOutByReason = report?.stockOutByReason ?? [];
  const lowStockProducts = report?.alerts.lowStock ?? [];
  const outOfStockProducts = report?.alerts.outOfStock ?? [];

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartData = (() => {
    if (!report?.chart) return [];

    const map: Record<string, { stockIn: number; stockOut: number }> = {};

    const toDateKey = (iso: string) => iso.slice(0, 10);

    const formatLabel = (key: string) => {
      const [, month, day] = key.split('-');
      return `${day}/${month}`;
    };

    // Pre-fill semua hari sesuai periode
    const days = parseInt(period);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { stockIn: 0, stockOut: 0 };
    }

    report.chart.stockIn.forEach(({ date, quantity }) => {
      const key = toDateKey(date);
      if (!map[key]) map[key] = { stockIn: 0, stockOut: 0 };
      map[key].stockIn += quantity;
    });

    report.chart.stockOut.forEach(({ date, quantity }) => {
      const key = toDateKey(date);
      if (!map[key]) map[key] = { stockIn: 0, stockOut: 0 };
      map[key].stockOut += quantity;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({ date: formatLabel(key), ...data }));
  })();

  // ── Helpers ───────────────────────────────────────────────────────────────

  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const reasonLabels: Record<string, string> = {
    rusak: 'Rusak',
    hilang: 'Hilang',
    retur: 'Retur',
    expired: 'Expired',
    sample: 'Sample',
    lain: 'Lainnya',
  };

  return (
    <div className="px-4 pt-6 pb-20 space-y-5">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Warehouse className="w-5 h-5 text-primary" />
        Laporan Stok
      </h1>

      <Tabs value={period} onValueChange={v => setPeriod(v as '7' | '30')}>
        <TabsList className="w-full">
          <TabsTrigger value="7" className="flex-1">7 Hari</TabsTrigger>
          <TabsTrigger value="30" className="flex-1">30 Hari</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <ArrowDownToLine className="w-4 h-4 mx-auto text-success mb-1" />
            <p className="text-lg font-bold">{summary.totalStockIn}</p>
            <p className="text-[10px] text-muted-foreground">Masuk</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <ArrowUpFromLine className="w-4 h-4 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold">{summary.totalStockOut}</p>
            <p className="text-[10px] text-muted-foreground">Keluar</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <Package className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{summary.currentStock}</p>
            <p className="text-[10px] text-muted-foreground">Tersedia</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock In Value */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-success" />
            Nilai Stok Masuk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Pembelian</span>
            <span className="text-lg font-bold text-success">{rp(summary.totalStockInValue)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Rata-rata: {rp(summary.avgBuyPrice)} per unit
          </p>
        </CardContent>
      </Card>

      {/* Stock Movement Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Pergerakan Stok
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: number, name: string) => [v, name === 'stockIn' ? 'Masuk' : 'Keluar']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelStyle={{ fontSize: 10 }}
              />
              <Bar dataKey="stockIn" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Masuk" />
              <Bar dataKey="stockOut" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} name="Keluar" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock Out by Reason */}
      {stockOutByReason.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ArrowUpFromLine className="w-4 h-4 text-destructive" />
              Alasan Stock Keluar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stockOutByReason.map(({ reason, quantity }) => (
              <div key={reason} className="flex items-center justify-between">
                <span className="text-sm">{reasonLabels[reason] || reason}</span>
                <span className="font-semibold text-destructive">{quantity} unit</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-0 shadow-sm border-warning/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5 text-warning">
              <AlertTriangle className="w-4 h-4" />
              Stok Menipis ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStockProducts.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm truncate flex-1">{p.name}</span>
                <span className="text-sm font-bold text-warning">{p.stock} {p.unit}</span>
              </div>
            ))}
            {lowStockProducts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{lowStockProducts.length - 5} produk lainnya
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Out of Stock */}
      {outOfStockProducts.length > 0 && (
        <Card className="border-0 shadow-sm border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5 text-destructive">
              <Package className="w-4 h-4" />
              Stok Habis ({outOfStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outOfStockProducts.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-sm truncate flex-1">{p.name}</span>
                <span className="text-xs text-destructive">0 {p.unit}</span>
              </div>
            ))}
            {outOfStockProducts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{outOfStockProducts.length - 5} produk lainnya
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}