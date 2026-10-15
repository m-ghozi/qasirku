import { format } from 'date-fns';
import type * as ExcelJSTypes from 'exceljs';

/**
 * Primitif bersama untuk ekspor Excel (dipakai laporan penjualan & laporan stok).
 *
 * Semua builder sheet memakai token dan helper di sini supaya gaya kedua laporan
 * konsisten: warna brand yang sama, format mata uang yang sama, ukuran kertas dan
 * footer yang sama.
 */

// ─── Design tokens (selaras dengan tema aplikasi) ─────────────────────────────

/** Warna utama (blue-700) untuk bar judul & header tabel. */
export const BRAND = 'FF1D4ED8';
/** Warna lembut (blue-50) untuk baris total / section. */
export const BRAND_SOFT = 'FFEFF6FF';
/** Warna netral untuk baris zebra (slate-50). */
export const ZEBRA = 'FFF8FAFC';
/** Garis tabel (gray-300). */
export const BORDER = 'FFD1D5DB';
/** Garis header di atas latar biru (blue-200). */
export const BORDER_ON_BRAND = 'FFBFDBFE';
/** Teks utama (slate-900). */
export const INK = 'FF0F172A';
/** Teks sekunder (slate-500). */
export const MUTED = 'FF64748B';

/** Format mata uang: ribuan dengan prefix Rp, negatif merah dalam kurung. */
export const MONEY_FMT = '"Rp"#,##0;[Red]-"Rp"#,##0';
export const INT_FMT = '#,##0';
export const PCT_FMT = '0.0%';

export const A4_PAPER = 9;

export const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Workbook = ExcelJSTypes.Workbook;
export type Worksheet = ExcelJSTypes.Worksheet;
export type Row = ExcelJSTypes.Row;
export type Cell = ExcelJSTypes.Cell;

/** Konteks bersama untuk seluruh sheet (judul, periode, footer). */
export interface SheetContext {
    storeName: string;
    start: Date;
    end: Date;
    generatedAt: Date;
}

// ─── File helpers ─────────────────────────────────────────────────────────────

export async function saveFile(buffer: ArrayBuffer, fileName: string): Promise<void> {
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

export function sanitizeForFileName(name: string): string {
    return name.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') || 'Toko';
}

/**
 * Muat modul exceljs secara dinamis.
 *
 * Dynamic import penting di sini: exceljs berat (~1 MB) dan hanya dipakai saat
 * pengguna benar-benar menekan tombol ekspor, jadi jangan sampai masuk bundle awal.
 * Pembungkusan `default` menangani perbedaan bentuk modul ESM vs CJS.
 */
export async function loadExcelJS(): Promise<typeof ExcelJSTypes> {
    const mod = await import('exceljs');
    return ((mod as unknown as { default?: typeof ExcelJSTypes }).default ?? mod) as typeof ExcelJSTypes;
}

// ─── Styling primitives ───────────────────────────────────────────────────────

export const THIN_BORDER: Partial<ExcelJSTypes.Borders> = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
};

export const HEADER_BORDER: Partial<ExcelJSTypes.Borders> = {
    top: { style: 'thin', color: { argb: BORDER_ON_BRAND } },
    left: { style: 'thin', color: { argb: BORDER_ON_BRAND } },
    bottom: { style: 'thin', color: { argb: BORDER_ON_BRAND } },
    right: { style: 'thin', color: { argb: BORDER_ON_BRAND } },
};

export const FILL = (argb: string): ExcelJSTypes.FillPattern => ({
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
});

/** Baris judul + periode di atas tabel, digabung selebar tabel. */
export function writeSheetTitle(ws: Worksheet, ctx: SheetContext, title: string, span: number) {
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
export function styleHeaderRow(row: Row, span: number) {
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
export function styleBodyRow(row: Row, span: number, opts: { zebra?: boolean; numericFrom?: number } = {}) {
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
export function styleTotalRow(row: Row, span: number) {
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
export function addSectionRow(ws: Worksheet, label: string, span: number): Row {
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

export function applyMoneyFormat(row: Row, cols: number[]) {
    for (const c of cols) row.getCell(c).numFmt = MONEY_FMT;
}

/** Rasio 0–1 (dipakai bersama numFmt persen native Excel). */
export function pctValue(val: number, total: number): number {
    return total === 0 ? 0 : val / total;
}

/** Page setup A4 siap cetak + footer nomor halaman. */
export function applyPageSetup(ws: Worksheet, ctx: SheetContext, orientation: 'portrait' | 'landscape') {
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

/**
 * Pasang autofilter + freeze pane pada tabel yang headernya di baris `headerRowNumber`.
 *
 * `lastDataRowNumber` null berarti tabel tidak punya baris data — autofilter dilewati
 * (menyalakan filter di tabel kosong membingungkan), tapi baris header tetap dibekukan.
 */
export function applyTableChrome(
    ws: Worksheet,
    headerRowNumber: number,
    lastDataRowNumber: number | null,
    span: number,
) {
    if (lastDataRowNumber !== null && lastDataRowNumber >= headerRowNumber) {
        ws.autoFilter = {
            from: { row: headerRowNumber, column: 1 },
            to: { row: lastDataRowNumber, column: span },
        };
    }
    ws.views = [{ state: 'frozen', ySplit: headerRowNumber }];
}
