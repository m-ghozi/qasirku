import { useState, useMemo } from 'react';
import { Wallet, Plus, ChevronLeft, Edit2, Trash2, Calendar, Receipt, FilterX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import {
  useExpenseCategories,
  useExpenses,
  useExpenseSummary,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/hooks/use-expenses'
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Expense, RangePreset } from '@/services/expense.service';

// ── Constants ─────────────────────────────────────────────────────────────────

const RANGE_LABELS: Record<RangePreset, string> = {
  today: 'Hari ini',
  '7': '7 hari',
  '30': '30 hari',
  month: 'Bulan ini',
  all: 'Semua',
};

const rp = (n: number | string) =>
  `Rp ${Number(n).toLocaleString('id-ID')}`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { can } = useAuth();

  // ── Filters ──
  const [range, setRange] = useState<RangePreset>('30');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

  // ── Form state ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  // ── Delete confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // ── Queries ──
  const filters = useMemo(
    () => ({
      range,
      ...(filterCategoryId !== 'all' && { categoryId: Number(filterCategoryId) }),
    }),
    [range, filterCategoryId],
  );

  const { data: expenses = [], isLoading: loadingExpenses } = useExpenses(filters);
  const { data: summary } = useExpenseSummary({ range, ...(filterCategoryId !== 'all' && { categoryId: Number(filterCategoryId) }) });
  const { data: categories = [] } = useExpenseCategories();
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data } = await api.get('/payment-methods');
      return data.data as { id: number; name: string; category: string }[];
    },
  });
  const paymentMethods = paymentMethodsData ?? [];

  // ── Mutations ──
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  // ── Permissions ──
  const canManage = can('manage_expenses');
  const canView = can('view_expenses') || canManage;

  // ── Helpers ──
  const getCategory = (id: number) => categories.find((c) => c.id === id);
  const getPaymentName = (id: number | null) =>
    id ? (paymentMethods.find((p) => p.id === id)?.name ?? '-') : '-';

  const noCategories = categories.length === 0;
  const noPaymentMethods = paymentMethods.length === 0;

  // ── Form helpers ──
  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setCategoryId(categories.length > 0 ? String(categories[0].id) : '');
    setAmount('');
    setPaymentMethodId(paymentMethods.length > 0 ? String(paymentMethods[0].id) : '');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setTitle(exp.title);
    setCategoryId(String(exp.categoryId));
    setAmount(String(Number(exp.amount)));
    setPaymentMethodId(exp.paymentMethodId ? String(exp.paymentMethodId) : '');
    setDate(format(new Date(exp.date), 'yyyy-MM-dd'));
    setNotes(exp.notes ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const numericAmount = Number(amount);

    if (!trimmedTitle) return;
    if (!categoryId) return;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;
    if (!date) return;

    const payload = {
      title: trimmedTitle,
      categoryId: Number(categoryId),
      amount: numericAmount,
      paymentMethodId: paymentMethodId ? Number(paymentMethodId) : undefined,
      date,
      notes: notes.trim() || undefined,
    };

    if (editing?.id) {
      await updateExpense.mutateAsync({ id: editing.id, payload });
    } else {
      await createExpense.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await deleteExpense.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ── Permission gate ──
  if (!canView) {
    return <LockedPage title="Pengeluaran" permissionLabel="Lihat Pengeluaran" />;
  }

  const isSaving = createExpense.isPending || updateExpense.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pt-6 pb-20 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-warning" />
            Pengeluaran
          </h1>
        </div>
        {canManage && (
          <Button size="sm" onClick={openAdd} className="h-9 gap-1.5">
            <Plus className="w-4 h-4" /> Tambah
          </Button>
        )}
      </div>

      {/* Range filter */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(RANGE_LABELS) as RangePreset[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${range === r
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted bg-background text-muted-foreground'
              }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Summary card */}
      <Card className="border-0 shadow-sm bg-warning/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Total Pengeluaran ({RANGE_LABELS[range]})
            </p>
            <p className="text-lg font-bold">
              {summary ? rp(summary.totalAmount) : rp(0)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {summary?.totalCount ?? 0} catatan
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex items-center gap-2">
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger className="h-10 flex-1">
            <SelectValue placeholder="Filter kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterCategoryId !== 'all' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setFilterCategoryId('all')}
            title="Hapus filter"
          >
            <FilterX className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Expense list */}
      {loadingExpenses ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {filterCategoryId !== 'all'
              ? 'Tidak ada pengeluaran sesuai filter'
              : 'Belum ada pengeluaran tercatat'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => {
            const cat = getCategory(exp.categoryId);
            return (
              <Card key={exp.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base"
                      style={{ backgroundColor: ((cat?.color ?? exp.category?.color ?? '#6B7280') + '20') }}
                    >
                      {cat?.icon ?? exp.category?.icon ?? '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{exp.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {cat?.name ?? exp.category?.name ?? '—'} ·{' '}
                            {getPaymentName(exp.paymentMethodId)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-warning shrink-0">
                          -{rp(exp.amount)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(exp.date), 'dd MMM yyyy', { locale: idLocale })}
                        </span>
                      </div>
                      {exp.notes && (
                        <p className="text-[11px] text-muted-foreground mt-1 italic line-clamp-2">
                          {exp.notes}
                        </p>
                      )}
                      {canManage && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => openEdit(exp)}
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive gap-1"
                            onClick={() => setDeleteTarget(exp)}
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!isSaving) setDialogOpen(open); }}>
        <DialogContent className="max-w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle>
          </DialogHeader>

          {(noCategories || noPaymentMethods) && (
            <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 text-xs text-foreground">
              {noCategories && <p>Belum ada kategori pengeluaran. Tambahkan dulu di Pengaturan.</p>}
              {noPaymentMethods && <p>Belum ada metode pembayaran. Tambahkan dulu di Pengaturan.</p>}
            </div>
          )}

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Judul *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Bayar listrik bulan ini"
                className="h-11"
                maxLength={120}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={isSaving}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nominal *</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  className="h-11"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Metode Pembayaran</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId} disabled={isSaving}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih metode (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsional"
                rows={3}
                className="resize-none"
                disabled={isSaving}
              />
            </div>

            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleSave}
              disabled={noCategories || isSaving}
            >
              {isSaving
                ? 'Menyimpan...'
                : editing
                  ? 'Simpan Perubahan'
                  : 'Catat Pengeluaran'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengeluaran?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" sebesar {deleteTarget && rp(deleteTarget.amount)} akan
              dihapus. Catatan ini tidak akan masuk ke laporan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExpense.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteExpense.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteExpense.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}