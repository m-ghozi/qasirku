import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, CameraOff, Flashlight, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  isStandalonePWA,
  detectCameraErrorName,
  cameraErrorMessage,
  cameraDeniedMessage,
  cameraUnsupportedMessage,
  listVideoInputDevices,
  pickCameraDeviceId,
  type FacingMode,
  type VideoInputDevice,
} from '@/lib/camera';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

type PermissionStatus = 'checking' | 'prompt' | 'granted' | 'denied' | 'unsupported';

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  // Promise stop() terakhir, supaya scanner baru menunggu scanner lama benar-benar berhenti
  const stopPromiseRef = useRef<Promise<void>>(Promise.resolve());
  // deviceId kamera yang sedang dipakai — dipakai tombol ganti kamera untuk tahu
  // harus berpindah dari kamera mana.
  const deviceIdRef = useRef<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [permission, setPermission] = useState<PermissionStatus>('checking');
  const [errorState, setErrorState] = useState<string | null>(null);
  // Kamera aktif; tombol ganti kamera hanya muncul bila perangkat punya >1 kamera
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [canFlip, setCanFlip] = useState(false);
  const scannerId = 'barcode-scanner';

  useEffect(() => {
    if (!open) {
      // Dialog ditutup → tidak ada kamera yang jalan, jadi catatannya direset
      // agar pemilihan kamera saat dibuka lagi tidak menganggap yang lama aktif.
      deviceIdRef.current = null;
      return;
    }

    let cancelled = false;
    setPermission('checking');
    setErrorState(null);

    const startScanner = async () => {
      // 0. Secure context check (PWA must be HTTPS or localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        if (cancelled) return;
        setPermission('denied');
        setErrorState(
          'Aplikasi harus diakses melalui HTTPS untuk mengakses kamera.',
        );
        return;
      }

      // 1. Check mediaDevices availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (cancelled) return;
        setPermission('unsupported');
        setErrorState(cameraUnsupportedMessage());
        return;
      }

      // 2. Pre-check permission state (best effort, not all browsers support this)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const perms = (navigator as any).permissions;
        if (perms?.query) {
          const result = await perms.query({ name: 'camera' as PermissionName });
          if (cancelled) return;
          if (result.state === 'denied') {
            setPermission('denied');
            setErrorState(cameraDeniedMessage());
            return;
          }
        }
      } catch {
        // Permissions API not supported (Safari iOS, older Android WebView). Proceed anyway.
      }

      // 3. Pre-flight getUserMedia. This forces the browser to surface the
      //    permission prompt explicitly and gives us the *real* error name
      //    before html5-qrcode wraps it.
      let preflightStream: MediaStream | null = null;
      try {
        preflightStream = await navigator.mediaDevices.getUserMedia({
          // `ideal` supaya perangkat tanpa kamera yang diminta tetap dapat stream
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
      } catch (err: unknown) {
        if (cancelled) {
          preflightStream?.getTracks().forEach(t => t.stop());
          return;
        }
        const name = detectCameraErrorName(err);

        // Retry tanpa constraint facingMode bila perangkat tak punya kamera tsb
        if (name === 'OverconstrainedError' || name === 'NotFoundError') {
          try {
            preflightStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (err2: unknown) {
            if (cancelled) return;
            handlePreflightError(detectCameraErrorName(err2));
            return;
          }
        } else {
          handlePreflightError(name);
          return;
        }
      }

      // Daftar kamera diambil selagi stream preflight masih hidup — label kamera
      // ("facing front/back") baru terisi setelah izin benar-benar diberikan.
      let devices: VideoInputDevice[] = [];
      try {
        devices = await listVideoInputDevices();
      } catch {
        // enumerateDevices tidak tersedia/diblokir → andalkan facingMode saja
      }

      // Stop preflight stream — html5-qrcode will create its own.
      preflightStream?.getTracks().forEach(t => t.stop());
      if (cancelled) return;

      setCanFlip(devices.length > 1);

      // Kamera yang sedang jalan sebelum restart (mis. saat tombol ganti kamera ditekan)
      let targetDeviceId = pickCameraDeviceId(devices, facingMode, deviceIdRef.current);

      // Tunggu scanner sebelumnya benar-benar berhenti (mis. saat ganti kamera)
      // agar tidak berebut elemen #barcode-scanner.
      await stopPromiseRef.current;
      if (cancelled) return;

      // 4. Start html5-qrcode now that permission is confirmed.
      setPermission('granted');
      try {
        const scanner = new Html5Qrcode(scannerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;
        scanningRef.current = true;

        // NB: html5-qrcode hanya menerima `facingMode` sebagai string polos atau
        // `{ exact: ... }`. Bentuk `{ ideal: ... }` ditolak dengan string error
        // (bukan Error), sehingga tampak sebagai "UnknownError".
        const startWith = async (constraints: MediaTrackConstraints | { facingMode: string }) => {
          await scanner.start(
            constraints,
            { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.5 },
            decodedText => {
              onScan(decodedText);
              void handleStop();
            },
            () => {},
          );
        };

        try {
          // deviceId ({ exact }) paling andal untuk memilih kamera depan/belakang;
          // facingMode non-exact sering diabaikan browser sehingga tombol ganti
          // kamera tampak tidak berfungsi. Bila daftar kamera tak tersedia,
          // jatuh ke facingMode string yang didukung html5-qrcode.
          await startWith(
            targetDeviceId
              ? ({ deviceId: { exact: targetDeviceId } } as MediaTrackConstraints)
              : { facingMode: facingMode },
          );
        } catch (err: unknown) {
          const name = detectCameraErrorName(err);
          if (name === 'OverconstrainedError' || name === 'NotFoundError') {
            // deviceId target tidak lagi valid → pakai kamera lain yang tersedia
            const fallback =
              devices.find(d => d.deviceId !== targetDeviceId) ?? devices[0];
            if (!fallback) throw err;
            targetDeviceId = fallback.deviceId;
            await startWith({
              deviceId: { exact: fallback.deviceId },
            } as MediaTrackConstraints);
          } else {
            throw err;
          }
        }

        if (cancelled) {
          void handleStop();
          return;
        }

        // Catat kamera yang benar-benar dipakai (bisa berbeda dari target bila
        // browser mengabaikan constraint) agar tombol ganti kamera tahu harus
        // berpindah dari kamera mana.
        try {
          deviceIdRef.current =
            scanner.getRunningTrackSettings()?.deviceId ?? targetDeviceId;
        } catch {
          deviceIdRef.current = targetDeviceId;
        }

        try {
          const caps = scanner.getRunningTrackCameraCapabilities();
          if (caps && 'torchFeature' in caps) setHasFlash(true);
        } catch {
          // capability probe failed, no flash UI
        }
      } catch (err: unknown) {
        console.error('Scanner error:', err);
        if (cancelled) return;
        handleStartError(detectCameraErrorName(err));
      }
    };

    const handlePreflightError = (name: string) => {
      setPermission('denied');
      setErrorState(cameraErrorMessage(name));
    };

    const handleStartError = (name: string) => {
      setPermission('denied');
      setErrorState(`Gagal memulai scanner (${name}). Coba tutup dan buka kembali.`);
    };

    void startScanner();

    return () => {
      cancelled = true;
      stopPromiseRef.current = handleStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode]);

  const handleStop = async () => {
    if (scannerRef.current && scanningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore errors when stopping scanner
      }
      scannerRef.current = null;
    }
    scanningRef.current = false;
    setFlashOn(false);
    setHasFlash(false);
  };

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    try {
      const track = scannerRef.current.getRunningTrackCameraCapabilities();
      if (track && 'torchFeature' in track) {
        const torch = (track as unknown as { torchFeature: () => { apply: (on: boolean) => Promise<void> } }).torchFeature();
        await torch.apply(!flashOn);
        setFlashOn(!flashOn);
      }
    } catch {
      toast.error('Flash tidak didukung di perangkat ini');
    }
  };

  const handleClose = async () => {
    await handleStop();
    onClose();
  };

  /** Tukar kamera belakang <-> depan. Effect akan restart scanner dengan facingMode baru. */
  const toggleCamera = () => {
    setFacingMode(mode => (mode === 'environment' ? 'user' : 'environment'));
  };

  const showError = permission === 'denied' || permission === 'unsupported';

  return (
    <Dialog open={open} onOpenChange={v => v || handleClose()}>
      <DialogContent className="max-w-[95vw] rounded-xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {showError ? (
            <div className="w-full aspect-[4/3] bg-muted rounded-lg flex flex-col items-center justify-center p-6 text-center gap-3">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <p className="text-sm text-foreground font-medium">
                {errorState ?? 'Gagal memulai kamera.'}
              </p>
              {isStandalonePWA() && permission === 'denied' && (
                <p className="text-xs text-muted-foreground">
                  Tip: Setelah mengubah izin di Settings, buka kembali aplikasi.
                </p>
              )}
            </div>
          ) : (
            <>
              <div id={scannerId} className="w-full aspect-[4/3] bg-black rounded-lg" />
              {permission === 'checking' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                  <p className="text-white text-sm">Meminta izin kamera...</p>
                </div>
              )}
            </>
          )}

          <div className="absolute top-3 right-3 flex gap-2">
            {canFlip && !showError && (
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg"
                title="Ganti kamera depan/belakang"
                aria-label="Ganti kamera depan/belakang"
                onClick={toggleCamera}
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            )}
            {hasFlash && (
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg"
                onClick={toggleFlash}
              >
                <Flashlight className={`w-5 h-5 ${flashOn ? 'text-yellow-400' : ''}`} />
              </Button>
            )}
          </div>

          {permission === 'granted' && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                <p className="text-white text-xs text-center">
                  Arahkan barcode ke dalam kotak scan
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 pt-2">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            <CameraOff className="w-4 h-4 mr-2" />
            {showError ? 'Tutup' : 'Batal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
