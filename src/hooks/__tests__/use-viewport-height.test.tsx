import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useViewportHeight } from '@/hooks/use-viewport-height';

// Kontrol visualViewport untuk menguji deteksi keyboard virtual.
let resizeHandler: (() => void) | null = null;
let vvHeight = 800;

function stubVisualViewport(height: number) {
  vvHeight = height;
  vi.stubGlobal('visualViewport', {
    get height() {
      return vvHeight;
    },
    addEventListener: (_: string, cb: () => void) => {
      resizeHandler = cb;
    },
    removeEventListener: vi.fn(),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resizeHandler = null;
});

describe('useViewportHeight', () => {
  it('tanpa dukungan visualViewport → null (fallback ke min-h-dvh)', () => {
    vi.stubGlobal('visualViewport', undefined);
    const { result } = renderHook(() => useViewportHeight());
    expect(result.current).toBe(null);
  });

  it('mengembalikan tinggi visual viewport saat mount', async () => {
    stubVisualViewport(800);
    const { result } = renderHook(() => useViewportHeight());
    await waitFor(() => expect(result.current).toBe(800));
  });

  it('ikut menyusut saat keyboard muncul (event resize)', async () => {
    stubVisualViewport(800);
    const { result } = renderHook(() => useViewportHeight());
    await waitFor(() => expect(result.current).toBe(800));

    act(() => {
      vvHeight = 400;
      resizeHandler?.();
    });
    await waitFor(() => expect(result.current).toBe(400));
  });

  it('melepas listener resize saat unmount', async () => {
    stubVisualViewport(800);
    const { result, unmount } = renderHook(() => useViewportHeight());
    await waitFor(() => expect(result.current).toBe(800));

    const vv = window.visualViewport as unknown as { removeEventListener: ReturnType<typeof vi.fn> };
    unmount();
    expect(vv.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
