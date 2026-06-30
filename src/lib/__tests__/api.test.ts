import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Uji interceptor response: 401 → hapus token + redirect, kecuali di /login.
// 403 / error lain → diteruskan tanpa logout.

let onFulfilled: (res: unknown) => unknown;
let onRejected: (err: unknown) => unknown;

vi.mock('axios', () => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: {
        use: vi.fn((f, r) => {
          onFulfilled = f;
          onRejected = r;
        }),
      },
    },
  };
  return { default: { create: vi.fn(() => instance) } };
});

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  await import('@/lib/api'); // mendaftarkan interceptor → mengisi onRejected
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubLocation(pathname: string) {
  const loc = { pathname, href: '' };
  vi.stubGlobal('window', { ...window, location: loc });
  return loc;
}

describe('response interceptor', () => {
  it('meneruskan response sukses apa adanya', () => {
    expect(onFulfilled({ data: 1 })).toEqual({ data: 1 });
  });

  it('401 di luar /login → hapus token & redirect ke /login', async () => {
    localStorage.setItem('auth_token', 'x');
    const loc = stubLocation('/dashboard');
    await expect(onRejected({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(loc.href).toBe('/login');
  });

  it('401 di /login → TIDAK redirect, token tetap (hindari loop)', async () => {
    localStorage.setItem('auth_token', 'x');
    const loc = stubLocation('/login');
    await expect(onRejected({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('auth_token')).toBe('x');
    expect(loc.href).toBe('');
  });

  it('403 → diteruskan tanpa logout', async () => {
    localStorage.setItem('auth_token', 'x');
    stubLocation('/reports');
    await expect(onRejected({ response: { status: 403 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('auth_token')).toBe('x');
  });
});
