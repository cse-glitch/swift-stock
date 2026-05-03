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
import { Search, Package, AlertTriangle, ArrowUpDown, TrendingDown, TrendingUp, Boxes } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Inventory() {
  const { activeBusiness, activeBusinessId, businesses, setActiveBusinessId } = useBusiness();
  const [search, setSearch] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const navigate = useNavigate();

  // Fetch data
  const products = useLiveQuery(
    () => activeBusinessId 
      ? db.products.where('businessId').equals(activeBusinessId).toArray() 
      : db.products.toArray(),
    [activeBusinessId]
  ) ?? [];

  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];

  // Data processing
  const inventoryData = useMemo(() => {
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
  }, [products, variants, businesses, categories, search, showLowStockOnly]);

  // Metrics
  const metrics = useMemo(() => {
    const totalItems = inventoryData.length;
    const lowStockCount = inventoryData.filter(r => r.isLowStock).length;
    const outOfStockCount = inventoryData.filter(r => r.isOutOfStock).length;
    const totalValue = inventoryData.reduce((sum, r) => sum + r.value, 0);

    return { totalItems, lowStockCount, outOfStockCount, totalValue };
  }, [inventoryData]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Comprehensive view of stock levels {activeBusiness ? `for ${activeBusiness.name}` : 'across all businesses'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/add')}>
            Restock
          </Button>
          <Button onClick={() => navigate('/remove')}>
            Deduct Stock
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique stock variants</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-warning/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{metrics.lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Nearing threshold</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-destructive/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Immediate action required</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-success/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              ৳{metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Estimated asset value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search SKU or product name..." 
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={activeBusinessId?.toString() ?? "all"}
            onValueChange={v => setActiveBusinessId(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-[200px] bg-card">
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
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            {showLowStockOnly ? "Showing Issues Only" : "Show All Stock"}
          </Button>
        </div>
      </div>

      {/* Main Inventory Table */}
      <Card className="border-none shadow-xl overflow-hidden">
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
                <TableHead className="w-[100px]"></TableHead>
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
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{item.productName}</span>
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {item.sku}
                      </code>
                    </TableCell>
                    {!activeBusinessId && (
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="font-normal text-[10px]"
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
                        <span className={`font-mono font-bold ${
                          item.isOutOfStock ? 'text-destructive' : 
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
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate('/add')}>
                        <Package className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
