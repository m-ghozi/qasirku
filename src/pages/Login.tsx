import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Delete, Loader2 } from 'lucide-react';

// ── Komponen PIN dot display ──────────────────────────────────────────────────

function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-3 h-3 rounded-full border-2 transition-all duration-150',
            i < filled
              ? 'bg-primary border-primary scale-110'
              : 'bg-transparent border-muted-foreground/40'
          )}
        />
      ))}
    </div>
  );
}

// ── Komponen tombol numpad ────────────────────────────────────────────────────

function NumKey({
  value,
  onClick,
  children,
  className,
}: {
  value?: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-2xl text-xl font-semibold',
        'h-16 w-full select-none transition-all duration-100',
        'bg-muted/60 hover:bg-muted active:scale-95 active:bg-muted-foreground/20',
        className
      )}
    >
      {children}
    </button>
  );
}

// ── Halaman Login ─────────────────────────────────────────────────────────────

const PIN_MAX = 6;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect ke halaman yang dicoba sebelum login, default ke /
  const from = (location.state as any)?.from?.pathname ?? '/';

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'username' | 'pin'>('username');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (step !== 'pin') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') pressKey(e.key);
      else if (e.key === 'Backspace') backspace();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, pin, loading]);

  // ── Username submit ───────────────────────────────────────────────────────

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError('');
    setPin('');
    setStep('pin');
  };

  // ── PIN numpad ────────────────────────────────────────────────────────────

  const pressKey = (digit: string) => {
    if (pin.length >= PIN_MAX) return;
    setError('');
    const next = pin + digit;
    setPin(next);
    // Auto-submit saat PIN sudah 6 digit
    if (next.length === PIN_MAX) {
      submitPin(next);
    }
  };

  const backspace = () => setPin((p) => p.slice(0, -1));

  const submitPin = async (value: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await login(username.trim().toLowerCase(), value);
      if (result.ok) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'PIN salah');
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render username step ──────────────────────────────────────────────────

  if (step === 'username') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo / judul */}
          <div className="text-center space-y-1">
            <img src="/qasir-icon.png" alt="Qasir" className="w-32 h-32 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold tracking-tight">Qasir</h1>
            <p className="text-sm text-muted-foreground">Masuk untuk melanjutkan</p>
          </div>

          {/* Form username */}
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <input
                autoFocus
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="Masukkan username..."
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={cn(
                  'w-full h-12 px-4 rounded-xl border bg-background text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                  'transition-colors'
                )}
              />
            </div>
            <button
              type="submit"
              disabled={!username.trim()}
              className={cn(
                'w-full h-12 rounded-xl font-semibold text-sm transition-all',
                'bg-primary text-primary-foreground',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'active:scale-[0.98]'
              )}
            >
              Lanjutkan
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Render PIN step ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-xs space-y-2">
        {/* Header */}
        <div className="text-center space-y-1 mb-2">
          <img src="/qasir-icon.png" alt="Qasir" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <h1 className="text-lg font-bold">Halo, <span className="text-primary">@{username}</span></h1>
          <p className="text-sm text-muted-foreground">Masukkan PIN kamu</p>
        </div>

        {/* PIN dots */}
        <PinDots length={PIN_MAX} filled={pin.length} />

        {/* Error message */}
        <div className="h-5 text-center">
          {error && (
            <p className="text-xs text-destructive font-medium animate-in fade-in">
              {error}
            </p>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <NumKey key={d} onClick={() => pressKey(d)}>
              {d}
            </NumKey>
          ))}

          {/* Ganti username */}
          <NumKey
            onClick={() => { setStep('username'); setPin(''); setError(''); }}
            className="text-xs text-muted-foreground bg-transparent hover:bg-muted/40 font-normal"
          >
            Ganti
          </NumKey>

          <NumKey onClick={() => pressKey('0')}>0</NumKey>

          {/* Backspace / loading */}
          <NumKey
            onClick={backspace}
            className="text-muted-foreground"
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              : <Delete className="w-5 h-5 mx-auto" />
            }
          </NumKey>
        </div>
      </div>
    </div>
  );
}