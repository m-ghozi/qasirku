import { format, endOfDay, startOfDay } from 'date-fns';
import type * as ExcelJSTypes from 'exceljs';
import api from '@/lib/api';

/**
 * Client-side Excel export untuk halaman Laporan.
 *
 * Data diambil dari REST API (bukan Dexie) menggunakan endpoint yang sudah ada:
 *  - GET /api/reports?date=YYYY-MM-DD  → daily report
 *  - GET /api/reports?period=7|30      → period report
 *
 * Karena API hanya mendukung 1 hari atau 7/30 hari, export range custom
 * di-handle dengan mengiterasi hari per hari dan menggabungkan hasilnya.
 */

export interface ExportResult {
    fileName: string;
    txCount: number;
    itemCount: number;
    expenseCount: number;
}

const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ─── Design tokens (selaras dengan tema aplikasi) ─────────────────────────────

/** Warna utama (blue-700) untuk bar judul & header tabel. */
const BRAND = 'FF1D4ED8';
/** Warna lembut (blue-50) untuk baris total / section. */
const BRAND_SOFT = 'FFEFF6FF';
/** Warna netral untuk baris zebra (slate-50). */
const ZEBRA = 'FFF8FAFC';
/** Garis tabel (gray-300). */
const BORDER = 'FFD1D5DB';
/** Garis header di atas latar biru (blue-200). */
const BORDER_ON_BRAND = 'FFBFDBFE';
/** Teks utama (slate-900). */
const INK = 'FF0F172A';
/** Teks sekunder (slate-500). */
const MUTED = 'FF64748B';

/** Format mata uang: ribuan dengan prefix Rp, negatif merah dalam kurung. */
const MONEY_FMT = '"Rp"#,##0;[Red]-"Rp"#,##0';
const INT_FMT = '#,##0';
const PCT_FMT = '0.0%';

const A4_PAPER = 9;

// ─── Types (sesuai response reportService) ────────────────────────────────────

interface ReportStats {
    totalGrossRevenue: number;
    totalDiscount: number;
    totalRevenue: number;
    totalProfit: number;
    totalSalesCount: number;
    avgTransaction?: number;
}

interface PaymentBreakdown {
    name: string;
    amount: number;
    count: number;
}

interface TopProduct {
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
}

interface DailyReportResponse {
    stats: ReportStats;
    paymentBreakdown: PaymentBreakdown[];
    topProducts: TopProduct[];
}

// ─── Agregasi gabungan selama range ──────────────────────────────────────────

interface AggregatedReport {
    stats: ReportStats;
    paymentSummary: Map<string, { amount: number; count: number }>;
    productSummary: Map<string, { name: string; quantity: number; revenue: number; profit: number }>;
    dailyChart: { date: string; revenue: number; txCount: number }[];
}

/** Konteks bersama untuk seluruh sheet (judul, periode, footer). */
interface SheetContext {
    storeName: string;
    start: Date;
    end: Date;
    generatedAt: Date;
}

/**
 * Fetch laporan harian untuk setiap hari dalam range, lalu gabungkan.
 * Ini menghindari kebutuhan endpoint baru — cukup gunakan getDailyReport
 * yang sudah ada secara berulang.
 */
async function fetchAndAggregate(start: Date, end: Date): Promise<AggregatedReport> {
    // Kumpulkan semua tanggal dalam range (inklusif)
    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        dates.push(format(cursor, 'yyyy-MM-dd'));
        cursor.setDate(cursor.getDate() + 1);
    }

    // Fetch paralel — batasi 10 hari sekaligus agar tidak flood server
    const CHUNK = 10;
    const results: DailyReportResponse[] = [];
    for (let i = 0; i < dates.length; i += CHUNK) {
        const chunk = dates.slice(i, i + CHUNK);
        const fetched = await Promise.all(
            chunk.map((d) =>
                api
                    .get<{ success: boolean; data: DailyReportResponse }>(`/reports?date=${d}`)
                    .then((res) => res.data.data),
            ),
        );
        results.push(...fetched);
    }

    // Agregasikan
    const stats: ReportStats = {
        totalGrossRevenue: 0,
        totalDiscount: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalSalesCount: 0,
    };
    const paymentSummary = new Map<string, { amount: number; count: number }>();
    const productSummary = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    const dailyChart: { date: string; revenue: number; txCount: number }[] = [];

    results.forEach((r, idx) => {
        stats.totalGrossRevenue += r.stats.totalGrossRevenue;
        stats.totalDiscount += r.stats.totalDiscount;
        stats.totalRevenue += r.stats.totalRevenue;
        stats.totalProfit += r.stats.totalProfit;
        stats.totalSalesCount += r.stats.totalSalesCount;

        dailyChart.push({
            date: format(new Date(`${dates[idx]}T00:00:00`), 'dd/MM/yyyy'),
            revenue: r.stats.totalRevenue,
            txCount: r.stats.totalSalesCount,
        });

        r.paymentBreakdown.forEach((p) => {
            const cur = paymentSummary.get(p.name) ?? { amount: 0, count: 0 };
            cur.amount += p.amount;
            cur.count += p.count;
            paymentSummary.set(p.name, cur);
        });

        r.topProducts.forEach((p) => {
            const cur = productSummary.get(p.name) ?? { name: p.name, quantity: 0, revenue: 0, profit: 0 };
            cur.quantity += p.quantity;
            cur.revenue += p.revenue;
            cur.profit += p.profit;
            productSummary.set(p.name, cur);
        });
    });

    return { stats, paymentSummary, productSummary, dailyChart };
}

// ─── File helpers ─────────────────────────────────────────────────────────────

async function saveFile(buffer: ArrayBuffer, fileName: string): Promise<void> {
    const blob = new Blob([buffer], { type: XLSX_MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function sanitizeForFileName(name: string): string {
    return name.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') || 'Toko';
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportReportToExcel(rangeStart: Date, rangeEnd: Date): Promise<ExportResult> {
    const start = startOfDay(rangeStart);
    const end = endOfDay(rangeEnd);

    // Fetch store name dari API settings (opsional, fallback 'Kasir')
    let storeName = 'Kasir';
    try {
        const settingsRes = await api.get<{ success: boolean; data: { storeName?: string } }>('/store-settings');
        storeName = settingsRes.data.data.storeName?.trim() || 'Kasir';
    } catch {
        // tidak blocking
    }

    const report = await fetchAndAggregate(start, end);

    // Build workbook
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = (ExcelJSModule as unknown as { default?: typeof ExcelJSModule }).default ?? ExcelJSModule;
    const wb = new ExcelJS.Workbook();
    wb.creator = storeName;
    wb.created = end;

    const ctx: SheetContext = { storeName, start, end, generatedAt: new Date() };

    buildSummarySheet(wb, ctx, report);
    buildDailyChartSheet(wb, ctx, report.dailyChart);
    buildPaymentSheet(wb, ctx, report);
    buildTopProductsSheet(wb, ctx, report);

    const buffer = await wb.xlsx.writeBuffer();
    const fileName = `Laporan_${sanitizeForFileName(storeName)}_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.xlsx`;
    await saveFile(buffer as ArrayBuffer, fileName);

    return {
        fileName,
        txCount: report.stats.totalSalesCount,
        itemCount: 0, // API tidak return item count secara terpisah
        expenseCount: 0,
    };
}

// ─── Styling primitives ───────────────────────────────────────────────────────

type Workbook = ExcelJSTypes.Workbook;
type Worksheet = ExcelJSTypes.Worksheet;
type Row = ExcelJSTypes.Row;
type Cell = ExcelJSTypes.Cell;

const THIN_BORDER: Partial<ExcelJSTypes.Borders> = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
};

const HEADER_BORDER: Partial<ExcelJSTypes.Borders> = {
    top: { style: 'thin', color: { argb: BORDER_ON_BRAND } },
    left: { style: 'thin', color: { argb: BORDER_ON_BRAND } },
    bottom: { style: 'thin', color: { argb: BORDER_ON_BRAND } },
    right: { style: 'thin', color: { argb: BORDER_ON_BRAND } },
};

const FILL = (argb: string): ExcelJSTypes.FillPattern => ({
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
});

/** Baris judul + periode di atas tabel, digabung selebar tabel. */
function writeSheetTitle(ws: Worksheet, ctx: SheetContext, title: string, span: number) {
    const titleRow = ws.addRow([title]);
    ws.mergeCells(titleRow.number, 1, titleRow.number, span);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, size: 15, color: { argb: BRAND } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    const subRow = ws.addRow([
        `${ctx.storeName}  •  Periode ${format(ctx.start, 'dd/MM/yyyy')} – ${format(ctx.end, 'dd/MM/yyyy')}`,
    ]);
    ws.mergeCells(subRow.number, 1, subRow.number, span);
    subRow.height = 18;
    const subCell = subRow.getCell(1);
    subCell.font = { size: 10, color: { argb: MUTED } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.addRow([]);
}

/** Header tabel: latar brand, teks putih tebal, terpusat. */
function styleHeaderRow(row: Row, span: number) {
    row.height = 24;
    for (let c = 1; c <= span; c++) {
        const cell = row.getCell(c);
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = FILL(BRAND);
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = HEADER_BORDER;
    }
}

/** Baris data: border tipis, zebra opsional, angka rata kanan. */
function styleBodyRow(row: Row, span: number, opts: { zebra?: boolean; numericFrom?: number } = {}) {
    row.height = 19;
    const numericFrom = opts.numericFrom ?? span + 1;
    for (let c = 1; c <= span; c++) {
        const cell = row.getCell(c);
        cell.border = THIN_BORDER;
        if (opts.zebra) cell.fill = FILL(ZEBRA);
        cell.alignment = {
            vertical: 'middle',
            horizontal: c >= numericFrom ? 'right' : 'left',
        };
    }
}

/** Baris total: tebal, latar lembut, garis atas tegas. */
function styleTotalRow(row: Row, span: number) {
    row.height = 22;
    for (let c = 1; c <= span; c++) {
        const cell = row.getCell(c);
        cell.font = { bold: true, color: { argb: INK } };
        cell.fill = FILL(BRAND_SOFT);
        cell.border = { ...THIN_BORDER, top: { style: 'medium', color: { argb: BRAND } } };
        cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'right' };
    }
}

/** Baris section (mis. "RINGKASAN PENJUALAN") yang digabung selebar tabel. */
function addSectionRow(ws: Worksheet, label: string, span: number): Row {
    const row = ws.addRow([label]);
    ws.mergeCells(row.number, 1, row.number, span);
    row.height = 22;
    const cell = row.getCell(1);
    cell.font = { bold: true, size: 11, color: { argb: BRAND } };
    cell.fill = FILL(BRAND_SOFT);
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = THIN_BORDER;
    return row;
}

function applyMoneyFormat(row: Row, cols: number[]) {
    for (const c of cols) row.getCell(c).numFmt = MONEY_FMT;
}

/** Rasio 0–1 (dipakai bersama numFmt persen native Excel). */
function pctValue(val: number, total: number): number {
    return total === 0 ? 0 : val / total;
}

/** Page setup A4 siap cetak + footer nomor halaman. */
function applyPageSetup(ws: Worksheet, ctx: SheetContext, orientation: 'portrait' | 'landscape') {
    ws.pageSetup = {
        paperSize: A4_PAPER,
        orientation,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    };
    ws.headerFooter = {
        oddFooter: `&L&"Calibri,Italic"${ctx.storeName} — dibuat ${format(ctx.generatedAt, 'dd/MM/yyyy HH:mm')}&R&"Calibri,Italic"Hal. &P/&N`,
    };
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildSummarySheet(wb: Workbook, ctx: SheetContext, report: AggregatedReport) {
    const ws = wb.addWorksheet('Ringkasan');
    const SPAN = 3;
    ws.columns = [{ width: 34 }, { width: 22 }, { width: 16 }];
    applyPageSetup(ws, ctx, 'portrait');

    // ── Kop laporan ──
    const titleRow = ws.addRow(['Laporan Penjualan']);
    ws.mergeCells(titleRow.number, 1, titleRow.number, SPAN);
    titleRow.height = 32;
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: BRAND } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const storeRow = ws.addRow([ctx.storeName]);
    ws.mergeCells(storeRow.number, 1, storeRow.number, SPAN);
    storeRow.height = 20;
    storeRow.getCell(1).font = { bold: true, size: 12, color: { argb: INK } };
    storeRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const infoRow = (label: string, value: string) => {
        const row = ws.addRow([label, value]);
        ws.mergeCells(row.number, 2, row.number, SPAN);
        row.getCell(1).font = { size: 10, color: { argb: MUTED } };
        row.getCell(2).font = { size: 10, color: { argb: INK } };
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    };
    infoRow('Periode', `${format(ctx.start, 'dd/MM/yyyy')} – ${format(ctx.end, 'dd/MM/yyyy')}`);
    infoRow('Dibuat', format(ctx.generatedAt, 'dd/MM/yyyy HH:mm'));
    ws.addRow([]);

    // ── Ringkasan penjualan ──
    addSectionRow(ws, 'RINGKASAN PENJUALAN', SPAN);

    const { stats } = report;
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

    kpi('Jumlah Transaksi', stats.totalSalesCount, INT_FMT);
    kpi('Pendapatan Kotor', stats.totalGrossRevenue, MONEY_FMT);
    kpi('Total Diskon', -stats.totalDiscount, MONEY_FMT);
    kpi('Penjualan Bersih', stats.totalRevenue, MONEY_FMT, { emphasis: true });
    kpi('Total Profit', stats.totalProfit, MONEY_FMT, { emphasis: true });
    kpi('Margin Profit', pctValue(stats.totalProfit, stats.totalRevenue), PCT_FMT);
    ws.addRow([]);

    // ── Metode pembayaran ──
    addSectionRow(ws, 'METODE PEMBAYARAN', SPAN);
    const header = ws.addRow(['Metode Bayar', 'Total', 'Transaksi']);
    styleHeaderRow(header, SPAN);

    const sortedPayments = [...report.paymentSummary.entries()].sort((a, b) => b[1].amount - a[1].amount);
    if (sortedPayments.length === 0) {
        const row = ws.addRow(['Tidak ada data pembayaran', '', '']);
        styleBodyRow(row, SPAN, { numericFrom: 2 });
    } else {
        sortedPayments.forEach(([name, v], i) => {
            const row = ws.addRow([name, v.amount, v.count]);
            styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 2 });
            row.getCell(2).numFmt = MONEY_FMT;
            row.getCell(3).numFmt = INT_FMT;
        });
    }

    const totalAmount = sortedPayments.reduce((s, [, v]) => s + v.amount, 0);
    const totalCount = sortedPayments.reduce((s, [, v]) => s + v.count, 0);
    const totalRow = ws.addRow(['TOTAL', totalAmount, totalCount]);
    styleTotalRow(totalRow, SPAN);
    applyMoneyFormat(totalRow, [2]);
    totalRow.getCell(3).numFmt = INT_FMT;
}

function buildDailyChartSheet(wb: Workbook, ctx: SheetContext, dailyChart: AggregatedReport['dailyChart']) {
    const ws = wb.addWorksheet('Data Harian');
    const SPAN = 3;
    ws.columns = [
        { key: 'date', width: 16 },
        { key: 'revenue', width: 22 },
        { key: 'txCount', width: 18 },
    ];
    applyPageSetup(ws, ctx, 'portrait');

    writeSheetTitle(ws, ctx, 'Data Harian', SPAN);
    const header = ws.addRow(['Tanggal', 'Pendapatan Bersih', 'Jumlah Transaksi']);
    styleHeaderRow(header, SPAN);
    const headerRowNumber = header.number;

    let totalRevenue = 0;
    let totalTx = 0;
    dailyChart.forEach((d, i) => {
        const row = ws.addRow([d.date, d.revenue, d.txCount]);
        styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 2 });
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).numFmt = MONEY_FMT;
        row.getCell(3).numFmt = INT_FMT;
        totalRevenue += d.revenue;
        totalTx += d.txCount;
    });

    const totalRow = ws.addRow(['TOTAL', totalRevenue, totalTx]);
    styleTotalRow(totalRow, SPAN);
    applyMoneyFormat(totalRow, [2]);
    totalRow.getCell(3).numFmt = INT_FMT;
    totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    if (dailyChart.length > 0) {
        ws.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: totalRow.number - 1, column: SPAN } };
    }
    ws.views = [{ state: 'frozen', ySplit: headerRowNumber }];
}

function buildPaymentSheet(wb: Workbook, ctx: SheetContext, report: AggregatedReport) {
    const ws = wb.addWorksheet('Metode Pembayaran');
    const SPAN = 4;
    ws.columns = [
        { key: 'name', width: 26 },
        { key: 'amount', width: 20 },
        { key: 'count', width: 18 },
        { key: 'pct', width: 14 },
    ];
    applyPageSetup(ws, ctx, 'portrait');

    writeSheetTitle(ws, ctx, 'Rekap Metode Pembayaran', SPAN);
    const header = ws.addRow(['Metode Bayar', 'Total', 'Jumlah Transaksi', '% dari Total']);
    styleHeaderRow(header, SPAN);
    const headerRowNumber = header.number;

    const totalAmount = [...report.paymentSummary.values()].reduce((s, v) => s + v.amount, 0);
    const totalCount = [...report.paymentSummary.values()].reduce((s, v) => s + v.count, 0);
    const sorted = [...report.paymentSummary.entries()].sort((a, b) => b[1].amount - a[1].amount);

    if (sorted.length === 0) {
        const row = ws.addRow(['Tidak ada data pembayaran', '', '', '']);
        styleBodyRow(row, SPAN, { numericFrom: 2 });
        row.getCell(4).numFmt = PCT_FMT;
    } else {
        sorted.forEach(([name, v], i) => {
            const row = ws.addRow([name, v.amount, v.count, pctValue(v.amount, totalAmount)]);
            styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 2 });
            row.getCell(2).numFmt = MONEY_FMT;
            row.getCell(3).numFmt = INT_FMT;
            row.getCell(4).numFmt = PCT_FMT;
        });
    }

    const totalRow = ws.addRow(['TOTAL', totalAmount, totalCount, sorted.length === 0 ? 0 : 1]);
    styleTotalRow(totalRow, SPAN);
    applyMoneyFormat(totalRow, [2]);
    totalRow.getCell(3).numFmt = INT_FMT;
    totalRow.getCell(4).numFmt = PCT_FMT;

    if (sorted.length > 0) {
        ws.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: totalRow.number - 1, column: SPAN } };
    }
    ws.views = [{ state: 'frozen', ySplit: headerRowNumber }];
}

function buildTopProductsSheet(wb: Workbook, ctx: SheetContext, report: AggregatedReport) {
    const ws = wb.addWorksheet('Produk Terlaris');
    const SPAN = 6;
    ws.columns = [
        { key: 'no', width: 6 },
        { key: 'name', width: 34 },
        { key: 'quantity', width: 13 },
        { key: 'revenue', width: 20 },
        { key: 'profit', width: 18 },
        { key: 'pct', width: 12 },
    ];
    applyPageSetup(ws, ctx, 'landscape');

    writeSheetTitle(ws, ctx, 'Produk Terlaris (Top 20 berdasarkan kuantitas)', SPAN);
    const header = ws.addRow(['No', 'Nama Produk', 'Qty Terjual', 'Pendapatan', 'Profit', '% Profit']);
    styleHeaderRow(header, SPAN);
    const headerRowNumber = header.number;

    const sorted = [...report.productSummary.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20);

    if (sorted.length === 0) {
        const row = ws.addRow(['', 'Tidak ada data produk', '', '', '', '']);
        styleBodyRow(row, SPAN, { numericFrom: 3 });
    } else {
        sorted.forEach((p, i) => {
            const row = ws.addRow([
                i + 1,
                p.name,
                p.quantity,
                p.revenue,
                p.profit,
                pctValue(p.profit, p.revenue),
            ]);
            styleBodyRow(row, SPAN, { zebra: i % 2 === 1, numericFrom: 3 });
            row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell(3).numFmt = INT_FMT;
            row.getCell(4).numFmt = MONEY_FMT;
            row.getCell(5).numFmt = MONEY_FMT;
            row.getCell(6).numFmt = PCT_FMT;
        });
    }

    if (sorted.length > 0) {
        const sumRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
        const sumProfit = sorted.reduce((s, p) => s + p.profit, 0);
        const sumQty = sorted.reduce((s, p) => s + p.quantity, 0);
        const totalRow = ws.addRow(['', 'TOTAL', sumQty, sumRevenue, sumProfit, pctValue(sumProfit, sumRevenue)]);
        styleTotalRow(totalRow, SPAN);
        totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        totalRow.getCell(3).numFmt = INT_FMT;
        applyMoneyFormat(totalRow, [4, 5]);
        totalRow.getCell(6).numFmt = PCT_FMT;

        ws.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: totalRow.number - 1, column: SPAN } };
    }
    ws.views = [{ state: 'frozen', ySplit: headerRowNumber }];
}
