import { describe, it, expect } from 'vitest';
import {
  detectCameraErrorName,
  cameraErrorMessage,
  cameraDeniedMessage,
  cameraUnsupportedMessage,
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
