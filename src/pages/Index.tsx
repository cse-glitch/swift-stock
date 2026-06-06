import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Business } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { BusinessDetailDialog } from '@/components/BusinessDetailDialog';
import { PlaceOrderModal } from '@/components/PlaceOrderModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase, Package,
  TrendingUp, AlertTriangle, BoxesIcon, Store, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3, Clock, PlusCircle, MinusCircle,
  ShoppingCart, Receipt, Plus, Banknote, Users, Wrench
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase,
};

const generateSparkData = (seed: number) => {
  return Array.from({ length: 12 }, (_, i) => ({
    value: Math.floor(Math.random() * 20) + 10 + Math.sin(i + seed) * 10
  }));
};

const Sparkline = ({ data, color }: { data: { value: number }[], color: string }) => (
  <div className="h-[40px] w-full mt-2">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#gradient-${color})`}
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { businesses, activeBusiness, activeBusinessId } = useBusiness();
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleBusinessClick = (b: Business) => {
    setSelectedBusiness(b);
    setIsDetailOpen(true);
  };
  const rawProducts = useLiveQuery(() =>
    activeBusinessId
      ? db.products.where('businessId').equals(activeBusinessId).toArray()
      : db.products.toArray()
    , [activeBusinessId]);
  const products = useMemo(() => rawProducts ?? [], [rawProducts]);

  const rawVariants = useLiveQuery(() => db.variants.toArray(), []);
  const variants = useMemo(() => rawVariants ?? [], [rawVariants]);

  const rawPropertyListings = useLiveQuery(() => db.propertyListings.toArray(), []);
  const propertyListings = useMemo(() => rawPropertyListings ?? [], [rawPropertyListings]);

  const rawServices = useLiveQuery(() => db.services.toArray(), []);
  const services = useMemo(() => rawServices ?? [], [rawServices]);

  const rawLogs = useLiveQuery(() => db.inventoryLog.toArray(), []);
  const logs = useMemo(() => rawLogs ?? [], [rawLogs]);

  const rawRecentLogs = useLiveQuery(
    () => db.inventoryLog.orderBy('timestamp').reverse().limit(10).toArray(), []
  );
  const recentLogs = useMemo(() => rawRecentLogs ?? [], [rawRecentLogs]);

  // Mobile dashboard states & queries
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('general');

  const rawExpenses = useLiveQuery(
    () => activeBusinessId 
      ? db.expenses.where('businessId').equals(activeBusinessId).toArray()
      : db.expenses.toArray(),
    [activeBusinessId]
  );
  const expenses = useMemo(() => rawExpenses ?? [], [rawExpenses]);

  const rawOrders = useLiveQuery(
    () => activeBusinessId 
      ? db.orders.where('businessId').equals(activeBusinessId).toArray()
      : db.orders.toArray(),
    [activeBusinessId]
  );
  const orders = useMemo(() => rawOrders ?? [], [rawOrders]);

  const rawRecentOrders = useLiveQuery(
    () => activeBusinessId
      ? db.orders.where('businessId').equals(activeBusinessId).reverse().limit(3).toArray()
      : db.orders.orderBy('timestamp').reverse().limit(3).toArray(),
    [activeBusinessId]
  );
  const recentOrders = useMemo(() => rawRecentOrders ?? [], [rawRecentOrders]);

  const mobileStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthOrders = orders.filter(o => {
      const orderDate = new Date(o.timestamp);
      return orderDate >= startOfMonth;
    });

    const thisMonthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= startOfMonth;
    });

    const totalIncome = thisMonthOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalExpenses = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const invoicesCount = thisMonthOrders.length;
    return { totalIncome, totalExpenses, netProfit, invoicesCount };
  }, [orders, expenses]);

  const handleSaveExpense = async () => {
    if (!expenseAmount || !activeBusinessId) {
      toast.error('Amount is required and a business must be active');
      return;
    }

    try {
      await db.expenses.add({
        id: crypto.randomUUID(),
        businessId: activeBusinessId,
        categoryId: expenseCategory,
        amount: parseFloat(expenseAmount),
        date: new Date(),
        description: expenseDescription,
        paymentMethod: 'Cash',
      });
      toast.success('Expense recorded successfully');
      setIsExpenseOpen(false);
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('general');
    } catch (err) {
      toast.error('Failed to save expense');
    }
  };

  const activeBusinesses = useMemo(
    () => businesses.filter(b => b.isActive),
    [businesses]
  );

  const variantsByProduct = useMemo(() => {
    const m = new Map<string, typeof variants>();
    for (const v of variants) {
      const arr = m.get(v.productId) ?? [];
      arr.push(v);
      m.set(v.productId, arr);
    }
    return m;
  }, [variants]);

  const productsByBusiness = useMemo(() => {
    const m = new Map<string, typeof products>();
    for (const p of products) {
      const arr = m.get(p.businessId) ?? [];
      arr.push(p);
      m.set(p.businessId, arr);
    }
    return m;
  }, [products]);

  const totalProducts = products.length;
  const relevantVariants = useMemo(
    () => variants.filter(v => products.some(p => p.id === v.productId)),
    [variants, products]
  );
  const totalStock = useMemo(() => relevantVariants.reduce((s, v) => s + v.stock, 0), [relevantVariants]);
  const lowStockItems = useMemo(() => relevantVariants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold), [relevantVariants]);
  const outOfStock = useMemo(() => relevantVariants.filter(v => v.stock === 0), [relevantVariants]);

  const variantMap = useMemo(() => new Map(variants.map(v => [v.id, v])), [variants]);
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const businessMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses]);

  const calculateRevenue = useMemo(() => (bId?: string) => {
    const targetLogs = logs.filter(l =>
      (bId ? l.businessId === bId : true) && l.type === 'remove' && l.reason === 'Sold'
    );
    return targetLogs.reduce((acc, log) => {
      const v = variantMap.get(log.variantId!);
      const p = productMap.get(log.productId);
      const price = v?.price ?? p?.basePrice ?? 0;
      return acc + price * log.quantity;
    }, 0);
  }, [logs, variantMap, productMap]);

  const renderPropertiesDashboard = () => {
    const bizProducts = products;
    const bizListings = propertyListings.filter(l => bizProducts.some(p => p.id === l.productId));
    const total = bizListings.length || 1;
    const available = bizListings.filter(l => l.availability === 'available').length;
    const sold = bizListings.filter(l => l.availability === 'sold').length;
    const rented = bizListings.filter(l => l.availability === 'rented').length;
    const pending = bizListings.filter(l => l.availability === 'pending').length;

    const availablePercent = (available / total) * 100;

    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Listing Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center py-4">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle className="text-muted stroke-current" strokeWidth="10" fill="transparent" r="40" cx="50" cy="50" />
                  <circle
                    className="text-primary stroke-current transition-all duration-1000 ease-in-out"
                    strokeWidth="10"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * availablePercent) / 100}
                    strokeLinecap="round"
                    fill="transparent" r="40" cx="50" cy="50"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{available}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">Available</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-medium">{pending}</span>
                </div>
                <Progress value={(pending / total) * 100} className="h-1.5 bg-warning/20" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sold/Rented</span>
                  <span className="font-medium">{sold + rented}</span>
                </div>
                <Progress value={((sold + rented) / total) * 100} className="h-1.5 bg-success/20" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Properties Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md"><Building2 className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Listings</p>
                  <p className="text-lg font-bold">{bizListings.filter(l => l.availability !== 'sold').length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-lg font-bold text-success">
                  ${bizListings.reduce((acc, l) => {
                    const p = products.find(px => px.id === l.productId);
                    return acc + (p?.basePrice || 0);
                  }, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const totalRevenue = useMemo(
    () => calculateRevenue(activeBusinessId ?? undefined),
    [calculateRevenue, activeBusinessId]
  );

  const renderServicesDashboard = () => {
    const bizProducts = products;
    const bizServices = services.filter(s => bizProducts.some(p => p.id === s.productId));

    const avgUtilization = bizServices.length
      ? bizServices.reduce((acc, s) => acc + (s.capacity ? (s.currentBookings / s.capacity) * 100 : 0), 0) / bizServices.length
      : 0;

    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Utilization Gauge</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative h-32 w-48 overflow-hidden">
              <svg className="h-full w-full" viewBox="0 0 100 60">
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={126}
                  strokeDashoffset={126 - (126 * avgUtilization) / 100}
                  className={cn("transition-all duration-1000", avgUtilization > 80 ? "text-destructive" : avgUtilization > 50 ? "text-warning" : "text-success")}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <span className="text-2xl font-bold">{Math.round(avgUtilization)}%</span>
                <span className="text-[10px] text-muted-foreground uppercase">Average Load</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Service Load Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bizServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services configured.</p>
            ) : (
              bizServices.slice(0, 4).map(s => {
                const product = bizProducts.find(p => p.id === s.productId);
                const util = s.capacity ? (s.currentBookings / s.capacity) * 100 : 0;
                return (
                  <div key={s.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate">{product?.name}</span>
                      <span className="text-muted-foreground">{Math.round(util)}%</span>
                    </div>
                    <Progress value={util} className={cn("h-1.5", util > 80 ? "bg-destructive/20" : util > 50 ? "bg-warning/20" : "bg-success/20")} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const topSelling = useMemo(() =>
    products
      .map(p => {
        const soldQty = logs
          .filter(l => l.productId === p.id && l.type === 'remove' && l.reason === 'Sold')
          .reduce((s, l) => s + l.quantity, 0);
        return { ...p, soldQty };
      })
      .sort((a, b) => b.soldQty - a.soldQty)
      .filter(p => p.soldQty > 0)
      .slice(0, 5)
    , [products, logs]);

  const sparkData = useMemo(() => [
    generateSparkData(1),
    generateSparkData(2),
    generateSparkData(3),
    generateSparkData(4),
  ], []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ============================================================ */}
      {/* MOBILE DASHBOARD VIEW (md:hidden)                            */}
      {/* ============================================================ */}
      <div className="md:hidden space-y-6 animate-page-enter">
        {/* Business Overview */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Business Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Card 1: Total Income */}
            <Card className="bg-card border border-border/40 shadow-sm rounded-xl p-4 flex flex-col justify-between h-[105px]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-muted-foreground">Total Income</span>
                <TrendingUp className="h-4 w-4 text-emerald-500 bg-emerald-500/10 rounded-full p-0.5" />
              </div>
              <div>
                <div className="text-[17px] font-black text-emerald-600">৳{mobileStats.totalIncome.toLocaleString()}</div>
                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">This Month</span>
              </div>
            </Card>
            
            {/* Card 2: Total Expense */}
            <Card className="bg-card border border-border/40 shadow-sm rounded-xl p-4 flex flex-col justify-between h-[105px]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-muted-foreground">Total Expense</span>
                <ArrowDownRight className="h-4 w-4 text-rose-500 bg-rose-500/10 rounded-full p-0.5" />
              </div>
              <div>
                <div className="text-[17px] font-black text-rose-600">৳{mobileStats.totalExpenses.toLocaleString()}</div>
                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">This Month</span>
              </div>
            </Card>

            {/* Card 3: Net Profit */}
            <Card className="bg-card border border-border/40 shadow-sm rounded-xl p-4 flex flex-col justify-between h-[105px]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-muted-foreground">Net Profit</span>
                <TrendingUp className="h-4 w-4 text-blue-500 bg-blue-500/10 rounded-full p-0.5" />
              </div>
              <div>
                <div className={cn("text-[17px] font-black", mobileStats.netProfit >= 0 ? "text-blue-600" : "text-rose-600")}>
                  ৳{mobileStats.netProfit.toLocaleString()}
                </div>
                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">This Month</span>
              </div>
            </Card>

            {/* Card 4: Invoices */}
            <Card className="bg-card border border-border/40 shadow-sm rounded-xl p-4 flex flex-col justify-between h-[105px]">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-muted-foreground">Invoices</span>
                <Receipt className="h-4 w-4 text-purple-500 bg-purple-500/10 rounded-full p-0.5" />
              </div>
              <div>
                <div className="text-[17px] font-black text-purple-600">{mobileStats.invoicesCount}</div>
                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">This Month</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {/* Action 1: Create Order */}
            <PlaceOrderModal
              trigger={
                <button className="flex flex-col items-center gap-1.5 group">
                  <span className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm border border-emerald-500/10 group-active:scale-95">
                    <ShoppingCart className="h-5 w-5" />
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">Order</span>
                </button>
              }
            />

            {/* Action 2: Add Expense */}
            <button
              onClick={() => setIsExpenseOpen(true)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm border border-rose-500/10">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">Expense</span>
            </button>

            {/* Action 3: Add Stock */}
            <button
              onClick={() => navigate('/inventory?tab=stock')}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm border border-blue-500/10">
                <Package className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">Stock</span>
            </button>

            {/* Action 4: Suppliers */}
            <button
              onClick={() => navigate('/suppliers')}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm border border-purple-500/10">
                <Users className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">Suppliers</span>
            </button>

            {/* Action 5: Products */}
            <button
              onClick={() => navigate('/inventory?tab=catalog')}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm border border-amber-500/10">
                <BoxesIcon className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">Products</span>
            </button>

            {/* Action 6: Analytics */}
            <button
              onClick={() => navigate('/analytics')}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm border border-cyan-500/10">
                <BarChart3 className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">Analytics</span>
            </button>

            {/* Action 7: History */}
            <button
              onClick={() => navigate('/history')}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span className="h-12 w-12 rounded-xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm border border-yellow-500/10">
                <Clock className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">History</span>
            </button>

            {/* Action 8: Utilities */}
            <button
              onClick={() => navigate('/utilities')}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span className="h-12 w-12 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm border border-slate-500/10">
                <Wrench className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">Utilities</span>
            </button>
          </div>
        </div>

        {/* Active Businesses List on Mobile */}
        {!activeBusiness && (
          <div className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Active Businesses</h2>
            <div className="space-y-2.5">
              {activeBusinesses.map((b) => {
                const Icon = iconMap[b.icon] ?? Store;
                const bProducts = productsByBusiness.get(b.id!) ?? [];
                const bVariants = bProducts.flatMap(p => variantsByProduct.get(p.id!) ?? []);
                const bStock = bVariants.reduce((s, v) => s + v.stock, 0);
                const bLow = bVariants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold).length;

                return (
                  <div 
                    key={b.id} 
                    onClick={() => handleBusinessClick(b)}
                    className="flex items-center justify-between p-3.5 bg-card border border-border/40 rounded-xl hover:bg-muted/30 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `hsl(${b.color} / 0.12)`, color: `hsl(${b.color})` }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{b.name}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {bProducts.length} items • {bStock.toLocaleString()} stock
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-sm font-black text-success">৳{calculateRevenue(b.id!).toLocaleString()}</p>
                      {bLow > 0 && (
                        <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {bLow} low
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Invoices */}
        <div className="space-y-3 pb-8">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Recent Invoices</h2>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => navigate('/orders')} 
              className="text-primary text-xs font-semibold px-0 h-auto"
            >
              See All
            </Button>
          </div>
          <div className="space-y-2.5">
            {recentOrders.map((order) => {
              const product = productMap.get(order.productId);
              const business = businessMap.get(order.businessId);
              const isCompleted = order.status === 'completed';
              const isCancelled = order.status === 'cancelled';
              const statusColor = isCompleted
                ? 'text-emerald-600 bg-emerald-500/10'
                : isCancelled
                ? 'text-rose-600 bg-rose-500/10'
                : 'text-amber-600 bg-amber-500/10';
              const dotColor = isCompleted ? 'bg-emerald-500' : isCancelled ? 'bg-rose-500' : 'bg-amber-500';
              
              return (
                <div key={order.id} className="flex items-center justify-between p-3.5 bg-card border border-border/40 rounded-xl hover:bg-muted/30 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", statusColor)}>
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {order.customerName || 'Walk-in'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {product?.name || 'Unknown Product'} · {business?.name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-foreground">৳{order.totalPrice.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                      <span className={cn("text-[10px] font-bold capitalize", isCompleted ? 'text-emerald-600' : isCancelled ? 'text-rose-600' : 'text-amber-600')}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {recentOrders.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl border border-dashed">
                No recent orders found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP DASHBOARD VIEW (hidden md:block)                     */}
      {/* ============================================================ */}
      <div className="hidden md:block space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {activeBusiness ? activeBusiness.name : 'Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeBusiness ? `Overview for ${activeBusiness.name}` : `Managing ${activeBusinesses.length} businesses`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PlaceOrderModal
              trigger={
                <Button
                  id="dashboard-place-order-btn"
                  variant="outline"
                  className="gap-2 shadow-sm"
                  size="sm"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Place Order</span>
                  <span className="sm:hidden">Order</span>
                </Button>
              }
            />
            <Button
              id="dashboard-add-stock-btn"
              onClick={() => navigate('/add')}
              variant="outline"
              className="gap-2 shadow-sm"
              size="sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Add Stock</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <Button
              id="dashboard-remove-stock-btn"
              onClick={() => navigate('/remove')}
              variant="outline"
              className="gap-2 shadow-sm"
              size="sm"
            >
              <MinusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Remove Stock</span>
              <span className="sm:hidden">Remove</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/10 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pt-4 sm:px-4 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Products</CardTitle>
              <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <BoxesIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="text-2xl sm:text-3xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">{relevantVariants.length} variants</p>
              <Sparkline data={sparkData[0]} color="#8b5cf6" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/5 via-card to-primary/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pt-4 sm:px-4 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
              <div className="p-1.5 rounded-lg bg-accent/10 shrink-0">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="text-2xl sm:text-3xl font-bold">{totalStock.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">units across variants</p>
              <Sparkline data={sparkData[1]} color="#10b981" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/5 via-card to-destructive/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pt-4 sm:px-4 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
              <div className="p-1.5 rounded-lg bg-warning/10 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="text-2xl sm:text-3xl font-bold">{lowStockItems.length}</div>
              <p className="text-xs text-muted-foreground">{outOfStock.length} out of stock</p>
              <Sparkline data={sparkData[2]} color="#f59e0b" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/5 via-card to-emerald/5 border-success/10 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 sm:pt-4 sm:px-4 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <div className="p-1.5 rounded-lg bg-success/10 shrink-0">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="text-xl sm:text-3xl font-bold truncate">৳{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">from sales data</p>
              <Sparkline data={sparkData[3]} color="#3b82f6" />
            </CardContent>
          </Card>
        </div>

        {/* Per-Business Cards */}
        {!activeBusiness && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold mb-3">Business Overview</h2>
            <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeBusinesses.map((b, index) => {
                const Icon = iconMap[b.icon] ?? Store;
                const bProducts = productsByBusiness.get(b.id!) ?? [];
                const bVariants = bProducts.flatMap(p => variantsByProduct.get(p.id!) ?? []);
                const bStock = bVariants.reduce((s, v) => s + v.stock, 0);
                const bLow = bVariants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold).length;

                const isWide = index % 3 === 0;

                return (
                  <Card
                    key={b.id}
                    onClick={() => handleBusinessClick(b)}
                    className={cn(
                      "card-hover hover:shadow-md transition-all cursor-pointer border-l-4 active:scale-[0.98]",
                      isWide ? "col-span-2 sm:col-span-1" : "col-span-1"
                    )}
                    style={{ borderLeftColor: `hsl(${b.color})` }}
                  >
                    <CardHeader className="flex flex-row items-center gap-2 pb-1.5 px-2.5 pt-2.5 sm:gap-3 sm:px-4 sm:pt-4">
                      <div
                        className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg shrink-0"
                        style={{ backgroundColor: `hsl(${b.color} / 0.12)`, color: `hsl(${b.color})` }}
                      >
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-xs sm:text-sm truncate">{b.name}</CardTitle>
                        <p className="text-[10px] sm:text-xs text-muted-foreground capitalize leading-tight">{b.type}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="px-2.5 pb-2.5 sm:px-4 sm:pb-4">
                      <div className="flex items-center justify-between text-[10px] sm:text-sm">
                        <span className="text-muted-foreground truncate">{bProducts.length} items</span>
                        <span className="font-medium text-success">৳{calculateRevenue(b.id!).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] sm:text-sm mt-1 sm:mt-1.5">
                        <span className="text-muted-foreground truncate">Stock</span>
                        <span className="font-medium">{bStock.toLocaleString()}</span>
                      </div>
                      {bLow > 0 && (
                        <Badge variant="destructive" className="mt-1.5 gap-1 text-[9px] h-4 px-1.5 sm:mt-2 sm:text-[10px] sm:h-5">
                          <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          {bLow} low
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Top Selling Products */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold">Top Selling Products</CardTitle>
                  <p className="text-xs text-muted-foreground">Based on historical sales data</p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {topSelling.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No sales data recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {topSelling.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{p.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{p.soldQty} Sold</p>
                        <p className="text-[10px] text-success">Active</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Health */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold">Stock Health</CardTitle>
                  <p className="text-xs text-muted-foreground">Inventory status distribution</p>
                </div>
                <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                <div
                  className="bg-success h-full transition-all"
                  style={{ width: `${(relevantVariants.filter(v => v.stock > v.lowStockThreshold).length / (relevantVariants.length || 1)) * 100}%` }}
                />
                <div
                  className="bg-warning h-full transition-all"
                  style={{ width: `${(lowStockItems.length / (relevantVariants.length || 1)) * 100}%` }}
                />
                <div
                  className="bg-destructive h-full transition-all"
                  style={{ width: `${(outOfStock.length / (relevantVariants.length || 1)) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Healthy</p>
                  <p className="text-lg font-bold text-success">{relevantVariants.filter(v => v.stock > v.lowStockThreshold).length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Low Stock</p>
                  <p className="text-lg font-bold text-warning">{lowStockItems.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Out of Stock</p>
                  <p className="text-lg font-bold text-destructive">{outOfStock.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold">Recent Activity</CardTitle>
                  <p className="text-xs text-muted-foreground">Latest inventory logs</p>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {recentLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No movements recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map(log => {
                    const b = businesses.find(biz => biz.id === log.businessId);
                    return (
                      <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0 hover:bg-muted/30 px-1 rounded-sm transition-colors gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-md shrink-0 ${log.type === 'add' ? 'bg-success/10 text-success' : log.type === 'remove' ? 'bg-destructive/10 text-destructive' : 'bg-secondary/10 text-secondary'}`}>
                            {log.type === 'add' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs leading-none mb-0.5 truncate">{b?.name ?? 'Unknown Business'}</p>
                            <p className="text-[10px] text-muted-foreground">{log.reason}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-mono font-bold text-xs ${log.type === 'remove' ? 'text-destructive' : 'text-success'}`}>
                            {log.type === 'remove' ? '-' : '+'}{log.quantity}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="px-4 pt-4 pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold">System Health</CardTitle>
              <CardDescription>Everything is running smoothly</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-success status-dot shrink-0" />
                <span className="text-sm font-medium">Database Online (IndexedDB)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-success status-dot shrink-0" />
                <span className="text-sm font-medium">Local Session Active</span>
              </div>
              <div className="p-3 bg-card rounded-lg border text-xs text-muted-foreground leading-relaxed">
                Pro Tip: Export analytics data to CSV from the Analytics page for deeper offline processing.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BusinessDetailDialog
        business={selectedBusiness}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      {/* Quick Add Expense Modal */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px] rounded-xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight">Add Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Amount (৳)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input
                placeholder="e.g., Office Rent, Utility, Coffee"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="inventory">Inventory Purchase</SelectItem>
                  <SelectItem value="rent">Rent & Utilities</SelectItem>
                  <SelectItem value="salary">Staff Salaries</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsExpenseOpen(false)} className="rounded-lg">Cancel</Button>
            <Button onClick={handleSaveExpense} className="rounded-lg">Save Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
