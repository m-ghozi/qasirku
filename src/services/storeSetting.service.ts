import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StoreSetting {
  id: number;
  storeName: string;
  address?: string;
  phone?: string;
  receiptFooter?: string;
  onboardingDone: boolean;
  themeColor?: string | null; // HSL hue string, e.g. "25"
  logo?: string | null;       // Base64 JPEG
}

export interface UpdateStoreSettingPayload {
  storeName?: string;
  address?: string;
  phone?: string;
  receiptFooter?: string;
  onboardingDone?: boolean;
  themeColor?: string | null;
  logo?: string | null;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const storeSettingService = {
  get: async (): Promise<StoreSetting> => {
    const { data } = await api.get('/store-settings');
    return data.data;
  },

  update: async (payload: UpdateStoreSettingPayload): Promise<StoreSetting> => {
    const mappedPayload: Record<string, any> = {
      name: payload.storeName,
      address: payload.address,
      phone: payload.phone,
      footerReceipt: payload.receiptFooter,
    };

    // Sertakan hanya jika memang dikirim
    if (payload.onboardingDone !== undefined) mappedPayload.onboardingDone = payload.onboardingDone;
    if (payload.themeColor !== undefined) mappedPayload.themeColor = payload.themeColor;
    if (payload.logo !== undefined) mappedPayload.logo = payload.logo;

    const { data } = await api.put('/store-settings', mappedPayload);
    return data.data;
  },
};