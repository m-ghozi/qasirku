import api from '@/lib/api';
import type { PermissionKey } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'owner' | 'staff';
  permissions: PermissionKey[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserPayload {
  username: string;
  name: string;
  pin: string;
  role?: 'owner' | 'staff';
  permissions?: PermissionKey[];
}

export interface UpdateUserPayload {
  name?: string;
  pin?: string;
  role?: 'owner' | 'staff';
  permissions?: PermissionKey[];
  isActive?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const userService = {
  /**
   * Ambil profil user yang sedang login dari server.
   * Endpoint: GET /users/me
   * Keunggulan vs decode token lokal:
   *  - Dapat data terbaru (nama, role, permissions) meski token lama
   *  - Deteksi akun dinonaktifkan (isActive: false) tanpa logout paksa
   */
  getMe: async (): Promise<User> => {
    const { data } = await api.get('/users/me');
    return data.data;
  },

  getAll: async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    return data.data;
  },

  getById: async (id: number): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return data.data;
  },

  create: async (payload: CreateUserPayload): Promise<User> => {
    const { data } = await api.post('/users', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateUserPayload): Promise<User> => {
    const { data } = await api.put(`/users/${id}`, payload);
    return data.data;
  },

  /** Soft-delete / nonaktifkan akun */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};