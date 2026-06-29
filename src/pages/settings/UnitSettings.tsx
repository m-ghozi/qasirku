import { useState } from 'react';
import { Ruler, Plus, Trash2, Edit2, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  useUnits,
  useCreateUnit,
  useUpdateUnit,
  useDeleteUnit,
} from '@/hooks/use-units';
import type { Unit } from '@/services/unit.service';

// ponytail: no permission guard — Satuan was ungated in the original Settings page
export default function UnitSettings() {
  const { data: units = [] } = useUnits();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  const [unitDialog, setUnitDialog] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [unitIsDefault, setUnitIsDefault] = useState(false);
  const [unitEditId, setUnitEditId] = useState<number | null>(null);
  const [unitDeleteTarget, setUnitDeleteTarget] = useState<Unit | null>(null);

  const openUnitAdd = () => {
    setUnitEditId(null); setUnitName(''); setUnitIsDefault(false);
    setUnitDialog(true);
  };

  const openUnitEdit = (u: Unit) => {
    setUnitEditId(u.id); setUnitName(u.name); setUnitIsDefault(u.isDefault);
    setUnitDialog(true);
  };

  const saveUnit = () => {
    if (!unitName.trim()) return;
    if (unitEditId) {
      updateUnit.mutate(
        { id: unitEditId, payload: { name: unitName.trim(), isDefault: unitIsDefault } },
        { onSuccess: () => setUnitDialog(false) },
      );
    } else {
      createUnit.mutate(
        { name: unitName.trim(), isDefault: unitIsDefault },
        { onSuccess: () => setUnitDialog(false) },
      );
    }
  };

  const confirmDeleteUnit = () => {
    if (!unitDeleteTarget) return;
    deleteUnit.mutate(unitDeleteTarget.id, { onSuccess: () => setUnitDeleteTarget(null) });
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Ruler className="w-5 h-5 text-primary" />
            Satuan
          </h1>
        </div>
        <Button size="sm" onClick={openUnitAdd} className="h-9 gap-1.5"><Plus className="w-4 h-4" /> Tambah</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 space-y-1">
          {units.length === 0 && (
            <p className="text-xs text-muted-foreground py-1.5">Belum ada satuan</p>
          )}
          {units.map(u => (
            <div key={u.id} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{u.name}</span>
                {u.isDefault && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    Default
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openUnitEdit(u)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setUnitDeleteTarget(u)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>{unitEditId ? 'Edit' : 'Tambah'} Satuan</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Satuan</Label>
              <Input value={unitName} onChange={e => setUnitName(e.target.value)} placeholder="Contoh: pak, lusin, mangkok" className="h-11" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Jadikan Default</p>
                <p className="text-[10px] text-muted-foreground">Satuan ini otomatis terpilih saat tambah produk baru</p>
              </div>
              <button type="button" role="switch" aria-checked={unitIsDefault} onClick={() => setUnitIsDefault(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${unitIsDefault ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${unitIsDefault ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <Button className="w-full h-11" onClick={saveUnit} disabled={!unitName.trim() || createUnit.isPending || updateUnit.isPending}>
              {createUnit.isPending || updateUnit.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unitDeleteTarget} onOpenChange={open => { if (!open) setUnitDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Satuan "{unitDeleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk yang sudah memakai satuan ini tetap tersimpan, tapi satuan tidak akan muncul lagi di pilihan saat tambah atau edit produk baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUnit} className="bg-destructive text-destructive-foreground" disabled={deleteUnit.isPending}>
              {deleteUnit.isPending ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
