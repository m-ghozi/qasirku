import { describe, it, expect } from 'vitest';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { buildStockChartSeries, countDays } from '@/lib/stock-chart';

/** Rentang seperti yang dikirim backend: awal hari sampai akhir hari. */
const rangeOf = (fromDay: Date, toDay: Date) => ({
    from: startOfDay(fromDay).toISOString(),
    to: endOfDay(toDay).toISOString(),
});

const at = (iso: string) => new Date(iso).toISOString();

const noData = { stockIn: [], stockOut: [] };

describe('countDays', () => {
    it('rentang inklusif tanpa hari ekstra', () => {
        const day = new Date('2026-10-15T12:00:00');

        // `to` adalah akhir hari, jadi selisihnya 0,999… hari untuk rentang 1 hari.
        expect(countDays(startOfDay(day), endOfDay(day))).toBe(1);
        expect(countDays(startOfDay(subDays(day, 6)), endOfDay(day))).toBe(7);
        expect(countDays(startOfDay(subDays(day, 29)), endOfDay(day))).toBe(30);
    });
});

describe('buildStockChartSeries', () => {
    it('rentang 1 hari menghasilkan tepat satu titik', () => {
        const day = new Date('2026-10-15T12:00:00');

        const points = buildStockChartSeries(noData, rangeOf(day, day));

        // Regresi: dulu rumusnya menambah 1 sehingga hari sebelumnya ikut tampil.
        expect(points).toHaveLength(1);
        expect(points[0]).toEqual({ date: '15/10', stockIn: 0, stockOut: 0 });
    });

    it('rentang 7 hari menghasilkan tujuh titik berurutan', () => {
        const to = new Date('2026-10-15T12:00:00');

        const points = buildStockChartSeries(noData, rangeOf(subDays(to, 6), to));

        expect(points).toHaveLength(7);
        expect(points.map((p) => p.date)).toEqual([
            '09/10', '10/10', '11/10', '12/10', '13/10', '14/10', '15/10',
        ]);
    });

    it('menjumlahkan mutasi ke hari yang benar', () => {
        const to = new Date('2026-10-15T12:00:00');
        const chart = {
            stockIn: [
                { date: at('2026-10-15T03:00:00'), quantity: 5 },
                { date: at('2026-10-15T09:00:00'), quantity: 3 },
            ],
            stockOut: [{ date: at('2026-10-14T03:00:00'), quantity: 2 }],
        };

        const points = buildStockChartSeries(chart, rangeOf(subDays(to, 6), to));

        expect(points).toHaveLength(7);
        const last = points[points.length - 1];
        const beforeLast = points[points.length - 2];
        expect(last).toEqual({ date: '15/10', stockIn: 8, stockOut: 0 });
        expect(beforeLast).toEqual({ date: '14/10', stockIn: 0, stockOut: 2 });
    });

    it('memasukkan mutasi di luar rentang prefill ke harinya sendiri', () => {
        const to = new Date('2026-10-15T12:00:00');
        const chart = {
            stockIn: [{ date: at('2026-09-01T03:00:00'), quantity: 4 }],
            stockOut: [],
        };

        // Rentang 7 hari tidak mencakup 1 September, tapi datanya tetap muncul
        // (backend seharusnya tidak mengirimnya — ini jaring pengaman).
        const points = buildStockChartSeries(chart, rangeOf(subDays(to, 6), to));

        expect(points).toHaveLength(8);
        expect(points[0]).toEqual({ date: '01/09', stockIn: 4, stockOut: 0 });
    });

    it('rentang panjang dilewati prefill — hanya hari yang ada datanya', () => {
        const to = new Date('2026-10-15T12:00:00');
        const chart = {
            stockIn: [{ date: at('2026-01-05T03:00:00'), quantity: 4 }],
            stockOut: [],
        };

        const points = buildStockChartSeries(chart, rangeOf(subDays(to, 300), to));

        expect(points).toHaveLength(1);
        expect(points[0]).toEqual({ date: '05/01', stockIn: 4, stockOut: 0 });
    });
});
