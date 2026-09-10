/**
 * Helper bersama untuk semua fitur yang memakai kamera
 * (scan barcode, ambil foto produk, dll).
 */

export type FacingMode = 'user' | 'environment';

export interface VideoInputDevice {
  deviceId: string;
  label: string;
}

const FRONT_CAMERA_RE = /front|user|depan|face/i;
const BACK_CAMERA_RE = /back|rear|environment|belakang|world/i;

/**
 * Daftar kamera yang tersedia. Label ("facing front/back") hanya terisi setelah
 * izin kamera diberikan, jadi panggil ini saat izin sudah dipegang (mis. setelah
 * `getUserMedia` berhasil).
 */
export async function listVideoInputDevices(): Promise<VideoInputDevice[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter(d => d.kind === 'videoinput')
    .map(d => ({ deviceId: d.deviceId, label: d.label }));
}

/**
 * Pilih deviceId kamera untuk arah tertentu.
 *
 * Urutan: cocokkan label ("facing front/back", "depan/belakang"); bila label
 * tidak informatif — umum di Android WebView — pakai urutan lazim perangkat
 * (index 0 kamera belakang, index 1 kamera depan). Bila hasilnya sama dengan
 * kamera yang sedang jalan, ambil kamera berikutnya supaya tombol ganti kamera
 * tetap berpindah.
 */
export function pickCameraDeviceId(
  devices: VideoInputDevice[],
  facingMode: FacingMode,
  currentDeviceId?: string | null,
): string | null {
  if (devices.length === 0) return null;

  const re = facingMode === 'user' ? FRONT_CAMERA_RE : BACK_CAMERA_RE;
  const matched = devices.find(d => re.test(d.label));
  if (matched) return matched.deviceId;

  let chosen = facingMode === 'user' ? (devices[1] ?? devices[0]) : devices[0];
  if (currentDeviceId && chosen.deviceId === currentDeviceId && devices.length > 1) {
    const index = devices.findIndex(d => d.deviceId === currentDeviceId);
    chosen = devices[(index + 1) % devices.length];
  }
  return chosen.deviceId;
}

/** Benar bila app berjalan sebagai PWA standalone (iOS Safari / Android). */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window.navigator as any).standalone) return true;
  // Browser lain
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

/**
 * Ambil nama error dari nilai error apa pun.
 * html5-qrcode sering membungkus DOMException asli menjadi string,
 * jadi kita cek `.name` sekaligus isi message-nya.
 */
export function detectCameraErrorName(err: unknown): string {
  if (err instanceof Error && err.name) {
    // DOMException punya `name` asli seperti "NotAllowedError"
    if (err.name !== 'Error') return err.name;
  }
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const known = [
    'NotAllowedError',
    'NotFoundError',
    'NotReadableError',
    'OverconstrainedError',
    'SecurityError',
    'AbortError',
    'TypeError',
  ];
  for (const name of known) {
    if (msg.includes(name)) return name;
  }
  return 'UnknownError';
}

/**
 * Pesan ramah untuk kegagalan `getUserMedia` (mis. izin ditolak saat prompt
 * muncul, kamera sedang dipakai app lain, dsb).
 */
export function cameraErrorMessage(name: string): string {
  switch (name) {
    case 'NotAllowedError':
      return isStandalonePWA()
        ? 'Izin kamera ditolak. Buka Settings perangkat > Apps > QasirKu > Permissions, lalu aktifkan Camera.'
        : 'Izin kamera ditolak. Mohon izinkan akses kamera lalu coba lagi.';
    case 'NotFoundError':
      return 'Kamera tidak ditemukan di perangkat ini.';
    case 'NotReadableError':
      return 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
    case 'OverconstrainedError':
      return 'Kamera tidak mendukung konfigurasi yang diminta.';
    case 'SecurityError':
      return 'Akses kamera diblokir karena alasan keamanan. Pastikan aplikasi diakses via HTTPS.';
    default:
      return `Gagal mengakses kamera (${name}).`;
  }
}

/**
 * Pesan saat izin kamera memang sudah berstatus ditolak sebelum mencoba
 * (terdeteksi lewat Permissions API) — berbeda dari penolakan saat prompt.
 */
export function cameraDeniedMessage(): string {
  return isStandalonePWA()
    ? 'Izin kamera ditolak. Buka Settings perangkat > Apps > QasirKu > Permissions, lalu aktifkan Camera.'
    : 'Izin kamera ditolak. Klik ikon gembok di address bar dan izinkan akses kamera.';
}

/**
 * Pesan saat browser/WebView tidak menyediakan API kamera sama sekali.
 */
export function cameraUnsupportedMessage(): string {
  return 'Browser tidak mendukung akses kamera. Coba update aplikasi atau gunakan browser lain.';
}
