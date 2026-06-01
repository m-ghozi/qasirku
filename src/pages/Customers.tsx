import { useState } from 'react';
import { Users as UsersIcon, Plus, Edit2, Trash2, Phone, MapPin, Mail, Search, Eye, Receipt as ReceiptIcon, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCustomerTransactions,
} from '@/hooks/use-customers';
import { type Customer } from '@/services/customer.service';

export default function CustomersPage() {
  const { can } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const { data: customers = [], isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  // Riwayat transaksi — hanya fetch saat dialog view terbuka
  const { data: customerHistory } = useCustomerTransactions(viewCustomer?.id ?? 0);

  if (!can('manage_customers')) {
    return <LockedPage title="Pelanggan" permissionLabel="Kelola Pelanggan" />;
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditCustomer(null);
    setName(''); setPhone(''); setEmail(''); setAddress(''); setNotes('');
    setDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setName(c.name);
    setPhone(c.phone ?? '');
    setEmail(c.email ?? '');
    setAddress(c.address ?? '');
    setNotes(c.notes ?? '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (editCustomer?.id) {
      await updateCustomer.mutateAsync({ id: editCustomer.id, payload });
    } else {
      await createCustomer.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCustomer.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const isSaving = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-primary" />
          Pelanggan
        </h1>
        <Button size="sm" onClick={openAdd} className="h-9 gap-1.5">
          <Plus className="w-4 h-4" /> Tambah
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari pelanggan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} pelanggan</p>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada pelanggan</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Tambah Pelanggan
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    {c.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    )}
                    {c.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {c.email}
                      </p>
                    )}
                    {c.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {c.address}
                      </p>
                    )}
                    {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewCustomer(c)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>{editCustomer ? 'Edit' : 'Tambah'} Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Pelanggan *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Budi Santoso" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor HP</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="08123456789" className="h-11" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" className="h-11" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Alamat pelanggan" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan tambahan" rows={2} />
            </div>
            <Button className="w-full h-11" onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pelanggan?</AlertDialogTitle>
            <AlertDialogDescription>
              Data pelanggan yang dihapus tidak bisa dikembalikan. Transaksi lama tetap menyimpan nama pelanggan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCustomer.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteCustomer.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View customer + transaction history */}
      <Dialog open={!!viewCustomer} onOpenChange={(open) => { if (!open) setViewCustomer(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md rounded-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-primary" />
              {viewCustomer?.name}
            </DialogTitle>
          </DialogHeader>

          {viewCustomer && (
            <div className="space-y-4 mt-1">
              {/* Contact info */}
              <div className="space-y-1.5">
                {viewCustomer.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {viewCustomer.phone}</p>
                )}
                {viewCustomer.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {viewCustomer.email}</p>
                )}
                {viewCustomer.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {viewCustomer.address}</p>
                )}
                {viewCustomer.notes && (
                  <p className="text-sm text-muted-foreground italic">{viewCustomer.notes}</p>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Total Transaksi</p>
                  <p className="text-lg font-bold">{customerHistory?.summary.totalTransactions ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-primary/5 p-3">
                  <p className="text-[10px] text-muted-foreground">Total Belanja</p>
                  <p className="text-lg font-bold text-primary">
                    {customerHistory
                      ? `Rp ${Number(customerHistory.summary.totalSpent).toLocaleString('id-ID')}`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Transaction history */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <ReceiptIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-sm font-semibold">Riwayat Transaksi</p>
                </div>

                {!customerHistory ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Memuat...</p>
                ) : customerHistory.transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Belum ada transaksi</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerHistory.transactions.map(tx => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => navigate(`/history?txId=${tx.id}`)}
                        className="w-full text-left rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="secondary" className="text-[10px] shrink-0">{tx.receiptNumber}</Badge>
                            {tx.status === 'open' && (
                              <Badge className="text-[9px] bg-warning/15 text-warning shrink-0">Open Bill</Badge>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary shrink-0">
                            Rp {Number(tx.total).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(tx.date), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                        </p>
                        {tx.paymentMethod && (
                          <p className="text-[10px] text-muted-foreground">{tx.paymentMethod.name}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}