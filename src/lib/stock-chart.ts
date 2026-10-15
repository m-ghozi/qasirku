import { format, subDays } from 'date-fns';

/**
 * Menyusun deret grafik pergerakan stok dari data mentah laporan.
 *
 * Dipisah dari komponen karena aritmetika tanggalnya rawan salah: `range.to` dari
 * backend sudah berupa akhir hari, sehingga selisih `to − from` tidak bulat.
 */

export interface StockChartPoint {
    /** Label sumbu X, format 'dd/MM'. */
    date: string;
    stockIn: number;
    stockOut: number;
}

export interface RawChartData {
    stockIn: { date: string; quantity: number }[];
    stockOut: { date: string; quantity: number }[];
}

/** Rentang lebih panjang dari ini tidak di-prefill — bisa mencakup ribuan hari. */
export const MAX_PRELOAD_DAYS = 92;

/** Tanggal lokal 'yyyy-MM-dd' — hindari slice ISO yang bergeser ke hari sebelumnya. */
export const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Jumlah hari dalam rentang [from, to] yang inklusif di kedua ujung.
 *
 * `to` adalah akhir hari (23:59:59.999), jadi untuk rentang N hari selisihnya adalah
 * N−1 + 0,999… hari. Pembulatan sudah menghasilkan N — jangan ditambah 1 lagi, karena
 * itu menyisipkan satu hari ekstra di awal (mis. filter 1 hari jadi menampilkan 2 hari).
 */
export function countDays(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function buildStockChartSeries(
    chart: RawChartData,
    range: { from: string; to: string },
): StockChartPoint[] {
    const map = new Map<string, { stockIn: number; stockOut: number }>();
    const startD = new Date(range.from);
    const endD = new Date(range.to);
    const days = countDays(startD, endD);

    // Pre-fill hari kosong supaya grafik tidak bolong di hari tanpa mutasi.
    if (days > 0 && days <= MAX_PRELOAD_DAYS) {
        for (let i = days - 1; i >= 0; i--) {
            map.set(dayKey(subDays(endD, i)), { stockIn: 0, stockOut: 0 });
        }
    }

    const merge = (rows: { date: string; quantity: number }[], key: 'stockIn' | 'stockOut') => {
        rows.forEach(({ date, quantity }) => {
            const k = dayKey(new Date(date));
            const cur = map.get(k) ?? { stockIn: 0, stockOut: 0 };
            cur[key] += quantity;
            map.set(k, cur);
        });
    };
    merge(chart.stockIn, 'stockIn');
    merge(chart.stockOut, 'stockOut');

    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => ({ date: format(new Date(`${k}T00:00:00`), 'dd/MM'), ...v }));
}
