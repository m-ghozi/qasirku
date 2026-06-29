import { useState } from 'react';
import { Tag, Plus, Trash2, Edit2, ChevronLeft } from 'lucide-react';
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
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-categories';
import type { Category } from '@/services/category.service';

const emojiOptions = ['📦', '🍕', '🥤', '🍜', '🧃', '🎽', '💊', '🧹', '📱', '🛒', '🎁', '✂️'];

export default function CategorySettings() {
  const { can } = useAuth();
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catColor, setCatColor] = useState('#FF6B35');
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catDeleteId, setCatDeleteId] = useState<number | null>(null);

  if (!can('manage_categories_payments')) {
    return <LockedPage title="Kategori Produk" permissionLabel="Kelola kategori & pembayaran" />;
  }

  const openCatAdd = () => {
    setCatEditId(null); setCatName(''); setCatIcon('📦'); setCatColor('#FF6B35');
    setCatDialog(true);
  };

  const openCatEdit = (c: Category) => {
    setCatEditId(c.id); setCatName(c.name); setCatIcon(c.icon); setCatColor(c.color);
    setCatDialog(true);
  };

  const saveCat = () => {
    if (!catName.trim()) return;
    if (catEditId) {
      updateCategory.mutate(
        { id: catEditId, payload: { name: catName.trim(), icon: catIcon, color: catColor } },
        { onSuccess: () => setCatDialog(false) },
      );
    } else {
      createCategory.mutate(
        { name: catName.trim(), icon: catIcon, color: catColor },
        { onSuccess: () => setCatDialog(false) },
      );
    }
  };

  const confirmDeleteCat = () => {
    if (catDeleteId == null) return;
    deleteCategory.mutate(catDeleteId, { onSuccess: () => setCatDeleteId(null) });
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Kategori Produk
          </h1>
        </div>
        <Button size="sm" onClick={openCatAdd} className="h-9 gap-1.5"><Plus className="w-4 h-4" /> Tambah</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 space-y-1">
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground py-1.5">Belum ada kategori</p>
          )}
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded flex items-center justify-center text-sm"
                  style={{ backgroundColor: c.color + '20' }}
                >
                  {c.icon}
                </span>
                <span className="text-sm font-medium">{c.name}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCatEdit(c)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setCatDeleteId(c.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>{catEditId ? 'Edit' : 'Tambah'} Kategori</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5"><Label>Nama Kategori</Label><Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Contoh: Snack" className="h-11" /></div>
            <div className="space-y-1.5">
              <Label>Ikon</Label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(e => (
                  <button key={e} onClick={() => setCatIcon(e)} className={`w-10 h-10 rounded-lg text-lg flex items-center justify-center border-2 transition-colors ${catIcon === e ? 'border-primary bg-primary/5' : 'border-muted'}`}>{e}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Warna</Label><Input type="color" value={catColor} onChange={e => setCatColor(e.target.value)} className="h-11 w-20" /></div>
            <Button className="w-full h-11" onClick={saveCat} disabled={!catName.trim() || createCategory.isPending || updateCategory.isPending}>
              {createCategory.isPending || updateCategory.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={catDeleteId !== null} onOpenChange={open => { if (!open) setCatDeleteId(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>Produk yang menggunakan kategori ini perlu dikaitkan ulang ke kategori lain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCat} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
