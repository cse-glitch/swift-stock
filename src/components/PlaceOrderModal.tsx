import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, Business } from '@/lib/db';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Package, Minus, Plus, Store, Search, Check, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface PlaceOrderModalProps {
  trigger?: React.ReactNode;
}

const TAX_RATE = 0.05;
const DELIVERY_FEE = 0;

const EMPTY_FORM = {
  customerName: '', phone: '', email: '',
  address: '', city: '', postalCode: '', notes: '',
};

export const PlaceOrderModal: React.FC<PlaceOrderModalProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);

  const businesses = useLiveQuery(() => db.businesses.toArray(), []) ?? [];
  const activeBusinesses = useMemo(() => businesses.filter(b => b.isActive), [businesses]);
  
  const products = useLiveQuery(
    () => selectedBusinessId
      ? db.products.where('businessId').equals(selectedBusinessId).toArray()
      : [],
    [selectedBusinessId]
  ) ?? [];

  const selectedBusiness = useMemo(() => activeBusinesses.find(b => b.id === selectedBusinessId), [activeBusinesses, selectedBusinessId]);
  const selectedProduct  = useMemo(() => products.find(p => p.id === selectedProductId),   [products,   selectedProductId]);

  const unitPrice = selectedProduct?.basePrice ?? 0;
  const subtotal  = unitPrice * quantity;
  const tax       = subtotal * TAX_RATE;
  const total     = subtotal + DELIVERY_FEE + tax;

  useEffect(() => { setSelectedProductId(null); setQuantity(1); }, [selectedBusinessId]);

  const reset = () => {
    setSelectedBusinessId(null);
    setSelectedProductId(null);
    setQuantity(1);
    setForm(EMPTY_FORM);
  };

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));

  const handleConfirm = async () => {
    if (!selectedProduct)           return toast.error('Please select a product.');
    if (!form.customerName || !form.phone) return toast.error('Customer name and phone are required.');
    try {
      await db.orders.add({
        businessId:     selectedProduct.businessId,
        productId:      selectedProduct.id!,
        customerName:   form.customerName,
        customerNumber: form.phone,
        price:          parseFloat(total.toFixed(2)),
        location:       [form.address, form.city, form.postalCode].filter(Boolean).join(', '),
        status:         'pending',
        timestamp:      new Date(),
        note: [form.notes, form.email ? `Email: ${form.email}` : ''].filter(Boolean).join(' | ') || undefined,
      });
      toast.success(`Order placed for ${form.customerName}!`);
      setOpen(false);
      reset();
    } catch (err) {
      toast.error('Failed to place order.');
      console.error(err);
    }
  };

  const BizIcon = selectedBusiness ? ((LucideIcons as any)[selectedBusiness.icon] || Store) : Store;

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Place Order
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto custom-scrollbar p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b">
          <DialogTitle className="text-xl font-bold">Place Order</DialogTitle>
          <DialogDescription className="text-sm">Fill in the details below to place a new order.</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 space-y-8">

          {/* ── Section 1: Business & Product ── */}
          <section>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">1</span>
              Business &amp; Product Selection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Business */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Select Business</Label>
                <Select value={selectedBusinessId?.toString() || ""} onValueChange={v => setSelectedBusinessId(Number(v))}>
                  <SelectTrigger className="h-12 border-muted-foreground/20 bg-background/50 focus:ring-primary transition-all">
                    {selectedBusiness ? (
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded shrink-0" style={{ backgroundColor: `hsl(${selectedBusiness.color} / 0.15)`, color: `hsl(${selectedBusiness.color})` }}>
                          <BizIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium leading-none">{selectedBusiness.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{selectedBusiness.type}</p>
                        </div>
                      </div>
                    ) : <SelectValue placeholder="Choose a business..." />}
                  </SelectTrigger>
                  <SelectContent>
                    {activeBusinesses.map(b => {
                      const Icon = (LucideIcons as any)[b.icon] || Store;
                      return (
                        <SelectItem key={b.id} value={b.id!.toString()}>
                          <div className="flex items-center gap-2 py-0.5">
                            <div className="p-1 rounded shrink-0" style={{ backgroundColor: `hsl(${b.color} / 0.15)`, color: `hsl(${b.color})` }}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{b.name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{b.type}</p>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Product */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Select Product</Label>
                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={productSearchOpen}
                      disabled={!selectedBusinessId}
                      className="w-full justify-between h-12 border-muted-foreground/20 bg-background/50 font-normal px-3"
                    >
                      {selectedProduct ? (
                        <span className="truncate">{selectedProduct.name}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {!selectedBusinessId ? 'Select business first...' : products.length === 0 ? 'No products found' : 'Search product...'}
                        </span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command className="w-full">
                      <CommandInput placeholder="Type product name or SKU..." />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup heading="Available Products">
                          {products.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.name} ${p.sku}`}
                              onSelect={() => {
                                setSelectedProductId(p.id!);
                                setQuantity(1);
                                setProductSearchOpen(false);
                              }}
                              className="flex items-center justify-between p-2 cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{p.name}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>
                              </div>
                              {selectedProductId === p.id && <Check className="h-4 w-4 text-primary" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Product Card */}
            {selectedProduct ? (
              <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/20">
                <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-7 w-7 text-primary/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedProduct.description || selectedProduct.sku}</p>
                </div>
                <div className="text-sm font-bold text-primary shrink-0">৳{unitPrice.toLocaleString()}</div>
                {/* Qty */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-background">
                    <button className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold select-none">{quantity}</span>
                    <button className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors" onClick={() => setQuantity(q => q + 1)}>
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">Subtotal</p>
                  <p className="text-sm font-bold text-primary">৳{subtotal.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                Select a product above to see details
              </div>
            )}
          </section>

          {/* ── Section 2: Customer Info + Summary ── */}
          <section>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">2</span>
              Customer Information
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form */}
              <div className="lg:col-span-3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="customerName" className="text-xs font-medium">Customer Name <span className="text-destructive">*</span></Label>
                    <Input id="customerName" placeholder="John Doe" value={form.customerName} onChange={handleField} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-medium">Phone Number <span className="text-destructive">*</span></Label>
                    <Input id="phone" placeholder="01700000000" value={form.phone} onChange={handleField} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                    <Input id="email" type="email" placeholder="john@example.com" value={form.email} onChange={handleField} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-medium">Address <span className="text-destructive">*</span></Label>
                    <Input id="address" placeholder="123 Main Street..." value={form.address} onChange={handleField} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-medium">City <span className="text-destructive">*</span></Label>
                    <Input id="city" placeholder="Dhaka" value={form.city} onChange={handleField} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postalCode" className="text-xs font-medium">Postal Code</Label>
                    <Input id="postalCode" placeholder="1000" value={form.postalCode} onChange={handleField} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-medium">Order Notes (Optional)</Label>
                  <Textarea id="notes" placeholder="Add any special instructions..." value={form.notes} onChange={handleField} className="min-h-[80px] resize-none" />
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3 sticky top-0">
                  <p className="text-sm font-bold">Order Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business</span>
                      <span className="font-medium truncate max-w-[120px] text-right">{selectedBusiness?.name ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product</span>
                      <span className="font-medium truncate max-w-[120px] text-right">{selectedProduct?.name ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit Price</span>
                      <span className="font-medium">৳{unitPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>৳{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery Fee</span>
                      <span>৳{DELIVERY_FEE}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax (5%)</span>
                      <span>৳{tax.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-bold text-sm">Total</span>
                    <span className="font-bold text-base text-primary">৳{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProduct || !form.customerName || !form.phone}
            className="gap-2 px-8"
          >
            <ShoppingCart className="h-4 w-4" />
            Confirm Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
