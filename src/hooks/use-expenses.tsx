import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  expenseCategoryService,
  expenseService,
  type CreateExpenseCategoryPayload,
  type UpdateExpenseCategoryPayload,
  type CreateExpensePayload,
  type UpdateExpensePayload,
  type ExpenseFilters,
} from '@/services/expense.service';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORY_KEY = ['expense-categories'] as const;
export const EXPENSE_KEY = ['expenses'] as const;

// ── Expense Category Hooks ────────────────────────────────────────────────────

export function useExpenseCategories() {
  return useQuery({
    queryKey: EXPENSE_CATEGORY_KEY,
    queryFn: expenseCategoryService.getAll,
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpenseCategoryPayload) =>
      expenseCategoryService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSE_CATEGORY_KEY });
      toast.success('Kategori berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambah kategori');
    },
  });
}

export function useUpdateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateExpenseCategoryPayload }) =>
      expenseCategoryService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSE_CATEGORY_KEY });
      toast.success('Kategori berhasil diubah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah kategori');
    },
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => expenseCategoryService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSE_CATEGORY_KEY });
      toast.success('Kategori berhasil dihapus');
    },
    onError: (err: any) => {
      // Backend mengembalikan 409 jika kategori masih dipakai
      toast.error(err.response?.data?.message || 'Gagal menghapus kategori');
    },
  });
}

// ── Expense Hooks ─────────────────────────────────────────────────────────────

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: [...EXPENSE_KEY, filters],
    queryFn: () => expenseService.getAll(filters),
  });
}

export function useExpenseSummary(
  filters: Pick<ExpenseFilters, 'range' | 'categoryId' | 'date'> = {}
) {
  return useQuery({
    queryKey: [...EXPENSE_KEY, 'summary', filters],
    queryFn: () => expenseService.getSummary(filters),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => expenseService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSE_KEY });
      toast.success('Pengeluaran berhasil dicatat');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencatat pengeluaran');
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateExpensePayload }) =>
      expenseService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSE_KEY });
      toast.success('Pengeluaran berhasil diperbarui');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui pengeluaran');
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => expenseService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPENSE_KEY });
      toast.success('Pengeluaran berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus pengeluaran');
    },
  });
}