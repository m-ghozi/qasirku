import { useState, useRef, useEffect } from 'react';
import {
  Search, Plus, Minus, ShoppingCart, X, Tag, CreditCard,
  Check, ScanBarcode, Package as PackageIcon, ClipboardList,
  Save, Pencil, Hash, Trash2, Barcode, Users as UsersIcon,
} from 'lucide-react';
import Receipt from '@/components/Receipt';
import BarcodeScanner from '@/components/BarcodeScanner';
import CustomerPicker from '@/components/CustomerPicker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import LockedPage from '@/components/LockedPage';

// ── API Hooks ────────────────────────────────────────────────────────────────
import { useProducts } from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { useCustomers } from '@/hooks/use-customers';
import {
  useOpenBills,
  useCreateTransaction,
  usePayHold,
  useCancelTransaction,
} from '@/hooks/use-transactions';

import type { Product } from '@/services/product.service';
import type { Transaction, TransactionItem } from '@/services/transaction.service';

import { useStoreSetting } from '@/hooks/use-store-setting';
// ─────────────────────────────────────────────────────────────────────────────

interface CartItem {
  product: Product;
  qty: number;
  discountType: 'percentage' | 'nominal' | null;
  discountValue: number;
  notes?: string;
}

export default function Kasir() {
  const { can } = useAuth();

  // ── UI State ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Transaction-level discount
  const [txDiscountType, setTxDiscountType] = useState<'percentage' | 'nominal' | null>(null);
  const [txDiscountValue, setTxDiscountValue] = useState('');
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'nominal'>('nominal');
  const [tempDiscountValue, setTempDiscountValue] = useState('');

  // Item-level discount
  const [itemDiscountTargetId, setItemDiscountTargetId] = useState<number | null>(null);
  const [itemDiscountType, setItemDiscountType] = useState<'percentage' | 'nominal'>('nominal');
  const [itemDiscountValue, setItemDiscountValue] = useState('');

  // Payment
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Receipt
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [lastTxItems, setLastTxItems] = useState<TransactionItem[]>([]);

  // Customer / table info
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [tableNumber, setTableNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Misc
  const [scannerOpen, setScannerOpen] = useState(false);
  const [openBillsOpen, setOpenBillsOpen] = useState(false);
  const [editingItemNotes, setEditingItemNotes] = useState<number | null>(null);
  const [tempItemNotes, setTempItemNotes] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetTx, setCancelTargetTx] = useState<Transaction | null>(null);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: customers = [] } = useCustomers();
  const { data: openBills = [] } = useOpenBills();
  const { data: storeSettings } = useStoreSetting();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createTransaction = useCreateTransaction();
  const payHold = usePayHold();
  const cancelTransaction = useCancelTransaction();

  const isMutating =
    createTransaction.isPending || payHold.isPending || cancelTransaction.isPending;

  // ── Permission gate ────────────────────────────────────────────────────────
  const allowed = can('create_transaction');

  // ── Derived ───────────────────────────────────────────────────────────────
  const cartProductIds = new Set(cart.map(c => c.product.id));

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      filterCategory === 'all' || p.categoryId === Number(filterCategory);
    return matchSearch && matchCategory && (p.stock > 0 || cartProductIds.has(p.id));
  });

  // ── Reset ──────────────────────────────────────────────────────────────────
  const doFullReset = () => {
    setCart([]);
    setEditingTxId(null);
    setTxDiscountType(null);
    setTxDiscountValue('');
    setPaymentMethodId('');
    setPaymentAmount('');
    setCustomerName('');
    setCustomerId(undefined);
    setTableNumber('');
    setRemarks('');
    setIsQuickAdding(false);
  };

  // ── Cart Operations ────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          toast.error('Stok tidak cukup');
          return prev;
        }
        return prev.map(c =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { product, qty: 1, discountType: null, discountValue: 0 }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart(prev =>
      prev.map(c => {
        if (c.product.id !== productId) return c;
        const newQty = c.qty + delta;
        if (newQty <= 0) return c;
        if (newQty > c.product.stock) {
          toast.error('Stok tidak cukup');
          return c;
        }
        return { ...c, qty: newQty };
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const updateItemNotes = (productId: number, notes: string) => {
    setCart(prev =>
      prev.map(c =>
        c.product.id === productId
          ? { ...c, notes: notes.trim() || undefined }
          : c
      )
    );
  };

  // ── Item Discount ──────────────────────────────────────────────────────────
  const openItemDiscount = (item: CartItem) => {
    setItemDiscountTargetId(item.product.id);
    if (item.discountType) {
      setItemDiscountType(item.discountType);
      setItemDiscountValue(String(item.discountValue));
    } else {
      setItemDiscountType('nominal');
      setItemDiscountValue('');
    }
  };

  const saveItemDiscount = () => {
    if (itemDiscountTargetId == null) return;
    const raw = Number(itemDiscountValue) || 0;
    setCart(prev =>
      prev.map(c => {
        if (c.product.id !== itemDiscountTargetId) return c;
        if (raw <= 0) return { ...c, discountType: null, discountValue: 0 };
        const base = Number(c.product.price) * c.qty;
        const clamped =
          itemDiscountType === 'percentage'
            ? Math.min(100, raw)
            : Math.min(base, raw);
        return { ...c, discountType: itemDiscountType, discountValue: clamped };
      })
    );
    setItemDiscountTargetId(null);
  };

  const clearItemDiscount = () => {
    if (itemDiscountTargetId == null) return;
    setCart(prev =>
      prev.map(c =>
        c.product.id === itemDiscountTargetId
          ? { ...c, discountType: null, discountValue: 0 }
          : c
      )
    );
    setItemDiscountTargetId(null);
  };

  // ── Kalkulasi ──────────────────────────────────────────────────────────────
  const getItemDiscountAmount = (item: CartItem): number => {
    const base = Number(item.product.price) * item.qty;
    if (item.discountType === 'percentage')
      return (base * Math.min(100, Math.max(0, item.discountValue))) / 100;
    if (item.discountType === 'nominal')
      return Math.min(base, Math.max(0, item.discountValue));
    return 0;
  };

  const getItemSubtotal = (item: CartItem): number =>
    Math.max(0, Number(item.product.price) * item.qty - getItemDiscountAmount(item));

  const subtotal = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);

  const txDiscountAmount =
    txDiscountType === 'percentage'
      ? (subtotal * Math.min(100, Math.max(0, Number(txDiscountValue) || 0))) / 100
      : txDiscountType === 'nominal'
        ? Math.min(subtotal, Math.max(0, Number(txDiscountValue) || 0))
        : 0;

  const total = Math.max(0, subtotal - txDiscountAmount);
  const paidAmount = Number(paymentAmount) || 0;
  const change = paidAmount - total;

  // ── Payload builder ────────────────────────────────────────────────────────
  const buildItemsPayload = () =>
    cart.map(c => ({
      productId: c.product.id,
      quantity: c.qty,
      discountType: c.discountType,
      discountValue: c.discountValue,
      notes: c.notes,
    }));

  // ── Customer handler ───────────────────────────────────────────────────────
  const handleCustomerChange = (name: string, id?: number) => {
    setCustomerName(name);
    setCustomerId(id);
  };

  // ── Open Bill: Save ────────────────────────────────────────────────────────
  const saveOpenBill = () => {
    if (cart.length === 0) { toast.error('Keranjang kosong'); return; }

    const basePayload = {
      items: buildItemsPayload(),
      discountType: txDiscountType,
      discountValue: Number(txDiscountValue) || 0,
      status: 'open' as const,
      customerName: customerName.trim() || undefined,
      customerId: customerId,
      tableNumber: tableNumber.trim() || undefined,
      remarks: remarks.trim() || undefined,
    };

    if (editingTxId) {
      cancelTransaction.mutate(editingTxId, {
        onSuccess: () => {
          createTransaction.mutate(basePayload, {
            onSuccess: () => { doFullReset(); setCartOpen(false); },
          });
        },
      });
    } else {
      createTransaction.mutate(basePayload, {
        onSuccess: () => { doFullReset(); setCartOpen(false); },
      });
    }
  };

  // ── Open Bill: Load ────────────────────────────────────────────────────────
  const loadOpenBill = (tx: Transaction) => {
    if (!tx.id) return;
    const items = tx.items ?? [];
    if (items.length === 0) { toast.error('Data item bill tidak tersedia.'); return; }

    const cartItems: CartItem[] = [];
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) { toast.error(`Produk ID ${item.productId} tidak ditemukan`); return; }
      cartItems.push({
        product,
        qty: item.quantity,
        discountType: (item.discountType as 'percentage' | 'nominal' | null) ?? null,
        discountValue: item.discountValue ?? 0,
        notes: item.notes ?? undefined,
      });
    }

    setCart(cartItems);
    setEditingTxId(tx.id);
    setTxDiscountType((tx.discountType as 'percentage' | 'nominal' | null) ?? null);
    setTxDiscountValue(tx.discountType ? String(tx.discountValue) : '');
    setCustomerName(tx.customerName || '');
    setCustomerId(tx.customerId ?? undefined);
    setTableNumber(tx.tableNumber || '');
    setRemarks(tx.remarks || '');
    setOpenBillsOpen(false);
    setCartOpen(true);
  };

  // ── Open Bill: Cancel ──────────────────────────────────────────────────────
  const cancelOpenBill = (tx: Transaction) => {
    if (!tx.id) return;
    cancelTransaction.mutate(tx.id, {
      onSuccess: () => {
        toast.success(`Bill ${tx.receiptNumber} dibatalkan`);
        setCancelDialogOpen(false);
        setCancelTargetTx(null);
        if (editingTxId === tx.id) { doFullReset(); setCartOpen(false); }
      },
    });
  };

  const handleCancelFromCart = () => {
    const tx = openBills.find(b => b.id === editingTxId);
    if (tx) { setCancelTargetTx(tx); setCancelDialogOpen(true); }
  };

  const handleCancelFromList = (bill: Transaction) => {
    setCancelTargetTx(bill);
    setCancelDialogOpen(true);
  };

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (!paymentMethodId || paidAmount < total) return;

    if (editingTxId) {
      payHold.mutate(
        {
          id: editingTxId,
          payload: { paymentMethodId: Number(paymentMethodId), paymentAmount: paidAmount, change },
        },
        {
          onSuccess: tx => {
            setLastTransaction(tx);
            setLastTxItems(tx.items ?? []);
            setReceiptOpen(true);
            doFullReset();
            setCheckoutOpen(false);
            setCartOpen(false);
          },
        }
      );
    } else {
      createTransaction.mutate(
        {
          items: buildItemsPayload(),
          discountType: txDiscountType,
          discountValue: Number(txDiscountValue) || 0,
          paymentMethodId: Number(paymentMethodId),
          paymentAmount: paidAmount,
          change,
          status: 'completed',
          customerName: customerName.trim() || undefined,
          customerId: customerId,
          tableNumber: tableNumber.trim() || undefined,
          remarks: remarks.trim() || undefined,
        },
        {
          onSuccess: tx => {
            setLastTransaction(tx);
            setLastTxItems(tx.items ?? []);
            setReceiptOpen(true);
            doFullReset();
            setCheckoutOpen(false);
            setCartOpen(false);
          },
        }
      );
    }
  };

  // ── Barcode ────────────────────────────────────────────────────────────────
  const handleScan = (barcode: string) => {
    setScannerOpen(false);
    const product = products.find(p => p.sku === barcode || p.barcode === barcode);
    if (product) {
      if (product.stock <= 0) { toast.error(`Stok ${product.name} habis`); return; }
      addToCart(product);
      toast.success(`Ditambahkan: ${product.name}`);
    } else {
      toast.error(`Produk "${barcode}" tidak ditemukan`);
    }
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanInput.trim()) {
      const code = scanInput.trim();
      setScanInput('');
      const product = products.find(p => p.sku === code || p.barcode === code);
      if (product) {
        if (product.stock <= 0) { toast.error(`Stok ${product.name} habis`); return; }
        addToCart(product);
        toast.success(`Ditambahkan: ${product.name}`);
      } else {
        toast.error(`Produk "${code}" tidak ditemukan`);
      }
    }
  };

  useEffect(() => {
    if (scanInput === '' && scanInputRef.current) scanInputRef.current.focus();
  }, [scanInput]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const openBillsCount = openBills.length;

  // ── Customer input row (reused in cart panel & sheet) ─────────────
  const renderCustomerRow = () => (
    <div className="flex gap-2 w-full">
      <CustomerPicker
        customers={customers}
        value={customerName}
        customerId={customerId}
        onChange={handleCustomerChange}
        className="flex-1"
      />
    </div>
  );

  // ── Cart items ─────────────────────────────────────────────────────────────
  const renderCartItems = () =>
    cart.map(item => (
      <div key={item.product.id} className="bg-muted/50 p-3 rounded-xl space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{item.product.name}</p>
            <p className="text-xs text-muted-foreground">
              Rp {Number(item.product.price).toLocaleString('id-ID')} × {item.qty}
            </p>
            {item.discountType && getItemDiscountAmount(item) > 0 && (
              <p className="text-[10px] text-destructive">
                Diskon:{' '}
                {item.discountType === 'percentage'
                  ? `${item.discountValue}%`
                  : rp(item.discountValue)}{' '}
                (-{rp(getItemDiscountAmount(item))})
              </p>
            )}
            <p className="text-sm font-bold text-primary">{rp(getItemSubtotal(item))}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline" size="icon" className="h-8 w-8 rounded-full"
              onClick={() =>
                item.qty === 1 ? removeFromCart(item.product.id) : updateQty(item.product.id, -1)
              }
            >
              {item.qty === 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            </Button>
            <input
              key={item.qty}
              type="number"
              inputMode="numeric"
              defaultValue={item.qty}
              onBlur={e => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1) {
                  if (val > item.product.stock) {
                    toast.error(`Stok tidak cukup, maksimal ${item.product.stock}`);
                    e.target.value = String(item.product.stock);
                    setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, qty: item.product.stock } : c));
                  } else {
                    setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, qty: val } : c));
                  }
                } else {
                  e.target.value = String(item.qty);
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="w-12 h-8 text-center text-sm font-bold bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              variant="outline" size="icon" className="h-8 w-8 rounded-full"
              onClick={() => updateQty(item.product.id, 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {item.notes ? (
            <button
              className="flex items-center gap-1 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full"
              onClick={() => { setEditingItemNotes(item.product.id); setTempItemNotes(item.notes || ''); }}
            >
              <Pencil className="w-2.5 h-2.5" />{item.notes}
            </button>
          ) : (
            <button
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              onClick={() => { setEditingItemNotes(item.product.id); setTempItemNotes(''); }}
            >
              <Pencil className="w-2.5 h-2.5" />Tambah catatan
            </button>
          )}
          {item.discountType ? (
            <button
              className="flex items-center gap-1 text-[10px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"
              onClick={() => openItemDiscount(item)}
            >
              <Tag className="w-2.5 h-2.5" />Ubah diskon
            </button>
          ) : (
            <button
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              onClick={() => openItemDiscount(item)}
            >
              <Tag className="w-2.5 h-2.5" />Tambah diskon
            </button>
          )}
        </div>

        {editingItemNotes === item.product.id && (
          <div className="flex gap-2 items-center">
            <Input
              autoFocus value={tempItemNotes}
              onChange={e => setTempItemNotes(e.target.value)}
              placeholder="Contoh: less sugar..."
              className="h-8 text-xs"
              onKeyDown={e => {
                if (e.key === 'Enter') { updateItemNotes(item.product.id, tempItemNotes); setEditingItemNotes(null); }
                if (e.key === 'Escape') setEditingItemNotes(null);
              }}
            />
            <Button size="sm" className="h-8 text-xs" onClick={() => { updateItemNotes(item.product.id, tempItemNotes); setEditingItemNotes(null); }}>OK</Button>
          </div>
        )}
      </div>
    ));

  const renderCartSummary = (isMobile = false) => (
    <div className={cn('border-t pt-4 space-y-3', isMobile ? 'pb-6' : 'px-4 pb-4')}>
      {txDiscountAmount > 0 ? (
        <button
          onClick={() => { setTempDiscountType(txDiscountType!); setTempDiscountValue(txDiscountValue); setDiscountDialogOpen(true); }}
          className="flex items-center gap-1.5 text-xs text-destructive font-medium"
        >
          <Tag className="w-3.5 h-3.5" />
          Diskon: {txDiscountType === 'percentage' ? `${txDiscountValue}%` : `Rp ${Number(txDiscountValue).toLocaleString('id-ID')}`}
          <span className="text-[10px] underline ml-1">Ubah</span>
        </button>
      ) : (
        <button
          onClick={() => { setTempDiscountType('nominal'); setTempDiscountValue(''); setDiscountDialogOpen(true); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Tag className="w-3.5 h-3.5" /><span>Tambah Diskon</span>
        </button>
      )}

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{rp(subtotal)}</span>
      </div>
      {txDiscountAmount > 0 && (
        <div className="flex justify-between text-sm text-destructive">
          <span>Diskon</span><span>-{rp(txDiscountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between text-lg font-bold">
        <span>Total</span><span className="text-primary">{rp(total)}</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline" className="flex-1 h-12 text-sm font-semibold"
          onClick={saveOpenBill} disabled={cart.length === 0 || isMutating}
        >
          <Save className="w-4 h-4 mr-2" />
          {isMutating && !payHold.isPending ? 'Menyimpan...' : 'Simpan Bill'}
        </Button>
        <Button
          className="flex-1 h-12 text-sm font-semibold"
          disabled={cart.length === 0}
          onClick={() => {
            setCheckoutOpen(true);
            setPaymentMethodId(paymentMethods[0]?.id?.toString() ?? '');
            setPaymentAmount(total.toString());
            setIsQuickAdding(false);
          }}
        >
          <CreditCard className="w-4 h-4 mr-2" />Bayar
        </Button>
      </div>

      {editingTxId && can('delete_transaction') && (
        <Button
          variant="outline"
          className="w-full h-10 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={handleCancelFromCart} disabled={isMutating}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />Batalkan Bill Ini
        </Button>
      )}
    </div>
  );

  if (!allowed) return <LockedPage title="Kasir" permissionLabel="Buat Transaksi" />;

  return (
    <div className="px-4 pt-6 pb-4 h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row gap-0 md:gap-4 h-full">

        {/* Product Browser */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Kasir
              {editingTxId && <Badge variant="secondary" className="text-[10px] font-normal">Editing Bill</Badge>}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-xs"
              onClick={() => setOpenBillsOpen(true)}
            >
              <ClipboardList className="w-4 h-4" />
              Open Bill
              {openBillsCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                  {openBillsCount}
                </span>
              )}
            </Button>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setScannerOpen(true)}>
              <ScanBarcode className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={scanInputRef} placeholder="Scan / ketik SKU atau Barcode lalu Enter..."
                value={scanInput} onChange={e => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyDown} className="pl-9 h-10 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1 pr-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
            <button
              onClick={() => setFilterCategory('all')}
              className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors', filterCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
            >Semua</button>
            {categories.map((c: { id: number; name: string; icon: string }) => (
              <button key={c.id} onClick={() => setFilterCategory(c.id.toString())}
                className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors', filterCategory === c.id.toString() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
              >{c.icon} {c.name}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loadingProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="border-0 shadow-sm"><CardContent className="p-0">
                    <Skeleton className="w-full aspect-square rounded-t-lg" />
                    <div className="p-2.5 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                  </CardContent></Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  {products.length > 0 ? 'Semua produk stoknya habis.' : 'Belum ada produk.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {filtered.map(p => (
                  <Card key={p.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]" onClick={() => addToCart(p)}>
                    <CardContent className="p-0">
                      <div className="w-full aspect-square bg-muted rounded-t-lg overflow-hidden flex items-center justify-center">
                        {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : <PackageIcon className="w-8 h-8 text-muted-foreground/30" />}
                      </div>
                      <div className="p-2.5">
                        <h3 className="text-xs font-semibold truncate">{p.name}</h3>
                        <p className="text-sm font-bold text-primary mt-0.5">Rp {Number(p.price).toLocaleString('id-ID')}</p>
                        {p.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={p.description}>{p.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">Stok: {p.stock} {p.unit}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Cart Panel */}
        <div className="hidden md:flex md:w-80 lg:w-96 flex-col overflow-hidden bg-card rounded-xl border border-border shrink-0">
          <div className="p-4 border-b border-border shrink-0">
            <h3 className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Keranjang ({cartCount} item)
              {editingTxId && <span className="text-xs font-normal text-muted-foreground">— edit</span>}
            </h3>
          </div>
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">Keranjang kosong</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 p-4">{renderCartItems()}</div>
              <div className="px-4 mb-2">{renderCustomerRow()}</div>
              {renderCartSummary(false)}
            </div>
          )}
        </div>
      </div>

      {/* Cart FAB mobile */}
      {cartCount > 0 && (
        <button onClick={() => setCartOpen(true)} className="md:hidden fixed bottom-24 right-4 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-xl active:scale-95 transition-transform z-40">
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold text-sm">{cartCount} item</span>
          <span className="text-sm font-bold">• Rp {total.toLocaleString('id-ID')}</span>
        </button>
      )}

      {/* Cart Sheet mobile */}
      <div className="md:hidden">
        <Sheet open={cartOpen} onOpenChange={open => { setCartOpen(open); if (!open) setEditingItemNotes(null); }}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl max-w-lg mx-auto">
            <SheetHeader>
              <SheetTitle className="text-left">
                Keranjang ({cartCount} item)
                {editingTxId && <span className="text-xs font-normal text-muted-foreground ml-2">— edit open bill</span>}
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full mt-4">
              <div className="flex-1 overflow-y-auto space-y-3 pb-4">{renderCartItems()}</div>
              <div className="mb-2">{renderCustomerRow()}</div>
              {renderCartSummary(true)}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Open Bills Sheet */}
      <Sheet open={openBillsOpen} onOpenChange={setOpenBillsOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl max-w-lg md:max-w-xl mx-auto">
          <SheetHeader>
            <SheetTitle className="text-left flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />Open Bills ({openBillsCount})
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto pb-6 space-y-2">
            {openBills.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Tidak ada open bill</p>
              </div>
            ) : (
              openBills.map(bill => (
                <Card key={bill.id} className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{bill.receiptNumber}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {bill.date ? format(new Date(bill.date), 'dd/MM HH:mm', { locale: localeId }) : ''}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary">{rp(Number(bill.total))}</span>
                    </div>
                    <div className="flex gap-1.5 text-[10px] text-muted-foreground mb-2">
                      {bill.customerName && (
                        <span className="flex items-center gap-0.5">
                          <UsersIcon className="w-2.5 h-2.5" /> {bill.customerName}
                        </span>
                      )}
                      {bill.tableNumber && <span>🪑 Meja {bill.tableNumber}</span>}
                      {bill.remarks && <span className="truncate max-w-[120px]">📝 {bill.remarks}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs flex-1" onClick={() => loadOpenBill(bill)}>Lanjutkan</Button>
                      {can('delete_transaction') && (
                        <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30"
                          onClick={() => handleCancelFromList(bill)} disabled={cancelTransaction.isPending}>Batal</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex flex-col sm:flex-row gap-4">

            {/* Kolom kiri — total, metode, nominal */}
            <div className="flex-1 space-y-2 sm:space-y-3">
              <div className="text-center py-2 sm:py-3 bg-primary/5 rounded-xl">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Bayar</p>
                <p className="text-2xl sm:text-4xl font-bold text-primary">{rp(total)}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm sm:text-base font-semibold">Metode Pembayaran</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {paymentMethods?.map(pm => (
                    <button key={pm.id} onClick={() => setPaymentMethodId(pm.id!.toString())}
                      className={cn('p-2 sm:p-3 rounded-xl text-xs sm:text-sm font-semibold border-2 transition-colors',
                        paymentMethodId === pm.id!.toString()
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted bg-muted/50 text-muted-foreground'
                      )}
                    >{pm.name}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm sm:text-base font-semibold">Jumlah Bayar</p>
                <div className="h-10 sm:h-14 flex items-center justify-center rounded-md border border-input bg-background text-lg sm:text-2xl font-bold text-center px-3">
                  {paidAmount > 0 ? `Rp ${paidAmount.toLocaleString('id-ID')}` : 'Rp 0'}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[1000, 2000, 5000, 10000, 20000, 50000, 100000].map(nom => (
                    <button key={nom}
                      onClick={() => {
                        if (!isQuickAdding) { setPaymentAmount(String(nom)); setIsQuickAdding(true); }
                        else { setPaymentAmount(prev => String((Number(prev) || 0) + nom)); }
                      }}
                      className="h-8 sm:h-10 rounded-lg border border-border bg-muted/50 text-xs sm:text-sm font-semibold text-foreground hover:bg-primary/10 hover:border-primary hover:text-primary active:scale-95 transition-all"
                    >{nom >= 1000 ? `${nom / 1000}K` : nom}</button>
                  ))}
                  <button onClick={() => { setPaymentAmount(total.toString()); setIsQuickAdding(false); }}
                    className="h-8 sm:h-10 rounded-lg border border-primary/30 bg-primary/5 text-xs sm:text-sm font-semibold text-primary hover:bg-primary/10 active:scale-95 transition-all"
                  >Pas</button>
                </div>
                <button onClick={() => { setPaymentAmount('0'); setIsQuickAdding(false); }}
                  className="w-full text-xs sm:text-sm text-muted-foreground hover:text-destructive transition-colors py-0.5"
                >Reset</button>
              </div>
            </div>

            {/* Kolom kanan — pelanggan, kembalian, konfirmasi */}
            <div className="sm:w-72 flex flex-col gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <p className="text-sm sm:text-base font-semibold">Info Pelanggan</p>
                <CustomerPicker
                  customers={customers ?? []}
                  value={customerName}
                  customerId={customerId}
                  onChange={(name, id) => { setCustomerName(name); setCustomerId(id); }}
                  className="[&_input]:h-9 [&_input]:text-xs sm:[&_input]:h-11 sm:[&_input]:text-sm"
                />
                <Input
                  placeholder="Catatan tambahan (opsional)"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="h-9 sm:h-11 text-xs sm:text-sm"
                />
              </div>

              <div className="flex-1" />

              {paidAmount >= total && (
                <div className="flex justify-between items-center bg-success/10 px-3 py-2 sm:p-4 rounded-xl">
                  <span className="text-sm sm:text-base font-semibold">Kembalian</span>
                  <span className="text-lg sm:text-2xl font-bold text-success">
                    Rp {change.toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              <Button
                className="w-full h-11 sm:h-14 text-sm sm:text-base font-semibold"
                onClick={handleCheckout}
                disabled={!paymentMethodId || paidAmount < total}
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Konfirmasi Transaksi
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>Diskon Transaksi</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Jenis Diskon</p>
              <div className="grid grid-cols-2 gap-2">
                {(['nominal', 'percentage'] as const).map(type => (
                  <button key={type} onClick={() => setTempDiscountType(type)}
                    className={cn('p-3 rounded-xl text-sm font-semibold border-2 transition-colors',
                      tempDiscountType === type ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground'
                    )}
                  >{type === 'nominal' ? 'Nominal (Rp)' : 'Persen (%)'}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{tempDiscountType === 'percentage' ? 'Persentase Diskon' : 'Jumlah Diskon'}</p>
              <Input type="number" value={tempDiscountValue} onChange={e => setTempDiscountValue(e.target.value)}
                placeholder={tempDiscountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'}
                className="h-12 text-lg font-bold text-center"
              />
              {tempDiscountType === 'percentage' && Number(tempDiscountValue) > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  = Rp {((subtotal * Number(tempDiscountValue)) / 100).toLocaleString('id-ID')} dari Rp {subtotal.toLocaleString('id-ID')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {txDiscountType && (
                <Button variant="outline" className="h-11 text-destructive border-destructive/30"
                  onClick={() => { setTxDiscountType(null); setTxDiscountValue(''); setDiscountDialogOpen(false); }}
                >Hapus</Button>
              )}
              <Button className="flex-1 h-11 font-semibold" onClick={() => {
                if (Number(tempDiscountValue) > 0) { setTxDiscountType(tempDiscountType); setTxDiscountValue(tempDiscountValue); }
                else { setTxDiscountType(null); setTxDiscountValue(''); }
                setDiscountDialogOpen(false);
              }}>Simpan Diskon</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Discount Dialog */}
      <Dialog open={itemDiscountTargetId !== null} onOpenChange={open => { if (!open) setItemDiscountTargetId(null); }}>
        <DialogContent className="max-w-[95vw] rounded-xl">
          <DialogHeader><DialogTitle>Diskon Item</DialogTitle></DialogHeader>
          {(() => {
            const target = cart.find(c => c.product.id === itemDiscountTargetId);
            if (!target) return null;
            const base = Number(target.product.price) * target.qty;
            const rawValue = Number(itemDiscountValue) || 0;
            const previewAmount = itemDiscountType === 'percentage'
              ? (base * Math.min(100, Math.max(0, rawValue))) / 100
              : Math.min(base, Math.max(0, rawValue));
            const exceedsCap = itemDiscountType === 'percentage' ? rawValue > 100 : rawValue > base;
            return (
              <div className="space-y-4 mt-2">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Item</p>
                  <p className="text-sm font-semibold">{target.product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Rp {Number(target.product.price).toLocaleString('id-ID')} × {target.qty} = {rp(base)}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Jenis Diskon</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['nominal', 'percentage'] as const).map(type => (
                      <button key={type} onClick={() => setItemDiscountType(type)}
                        className={cn('p-3 rounded-xl text-sm font-semibold border-2 transition-colors',
                          itemDiscountType === type ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground'
                        )}
                      >{type === 'nominal' ? 'Nominal (Rp)' : 'Persen (%)'}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{itemDiscountType === 'percentage' ? 'Persentase Diskon' : 'Jumlah Diskon'}</p>
                  <Input type="number" inputMode="decimal" value={itemDiscountValue} onChange={e => setItemDiscountValue(e.target.value)}
                    placeholder={itemDiscountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'}
                    className="h-12 text-lg font-bold text-center" autoFocus
                  />
                  {rawValue > 0 && (
                    <p className={cn('text-xs text-center', exceedsCap ? 'text-destructive' : 'text-muted-foreground')}>
                      {exceedsCap
                        ? `Dibatasi otomatis ke ${itemDiscountType === 'percentage' ? '100%' : rp(base)}`
                        : `Diskon: -${rp(previewAmount)} → subtotal ${rp(Math.max(0, base - previewAmount))}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {target.discountType && (
                    <Button variant="outline" className="h-11 text-destructive border-destructive/30" onClick={clearItemDiscount}>Hapus</Button>
                  )}
                  <Button className="flex-1 h-11 font-semibold" onClick={saveItemDiscount}>Simpan Diskon</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {
        lastTransaction && (
          <Receipt
            open={receiptOpen}
            onClose={() => setReceiptOpen(false)}
            transaction={lastTransaction}
            items={lastTxItems}
            storeSettings={storeSettings}
            paymentMethodName={
              lastTransaction.paymentMethod?.name ??
              paymentMethods.find(pm => pm.id === lastTransaction.paymentMethodId)?.name ??
              '-'
            }
            cashierName={lastTransaction.createdBy?.name}
          />
        )
      }

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Bill?</AlertDialogTitle>
            <AlertDialogDescription>Bill ini akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelTargetTx(null)}>Tidak</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelTransaction.isPending}
              onClick={() => cancelTargetTx && cancelOpenBill(cancelTargetTx)}
            >{cancelTransaction.isPending ? 'Membatalkan...' : 'Batalkan Bill'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}