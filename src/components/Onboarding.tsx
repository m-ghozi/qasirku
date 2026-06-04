import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, ChevronRight, ChevronLeft, ShoppingCart, Package, BarChart3, Shield, Database, Palette, Download, CheckCircle2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import { applyThemeColor } from '@/hooks/use-theme-color';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { seedDefaultData, seedDummyData } from '@/lib/seed-default-data';
import { useUpdateStoreSetting } from '@/hooks/use-store-setting';


const tutorialSlides = [
  {
    icon: ShoppingCart,
    title: 'Kasir Cepat & Mudah',
    description: 'Proses transaksi dengan cepat. Pilih produk, atur diskon, dan pilih metode pembayaran — semua dalam hitungan detik.',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: Package,
    title: 'Kelola Stok Otomatis',
    description: 'Catat barang masuk dari supplier, stok berkurang otomatis saat penjualan, dan HPP dihitung otomatis.',
    color: 'text-accent bg-accent/10',
  },
  {
    icon: BarChart3,
    title: 'Laporan Lengkap',
    description: 'Pantau penjualan harian, profit, dan produk terlaris. Semua data tersaji dalam grafik yang mudah dipahami.',
    color: 'text-success bg-success/10',
  },
  {
    icon: Shield,
    title: 'Data Aman di HP Kamu',
    description: 'Semua data tersimpan di perangkatmu. Tidak perlu internet, tidak perlu server. Gratis selamanya!',
    color: 'text-warning bg-warning/10',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loadDummy, setLoadDummy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [themeColor, setThemeColorState] = useState('25');
  const [installDone, setInstallDone] = useState(false);
  const navigate = useNavigate();
  const updateStoreSetting = useUpdateStoreSetting();
  const { canInstall, isInstalled, install } = usePWAInstall();

  const totalSteps = tutorialSlides.length + 2;
  const isTutorialStep = step < tutorialSlides.length;
  const isInstallStep = step === tutorialSlides.length;
  const isStoreStep = step === tutorialSlides.length + 1;
  const tutorialIndex = step;

  const handleFinish = async () => {
    if (!storeName.trim()) return;
    setSaving(true);
    try {
      // 1. Simpan pengaturan toko + tandai onboardingDone
      await updateStoreSetting.mutateAsync({
        storeName: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        receiptFooter: 'Terima kasih atas kunjungan Anda!',
        onboardingDone: true,
        themeColor,
      });

      // 2. Selalu isi master data (satuan, kategori, metode pembayaran)
      await seedDefaultData();

      // 3. Opsional: isi data contoh produk & transaksi
      if (loadDummy) {
        await seedDummyData();
      }

      // 4. Masuk ke aplikasi
      navigate('/', { replace: true });
    } catch (e) {
      console.error('Onboarding error:', e);
      toast.error('Terjadi kesalahan saat menyimpan data, coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-background max-w-lg md:max-w-6xl mx-auto overflow-y-auto" style={{ height: '100dvh', WebkitOverflowScrolling: 'touch' }}>
      <div className="min-h-full flex flex-col">
        <div className="flex items-center justify-center gap-2 pt-8 pb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/20'
              )}
            />
          ))}
        </div>

        <div className="flex-1 flex flex-col px-4">
          {isTutorialStep ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              {(() => {
                const slide = tutorialSlides[tutorialIndex];
                const Icon = slide.icon;
                return (
                  <>
                    <div className={cn('w-24 h-24 rounded-3xl flex items-center justify-center', slide.color)}>
                      <Icon className="w-12 h-12" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold tracking-tight">{slide.title}</h2>
                      <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{slide.description}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : isInstallStep ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className={cn('w-24 h-24 rounded-3xl flex items-center justify-center',
                isInstalled || installDone ? 'text-success bg-success/10' : 'text-primary bg-primary/10'
              )}>
                {isInstalled || installDone ? <CheckCircle2 className="w-12 h-12" /> : <Download className="w-12 h-12" />}
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight">
                  {isInstalled || installDone ? 'Sudah Terinstall! ✅' : 'Install sebagai Aplikasi'}
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {isInstalled || installDone
                    ? 'KasirGratisan sudah terinstall. Kamu bisa buka langsung dari home screen!'
                    : 'Install KasirGratisan di HP kamu supaya bisa diakses langsung dari home screen, tanpa buka browser.'}
                </p>
              </div>
              {!isInstalled && !installDone && (
                canInstall ? (
                  <div className="space-y-3 w-full max-w-xs">
                    <Button
                      size="lg"
                      className="w-full h-12 text-base font-semibold"
                      onClick={async () => {
                        const ok = await install();
                        if (ok) {
                          setInstallDone(true);
                          toast.success('Berhasil install KasirGratisan!');
                        }
                      }}
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Install sebagai Aplikasi
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="w-full h-12 text-base text-muted-foreground"
                      onClick={() => setStep(s => s + 1)}
                    >
                      <Globe className="w-5 h-5 mr-2" />
                      Lanjut di Browser
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-xs">
                    <p className="text-sm text-muted-foreground">
                      Untuk install, buka di browser <strong>Chrome</strong> lalu ketuk menu (⋮) → <strong>"Add to Home screen"</strong> atau <strong>"Install app"</strong>.
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Di Safari iOS: ketuk tombol Share (↑) → "Add to Home Screen"
                    </p>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto space-y-6 py-4 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Store className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Setup Toko Kamu</h2>
                <p className="text-sm text-muted-foreground">Informasi ini akan tampil di struk belanja</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName" className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    Nama Toko <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="storeName"
                    placeholder="Contoh: Toko Berkah Jaya"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Alamat
                  </Label>
                  <Input
                    id="address"
                    placeholder="Contoh: Jl. Merdeka No. 10, Jakarta"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone"
                    placeholder="Contoh: 08123456789"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="h-12"
                    type="tel"
                  />
                </div>

                {/* Dummy data toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Muat data contoh</p>
                      <p className="text-[10px] text-muted-foreground">12 produk toserba, 2 supplier, 3 transaksi demo</p>
                    </div>
                  </div>
                  <Switch checked={loadDummy} onCheckedChange={setLoadDummy} />
                </div>

                {/* Theme color picker */}
                <div className="space-y-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Warna Tema</p>
                      <p className="text-[10px] text-muted-foreground">Pilih warna utama aplikasi</p>
                    </div>
                  </div>
                  <ThemeColorPicker
                    value={themeColor}
                    onChange={hue => {
                      setThemeColorState(hue);
                      applyThemeColor(hue);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-4 pt-4 flex items-center gap-3" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}>
          {step > 0 && !isInstallStep && (
            <Button variant="outline" size="lg" onClick={() => setStep(s => s - 1)} className="h-12">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {isInstallStep ? (
            <>
              {(isInstalled || installDone) && (
                <Button size="lg" className="flex-1 h-12 text-base font-semibold" onClick={() => setStep(s => s + 1)}>
                  Lanjut <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {!canInstall && !isInstalled && !installDone && (
                <Button size="lg" className="flex-1 h-12 text-base font-semibold" onClick={() => setStep(s => s + 1)}>
                  Lanjut <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </>
          ) : isStoreStep ? (
            <Button
              size="lg"
              className="flex-1 h-12 text-base font-semibold"
              onClick={handleFinish}
              disabled={!storeName.trim() || saving}
            >
              {saving ? 'Menyiapkan data...' : 'Mulai Jualan! 🚀'}
            </Button>
          ) : (
            <Button size="lg" className="flex-1 h-12 text-base font-semibold" onClick={() => setStep(s => s + 1)}>
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}