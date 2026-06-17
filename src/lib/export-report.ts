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

const CURRENCY_FMT = '#,##0';

export interface ExportResult {
    fileName: string;
    txCount: number;
    itemCount: number;
    expenseCount: number;
}

const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

// ─── File helpers ─────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

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

    buildSummarySheet(wb, { storeName, start, end, report });
    buildDailyChartSheet(wb, report.dailyChart);
    buildPaymentSheet(wb, report);
    buildTopProductsSheet(wb, report);

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

type Workbook = ExcelJSTypes.Workbook;
type Worksheet = ExcelJSTypes.Worksheet;

function styleHeaderRow(row: ExcelJSTypes.Row) {
    row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA7B0D' } };
        cell.alignment = { vertical: 'middle' };
    });
}

function setupTable(
    ws: Worksheet,
    columns: { header: string; key: string; width: number; money?: boolean }[],
) {
    ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));
    const headerRow = ws.addRow(columns.map((c) => c.header));
    styleHeaderRow(headerRow);
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    return columns;
}

function applyMoneyFormat(ws: Worksheet, columns: { key: string; money?: boolean }[]) {
    for (const col of columns) {
        if (col.money) ws.getColumn(col.key).numFmt = CURRENCY_FMT;
    }
}

function pct(val: number, total: number) {
    return total === 0 ? '0.0%' : `${((val / total) * 100).toFixed(1)}%`;
}

function buildSummarySheet(
    wb: Workbook,
    { storeName, start, end, report }: { storeName: string; start: Date; end: Date; report: AggregatedReport },
) {
    const ws = wb.addWorksheet('Ringkasan');
    ws.columns = [{ width: 30 }, { width: 22 }];

    const titleRow = ws.addRow([`Laporan ${storeName}`]);
    titleRow.font = { bold: true, size: 14 };
    ws.addRow(['Periode', `${format(start, 'dd/MM/yyyy')} – ${format(end, 'dd/MM/yyyy')}`]);
    ws.addRow(['Dibuat', format(new Date(), 'dd/MM/yyyy HH:mm')]);
    ws.addRow([]);

    const { stats } = report;
    const netProfit = stats.totalRevenue - stats.totalDiscount - stats.totalProfit; // gross profit approx

    const moneyRow = (label: string, value: number, bold = false) => {
        const row = ws.addRow([label, value]);
        row.getCell(2).numFmt = CURRENCY_FMT;
        if (bold) row.font = { bold: true };
    };

    ws.addRow(['Jumlah Transaksi', stats.totalSalesCount]);
    moneyRow('Pendapatan Kotor', stats.totalGrossRevenue);
    moneyRow('Total Diskon', -stats.totalDiscount);
    moneyRow('Penjualan Bersih', stats.totalRevenue, true);
    moneyRow('Total Profit', stats.totalProfit, true);
    ws.addRow(['Margin Profit', pct(stats.totalProfit, stats.totalRevenue)]);
    ws.addRow([]);

    // Payment breakdown
    const payHeader = ws.addRow(['Metode Bayar', 'Total (Rp)', 'Transaksi']);
    styleHeaderRow(payHeader);
    const sortedPayments = [...report.paymentSummary.entries()].sort((a, b) => b[1].amount - a[1].amount);
    if (sortedPayments.length === 0) {
        ws.addRow(['—', 0, 0]);
    } else {
        for (const [name, v] of sortedPayments) {
            const row = ws.addRow([name, v.amount, v.count]);
            row.getCell(2).numFmt = CURRENCY_FMT;
        }
    }
}

function buildDailyChartSheet(wb: Workbook, dailyChart: AggregatedReport['dailyChart']) {
    const ws = wb.addWorksheet('Data Harian');
    const columns = [
        { header: 'Tanggal', key: 'date', width: 14 },
        { header: 'Pendapatan Bersih (Rp)', key: 'revenue', width: 24, money: true },
        { header: 'Jumlah Transaksi', key: 'txCount', width: 18 },
    ];
    setupTable(ws, columns);

    let totalRevenue = 0;
    let totalTx = 0;
    for (const d of dailyChart) {
        ws.addRow({ date: d.date, revenue: d.revenue, txCount: d.txCount });
        totalRevenue += d.revenue;
        totalTx += d.txCount;
    }

    const totalRow = ws.addRow({ date: 'TOTAL', revenue: totalRevenue, txCount: totalTx });
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => { cell.border = { top: { style: 'thin' } }; });

    applyMoneyFormat(ws, columns);
}

function buildPaymentSheet(wb: Workbook, report: AggregatedReport) {
    const ws = wb.addWorksheet('Metode Pembayaran');
    const columns = [
        { header: 'Metode Bayar', key: 'name', width: 25 },
        { header: 'Total (Rp)', key: 'amount', width: 20, money: true },
        { header: 'Jumlah Transaksi', key: 'count', width: 18 },
        { header: '% dari Total', key: 'pct', width: 14 },
    ];
    setupTable(ws, columns);

    const totalAmount = [...report.paymentSummary.values()].reduce((s, v) => s + v.amount, 0);
    const sorted = [...report.paymentSummary.entries()].sort((a, b) => b[1].amount - a[1].amount);

    for (const [name, v] of sorted) {
        ws.addRow({ name, amount: v.amount, count: v.count, pct: pct(v.amount, totalAmount) });
    }

    applyMoneyFormat(ws, columns);
}

function buildTopProductsSheet(wb: Workbook, report: AggregatedReport) {
    const ws = wb.addWorksheet('Produk Terlaris');
    const columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Nama Produk', key: 'name', width: 32 },
        { header: 'Qty Terjual', key: 'quantity', width: 13 },
        { header: 'Pendapatan (Rp)', key: 'revenue', width: 20, money: true },
        { header: 'Profit (Rp)', key: 'profit', width: 18, money: true },
        { header: '% Profit', key: 'pct', width: 12 },
    ];
    setupTable(ws, columns);

    const sorted = [...report.productSummary.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20);

    sorted.forEach((p, i) => {
        ws.addRow({
            no: i + 1,
            name: p.name,
            quantity: p.quantity,
            revenue: p.revenue,
            profit: p.profit,
            pct: pct(p.profit, p.revenue),
        });
    });

    applyMoneyFormat(ws, columns);
}