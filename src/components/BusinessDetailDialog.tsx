import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Business, Product, Variant, Order, InventoryLog } from '@/lib/db';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  AlertTriangle,
  Store
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface BusinessDetailDialogProps {
  business: Business | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessDetailDialog({ business, open, onOpenChange }: BusinessDetailDialogProps) {
  const businessId = business?.id;

  // Fetch data for the specific business
  const products = useLiveQuery(() => 
    businessId ? db.products.where('businessId').equals(businessId).toArray() : []
  , [businessId]) ?? [];

  // Scoped: only fetch variants belonging to products in this business
  // Use businessId dependency so query re-runs reactively when business changes
  const variants = useLiveQuery(async () => {
    if (!businessId) return [];
    const bProducts = await db.products.where('businessId').equals(businessId).toArray();
    const ids = bProducts.map(p => p.id!);
    if (ids.length === 0) return [];
    return db.variants.where('productId').anyOf(ids).toArray();
  }, [businessId]) ?? [];

  const orders = useLiveQuery(() => 
    businessId ? db.orders.where('businessId').equals(businessId).toArray() : []
  , [businessId]) ?? [];

  // All hooks MUST be before any conditional return (Rules of Hooks)
  // Pre-built Map for O(1) per-product variant lookup in table rows
  const variantsByProduct = useMemo(() => {
    const m = new Map<number, typeof variants>();
    for (const v of variants) {
      const arr = m.get(v.productId) ?? [];
      arr.push(v);
      m.set(v.productId, arr);
    }
    return m;
  }, [variants]);

  const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);
  const pendingOrders   = useMemo(() => orders.filter(o => o.status === 'pending'),   [orders]);
  const totalOrders     = orders.length;
  const totalRevenue    = useMemo(() => completedOrders.reduce((sum, o) => sum + o.price, 0), [completedOrders]);
  const totalStock      = useMemo(() => variants.reduce((sum, v) => sum + v.stock, 0), [variants]);
  const lowStockCount   = useMemo(() => variants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold).length, [variants]);

  // Conditional return AFTER all hooks
  if (!business) return null;

  const Icon = (LucideIcons as any)[business.icon] || Store;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl bg-background animate-scale-in">
        <div 
          className="h-32 w-full relative shrink-0"
          style={{ backgroundColor: `hsl(${business.color} / 0.15)` }}
        >
          <div className="absolute -bottom-6 left-8 p-3 rounded-2xl bg-card shadow-xl border border-border/50">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: `hsl(${business.color} / 0.1)`, color: `hsl(${business.color})` }}
            >
              <Icon className="h-8 w-8" />
            </div>
          </div>
          <div className="absolute bottom-4 left-32">
            <h2 className="text-2xl font-bold tracking-tight">{business.name}</h2>
            <p className="text-sm text-muted-foreground capitalize font-medium">{business.type} Business</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 pt-12 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-primary/5 border-none shadow-sm card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{totalRevenue.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground mt-1">From {completedOrders.length} completed orders</p>
              </CardContent>
            </Card>

            <Card className="bg-accent/5 border-none shadow-sm card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="h-3 w-3" />
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-[10px] text-muted-foreground mt-1">{pendingOrders.length} orders pending</p>
              </CardContent>
            </Card>

            <Card className="bg-warning/5 border-none shadow-sm card-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-warning uppercase tracking-wider flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Total Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Units across {products.length} products</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Product Inventory
                {lowStockCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 gap-1 text-[10px] status-dot">
                    <AlertTriangle className="h-3 w-3" />
                    {lowStockCount} Low Stock
                  </Badge>
                )}
              </h3>
            </div>

            <div className="rounded-xl border bg-card/50 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[300px]">Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead className="text-right">Base Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No products found for this business.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => {
                      const pVariants = variantsByProduct.get(product.id!) ?? [];
                      const pStock = pVariants.reduce((sum, v) => sum + v.stock, 0);
                      const isLow = pVariants.some(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
                      const isOut = pVariants.length > 0 && pVariants.every(v => v.stock === 0);

                      return (
                        <TableRow key={product.id} className="table-row-hover">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{product.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase">{product.tags.slice(0, 2).join(' • ')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-[10px] h-5">{product.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`h-1.5 w-16 rounded-full bg-muted overflow-hidden`}>
                                <div 
                                  className={`h-full rounded-full ${isOut ? 'bg-destructive' : isLow ? 'bg-warning' : 'bg-success'}`}
                                  style={{ width: `${Math.min(100, (pStock / 100) * 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${isOut ? 'text-destructive' : isLow ? 'text-warning' : 'text-foreground'}`}>
                                {pStock}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            ৳{product.basePrice?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
