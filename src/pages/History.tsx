import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, CalendarIcon, History as HistoryIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const REASONS = ["All", "Sold", "Damaged", "Expired", "Returned", "Other"] as const;

const History = () => {
  const removals = useLiveQuery(() => db.removals.orderBy("timestamp").reverse().toArray()) ?? [];
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return removals.filter(r => {
      if (q && !r.sku.toLowerCase().includes(q) && !r.productName.toLowerCase().includes(q)) return false;
      if (reasonFilter !== "All" && r.reason !== reasonFilter) return false;
      if (dateFrom && new Date(r.timestamp) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(r.timestamp) > end) return false;
      }
      return true;
    });
  }, [removals, search, reasonFilter, dateFrom, dateTo]);

  const totalRemoved = filtered.reduce((s, r) => s + r.quantityRemoved, 0);

  const clearFilters = () => {
    setSearch("");
    setReasonFilter("All");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = search || reasonFilter !== "All" || dateFrom || dateTo;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Removal History</h1>
        <p className="text-muted-foreground">View all past stock removals with filtering</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by SKU or name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Date range:</span>
            <DatePicker date={dateFrom} onSelect={setDateFrom} placeholder="From" />
            <span className="text-muted-foreground">→</span>
            <DatePicker date={dateTo} onSelect={setDateTo} placeholder="To" />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="mr-1 h-3 w-3" /> Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} record(s)</span>
        <span>·</span>
        <span>{totalRemoved} total units removed</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <HistoryIcon className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No removal records</p>
              <p className="text-sm">{hasFilters ? "Try adjusting your filters" : "Removals will appear here"}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Qty Removed</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.timestamp), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.sku}</TableCell>
                      <TableCell className="font-medium">{r.productName}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">-{r.quantityRemoved}</TableCell>
                      <TableCell>
                        <Badge variant={r.reason === "Sold" ? "default" : r.reason === "Damaged" ? "destructive" : "secondary"}>
                          {r.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.note || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
