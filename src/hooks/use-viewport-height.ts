import * as React from "react";

/**
 * Tinggi area yang benar-benar terlihat (visual viewport).
 *
 * Berbeda dengan `window.innerHeight` / `100vh` / `100dvh`, nilai ini ikut
 * menyusut saat keyboard virtual mobile muncul — sehingga elemen yang
 * di-center tidak terdorong keluar layar dan ikut terpotong.
 *
 * Mengembalikan `null` di browser tanpa dukungan `visualViewport`.
 */
export function useViewportHeight() {
  const [height, setHeight] = React.useState<number | null>(null);

  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setHeight(vv.height));
    };

    update();
    vv.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
    };
  }, []);

  return height;
}

/**
 * Ambang (px) di bawah mana tinggi viewport dianggap "sempit" — mis. keyboard
 * virtual sedang terbuka atau layar HP kecil / posisi landscape.
 */
export const COMPACT_VIEWPORT_HEIGHT = 560;
