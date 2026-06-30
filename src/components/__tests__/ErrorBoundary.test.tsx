import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Komponen yang sengaja throw untuk memicu boundary
function Bomb({ message = 'test error' }: { message?: string }) {
  throw new Error(message);
}

beforeAll(() => {
  // Redam console.error yang dicetak React untuk error yang ditangkap boundary
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  (console.error as ReturnType<typeof vi.spyOn>).mockRestore();
});

describe('ErrorBoundary', () => {
  it('merender children bila tidak ada error', () => {
    render(<ErrorBoundary><div>aman</div></ErrorBoundary>);
    expect(screen.getByText('aman')).toBeInTheDocument();
  });

  it('menampilkan fallback default saat ada render error', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByText('Terjadi kesalahan')).toBeInTheDocument();
    expect(screen.getByText(/test error/)).toBeInTheDocument();
  });

  it('memakai custom fallback bila disediakan', () => {
    const custom = ({ error }: { error: Error }) => <div>custom: {error.message}</div>;
    render(<ErrorBoundary fallback={custom}><Bomb message="kustom" /></ErrorBoundary>);
    expect(screen.getByText('custom: kustom')).toBeInTheDocument();
  });
});
