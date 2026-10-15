import { format, startOfDay, endOfDay } from 'date-fns';
import api from '@/lib/api';
import {
    BRAND,
    INK,
    MUTED,
    MONEY_FMT,
    INT_FMT,
    THIN_BORDER,
    FILL,
    BRAND_SOFT,
    saveFile,
    sanitizeForFileName,
    loadExcelJS,
    writeSheetTitle,
    styleHeaderRow,
    styleBodyRow,
    styleTotalRow,
    addSectionRow,
    applyMoneyFormat,
    applyPageSetup,
    applyTableChrome,
    type Workbook,
    type Worksheet,
    type SheetContext,
} from '@/lib/excel-style';
import type {
    StockIn,
    StockOut,
    StockReport,
    StockMovements,
    StockMovementRow,
} from '@/services/stock.service';

/**
 * Ekspor Excel untuk halaman Laporan Stok.
 *
 * Lima sheet: Ringkasan, Kartu Stok, Mutasi Masuk, Mutasi Keluar, Alert Stok.
 * Semua data diambil dari rentang yang sama supaya angka antar-sheet konsisten.
 */

export interface StockExportResult {
    fileName: string;
    /** Jumlah produk yang punya saldo atau aktivitas di rentang. */
    productCount: number;
    /** Jumlah baris mutasi (masuk + keluar). */
    movementCount: number;
}

const REASON_LABELS: Record<string, string> = {
    rusak: 'Rusak',
    hilang: 'Hilang',
    retur: 'Retur',
    expired: 'Expired',
    sample: 'Sample',
    lain: 'Lainnya',
};

/** Ukuran halaman saat menarik daftar mutasi. */
const PAGE_LIMIT = 200;
/** Pengaman agar rentang yang sangat lebar tidak menarik ribuan request. */
const MAX_PAGES = 100;

/**
 * Tarik seluruh halaman dari endpoint ber-paginasi.
 *
 * Sheet detail butuh semua baris dalam rentang, bukan satu halaman. Berhenti saat
 * `meta` habis, saat halaman terakhir tercapai, atau saat server mengembalikan
 * halaman kosong (jaring pengaman kalau `meta` tidak ada).
 */
async function fetchAllPages<T>(url: string, params: Record<string, string>): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const { data } = await api.get(url, { params: { ...params, page, limit: PAGE_LIMIT } });
        const items: T[] = data?.data ?? [];
        out.push(...items);

        const totalPages = data?.meta?.totalPages;
        if (items.length === 0 || totalPages === undefined || page >= totalPages) break;
    }
    return out;
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportStockReportToExcel(
    rangeStart: Date,
    rangeEnd: Date,
): Promise<StockExportResult> {
    const start = startOfDay(rangeStart);
    const end = endOfDay(rangeEnd);
    const params = { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };

    let storeName = 'Kasir';
    try {
        const settingsRes = await api.get<{ success: boolean; data: { storeName?: string } }>('/store-settings');
        storeName = settingsRes.data.data.storeName?.trim() || 'Kasir';
    } catch {
        // tidak blocking
    }

    const [reportRes, movementsRes, stockIns, stockOuts] = await Promise.all([
        api.get<{ success: boolean; data: StockReport }>('/stocks/report', { params }),
        api.get<{ success: boolean; data: StockMovements }>('/stocks/report/movements', { params }),
        fetchAllPages<StockIn>('/stocks/in', params),
        fetchAllPages<StockOut>('/stocks/out', params),
    ]);

    const report = reportRes.data.data;
    const movements = movementsRes.data.data;

    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.creator = storeName;
    wb.created = end;

    const ctx: SheetContext = { storeName, start, end, generatedAt: new Date() };

    buildSummarySheet(wb, ctx, report, movements);
    buildStockCardSheet(wb, ctx, movements.products);
    buildStockInSheet(wb, ctx, stockIns);
    buildStockOutSheet(wb, ctx, stockOuts);
    buildAlertsSheet(wb, ctx, report);

    const buffer = await wb.xlsx.writeBuffer();
    const fileName = `Laporan_Stok_${sanitizeForFileName(storeName)}_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.xlsx`;
    await saveFile(buffer as ArrayBuffer, fileName);

    return {
        fileName,
        productCount: movements.products.length,
        movementCount: stockIns.length + stockOuts.length,
    };
}

// ─── Kop laporan ──────────────────────────────────────────────────────────────

/** Judul + nama toko + baris info periode, dipakai sheet Ringkasan. */
function writeReportHeader(ws: Worksheet, ctx: SheetContext, span: number) {
    const titleRow = ws.addRow(['Laporan Stok']);
    ws.mergeCells(titleRow.number, 1, titleRow.number, span);
    titleRow.height = 32;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: BRAND } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const storeRow = ws.addRow([ctx.storeName]);
    ws.mergeCells(storeRow.number, 1, storeRow.number, span);
    storeRow.height = 20;
    storeRow.getCell(1).font = { bold: true, size: 12, color: { argb: INK } };
    storeRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const infoRow = (label: string, value: string) => {
        const row = ws.addRow([label, value]);
        ws.mergeCells(row.number, 2, row.number, span);
        row.getCell(1).font = { size: 10, color: { argb: MUTED } };
        row.getCell(2).font = { size: 10, color: { argb: INK } };
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    };
    infoRow('Periode', `${format(ctx.start, 'dd/MM/yyyy')} – ${format(ctx.end, 'dd/MM/yyyy')}`);
    infoRow('Dibuat', format(ctx.generatedAt, 'dd/MM/yyyy HH:mm'));
    ws.addRow([]);
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildSummarySheet(
    wb: Workbook,
    ctx: SheetContext,
    report: StockReport,
    movements: StockMovements,
) {
    const ws = wb.addWorksheet('Ringkasan');
    const SPAN = 3;
    ws.columns = [{ width: 34 }, { width: 22 }, { width: 16 }];
    applyPageSetup(ws, ctx, 'portrait');

    writeReportHeader(ws, ctx, SPAN);

    addSectionRow(ws, 'RINGKASAN MUTASI STOK', SPAN);

    const kpi = (
        label: string,
        value: number,
        numFmt: string,
        opts: { emphasis?: boolean } = {},
    ) => {
        const row = ws.addRow([label, value]);
        ws.mergeCells(row.number, 2, row.number, SPAN);
        row.height = 20;
        const labelCell = row.getCell(1);
        const valueCell = row.getCell(2);
        labelCell.border = THIN_BORDER;
        valueCell.border = THIN_BORDER;
        labelCell.alignment = { vertical: 'middle' };
        valueCell.alignment = { vertical: 'middle', horizontal: 'right' };
        valueCell.numFmt = numFmt;
        if (opts.emphasis) {
            labelCell.font = { bold: true, color: { argb: INK } };
            valueCell.font = { bold: true, color: { argb: INK } };
            labelCell.fill = FILL(BRAND_SOFT);
            valueCell.fill = FILL(BRAND_SOFT);
        } else {
            labelCell.font = { color: { argb: MUTED } };
            valueCell.font = { color: { argb: INK } };
        }
    };

    const { totals } = movements;
    kpi('Produk Bergerak', movements.products.length, INT_FMT);
    kpi('Total Stok Masuk', totals.stockIn, INT_FMT);
    kpi('Total Terjual', totals.sold, INT_FMT);
    kpi('Penyesuaian +', totals.adjustIn, INT_FMT);
    kpi('Penyesuaian −', totals.adjustOut, INT_FMT);
    kpi('Nilai Pembelian', report.summary.totalStockInValue, MONEY_FMT);
    kpi('Stok Akhir (unit)', totals.closingStock, INT_FMT, { emphasis: true });
    kpi('Nilai Stok Akhir', totals.closingValue, MONEY_FMT, { emphasis: true });
    ws.addRow([]);

    // ── Rekap alasan stok keluar ──
    addSectionRow(ws, 'ALASAN STOK KELUAR', SPAN);
    const header = ws.addRow(['Alasan', 'Jumlah', 'Satuan']);
    styleHeaderRow(header, SPAN);
    const headerRowNumber = header.number;

    const reasons = report.stockOutByReason ?? [];
    if (reasons.length === 0) {
        const row = ws.addRow(['Tidak ada stok keluar pada periode ini', '', '']);
        styleBodyRow(row, SPAN, { numericFrom: 2 });
        applyTableChrome(ws, headerRowNumber, null, SPAN);
        return;
    }

    let totalReasonQty = 0;
    reasons.forEach((r, i) => {
        const row = ws.addRow([REASON_LABELS[r.reason] ?? r.reason, r.quantity, 'unit']);
        styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 2 });
        row.getCell(2).numFmt = INT_FMT;
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
        totalReasonQty += r.quantity;
    });

    const totalRow = ws.addRow(['TOTAL', totalReasonQty, 'unit']);
    styleTotalRow(totalRow, SPAN);
    totalRow.getCell(2).numFmt = INT_FMT;
    totalRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };

    applyTableChrome(ws, headerRowNumber, totalRow.number - 1, SPAN);
}

/** Kartu stok: kolom persis seperti yang diminta, plus baris TOTAL. */
function buildStockCardSheet(wb: Workbook, ctx: SheetContext, rows: StockMovementRow[]) {
    const ws = wb.addWorksheet('Kartu Stok');
    const SPAN = 10;
    ws.columns = [
        { key: 'name', width: 32 },
        { key: 'sku', width: 16 },
        { key: 'opening', width: 12 },
        { key: 'in', width: 12 },
        { key: 'sold', width: 12 },
        { key: 'adjustIn', width: 14 },
        { key: 'adjustOut', width: 14 },
        { key: 'closing', width: 12 },
        { key: 'hpp', width: 16 },
        { key: 'value', width: 20 },
    ];
    applyPageSetup(ws, ctx, 'landscape');

    writeSheetTitle(ws, ctx, 'Kartu Stok per Produk', SPAN);
    const header = ws.addRow([
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
    styleHeaderRow(header, SPAN);
    const headerRowNumber = header.number;

    if (rows.length === 0) {
        const row = ws.addRow(['Tidak ada produk dengan saldo atau mutasi pada periode ini']);
        ws.mergeCells(row.number, 1, row.number, SPAN);
        styleBodyRow(row, SPAN);
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        applyTableChrome(ws, headerRowNumber, null, SPAN);
        return;
    }

    rows.forEach((r, i) => {
        const row = ws.addRow([
            r.name,
            r.sku,
            r.openingStock,
            r.stockIn,
            r.sold,
            r.adjustIn,
            r.adjustOut,
            r.closingStock,
            r.hpp,
            r.closingValue,
        ]);
        styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 3 });
        // Penyesuaian − dan Terjual ditampilkan sebagai pengurang, lebih mudah dibaca.
        row.getCell(5).value = r.sold === 0 ? 0 : -r.sold;
        row.getCell(7).value = r.adjustOut === 0 ? 0 : -r.adjustOut;
        for (const c of [3, 4, 5, 6, 7, 8]) row.getCell(c).numFmt = INT_FMT;
        row.getCell(9).numFmt = MONEY_FMT;
        row.getCell(10).numFmt = MONEY_FMT;
    });

    const sum = (pick: (r: StockMovementRow) => number) => rows.reduce((s, r) => s + pick(r), 0);
    const totalRow = ws.addRow([
        'TOTAL',
        '',
        sum((r) => r.openingStock),
        sum((r) => r.stockIn),
        sum((r) => r.sold) === 0 ? 0 : -sum((r) => r.sold),
        sum((r) => r.adjustIn),
        sum((r) => r.adjustOut) === 0 ? 0 : -sum((r) => r.adjustOut),
        sum((r) => r.closingStock),
        '',
        sum((r) => r.closingValue),
    ]);
    styleTotalRow(totalRow, SPAN);
    for (const c of [3, 4, 5, 6, 7, 8]) totalRow.getCell(c).numFmt = INT_FMT;
    applyMoneyFormat(totalRow, [10]);

    applyTableChrome(ws, headerRowNumber, totalRow.number - 1, SPAN);
}

function buildStockInSheet(wb: Workbook, ctx: SheetContext, rows: StockIn[]) {
    const ws = wb.addWorksheet('Mutasi Masuk');
    const SPAN = 10;
    ws.columns = [
        { key: 'date', width: 14 },
        { key: 'product', width: 30 },
        { key: 'sku', width: 14 },
        { key: 'supplier', width: 22 },
        { key: 'qty', width: 10 },
        { key: 'buyPrice', width: 16 },
        { key: 'total', width: 18 },
        { key: 'expire', width: 13 },
        { key: 'notes', width: 26 },
        { key: 'by', width: 16 },
    ];
    applyPageSetup(ws, ctx, 'landscape');

    writeSheetTitle(ws, ctx, `Mutasi Masuk (${rows.length} catatan)`, SPAN);
    const header = ws.addRow([
        'Tanggal',
        'Produk',
        'SKU/Kode',
        'Supplier',
        'Jumlah',
        'Harga Beli',
        'Total',
        'Kadaluarsa',
        'Catatan',
        'Dicatat Oleh',
    ]);
    styleHeaderRow(header, SPAN);
    const headerRowNumber = header.number;

    if (rows.length === 0) {
        const row = ws.addRow(['Tidak ada stok masuk pada periode ini']);
        ws.mergeCells(row.number, 1, row.number, SPAN);
        styleBodyRow(row, SPAN);
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        applyTableChrome(ws, headerRowNumber, null, SPAN);
        return;
    }

    let totalQty = 0;
    let totalValue = 0;
    rows.forEach((s, i) => {
        const row = ws.addRow([
            format(new Date(s.date), 'dd/MM/yyyy'),
            s.product?.name ?? '-',
            s.product?.sku ?? '-',
            s.supplier?.name ?? '-',
            s.quantity,
            Number(s.buyPrice),
            Number(s.totalPrice),
            s.expireDate ? format(new Date(s.expireDate), 'dd/MM/yyyy') : '-',
            s.notes ?? '',
            s.createdBy?.name ?? '-',
        ]);
        styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 5 });
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).numFmt = INT_FMT;
        row.getCell(6).numFmt = MONEY_FMT;
        row.getCell(7).numFmt = MONEY_FMT;
        totalQty += s.quantity;
        totalValue += Number(s.totalPrice);
    });

    const totalRow = ws.addRow(['TOTAL', '', '', '', totalQty, '', totalValue, '', '', '']);
    styleTotalRow(totalRow, SPAN);
    totalRow.getCell(5).numFmt = INT_FMT;
    applyMoneyFormat(totalRow, [7]);

    applyTableChrome(ws, headerRowNumber, totalRow.number - 1, SPAN);
}

function buildStockOutSheet(wb: Workbook, ctx: SheetContext, rows: StockOut[]) {
    const ws = wb.addWorksheet('Mutasi Keluar');
    const SPAN = 7;
    ws.columns = [
        { key: 'date', width: 14 },
        { key: 'product', width: 32 },
        { key: 'sku', width: 14 },
        { key: 'qty', width: 10 },
        { key: 'reason', width: 16 },
        { key: 'notes', width: 32 },
        { key: 'by', width: 16 },
    ];
    applyPageSetup(ws, ctx, 'landscape');

    writeSheetTitle(ws, ctx, `Mutasi Keluar (${rows.length} catatan)`, SPAN);
    const header = ws.addRow([
        'Tanggal',
        'Produk',
        'SKU/Kode',
        'Jumlah',
        'Alasan',
        'Catatan',
        'Dicatat Oleh',
    ]);
    styleHeaderRow(header, SPAN);
    const headerRowNumber = header.number;

    if (rows.length === 0) {
        const row = ws.addRow(['Tidak ada stok keluar pada periode ini']);
        ws.mergeCells(row.number, 1, row.number, SPAN);
        styleBodyRow(row, SPAN);
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        applyTableChrome(ws, headerRowNumber, null, SPAN);
        return;
    }

    let totalQty = 0;
    rows.forEach((s, i) => {
        const row = ws.addRow([
            format(new Date(s.date), 'dd/MM/yyyy'),
            s.product?.name ?? '-',
            s.product?.sku ?? '-',
            -s.quantity,
            REASON_LABELS[s.reason] ?? s.reason,
            s.notes ?? '',
            s.createdBy?.name ?? '-',
        ]);
        styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 4 });
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).numFmt = INT_FMT;
        totalQty += s.quantity;
    });

    const totalRow = ws.addRow(['TOTAL', '', '', -totalQty, '', '', '']);
    styleTotalRow(totalRow, SPAN);
    totalRow.getCell(4).numFmt = INT_FMT;

    applyTableChrome(ws, headerRowNumber, totalRow.number - 1, SPAN);
}

/** Alert kondisi saat ini (bukan terikat rentang tanggal). */
function buildAlertsSheet(wb: Workbook, ctx: SheetContext, report: StockReport) {
    const ws = wb.addWorksheet('Alert Stok');
    const SPAN = 5;
    ws.columns = [
        { key: 'kind', width: 22 },
        { key: 'product', width: 34 },
        { key: 'qty', width: 12 },
        { key: 'unit', width: 12 },
        { key: 'note', width: 30 },
    ];
    applyPageSetup(ws, ctx, 'portrait');

    writeSheetTitle(ws, ctx, 'Alert Stok (kondisi saat ini)', SPAN);
    const header = ws.addRow(['Jenis', 'Produk', 'Jumlah', 'Satuan', 'Keterangan']);
    styleHeaderRow(header, SPAN);
    const headerRowNumber = header.number;

    const { alerts } = report;
    const entries: { kind: string; product: string; qty: number; unit: string; note: string }[] = [
        ...alerts.outOfStock.map((p) => ({
            kind: 'Stok Habis',
            product: p.name,
            qty: 0,
            unit: p.unit,
            note: 'Perlu restock',
        })),
        ...alerts.lowStock.map((p) => ({
            kind: 'Stok Menipis',
            product: p.name,
            qty: p.stock,
            unit: p.unit,
            note: 'Sisa ≤ 5',
        })),
        ...alerts.expired.map((b) => ({
            kind: 'Sudah Kadaluarsa',
            product: b.productName,
            qty: b.quantity,
            unit: b.unit,
            note: format(new Date(b.expireDate), 'dd/MM/yyyy'),
        })),
        ...alerts.expiringSoon.map((b) => ({
            kind: 'Akan Kadaluarsa',
            product: b.productName,
            qty: b.quantity,
            unit: b.unit,
            note: `${format(new Date(b.expireDate), 'dd/MM/yyyy')} (≤ 7 hari)`,
        })),
    ];

    if (entries.length === 0) {
        const row = ws.addRow(['Tidak ada alert stok']);
        ws.mergeCells(row.number, 1, row.number, SPAN);
        styleBodyRow(row, SPAN);
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        applyTableChrome(ws, headerRowNumber, null, SPAN);
        return;
    }

    entries.forEach((e, i) => {
        const row = ws.addRow([e.kind, e.product, e.qty, e.unit, e.note]);
        styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 3 });
        row.getCell(3).numFmt = INT_FMT;
    });

    applyTableChrome(ws, headerRowNumber, ws.rowCount, SPAN);
}
