import { useState, useRef } from 'react';
import { Store, Edit2, Camera, X } from 'lucide-react';
import { compressImage } from '@/lib/image-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useStoreSetting, useUpdateStoreSetting } from '@/hooks/use-store-setting';

export default function StoreInfoCard({ canEdit }: { canEdit: boolean }) {
  const { data: storeSetting } = useStoreSetting();
  const updateStoreSetting = useUpdateStoreSetting();

  const [storeDialog, setStoreDialog] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeAddr, setStoreAddr] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeFooter, setStoreFooter] = useState('');
  const [storeLogo, setStoreLogo] = useState<string | null | undefined>(undefined);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const openStoreEdit = () => {
    setStoreName(storeSetting?.storeName ?? '');
    setStoreAddr(storeSetting?.address ?? '');
    setStorePhone(storeSetting?.phone ?? '');
    setStoreFooter(storeSetting?.receiptFooter ?? '');
    setStoreLogo(storeSetting?.logo);
    setStoreDialog(true);
  };

  const saveStore = () => {
    updateStoreSetting.mutate(
      { storeName: storeName.trim(), address: storeAddr.trim(), phone: storePhone.trim(), receiptFooter: storeFooter.trim(), logo: storeLogo, },
      { onSuccess: () => setStoreDialog(false) },
    );
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setStoreLogo(compressed);
    } catch {
      toast.error('Gagal memproses gambar');
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  return (
    <>
      <Card
        className={`border-0 shadow-sm ${canEdit ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
        onClick={() => canEdit && openStoreEdit()}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0">
            {storeSetting?.logo ? (
              <img src={storeSetting.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Store className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{storeSetting?.storeName || 'Toko Saya'}</p>
            <p className="text-xs text-muted-foreground">{storeSetting?.address || 'Belum diatur'}</p>
          </div>
          {canEdit && <Edit2 className="w-4 h-4 text-muted-foreground" />}
        </CardContent>
      </Card>

      <Dialog open={storeDialog} onOpenChange={setStoreDialog}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>Info Toko</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Logo Toko</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {storeLogo ? (
                    <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
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
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {storeLogo ? 'Ganti Logo' : 'Pilih Logo'}
                  </Button>
                  {storeLogo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive gap-1.5"
                      onClick={() => setStoreLogo(null)}
                    >
                      <X className="w-3.5 h-3.5" />
                      Hapus Logo
                    </Button>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>
            </div>
            <div className="space-y-1.5"><Label>Nama Toko</Label><Input value={storeName} onChange={e => setStoreName(e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Alamat</Label><Input value={storeAddr} onChange={e => setStoreAddr(e.target.value)} className="h-11" /></div>
            <div className="space-y-1.5"><Label>Telepon</Label><Input value={storePhone} onChange={e => setStorePhone(e.target.value)} className="h-11" type="tel" /></div>
            <div className="space-y-1.5"><Label>Receipt Footer</Label><Input value={storeFooter} onChange={e => setStoreFooter(e.target.value)} className="h-11" /></div>
            <Button className="w-full h-11" onClick={saveStore} disabled={updateStoreSetting.isPending}>
              {updateStoreSetting.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
