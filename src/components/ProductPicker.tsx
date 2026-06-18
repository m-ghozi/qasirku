import { useState } from 'react';
import { Search, ScanBarcode, Check, X, Package as PackageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Product } from '@/services/product.service'; // Diperbarui ke API
import BarcodeScanner from '@/components/BarcodeScanner';

interface ProductPickerProps {
    products: Product[];
    value: string; // selected product id as string
    onChange: (id: string) => void;
    /** Optional extra filter, e.g. only products with stock > 0 */
    filter?: (p: Product) => boolean;
    placeholder?: string;
    showHpp?: boolean;
}

export default function ProductPicker({
    products,
    value,
    onChange,
    filter,
    placeholder = 'Cari nama, SKU, atau barcode...',
    showHpp = false,
}: ProductPickerProps) {
    const [query, setQuery] = useState('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const available = filter ? products.filter(filter) : products;
    const selected = products.find(p => p.id === Number(value));

    const q = query.trim().toLowerCase();
    const matches = q
        ? available.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q)
        )
        : available;

    const handleScan = (code: string) => {
        setScannerOpen(false);
        setIsOpen(false);
        const product = available.find(p => p.sku === code || p.barcode === code);
        if (product) {
            onChange(product.id.toString());
            setQuery('');
        } else {
            toast.error(`Produk dengan SKU/Barcode "${code}" tidak ditemukan`);
        }
    };

    if (selected) {
        return (
            <div className="flex items-center justify-between gap-2 rounded-xl border bg-primary/5 border-primary/30 p-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">
                        {selected.sku}
                        {selected.barcode ? ` · ${selected.barcode}` : ''} · stok: {selected.stock} {selected.unit}
                    </p>
                    {showHpp && (
                        <p className="text-xs text-muted-foreground">
                            HPP terakhir: Rp {(Number(selected.hpp)).toLocaleString('id-ID')}
                        </p>
                    )}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => { onChange(''); setQuery(''); }}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        autoFocus
                        placeholder={placeholder}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                        className="h-11 pl-9"
                    />
                </div>
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => setScannerOpen(true)}>
                    <ScanBarcode className="w-5 h-5" />
                </Button>
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border bg-popover shadow-lg divide-y">
                    {matches.length === 0 ? (
                        <div className="text-center py-8">
                            <PackageIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">Produk tidak ditemukan</p>
                        </div>
                    ) : (
                        matches.map(p => (
                            <button
                                type="button"
                                key={p.id}
                                onClick={() => { onChange(p.id.toString()); setQuery(''); setIsOpen(false); }}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/60 active:bg-muted"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{p.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {p.sku}{p.barcode ? ` · ${p.barcode}` : ''}
                                    </p>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">stok: {p.stock}</span>
                            </button>
                        ))
                    )}
                </div>
            )}

            <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
        </div>
    );
}