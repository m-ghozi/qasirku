import { useEffect } from 'react';
import { useStoreSetting, useUpdateStoreSetting } from '@/hooks/use-store-setting';

// ── Constants ─────────────────────────────────────────────────────────────────

export const THEME_COLORS = [
  { name: 'Oranye', hue: '25', saturation: '95%', lightness: '53%' },
  { name: 'Biru', hue: '217', saturation: '91%', lightness: '60%' },
  { name: 'Hijau', hue: '142', saturation: '71%', lightness: '45%' },
  { name: 'Ungu', hue: '262', saturation: '83%', lightness: '58%' },
  { name: 'Merah', hue: '0', saturation: '84%', lightness: '60%' },
  { name: 'Pink', hue: '330', saturation: '81%', lightness: '60%' },
  { name: 'Teal', hue: '172', saturation: '66%', lightness: '50%' },
  { name: 'Kuning', hue: '45', saturation: '93%', lightness: '47%' },
] as const;

export type ThemeHue = typeof THEME_COLORS[number]['hue'];

export const DEFAULT_HUE = '217';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getThemeHSL(hue: string): string {
  const preset = THEME_COLORS.find(c => c.hue === hue);
  if (preset) return `${preset.hue} ${preset.saturation} ${preset.lightness}`;
  return `${hue} 95% 53%`;
}

export function applyThemeColor(hue: string): void {
  const hsl = getThemeHSL(hue);
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', `hsl(${hsl})`);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Membaca themeColor dari store settings (API) dan mengapply ke DOM.
 * Return: { hue, setHue, isPending }
 */
export function useThemeColor() {
  const { data: settings } = useStoreSetting();
  const { mutate: updateSettings, isPending } = useUpdateStoreSetting();

  const hue = settings?.themeColor ?? DEFAULT_HUE;

  // Apply ke DOM setiap kali hue dari server berubah
  useEffect(() => {
    applyThemeColor(hue);
  }, [hue]);

  const setHue = (newHue: string) => {
    // Optimistic: apply ke DOM langsung agar UI responsif
    applyThemeColor(newHue);
    // Persist ke backend
    updateSettings({ themeColor: newHue });
  };

  return { hue, setHue, isPending };
}