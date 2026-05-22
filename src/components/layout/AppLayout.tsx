/**
 * AppLayout.tsx — MIGRATED (Step 2)
 *
 * Perubahan:
 *  - Hapus useLiveQuery, db, seedDefaultData → tidak relevan (data di server)
 *  - Hapus <Onboarding> → onboarding ditangani via storeSetting dari API,
 *    atau bisa dicheck via useStoreSetting() jika diperlukan
 *  - Hapus <LoginScreen> → auth sepenuhnya ditangani RequireAuth + JWT di App.tsx
 *  - Hapus multiUserEnabled → semua user wajib login via JWT, tidak ada mode single-user
 *  - useThemeColor() dari Dexie → diganti applyStoredTheme() dari localStorage
 *  - loading state → RequireAuth sudah handle spinner sebelum AppLayout dirender
 */

import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import BottomNav from './BottomNav';

// Preset HSL sama dengan yang ada di Settings.tsx & use-theme-color.ts lama
const THEME_PRESETS: Record<string, string> = {
  '25': '25 95% 53%',
  '217': '217 91% 60%',
  '142': '142 71% 45%',
  '262': '262 83% 58%',
  '0': '0 84% 60%',
  '330': '330 81% 60%',
  '172': '172 66% 50%',
  '45': '45 93% 47%',
};

function applyStoredTheme() {
  const hue = localStorage.getItem('themeColorHue') ?? '25';
  const hsl = THEME_PRESETS[hue] ?? `${hue} 95% 53%`;
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', `hsl(${hsl})`);
}

export default function AppLayout() {
  // Apply tema warna dari localStorage saat layout pertama mount
  useEffect(() => {
    applyStoredTheme();
  }, []);

  // Tidak perlu loading check atau auth check di sini —
  // RequireAuth di App.tsx sudah memastikan user terautentikasi
  // sebelum AppLayout dirender.

  return (
    <div className="min-h-screen bg-background max-w-lg md:max-w-6xl mx-auto relative">
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}