import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Business, Product, Variant, Order, InventoryLog } from '@/lib/db';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
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
  Store,
  Info,
  ChevronRight,
  Boxes
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface BusinessDetailDialogProps {
  business: Business | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessDetailDialog({ business, open, onOpenChange }: BusinessDetailDialogProps) {
  const isMobile = useIsMobile();
  const businessId = business?.id;

  const products = useLiveQuery(() =>
    businessId ? db.products.where('businessId').equals(businessId).toArray() : []
    , [businessId]) ?? [];

  const rawVariants = useLiveQuery(async () => {
    if (!businessId) return [];
    const bProducts = await db.products.where('businessId').equals(businessId).toArray();
    const ids = bProducts.map(p => p.id!);
    if (ids.length === 0) return [];
    return db.variants.where('productId').anyOf(ids).toArray();
  }, [businessId]);

  const variants = useMemo(() => rawVariants ?? [], [rawVariants]);

  const rawOrders = useLiveQuery(() =>
    businessId ? db.orders.where('businessId').equals(businessId).toArray() : []
    , [businessId]);

  const orders = useMemo(() => rawOrders ?? [], [rawOrders]);

  const variantsByProduct = useMemo(() => {
    const m = new Map<string, typeof variants>();
    for (const v of variants) {
      const arr = m.get(v.productId) ?? [];
      arr.push(v);
      m.set(v.productId, arr);
    }
    return m;
  }, [variants]);

  const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const totalOrders = orders.length;
  const totalRevenue = useMemo(() => completedOrders.reduce((sum, o) => sum + o.price, 0), [completedOrders]);
  const totalStock = useMemo(() => variants.reduce((sum, v) => sum + v.stock, 0), [variants]);
  const lowStockCount = useMemo(() => variants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold).length, [variants]);

  if (!business) return null;

  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[business.icon] ?? Store;

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
      <Card className="bg-success/5 border-none shadow-none md:shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-2 opacity-10 transition-opacity group-hover:opacity-20">
          <TrendingUp className="h-12 w-12" />
        </div>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-3">
          <div className="text-lg md:text-2xl font-bold">৳{totalRevenue.toLocaleString()}</div>
          <p className="text-[9px] text-muted-foreground mt-0.5">{completedOrders.length} sales</p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-none shadow-none md:shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-2 opacity-10 transition-opacity group-hover:opacity-20">
          <ShoppingCart className="h-12 w-12" />
        </div>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="h-3 w-3" />
            Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-3">
          <div className="text-lg md:text-2xl font-bold">{totalOrders}</div>
          <p className="text-[9px] text-muted-foreground mt-0.5">{pendingOrders.length} pending</p>
        </CardContent>
      </Card>

      <Card className="bg-warning/5 border-none shadow-none md:shadow-sm col-span-2 md:col-span-1 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-2 opacity-10 transition-opacity group-hover:opacity-20">
          <Package className="h-12 w-12" />
        </div>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-[10px] font-bold text-warning uppercase tracking-wider flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-3 flex items-end justify-between">
          <div>
            <div className="text-lg md:text-2xl font-bold">{totalStock.toLocaleString()}</div>
            <p className="text-[9px] text-muted-foreground mt-0.5">{products.length} types</p>
          </div>
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[8px] animate-pulse">
              {lowStockCount} LOW
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderProductList = () => {
    if (isMobile) {
      return (
        <div className="space-y-3 pb-6">
          {products.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm bg-muted/20 rounded-xl border border-dashed">
              No products found.
            </div>
          ) : (
            products.map((product) => {
              const pVariants = variantsByProduct.get(product.id!) ?? [];  // string key
              const pStock = pVariants.reduce((sum, v) => sum + v.stock, 0);
              const isLow = pVariants.some(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
              const isOut = pVariants.length > 0 && pVariants.every(v => v.stock === 0);

              return (
                <div
                  key={product.id}
                  className="bg-card border rounded-xl p-3 flex items-center gap-3 active:bg-muted/50 transition-colors"
                >
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `hsl(${business.color} / 0.1)`, color: `hsl(${business.color})` }}
                  >
                    <Boxes className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-bold text-sm truncate">{product.name}</h4>
                      <span className="font-bold text-sm shrink-0">৳{product.basePrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              isOut ? "bg-destructive" : isLow ? "bg-warning" : "bg-success"
                            )}
                            style={{ width: `${Math.min(100, (pStock / 50) * 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className={cn(isOut ? "text-destructive font-bold" : isLow ? "text-warning font-bold" : "text-success font-medium")}>
                            {pStock} in stock
                          </span>
                          <span>•</span>
                          <span className="uppercase">{product.sku}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }

    return (
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
                const pVariants = variantsByProduct.get(product.id!) ?? [];  // string key
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
    );
  };

  const dialogHeaderContent = (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        isMobile ? "h-40 rounded-t-[32px]" : "h-32"
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${business.color} / 0.25) 0%, hsl(${business.color} / 0.1) 100%)`
      }}
    >
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Icon className="h-32 w-32 rotate-12" />
      </div>

      <div className={cn(
        "absolute flex items-center gap-4 transition-all duration-500",
        isMobile ? "bottom-6 left-6" : "bottom-6 left-8"
      )}>
        <div className="p-3 rounded-2xl bg-card shadow-2xl border border-white/20 backdrop-blur-sm">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: `hsl(${business.color} / 0.15)`, color: `hsl(${business.color})` }}
          >
            <Icon className="h-7 w-7 md:h-8 md:w-8" />
          </div>
        </div>
        <div className="space-y-0.5">
          <h2 className={cn(
            "font-black tracking-tight",
            isMobile ? "text-xl" : "text-2xl"
          )}>{business.name}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px] h-4 font-bold uppercase tracking-widest bg-white/50 backdrop-blur-sm">
              {business.type}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Info className="h-2.5 w-2.5" />
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const dialogBodyContent = (
    <div className={cn(
      "flex-1 overflow-auto custom-scrollbar",
      isMobile ? "p-5 pt-6" : "p-8"
    )}>
      {renderStats()}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
            Inventory Details
          </h3>
          <Badge variant="outline" className="text-[10px] font-mono">
            {products.length} Products
          </Badge>
        </div>
        {renderProductList()}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[90vh] rounded-t-2xl border-none bg-background p-0 outline-none">
          {dialogHeaderContent}
          {dialogBodyContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl bg-background rounded-xl">
        {dialogHeaderContent}
        {dialogBodyContent}
      </DialogContent>
    </Dialog>
  );
}
