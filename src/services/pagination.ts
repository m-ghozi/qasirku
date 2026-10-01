// Bentuk meta yang dikirim backend bersama `data` pada endpoint ber-paginasi.
// Backend sengaja membiarkan `data` sebagai array biasa (bukan { items, meta })
// supaya pemanggil lama tidak rusak — meta datang sebagai field sebelahnya.

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  /** 0 saat total 0, supaya "kosong" bisa dibedakan dari "satu halaman". */
  totalPages: number;
}

/** Satu halaman hasil: baris + meta. Dipakai semua service/hook ber-paginasi. */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;
