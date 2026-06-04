import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, ChevronRight, ChevronLeft, ShoppingCart, Package, BarChart3, Shield, Database, Palette, Download, CheckCircle2, Globe, Share2, Info } from 'lucide-react';
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

  // PWA install hook — canInstall, isInstalled, isIOS semua dari sini
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();

  const totalSteps = tutorialSlides.length + 2;
  const isTutorialStep = step < tutorialSlides.length;
  const isInstallStep = step === tutorialSlides.length;
  const isStoreStep = step === tutorialSlides.length + 1;
  const tutorialIndex = step;

  // Sudah dianggap "selesai" install jika: sudah terinstall (standalone) ATAU user sudah klik install lalu accept
  const installResolved = isInstalled || installDone;

  const handleInstall = async () => {
    const ok = await install();
    if (ok) {
      setInstallDone(true);
      toast.success('Berhasil install KasirGratisan!');
    }
  };

  const handleFinish = async () => {
    if (!storeName.trim()) return;
    setSaving(true);
    try {
      await updateStoreSetting.mutateAsync({
        storeName: storeName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        receiptFooter: 'Terima kasih atas kunjungan Anda!',
        onboardingDone: true,
        themeColor,
      });

      await seedDefaultData();

      if (loadDummy) {
        await seedDummyData();
      }

      navigate('/', { replace: true });
    } catch (e) {
      console.error('Onboarding error:', e);
      toast.error('Terjadi kesalahan saat menyimpan data, coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render install step content ──────────────────────────────────────────

  const renderInstallStep = () => {
    // Sudah terinstall / sudah install via prompt
    if (installResolved) {
      return (
        <>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-success bg-success/10">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">Sudah Terinstall! ✅</h2>
            <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
              KasirGratisan sudah terinstall. Kamu bisa buka langsung dari home screen!
            </p>
          </div>
        </>
      );
    }

    // Browser mendukung install prompt (Chrome/Edge desktop & Android)
    if (canInstall) {
      return (
        <>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-primary bg-primary/10">
            <Download className="w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">Install sebagai Aplikasi</h2>
            <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Install KasirGratisan di HP kamu supaya bisa diakses langsung dari home screen, tanpa buka browser.
            </p>
          </div>
          <div className="space-y-3 w-full max-w-xs">
            <Button
              size="lg"
              className="w-full h-12 text-base font-semibold"
              onClick={handleInstall}
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
        </>
      );
    }

    // iOS Safari — instruksi manual Share → Add to Home Screen
    if (isIOS) {
      return (
        <>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-primary bg-primary/10">
            <Share2 className="w-12 h-12" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">Install di iPhone/iPad</h2>
            <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Tambahkan ke Home Screen supaya bisa dibuka seperti aplikasi biasa.
            </p>
          </div>
          <div className="space-y-3 w-full max-w-xs text-left">
            <InstallStep n={1}>
              Buka di <strong>Safari</strong> (bukan Chrome atau browser lain).
            </InstallStep>
            <InstallStep n={2}>
              Ketuk tombol <Share2 className="w-3.5 h-3.5 inline mx-0.5 -mt-0.5" />{' '}
              <strong>Share</strong> di bagian bawah layar.
            </InstallStep>
            <InstallStep n={3}>
              Pilih <strong>"Add to Home Screen"</strong>, lalu ketuk <strong>Add</strong>.
            </InstallStep>
          </div>
        </>
      );
    }

    // Non-iOS, tidak ada install prompt (Firefox, Samsung Browser, dll) — instruksi manual
    return (
      <>
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-primary bg-primary/10">
          <Download className="w-12 h-12" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">Install sebagai Aplikasi</h2>
          <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Tambahkan ke home screen supaya bisa dibuka langsung tanpa browser.
          </p>
        </div>
        <div className="space-y-3 max-w-xs text-left">
          <InstallStep n={1}>
            Buka halaman ini di <strong>Chrome</strong> atau <strong>Edge</strong>.
          </InstallStep>
          <InstallStep n={2}>
            Ketuk menu <strong>(⋮)</strong> di pojok kanan atas.
          </InstallStep>
          <InstallStep n={3}>
            Pilih <strong>"Install app"</strong> atau <strong>"Add to Home screen"</strong>.
          </InstallStep>
          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Kalau opsi tidak muncul, refresh halaman dulu lalu coba lagi.</span>
          </div>
        </div>
      </>
    );
  };

  // ── Render navigation buttons ────────────────────────────────────────────

  const renderNavigation = () => {
    if (isInstallStep) {
      return (
        <>
          {/* Tombol back dari install step ke tutorial terakhir */}
          <Button variant="outline" size="lg" onClick={() => setStep(s => s - 1)} className="h-12">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Setelah install resolved → tombol Lanjut */}
          {installResolved && (
            <Button size="lg" className="flex-1 h-12 text-base font-semibold" onClick={() => setStep(s => s + 1)}>
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}

          {/* canInstall=true tapi belum install: tombol Lanjut sudah ada di dalam konten (inline "Lanjut di Browser"),
              tapi kita tambahkan juga di bawah supaya konsisten dengan UX step lain */}
          {!installResolved && canInstall && (
            <Button
              variant="ghost"
              size="lg"
              className="flex-1 h-12 text-base text-muted-foreground"
              onClick={() => setStep(s => s + 1)}
            >
              Lewati
            </Button>
          )}

          {/* Tidak ada prompt (iOS / browser lain): tombol Lanjut langsung */}
          {!installResolved && !canInstall && (
            <Button size="lg" className="flex-1 h-12 text-base font-semibold" onClick={() => setStep(s => s + 1)}>
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </>
      );
    }

    if (isStoreStep) {
      return (
        <>
          <Button variant="outline" size="lg" onClick={() => setStep(s => s - 1)} className="h-12">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            className="flex-1 h-12 text-base font-semibold"
            onClick={handleFinish}
            disabled={!storeName.trim() || saving}
          >
            {saving ? 'Menyiapkan data...' : 'Mulai Jualan! 🚀'}
          </Button>
        </>
      );
    }

    // Tutorial steps
    return (
      <>
        {step > 0 && (
          <Button variant="outline" size="lg" onClick={() => setStep(s => s - 1)} className="h-12">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <Button size="lg" className="flex-1 h-12 text-base font-semibold" onClick={() => setStep(s => s + 1)}>
          Lanjut <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </>
    );
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-background max-w-lg md:max-w-6xl mx-auto overflow-y-auto" style={{ height: '100dvh', WebkitOverflowScrolling: 'touch' }}>
      <div className="min-h-full flex flex-col">

        {/* Progress dots */}
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
          {/* Tutorial slides */}
          {isTutorialStep && (() => {
            const slide = tutorialSlides[tutorialIndex];
            const Icon = slide.icon;
            return (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className={cn('w-24 h-24 rounded-3xl flex items-center justify-center', slide.color)}>
                  <Icon className="w-12 h-12" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold tracking-tight">{slide.title}</h2>
                  <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{slide.description}</p>
                </div>
              </div>
            );
          })()}

          {/* Install step */}
          {isInstallStep && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              {renderInstallStep()}
            </div>
          )}

          {/* Store setup step */}
          {isStoreStep && (
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
          {renderNavigation()}
        </div>
      </div>
    </div>
  );
}

// ── Helper: numbered step for install instructions ────────────────────────────
function InstallStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
        {n}
      </div>
      <p className="text-sm flex-1 pt-1">{children}</p>
    </div>
  );
}