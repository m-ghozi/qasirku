import { useState } from 'react';
import { CreditCard, Plus, Trash2, Edit2, Star, EyeOff, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeactivatePaymentMethod,
  useDeletePaymentMethod,
  useSetDefaultPaymentMethod,
} from '@/hooks/use-payment-methods';
import type { PaymentMethod, PaymentCategory } from '@/services/paymentMethod.service';

const PAYMENT_CATEGORIES: { value: PaymentCategory; label: string; emoji: string }[] = [
  { value: 'tunai', label: 'Tunai', emoji: '💵' },
  { value: 'transfer', label: 'Transfer', emoji: '🏦' },
  { value: 'qris', label: 'QRIS', emoji: '📷' },
  { value: 'e-wallet', label: 'E-Wallet', emoji: '📱' },
];

export default function PaymentMethodSettings() {
  const { can } = useAuth();
  const { data: paymentMethods = [] } = usePaymentMethods(true);
  const createPaymentMethod = useCreatePaymentMethod();
  const updatePaymentMethod = useUpdatePaymentMethod();
  const deactivatePaymentMethod = useDeactivatePaymentMethod();
  const deletePaymentMethod = useDeletePaymentMethod();
  const setDefaultPaymentMethod = useSetDefaultPaymentMethod();

  const [pmDialog, setPmDialog] = useState(false);
  const [pmName, setPmName] = useState('');
  const [pmCategory, setPmCategory] = useState<PaymentCategory>('tunai');
  const [pmIsDefault, setPmIsDefault] = useState(false);
  const [pmEditId, setPmEditId] = useState<number | null>(null);
  const [pmDeactivateTarget, setPmDeactivateTarget] = useState<PaymentMethod | null>(null);
  const [pmDeleteTarget, setPmDeleteTarget] = useState<PaymentMethod | null>(null);

  if (!can('manage_categories_payments')) {
    return <LockedPage title="Metode Pembayaran" permissionLabel="Kelola kategori & pembayaran" />;
  }

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

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Metode Pembayaran
          </h1>
        </div>
        <Button size="sm" onClick={openPmAdd} className="h-9 gap-1.5"><Plus className="w-4 h-4" /> Tambah</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 space-y-1">
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
    </div>
  );
}
