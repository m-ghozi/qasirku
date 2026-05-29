/**
 * Users.tsx — MIGRATED (Step 11)
 *
 * Perubahan dari versi Dexie:
 *  - useLiveQuery(db.users) → useUsers()
 *  - db.users.update(id, {name, permissions}) → useUpdateUser()
 *  - db.users.add() via createUser() lokal → useCreateUser()
 *  - db.users.update(id, {isActive}) → useUpdateUser()
 *  - db.users.delete(id) → useDeleteUser()
 *  - updateUserPin() lokal (hash di frontend) → useUpdateUser({ pin })
 *  - isValidPin / isValidUsername → tetap dipakai untuk validasi sisi klien
 *  - PERMISSION_LABELS, DEFAULT_STAFF_PERMISSIONS, ALL_PERMISSIONS → dari @/lib/auth
 *  - multiUserEnabled check → dihapus (semua user wajib login via JWT)
 *  - User.isActive tipe di backend adalah Boolean, bukan 0/1
 *  - refresh() setelah edit diri sendiri → tetap ada via useAuth().refresh()
 */

import { useState } from 'react';
import {
  ArrowLeft, Plus, Edit2, Trash2, KeyRound,
  UserCircle2, ShieldCheck, UserCheck, UserX, Users as UsersIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  DEFAULT_STAFF_PERMISSIONS,
  type PermissionKey,
} from '@/lib/auth';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/hooks/use-users';
import type { User } from '@/services/user.service';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Validasi sisi klien (tidak butuh Dexie)
function isValidPin(pin: string) { return /^\d{4,6}$/.test(pin); }
function isValidUsername(u: string) { return /^[a-z0-9_.]{3,20}$/.test(u); }

export default function UsersPage() {
  const navigate = useNavigate();
  const { currentUser, isOwner, refresh } = useAuth();

  // ── API hooks ────────────────────────────────────────────────────────────
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // ── Dialog: Add/Edit ─────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [permissions, setPermissions] = useState<PermissionKey[]>(DEFAULT_STAFF_PERMISSIONS);

  // ── Dialog: Reset PIN ────────────────────────────────────────────────────
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinTarget, setPinTarget] = useState<User | null>(null);
  const [newPin, setNewPin] = useState('');

  // ── Dialog: Delete ───────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // ── Guard: hanya owner ───────────────────────────────────────────────────
  if (!isOwner) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            Karyawan & Akses
          </h1>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Hanya pemilik toko yang dapat mengelola karyawan.
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setName(''); setUsername(''); setPin('');
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setName(user.name);
    setUsername(user.username);
    setPin('');
    setPermissions(user.role === 'owner' ? [...ALL_PERMISSIONS] : user.permissions);
    setDialogOpen(true);
  };

  const togglePermission = (key: PermissionKey, checked: boolean) => {
    setPermissions(prev => checked ? [...new Set([...prev, key])] : prev.filter(p => p !== key));
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error('Nama tidak boleh kosong'); return; }

    if (editing) {
      // Edit: hanya nama + permissions
      updateUser.mutate(
        {
          id: editing.id,
          payload: {
            name: name.trim(),
            permissions: editing.role === 'owner' ? [] : permissions,
          },
        },
        {
          onSuccess: async () => {
            setDialogOpen(false);
            // Kalau edit diri sendiri, sinkronkan context auth
            if (currentUser?.id === editing.id) await refresh();
          },
        }
      );
    } else {
      // Tambah baru
      if (!isValidUsername(username)) {
        toast.error('Username 3-20 karakter, hanya huruf/angka/underscore');
        return;
      }
      if (!isValidPin(pin)) {
        toast.error('PIN harus 4-6 digit angka');
        return;
      }
      createUser.mutate(
        { username, name: name.trim(), pin, permissions },
        { onSuccess: () => setDialogOpen(false) }
      );
    }
  };

  const openPinReset = (user: User) => {
    setPinTarget(user);
    setNewPin('');
    setPinDialogOpen(true);
  };

  const handlePinReset = () => {
    if (!pinTarget) return;
    if (!isValidPin(newPin)) { toast.error('PIN harus 4-6 digit angka'); return; }
    updateUser.mutate(
      { id: pinTarget.id, payload: { pin: newPin } },
      {
        onSuccess: () => {
          setPinDialogOpen(false);
        },
      }
    );
  };

  const toggleActive = (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Tidak bisa menonaktifkan akun yang sedang login');
      return;
    }
    if (user.role === 'owner' && user.isActive) {
      const activeOwners = users.filter(u => u.role === 'owner' && u.isActive && u.id !== user.id);
      if (activeOwners.length === 0) {
        toast.error('Harus ada minimal 1 pemilik aktif');
        return;
      }
    }
    updateUser.mutate({ id: user.id, payload: { isActive: !user.isActive } });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === currentUser?.id) {
      toast.error('Tidak bisa menghapus akun sendiri');
      setDeleteTarget(null);
      return;
    }
    if (deleteTarget.role === 'owner') {
      const otherOwners = users.filter(u => u.role === 'owner' && u.id !== deleteTarget.id);
      if (otherOwners.length === 0) {
        toast.error('Harus ada minimal 1 pemilik');
        setDeleteTarget(null);
        return;
      }
    }
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const isMutating = createUser.isPending || updateUser.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-primary" />
          Karyawan & Akses
        </h1>
      </div>

      <p className="text-xs text-muted-foreground">
        Atur siapa yang bisa mengakses apa di toko Anda. Pemilik selalu memiliki akses penuh.
      </p>

      <Button size="sm" className="w-full h-10 gap-1.5" onClick={openAdd}>
        <Plus className="w-4 h-4" />
        Tambah Karyawan
      </Button>

      {/* ── Daftar user ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Memuat data...</p>
      ) : (
        <div className="space-y-2">
          {sortedUsers.map(user => (
            <Card key={user.id} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${user.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                    {user.role === 'owner' ? <ShieldCheck className="w-5 h-5" /> : <UserCircle2 className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{user.name}</p>
                      {user.role === 'owner' && (
                        <Badge variant="secondary" className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20">
                          Pemilik
                        </Badge>
                      )}
                      {user.id === currentUser?.id && (
                        <Badge variant="secondary" className="text-[9px] h-4">Anda</Badge>
                      )}
                      {!user.isActive && (
                        <Badge variant="secondary" className="text-[9px] h-4 bg-muted text-muted-foreground">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">@{user.username}</p>
                    {user.role !== 'owner' && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {user.permissions.length === 0
                          ? 'Tidak ada akses'
                          : `${user.permissions.length} akses diberikan`}
                      </p>
                    )}
                    {user.lastLoginAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Login terakhir: {format(new Date(user.lastLoginAt), 'dd MMM yyyy HH:mm', { locale: localeId })}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)} title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPinReset(user)} title="Reset PIN">
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleActive(user)}
                      title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {user.isActive
                        ? <UserCheck className="w-3.5 h-3.5" />
                        : <UserX className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                    {user.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(user)}
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Dialog: Add/Edit ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Karyawan' : 'Tambah Karyawan'}</DialogTitle>
            <DialogDescription className="text-xs">
              {editing
                ? 'Ubah nama dan akses. Username tidak bisa diubah; gunakan tombol reset PIN untuk mengganti PIN.'
                : 'Karyawan akan login dengan username dan PIN.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="h-11"
              />
            </div>

            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label>Username *</Label>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    placeholder="Contoh: budi"
                    className="h-11 font-mono"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <p className="text-[10px] text-muted-foreground">3-20 karakter, hanya huruf/angka/underscore</p>
                </div>
                <div className="space-y-1.5">
                  <Label>PIN *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-6 digit"
                    className="h-11 font-mono text-center tracking-widest"
                  />
                </div>
              </>
            )}

            {editing?.role === 'owner' ? (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
                Pemilik selalu memiliki akses penuh ke semua fitur.
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm">Hak Akses</Label>
                <div className="space-y-1.5">
                  {ALL_PERMISSIONS.map(key => {
                    const meta = PERMISSION_LABELS[key];
                    const checked = permissions.includes(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${checked ? 'border-primary/50 bg-primary/5' : 'border-muted bg-muted/30'}`}
                      >
                        <Switch
                          checked={checked}
                          onCheckedChange={v => togglePermission(key, v === true)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{meta.title}</p>
                          <p className="text-[10px] text-muted-foreground leading-snug">{meta.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <Button className="w-full h-11" onClick={handleSave} disabled={isMutating}>
              {isMutating ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Tambah Karyawan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reset PIN ─────────────────────────────────────────────── */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-w-[90vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>Reset PIN {pinTarget?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan PIN baru. PIN lama akan langsung diganti dan {pinTarget?.name} harus login ulang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4-6 digit"
              className="h-12 font-mono text-center tracking-widest text-lg"
              autoFocus
            />
            <Button
              className="w-full h-11"
              onClick={handlePinReset}
              disabled={!isValidPin(newPin) || updateUser.isPending}
            >
              {updateUser.isPending ? 'Menyimpan…' : 'Simpan PIN Baru'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Delete ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun akan dinonaktifkan secara permanen dan tidak bisa login
              lagi. Riwayat transaksi tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}