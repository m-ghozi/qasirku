import { useState } from 'react';
import { ArrowDownToLine, Plus, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';
import { useStockIn, useCreateStockIn } from '@/hooks/use-stock';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useProducts } from '@/hooks/use-products';
import NumberInput from '@/components/NumberInput';
import SearchableSelect from '@/components/SearchableSelect';
import ProductPicker from '@/components/ProductPicker';

export default function StockInPage() {
  const { can } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');

  const { data: stockIns = [] } = useStockIn();
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const createStockIn = useCreateStockIn();

  if (!can('manage_stock_inout')) {
    return <LockedPage title="Stock In" permissionLabel="Stock In / Stock Out" />;
  }

  const filtered = stockIns.filter(si =>
    filterSupplier === 'all' || si.supplierId === Number(filterSupplier)
  );

  const openAdd = () => {
    setProductId(''); setSupplierId(''); setQuantity(''); setBuyPrice(''); setNotes('');
    setDialogOpen(true);
  };

  const handleSave = () => {
    const qty = Number(quantity);
    const price = Number(buyPrice);
    if (!productId || !supplierId || qty <= 0 || price <= 0) {
      toast.error('Lengkapi semua field');
      return;
    }

    createStockIn.mutate(
      {
        productId: Number(productId),
        supplierId: Number(supplierId),
        quantity: qty,
        buyPrice: price,
        notes: notes.trim() || undefined,
      },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-success" />
            Stock In
          </h1>
        </div>
        <Button size="sm" onClick={openAdd} className="h-9 gap-1.5">
          <Plus className="w-4 h-4" /> Tambah
        </Button>
      </div>

      <SearchableSelect
        value={filterSupplier}
        onChange={setFilterSupplier}
        placeholder="Filter Supplier"
        searchPlaceholder="Cari supplier..."
        options={[
          { value: 'all', label: 'Semua Supplier' },
          ...(suppliers?.map(s => ({ value: s.id!.toString(), label: s.name })) ?? []),
        ]}
      />

      <p className="text-xs text-muted-foreground">{filtered.length} catatan</p>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <ArrowDownToLine className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data stock in</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(si => (
            <Card key={si.id} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{si.product?.name ?? '-'}</h3>
                    <p className="text-xs text-muted-foreground">dari {si.supplier?.name ?? '-'}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs font-medium bg-success/10 text-success px-2 py-0.5 rounded">
                        +{si.quantity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @ Rp {Number(si.buyPrice).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {si.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{si.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(si.date), 'dd MMM yy', { locale: id })}
                    </p>
                    <p className="text-sm font-bold mt-1">
                      Rp {Number(si.totalPrice).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>Tambah Stock In</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Produk *</Label>
              <ProductPicker
                products={products ?? []}
                value={productId}
                onChange={setProductId}
                showHpp
              />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <SearchableSelect
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Pilih supplier"
                searchPlaceholder="Cari supplier..."
                options={suppliers?.map(s => ({ value: s.id!.toString(), label: s.name })) ?? []}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jumlah *</Label>
                <NumberInput value={quantity} onChange={setQuantity} placeholder="10" className="h-11" decimal />
              </div>
              <div className="space-y-1.5">
                <Label>Harga Beli/Unit *</Label>
                <NumberInput value={buyPrice} onChange={setBuyPrice} placeholder="5.000" className="h-11" decimal />
              </div>
            </div>
            {quantity && buyPrice && (
              <div className="bg-muted/50 p-3 rounded-xl text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold">
                  Rp {(Number(quantity) * Number(buyPrice)).toLocaleString('id-ID')}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Opsional"
                className="h-11"
              />
            </div>
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleSave}
              disabled={createStockIn.isPending}
            >
              {createStockIn.isPending ? 'Menyimpan...' : 'Simpan Stock In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}