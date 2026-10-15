import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';

const reportData = {
    range: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' },
    summary: {
        totalStockIn: 25,
        totalStockOut: 5,
        totalStockInValue: 250000,
        avgBuyPrice: 10000,
        currentStock: 33,
    },
    stockOutByReason: [
        { reason: 'rusak', quantity: 3 },
        { reason: 'expired', quantity: 2 },
    ],
    chart: { stockIn: [], stockOut: [] },
    alerts: {
        lowStock: [{ id: 9, name: 'Gula Pasir', stock: 2, unit: 'kg' }],
        outOfStock: [],
        expired: [
            {
                id: 7,
                productId: 1,
                productName: 'Susu UHT',
                unit: 'box',
                quantity: 4,
                expireDate: '2026-09-01T00:00:00.000Z',
            },
        ],
        expiringSoon: [],
    },
};

const movementsData = {
    range: reportData.range,
    totals: {
        openingStock: 20,
        stockIn: 25,
        sold: 8,
        adjustIn: 1,
        adjustOut: 5,
        closingStock: 33,
        closingValue: 330000,
        currentStock: 33,
    },
    products: [
        {
            productId: 1,
            name: 'Kopi Susu',
            sku: 'KOPI-1',
            unit: 'pcs',
            categoryName: 'Minuman',
            hpp: 10000,
            openingStock: 20,
            stockIn: 25,
            sold: 8,
            adjustIn: 1,
            adjustOut: 5,
            closingStock: 33,
            closingValue: 330000,
            currentStock: 33,
        },
    ],
};

const stockIns = [
    {
        id: 1,
        productId: 1,
        quantity: 25,
        buyPrice: 10000,
        totalPrice: 250000,
        date: '2026-09-05T03:00:00.000Z',
        expireDate: null,
        notes: 'Restock bulanan',
        product: { name: 'Kopi Susu', sku: 'KOPI-1' },
        supplier: { id: 1, name: 'CV Sumber' },
        createdBy: { id: 1, name: 'Budi' },
    },
];

const stockOuts = [
    {
        id: 1,
        productId: 1,
        quantity: 5,
        reason: 'rusak',
        date: '2026-09-10T03:00:00.000Z',
        notes: 'Kemasan bocor',
        product: { name: 'Kopi Susu', sku: 'KOPI-1', stock: 33 },
        createdBy: { id: 1, name: 'Budi' },
    },
];

const ok = (data: unknown, meta?: unknown) => ({
    data: { success: true, data, ...(meta ? { meta } : {}) },
});

const singlePageMeta = { page: 1, limit: 200, total: 1, totalPages: 1 };

vi.mock('@/lib/api', () => ({
    default: {
        get: vi.fn((url: string) => {
            switch (url) {
                case '/store-settings':
                    return Promise.resolve(ok({ storeName: 'Toko Uji' }));
                case '/stocks/report':
                    return Promise.resolve(ok(reportData));
                case '/stocks/report/movements':
                    return Promise.resolve(ok(movementsData));
                case '/stocks/in':
                    return Promise.resolve(ok(stockIns, singlePageMeta));
                case '/stocks/out':
                    return Promise.resolve(ok(stockOuts, singlePageMeta));
                default:
                    return Promise.resolve(ok(null));
            }
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

/** Cari baris yang salah satu selnya bernilai `value`. */
function findRow(ws: ExcelJS.Worksheet, value: string | number): ExcelJS.Row | undefined {
    let found: ExcelJS.Row | undefined;
    ws.eachRow((row) => {
        row.eachCell((cell) => {
            if (cell.value === value && !found) found = row;
        });
    });
    return found;
}

beforeEach(() => {
    captured = null;
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn((b: Blob) => {
        captured = b;
        return 'blob:x';
    });
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});

describe('exportStockReportToExcel', () => {
    it('menghasilkan lima sheet dengan styling profesional', async () => {
        const { exportStockReportToExcel } = await import('@/lib/export-stock-report');
        const result = await exportStockReportToExcel(
            new Date('2026-09-01T00:00:00'),
            new Date('2026-09-30T00:00:00'),
        );

        expect(result.productCount).toBe(1);
        expect(result.movementCount).toBe(2);
        expect(result.fileName).toContain('Laporan_Stok_Toko_Uji');
        expect(captured).toBeTruthy();

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await readBlob(captured!));

        expect(wb.worksheets.map((w) => w.name)).toEqual([
            'Ringkasan',
            'Kartu Stok',
            'Mutasi Masuk',
            'Mutasi Keluar',
            'Alert Stok',
        ]);

        // ── Ringkasan ──
        const ringkasan = wb.getWorksheet('Ringkasan')!;
        expect(ringkasan.getCell('A1').value).toBe('Laporan Stok');
        expect(ringkasan.getCell('B2').value).toBe('Toko Uji');
        expect(ringkasan.getCell('A1').font?.color?.argb).toBe('FF1D4ED8');
        expect((ringkasan.getCell('A1') as { isMerged?: boolean }).isMerged).toBe(true);

        // Nilai stok akhir muncul sebagai KPI berformat mata uang
        const stockValueRow = findRow(ringkasan, 'Nilai Stok Akhir');
        expect(stockValueRow).toBeTruthy();
        expect(stockValueRow!.getCell(2).value).toBe(330000);
        expect(stockValueRow!.getCell(2).numFmt).toBe('"Rp"#,##0;[Red]-"Rp"#,##0');

        // Rekap alasan memakai label Indonesia, bukan kode mentah
        expect(findRow(ringkasan, 'Rusak')).toBeTruthy();
        expect(findRow(ringkasan, 'Expired')).toBeTruthy();

        // ── Kartu Stok ──
        const kartu = wb.getWorksheet('Kartu Stok')!;
        const headerRow = findRow(kartu, 'Produk')!;
        expect(
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => headerRow.getCell(c).value),
        ).toEqual([
            'Produk',
            'SKU/Kode',
            'Stok Awal',
            'Stok Masuk',
            'Terjual',
            'Penyesuaian +',
            'Penyesuaian −',
            'Stok Akhir',
            'HPP',
            'Nilai Stok Akhir',
        ]);

        const dataRow = findRow(kartu, 'Kopi Susu')!;
        expect(dataRow.getCell(2).value).toBe('KOPI-1');
        expect(dataRow.getCell(3).value).toBe(20); // stok awal
        expect(dataRow.getCell(4).value).toBe(25); // stok masuk
        expect(dataRow.getCell(5).value).toBe(-8); // terjual ditampilkan mengurangi
        expect(dataRow.getCell(6).value).toBe(1);  // penyesuaian +
        expect(dataRow.getCell(7).value).toBe(-5); // penyesuaian − mengurangi
        expect(dataRow.getCell(8).value).toBe(33); // stok akhir
        expect(dataRow.getCell(9).value).toBe(10000);
        expect(dataRow.getCell(10).numFmt).toBe('"Rp"#,##0;[Red]-"Rp"#,##0');
        // 20 + 25 + 1 − 8 − 5 = 33
        expect(dataRow.getCell(3).value as number
            + (dataRow.getCell(4).value as number)
            + (dataRow.getCell(6).value as number)
            + (dataRow.getCell(5).value as number)
            + (dataRow.getCell(7).value as number)).toBe(dataRow.getCell(8).value);

        const totalRow = findRow(kartu, 'TOTAL')!;
        expect(totalRow.getCell(3).value).toBe(20);
        expect(totalRow.getCell(8).value).toBe(33);
        expect(totalRow.getCell(10).value).toBe(330000);
        expect(kartu.autoFilter).toBeTruthy();

        // ── Mutasi Masuk ──
        const masuk = wb.getWorksheet('Mutasi Masuk')!;
        const masukRow = findRow(masuk, 'Kopi Susu')!;
        expect(masukRow.getCell(1).value).toBe('05/09/2026');
        expect(masukRow.getCell(4).value).toBe('CV Sumber');
        expect(masukRow.getCell(5).value).toBe(25);
        expect(masukRow.getCell(7).value).toBe(250000);
        expect(masukRow.getCell(7).numFmt).toBe('"Rp"#,##0;[Red]-"Rp"#,##0');

        // ── Mutasi Keluar ──
        const keluar = wb.getWorksheet('Mutasi Keluar')!;
        const keluarRow = findRow(keluar, 'Kopi Susu')!;
        expect(keluarRow.getCell(4).value).toBe(-5); // keluar mengurangi
        expect(keluarRow.getCell(5).value).toBe('Rusak');

        // ── Alert Stok ──
        const alert = wb.getWorksheet('Alert Stok')!;
        const lowRow = findRow(alert, 'Gula Pasir')!;
        expect(lowRow.getCell(1).value).toBe('Stok Menipis');
        expect(lowRow.getCell(3).value).toBe(2);
        const expiredRow = findRow(alert, 'Susu UHT')!;
        expect(expiredRow.getCell(1).value).toBe('Sudah Kadaluarsa');
        expect(expiredRow.getCell(5).value).toBe('01/09/2026');
    });

    it('menandai laporan kosong tanpa crash', async () => {
        const empty = {
            ...movementsData,
            products: [],
            totals: { ...movementsData.totals, closingStock: 0, closingValue: 0 },
        };
        const api = (await import('@/lib/api')).default as unknown as { get: ReturnType<typeof vi.fn> };
        api.get.mockImplementation((url: string) => {
            if (url === '/store-settings') return Promise.resolve(ok({ storeName: 'Toko Uji' }));
            if (url === '/stocks/report') return Promise.resolve(ok(reportData));
            if (url === '/stocks/report/movements') return Promise.resolve(ok(empty));
            return Promise.resolve(ok([], { page: 1, limit: 200, total: 0, totalPages: 0 }));
        });

        const { exportStockReportToExcel } = await import('@/lib/export-stock-report');
        const result = await exportStockReportToExcel(
            new Date('2026-09-01T00:00:00'),
            new Date('2026-09-02T00:00:00'),
        );

        expect(result.productCount).toBe(0);
        expect(result.movementCount).toBe(0);

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await readBlob(captured!));

        expect(
            findRow(wb.getWorksheet('Kartu Stok')!, 'Tidak ada produk dengan saldo atau mutasi pada periode ini'),
        ).toBeTruthy();
        expect(findRow(wb.getWorksheet('Mutasi Masuk')!, 'Tidak ada stok masuk pada periode ini'))
            .toBeTruthy();
    });
});
