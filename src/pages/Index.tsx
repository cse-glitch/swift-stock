import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Business } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { BusinessDetailDialog } from '@/components/BusinessDetailDialog';
import { PlaceOrderModal } from '@/components/PlaceOrderModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase, Package,
  TrendingUp, AlertTriangle, BoxesIcon, Store, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3, Clock, PlusCircle, MinusCircle,
  ShoppingCart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase,
};

// Dummy data for sparklines to match the aesthetic
const generateSparkData = (seed: number) => {
  return Array.from({ length: 12 }, (_, i) => ({
    value: Math.floor(Math.random() * 20) + 10 + Math.sin(i + seed) * 10
  }));
};

const Sparkline = ({ data, color }: { data: any[], color: string }) => (
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
  const { businesses, activeBusiness, activeBusinessId } = useBusiness();
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleBusinessClick = (b: Business) => {
    setSelectedBusiness(b);
    setIsDetailOpen(true);
  };
  const products = useLiveQuery(() =>
    activeBusinessId
      ? db.products.where('businessId').equals(activeBusinessId).toArray()
      : db.products.toArray()
    , [activeBusinessId]) ?? [];

  const variants = useLiveQuery(() => db.variants.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.inventoryLog.toArray(), []) ?? [];
  const recentLogs = useLiveQuery(
    () => db.inventoryLog.orderBy('timestamp').reverse().limit(10).toArray(), []
  ) ?? [];

  const activeBusinesses = useMemo(
    () => businesses.filter(b => b.isActive),
    [businesses]
  );

  // Pre-built grouping maps — O(1) per-business/product lookups
  const variantsByProduct = useMemo(() => {
    const m = new Map<number, typeof variants>();
    for (const v of variants) {
      const arr = m.get(v.productId) ?? [];
      arr.push(v);
      m.set(v.productId, arr);
    }
    return m;
  }, [variants]);

  const productsByBusiness = useMemo(() => {
    const m = new Map<number, typeof products>();
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

  // Pre-built variant price map (productId → basePrice, variantId → price)
  const variantMap = useMemo(() => new Map(variants.map(v => [v.id, v])), [variants]);
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const calculateRevenue = useMemo(() => (bId?: number) => {
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

  const totalRevenue = useMemo(
    () => calculateRevenue(activeBusinessId ?? undefined),
    [calculateRevenue, activeBusinessId]
  );

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

  // Memoized sparkline data to prevent re-renders
  const sparkData = useMemo(() => [
    generateSparkData(1),
    generateSparkData(2),
    generateSparkData(3),
    generateSparkData(4),
  ], []);

  return (
    <div className="space-y-4 md:space-y-6">
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
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeBusinesses.map(b => {
              const Icon = iconMap[b.icon] ?? Store;
              const bProducts = productsByBusiness.get(b.id!) ?? [];
              const bVariants = bProducts.flatMap(p => variantsByProduct.get(p.id!) ?? []);
              const bStock = bVariants.reduce((s, v) => s + v.stock, 0);
              const bLow = bVariants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold).length;

              return (
                <Card
                  key={b.id}
                  onClick={() => handleBusinessClick(b)}
                  className="card-hover hover:shadow-md transition-all cursor-pointer border-l-4 active:scale-[0.98]"
                  style={{ borderLeftColor: `hsl(${b.color})` }}
                >
                  <CardHeader className="flex flex-row items-center gap-3 pb-2 px-3 pt-3 sm:px-4 sm:pt-4">
                    <div
                      className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `hsl(${b.color} / 0.12)`, color: `hsl(${b.color})` }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{b.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">{b.type}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{bProducts.length} products</span>
                      <span className="font-medium text-success text-xs">৳{calculateRevenue(b.id!).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1.5">
                      <span className="text-muted-foreground text-xs">Total Stock</span>
                      <span className="font-medium">{bStock.toLocaleString()}</span>
                    </div>
                    {bLow > 0 && (
                      <Badge variant="destructive" className="mt-2 gap-1 text-[10px] h-5">
                        <AlertTriangle className="h-3 w-3" />
                        {bLow} low stock
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

      <BusinessDetailDialog
        business={selectedBusiness}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
};

export default Dashboard;
