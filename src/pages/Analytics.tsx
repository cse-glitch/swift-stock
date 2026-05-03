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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Package, BoxesIcon, Store,
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase, Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Business performance across all pages</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={activeBusinessId?.toString() ?? "all"}
            onValueChange={v => setActiveBusinessId(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-[200px]">
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
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">from sold items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Units Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">units across all</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Movements</CardTitle>
            <BoxesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMovements.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">add/remove actions</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue per Business */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Business</CardTitle>
            <CardDescription>Total revenue from sold items per business</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByBusiness.every(r => r.revenue === 0) ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueByBusiness}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, "Revenue"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenueByBusiness.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales Trend</CardTitle>
            <CardDescription>Units sold over time</CardDescription>
          </CardHeader>
          <CardContent>
            {salesTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line type="monotone" dataKey="sold" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Units Sold" />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} name="Revenue (৳)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products by Revenue</CardTitle>
            <CardDescription>Highest grossing products in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No sales data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} className="fill-muted-foreground" />
                  <Tooltip
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, "Revenue"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Volumes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Categories by Volume</CardTitle>
            <CardDescription>Current stock levels per category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryVolumes.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No categories yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryVolumes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                    {categoryVolumes.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stock Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Distribution</CardTitle>
            <CardDescription>Total stock units per business</CardDescription>
          </CardHeader>
          <CardContent>
            {stockByBusiness.every(s => s.stock === 0) ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No stock data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stockByBusiness.filter(s => s.stock > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="stock"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stockByBusiness.filter(s => s.stock > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), "Units"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-business breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Breakdown</CardTitle>
          <CardDescription>Detailed metrics per business page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Business</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Products</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Variants</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Sold</th>
                </tr>
              </thead>
              <tbody>
                {activeBusinesses.map((b, i) => {
                  const bProds = productsByBusiness.get(b.id!) ?? [];
                  const bVariants = bProds.flatMap(p => variantsByProduct.get(p.id!) ?? []);
                  const bStock = bVariants.reduce((s, v) => s + v.stock, 0);
                  const bSoldLogs = filteredLogs.filter(l => l.businessId === b.id && l.type === "remove" && l.reason === "Sold");
                  const bSold = bSoldLogs.reduce((s, l) => s + l.quantity, 0);
                  const bRevenue = revenueByBusiness[i]?.revenue ?? 0;
                  const Icon = iconMap[b.icon] ?? Store;

                  return (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-3">
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
                      <td className="text-right py-2 px-3">{bProducts.length}</td>
                      <td className="text-right py-2 px-3">{bVariants.length}</td>
                      <td className="text-right py-2 px-3 font-mono">{bStock.toLocaleString()}</td>
                      <td className="text-right py-2 px-3 font-mono">৳{bRevenue.toLocaleString()}</td>
                      <td className="text-right py-2 px-3 font-mono">{bSold.toLocaleString()}</td>
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
