import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';

const dailyReport = {
    stats: {
        totalGrossRevenue: 130000,
        totalDiscount: 5000,
        totalRevenue: 125000,
        totalProfit: 45000,
        totalSalesCount: 3,
    },
    paymentBreakdown: [
        { name: 'Tunai', amount: 100000, count: 2 },
        { name: 'QRIS', amount: 25000, count: 1 },
    ],
    topProducts: [
        { name: 'Kopi Susu', quantity: 10, revenue: 80000, profit: 30000 },
        { name: 'Roti Bakar', quantity: 5, revenue: 45000, profit: 15000 },
    ],
};

vi.mock('@/lib/api', () => ({
    default: {
        get: vi.fn((url: string) => {
            if (url === '/store-settings') {
                return Promise.resolve({ data: { success: true, data: { storeName: 'Toko Uji' } } });
            }
            return Promise.resolve({ data: { success: true, data: dailyReport } });
        }),
    },
}));

let captured: Blob | null = null;

/**
 * jsdom's Blob tidak punya `.arrayBuffer()`, dan `new Response(jsdomBlob)`
 * salah men-serialisasi isinya. FileReader jsdom membacanya dengan benar.
 */
function readBlob(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as ArrayBuffer);
        fr.onerror = () => reject(fr.error);
        fr.readAsArrayBuffer(blob);
    });
}

beforeEach(() => {
    captured = null;
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn((b: Blob) => {
        captured = b;
        return 'blob:x';
    });
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

describe('exportReportToExcel', () => {
    it('menghasilkan workbook dengan styling profesional', async () => {
        const { exportReportToExcel } = await import('@/lib/export-report');
        const result = await exportReportToExcel(
            new Date('2026-09-01T00:00:00'),
            new Date('2026-09-02T00:00:00'),
        );

        expect(result.txCount).toBe(6);
        expect(result.fileName).toContain('Toko_Uji');
        expect(captured).toBeTruthy();

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await readBlob(captured!));

        expect(wb.worksheets.map((w) => w.name)).toEqual([
            'Ringkasan',
            'Data Harian',
            'Metode Pembayaran',
            'Produk Terlaris',
        ]);

        const ringkasan = wb.getWorksheet('Ringkasan')!;
        // Judul ter-merge & berwarna brand
        expect(ringkasan.getCell('A1').value).toBe('Laporan Penjualan');
        expect(ringkasan.getCell('B2').value).toBe('Toko Uji');
        expect(ringkasan.getCell('A1').font?.color?.argb).toBe('FF1D4ED8');
        expect((ringkasan.getCell('A1') as { isMerged?: boolean }).isMerged).toBe(true);
        // Judul & nama toko rata tengah
        expect(ringkasan.getCell('A1').alignment?.horizontal).toBe('center');
        expect(ringkasan.getCell('B2').alignment?.horizontal).toBe('center');
        // Blok info (Periode/Dibuat) tetap rata kiri
        expect(ringkasan.getCell('A4').alignment?.horizontal).toBe('left');

        // Nilai KPI pakai format mata uang Rp, bukan angka telanjang
        const moneyCells: Record<string, string | undefined> = {};
        ringkasan.eachRow((row) => {
            row.eachCell((cell) => {
                if (typeof cell.value === 'number' && cell.numFmt) {
                    moneyCells[String(cell.value)] = cell.numFmt;
                }
            });
        });
        expect(Object.values(moneyCells)).toContain('"Rp"#,##0;[Red]-"Rp"#,##0');

        // Header tabel metode pembayaran punya fill brand + teks putih
        let headerCell;
        ringkasan.eachRow((row) => {
            row.eachCell((cell) => {
                if (cell.value === 'Metode Bayar') headerCell = cell;
            });
        });
        expect(headerCell!.fill).toMatchObject({ fgColor: { argb: 'FF1D4ED8' } });
        expect(headerCell!.font?.bold).toBe(true);

        // Persen direpresentasikan sebagai rasio numerik dengan numFmt persen
        const daily = wb.getWorksheet('Data Harian')!;
        expect(daily.autoFilter).toBeTruthy();
        expect(daily.getCell('A4').value).toBe('Tanggal');
        expect(daily.getRow(daily.rowCount).getCell(1).value).toBe('TOTAL');
        expect(daily.getRow(daily.rowCount).getCell(2).numFmt).toBe('"Rp"#,##0;[Red]-"Rp"#,##0');

        const produk = wb.getWorksheet('Produk Terlaris')!;
        const firstProductRow = produk.getRow(5);
        expect(firstProductRow.getCell(1).value).toBe(1);
        expect(firstProductRow.getCell(2).value).toBe('Kopi Susu');
        const pctCell = firstProductRow.getCell(6);
        expect(typeof pctCell.value).toBe('number');
        expect(pctCell.numFmt).toBe('0.0%');
        expect((pctCell as { isMerged: boolean }).isMerged).toBe(false);
    });
});
