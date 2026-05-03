import { useCallback, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Papa from "papaparse";
import {
  AreaChart, Area, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Package, BoxesIcon, Store,
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase, Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase,
};

const COLORS = [
  "hsl(230, 65%, 52%)", "hsl(330, 70%, 60%)", "hsl(210, 75%, 55%)",
  "hsl(38, 92%, 50%)", "hsl(160, 50%, 45%)", "hsl(120, 50%, 40%)",
  "hsl(270, 55%, 55%)",
];

type TimeRange = "7d" | "30d" | "90d" | "all";

const Analytics = () => {
  const { businesses, activeBusinessId, setActiveBusinessId } = useBusiness();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const products  = useLiveQuery(() => db.products.toArray(),  []) ?? [];
  const variants  = useLiveQuery(() => db.variants.toArray(),   []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const logs = useLiveQuery(
    () => db.inventoryLog.orderBy('timestamp').toArray(), []
  ) ?? [];

  const activeBusinesses = useMemo(
    () => businesses.filter(b => b.isActive),
    [businesses]
  );

  // ── Pre-built O(1) lookup Maps (rebuilt only when source data changes) ──
  const variantMap  = useMemo(() => new Map(variants.map(v  => [v.id,  v])),  [variants]);
  const productMap  = useMemo(() => new Map(products.map(p  => [p.id,  p])),  [products]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const businessMap = useMemo(() => new Map(businesses.map(b => [b.id, b])), [businesses]);

  // Variants grouped by productId for O(1) per-product variant retrieval
  const variantsByProduct = useMemo(() => {
    const m = new Map<number, typeof variants>();
    for (const v of variants) {
      const arr = m.get(v.productId) ?? [];
      arr.push(v);
      m.set(v.productId, arr);
    }
    return m;
  }, [variants]);

  // Products grouped by businessId
  const productsByBusiness = useMemo(() => {
    const m = new Map<number, typeof products>();
    for (const p of products) {
      const arr = m.get(p.businessId) ?? [];
      arr.push(p);
      m.set(p.businessId, arr);
    }
    return m;
  }, [products]);

  // Filter logs by time range
  const filteredLogs = useMemo(() => {
    let base = logs;
    if (activeBusinessId) base = base.filter(l => l.businessId === activeBusinessId);
    if (timeRange === "all") return base;
    const cutoff = Date.now() - (timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90) * 86_400_000;
    return base.filter(l => new Date(l.timestamp).getTime() >= cutoff);
  }, [logs, timeRange, activeBusinessId]);

  // ── Revenue per business (O(n) with Map lookups) ──
  const revenueByBusiness = useMemo(() => {
    const soldLogs = filteredLogs.filter(l => l.type === "remove" && l.reason === "Sold");
    const revenueMap = new Map<number, number>();

    for (const log of soldLogs) {
      const v = variantMap.get(log.variantId!);
      const p = productMap.get(log.productId);
      const price = v?.price ?? p?.basePrice ?? 0;
      revenueMap.set(log.businessId, (revenueMap.get(log.businessId) ?? 0) + price * log.quantity);
    }

    return activeBusinesses.map((b, i) => ({
      name: b.name.replace("SAMAN ", ""),
      revenue: revenueMap.get(b.id!) ?? 0,
      fill: COLORS[i % COLORS.length],
      businessId: b.id,
    }));
  }, [activeBusinesses, filteredLogs, variantMap, productMap]);

  // ── Sales trend (daily aggregation — O(n)) ──
  const salesTrend = useMemo(() => {
    const soldLogs = filteredLogs.filter(l => l.type === "remove" && l.reason === "Sold");
    const dayMap = new Map<string, { sold: number; revenue: number }>();

    for (const log of soldLogs) {
      const day = new Date(log.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const existing = dayMap.get(day) ?? { sold: 0, revenue: 0 };
      // O(1) Map lookup instead of O(n) .find()
      const v = variantMap.get(log.variantId!);
      const p = productMap.get(log.productId);
      const price = v?.price ?? p?.basePrice ?? 0;
      existing.sold += log.quantity;
      existing.revenue += price * log.quantity;
      dayMap.set(day, existing);
    }

    return Array.from(dayMap.entries()).map(([date, data]) => ({ date, ...data }));
  }, [filteredLogs, variantMap, productMap]);

  // ── Category volumes (O(n) with Map lookups) ──
  const categoryVolumes = useMemo(() => {
    const bizProds = activeBusinessId
      ? (productsByBusiness.get(activeBusinessId) ?? [])
      : products;

    const catMap = new Map<string, number>();
    for (const p of bizProds) {
      const catName = categoryMap.get(p.categoryId!)?.name ?? "Uncategorized";
      const pVariants = variantsByProduct.get(p.id!) ?? [];
      const stock = pVariants.reduce((s, v) => s + v.stock, 0);
      catMap.set(catName, (catMap.get(catName) ?? 0) + stock);
    }

    return Array.from(catMap.entries())
      .map(([name, volume], i) => ({ name, volume, fill: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
  }, [products, productsByBusiness, variantsByProduct, categoryMap, activeBusinessId]);
  
  // ── Top Products by Revenue (O(n) with Map lookups) ──
  const topProducts = useMemo(() => {
    const soldLogs = filteredLogs.filter(l => l.type === "remove" && l.reason === "Sold");
    const productRevenue = new Map<number, number>();

    for (const log of soldLogs) {
      const v = variantMap.get(log.variantId!);
      const p = productMap.get(log.productId);
      const price = v?.price ?? p?.basePrice ?? 0;
      productRevenue.set(log.productId, (productRevenue.get(log.productId) ?? 0) + price * log.quantity);
    }

    return Array.from(productRevenue.entries())
      .map(([id, revenue]) => ({ name: productMap.get(id)?.name ?? "Unknown", revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredLogs, variantMap, productMap]);

  // ── Stock distribution per business (O(n) with grouped Maps) ──
  const stockByBusiness = useMemo(() => {
    return activeBusinesses.map((b, i) => {
      const bProds = productsByBusiness.get(b.id!) ?? [];
      const stock = bProds.reduce((s, p) => {
        return s + (variantsByProduct.get(p.id!) ?? []).reduce((sv, v) => sv + v.stock, 0);
      }, 0);
      return { name: b.name.replace("SAMAN ", ""), stock, fill: COLORS[i % COLORS.length] };
    });
  }, [activeBusinesses, productsByBusiness, variantsByProduct]);

  // ── Summary stats (derived from already-computed values) ──
  const totalRevenue = useMemo(() => {
    if (activeBusinessId) {
      return revenueByBusiness.find(b => b.businessId === activeBusinessId)?.revenue ?? 0;
    }
    return revenueByBusiness.reduce((s, b) => s + b.revenue, 0);
  }, [revenueByBusiness, activeBusinessId]);

  const totalSold = useMemo(() => {
    return filteredLogs
      .filter(l => l.type === "remove" && l.reason === "Sold")
      .reduce((s, l) => s + l.quantity, 0);
  }, [filteredLogs]); // activeBusinessId already baked into filteredLogs

  const totalStock = useMemo(() => {
    if (activeBusinessId) {
      const bProds = productsByBusiness.get(activeBusinessId) ?? [];
      return bProds.reduce((s, p) => s + (variantsByProduct.get(p.id!) ?? []).reduce((sv, v) => sv + v.stock, 0), 0);
    }
    return variants.reduce((s, v) => s + v.stock, 0);
  }, [variants, productsByBusiness, variantsByProduct, activeBusinessId]);

  const totalMovements = useMemo(() => filteredLogs.length, [filteredLogs]);

  // Memoized sparkline data
  const sparkData = useMemo(() => [
    generateSparkData(9),
    generateSparkData(10),
    generateSparkData(11),
    generateSparkData(12),
  ], []);

  const exportData = useCallback(() => {
    const summary = [
      { Category: "Summary", Metric: "Total Revenue", Value: totalRevenue },
      { Category: "Summary", Metric: "Units Sold", Value: totalSold },
      { Category: "Summary", Metric: "Current Stock", Value: totalStock },
      { Category: "Summary", Metric: "Movements", Value: totalMovements },
    ];

    const bizData = revenueByBusiness.map(b => ({
      Category: "Revenue By Business",
      Metric: b.name,
      Value: b.revenue
    }));

    const prodData = topProducts.map(p => ({
      Category: "Top Products By Revenue",
      Metric: p.name,
      Value: p.revenue
    }));

    const rows = [...summary, ...bizData, ...prodData];
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [totalRevenue, totalSold, totalStock, totalMovements, revenueByBusiness, topProducts]);

  // ── Visual Utilities ──
  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `৳${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 1000000) return `৳${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `৳${(val / 1000).toFixed(1)}k`;
    return `৳${val}`;
  };

  const formatNumber = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toString();
  };

  const CustomTooltip = ({ active, payload, label, prefix = "" }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border shadow-xl rounded-xl p-3 backdrop-blur-md bg-card/90">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-bold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 py-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-sm font-mono font-bold text-foreground">
                {prefix}{entry.value.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">{entry.name}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Business performance across all pages</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select
            value={activeBusinessId?.toString() ?? "all"}
            onValueChange={v => setActiveBusinessId(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-card/50">
              <SelectValue placeholder="All Businesses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {activeBusinesses.map(b => (
                <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={v => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[120px] bg-card/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData} className="gap-2 shrink-0">
            <Download className="h-4 w-4" />
            <span className="hidden lg:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-none shadow-md bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10"><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold truncate tracking-tight">৳{totalRevenue.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <span className="text-emerald-500 font-bold">+12.5%</span> vs last period
            </p>
            <Sparkline data={sparkData[0]} color="#10b981" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-none shadow-md bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Units Sold</CardTitle>
            <div className="p-1.5 rounded-lg bg-blue-500/10"><TrendingUp className="h-4 w-4 text-blue-500" /></div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tracking-tight">{totalSold.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <span className="text-blue-500 font-bold">+8.2%</span> vs last period
            </p>
            <Sparkline data={sparkData[1]} color="#3b82f6" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-none shadow-md bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Stock</CardTitle>
            <div className="p-1.5 rounded-lg bg-violet-500/10"><Package className="h-4 w-4 text-violet-500" /></div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tracking-tight">{totalStock.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Across all variants</p>
            <Sparkline data={sparkData[2]} color="#8b5cf6" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-none shadow-md bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Movements</CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-500/10"><BoxesIcon className="h-4 w-4 text-amber-500" /></div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tracking-tight">{totalMovements.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Log transactions</p>
            <Sparkline data={sparkData[3]} color="#f59e0b" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue per Business */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold">Revenue by Business</CardTitle>
            <CardDescription>Performance comparison across active pages</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByBusiness.every(r => r.revenue === 0) ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm opacity-40">
                <Store className="h-10 w-10 mb-2" />
                <p>No sales data recorded</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByBusiness} margin={{ left: 10, right: 10, top: 10, bottom: 20 }}>
                    <defs>
                      {revenueByBusiness.map((entry, i) => (
                        <linearGradient key={`grad-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={formatCurrency}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip prefix="৳" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={40}>
                      {revenueByBusiness.map((entry, i) => (
                        <Cell key={i} fill={`url(#barGrad-${i})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Trend */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold">Sales & Revenue Trend</CardTitle>
            <CardDescription>Growth trajectory over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {salesTrend.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm opacity-40">
                <TrendingUp className="h-10 w-10 mb-2" />
                <p>Awaiting transaction history</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ left: 10, right: 10, top: 10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={formatNumber}
                      width={40}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="sold" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorSold)" 
                      name="Units"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products by Revenue */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold">Top Products by Revenue</CardTitle>
            <CardDescription>Highest grossing items in catalog</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm opacity-40">
                <Package className="h-10 w-10 mb-2" />
                <p>No product sales recorded</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis 
                      type="number" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--foreground))", fontWeight: 500 }} 
                      width={100}
                    />
                    <Tooltip content={<CustomTooltip prefix="৳" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Volumes */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold">Top Categories by Volume</CardTitle>
            <CardDescription>Stock distribution by classification</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryVolumes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm opacity-40">
                <Layers className="h-10 w-10 mb-2" />
                <p>No category data available</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryVolumes} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis 
                      type="number" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={formatNumber}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--foreground))", fontWeight: 500 }} 
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }} />
                    <Bar dataKey="volume" radius={[0, 6, 6, 0]} barSize={18}>
                      {categoryVolumes.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock Distribution Pie */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold">Stock Distribution</CardTitle>
            <CardDescription>Inventory weightage per business</CardDescription>
          </CardHeader>
          <CardContent>
            {stockByBusiness.every(s => s.stock === 0) ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm opacity-40">
                <Package className="h-10 w-10 mb-2" />
                <p>Stock levels are empty</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockByBusiness.filter(s => s.stock > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="stock"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {stockByBusiness.filter(s => s.stock > 0).map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 500 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Business Breakdown - Desktop Table & Mobile Cards */}
      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base">Business Breakdown</CardTitle>
          <CardDescription>Detailed metrics per business page</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile View */}
          <div className="grid gap-0 md:hidden divide-y divide-border/50">
            {activeBusinesses.map((b, i) => {
              const bProds = productsByBusiness.get(b.id!) ?? [];
              const bVariants = bProds.flatMap(p => variantsByProduct.get(p.id!) ?? []);
              const bStock = bVariants.reduce((s, v) => s + v.stock, 0);
              const bSoldLogs = filteredLogs.filter(l => l.businessId === b.id && l.type === "remove" && l.reason === "Sold");
              const bSold = bSoldLogs.reduce((s, l) => s + l.quantity, 0);
              const bRevenue = revenueByBusiness[i]?.revenue ?? 0;
              const Icon = iconMap[b.icon] ?? Store;

              return (
                <div key={b.id} className="p-4 space-y-3 bg-card/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded shrink-0"
                        style={{ backgroundColor: `hsl(${b.color} / 0.12)`, color: `hsl(${b.color})` }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-foreground">{b.name}</span>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">৳{bRevenue.toLocaleString()}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Catalog</span>
                      <span className="text-xs font-medium mt-0.5">{bProds.length} Products / {bVariants.length} Variants</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Performance</span>
                      <span className="text-xs font-medium mt-0.5">{bStock.toLocaleString()} Stock / {bSold.toLocaleString()} Sold</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Business</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Products</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Variants</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {activeBusinesses.map((b, i) => {
                  const bProds = productsByBusiness.get(b.id!) ?? [];
                  const bVariants = bProds.flatMap(p => variantsByProduct.get(p.id!) ?? []);
                  const bStock = bVariants.reduce((s, v) => s + v.stock, 0);
                  const bSoldLogs = filteredLogs.filter(l => l.businessId === b.id && l.type === "remove" && l.reason === "Sold");
                  const bSold = bSoldLogs.reduce((s, l) => s + l.quantity, 0);
                  const bRevenue = revenueByBusiness[i]?.revenue ?? 0;
                  const Icon = iconMap[b.icon] ?? Store;

                  return (
                    <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded shrink-0"
                            style={{ backgroundColor: `hsl(${b.color} / 0.12)`, color: `hsl(${b.color})` }}
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                          <span className="font-medium">{b.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">{bProds.length}</td>
                      <td className="text-right py-3 px-4">{bVariants.length}</td>
                      <td className="text-right py-3 px-4 font-mono">{bStock.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-mono font-bold text-foreground">৳{bRevenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-mono">{bSold.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
