import { useLiveQuery } from "dexie-react-hooks";
import { db, type InventoryItem } from "@/lib/db";
import { calcVolumeCm3, cm3ToM3, cm3ToFt3, formatNumber, kgToLb } from "@/lib/units";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Weight, Box, Hash, Search, AlertTriangle, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

type SortKey = 'sku' | 'productName' | 'quantity' | 'weight' | 'volume' | 'lastUpdated';
type SortDir = 'asc' | 'desc';

const Dashboard = () => {
  const items = useLiveQuery(() => db.items.toArray()) ?? [];
  const settings = getSettings();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('lastUpdated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = items.filter(i =>
      i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q)
    );
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'sku': cmp = a.sku.localeCompare(b.sku); break;
        case 'productName': cmp = a.productName.localeCompare(b.productName); break;
        case 'quantity': cmp = a.quantity - b.quantity; break;
        case 'weight': cmp = (a.weight ?? 0) - (b.weight ?? 0); break;
        case 'volume': cmp = calcVolumeCm3(a.length ?? 0, a.width ?? 0, a.height ?? 0) - calcVolumeCm3(b.length ?? 0, b.width ?? 0, b.height ?? 0); break;
        case 'lastUpdated': cmp = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [items, search, sortKey, sortDir]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalMassKg = items.reduce((s, i) => s + i.weight * i.quantity, 0);
  const totalVolCm3 = items.reduce((s, i) => s + calcVolumeCm3(i.length, i.width, i.height) * i.quantity, 0);
  const uniqueSkus = items.length;

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your inventory</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Mass</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalMassKg)} kg</div>
            <p className="text-xs text-muted-foreground">{formatNumber(kgToLb(totalMassKg))} lb</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(cm3ToM3(totalVolCm3), 3)} m³</div>
            <p className="text-xs text-muted-foreground">{formatNumber(cm3ToFt3(totalVolCm3), 2)} ft³</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique SKUs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSkus}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Inventory</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by SKU or name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm">Add stock to get started</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortHeader label="SKU" k="sku" /></TableHead>
                    <TableHead><SortHeader label="Product Name" k="productName" /></TableHead>
                    <TableHead className="text-right"><SortHeader label="Qty" k="quantity" /></TableHead>
                    <TableHead className="text-right"><SortHeader label="Weight" k="weight" /></TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead className="text-right"><SortHeader label="Volume" k="volume" /></TableHead>
                    <TableHead><SortHeader label="Updated" k="lastUpdated" /></TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => {
                    const vol = calcVolumeCm3(item.length, item.width, item.height);
                    const isHeavy = item.weight >= settings.heavyThresholdKg;
                    return (
                      <TableRow key={item.id} className={isHeavy ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(item.weight)} kg
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatNumber(item.length)}×{formatNumber(item.width)}×{formatNumber(item.height)} cm
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(cm3ToM3(vol), 4)} m³
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.lastUpdated).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {isHeavy && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Heavy
                            </Badge>
                          )}
                          {item.quantity === 0 && (
                            <Badge variant="outline">Out of Stock</Badge>
                          )}
                        </TableCell>
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
  );
};

export default Dashboard;
