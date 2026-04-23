import { useRef, useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Product, type Variant } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { normalizeSku, validateSkuFormat } from "@/lib/sku-validation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Database, Printer, FileDown, FileUp, AlertTriangle, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportRow {
  business_slug: string;
  category: string;
  product_name: string;
  product_sku: string;
  variant_name: string;
  variant_sku: string;
  price: string;
  stock: string;
  low_stock_threshold: string;
  [key: string]: string;
}

interface ImportError {
  row: number;
  sku: string;
  name: string;
  error: string;
}

const Utilities = () => {
  const { businesses, activeBusinessId } = useBusiness();
  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Label printing state
  const [selectedProductId, setSelectedProductId] = useState("");
  const selectedProduct = products.find(p => p.id?.toString() === selectedProductId);
  const selectedVariants = variants.filter(v => v.productId === selectedProduct?.id);

  // Bulk import state
  const [importData, setImportData] = useState<ImportRow[] | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [restoreData, setRestoreData] = useState<any>(null);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── JSON Backup (full schema) ──
  const handleJsonExport = async () => {
    const data = {
      businesses: await db.businesses.toArray(),
      categories: await db.categories.toArray(),
      products: await db.products.toArray(),
      variants: await db.variants.toArray(),
      inventoryLog: await db.inventoryLog.toArray(),
      propertyListings: await db.propertyListings.toArray(),
      services: await db.services.toArray(),
      exportedAt: new Date().toISOString(),
      version: 3,
    };
    downloadFile(JSON.stringify(data, null, 2), `saman-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    toast({ title: "Backup exported", description: "Full database backup downloaded." });
  };

  // ── JSON Restore ──
  const handleJsonFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setRestoreData(data);
      } catch {
        toast({ title: "Invalid file", description: "Could not parse JSON backup.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleJsonRestore = async () => {
    if (!restoreData) return;
    try {
      await db.transaction("rw", [db.businesses, db.categories, db.products, db.variants, db.inventoryLog, db.propertyListings, db.services], async () => {
        if (restoreData.businesses) { await db.businesses.clear(); await db.businesses.bulkAdd(restoreData.businesses); }
        if (restoreData.categories) { await db.categories.clear(); await db.categories.bulkAdd(restoreData.categories); }
        if (restoreData.products) { await db.products.clear(); await db.products.bulkAdd(restoreData.products); }
        if (restoreData.variants) { await db.variants.clear(); await db.variants.bulkAdd(restoreData.variants); }
        if (restoreData.inventoryLog) { await db.inventoryLog.clear(); await db.inventoryLog.bulkAdd(restoreData.inventoryLog); }
        if (restoreData.propertyListings) { await db.propertyListings.clear(); await db.propertyListings.bulkAdd(restoreData.propertyListings); }
        if (restoreData.services) { await db.services.clear(); await db.services.bulkAdd(restoreData.services); }
      });
      toast({ title: "Backup restored", description: "All data has been restored from backup." });
      setRestoreData(null);
    } catch (err: any) {
      toast({ title: "Restore error", description: err.message, variant: "destructive" });
    }
  };

  // ── CSV Export (products + variants) ──
  const handleCsvExport = () => {
    const rows = products.flatMap(p => {
      const pVariants = variants.filter(v => v.productId === p.id);
      const biz = businesses.find(b => b.id === p.businessId);
      if (pVariants.length === 0) {
        return [{ Business: biz?.slug ?? "", Product: p.name, "Product SKU": p.sku, Variant: "", "Variant SKU": "", Price: p.basePrice ?? "", Stock: 0, Status: p.status }];
      }
      return pVariants.map(v => ({
        Business: biz?.slug ?? "", Product: p.name, "Product SKU": p.sku,
        Variant: v.name, "Variant SKU": v.sku, Price: v.price ?? p.basePrice ?? "",
        Stock: v.stock, Status: p.status,
      }));
    });
    downloadFile(Papa.unparse(rows), `products-export-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    toast({ title: "CSV exported", description: `${rows.length} rows exported.` });
  };

  // ── Template Download ──
  const handleDownloadTemplate = () => {
    const template = [
      { business_slug: "kenakata", category: "Electronics", product_name: "Wireless Mouse", product_sku: "WM-001", variant_name: "Black", variant_sku: "WM-001-BLK", price: "25.99", stock: "100", low_stock_threshold: "10" },
      { business_slug: "kenakata", category: "Electronics", product_name: "Wireless Mouse", product_sku: "WM-001", variant_name: "White", variant_sku: "WM-001-WHT", price: "25.99", stock: "50", low_stock_threshold: "10" },
    ];
    downloadFile(Papa.unparse(template), "import-template.csv", "text/csv");
    toast({ title: "Template downloaded", description: "Fill in the template and upload it back." });
  };

  // ── Bulk Import ──
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportErrors([]);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target?.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });
        validateAndSetImport(rows);
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse<ImportRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => validateAndSetImport(results.data),
        error: () => toast({ title: "Parse error", description: "Could not parse file.", variant: "destructive" }),
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateAndSetImport = async (rows: ImportRow[]) => {
    const errors: ImportError[] = [];
    const seenSkus = new Set<string>();
    const bizSlugs = new Set(businesses.map(b => b.slug));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header

      if (!row.product_name?.trim()) { errors.push({ row: rowNum, sku: row.product_sku || "", name: "", error: "Missing product name" }); continue; }
      if (!row.product_sku?.trim()) { errors.push({ row: rowNum, sku: "", name: row.product_name, error: "Missing product SKU" }); continue; }
      if (!row.variant_sku?.trim()) { errors.push({ row: rowNum, sku: row.product_sku, name: row.product_name, error: "Missing variant SKU" }); continue; }
      if (!row.business_slug?.trim() || !bizSlugs.has(row.business_slug.trim())) {
        errors.push({ row: rowNum, sku: row.product_sku, name: row.product_name, error: `Unknown business slug: "${row.business_slug}"` }); continue;
      }

      const pSku = normalizeSku(row.product_sku);
      const vSku = normalizeSku(row.variant_sku);

      const pErr = validateSkuFormat(pSku);
      if (pErr) { errors.push({ row: rowNum, sku: pSku, name: row.product_name, error: `Product SKU: ${pErr}` }); continue; }
      const vErr = validateSkuFormat(vSku);
      if (vErr) { errors.push({ row: rowNum, sku: vSku, name: row.product_name, error: `Variant SKU: ${vErr}` }); continue; }

      if (seenSkus.has(vSku)) { errors.push({ row: rowNum, sku: vSku, name: row.product_name, error: "Duplicate variant SKU in file" }); continue; }
      seenSkus.add(vSku);

      // Check DB for existing variant SKU in same business
      const biz = businesses.find(b => b.slug === row.business_slug.trim());
      if (biz) {
        const existingVariant = await db.variants.where("sku").equals(vSku).first();
        if (existingVariant) {
          const existingProduct = await db.products.get(existingVariant.productId);
          if (existingProduct && existingProduct.businessId === biz.id) {
            errors.push({ row: rowNum, sku: vSku, name: row.product_name, error: `Variant SKU already exists in ${biz.name}` });
            continue;
          }
        }
      }
    }

    setImportErrors(errors);
    setImportData(rows);

    if (errors.length > 0) {
      toast({ title: "Validation issues found", description: `${errors.length} rows have problems. Review below.`, variant: "destructive" });
    }
  };

  const validRows = useMemo(() => {
    if (!importData) return [];
    const errorRowNums = new Set(importErrors.map(e => e.row));
    return importData.filter((_, i) => !errorRowNums.has(i + 2));
  }, [importData, importErrors]);

  const handleImportConfirm = async () => {
    if (validRows.length === 0) {
      toast({ title: "No valid rows", description: "Fix errors before importing.", variant: "destructive" });
      return;
    }

    try {
      // Group by product_sku
      const productGroups = new Map<string, ImportRow[]>();
      for (const row of validRows) {
        const key = `${row.business_slug.trim()}::${normalizeSku(row.product_sku)}`;
        if (!productGroups.has(key)) productGroups.set(key, []);
        productGroups.get(key)!.push(row);
      }

      let productsCreated = 0, variantsCreated = 0, totalStock = 0;

      await db.transaction("rw", db.products, db.variants, db.categories, db.inventoryLog, async () => {
        for (const [, rows] of productGroups) {
          const first = rows[0];
          const biz = businesses.find(b => b.slug === first.business_slug.trim())!;

          // Find or create category
          let categoryId: number | undefined;
          if (first.category?.trim()) {
            let cat = await db.categories.where({ businessId: biz.id!, name: first.category.trim() }).first();
            if (!cat) {
              categoryId = await db.categories.add({ businessId: biz.id!, name: first.category.trim() });
            } else {
              categoryId = cat.id;
            }
          }

          // Create product
          const productId = await db.products.add({
            businessId: biz.id!,
            categoryId,
            name: first.product_name.trim(),
            sku: normalizeSku(first.product_sku),
            type: "physical",
            currency: "USD",
            tags: [],
            attributes: {},
            status: "active",
            isSeasonal: false,
            expiryTracking: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          productsCreated++;

          // Create variants
          for (const row of rows) {
            const stock = parseInt(row.stock) || 0;
            const variantId = await db.variants.add({
              productId,
              name: row.variant_name?.trim() || "Default",
              sku: normalizeSku(row.variant_sku),
              attributes: {},
              price: parseFloat(row.price) || undefined,
              stock,
              lowStockThreshold: parseInt(row.low_stock_threshold) || 5,
            });
            variantsCreated++;
            totalStock += stock;

            if (stock > 0) {
              await db.inventoryLog.add({
                productId,
                variantId,
                businessId: biz.id!,
                type: "add",
                quantity: stock,
                reason: "Restock",
                note: `Bulk import from ${importFileName}`,
                timestamp: new Date(),
              });
            }
          }
        }
      });

      toast({ title: "Import complete", description: `${productsCreated} products, ${variantsCreated} variants, ${totalStock} total stock.` });
      setImportData(null);
      setImportErrors([]);
    } catch (err: any) {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    }
  };

  const downloadErrorReport = () => {
    if (importErrors.length === 0) return;
    const csv = Papa.unparse(importErrors.map(e => ({ Row: e.row, SKU: e.sku, Name: e.name, Error: e.error })));
    downloadFile(csv, `import-errors-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
  };

  // ── Label Printing ──
  const handlePrintLabel = (variant?: typeof selectedVariants[0]) => {
    if (!selectedProduct) return;
    const v = variant ?? selectedVariants[0];
    const w = window.open("", "_blank", "width=400,height=300");
    if (!w) return;
    w.document.write(`
      <html><head><title>Label - ${v?.sku ?? selectedProduct.sku}</title>
      <style>
        body { font-family: 'Space Grotesk', sans-serif; padding: 20px; }
        .label { border: 2px solid #000; padding: 16px; max-width: 300px; }
        .sku { font-size: 24px; font-weight: bold; font-family: monospace; }
        .name { font-size: 16px; margin: 8px 0; }
        .variant { font-size: 14px; color: #333; }
        .details { font-size: 12px; color: #555; margin-top: 4px; }
      </style></head><body>
      <div class="label">
        <div class="sku">${v?.sku ?? selectedProduct.sku}</div>
        <div class="name">${selectedProduct.name}</div>
        ${v ? `<div class="variant">Variant: ${v.name}</div>` : ""}
        ${v?.price ? `<div class="details">Price: $${v.price.toFixed(2)}</div>` : ""}
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
        <p className="text-muted-foreground">Backup, import/export, bulk upload, and print labels</p>
      </div>

      {/* Backup & Export */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" />JSON Backup</CardTitle>
            <CardDescription>Full database backup (all tables)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleJsonExport} className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export Backup
            </Button>
            <div className="space-y-2">
              <Input type="file" accept=".json" onChange={handleJsonFileSelect} />
              {restoreData && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" /> Restore from Backup
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restore backup?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will replace all existing data with the backup contents:
                        {restoreData.products && ` ${restoreData.products.length} products,`}
                        {restoreData.variants && ` ${restoreData.variants.length} variants,`}
                        {restoreData.inventoryLog && ` ${restoreData.inventoryLog.length} logs.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setRestoreData(null)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleJsonRestore}>Yes, restore</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileDown className="h-4 w-4" />CSV Export</CardTitle>
            <CardDescription>Products with variants and stock levels</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCsvExport} className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Import (CSV / Excel)
          </CardTitle>
          <CardDescription>
            Upload a CSV or .xlsx file to create products, variants, and set initial stock in one step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-1 h-3 w-3" /> Download Template
            </Button>
            <Input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} className="flex-1 min-w-[200px]" />
          </div>

          {importErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <p className="text-sm font-medium text-destructive">{importErrors.length} rows have errors</p>
              </div>
              <div className="max-h-32 overflow-auto border rounded-md">
                <Table>
                  <TableHeader><TableRow><TableHead>Row</TableHead><TableHead>SKU</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {importErrors.slice(0, 10).map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{e.row}</TableCell>
                        <TableCell className="font-mono text-xs">{e.sku}</TableCell>
                        <TableCell className="text-xs text-destructive">{e.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {importErrors.length > 10 && <p className="text-xs text-muted-foreground">...and {importErrors.length - 10} more</p>}
              <Button variant="destructive" size="sm" onClick={downloadErrorReport}>
                <Download className="mr-1 h-3 w-3" /> Download Error Report
              </Button>
            </div>
          )}

          {importData && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{importData.length} total rows</Badge>
                <Badge variant="default">{validRows.length} valid</Badge>
                {importErrors.length > 0 && <Badge variant="destructive">{importErrors.length} errors</Badge>}
              </div>
              <div className="max-h-48 overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 20).map((row, i) => {
                      const hasError = importErrors.some(e => e.row === i + 2);
                      return (
                        <TableRow key={i} className={hasError ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs">{row.business_slug}</TableCell>
                          <TableCell className="text-sm">{row.product_name}</TableCell>
                          <TableCell className="font-mono text-xs">{row.product_sku}</TableCell>
                          <TableCell className="text-xs">{row.variant_name} ({row.variant_sku})</TableCell>
                          <TableCell className="text-sm">{row.stock}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleImportConfirm} disabled={validRows.length === 0}>
                  <Upload className="mr-2 h-4 w-4" /> Import {validRows.length} Valid Row(s)
                </Button>
                <Button variant="outline" onClick={() => { setImportData(null); setImportErrors([]); }}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Label Printing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Printer className="h-4 w-4" />Label Printing</CardTitle>
          <CardDescription>Select a product and print labels for its variants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger><SelectValue placeholder="Select a product..." /></SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id!.toString()}>
                  {p.sku} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProduct && (
            <div className="space-y-3">
              {selectedVariants.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-4 space-y-1">
                  <div className="font-mono text-xl font-bold">{selectedProduct.sku}</div>
                  <div className="text-lg">{selectedProduct.name}</div>
                </div>
              ) : (
                selectedVariants.map(v => (
                  <div key={v.id} className="border-2 border-dashed rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-lg font-bold">{v.sku}</div>
                      <div className="text-sm">{selectedProduct.name} — {v.name}</div>
                      {v.price != null && <div className="text-xs text-muted-foreground">Price: ${v.price.toFixed(2)}</div>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handlePrintLabel(v)}>
                      <Printer className="mr-1 h-3 w-3" /> Print
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Utilities;
