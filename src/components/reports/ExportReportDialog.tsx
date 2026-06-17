import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exportReportToExcel } from '@/lib/export-report';

interface ExportReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /**
     * Rentang default saat dialog dibuka (mengikuti periode aktif di Laporan),
     * dalam epoch ms agar identitasnya stabil antar-render parent.
     */
    defaultStartMs: number;
    defaultEndMs: number;
}

export default function ExportReportDialog({
    open,
    onOpenChange,
    defaultStartMs,
    defaultEndMs,
}: ExportReportDialogProps) {
    const [startDate, setStartDate] = useState(() => format(defaultStartMs, 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(() => format(defaultEndMs, 'yyyy-MM-dd'));
    const [exporting, setExporting] = useState(false);

    // Sinkronkan input dengan periode aktif setiap kali dialog dibuka, atau saat
    // periode aktif berubah.
    useEffect(() => {
        if (open) {
            setStartDate(format(defaultStartMs, 'yyyy-MM-dd'));
            setEndDate(format(defaultEndMs, 'yyyy-MM-dd'));
        }
    }, [open, defaultStartMs, defaultEndMs]);

    const invalidRange = !startDate || !endDate || startDate > endDate;

    const handleExport = async () => {
        if (invalidRange) {
            toast.error('Rentang tanggal tidak valid!');
            return;
        }
        setExporting(true);
        try {
            const result = await exportReportToExcel(
                new Date(`${startDate}T00:00:00`),
                new Date(`${endDate}T00:00:00`),
            );
            if (result.txCount === 0 && result.expenseCount === 0) {
                toast.info('Tidak ada data transaksi atau pengeluaran pada rentang tanggal tersebut.');
            } else {
                toast.success(
                    `Berhasil mengekspor laporan (${result.txCount} transaksi).`
                );
            }
            onOpenChange(false);
        } catch (err) {
            console.error('Export laporan gagal:', err);
            toast.error('Gagal mengekspor laporan.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !exporting && onOpenChange(o)}>
            <DialogContent className="max-w-[95vw] sm:max-w-md rounded-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Ekspor Laporan
                    </DialogTitle>
                    <DialogDescription>Pilih rentang tanggal untuk mengunduh laporan dalam format Excel (.xlsx).</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="export-start" className="text-xs">
                                Dari Tanggal
                            </Label>
                            <Input
                                id="export-start"
                                type="date"
                                value={startDate}
                                max={endDate || undefined}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="export-end" className="text-xs">
                                Sampai Tanggal
                            </Label>
                            <Input
                                id="export-end"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-11"
                            />
                        </div>
                    </div>

                    {invalidRange && startDate && endDate && (
                        <p className="text-xs text-destructive">
                            Tanggal mulai tidak boleh melebihi tanggal selesai
                        </p>
                    )}

                    <Button
                        className="w-full h-12 text-base font-semibold gap-2"
                        onClick={handleExport}
                        disabled={exporting || invalidRange}
                    >
                        {exporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Membuat Laporan...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" /> Ekspor ke Excel
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}