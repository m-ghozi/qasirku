import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';

// ── Query key ─────────────────────────────────────────────────────────────────

export const DASHBOARD_KEY = ['dashboard'] as const;

// ── Query ─────────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: dashboardService.getSummary,
    // Refresh otomatis setiap 60 detik agar data dashboard tidak stale
    refetchInterval: 60 * 1000,
  });
}