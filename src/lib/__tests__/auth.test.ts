import { describe, it, expect, vi, beforeEach } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', () => ({ default: api }));

import {
  decodeToken,
  getStoredToken,
  saveToken,
  clearToken,
  getUserFromToken,
  hasPermission,
  login,
  logout,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  DEFAULT_STAFF_PERMISSIONS,
  type AuthUser,
} from '@/lib/auth';

/** Bikin JWT palsu: header.payload.signature (hanya payload yang dipakai). */
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o));
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('decodeToken', () => {
  it('mendekode payload JWT → AuthUser', () => {
    const token = fakeJwt({ userId: 7, username: 'budi', name: 'Budi', role: 'staff', permissions: ['create_transaction'] });
    const user = decodeToken(token);
    expect(user).toEqual({
      id: 7,
      username: 'budi',
      name: 'Budi',
      role: 'staff',
      permissions: ['create_transaction'],
    });
  });

  it('mengisi default kosong untuk field yang hilang', () => {
    const user = decodeToken(fakeJwt({ userId: 1, role: 'owner' }));
    expect(user).toMatchObject({ id: 1, username: '', name: '', permissions: [] });
  });

  it('mengembalikan null untuk token sampah', () => {
    expect(decodeToken('bukan.jwt')).toBeNull();
    expect(decodeToken('')).toBeNull();
  });
});

describe('token helpers (localStorage)', () => {
  it('save/get/clear bekerja via auth_token', () => {
    expect(getStoredToken()).toBeNull();
    saveToken('abc');
    expect(getStoredToken()).toBe('abc');
    expect(localStorage.getItem('auth_token')).toBe('abc');
    clearToken();
    expect(getStoredToken()).toBeNull();
  });

  it('getUserFromToken → null bila tak ada token, AuthUser bila ada', () => {
    expect(getUserFromToken()).toBeNull();
    saveToken(fakeJwt({ userId: 3, role: 'owner' }));
    expect(getUserFromToken()?.id).toBe(3);
  });
});

describe('hasPermission', () => {
  const owner: AuthUser = { id: 1, username: 'o', name: 'O', role: 'owner', permissions: [] };
  const staff: AuthUser = { id: 2, username: 's', name: 'S', role: 'staff', permissions: ['create_transaction'] };

  it('null user → selalu false', () => {
    expect(hasPermission(null, 'view_reports')).toBe(false);
  });

  it('owner → selalu true walau permissions kosong', () => {
    expect(hasPermission(owner, 'manage_backup')).toBe(true);
  });

  it('staff → true hanya untuk permission yang dimiliki', () => {
    expect(hasPermission(staff, 'create_transaction')).toBe(true);
    expect(hasPermission(staff, 'view_reports')).toBe(false);
  });
});

describe('login / logout', () => {
  it('login sukses → simpan token & kembalikan user', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true, data: { token: 'tok123', user: { id: 1, role: 'owner' } } },
    });
    const res = await login('budi', '1234');
    expect(api.post).toHaveBeenCalledWith('/auth/login', { username: 'budi', pin: '1234' });
    expect(res.ok).toBe(true);
    expect(res.token).toBe('tok123');
    expect(getStoredToken()).toBe('tok123');
  });

  it('login gagal (success:false) → tidak simpan token', async () => {
    api.post.mockResolvedValueOnce({ data: { success: false, message: 'PIN salah' } });
    const res = await login('budi', '0000');
    expect(res.ok).toBe(false);
    expect(res.error).toBe('PIN salah');
    expect(getStoredToken()).toBeNull();
  });

  it('login error jaringan → pesan dari response, fallback default', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Server down' } } });
    expect((await login('a', 'b')).error).toBe('Server down');
    api.post.mockRejectedValueOnce(new Error('timeout'));
    expect((await login('a', 'b')).error).toBe('Login gagal');
  });

  it('logout menghapus token', () => {
    saveToken('x');
    logout();
    expect(getStoredToken()).toBeNull();
  });
});

describe('konstanta permission', () => {
  it('setiap permission punya label title+desc', () => {
    for (const key of ALL_PERMISSIONS) {
      expect(PERMISSION_LABELS[key]?.title).toBeTruthy();
      expect(PERMISSION_LABELS[key]?.desc).toBeTruthy();
    }
  });

  it('staff default hanya boleh create_transaction', () => {
    expect(DEFAULT_STAFF_PERMISSIONS).toEqual(['create_transaction']);
  });
});
