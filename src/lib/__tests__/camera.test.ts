import { describe, it, expect } from 'vitest';
import {
  detectCameraErrorName,
  cameraErrorMessage,
  cameraDeniedMessage,
  cameraUnsupportedMessage,
  isFrontFacingCamera,
  pickCameraDeviceId,
} from '@/lib/camera';

describe('pickCameraDeviceId', () => {
  const back = { deviceId: 'back-id', label: 'camera2 0, facing back' };
  const front = { deviceId: 'front-id', label: 'camera2 1, facing front' };

  it('memilih kamera berdasarkan label depan/belakang', () => {
    expect(pickCameraDeviceId([back, front], 'environment')).toBe('back-id');
    expect(pickCameraDeviceId([back, front], 'user')).toBe('front-id');
    // Urutan dibalik pun tetap benar karena label yang menentukan
    expect(pickCameraDeviceId([front, back], 'environment')).toBe('back-id');
  });

  it('memakai urutan perangkat saat label tidak informatif (WebView)', () => {
    const a = { deviceId: 'a', label: '' };
    const b = { deviceId: 'b', label: '' };
    expect(pickCameraDeviceId([a, b], 'environment')).toBe('a');
    expect(pickCameraDeviceId([a, b], 'user')).toBe('b');
  });

  it('berpindah ke kamera lain bila pilihan sama dengan kamera yang jalan', () => {
    const a = { deviceId: 'a', label: '' };
    const b = { deviceId: 'b', label: '' };
    expect(pickCameraDeviceId([a, b], 'environment', 'a')).toBe('b');
  });

  it('mengembalikan null bila tidak ada kamera', () => {
    expect(pickCameraDeviceId([], 'environment')).toBeNull();
  });
});

describe('isFrontFacingCamera', () => {
  const back = { deviceId: 'back-id', label: 'camera2 0, facing back' };
  const front = { deviceId: 'front-id', label: 'camera2 1, facing front' };
  const laptopCam = { deviceId: 'laptop', label: 'HD Webcam' };

  it('percaya arah yang dilaporkan track', () => {
    expect(isFrontFacingCamera('user', 'environment', [back, front])).toBe(true);
    expect(isFrontFacingCamera('environment', 'user', [back, front])).toBe(false);
  });

  it('webcam tunggal tetap dianggap kamera depan walau yang diminta environment', () => {
    // Kasus laptop: cuma ada satu kamera dan itu menghadap pengguna, jadi
    // permintaan `environment` tetap dipenuhi kamera depan.
    expect(isFrontFacingCamera(undefined, 'environment', [laptopCam])).toBe(true);
    expect(isFrontFacingCamera(null, 'environment', [laptopCam])).toBe(true);
  });

  it('kamera tunggal berlabel "facing back" tidak di-mirror', () => {
    expect(isFrontFacingCamera(undefined, 'environment', [back])).toBe(false);
  });

  it('memakai label kamera yang sedang jalan saat kamera lebih dari satu', () => {
    // Laptop Windows Hello: kamera RGB + kamera IR, arah tak dilaporkan browser.
    // Keduanya menghadap pengguna karena di daftar tak ada kamera belakang.
    const rgb = { deviceId: 'rgb', label: 'Integrated Camera' };
    const ir = { deviceId: 'ir', label: 'IR Camera' };
    expect(isFrontFacingCamera(undefined, 'environment', [rgb, ir], 'rgb')).toBe(true);
    expect(isFrontFacingCamera(undefined, 'environment', [rgb, ir], 'ir')).toBe(true);
  });

  it('tidak menganggap kamera depan bila perangkat memang punya kamera belakang', () => {
    // Label aktif tidak menyebut arah, tapi ada kamera belakang di daftar →
    // jangan menebak, ikuti arah yang diminta.
    const unknown = { deviceId: 'x', label: 'USB Camera' };
    expect(isFrontFacingCamera(undefined, 'environment', [unknown, back], 'x')).toBe(false);
    expect(isFrontFacingCamera(undefined, 'user', [unknown, back], 'x')).toBe(true);
    // Label belakang menang walau arah yang diminta 'user'
    expect(isFrontFacingCamera(undefined, 'user', [back, front], 'back-id')).toBe(false);
  });

  it('bila ada beberapa kamera tanpa laporan arah, ikuti arah yang diminta', () => {
    const a = { deviceId: 'a', label: '' };
    const b = { deviceId: 'b', label: '' };
    expect(isFrontFacingCamera(undefined, 'user', [a, b])).toBe(true);
    expect(isFrontFacingCamera(undefined, 'environment', [a, b])).toBe(false);
  });

  it('tidak crash saat daftar kamera belum terisi', () => {
    expect(isFrontFacingCamera(undefined, 'user')).toBe(true);
    expect(isFrontFacingCamera(undefined, 'environment')).toBe(false);
  });
});

describe('detectCameraErrorName', () => {
  it('memakai .name dari DOMException/Error bernama', () => {
    const err = new Error('denied');
    err.name = 'NotAllowedError';
    expect(detectCameraErrorName(err)).toBe('NotAllowedError');
  });

  it('menebak nama dari isi message (html5-qrcode membungkus error jadi string)', () => {
    expect(detectCameraErrorName('Error: NotFoundError: no camera')).toBe('NotFoundError');
    expect(detectCameraErrorName(new Error('NotReadableError: busy'))).toBe('NotReadableError');
  });

  it('mengembalikan UnknownError untuk error tak dikenal', () => {
    expect(detectCameraErrorName(new Error('boom'))).toBe('UnknownError');
    expect(detectCameraErrorName(undefined)).toBe('UnknownError');
  });
});

describe('cameraErrorMessage', () => {
  it('memberi pesan spesifik per jenis error', () => {
    expect(cameraErrorMessage('NotFoundError')).toContain('tidak ditemukan');
    expect(cameraErrorMessage('NotReadableError')).toContain('aplikasi lain');
    expect(cameraErrorMessage('SecurityError')).toContain('HTTPS');
  });

  it('menyertakan nama error pada kasus tak dikenal', () => {
    expect(cameraErrorMessage('OddError')).toBe('Gagal mengakses kamera (OddError).');
  });
});

describe('cameraDeniedMessage / cameraUnsupportedMessage', () => {
  it('mengembalikan pesan non-kosong (non-standalone di jsdom)', () => {
    expect(cameraDeniedMessage()).toContain('Izin kamera ditolak');
    expect(cameraUnsupportedMessage()).toContain('tidak mendukung akses kamera');
  });
});
