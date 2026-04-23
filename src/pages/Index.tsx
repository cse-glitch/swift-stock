import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase, Package,
  TrendingUp, AlertTriangle, BoxesIcon, Store, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3, Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase,
};

const Dashboard = () => {
  const { businesses, activeBusiness, activeBusinessId } = useBusiness();
  const products = useLiveQuery(() =>
    activeBusinessId
      ? db.products.where('businessId').equals(activeBusinessId).toArray()
      : db.products.toArray()
  , [activeBusinessId]) ?? [];

  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const logs = useLiveQuery(() => db.inventoryLog.toArray()) ?? [];
  const recentLogs = useLiveQuery(() =>
    db.inventoryLog.orderBy('timestamp').reverse().limit(10).toArray()
  ) ?? [];

  // Compute stats
  const activeBusinesses = businesses.filter(b => b.isActive);
  const productsByBusiness = (bId: number) => products.filter(p => p.businessId === bId);

  const totalProducts = products.length;
  const relevantVariants = variants.filter(v => products.some(p => p.id === v.productId));
  const totalStock = relevantVariants.reduce((s, v) => s + v.stock, 0);
  const lowStockItems = relevantVariants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
  const outOfStock = relevantVariants.filter(v => v.stock === 0);

  const calculateRevenue = (bId?: number) => {
    const targetLogs = logs.filter(l => (bId ? l.businessId === bId : true) && l.type === 'remove' && l.reason === 'Sold');
    return targetLogs.reduce((acc, log) => {
      const v = variants.find(variant => variant.id === log.variantId);
      const p = products.find(product => product.id === log.productId);
      const price = v?.price ?? p?.basePrice ?? 0;
      return acc + (price * log.quantity);
    }, 0);
  };

  const totalRevenue = calculateRevenue(activeBusinessId ?? undefined);

  const topSelling = (activeBusinessId ? products : products)
    .map(p => {
      const soldQty = logs
        .filter(l => l.productId === p.id && l.type === 'remove' && l.reason === 'Sold')
        .reduce((s, l) => s + l.quantity, 0);
      return { ...p, soldQty };
    })
    .sort((a, b) => b.soldQty - a.soldQty)
    .filter(p => p.soldQty > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {activeBusiness ? activeBusiness.name : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          {activeBusiness ? `Overview for ${activeBusiness.name}` : `Managing ${activeBusinesses.length} businesses`}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <BoxesIcon className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">{relevantVariants.length} variants</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/5 via-card to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
            <div className="p-2 rounded-lg bg-accent/10">
              <Package className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">units across variants</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/5 via-card to-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">{outOfStock.length} out of stock</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/5 via-card to-emerald/5 border-success/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="p-2 rounded-lg bg-success/10">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">from sales data</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Business Cards */}
      {!activeBusiness && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Business Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeBusinesses.map(b => {
              const Icon = iconMap[b.icon] ?? Store;
              const bProducts = productsByBusiness(b.id!);
              const bVariants = variants.filter(v => bProducts.some(p => p.id === v.productId));
              const bStock = bVariants.reduce((s, v) => s + v.stock, 0);
              const bLow = bVariants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold).length;

              return (
                <Card
                  key={b.id}
                  className="hover:shadow-md transition-shadow cursor-default border-l-4"
                  style={{ borderLeftColor: `hsl(${b.color})` }}
                >
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `hsl(${b.color} / 0.12)`, color: `hsl(${b.color})` }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{b.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">{b.type}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{bProducts.length} products</span>
                      <span className="font-medium text-success">${calculateRevenue(b.id!).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Top Selling Products</CardTitle>
                <p className="text-xs text-muted-foreground">Based on historical sales data</p>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {topSelling.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No sales data recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {topSelling.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <div className="text-right">
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Stock Health</CardTitle>
                <p className="text-xs text-muted-foreground">Inventory status distribution</p>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <p className="text-[10px] text-muted-foreground uppercase">Healthy</p>
                <p className="text-lg font-bold text-success">{relevantVariants.filter(v => v.stock > v.lowStockThreshold).length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Low Stock</p>
                <p className="text-lg font-bold text-warning">{lowStockItems.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Out of Stock</p>
                <p className="text-lg font-bold text-destructive">{outOfStock.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <p className="text-xs text-muted-foreground">Latest inventory logs</p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No movements recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map(log => {
                  const b = businesses.find(biz => biz.id === log.businessId);
                  return (
                    <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0 hover:bg-muted/30 px-1 rounded-sm transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${log.type === 'add' ? 'bg-success/10 text-success' : log.type === 'remove' ? 'bg-destructive/10 text-destructive' : 'bg-secondary/10 text-secondary'}`}>
                          {log.type === 'add' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="font-medium text-xs leading-none mb-1">{b?.name ?? 'Unknown Business'}</p>
                          <p className="text-[10px] text-muted-foreground">{log.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
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

        {/* Quick Actions or Other Insights could go here */}
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="text-base font-semibold">System Health</CardTitle>
            <CardDescription>Everything is running smoothly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">Database Online (IndexedDB)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">Local Session Active</span>
            </div>
            <div className="p-3 bg-card rounded-lg border text-xs text-muted-foreground">
              Pro Tip: You can now export your analytics data to CSV from the Analytics page for deeper offline processing.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
