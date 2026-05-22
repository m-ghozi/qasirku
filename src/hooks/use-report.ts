import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/report.service';

// ── Query key ─────────────────────────────────────────────────────────────────

export const REPORT_KEY = (period: 7 | 30) => ['reports', period] as const;

// ── Query ─────────────────────────────────────────────────────────────────────

export function useReport(period: 7 | 30) {
  return useQuery({
    queryKey: REPORT_KEY(period),
    queryFn: () => reportService.getReport(period),
  });
}