import type { MouseEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZES } from '@/services/pagination';

// Selalu tampilkan halaman pertama & terakhir, plus jendela di sekitar halaman
// aktif. Halaman yang tersembunyi diganti satu tanda elipsis per celah.
function pageWindow(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const shown = new Set([1, totalPages, current, current - 1, current + 1]);
  const sorted = [...shown].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const out: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('ellipsis');
    out.push(p);
    prev = p;
  }
  return out;
}

interface PaginatorProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  /** Kata benda untuk teks ringkasan, mis. "produk" → "Menampilkan 1–20 dari 57 produk". */
  itemLabel?: string;
}

/**
 * Pager bersama untuk daftar ber-paginasi (Produk, Stock In, Stock Out).
 *
 * Memakai komponen shadcn `ui/pagination`, tapi tombol prev/next dirender lewat
 * `PaginationLink` langsung — bukan `PaginationPrevious`/`Next` — karena keduanya
 * mengunci labelnya ke teks Inggris ("Previous"/"Next"). `PaginationLink` merender
 * <a>, jadi setiap handler wajib preventDefault agar tidak terjadi navigasi penuh.
 */
export default function Paginator({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  itemLabel = 'data',
}: PaginatorProps) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const go = (target: number) => (e: MouseEvent) => {
    e.preventDefault();
    if (target >= 1 && target <= totalPages && target !== page) onPageChange(target);
  };

  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Menampilkan {from}–{to} dari {total} {itemLabel}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Select value={String(limit)} onValueChange={v => onLimitChange(Number(v))}>
          <SelectTrigger className="h-8 w-[72px] text-xs" aria-label="Jumlah per halaman">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map(size => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={go(page - 1)}
                  aria-label="Halaman sebelumnya"
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                >
                  <ChevronLeft className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>

              {pageWindow(page, totalPages).map((entry, i) =>
                entry === 'ellipsis' ? (
                  <PaginationItem key={`gap-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={entry}>
                    <PaginationLink
                      href="#"
                      isActive={entry === page}
                      onClick={go(entry)}
                      aria-label={`Halaman ${entry}`}
                    >
                      {entry}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={go(page + 1)}
                  aria-label="Halaman berikutnya"
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                >
                  <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
