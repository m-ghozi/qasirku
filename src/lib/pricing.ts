/**
 * Perhitungan margin jual — murni untuk tampilan (frontend saja).
 *
 * Definisi mengikuti halaman Laporan (src/pages/Reports.tsx):
 *   margin = (hargaJual − hpp) / hargaJual
 * yaitu margin terhadap HARGA JUAL, bukan markup terhadap HPP.
 */

/**
 * Persentase margin dari harga jual & HPP.
 *
 * Mengembalikan `null` bila harga jual atau HPP belum diisi. HPP 0 sengaja
 * dianggap "biaya belum dicatat" — kalau dihitung apa adanya hasilnya selalu
 * 100% dan itu menyesatkan.
 */
export function marginPercent(price: number, hpp: number): number | null {
    if (!(price > 0) || !(hpp > 0)) return null;
    return ((price - hpp) / price) * 100;
}

/**
 * Harga jual yang menghasilkan margin tertentu dari HPP.
 *
 * Mengembalikan `null` bila HPP belum diisi, atau margin di luar rentang yang
 * bisa dihitung: margin >= 100% berarti harga jual tak terhingga.
 */
export function priceFromMarginPercent(hpp: number, marginPct: number): number | null {
    if (!(hpp > 0)) return null;
    if (!Number.isFinite(marginPct) || marginPct >= 100) return null;
    return Math.round(hpp / (1 - marginPct / 100));
}

/** Nilai untuk `<NumberInput decimal>` — dot-decimal, '' bila margin tak diketahui. */
export function marginToInputValue(pct: number | null): string {
    if (pct === null) return '';
    // Satu angka di belakang koma cukup; hindari "33.333333333333336" di kolom input.
    return String(Math.round(pct * 10) / 10);
}

/** "33,3%" untuk ditampilkan; "-" bila margin tidak diketahui. */
export function formatMargin(pct: number | null): string {
    if (pct === null) return '-';
    return `${pct.toFixed(1).replace('.', ',')}%`;
}
