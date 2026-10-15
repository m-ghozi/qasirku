import { format, endOfDay, startOfDay } from 'date-fns';
import api from '@/lib/api';
import {
    BRAND,
    BRAND_SOFT,
    INK,
    MUTED,
    MONEY_FMT,
    INT_FMT,
    PCT_FMT,
    THIN_BORDER,
    FILL,
    saveFile,
    sanitizeForFileName,
    loadExcelJS,
    writeSheetTitle,
    styleHeaderRow,
    styleBodyRow,
    styleTotalRow,
    addSectionRow,
    applyMoneyFormat,
    pctValue,
    applyPageSetup,
    applyTableChrome,
    type Workbook,
    type Worksheet,
    type SheetContext,
} from '@/lib/excel-style';

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
    const ExcelJS = await loadExcelJS();
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

    applyTableChrome(ws, headerRowNumber, dailyChart.length > 0 ? totalRow.number - 1 : null, SPAN);
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

    applyTableChrome(ws, headerRowNumber, sorted.length > 0 ? totalRow.number - 1 : null, SPAN);
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
        applyTableChrome(ws, headerRowNumber, null, SPAN);
        return;
    }

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

    const sumRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
    const sumProfit = sorted.reduce((s, p) => s + p.profit, 0);
    const sumQty = sorted.reduce((s, p) => s + p.quantity, 0);
    const totalRow = ws.addRow(['', 'TOTAL', sumQty, sumRevenue, sumProfit, pctValue(sumProfit, sumRevenue)]);
    styleTotalRow(totalRow, SPAN);
    totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    totalRow.getCell(3).numFmt = INT_FMT;
    applyMoneyFormat(totalRow, [4, 5]);
    totalRow.getCell(6).numFmt = PCT_FMT;

    applyTableChrome(ws, headerRowNumber, totalRow.number - 1, SPAN);
}