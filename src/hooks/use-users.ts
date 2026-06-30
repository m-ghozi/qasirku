import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  userService,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '@/services/user.service';

// ── Query key ─────────────────────────────────────────────────────────────────

export const USER_KEY = ['users'] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: USER_KEY,
    queryFn: userService.getAll,
    enabled,
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: [...USER_KEY, id],
    queryFn: () => userService.getById(id),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => userService.create(payload),
    onSuccess: (newUser) => {
      qc.invalidateQueries({ queryKey: USER_KEY });
      toast.success(`Akun "${newUser.name}" berhasil dibuat`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal membuat akun');
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      userService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEY });
      toast.success('Data akun berhasil diperbarui');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memperbarui akun');
    },
  });
}

/** Soft-delete / nonaktifkan akun. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEY });
      toast.success('Akun berhasil dinonaktifkan');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menonaktifkan akun');
    },
  });
}