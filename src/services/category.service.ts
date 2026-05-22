import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  isDeleted: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface CreateCategoryPayload {
  name: string;
  color: string;
  icon: string;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

// ── Service ───────────────────────────────────────────────────────────────────

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await api.get('/categories');
    return data.data;
  },

  getById: async (id: number): Promise<Category> => {
    const { data } = await api.get(`/categories/${id}`);
    return data.data;
  },

  create: async (payload: CreateCategoryPayload): Promise<Category> => {
    const { data } = await api.post('/categories', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateCategoryPayload): Promise<Category> => {
    const { data } = await api.put(`/categories/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};