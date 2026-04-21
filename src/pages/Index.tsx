import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase, Package,
  TrendingUp, AlertTriangle, BoxesIcon, Store,
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

        <Card className="bg-gradient-to-br from-secondary/50 via-card to-muted/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Businesses</CardTitle>
            <div className="p-2 rounded-lg bg-secondary/60">
              <Store className="h-4 w-4 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeBusinesses.length}</div>
            <p className="text-xs text-muted-foreground">active pages</p>
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
                      <span className="font-medium">{bStock.toLocaleString()} units</span>
                    </div>
                    {bLow > 0 && (
                      <Badge variant="destructive" className="mt-2 gap-1 text-xs">
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

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {recentLogs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">Add products and stock to get started</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {recentLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.type === 'add' ? 'default' : log.type === 'remove' ? 'destructive' : 'secondary'} className="text-xs">
                        {log.type}
                      </Badge>
                      <span className="text-muted-foreground">{log.reason}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium">{log.type === 'remove' ? '-' : '+'}{log.quantity}</span>
                      <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
