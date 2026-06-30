import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const auth = vi.hoisted(() => ({ isOwner: false, currentUser: null as unknown, loading: false }));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth }));

import LockedPage from '@/components/LockedPage';
import RequireAuth from '@/components/RequireAuth';

beforeEach(() => {
  auth.isOwner = false;
  auth.currentUser = null;
  auth.loading = false;
});

describe('LockedPage', () => {
  it('staff → pesan minta izin ke pemilik + label permission', () => {
    auth.isOwner = false;
    render(
      <MemoryRouter>
        <LockedPage title="Laporan" permissionLabel="Lihat Laporan" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Akses dikunci')).toBeInTheDocument();
    expect(screen.getByText(/Lihat Laporan/)).toBeInTheDocument();
    expect(screen.getByText(/Hubungi pemilik toko/)).toBeInTheDocument();
  });

  it('owner → pesan berbeda (seharusnya punya akses penuh)', () => {
    auth.isOwner = true;
    render(
      <MemoryRouter>
        <LockedPage title="Kasir" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/akses penuh/)).toBeInTheDocument();
  });
});

describe('RequireAuth', () => {
  function renderAt() {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<div>halaman terlindungi</div>} />
          </Route>
          <Route path="/login" element={<div>halaman login</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('loading → tampilkan spinner "Memuat sesi"', () => {
    auth.loading = true;
    renderAt();
    expect(screen.getByText(/Memuat sesi/)).toBeInTheDocument();
  });

  it('belum login → redirect ke /login', () => {
    auth.loading = false;
    auth.currentUser = null;
    renderAt();
    expect(screen.getByText('halaman login')).toBeInTheDocument();
  });

  it('sudah login → render Outlet', () => {
    auth.loading = false;
    auth.currentUser = { id: 1, role: 'owner' };
    renderAt();
    expect(screen.getByText('halaman terlindungi')).toBeInTheDocument();
  });
});
