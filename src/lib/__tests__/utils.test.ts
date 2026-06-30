import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (clsx + tailwind-merge)', () => {
  it('menggabungkan kelas', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('membuang kelas falsy / conditional', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });

  it('tailwind-merge: kelas konflik terakhir menang', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
