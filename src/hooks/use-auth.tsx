import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  login as authLogin,
  logout as authLogout,
  getUserFromToken,
  hasPermission,
  type AuthUser,
  type LoginResult,
  type PermissionKey,
} from '@/lib/auth';
import { userService } from '@/services/user.service';

// ── Context type ──────────────────────────────────────────────────────────────

interface AuthContextValue {
  currentUser: AuthUser | null;
  /** true selama verifikasi sesi pertama kali (GET /users/me belum selesai) */
  loading: boolean;
  isOwner: boolean;
  can: (key: PermissionKey) => boolean;
  login: (username: string, pin: string) => Promise<LoginResult>;
  logout: () => void;
  /**
   * Ambil ulang data user dari server (GET /users/me).
   * Dipanggil setelah owner mengubah permissions staff yang sedang login,
   * sehingga perubahan langsung berlaku tanpa logout.
   */
  refresh: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    /**
     * Urutan inisialisasi:
     * 1. Decode token lokal → tampilkan UI instan (tidak ada flicker loading)
     * 2. Panggil GET /users/me → update dengan data terbaru dari server
     *    (permissions bisa saja sudah berubah sejak token dibuat)
     * 3. Kalau /users/me gagal (token kedaluwarsa / akun nonaktif) → logout
     */
    const initSession = async () => {
      // Step 1 — optimistic: langsung pakai data dari token agar UI tidak beku
      const tokenUser = getUserFromToken();
      if (!tokenUser) {
        // Tidak ada token → tidak perlu hit server
        setLoading(false);
        return;
      }
      setCurrentUser(tokenUser);

      // Step 2 — verifikasi & sinkronisasi dengan server
      try {
        const serverUser = await userService.getMe();

        // Akun dinonaktifkan oleh owner → paksa logout
        if (!serverUser.isActive) {
          authLogout();
          setCurrentUser(null);
          return;
        }

        // Update state dengan data terbaru (nama / role / permissions bisa berubah)
        setCurrentUser(serverUser);
      } catch {
        // 401 ditangani oleh axios interceptor (auto-logout + reload)
        // Error lain (misal network down) → biarkan token user tetap dipakai
        // supaya app bisa digunakan dalam kondisi offline sementara
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (username: string, pin: string): Promise<LoginResult> => {
    const result = await authLogin(username, pin);
    if (result.ok && result.user) {
      setCurrentUser(result.user);
    }
    return result;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    authLogout();
    setCurrentUser(null);
  }, []);

  // ── Refresh (hit /users/me) ────────────────────────────────────────────────

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const serverUser = await userService.getMe();
      if (!serverUser.isActive) {
        // Akun dinonaktifkan saat sedang login → paksa keluar
        authLogout();
        setCurrentUser(null);
        return;
      }
      setCurrentUser(serverUser);
    } catch {
      // 401 → interceptor sudah handle; error lain diabaikan
    }
  }, []);

  // ── Permission check ───────────────────────────────────────────────────────

  const can = useCallback(
    (key: PermissionKey): boolean => hasPermission(currentUser, key),
    [currentUser]
  );

  const isOwner = currentUser?.role === 'owner';

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, isOwner, can, login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}