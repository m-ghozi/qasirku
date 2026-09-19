import { useEffect, useState } from 'react';

/**
 * Menunda perubahan nilai selama `delay` ms.
 *
 * Dipakai kotak pencarian: tanpa ini setiap huruf memicu satu request karena
 * pencarian kini dilakukan di server. Saat komponen dilepas / nilai berubah lagi
 * sebelum delay habis, timer lama dibatalkan sehingga hanya nilai terakhir
 * yang lolos.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
