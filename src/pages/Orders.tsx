import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, Business, Order } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShoppingCart,
  Search,
  User,
  Phone,
  MapPin,
  Tag,
  Store,
  Package,
  Check,
  ChevronDown,
  History,
  PlusCircle,
  MoreVertical,
  ArrowUpDown,
  Filter,
  Minus,
  Plus,
  Mail,
  Info
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TAX_RATE = 0.05;
const DELIVERY_FEE = 0;

const OrdersPage = () => {
  const { activeBusinessId } = useBusiness();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'history');
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'history' || tab === 'new')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // ── New Order State ──
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    note: '',
  });

  const businesses = useLiveQuery(() => db.businesses.toArray()) ?? [];
  const products = useLiveQuery(() => 
    selectedBusinessId 
      ? db.products.where('businessId').equals(selectedBusinessId).toArray() 
      : db.products.toArray()
  , [selectedBusinessId]) ?? [];

  const selectedBusiness = useMemo(() => 
    businesses.find(b => b.id === selectedBusinessId), 
    [businesses, selectedBusinessId]
  );
  
  const selectedProduct = useMemo(() => 
    products.find(p => p.id === selectedProductId), 
    [products, selectedProductId]
  );

  // ── History Filter State ──
  const [historySearch, setHistorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all');
  const [businessFilter, setBusinessFilter] = useState<number | 'all'>('all');

  const orders = useLiveQuery(() => 
    activeBusinessId 
      ? db.orders.where('businessId').equals(activeBusinessId).reverse().toArray()
      : db.orders.orderBy('timestamp').reverse().toArray()
  , [activeBusinessId]) ?? [];

  const productMap  = useMemo(() => new Map(products.map(p  => [p.id,  p])),  [products]);
  const businessMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses]);

  const filteredOrders = useMemo(() => orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
      order.customerNumber.includes(historySearch);
    const matchesStatus   = statusFilter   === 'all' || order.status      === statusFilter;
    const matchesBusiness = businessFilter === 'all' || order.businessId  === businessFilter;
    return matchesSearch && matchesStatus && matchesBusiness;
  }), [orders, historySearch, statusFilter, businessFilter]);

  // ── Summary Calculations ──
  const summary = useMemo(() => {
    const unitPrice = selectedProduct?.basePrice ?? 0;
    const subtotal = unitPrice * quantity;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax + DELIVERY_FEE;
    return { unitPrice, subtotal, tax, total };
  }, [selectedProduct, quantity]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmitOrder = async () => {
    if (!selectedProduct) {
      toast.error("Please select a product first.");
      return;
    }
    if (!formData.customerName || !formData.phone) {
      toast.error("Customer name and phone are required.");
      return;
    }

    try {
      await db.orders.add({
        businessId: selectedProduct.businessId,
        productId: selectedProduct.id!,
        customerName: formData.customerName,
        customerNumber: formData.phone,
        price: summary.total,
        location: `${formData.address}${formData.city ? ', ' + formData.city : ''}`,
        status: 'pending',
        timestamp: new Date(),
        note: formData.note,
      });

      toast.success("Order placed successfully!");
      
      // Reset
      setSelectedBusinessId(null);
      setSelectedProductId(null);
      setQuantity(1);
      setFormData({
        customerName: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        postalCode: '',
        note: '',
      });
      setActiveTab('history');
    } catch (error) {
      toast.error("Failed to place order.");
      console.error(error);
    }
  };

  const updateOrderStatus = useCallback(async (orderId: number, status: Order['status']) => {
    try {
      await db.orders.update(orderId, { status });
      toast.success(`Order marked as ${status}`);
    } catch (error) {
      toast.error("Failed to update order status");
    }
  }, []);

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your sales and view order history across all businesses.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-muted/50 p-1">
          <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-4 w-4" />
            Order History
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <PlusCircle className="h-4 w-4" />
            New Order
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-6 pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
                  <CardDescription>A list of all orders processed through the system.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customer..."
                      className="pl-9 h-9 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 h-9 bg-background/50 border-muted-foreground/20">
                        <Filter className="h-4 w-4" />
                        {statusFilter === 'all' ? 'Status' : statusFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('pending')}>Pending</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('completed')}>Completed</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>Cancelled</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {!activeBusinessId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 h-9 bg-background/50 border-muted-foreground/20">
                          <Store className="h-4 w-4" />
                          {businessFilter === 'all' ? 'Business' : businesses.find(b => b.id === businessFilter)?.name}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setBusinessFilter('all')}>All Businesses</DropdownMenuItem>
                        {businesses.map(b => (
                          <DropdownMenuItem key={b.id} onClick={() => setBusinessFilter(b.id!)}>
                            {b.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {(historySearch || statusFilter !== 'all' || businessFilter !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-9 hover:bg-muted/50"
                      onClick={() => {
                        setHistorySearch('');
                        setStatusFilter('all');
                        setBusinessFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {filteredOrders.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-10" />
                  <p className="text-sm">{orders.length === 0 ? "No orders found." : "No orders match your filters."}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-muted-foreground/10 bg-background/30 overflow-hidden shadow-inner">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-muted/50 border-muted-foreground/10">
                        <TableHead className="w-[100px] text-[11px] uppercase tracking-wider font-bold">Order ID</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Customer</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Product</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Business</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Price</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Status</TableHead>
                        <TableHead className="text-right text-[11px] uppercase tracking-wider font-bold">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const product  = productMap.get(order.productId);
                        const business = businessMap.get(order.businessId);
                        
                        return (
                          <TableRow key={order.id} className="hover:bg-muted/30 transition-colors border-muted-foreground/5">
                            <TableCell className="font-mono text-[11px] font-bold text-muted-foreground">
                              #{order.id?.toString().padStart(4, '0')}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{order.customerName}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">{order.customerNumber}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-primary/5 text-primary border border-primary/10">
                                  <Package className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{product?.name || 'Unknown Product'}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">{product?.sku}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="text-[10px] font-bold h-5 px-2 border-none"
                                style={{ 
                                  color: business ? `hsl(${business.color})` : undefined,
                                  backgroundColor: business ? `hsl(${business.color} / 0.1)` : undefined
                                }}
                              >
                                {business?.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-sm">৳{order.price.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  order.status === 'completed' ? 'success' : 
                                  order.status === 'cancelled' ? 'destructive' : 'warning'
                                }
                                className="capitalize text-[10px] h-5 font-bold shadow-sm"
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50 rounded-full">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => updateOrderStatus(order.id!, 'completed')} className="gap-2 py-2">
                                    <Check className="h-4 w-4 text-success" />
                                    Mark as Completed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateOrderStatus(order.id!, 'cancelled')} className="text-destructive gap-2 py-2">
                                    <Filter className="h-4 w-4" />
                                    Cancel Order
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new">
          <Card className="border-none shadow-sm max-w-6xl mx-auto bg-background/50 backdrop-blur-sm overflow-hidden animate-scale-in">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Place New Order
              </CardTitle>
              <CardDescription>Fill in the details below to register a new customer order.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              
              {/* SECTION 1: Business & Product */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20">1</div>
                  <h3 className="text-lg font-bold tracking-tight">Business & Product Selection</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2 px-1">
                      <Store className="h-4 w-4 text-primary" />
                      Select Business
                    </Label>
                    <Select value={selectedBusinessId?.toString() || ""} onValueChange={(v) => {
                      setSelectedBusinessId(Number(v));
                      setSelectedProductId(null);
                      setQuantity(1);
                    }}>
                      <SelectTrigger className="h-12 border-muted-foreground/20 bg-background/50 focus:ring-primary transition-all">
                        <SelectValue placeholder="Choose a business..." />
                      </SelectTrigger>
                      <SelectContent>
                        {businesses.filter(b => b.isActive).map(b => (
                          <SelectItem key={b.id} value={b.id!.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${b.color})` }} />
                              <span className="font-medium">{b.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2 px-1">
                      <Package className="h-4 w-4 text-primary" />
                      Select Product
                    </Label>
                    <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productSearchOpen}
                          disabled={!selectedBusinessId}
                          className="w-full justify-between h-12 border-muted-foreground/20 bg-background/50 font-normal px-3 transition-all focus:ring-2 focus:ring-primary/20"
                        >
                          {selectedProduct ? (
                            <span className="truncate font-medium">{selectedProduct.name}</span>
                          ) : (
                            <span className="text-muted-foreground">
                              {!selectedBusinessId ? "First select a business" : "Search for a product..."}
                            </span>
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-2xl border-muted-foreground/10" align="start">
                        <Command className="w-full">
                          <CommandInput placeholder="Type product name or SKU..." className="h-11" />
                          <CommandList className="max-h-[300px] custom-scrollbar">
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">No product found.</CommandEmpty>
                            <CommandGroup heading="Available Products" className="p-1">
                              {products.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.name} ${p.sku}`}
                                  onSelect={() => {
                                    setSelectedProductId(p.id!);
                                    setQuantity(1);
                                    setProductSearchOpen(false);
                                  }}
                                  className="flex items-center justify-between p-3 cursor-pointer rounded-lg hover:bg-primary/5 data-[selected=true]:bg-primary/5 transition-colors"
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-semibold text-sm">{p.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-fit">{p.sku}</span>
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

                {/* Product Detail Card */}
                {selectedProduct ? (
                  <div className="p-6 border border-muted-foreground/10 rounded-2xl bg-muted/10 shadow-sm flex flex-col md:flex-row items-center gap-6 animate-page-enter">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/10">
                      <Package className="h-10 w-10 opacity-50" />
                    </div>
                    <div className="flex-1 min-w-0 text-center md:text-left">
                      <h4 className="text-lg font-bold truncate">{selectedProduct.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{selectedProduct.description || "Fresh and premium quality product selected."}</p>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-2">{selectedProduct.sku}</Badge>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest px-2">{selectedProduct.type}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 px-4 py-2 bg-background/50 rounded-xl border border-muted-foreground/5 shadow-inner">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quantity</Label>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-bold w-6 text-center">{quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => setQuantity(q => q + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-center md:text-right px-6 border-l border-muted-foreground/10 hidden md:block">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Subtotal</p>
                      <p className="text-2xl font-black text-primary">৳{(selectedProduct.basePrice * quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 border-2 border-dashed border-muted-foreground/10 rounded-2xl text-center text-muted-foreground bg-muted/5">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-medium">Please select a business and product to continue.</p>
                  </div>
                )}
              </section>

              {/* SECTION 2: Customer Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20">2</div>
                  <h3 className="text-lg font-bold tracking-tight">Customer Information</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Form Column */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customerName" className="text-sm font-semibold flex items-center gap-2 px-1">
                          <User className="h-3.5 w-3.5 text-primary" />
                          Customer Name <span className="text-destructive">*</span>
                        </Label>
                        <Input id="customerName" placeholder="e.g. John Doe" value={formData.customerName} onChange={handleInputChange} className="h-11 bg-background/50 border-muted-foreground/20 focus:ring-primary transition-all" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2 px-1">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                          Phone Number <span className="text-destructive">*</span>
                        </Label>
                        <Input id="phone" placeholder="e.g. 01712345678" value={formData.phone} onChange={handleInputChange} className="h-11 bg-background/50 border-muted-foreground/20 focus:ring-primary transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2 px-1">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                          Email Address
                        </Label>
                        <Input id="email" type="email" placeholder="e.g. john@example.com" value={formData.email} onChange={handleInputChange} className="h-11 bg-background/50 border-muted-foreground/20 focus:ring-primary transition-all" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-semibold flex items-center gap-2 px-1">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          City <span className="text-destructive">*</span>
                        </Label>
                        <Input id="city" placeholder="e.g. Dhaka" value={formData.city} onChange={handleInputChange} className="h-11 bg-background/50 border-muted-foreground/20 focus:ring-primary transition-all" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-semibold flex items-center gap-2 px-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        Full Delivery Address <span className="text-destructive">*</span>
                      </Label>
                      <Input id="address" placeholder="e.g. 123 Main Street, Area, Dhaka" value={formData.address} onChange={handleInputChange} className="h-11 bg-background/50 border-muted-foreground/20 focus:ring-primary transition-all" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="note" className="text-sm font-semibold flex items-center gap-2 px-1">
                        <Info className="h-3.5 w-3.5 text-primary" />
                        Order Notes (Optional)
                      </Label>
                      <Textarea 
                        id="note" 
                        placeholder="Add any special instructions or details about the order..." 
                        value={formData.note} 
                        onChange={handleInputChange} 
                        className="min-h-[100px] bg-background/50 border-muted-foreground/20 focus:ring-primary transition-all resize-none" 
                      />
                    </div>
                  </div>

                  {/* Summary Sidebar */}
                  <div className="lg:col-span-4">
                    <div className="sticky top-6 p-6 rounded-2xl bg-muted/30 border border-muted-foreground/10 shadow-sm space-y-6">
                      <h4 className="text-base font-bold tracking-tight border-b pb-3">Order Summary</h4>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Business</span>
                          <span className="font-semibold text-foreground truncate max-w-[150px]">{selectedBusiness?.name || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Product</span>
                          <span className="font-semibold text-foreground truncate max-w-[150px]">{selectedProduct?.name || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Quantity</span>
                          <span className="font-semibold text-foreground">{quantity}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Unit Price</span>
                          <span className="font-semibold text-foreground">৳{summary.unitPrice.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-dashed border-muted-foreground/20">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold text-foreground">৳{summary.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Delivery Fee</span>
                          <span className="font-semibold text-foreground">৳{DELIVERY_FEE.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Tax (5%)</span>
                          <span className="font-semibold text-foreground">৳{summary.tax.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t-2 border-muted-foreground/10">
                        <div className="flex justify-between items-end">
                          <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Amount</span>
                          <span className="text-2xl font-black text-primary leading-none">৳{summary.total.toLocaleString()}</span>
                        </div>
                      </div>

                      <Button 
                        onClick={handleSubmitOrder} 
                        disabled={!selectedProduct || !formData.customerName || !formData.phone}
                        className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98] gap-3"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        Confirm Order
                      </Button>
                      
                      <p className="text-[10px] text-center text-muted-foreground leading-relaxed px-2 italic">
                        By confirming, you are registering this order into the system. Inventory will not be automatically deducted.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersPage;
