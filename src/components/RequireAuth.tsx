import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

/**
 * Wrapper route yang memastikan user sudah login.
 * - loading  → tampilkan spinner (tunggu /users/me selesai)
 * - belum login → redirect ke /login, simpan lokasi asal di state
 * - sudah login → render children via <Outlet />
 */
export default function RequireAuth() {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // Simpan lokasi yang dicoba agar setelah login bisa redirect balik
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}