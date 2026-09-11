import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { downscaleToJpeg } from '@/lib/image-utils';
import {
  isStandalonePWA,
  detectCameraErrorName,
  cameraErrorMessage,
  cameraUnsupportedMessage,
  listVideoInputDevices,
  pickCameraDeviceId,
  type FacingMode,
} from '@/lib/camera';
import { toast } from 'sonner';

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  /** Dipanggil dengan JPEG data URL yang sudah dikompres siap disimpan. */
  onCapture: (photoDataUrl: string) => void;
  /** Opsi buka galeri/pemilih file; dipanggil setelah dialog kamera ditutup. */
  onPickGallery?: () => void;
}

type PermissionStatus = 'checking' | 'granted' | 'denied' | 'unsupported';

/**
 * Dialog kamera in-app: preview langsung dari getUserMedia + tombol shutter.
 * Hasil jepretan langsung diperkecil & di-encode JPEG via `downscaleToJpeg`,
 * jadi gambar yang dikirim ke `onCapture` siap disimpan sebagai foto produk.
 */
export default function CameraCapture({
  open,
  onClose,
  onCapture,
  onPickGallery,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permission, setPermission] = useState<PermissionStatus>('checking');
  const [errorState, setErrorState] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [canFlip, setCanFlip] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setPermission('checking');
    setErrorState(null);
    setReady(false);

    const start = async () => {
      // 1. Kamera hanya tersedia di secure context (HTTPS / localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        if (cancelled) return;
        setPermission('denied');
        setErrorState('Aplikasi harus diakses melalui HTTPS untuk mengakses kamera.');
        return;
      }

      // 2. Cek ketersediaan API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (cancelled) return;
        setPermission('unsupported');
        setErrorState(cameraUnsupportedMessage());
        return;
      }

      // 3. Minta stream kamera. Hint `facingMode` dulu supaya prompt izin muncul
      //    sekaligus label kamera terisi; deviceId pasti ditentukan di langkah 5.
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
      } catch (err: unknown) {
        if (cancelled) return;
        const name = detectCameraErrorName(err);
        // Perangkat mungkin tak punya kamera sesuai facingMode → fallback kamera apa pun
        if (name === 'OverconstrainedError' || name === 'NotFoundError') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch (err2: unknown) {
            if (cancelled) return;
            setPermission('denied');
            setErrorState(cameraErrorMessage(detectCameraErrorName(err2)));
            return;
          }
        } else {
          setPermission('denied');
          setErrorState(cameraErrorMessage(name));
          return;
        }
      }

      if (cancelled) {
        stream?.getTracks().forEach(t => t.stop());
        return;
      }

      // 4. Tampilkan stream ke elemen <video>
      const showStream = async (mediaStream: MediaStream) => {
        streamRef.current = mediaStream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = mediaStream;
          try {
            await video.play();
          } catch {
            // play() bisa reject bila komponen keburu ditutup — diabaikan
          }
        }
      };

      await showStream(stream);
      setPermission('granted');

      // 5. Tombol ganti kamera + pastikan kamera yang terpakai sesuai arah.
      //    Hint `facingMode` boleh diabaikan browser (tombol ganti kamera jadi
      //    terasa tidak berfungsi), jadi bila daftar kamera tersedia kita ambil
      //    ulang memakai deviceId yang pasti.
      try {
        const devices = await listVideoInputDevices();
        if (cancelled) return;
        setCanFlip(devices.length > 1);

        const currentId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
        const targetId = pickCameraDeviceId(devices, facingMode, currentId);
        if (targetId && targetId !== currentId) {
          stream.getTracks().forEach(t => t.stop());
          const exact = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: targetId } },
            audio: false,
          });
          if (cancelled) {
            exact.getTracks().forEach(t => t.stop());
            return;
          }
          stream = exact;
          await showStream(exact);
        }
      } catch {
        // enumerateDevices tidak didukung / diblokir → andalkan hint facingMode
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open, facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      toast.error('Kamera belum siap, coba lagi sebentar.');
      return;
    }
    try {
      // drawImage memakai frame asli, jadi foto tersimpan tanpa mirror.
      const photo = downscaleToJpeg(video, video.videoWidth, video.videoHeight);
      onCapture(photo);
    } catch {
      toast.error('Gagal mengambil foto. Coba lagi.');
    }
  };

  const showError = permission === 'denied' || permission === 'unsupported';

  return (
    <Dialog open={open} onOpenChange={v => v || onClose()}>
      {/* Sama seperti BarcodeScanner: 95vw dibatasi ke layar sempit saja, kalau
          tidak di desktop dialog jadi ~95vw dan preview kamera terlihat zoom. */}
      <DialogContent className="max-w-[95vw] sm:max-w-md rounded-xl p-0 overflow-x-hidden overflow-y-auto max-h-[92dvh]">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Ambil Foto Produk
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
              <div className="w-full bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto max-h-[60vh] object-contain"
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={() => setReady(true)}
                />
              </div>
              {permission === 'checking' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                  <p className="text-white text-sm">Meminta izin kamera...</p>
                </div>
              )}
            </>
          )}

          {canFlip && !showError && (
            <div className="absolute top-3 right-3">
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg"
                title="Ganti kamera"
                onClick={() => setFacingMode(m => (m === 'environment' ? 'user' : 'environment'))}
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>

        {showError ? (
          <div className="p-4 pt-2">
            <Button variant="outline" className="w-full" onClick={onClose}>
              <CameraOff className="w-4 h-4 mr-2" />
              Tutup
            </Button>
          </div>
        ) : (
          <div className="p-4 pt-2 grid grid-cols-3 items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 gap-1.5 justify-self-start"
              onClick={() => {
                onClose();
                onPickGallery?.();
              }}
            >
              <ImageIcon className="w-4 h-4" />
              Galeri
            </Button>
            <button
              type="button"
              aria-label="Ambil foto"
              onClick={handleCapture}
              disabled={permission !== 'granted' || !ready}
              className="h-16 w-16 rounded-full bg-primary shadow-lg ring-4 ring-primary/25 active:scale-95 transition disabled:opacity-40 justify-self-center"
            />
            <span aria-hidden="true" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
