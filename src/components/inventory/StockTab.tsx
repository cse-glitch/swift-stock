import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type Variant, type Business } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Package, AlertTriangle, ArrowUpDown, TrendingDown, TrendingUp, Boxes, PlusCircle, MinusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';

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

import { BulkUploadDialog } from './BulkUploadDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { generateId } from '@/lib/db';

export function StockTab() {
  const { activeBusiness, activeBusinessId, businesses, setActiveBusinessId } = useBusiness();
  const [search, setSearch] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustVariant, setAdjustVariant] = useState<{ id: string, name: string, stock: number, businessId: string, productId: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [adjustNote, setAdjustNote] = useState('');
  const navigate = useNavigate();

  const rawProducts = useLiveQuery(
    () => activeBusinessId
      ? db.products.where('businessId').equals(activeBusinessId).toArray()
      : db.products.toArray(),
    [activeBusinessId]
  );

  const rawVariants = useLiveQuery(() => db.variants.toArray());
  const rawCategories = useLiveQuery(() => db.categories.toArray());

  const inventoryData = useMemo(() => {
    const products = rawProducts ?? [];
    const variants = rawVariants ?? [];
    const categories = rawCategories ?? [];
    const productMap = new Map(products.map(p => [p.id, p]));
    const bizMap = new Map(businesses.map(b => [b.id, b]));
    const catMap = new Map(categories.map(c => [c.id, c]));

    let results = variants.filter(v => productMap.has(v.productId)).map(v => {
      const product = productMap.get(v.productId)!;
      const biz = bizMap.get(product.businessId);
      const cat = product.categoryId ? catMap.get(product.categoryId) : null;

      const price = v.price || product.basePrice || 0;
      const value = v.stock * price;
      const isLowStock = v.stock <= v.lowStockThreshold && v.stock > 0;
      const isOutOfStock = v.stock === 0;

      return {
        ...v,
        productName: product.name,
        businessName: biz?.name || 'Unknown',
        businessColor: biz?.color,
        businessId: product.businessId,
        categoryName: cat?.name || 'Uncategorized',
        price,
        value,
        isLowStock,
        isOutOfStock
      };
    });

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(r =>
        r.productName.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q)
      );
    }

    if (showLowStockOnly) {
      results = results.filter(r => r.isLowStock || r.isOutOfStock);
    }

    return results;
  }, [rawProducts, rawVariants, businesses, rawCategories, search, showLowStockOnly]);

  const metrics = useMemo(() => {
    const totalItems = inventoryData.length;
    const lowStockCount = inventoryData.filter(r => r.isLowStock).length;
    const outOfStockCount = inventoryData.filter(r => r.isOutOfStock).length;
    const totalValue = inventoryData.reduce((sum, r) => sum + r.value, 0);

    return { totalItems, lowStockCount, outOfStockCount, totalValue };
  }, [inventoryData]);

  const sparkData = useMemo(() => [
    generateSparkData(5),
    generateSparkData(6),
    generateSparkData(7),
    generateSparkData(8),
  ], []);

  const handleAdjustStock = async () => {
    if (!adjustVariant || adjustAmount <= 0) return;
    
    if (adjustType === 'remove' && adjustAmount > adjustVariant.stock) {
      toast({ title: 'Error', description: 'Cannot remove more stock than available.', variant: 'destructive' });
      return;
    }

    try {
      await db.transaction('rw', db.variants, db.inventoryLog, async () => {
        const v = await db.variants.get(adjustVariant.id);
        if (!v) return;

        const newStock = adjustType === 'add' ? v.stock + adjustAmount : v.stock - adjustAmount;
        await db.variants.update(v.id!, { stock: newStock });

        await db.inventoryLog.add({
          id: generateId(),
          productId: adjustVariant.productId,
          variantId: adjustVariant.id,
          businessId: adjustVariant.businessId,
          type: adjustType,
          quantity: adjustAmount,
          reason: 'Manual Adjustment',
          note: adjustNote.trim() || undefined,
          timestamp: new Date()
        });
      });

      toast({ title: 'Stock Updated', description: `Successfully ${adjustType === 'add' ? 'added' : 'removed'} ${adjustAmount} units.` });
      setAdjustModalOpen(false);
    } catch (err) {
      toast({ title: 'Database Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    }
  };

  const openAdjustModal = (item: { id: string, name: string, stock: number, productId: string, businessId: string }, type: 'add' | 'remove') => {
    setAdjustVariant({ id: item.id, name: item.name, stock: item.stock, businessId: item.businessId, productId: item.productId });
    setAdjustType(type);
    setAdjustAmount(0);
    setAdjustNote('');
    setAdjustModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-20 md:pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">Stock Levels</h1>
          <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
            {activeBusiness ? `Managing stock for ${activeBusiness.name}` : 'All business stock levels'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
           <BulkUploadDialog />
        </div>
      </div>

      {/* ── Mobile 2×2 stat grid ── */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Card className="bg-card border border-border/40 shadow-sm rounded-xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-muted-foreground">Total Items</span>
            <Package className="h-4 w-4 text-primary bg-primary/10 rounded-full p-0.5" />
          </div>
          <div className="text-[22px] font-black mt-2 text-foreground">{metrics.totalItems}</div>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Variants</span>
        </Card>
        <Card className="bg-card border border-amber-500/20 shadow-sm rounded-xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-amber-600">Low Stock</span>
            <TrendingDown className="h-4 w-4 text-amber-500 bg-amber-500/10 rounded-full p-0.5" />
          </div>
          <div className="text-[22px] font-black mt-2 text-amber-600">{metrics.lowStockCount}</div>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Alert</span>
        </Card>
        <Card className="bg-card border border-destructive/20 shadow-sm rounded-xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-destructive">Out of Stock</span>
            <AlertTriangle className="h-4 w-4 text-destructive bg-destructive/10 rounded-full p-0.5" />
          </div>
          <div className="text-[22px] font-black mt-2 text-destructive">{metrics.outOfStockCount}</div>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Empty</span>
        </Card>
        <Card className="bg-card border border-emerald-500/20 shadow-sm rounded-xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-emerald-700">Value</span>
            <TrendingUp className="h-4 w-4 text-emerald-500 bg-emerald-500/10 rounded-full p-0.5" />
          </div>
          <div className="text-[18px] font-black mt-2 text-emerald-600 truncate">
            ৳{metrics.totalValue.toLocaleString()}
          </div>
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Asset</span>
        </Card>
      </div>

      {/* ── Desktop 4-col stat grid ── */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique stock variants</p>
            <Sparkline data={sparkData[0]} color="#8b5cf6" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-warning/20 shadow-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{metrics.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Nearing threshold</p>
            <Sparkline data={sparkData[1]} color="#f59e0b" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-destructive/20 shadow-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
            <Sparkline data={sparkData[2]} color="#ef4444" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-success/20 shadow-md overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500 truncate">
              ৳{metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Estimated asset value</p>
            <Sparkline data={sparkData[3]} color="#10b981" />
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU or product name…"
            className="pl-9 h-11 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Chip-row filters — horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <Select
            value={activeBusinessId?.toString() ?? "all"}
            onValueChange={v => setActiveBusinessId(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-8 rounded-full px-3 text-xs font-semibold whitespace-nowrap shrink-0 border-border/60 w-auto min-w-[130px]">
              <SelectValue placeholder="All Businesses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businesses.map(b => (
                <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showLowStockOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className="h-8 rounded-full px-3 text-xs font-semibold gap-1.5 shrink-0"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {showLowStockOnly ? "Issues Only" : "All Stock"}
          </Button>
        </div>
      </div>

      {/* Inventory List - Desktop Table & Mobile List */}
      <div className="space-y-3">
        {/* ── Mobile list rows ── */}
        <div className="md:hidden">
          {inventoryData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
              <Boxes className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No inventory items found</p>
            </div>
          ) : (
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/30 shadow-sm divide-y divide-border/40">
              {inventoryData.map((item) => (
                <div key={item.id} className="flex items-center gap-3.5 px-4 py-3.5">
                  {/* Stock indicator pill */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                    item.isOutOfStock ? 'bg-destructive/10 text-destructive' :
                    item.isLowStock   ? 'bg-amber-500/10 text-amber-600' :
                                       'bg-primary/10 text-primary'
                  }`}>
                    {item.stock}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{item.productName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.name} · <span className="font-mono">{item.sku}</span>
                    </p>
                  </div>

                  {/* Value + status */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-foreground">
                      ৳{item.value.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openAdjustModal(item, 'remove')}>
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => openAdjustModal(item, 'add')}>
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden md:block border-none shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">Product & Variant</TableHead>
                  <TableHead>SKU</TableHead>
                  {!activeBusinessId && <TableHead>Business</TableHead>}
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock Level</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Boxes className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No inventory items found</p>
                        <p className="text-sm">Try adjusting your filters or add some products</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors group">
                      <TableCell className="min-w-[150px]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground break-words">{item.productName}</span>
                          <span className="text-xs text-muted-foreground break-words">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {item.sku}
                        </code>
                      </TableCell>
                      {!activeBusinessId && (
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="font-normal text-[10px] whitespace-nowrap"
                            style={{ borderColor: item.businessColor ? `hsl(${item.businessColor})` : undefined }}
                          >
                            {item.businessName}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="text-sm">{item.categoryName}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-mono font-bold ${item.isOutOfStock ? 'text-destructive' :
                              item.isLowStock ? 'text-warning' : 'text-foreground'
                            }`}>
                            {item.stock}
                          </span>
                          {item.isLowStock && (
                            <span className="text-[10px] text-warning font-medium uppercase tracking-wider">Low Stock</span>
                          )}
                          {item.isOutOfStock && (
                            <span className="text-[10px] text-destructive font-medium uppercase tracking-wider">Empty</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ৳{item.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-bold text-foreground">
                          ৳{item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openAdjustModal(item, 'remove')}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openAdjustModal(item, 'add')}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{adjustType === 'add' ? 'Add Stock' : 'Remove Stock'}</DialogTitle>
            <DialogDescription>
              {adjustType === 'add' ? 'Increase' : 'Decrease'} inventory for <span className="font-semibold text-foreground">{adjustVariant?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity to {adjustType === 'add' ? 'Add' : 'Remove'}</Label>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setAdjustAmount(Math.max(0, adjustAmount - 1))} disabled={adjustAmount <= 0}>-</Button>
                <Input type="number" className="text-center" value={adjustAmount || ""} onChange={e => setAdjustAmount(Math.max(0, parseInt(e.target.value) || 0))} />
                <Button variant="outline" size="icon" onClick={() => setAdjustAmount(adjustAmount + 1)}>+</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input placeholder="e.g. Shipment #1234" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
            </div>
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md border">
              Current Stock: <strong className="text-foreground">{adjustVariant?.stock}</strong> &rarr; New Stock: <strong className="text-foreground">{adjustVariant ? (adjustType === 'add' ? adjustVariant.stock + adjustAmount : adjustVariant.stock - adjustAmount) : 0}</strong>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjustStock} variant={adjustType === 'remove' ? 'destructive' : 'default'}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
