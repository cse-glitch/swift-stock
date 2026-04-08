import { useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type InventoryItem } from "@/lib/db";
import { formatNumber } from "@/lib/units";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Database, Printer, FileDown, FileUp } from "lucide-react";
import Papa from "papaparse";
import { useState } from "react";

const Utilities = () => {
  const items = useLiveQuery(() => db.items.toArray()) ?? [];
  const removals = useLiveQuery(() => db.removals.toArray()) ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Label printing
  const [selectedSku, setSelectedSku] = useState("");
  const selectedItem = items.find(i => i.sku === selectedSku);

  // CSV Import preview
  const [importData, setImportData] = useState<any[] | null>(null);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonExport = async () => {
    const data = { items: await db.items.toArray(), removals: await db.removals.toArray(), exportedAt: new Date().toISOString(), version: 1 };
    downloadFile(JSON.stringify(data, null, 2), `inventory-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    toast({ title: "Backup exported", description: "JSON backup downloaded successfully." });
  };

  const handleCsvExport = () => {
    const csv = Papa.unparse(items.map(i => ({
      SKU: i.sku, ProductName: i.productName, Weight_kg: formatNumber(i.weight),
      Length_cm: formatNumber(i.length), Width_cm: formatNumber(i.width), Height_cm: formatNumber(i.height),
      Quantity: i.quantity, LastUpdated: new Date(i.lastUpdated).toISOString(),
    })));
    downloadFile(csv, `inventory-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    toast({ title: "CSV exported", description: `${items.length} items exported.` });
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setImportData(results.data);
      },
      error: () => toast({ title: "Parse error", description: "Could not parse CSV file.", variant: "destructive" }),
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    if (!importData) return;
    try {
      const toAdd: InventoryItem[] = importData.map((row: any) => ({
        sku: String(row.SKU || row.sku || "").trim(),
        productName: String(row.ProductName || row.productName || row.Name || row.name || "").trim(),
        weight: parseFloat(row.Weight_kg || row.weight || "0") || 0,
        weightUnit: "kg" as const,
        length: parseFloat(row.Length_cm || row.length || "0") || 0,
        width: parseFloat(row.Width_cm || row.width || "0") || 0,
        height: parseFloat(row.Height_cm || row.height || "0") || 0,
        sizeUnit: "cm" as const,
        quantity: parseInt(row.Quantity || row.quantity || "0") || 0,
        lastUpdated: new Date(),
      })).filter(i => i.sku);

      let added = 0, updated = 0;
      await db.transaction("rw", db.items, async () => {
        for (const item of toAdd) {
          const existing = await db.items.where("sku").equals(item.sku).first();
          if (existing) {
            await db.items.update(existing.id!, {
              ...item,
              quantity: existing.quantity + item.quantity,
              lastUpdated: new Date(),
            });
            updated++;
          } else {
            await db.items.add(item);
            added++;
          }
        }
      });

      toast({ title: "Import complete", description: `${added} added, ${updated} updated.` });
      setImportData(null);
    } catch (err: any) {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    }
  };

  const handlePrintLabel = () => {
    if (!selectedItem) return;
    const w = window.open("", "_blank", "width=400,height=300");
    if (!w) return;
    w.document.write(`
      <html><head><title>Label - ${selectedItem.sku}</title>
      <style>
        body { font-family: 'Space Grotesk', sans-serif; padding: 20px; }
        .label { border: 2px solid #000; padding: 16px; max-width: 300px; }
        .sku { font-size: 24px; font-weight: bold; font-family: monospace; }
        .name { font-size: 16px; margin: 8px 0; }
        .details { font-size: 12px; color: #555; }
      </style></head><body>
      <div class="label">
        <div class="sku">${selectedItem.sku}</div>
        <div class="name">${selectedItem.productName}</div>
        <div class="details">
          Weight: ${formatNumber(selectedItem.weight)} kg<br/>
          Dims: ${formatNumber(selectedItem.length)} × ${formatNumber(selectedItem.width)} × ${formatNumber(selectedItem.height)} cm
        </div>
      </div>
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Utilities</h1>
        <p className="text-muted-foreground">Backup, import/export, and print labels</p>
      </div>

      {/* Backup & Export */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              JSON Backup
            </CardTitle>
            <CardDescription>Full database backup as JSON</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleJsonExport} className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileDown className="h-4 w-4" />
              CSV Export
            </CardTitle>
            <CardDescription>Download current stock as CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCsvExport} className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileUp className="h-4 w-4" />
            CSV Import
          </CardTitle>
          <CardDescription>
            Upload a CSV with columns: SKU, ProductName, Weight_kg, Length_cm, Width_cm, Height_cm, Quantity.
            Existing SKUs will have their quantities merged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvFile} />

          {importData && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{importData.length} rows found — preview:</p>
              <div className="max-h-48 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 10).map((row: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{row.SKU || row.sku}</TableCell>
                        <TableCell>{row.ProductName || row.productName || row.Name}</TableCell>
                        <TableCell>{row.Quantity || row.quantity}</TableCell>
                        <TableCell>{row.Weight_kg || row.weight}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleImportConfirm}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import {importData.length} Items
                </Button>
                <Button variant="outline" onClick={() => setImportData(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Label Printing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Printer className="h-4 w-4" />
            Label Printing
          </CardTitle>
          <CardDescription>Select a product and print a label with SKU, name, weight, and dimensions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedSku} onValueChange={setSelectedSku}>
            <SelectTrigger>
              <SelectValue placeholder="Select an item..." />
            </SelectTrigger>
            <SelectContent>
              {items.map(item => (
                <SelectItem key={item.id} value={item.sku}>
                  {item.sku} — {item.productName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedItem && (
            <div className="border-2 border-dashed rounded-lg p-4 space-y-1">
              <div className="font-mono text-xl font-bold">{selectedItem.sku}</div>
              <div className="text-lg">{selectedItem.productName}</div>
              <div className="text-sm text-muted-foreground">
                Weight: {formatNumber(selectedItem.weight)} kg
              </div>
              <div className="text-sm text-muted-foreground">
                Dims: {formatNumber(selectedItem.length)} × {formatNumber(selectedItem.width)} × {formatNumber(selectedItem.height)} cm
              </div>
            </div>
          )}

          <Button onClick={handlePrintLabel} disabled={!selectedItem} variant="outline" className="w-full">
            <Printer className="mr-2 h-4 w-4" />
            Print Label
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Utilities;
