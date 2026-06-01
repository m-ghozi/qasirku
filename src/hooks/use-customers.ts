import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  customerService,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
} from '@/services/customer.service';

// ── Query keys ────────────────────────────────────────────────────────────────

export const CUSTOMER_KEY = ['customers'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: search ? [...CUSTOMER_KEY, { search }] : CUSTOMER_KEY,
    queryFn: () => customerService.getAll(search),
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: [...CUSTOMER_KEY, id],
    queryFn: () => customerService.getById(id),
    enabled: !!id,
  });
}

export function useCustomerTransactions(id: number) {
  return useQuery({
    queryKey: [...CUSTOMER_KEY, id, 'transactions'],
    queryFn: () => customerService.getTransactions(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => customerService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMER_KEY });
      toast.success('Pelanggan berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambah pelanggan');
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateCustomerPayload }) =>
      customerService.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: CUSTOMER_KEY });
      qc.invalidateQueries({ queryKey: [...CUSTOMER_KEY, id] });
      toast.success('Pelanggan berhasil diubah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah pelanggan');
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOMER_KEY });
      toast.success('Pelanggan berhasil dihapus');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus pelanggan');
    },
  });
}