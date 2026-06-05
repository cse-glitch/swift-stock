import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { format } from "date-fns";
import Papa from "papaparse";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, CalendarIcon, History as HistoryIcon, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_TYPES = ["All", "add", "remove", "adjust"] as const;
const REASONS = ["All", "Restock", "Sold", "Damaged", "Expired", "Returned", "Adjustment", "Other"] as const;

const History = () => {
  const { businesses, activeBusinessId } = useBusiness();
  const logs = useLiveQuery(() => db.inventoryLog.orderBy("timestamp").reverse().toArray()) ?? [];
  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [reasonFilter, setReasonFilter] = useState("All");
  const [businessFilter, setBusinessFilter] = useState<string>(activeBusinessId?.toString() ?? "All");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const productMap = useMemo(() => new Map(products.map(p => [p.id!, p])), [products]);
  const variantMap = useMemo(() => new Map(variants.map(v => [v.id!, v])), [variants]);
  const businessMap = useMemo(() => new Map(businesses.map(b => [b.id!, b])), [businesses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(log => {
      if (businessFilter !== "All" && log.businessId !== businessFilter) return false;
      if (actionFilter !== "All" && log.type !== actionFilter) return false;
      if (reasonFilter !== "All" && log.reason !== reasonFilter) return false;
      if (dateFrom && new Date(log.timestamp) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(log.timestamp) > end) return false;
      }
      if (q) {
        const product = productMap.get(log.productId);
        const variant = log.variantId ? variantMap.get(log.variantId) : undefined;
        const searchable = [
          product?.name, product?.sku, variant?.name, variant?.sku, log.reason, log.note
        ].filter(Boolean).join(" ").toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, actionFilter, reasonFilter, businessFilter, dateFrom, dateTo, productMap, variantMap]);

  const totalMoved = filtered.reduce((s, l) => s + l.quantity, 0);

  const clearFilters = () => {
    setSearch("");
    setActionFilter("All");
    setReasonFilter("All");
    setBusinessFilter("All");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = search || actionFilter !== "All" || reasonFilter !== "All" || businessFilter !== "All" || dateFrom || dateTo;

  const exportCSV = () => {
    const rows = filtered.map(log => {
      const product = productMap.get(log.productId);
      const variant = log.variantId ? variantMap.get(log.variantId) : undefined;
      const business = businessMap.get(log.businessId);
      return {
        Date: format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
        Business: business?.name ?? "",
        Action: log.type,
        Product: product?.name ?? "",
        "Product SKU": product?.sku ?? "",
        Variant: variant?.name ?? "",
        "Variant SKU": variant?.sku ?? "",
        Quantity: log.quantity,
        Reason: log.reason,
        Note: log.note || "",
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const DatePicker = ({ date, onSelect, placeholder }: { date?: Date; onSelect: (d?: Date) => void; placeholder: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all stock movements</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0} className="gap-2 h-9">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="space-y-2.5">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search product, SKU, or note…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>

        {/* Filter chips row — horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <Select value={businessFilter} onValueChange={setBusinessFilter}>
            <SelectTrigger className="h-8 rounded-full px-3 text-xs font-semibold whitespace-nowrap shrink-0 border-border/60 w-auto min-w-[120px]">
              <SelectValue placeholder="Business" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Businesses</SelectItem>
              {businesses.filter(b => b.isActive).map(b => (
                <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-8 rounded-full px-3 text-xs font-semibold whitespace-nowrap shrink-0 border-border/60 w-auto min-w-[100px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map(a => (
                <SelectItem key={a} value={a}>{a === "All" ? "All Actions" : a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="h-8 rounded-full px-3 text-xs font-semibold whitespace-nowrap shrink-0 border-border/60 w-auto min-w-[110px]">
              <SelectValue placeholder="Reason" />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map(r => (
                <SelectItem key={r} value={r}>{r === "All" ? "All Reasons" : r}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePicker date={dateFrom} onSelect={setDateFrom} placeholder="From" />
          <DatePicker date={dateTo} onSelect={setDateTo} placeholder="To" />

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 rounded-full px-3 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} record(s)</span>
        <span>·</span>
        <span>{totalMoved} total units moved</span>
      </div>

      {/* Summary pill */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full font-medium">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full font-medium">
          {totalMoved} units moved
        </span>
      </div>

      {/* List - Desktop Table & Mobile Cards */}
      <div className="space-y-3">
        {/* ── Mobile list rows ── */}
        <div className="md:hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">
              <HistoryIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No records found</p>
              {hasFilters && <p className="text-xs mt-1">Try adjusting your filters</p>}
            </div>
          ) : (
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/30 shadow-sm divide-y divide-border/40">
              {filtered.map((log) => {
                const product  = productMap.get(log.productId);
                const variant  = log.variantId ? variantMap.get(log.variantId) : undefined;
                const business = businessMap.get(log.businessId);
                const isAdd    = log.type === 'add';
                const isRemove = log.type === 'remove';
                return (
                  <div key={log.id} className="flex items-center gap-3.5 px-4 py-3.5">
                    {/* Type badge dot */}
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm",
                      isAdd    ? 'bg-primary/10 text-primary' :
                      isRemove ? 'bg-destructive/10 text-destructive' :
                                 'bg-amber-500/10 text-amber-600'
                    )}>
                      {isAdd ? '+' : isRemove ? '−' : '±'}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {product?.name ?? '—'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {variant?.name ? `${variant.name} · ` : ''}{business?.name ?? '—'} · {log.reason}
                      </p>
                    </div>

                    {/* Qty + date */}
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-black font-mono",
                        isAdd ? 'text-primary' : isRemove ? 'text-destructive' : ''
                      )}>
                        {isAdd ? '+' : isRemove ? '-' : ''}{log.quantity}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <HistoryIcon className="h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">No records found</p>
                <p className="text-sm">{hasFilters ? "Try adjusting your filters" : "Stock movements will appear here"}</p>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(log => {
                      const product = productMap.get(log.productId);
                      const variant = log.variantId ? variantMap.get(log.variantId) : undefined;
                      const business = businessMap.get(log.businessId);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.timestamp), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm">{business?.name ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={log.type === "add" ? "default" : log.type === "remove" ? "destructive" : "secondary"}>
                              {log.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{product?.name ?? "—"}</div>
                            <div className="font-mono text-xs text-muted-foreground">{product?.sku}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{variant?.name ?? "—"}</div>
                            <div className="font-mono text-xs text-muted-foreground">{variant?.sku}</div>
                          </TableCell>
                          <TableCell className={cn("text-right font-semibold font-mono", log.type === "add" ? "text-primary" : log.type === "remove" ? "text-destructive" : "")}>
                            {log.type === "remove" ? "-" : "+"}{log.quantity}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{log.reason}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{log.note || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;
