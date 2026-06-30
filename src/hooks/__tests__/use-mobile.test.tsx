import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

// Kontrol matchMedia + innerWidth untuk menguji breakpoint 768px.
let changeHandler: (() => void) | null = null;

beforeEach(() => {
  changeHandler = null;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: (_: string, cb: () => void) => { changeHandler = cb; },
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => vi.unstubAllGlobals());

function setWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: w });
}

describe('useIsMobile', () => {
  it('lebar < 768 → true', () => {
    setWidth(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('lebar >= 768 → false', () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('bereaksi terhadap event change media query', () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => {
      setWidth(400);
      changeHandler?.();
    });
    expect(result.current).toBe(true);
  });
});
