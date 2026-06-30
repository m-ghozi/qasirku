import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressImage } from '@/lib/image-utils';

// jsdom tak punya canvas asli — kita stub HTMLCanvasElement + Image agar
// menguji LOGIKA scaling (proporsi & batas maxSize), bukan encoding JPEG.

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAAA');
});

/** Stub global Image dengan dimensi tertentu; onload dipanggil saat src diset. */
function stubImage(width: number, height: number, fail = false) {
  vi.stubGlobal(
    'Image',
    class {
      width = width;
      height = height;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()));
      }
    },
  );
}

function makeFile() {
  return new File(['x'], 'p.png', { type: 'image/png' });
}

describe('compressImage', () => {
  it('landscape: lebar > maxSize → diperkecil proporsional', async () => {
    stubImage(400, 200);
    let captured = { w: 0, h: 0 };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      captured = { w: this.width, h: this.height };
      return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    });
    const res = await compressImage(makeFile(), 200);
    expect(res).toMatch(/^data:image\/jpeg/);
    expect(captured.w).toBe(200); // 400 → 200
    expect(captured.h).toBe(100); // proporsional
  });

  it('gambar lebih kecil dari maxSize → dimensi tak berubah', async () => {
    stubImage(50, 40);
    let captured = { w: 0, h: 0 };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      captured = { w: this.width, h: this.height };
      return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    });
    await compressImage(makeFile(), 200);
    expect(captured).toEqual({ w: 50, h: 40 });
  });

  it('Image.onerror → reject', async () => {
    stubImage(100, 100, true);
    await expect(compressImage(makeFile())).rejects.toThrow('Failed to load image');
  });
});
