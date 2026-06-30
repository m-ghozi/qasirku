import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const login = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ login }) }));
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

import Login from '@/pages/Login';

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>);
}

/** Lanjut dari step username ke step PIN. */
function gotoPinStep(username = 'budi') {
  fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: username } });
  fireEvent.click(screen.getByRole('button', { name: /lanjutkan/i }));
}

beforeEach(() => vi.clearAllMocks());

describe('Login — step username', () => {
  it('tombol Lanjutkan disabled saat username kosong', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /lanjutkan/i })).toBeDisabled();
  });

  it('input membuang spasi & memaksa lowercase', () => {
    renderLogin();
    const input = screen.getByPlaceholderText(/username/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Budi Santoso' } });
    expect(input.value).toBe('budisantoso');
  });

  it('lanjut ke step PIN setelah submit username', () => {
    renderLogin();
    gotoPinStep();
    expect(screen.getByText(/Masukkan PIN/i)).toBeInTheDocument();
    expect(screen.getByText('@budi')).toBeInTheDocument();
  });
});

describe('Login — step PIN', () => {
  it('auto-submit saat 6 digit → login dipanggil dengan username+pin', async () => {
    login.mockResolvedValue({ ok: true });
    renderLogin();
    gotoPinStep('budi');
    for (const d of ['1', '2', '3', '4', '5', '6']) {
      fireEvent.click(screen.getByRole('button', { name: d }));
    }
    await waitFor(() => expect(login).toHaveBeenCalledWith('budi', '123456'));
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('login gagal → tampilkan error & reset PIN (tidak navigate)', async () => {
    login.mockResolvedValue({ ok: false, error: 'PIN salah' });
    renderLogin();
    gotoPinStep('budi');
    for (const d of ['0', '0', '0', '0', '0', '0']) {
      fireEvent.click(screen.getByRole('button', { name: d }));
    }
    await waitFor(() => expect(screen.getByText('PIN salah')).toBeInTheDocument());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('tombol "Ganti" kembali ke step username', () => {
    renderLogin();
    gotoPinStep('budi');
    fireEvent.click(screen.getByRole('button', { name: /ganti/i }));
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
  });
});
