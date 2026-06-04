import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useStoreSetting } from '@/hooks/use-store-setting';
import { Loader2 } from 'lucide-react';

/**
 * Wrapper route yang memastikan:
 * 1. User sudah login (JWT valid)
 * 2. Onboarding sudah selesai — jika belum, redirect ke /onboarding
 *
 * Flow:
 *   auth loading || setting loading → spinner
 *   belum login                     → /login
 *   login tapi onboardingDone=false → /onboarding
 *   semua OK                        → render <Outlet />
 */
export default function RequireAuth() {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Masih loading auth atau setting
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

  // Belum login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}