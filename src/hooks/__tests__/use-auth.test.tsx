import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mock lapisan auth + service yang dipakai provider
const authLib = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  getUserFromToken: vi.fn(),
  hasPermission: vi.fn(),
}));
const userService = vi.hoisted(() => ({ getMe: vi.fn() }));

vi.mock('@/lib/auth', async (orig) => {
  const actual = await orig<typeof import('@/lib/auth')>();
  return { ...actual, ...authLib };
});
vi.mock('@/services/user.service', () => ({ userService }));

import { AuthProvider, useAuth } from '@/hooks/use-auth';

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const OWNER = { id: 1, username: 'o', name: 'Owner', role: 'owner', permissions: [], isActive: true };
const STAFF = { id: 2, username: 's', name: 'Staff', role: 'staff', permissions: ['create_transaction'], isActive: true };

beforeEach(() => {
  vi.clearAllMocks();
  authLib.hasPermission.mockImplementation((u, k) => !!u && (u.role === 'owner' || u.permissions.includes(k)));
});

describe('useAuth — inisialisasi sesi', () => {
  it('tanpa token → loading selesai, user null', async () => {
    authLib.getUserFromToken.mockReturnValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUser).toBeNull();
    expect(userService.getMe).not.toHaveBeenCalled();
  });

  it('token valid → pakai token dulu lalu sinkron dari /users/me', async () => {
    authLib.getUserFromToken.mockReturnValue(STAFF);
    userService.getMe.mockResolvedValue({ ...STAFF, name: 'Staff Updated' });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUser?.name).toBe('Staff Updated');
  });

  it('akun dinonaktifkan (isActive:false) → paksa logout', async () => {
    authLib.getUserFromToken.mockReturnValue(STAFF);
    userService.getMe.mockResolvedValue({ ...STAFF, isActive: false });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authLib.logout).toHaveBeenCalled());
    expect(result.current.currentUser).toBeNull();
  });

  it('/users/me gagal (offline) → token user tetap dipakai', async () => {
    authLib.getUserFromToken.mockReturnValue(STAFF);
    userService.getMe.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUser?.id).toBe(2);
  });
});

describe('useAuth — login / logout / can', () => {
  it('login sukses → set currentUser', async () => {
    authLib.getUserFromToken.mockReturnValue(null);
    authLib.login.mockResolvedValue({ ok: true, user: OWNER });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.login('o', '1234');
    });
    expect(result.current.currentUser).toEqual(OWNER);
    expect(result.current.isOwner).toBe(true);
  });

  it('login gagal → currentUser tetap null', async () => {
    authLib.getUserFromToken.mockReturnValue(null);
    authLib.login.mockResolvedValue({ ok: false, error: 'PIN salah' });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.login('o', '0000');
    });
    expect(result.current.currentUser).toBeNull();
  });

  it('logout → bersihkan user', async () => {
    authLib.getUserFromToken.mockReturnValue(OWNER);
    userService.getMe.mockResolvedValue(OWNER);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.currentUser).toBeTruthy());
    act(() => result.current.logout());
    expect(result.current.currentUser).toBeNull();
  });

  it('can() mendelegasikan ke hasPermission', async () => {
    authLib.getUserFromToken.mockReturnValue(STAFF);
    userService.getMe.mockResolvedValue(STAFF);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.can('create_transaction')).toBe(true);
    expect(result.current.can('view_reports')).toBe(false);
  });
});

describe('useAuth — guard', () => {
  it('useAuth di luar provider → throw', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
    spy.mockRestore();
  });
});
