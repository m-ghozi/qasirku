import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  storeSettingService,
  type UpdateStoreSettingPayload,
} from '@/services/storeSetting.service';
import { getStoredToken } from '@/lib/auth';

// ── Query key ─────────────────────────────────────────────────────────────────

export const STORE_SETTING_KEY = ['store-settings'] as const;

// ── Query ─────────────────────────────────────────────────────────────────────

export function useStoreSetting() {
  return useQuery({
    queryKey: STORE_SETTING_KEY,
    queryFn: storeSettingService.get,
    // Endpoint butuh auth — jangan fetch saat belum login (mis. halaman /login),
    // supaya tidak ada 401 di console. Re-fetch otomatis begitu token muncul.
    enabled: !!getStoredToken(),
    // Setting jarang berubah, cache lebih lama
    staleTime: 5 * 60 * 1000, // 5 menit
  });
}

// ── Mutation ──────────────────────────────────────────────────────────────────

export function useUpdateStoreSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateStoreSettingPayload) => storeSettingService.update(payload),
    onSuccess: (updated) => {
      qc.setQueryData(STORE_SETTING_KEY, updated);
      toast.success('Pengaturan toko berhasil disimpan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan');
    },
  });
}