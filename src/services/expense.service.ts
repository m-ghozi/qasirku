import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface Expense {
  id: number;
  title: string;
  categoryId: number;
  amount: string; // Decimal dari Prisma → string
  paymentMethodId: number | null;
  date: string;
  notes: string | null;
  isDeleted: boolean;
  createdAt: string;
  deletedAt: string | null;
  createdById: number | null;
  category: Pick<ExpenseCategory, 'id' | 'name' | 'color' | 'icon'> | null;
  paymentMethod: { id: number; name: string; category: string } | null;
  createdBy: { id: number; name: string } | null;
}

export interface ExpenseSummary {
  totalAmount: string;
  totalCount: number;
  byCategory: {
    category: Pick<ExpenseCategory, 'id' | 'name' | 'color' | 'icon'> | null;
    totalAmount: string;
    count: number;
  }[];
}

export type RangePreset = 'today' | '7' | '30' | 'month' | 'all';

export interface ExpenseFilters {
  range?: RangePreset;
  categoryId?: number;
  paymentMethodId?: number;
}

export interface CreateExpensePayload {
  title: string;
  categoryId: number;
  amount: number;
  paymentMethodId?: number;
  date: string; // "YYYY-MM-DD"
  notes?: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload> & {
  paymentMethodId?: number | null;
  notes?: string | null;
};

export interface CreateExpenseCategoryPayload {
  name: string;
  color: string;
  icon: string;
}

export type UpdateExpenseCategoryPayload = Partial<CreateExpenseCategoryPayload>;

// ── Expense Category Service ───────────────────────────────────────────────────

export const expenseCategoryService = {
  getAll: async (): Promise<ExpenseCategory[]> => {
    const { data } = await api.get('/expense-categories');
    return data.data;
  },

  getById: async (id: number): Promise<ExpenseCategory> => {
    const { data } = await api.get(`/expense-categories/${id}`);
    return data.data;
  },

  create: async (payload: CreateExpenseCategoryPayload): Promise<ExpenseCategory> => {
    const { data } = await api.post('/expense-categories', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateExpenseCategoryPayload): Promise<ExpenseCategory> => {
    const { data } = await api.put(`/expense-categories/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/expense-categories/${id}`);
  },
};

// ── Expense Service ───────────────────────────────────────────────────────────

export const expenseService = {
  getAll: async (filters: ExpenseFilters = {}): Promise<Expense[]> => {
    const { data } = await api.get('/expenses', { params: filters });
    return data.data;
  },

  getSummary: async (filters: Pick<ExpenseFilters, 'range' | 'categoryId'> = {}): Promise<ExpenseSummary> => {
    const { data } = await api.get('/expenses/summary', { params: filters });
    return data.data;
  },

  getById: async (id: number): Promise<Expense> => {
    const { data } = await api.get(`/expenses/${id}`);
    return data.data;
  },

  create: async (payload: CreateExpensePayload): Promise<Expense> => {
    const { data } = await api.post('/expenses', payload);
    return data.data;
  },

  update: async (id: number, payload: UpdateExpensePayload): Promise<Expense> => {
    const { data } = await api.put(`/expenses/${id}`, payload);
    return data.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },
};