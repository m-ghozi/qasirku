import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoreSetting {
  id: number;
  storeName: string;
  address?: string;
  phone?: string;
  receiptFooter?: string;
  onboardingDone: boolean;
}

export interface UpdateStoreSettingPayload {
  storeName?: string;
  address?: string;
  phone?: string;
  receiptFooter?: string;
  onboardingDone?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const storeSettingService = {
  get: async (): Promise<StoreSetting> => {
    const { data } = await api.get('/store-settings');
    return data.data;
  },

  update: async (payload: UpdateStoreSettingPayload): Promise<StoreSetting> => {
    const { data } = await api.put('/store-settings', payload);
    return data.data;
  },
};