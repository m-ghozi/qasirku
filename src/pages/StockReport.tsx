import { useMemo, useState, type ReactNode } from 'react';
import {
  Package, ArrowDownToLine, ArrowUpFromLine, TrendingUp, AlertTriangle, Warehouse,
  BarChart3, Clock, CalendarX2, Download, Search, Table2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, startOfDay, endOfDay, subDays, startOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useStockReport, useStockMovements } from '@/hooks/use-stock';
import ExportRangeDialog from '@/components/reports/ExportRangeDialog';
import { exportStockReportToExcel } from '@/lib/export-stock-report';
import { buildStockChartSeries, dayKey } from '@/lib/stock-chart';
import type { StockRangeParams } from '@/services/stock.service';

// ── Rentang ───────────────────────────────────────────────────────────────────

type Preset = 'today' | '7' | '30' | 'month' | 'all' | 'custom';

const PRESETS: { key: Exclude<Preset, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7', label: '7 Hari' },
  { key: '30', label: '30 Hari' },
  { key: 'month', label: 'Bulan Ini' },
  { key: 'all', label: 'Semua' },
];

export default function StockReport() {
  const { can } = useAuth();
  const [preset, setPreset] = useState<Preset>('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const isCustom = preset === 'custom';
  // Rentang custom hanya valid kalau kedua ujungnya terisi.
  const customReady = !isCustom || (!!from && !!to);

  const params: StockRangeParams = useMemo(
    () => (isCustom ? { from, to } : { range: preset }),
    [isCustom, from, to, preset],
  );

  const { data: report } = useStockReport(params, customReady);
  const { data: movements } = useStockMovements(params, customReady);

  // Rentang default untuk dialog ekspor, mengikuti pilihan aktif.
  const defaultRange = useMemo(() => {
    const now = new Date();
    const endMs = endOfDay(now).getTime();
    if (isCustom && from && to) {
      return { startMs: startOfDay(new Date(`${from}T00:00:00`)).getTime(), endMs: endOfDay(new Date(`${to}T00:00:00`)).getTime() };
    }
    switch (preset) {
      case 'today': return { startMs: startOfDay(now).getTime(), endMs };
      case '7': return { startMs: startOfDay(subDays(now, 6)).getTime(), endMs };
      case 'month': return { startMs: startOfMonth(now).getTime(), endMs };
      case 'all': return { startMs: startOfDay(new Date(2000, 0, 1)).getTime(), endMs };
      default: return { startMs: startOfDay(subDays(now, 29)).getTime(), endMs };
    }
  }, [isCustom, from, to, preset]);

  const chartData = useMemo(
    () => (report ? buildStockChartSeries(report.chart, report.range) : []),
    [report],
  );

  const rows = useMemo(() => {
    const all = movements?.products ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q),
    );
  }, [movements, search]);

  if (!can('view_reports')) {
    return <LockedPage title="Laporan Stok" permissionLabel="Lihat Laporan & Profit" />;
  }

  const summary = report?.summary ?? {
    totalStockIn: 0,
    totalStockOut: 0,
    totalStockInValue: 0,
    avgBuyPrice: 0,
    currentStock: 0,
  };
  const totals = movements?.totals;

  const stockOutByReason = report?.stockOutByReason ?? [];
  const lowStockProducts = report?.alerts.lowStock ?? [];
  const outOfStockProducts = report?.alerts.outOfStock ?? [];
  const expiredBatches = report?.alerts.expired ?? [];
  const expiringSoonBatches = report?.alerts.expiringSoon ?? [];

  const rp = (n: number) => `Rp ${Number(n).toLocaleString('id-ID')}`;
  /** Angka ribuan tanpa prefix — satuannya sudah disebut di judul kolom. */
  const num = (n: number) => Number(n).toLocaleString('id-ID');
  /** Stok masuk & penyesuaian + ditampilkan menambah. */
  const plus = (n: number) => (n > 0 ? `+${n}` : '0');
  /** Terjual & penyesuaian − ditampilkan sebagai pengurang agar aritmetikanya terbaca. */
  const deduction = (n: number) => (n > 0 ? `-${n}` : '0');

  const reasonLabels: Record<string, string> = {
    rusak: 'Rusak',
    hilang: 'Hilang',
    retur: 'Retur',
    expired: 'Expired',
    sample: 'Sample',
    lain: 'Lainnya',
  };

  // Untuk rentang yang berakhir hari ini, stok akhir harus sama dengan stok sistem.
  const endsToday = !!report && dayKey(new Date(report.range.to)) === dayKey(new Date());
  const mismatch =
    endsToday && totals && totals.closingStock !== totals.currentStock;

  const selectPreset = (p: Exclude<Preset, 'custom'>) => {
    setPreset(p);
    setFrom('');
    setTo('');
  };

  return (
    <div className="px-4 pt-6 pb-20 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-primary" />
          Laporan Stok
        </h1>
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => setIsExportOpen(true)}
          disabled={!customReady}
        >
          <Download className="w-4 h-4" /> Export Excel
        </Button>
      </div>

      {/* Rentang tanggal */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={preset === p.key ? 'default' : 'outline'}
                className="h-8 text-xs"
                onClick={() => selectPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }}
              className="h-10"
              aria-label="Dari tanggal"
            />
            <span className="text-xs text-muted-foreground shrink-0">s/d</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPreset('custom'); }}
              className="h-10"
              aria-label="Sampai tanggal"
            />
          </div>

          {isCustom && !customReady && (
            <p className="text-xs text-muted-foreground">
              Isi kedua tanggal untuk menampilkan rentang custom.
            </p>
          )}
          {report && (
            <p className="text-xs text-muted-foreground">
              Periode{' '}
              {format(new Date(report.range.from), 'dd MMM yyyy', { locale: localeId })} –{' '}
              {format(new Date(report.range.to), 'dd MMM yyyy', { locale: localeId })}
            </p>
          )}
        </CardContent>
      </Card>

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

      {/* Nilai stok */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-success" />
            Nilai Stok
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pembelian periode ini</span>
            <span className="text-sm font-semibold text-success">{rp(summary.totalStockInValue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Nilai stok akhir</span>
            <span className="text-lg font-bold">{rp(totals?.closingValue ?? 0)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Rata-rata harga beli: {rp(summary.avgBuyPrice)} per unit
          </p>
        </CardContent>
      </Card>

      {/* Stock Movement Chart */}
      {chartData.length > 0 && (
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
                {/*
                 * Label seri diambil dari prop `name` pada <Bar>, bukan dari dataKey:
                 * recharts mengirim `name || dataKey` (ChartUtils.js) ke formatter, jadi
                 * mencocokkan `name === 'stockIn'` di sini selalu gagal dan kedua baris
                 * tooltip akan berlabel "Keluar".
                 */}
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelStyle={{ fontSize: 10 }}
                />
                <Bar dataKey="stockIn" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Masuk" />
                <Bar dataKey="stockOut" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} name="Keluar" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Kartu Stok */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Table2 className="w-4 h-4" />
            Kartu Stok
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk atau SKU..."
              className="h-10 pl-9"
            />
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-12">
              <Table2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'Tidak ada produk yang cocok.'
                  : 'Tidak ada produk bergerak pada periode ini.'}
              </p>
            </div>
          ) : (
            /*
             * 9 kolom lebih lebar dari layar HP, jadi kolom Produk dibuat sticky
             * supaya tetap terbaca saat digulir ke kanan — tanpa itu pengguna
             * kehilangan jejak baris mana yang sedang dibaca.
             */
            <Table className="text-xs min-w-[52rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 z-20 bg-card border-r w-[10rem] min-w-[10rem] h-9 px-3">
                    Produk
                  </TableHead>
                  <TableHead className="h-9 px-2 text-right whitespace-nowrap">Stok Awal</TableHead>
                  <TableHead className="h-9 px-2 text-right whitespace-nowrap">Stok Masuk</TableHead>
                  <TableHead className="h-9 px-2 text-right whitespace-nowrap">Terjual</TableHead>
                  <TableHead className="h-9 px-2 text-right whitespace-nowrap">Penyesuaian +</TableHead>
                  <TableHead className="h-9 px-2 text-right whitespace-nowrap">Penyesuaian −</TableHead>
                  <TableHead className="h-9 px-2 text-right whitespace-nowrap border-l">Stok Akhir</TableHead>
                  <TableHead className="h-9 px-2 text-right whitespace-nowrap">HPP (Rp)</TableHead>
                  <TableHead className="h-9 px-2 text-right whitespace-nowrap">Nilai Akhir (Rp)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.productId} className="group">
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-muted border-r px-3 py-2">
                      <p className="font-medium truncate max-w-[9rem]">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.sku}</p>
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums">{num(r.openingStock)}</TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums text-success">
                      {plus(r.stockIn)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums text-destructive">
                      {deduction(r.sold)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums text-success">
                      {plus(r.adjustIn)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums text-destructive">
                      {deduction(r.adjustOut)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums font-bold border-l">
                      {num(r.closingStock)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums">{num(r.hpp)}</TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                      {num(r.closingValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {totals && !search && (
                <TableFooter>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="sticky left-0 z-10 bg-muted border-r px-3 py-2 font-semibold">
                      TOTAL
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums">{num(totals.openingStock)}</TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums">{plus(totals.stockIn)}</TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums">{deduction(totals.sold)}</TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums">{plus(totals.adjustIn)}</TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums">
                      {deduction(totals.adjustOut)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums border-l">
                      {num(totals.closingStock)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right tabular-nums" />
                    <TableCell className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                      {num(totals.closingValue)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}

          {mismatch && (
            <p className="text-xs text-warning">
              Stok akhir ({totals!.closingStock}) berbeda dari stok sistem ({totals!.currentStock}).
              Perbedaan bisa berasal dari perubahan stok produk yang tidak tercatat sebagai
              stok masuk/keluar.
            </p>
          )}
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
        <AlertCard
          title={`Stok Menipis (${lowStockProducts.length})`}
          tone="warning"
          icon={<AlertTriangle className="w-4 h-4" />}
          items={lowStockProducts.map((p) => ({
            key: p.id,
            name: p.name,
            value: `${p.stock} ${p.unit}`,
          }))}
        />
      )}

      {/* Out of Stock */}
      {outOfStockProducts.length > 0 && (
        <AlertCard
          title={`Stok Habis (${outOfStockProducts.length})`}
          tone="destructive"
          icon={<Package className="w-4 h-4" />}
          items={outOfStockProducts.map((p) => ({
            key: p.id,
            name: p.name,
            value: `0 ${p.unit}`,
          }))}
        />
      )}

      {/* Sudah Kadaluarsa */}
      {expiredBatches.length > 0 && (
        <AlertCard
          title={`Sudah Kadaluarsa (${expiredBatches.length})`}
          tone="destructive"
          icon={<CalendarX2 className="w-4 h-4" />}
          items={expiredBatches.map((b) => ({
            key: b.id,
            name: b.productName,
            sub: format(new Date(b.expireDate), 'dd MMM yyyy', { locale: localeId }),
            value: `${b.quantity} ${b.unit}`,
          }))}
        />
      )}

      {/* Akan Kadaluarsa (≤7 hari) */}
      {expiringSoonBatches.length > 0 && (
        <AlertCard
          title={`Akan Kadaluarsa ≤ 7 Hari (${expiringSoonBatches.length})`}
          tone="warning"
          icon={<Clock className="w-4 h-4" />}
          items={expiringSoonBatches.map((b) => ({
            key: b.id,
            name: b.productName,
            sub: format(new Date(b.expireDate), 'dd MMM yyyy', { locale: localeId }),
            value: `${b.quantity} ${b.unit}`,
          }))}
        />
      )}

      <ExportRangeDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        title="Ekspor Laporan Stok"
        description="Pilih rentang tanggal untuk mengunduh laporan stok dalam format Excel (.xlsx)."
        defaultStartMs={defaultRange.startMs}
        defaultEndMs={defaultRange.endMs}
        onExport={async (start, end) => {
          const result = await exportStockReportToExcel(start, end);
          if (result.productCount === 0 && result.movementCount === 0) {
            return {
              empty: true,
              message: 'Tidak ada mutasi stok pada rentang tanggal tersebut.',
            };
          }
          return {
            message: `Berhasil mengekspor laporan stok (${result.productCount} produk, ${result.movementCount} mutasi).`,
          };
        }}
      />
    </div>
  );
}

// ── Kartu alert ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  title: string;
  tone: 'warning' | 'destructive';
  icon: ReactNode;
  items: { key: number; name: string; sub?: string; value: string }[];
}

/**
 * Kartu alert dengan daftar utuh — dulu dipotong 5 item sehingga sisanya tidak
 * pernah terlihat. Kini bisa di-scroll supaya jumlahnya tetap terbaca.
 */
function AlertCard({ title, tone, icon, items }: AlertCardProps) {
  const toneText = tone === 'warning' ? 'text-warning' : 'text-destructive';
  const toneBorder = tone === 'warning' ? 'border-warning/50' : 'border-destructive/50';

  return (
    <Card className={`border-0 shadow-sm ${toneBorder}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm flex items-center gap-1.5 ${toneText}`}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-2 ${items.length > 6 ? 'max-h-64 overflow-y-auto' : ''}`}>
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{it.name}</p>
              {it.sub && <p className="text-[10px] text-muted-foreground">{it.sub}</p>}
            </div>
            <span className={`text-sm font-bold shrink-0 ${toneText}`}>{it.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
