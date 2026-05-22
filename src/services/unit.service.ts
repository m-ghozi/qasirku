import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Unit {
  id: number;
  name: string;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface CreateUnitPayload {
  name: string;
  isDefault?: boolean;
}

export type UpdateUnitPayload = Partial<CreateUnitPayload>;

// ── Service ───────────────────────────────────────────────────────────────────

export const unitService = {
  getAll: async (): Promise<Unit[]> => {
    const { data } = await api.get('/units');
    return data.data;
  },

  getById: async (id: number): Promise<Unit> => {
    const { data } = await api.get(`/units/${id}`);
    return data.data;
  },

  create: async (payload: CreateUnitPayload): Promise<Unit> => {
    const { data } = await api.post('/units', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateUnitPayload): Promise<Unit> => {
    const { data } = await api.put(`/units/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/units/${id}`);
  },
};