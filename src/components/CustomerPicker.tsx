import { useState, useRef, useEffect } from 'react';
import { User, Check, Plus } from 'lucide-react';
import { type Customer } from '@/services/customer.service';
import { useCreateCustomer } from '@/hooks/use-customers';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CustomerPickerProps {
  customers: Customer[];
  value: string;          // customerName (snapshot/free text)
  customerId?: number;    // selected master id, if any
  onChange: (name: string, id?: number) => void;
  className?: string;
}

// Pelanggan picker: ketik untuk cari, pilih dari daftar, atau buat baru cepat.
// Mengetik nama bebas tanpa memilih tetap valid (id = undefined).
export default function CustomerPicker({ customers, value, customerId, onChange, className }: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const createCustomer = useCreateCustomer();

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const query = value.trim().toLowerCase();
  const matches = query
    ? customers.filter(c =>
      c.name.toLowerCase().includes(query) || (c.phone ?? '').includes(value.trim()),
    )
    : customers;

  const exactMatch = customers.some(c => c.name.trim().toLowerCase() === query);
  const canQuickCreate = query.length > 0 && !exactMatch;

  const selectCustomer = (c: Customer) => {
    onChange(c.name, c.id);
    setOpen(false);
  };

  const handleInput = (text: string) => {
    // Free typing detaches any selected master id
    onChange(text, undefined);
    setOpen(true);
  };

  const quickCreate = async () => {
    const name = value.trim();
    if (!name || createCustomer.isPending) return;
    try {
      const newCustomer = await createCustomer.mutateAsync({ name });
      onChange(newCustomer.name, newCustomer.id);
      setOpen(false);
    } catch {
      // error toast sudah ditangani di useCreateCustomer
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
      <Input
        placeholder="Nama pelanggan"
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        className={cn('pl-8 text-sm', customerId != null && 'pr-7')}
      />
      {customerId != null && (
        <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-success z-10" />
      )}

      {open && (matches.length > 0 || canQuickCreate) && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {matches.slice(0, 8).map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCustomer(c)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                {c.phone && <p className="text-[10px] text-muted-foreground truncate">{c.phone}</p>}
              </div>
              {customerId === c.id && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
            </button>
          ))}
          {canQuickCreate && (
            <button
              type="button"
              onClick={quickCreate}
              disabled={createCustomer.isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-primary hover:bg-primary/5 transition-colors border-t border-border disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="text-sm font-medium truncate">
                {createCustomer.isPending ? 'Menambahkan...' : `Tambah pelanggan "${value.trim()}"`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}