import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  ArrowLeft, Search, Receipt as ReceiptIcon, Calendar,
  ChevronRight, ShoppingBag, CalendarIcon, X, Trash2,
  ShoppingCart, UserCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ReceiptDialog from '@/components/Receipt';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useTransactions, useCancelTransaction } from '@/hooks/use-transactions';
import { useStoreSetting } from '@/hooks/use-store-setting';
import type { Transaction, TransactionItem } from '@/services/transaction.service';

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'open'>('all');
  const [filterCashier, setFilterCashier] = useState<string>('all');

  // ── API hooks ──────────────────────────────────────────────────────────────
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: storeSetting } = useStoreSetting();
  const cancelTransaction = useCancelTransaction();

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getTxItems = (tx: Transaction): TransactionItem[] => tx.items ?? [];

  const getPaymentName = (tx: Transaction): string =>
    tx.paymentMethod?.name ?? 'Tunai';

  const cashierName = (tx: Transaction): string =>
    tx.createdBy?.name ?? '—';

  // Daftar kasir unik dari data transaksi (untuk filter dropdown)
  const cashierList = Array.from(
    new Map(
      transactions
        .filter(tx => tx.createdBy)
        .map(tx => [tx.createdBy!.id, tx.createdBy!])
    ).values()
  );
  const showCashierCol = transactions.some(tx => tx.createdBy);

  // ── Auto-open detail dari URL param ───────────────────────────────────────
  const txIdParam = searchParams.get('txId');
  useEffect(() => {
    if (txIdParam && transactions.length > 0) {
      const tx = transactions.find(
        t => String(t.id) === txIdParam || t.receiptNumber === txIdParam
      );
      if (tx) {
        setSelectedTx(tx);
        setDetailOpen(true);
      }
    }
  }, [txIdParam, transactions]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = transactions.filter(tx => {
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;

    if (filterCashier !== 'all') {
      if (filterCashier === 'unknown') {
        if (tx.createdBy) return false;
      } else if (String(tx.createdBy?.id) !== filterCashier) {
        return false;
      }
    }

    if (dateFrom && new Date(tx.date) < startOfDay(dateFrom)) return false;
    if (dateTo && new Date(tx.date) > endOfDay(dateTo)) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        tx.receiptNumber.toLowerCase().includes(q) ||
        getTxItems(tx).some(it => (it.productName ?? '').toLowerCase().includes(q))
      );
    }
    return true;
  });

  // ── Group by date ──────────────────────────────────────────────────────────
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const key = format(new Date(tx.date), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});
  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const filteredTotal = filtered
    .filter(t => t.status !== 'open')
    .reduce((s, t) => s + t.total, 0);

  const hasDateFilter = !!dateFrom || !!dateTo;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openDetail = (tx: Transaction) => {
    setSelectedTx(tx);
    setDetailOpen(true);
  };

  const openReceipt = () => {
    setDetailOpen(false);
    setTimeout(() => setReceiptOpen(true), 200);
  };

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleCancelTransaction = () => {
    if (!selectedTx) return;
    cancelTransaction.mutate(selectedTx.id, {
      onSuccess: () => {
        toast.success('Transaksi berhasil dihapus');
        setDeleteDialogOpen(false);
        setDetailOpen(false);
        setSelectedTx(null);
      },
      onError: () => {
        toast.error('Gagal menghapus transaksi');
      },
    });
  };

  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ReceiptIcon className="w-5 h-5 text-primary" />
          Riwayat Transaksi
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari no. struk atau nama produk..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-2 mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline" size="sm"
              className={cn('h-9 text-xs gap-1.5 flex-1', dateFrom && 'border-primary text-primary')}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateFrom ? format(dateFrom, 'dd MMM yyyy', { locale: localeId }) : 'Dari tanggal'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-muted-foreground">—</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline" size="sm"
              className={cn('h-9 text-xs gap-1.5 flex-1', dateTo && 'border-primary text-primary')}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateTo ? format(dateTo, 'dd MMM yyyy', { locale: localeId }) : 'Sampai tanggal'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarPicker
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        {hasDateFilter && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={clearDateFilter}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {([
          { value: 'all', label: 'Semua' },
          { value: 'open', label: 'Open Bill' },
          { value: 'completed', label: 'Lunas' },
        ] as const).map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              filterStatus === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cashier filter — tampil hanya jika ada data kasir */}
      {showCashierCol && (
        <div className="mb-4">
          <Select value={filterCashier} onValueChange={setFilterCashier}>
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-1.5">
                <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="Filter Kasir" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kasir</SelectItem>
              {cashierList.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.name} (@{u.username})
                </SelectItem>
              ))}
              <SelectItem value="unknown">Tanpa Kasir (data lama)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total Transaksi</p>
              <p className="text-lg font-bold text-primary">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total Penjualan</p>
              <p className="text-lg font-bold text-primary">{rp(filteredTotal)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-16">Memuat data...</p>
      ) : dateKeys.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {hasDateFilter ? 'Tidak ada transaksi di rentang tanggal ini' : 'Belum ada transaksi'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dateKeys.map(dateKey => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                  {format(new Date(dateKey), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                </p>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {grouped[dateKey].length} transaksi
                </Badge>
              </div>
              <div className="space-y-2">
                {grouped[dateKey].map(tx => (
                  <Card
                    key={tx.id}
                    className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                    onClick={() => openDetail(tx)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        tx.status === 'open'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-primary/10 text-primary'
                      )}>
                        {tx.status === 'open'
                          ? <ShoppingCart className="w-4 h-4" />
                          : <ReceiptIcon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-mono text-muted-foreground truncate">
                              {tx.receiptNumber}
                            </p>
                            {tx.status === 'open' ? (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-warning/20 text-warning border-warning/30">
                                Open
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-success/20 text-success border-success/30">
                                Lunas
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.date), 'HH:mm')}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-primary">{rp(tx.total)}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
                          {tx.createdBy && (
                            <span className="flex items-center gap-0.5">
                              <UserCircle2 className="w-3 h-3" />
                              {tx.createdBy.name}
                            </span>
                          )}
                          {tx.customerName && <span>👤 {tx.customerName}</span>}
                          {tx.tableNumber && <span>Meja {tx.tableNumber}</span>}
                          {tx.remarks && <span>📝 {tx.remarks}</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {getTxItems(tx).map(it => it.productName).join(', ')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="bottom"
          className="h-[80vh] rounded-t-2xl max-w-lg md:max-w-xl mx-auto flex flex-col"
        >
          <SheetHeader className="shrink-0">
            <SheetTitle className="text-left">Detail Transaksi</SheetTitle>
          </SheetHeader>
          {selectedTx && (
            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pb-6">
              {/* Meta */}
              <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className={cn(
                    'font-semibold',
                    selectedTx.status === 'open' ? 'text-warning' : 'text-success'
                  )}>
                    {selectedTx.status === 'open' ? 'Open Bill' : 'Lunas'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">No. Struk</span>
                  <span className="font-mono font-medium">{selectedTx.receiptNumber}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tanggal</span>
                  <span>
                    {format(new Date(selectedTx.date), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pembayaran</span>
                  <span>{selectedTx.status === 'open' ? '-' : getPaymentName(selectedTx)}</span>
                </div>
                {selectedTx.createdBy && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Kasir</span>
                    <span className="flex items-center gap-1">
                      <UserCircle2 className="w-3 h-3" />
                      {cashierName(selectedTx)}
                    </span>
                  </div>
                )}
                {selectedTx.customerName && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pelanggan</span>
                    <span>👤 {selectedTx.customerName}</span>
                  </div>
                )}
                {selectedTx.tableNumber && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Meja</span>
                    <span>{selectedTx.tableNumber}</span>
                  </div>
                )}
                {selectedTx.remarks && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Catatan</span>
                    <span className="text-right max-w-[60%]">{selectedTx.remarks}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Item</p>
                {getTxItems(selectedTx).map((item, i) => (
                  <div key={i} className="flex justify-between items-start bg-muted/30 p-2.5 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.quantity} × {rp(item.price)}
                        {(item.discountAmount ?? 0) > 0 && ` (diskon ${rp(item.discountAmount!)})`}
                      </p>
                      {item.notes && (
                        <p className="text-[10px] text-accent mt-0.5">📝 {item.notes}</p>
                      )}
                    </div>
                    <p className="text-sm font-semibold">{rp(item.subtotal ?? item.totalPrice)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{rp(selectedTx.subtotal)}</span>
                </div>
                {selectedTx.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Diskon</span>
                    <span>-{rp(selectedTx.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{rp(selectedTx.total)}</span>
                </div>
                {selectedTx.status !== 'open' ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bayar</span>
                      <span>{rp(selectedTx.paymentAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kembali</span>
                      <span className="text-success font-medium">{rp(selectedTx.change)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profit</span>
                      <span className="text-success font-medium">{rp(selectedTx.profit)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-warning italic">Bill belum dibayar</p>
                )}
              </div>

              {/* Actions */}
              {selectedTx.status === 'open' ? (
                <Button
                  className="w-full h-11"
                  onClick={() => { setDetailOpen(false); navigate('/cashier'); }}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Lanjutkan di Kasir
                </Button>
              ) : (
                <Button className="w-full h-11" onClick={openReceipt}>
                  <ReceiptIcon className="w-4 h-4 mr-2" />
                  Lihat & Cetak Struk
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full h-11 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={!can('delete_transaction') || cancelTransaction.isPending}
                title={!can('delete_transaction') ? 'Anda tidak punya akses untuk menghapus transaksi' : undefined}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus Transaksi
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Receipt reprint */}
      {selectedTx && (
        <ReceiptDialog
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          transaction={selectedTx}
          items={getTxItems(selectedTx)}
          storeSettings={storeSetting}
          paymentMethodName={getPaymentName(selectedTx)}
          cashierName={selectedTx.createdBy?.name}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={open => { if (!open) setDeleteDialogOpen(false); }}
      >
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi{' '}
              <span className="font-mono font-semibold">{selectedTx?.receiptNumber}</span>{' '}
              senilai{' '}
              <span className="font-semibold">
                Rp {selectedTx?.total.toLocaleString('id-ID')}
              </span>{' '}
              akan dihapus. Stok produk akan dikembalikan secara otomatis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelTransaction}
              disabled={cancelTransaction.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelTransaction.isPending ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}