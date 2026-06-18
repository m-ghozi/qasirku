import { useState, useRef, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Package as PackageIcon, Camera, X, Copy, ScanLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';
import { useAuth } from '@/hooks/use-auth';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';
import { useUnits } from '@/hooks/use-units';
import BarcodeScanner from '@/components/BarcodeScanner';
import type { Product } from '@/services/product.service';

export default function Produk() {
  const { can } = useAuth();
  const canManage = can('manage_products');

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [hpp, setHpp] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field tujuan hasil scan kamera: SKU atau Barcode.
  const [scanTarget, setScanTarget] = useState<'sku' | 'barcode' | null>(null);

  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: units = [] } = useUnits();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // Default unit dari master, fallback ke 'pcs'
  const defaultUnit = useMemo(
    () => units.find((u: { isDefault: boolean }) => u.isDefault)?.name ?? 'pcs',
    [units],
  );

  // Dropdown unit: gabung master aktif + unit produk saat ini jika sudah dihapus/diganti
  const unitOptions = useMemo(() => {
    const names = units.map((u: { name: string }) => u.name);
    if (unit && !names.includes(unit)) return [...names, unit];
    return names;
  }, [units, unit]);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false);
    const matchCategory = filterCategory === 'all' || p.categoryId === Number(filterCategory);
    return matchSearch && matchCategory;
  });

  const getCategoryName = (catId: number) =>
    categories.find((c: { id: number; name: string }) => c.id === catId)?.name ?? '-';
  const getCategoryColor = (catId: number) =>
    categories.find((c: { id: number; color: string }) => c.id === catId)?.color ?? '#999';

  const openAdd = () => {
    setEditProduct(null);
    setName('');
    setSku('');
    setCategoryId(categories?.[0]?.id?.toString() ?? '');
    setPrice('');
    setHpp('');
    setStock('');
    setUnit(defaultUnit);
    setBarcode('');
    setDescription('');
    setPhoto(undefined);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategoryId(p.categoryId.toString());
    setPrice(p.price.toString());
    setHpp(p.hpp.toString());
    setStock(p.stock.toString());
    setUnit(p.unit);
    setBarcode(p.barcode ?? '');
    setDescription(p.description ?? '');
    setPhoto(p.photo);
    setDialogOpen(true);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      // handled by compressImage
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!name.trim() || !categoryId || !sku.trim()) return;

    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      categoryId: Number(categoryId),
      price: Number(price) || 0,
      hpp: Number(hpp) || 0,
      // Stok hanya dikirim saat tambah produk baru
      ...(!editProduct && { stock: Number(stock) || 0 }),
      unit: unit.trim() || defaultUnit,
      description: description.trim() || undefined,
      barcode: barcode.trim() || undefined,
      photo: photo || undefined,
    };

    if (editProduct?.id) {
      updateProduct.mutate(
        { id: editProduct.id, payload },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createProduct.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteProduct.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  const isSaving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <PackageIcon className="w-5 h-5 text-primary" />
          Produk
        </h1>
        {canManage && (
          <Button size="sm" onClick={openAdd} className="h-9 gap-1.5">
            <Plus className="w-4 h-4" />
            Tambah
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[120px] h-10">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {categories.map((c: { id: number; name: string; icon: string }) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product count */}
      <p className="text-xs text-muted-foreground">{filtered.length} produk ditemukan</p>

      {/* Loading skeleton */}
      {loadingProducts ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <PackageIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada produk</p>
          {canManage && (
            <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Tambah Produk
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Product thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <PackageIcon className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                      <Badge
                        variant="outline"
                        className="text-[10px] shrink-0"
                        style={{
                          borderColor: getCategoryColor(p.categoryId),
                          color: getCategoryColor(p.categoryId),
                        }}
                      >
                        {getCategoryName(p.categoryId)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">SKU: {p.sku || '-'}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm font-bold text-primary">
                        Rp {Number(p.price).toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        HPP: Rp {Number(p.hpp).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          'text-xs font-medium px-1.5 py-0.5 rounded',
                          p.stock <= 5
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-success/10 text-success',
                        )}
                      >
                        Stok: {p.stock} {p.unit}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(p.id!)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Photo picker */}
            <div className="space-y-1.5">
              <Label>Foto Produk</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photo ? (
                    <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {photo ? 'Ganti Foto' : 'Pilih Foto'}
                  </Button>
                  {photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive gap-1.5"
                      onClick={() => setPhoto(undefined)}
                    >
                      <X className="w-3.5 h-3.5" />
                      Hapus Foto
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Produk *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Nasi Goreng"
                className="h-11"
              />
            </div>

            {/* SKU — full row with scan button */}
            <div className="space-y-1.5">
              <Label>SKU *</Label>
              <div className="flex gap-2">
                <Input
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="Wajib diisi, contoh: NG001"
                  className="h-11 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  title="Scan dengan kamera"
                  onClick={() => setScanTarget('sku')}
                >
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Kategori — full row */}
            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length > 0 ? (
                    categories.map((c: { id: number; name: string; icon: string }) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__empty" disabled>
                      Belum ada kategori
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Harga Jual *</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="15000"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>HPP</Label>
                <Input
                  type="number"
                  value={hpp}
                  onChange={e => setHpp(e.target.value)}
                  placeholder="10000"
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Stok Awal
                  {editProduct && (
                    <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                      (ubah lewat Stock In/Out)
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="0"
                  className="h-11"
                  disabled={!!editProduct}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Satuan</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.length === 0 ? (
                      <SelectItem value="pcs">pcs</SelectItem>
                    ) : (
                      unitOptions.map((u: string) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Barcode — full row with copy + scan buttons */}
            <div className="space-y-1.5">
              <Label>Barcode</Label>
              <div className="flex gap-2">
                <Input
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="Opsional"
                  className="h-11 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  title="Salin dari SKU"
                  onClick={() => setBarcode(sku.trim())}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  title="Scan dengan kamera"
                  onClick={() => setScanTarget('barcode')}
                >
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Catatan/info tambahan, mis: isi 5 pcs, level pedas, supplier"
                rows={3}
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
            </div>

            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleSave}
              disabled={!name.trim() || !categoryId || !sku.trim() || isSaving}
            >
              {isSaving ? 'Menyimpan...' : editProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>Produk yang dihapus tidak bisa dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scanner kamera untuk SKU / Barcode */}
      <BarcodeScanner
        open={scanTarget !== null}
        onClose={() => setScanTarget(null)}
        onScan={(value) => {
          const v = value.trim();
          if (scanTarget === 'sku') setSku(v);
          else if (scanTarget === 'barcode') setBarcode(v);
          setScanTarget(null);
        }}
      />
    </div>
  );
}