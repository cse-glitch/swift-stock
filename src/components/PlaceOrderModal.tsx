import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, Business } from '@/lib/db';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Package, Minus, Plus, Store, Search, Check, ChevronDown, ChevronRight, ChevronLeft, MapPin, User, Info, Phone, Mail } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import OrderConfirmationLoader from './OrderConfirmationLoader';

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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Product, 2: Customer, 3: Summary
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [isConfirming, setIsConfirming] = useState(false);

  const businesses = useLiveQuery(() => db.businesses.toArray(), []) ?? [];
  const activeBusinesses = useMemo(() => businesses.filter(b => b.isActive), [businesses]);

  const products = useLiveQuery(
    () => selectedBusinessId
      ? db.products.where('businessId').equals(selectedBusinessId).toArray()
      : [],
    [selectedBusinessId]
  ) ?? [];

  const selectedBusiness = useMemo(() => activeBusinesses.find(b => b.id === selectedBusinessId), [activeBusinesses, selectedBusinessId]);
  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  const unitPrice = customPrice !== '' ? parseFloat(customPrice) || 0 : (selectedProduct?.basePrice ?? 0);
  const subtotal = unitPrice * quantity;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + DELIVERY_FEE + tax;

  useEffect(() => { setSelectedProductId(null); setQuantity(1); }, [selectedBusinessId]);

  const reset = () => {
    setSelectedBusinessId(null);
    setSelectedProductId(null);
    setQuantity(1);
    setCustomPrice('');
    setForm(EMPTY_FORM);
    setStep(1);
  };

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));

  const handleConfirm = async () => {
    if (!selectedProduct) return toast.error('Please select a product.');
    if (!form.customerName || !form.phone) return toast.error('Customer name and phone are required.');
    try {
      await db.orders.add({
        businessId: selectedProduct.businessId,
        productId: selectedProduct.id!,
        customerName: form.customerName,
        customerNumber: form.phone,
        price: parseFloat(total.toFixed(2)),
        location: [form.address, form.city, form.postalCode].filter(Boolean).join(', '),
        status: 'pending',
        timestamp: new Date(),
        note: [form.notes, form.email ? `Email: ${form.email}` : ''].filter(Boolean).join(' | ') || undefined,
      });
      toast.success(`Order placed for ${form.customerName}!`);
      setIsConfirming(true);
      setOpen(false);
    } catch (err) {
      toast.error('Failed to place order.');
      console.error(err);
    }
  };

  const BizIcon = selectedBusiness ? ((LucideIcons as any)[selectedBusiness.icon] || Store) : Store;

  const renderProductSelection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          setCustomPrice(p.basePrice.toString());
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

      {/* Product Details Card */}
      {selectedProduct ? (
        <div className={cn(
          "flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-xl bg-muted/20 transition-all duration-300",
          "hover:bg-muted/30"
        )}>
          <div className="flex items-center gap-4 w-full">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Package className="h-7 w-7 text-primary/60" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">{selectedProduct.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedProduct.description || selectedProduct.sku}</p>
              <div className="mt-2 flex items-center sm:hidden">
                <span className="text-sm font-bold text-muted-foreground mr-1">৳</span>
                <Input 
                  type="number" 
                  value={customPrice} 
                  onChange={(e) => setCustomPrice(e.target.value)} 
                  className="w-20 h-7 text-sm font-bold px-2 py-0"
                />
              </div>
            </div>
            <div className="hidden sm:flex items-center shrink-0">
              <span className="text-sm font-bold text-muted-foreground mr-1">৳</span>
              <Input 
                type="number" 
                value={customPrice} 
                onChange={(e) => setCustomPrice(e.target.value)} 
                className="w-24 h-9 text-base font-bold px-2 py-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
            {/* Qty Control */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Quantity</span>
              <div className="flex items-center border rounded-lg overflow-hidden bg-background shadow-sm h-9">
                <button
                  className="h-full w-9 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold select-none">{quantity}</span>
                <button
                  className="h-full w-9 flex items-center justify-center hover:bg-muted transition-colors"
                  onClick={() => setQuantity(q => q + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Subtotal</p>
              <p className="text-base font-black text-primary italic">৳{subtotal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-32 flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/5 text-sm text-muted-foreground gap-2 animate-pulse">
          <Info className="h-5 w-5 opacity-40" />
          <span>Select a product to continue</span>
        </div>
      )}
    </div>
  );

  const renderCustomerInfo = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="customerName" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Customer Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input id="customerName" placeholder="Full Name" value={form.customerName} onChange={handleField} className="h-11 pl-9 border-muted-foreground/20 focus:ring-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="phone" placeholder="017XXXXXXXX" value={form.phone} onChange={handleField} className="h-11 pl-9 border-muted-foreground/20" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="john@example.com" value={form.email} onChange={handleField} className="h-11 pl-9 border-muted-foreground/20" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Shipping Address <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input id="address" placeholder="Street Address, Area" value={form.address} onChange={handleField} className="h-11 pl-9 border-muted-foreground/20" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">City</Label>
            <Input id="city" placeholder="e.g. Dhaka" value={form.city} onChange={handleField} className="h-11 border-muted-foreground/20" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Postal Code</Label>
            <Input id="postalCode" placeholder="1234" value={form.postalCode} onChange={handleField} className="h-11 border-muted-foreground/20" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Order Notes</Label>
          <Textarea id="notes" placeholder="Special delivery instructions..." value={form.notes} onChange={handleField} className="min-h-[90px] resize-none border-muted-foreground/20" />
        </div>
      </div>
    </div>
  );

  const renderOrderSummary = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Digital Receipt Card */}
      <div className="relative">
        {/* Receipt Header Decorations */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-1 w-8 bg-primary/20 rounded-full" />
          ))}
        </div>

        <div className="rounded-3xl border bg-card shadow-xl shadow-primary/5 overflow-hidden border-primary/10">
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">Receipt Summary</p>
                <h4 className="text-xl font-black tracking-tight flex items-center gap-2">
                  Order Details <Check className="h-5 w-5 text-green-500" />
                </h4>
              </div>
              <div className="bg-background px-3 py-1.5 rounded-2xl border border-primary/20 shadow-sm flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Ready</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-2xl border border-primary/5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BizIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-none">{selectedBusiness?.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">{selectedBusiness?.type}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight">{selectedProduct?.name}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      ৳{unitPrice.toLocaleString()} × {quantity}
                    </p>
                  </div>
                </div>
                <span className="font-black text-sm tabular-nums">৳{subtotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="py-2">
              <div className="border-t-2 border-dashed border-muted/50 relative">
                <div className="absolute -left-8 -top-2 h-4 w-4 rounded-full bg-background border-r border-muted" />
                <div className="absolute -right-8 -top-2 h-4 w-4 rounded-full bg-background border-l border-muted" />
              </div>
            </div>

            {/* Fees */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
                <span>Delivery Fee</span>
                <span className="tabular-nums">৳{DELIVERY_FEE}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
                <span>Tax (5%)</span>
                <span className="tabular-nums">৳{tax.toFixed(2)}</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="mt-6 pt-6 border-t border-primary/10 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Grand Total</p>
                <p className="text-3xl font-black text-primary leading-none tracking-tighter tabular-nums">
                  ৳{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-3 group-hover:rotate-0 transition-transform">
                <ShoppingCart className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="rounded-3xl border bg-muted/30 p-6 relative overflow-hidden group hover:bg-muted/40 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <User className="h-16 w-16" />
        </div>

        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
          <MapPin className="h-3 w-3" /> Delivery Information
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Customer</p>
              <p className="text-sm font-bold">{form.customerName}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                <div className="h-6 w-6 rounded-full bg-background border flex items-center justify-center">
                  <Phone className="h-3 w-3" />
                </div>
                {form.phone}
              </p>
              {form.email && (
                <p className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                  <div className="h-6 w-6 rounded-full bg-background border flex items-center justify-center">
                    <Mail className="h-3 w-3" />
                  </div>
                  {form.email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Address</p>
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-background border flex items-center justify-center shrink-0">
                  <MapPin className="h-3 w-3" />
                </div>
                <p className="text-xs font-bold leading-relaxed pt-0.5">
                  {[form.address, form.city, form.postalCode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {form.notes && (
              <div className="space-y-1">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Order Notes</p>
                <p className="text-xs italic text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/20">
                  "{form.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-4 relative">
      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-muted -translate-y-1/2 z-0" />
      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-500 origin-left"
        style={{ transform: `scaleX(${(step - 1) / 2})`, transformOrigin: 'left' }} />

      {[1, 2, 3].map((s) => (
        <div key={s} className="relative z-10 flex flex-col items-center gap-1.5">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300 shadow-sm",
            step === s ? "bg-primary text-primary-foreground border-primary scale-110" :
              step > s ? "bg-primary text-primary-foreground border-primary" :
                "bg-background text-muted-foreground border-muted"
          )}>
            {step > s ? <Check className="h-4 w-4" /> : s}
          </div>
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest",
            step === s ? "text-primary" : "text-muted-foreground"
          )}>
            {s === 1 ? 'Product' : s === 2 ? 'Customer' : 'Review'}
          </span>
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (!isMobile) {
      return (
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            {trigger || (
              <Button variant="outline" size="sm" className="gap-2 font-bold hover:bg-primary/5 hover:text-primary transition-all duration-300 active:scale-95 shadow-sm">
                <ShoppingCart className="h-4 w-4" /> Place Order
              </Button>
            )}
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar p-0 gap-0 border-none rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-5 h-full">
              {/* Sidebar / Progress */}
              <div className="col-span-2 bg-muted/30 border-r p-8 space-y-8 flex flex-col">
                <div className="space-y-2">
                  <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                    <ShoppingCart className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mt-4">Place Order</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">Fill in the details to generate a new inventory transaction and order record.</p>
                </div>

                <div className="space-y-6 flex-1 py-4">
                  <div className={cn("flex items-center gap-4 group cursor-pointer transition-all", step === 1 ? "opacity-100" : "opacity-50 hover:opacity-75")} onClick={() => setStep(1)}>
                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs transition-all", step === 1 ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground")}>1</div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black uppercase tracking-widest">Selection</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Business & Product</p>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-4 group cursor-pointer transition-all", step === 2 ? "opacity-100" : "opacity-50 hover:opacity-75")} onClick={() => { if (selectedProduct) setStep(2); }}>
                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs transition-all", step === 2 ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground")}>2</div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black uppercase tracking-widest">Customer</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Details & Shipping</p>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-4 group cursor-pointer transition-all", step === 3 ? "opacity-100" : "opacity-50 hover:opacity-75")} onClick={() => { if (selectedProduct && form.customerName && form.phone) setStep(3); }}>
                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs transition-all", step === 3 ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground")}>3</div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black uppercase tracking-widest">Finalize</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Review & Confirm</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-muted-foreground/10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total to Pay</span>
                    <span className="text-2xl font-black text-primary">৳{total.toLocaleString()}</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(total / 10000) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-3 flex flex-col h-full bg-background">
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                  {step === 1 && renderProductSelection()}
                  {step === 2 && renderCustomerInfo()}
                  {step === 3 && renderOrderSummary()}
                </div>

                <div className="p-6 border-t bg-muted/10 flex justify-between items-center gap-4">
                  <Button variant="ghost" className="font-bold text-xs uppercase tracking-widest" onClick={() => { if (step > 1) setStep(s => s - 1); else setOpen(false); }}>
                    {step === 1 ? 'Cancel' : 'Go Back'}
                  </Button>

                  {step < 3 ? (
                    <Button
                      className="font-black text-xs uppercase tracking-widest px-8 h-11 rounded-xl shadow-lg shadow-primary/20 transition-all hover:translate-y-[-2px] active:translate-y-0"
                      disabled={step === 1 ? !selectedProduct : (!form.customerName || !form.phone)}
                      onClick={() => setStep(s => s + 1)}
                    >
                      Continue <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleConfirm}
                      className="font-black text-xs uppercase tracking-widest px-8 h-11 rounded-xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Place Order <Check className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Drawer open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
        <DrawerTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2 font-bold active:scale-95 transition-all">
              <ShoppingCart className="h-4 w-4" /> Order
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent className="max-h-[96vh] rounded-t-[2.5rem]">
          <DrawerHeader className="pb-0 pt-6">
            <DrawerTitle className="text-xl font-black text-center tracking-tight">Create New Order</DrawerTitle>
            <DrawerDescription className="text-center text-xs font-medium">Quickly place an order from your phone</DrawerDescription>
          </DrawerHeader>

          <div className="p-6 overflow-y-auto custom-scrollbar">
            <StepIndicator />

            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              {step === 1 && renderProductSelection()}
              {step === 2 && renderCustomerInfo()}
              {step === 3 && renderOrderSummary()}
            </div>
          </div>

          <DrawerFooter className="flex-row gap-3 pt-2 pb-8 px-6 bg-background border-t">
            {step > 1 && (
              <Button variant="secondary" className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}

            {step < 3 ? (
              <Button
                className="flex-[2] h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
                disabled={step === 1 ? !selectedProduct : (!form.customerName || !form.phone || !form.address)}
                onClick={() => setStep(s => s + 1)}
              >
                Next Step <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="flex-[2] h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30"
                onClick={handleConfirm}
              >
                Confirm Order <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  };

  return (
    <>
      {renderContent()}
      {isConfirming && (
        <OrderConfirmationLoader
          onClose={() => {
            setIsConfirming(false);
            setOpen(false);
            reset();
          }}
        />
      )}
    </>
  );
};
