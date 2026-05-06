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
import { Download, Upload, Database, Printer, FileDown, FileUp, AlertTriangle, FileSpreadsheet, Trash2, Scale } from "lucide-react";
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

  // ── Duplicate Finder ──
  const duplicates = useMemo(() => {
    const skuMap = new Map<string, typeof variants[0][]>();
    variants.forEach(v => {
      const p = products.find(p => p.id === v.productId);
      if (!p) return;
      const key = `${p.businessId}::${v.sku}`;
      if (!skuMap.has(key)) skuMap.set(key, []);
      skuMap.get(key)!.push(v);
    });
    return Array.from(skuMap.values()).filter(group => group.length > 1);
  }, [variants, products]);

  // ── Orphaned Data Cleanup ──
  const orphanedVariants = variants.filter(v => !products.some(p => p.id === v.productId));
  const logs = useLiveQuery(() => db.inventoryLog.toArray()) ?? [];
  const orphanedLogs = logs.filter(l => !products.some(p => p.id === l.productId));

  const handleExportIssues = () => {
    const rows: any[] = [];
    
    // Add duplicates
    duplicates.forEach(group => {
      group.forEach(v => {
        const p = products.find(p => p.id === v.productId);
        rows.push({ Type: 'Duplicate SKU', BusinessID: p?.businessId, Product: p?.name, Variant: v.name, SKU: v.sku, ID: v.id });
      });
    });

    // Add orphans
    orphanedVariants.forEach(v => {
      rows.push({ Type: 'Orphaned Variant', BusinessID: 'N/A', Product: 'N/A', Variant: v.name, SKU: v.sku, ID: v.id });
    });

    if (rows.length === 0) {
      toast({ title: "No issues found", description: "Your database is clean." });
      return;
    }

    downloadFile(Papa.unparse(rows), `inventory-issues-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    toast({ title: "Issues exported", description: `${rows.length} issues exported to CSV.` });
  };

  const handleCleanupOrphans = async () => {
    try {
      await db.transaction('rw', [db.variants, db.inventoryLog], async () => {
        if (orphanedVariants.length > 0) {
          const vIds = orphanedVariants.map(v => v.id!);
          await db.variants.bulkDelete(vIds);
        }
        if (orphanedLogs.length > 0) {
          const lIds = orphanedLogs.map(l => l.id!);
          await db.inventoryLog.bulkDelete(lIds);
        }
      });
      toast({ title: "Cleanup complete", description: `Removed ${orphanedVariants.length} variants and ${orphanedLogs.length} logs.` });
    } catch (err: any) {
      toast({ title: "Cleanup failed", description: err.message, variant: "destructive" });
    }
  };

  // ── Stock Reconciliation ──
  const [reconBizId, setReconBizId] = useState<string>("all");
  const [physicalCounts, setPhysicalCounts] = useState<Record<number, string>>({});

  const reconVariants = variants.filter(v => {
    const p = products.find(p => p.id === v.productId);
    if (!p) return false;
    if (reconBizId !== "all" && p.businessId.toString() !== reconBizId) return false;
    return true;
  });

  const handleReconcile = async () => {
    const updates: { variantId: number; oldStock: number; newStock: number; diff: number; pId: number; bId: number }[] = [];
    
    for (const [vIdStr, countStr] of Object.entries(physicalCounts)) {
      if (countStr.trim() === '') continue;
      const count = parseInt(countStr);
      if (isNaN(count) || count < 0) continue;

      const vId = parseInt(vIdStr);
      const v = variants.find(vx => vx.id === vId);
      if (!v) continue;
      
      const p = products.find(px => px.id === v.productId);
      if (!p) continue;

      const diff = count - v.stock;
      if (diff !== 0) {
        updates.push({ variantId: vId, oldStock: v.stock, newStock: count, diff, pId: p.id!, bId: p.businessId });
      }
    }

    if (updates.length === 0) {
      toast({ title: "No changes", description: "No stock discrepancies to reconcile." });
      return;
    }

    try {
      await db.transaction('rw', [db.variants, db.inventoryLog], async () => {
        for (const u of updates) {
          await db.variants.update(u.variantId, { stock: u.newStock });
          await db.inventoryLog.add({
            businessId: u.bId,
            productId: u.pId,
            variantId: u.variantId,
            type: u.diff > 0 ? 'add' : 'remove',
            quantity: Math.abs(u.diff),
            reason: 'Reconciliation',
            note: `Physical count override (was ${u.oldStock}, now ${u.newStock})`,
            timestamp: new Date()
          });
        }
      });
      toast({ title: "Reconciliation applied", description: `Updated stock for ${updates.length} items.` });
      setPhysicalCounts({});
    } catch (err: any) {
      toast({ title: "Reconciliation failed", description: err.message, variant: "destructive" });
    }
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
      {/* Stock Reconciliation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4" />Stock Reconciliation</CardTitle>
          <CardDescription>Enter physical counts to automatically correct stock levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={reconBizId} onValueChange={setReconBizId}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue placeholder="Filter by Business" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businesses.map(b => (
                <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="max-h-[400px] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">System Stock</TableHead>
                  <TableHead className="w-[150px]">Physical Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconVariants.map(v => {
                  const p = products.find(px => px.id === v.productId);
                  const b = businesses.find(bx => bx.id === p?.businessId);
                  const isChanged = physicalCounts[v.id!] !== undefined && physicalCounts[v.id!] !== '' && parseInt(physicalCounts[v.id!]) !== v.stock;
                  
                  return (
                    <TableRow key={v.id} className={isChanged ? "bg-warning/10" : ""}>
                      <TableCell>
                        <div className="font-medium text-sm">{p?.name}</div>
                        <div className="text-xs text-muted-foreground">{b?.name} • {v.name}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{v.sku}</TableCell>
                      <TableCell className="text-right font-mono">{v.stock}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min="0"
                          className="h-8 text-right font-mono"
                          placeholder={v.stock.toString()}
                          value={physicalCounts[v.id!] ?? ""}
                          onChange={(e) => setPhysicalCounts({ ...physicalCounts, [v.id!]: e.target.value })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={handleReconcile} disabled={Object.keys(physicalCounts).length === 0}>
              Apply Reconciliation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Maintenance */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-destructive"><Trash2 className="h-4 w-4" />Data Maintenance</CardTitle>
              <CardDescription>Clean up disconnected records and find duplicates</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportIssues} className="h-8">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Issues
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4 border-destructive/10">
            <div className="text-sm">
              <p className="font-medium">Orphaned Records</p>
              <p className="text-muted-foreground">Variants or logs without a parent product</p>
              <p className="mt-1 font-mono text-xs">Variants: {orphanedVariants.length} | Logs: {orphanedLogs.length}</p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleCleanupOrphans}
              disabled={orphanedVariants.length === 0 && orphanedLogs.length === 0}
            >
              Clean Up Records
            </Button>
          </div>

          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium">Duplicate SKUs</p>
              <p className="text-muted-foreground">Multiple variants with the same SKU in the same business</p>
              <p className="mt-1 font-mono text-xs">Duplicate Groups: {duplicates.length}</p>
            </div>
            
            {duplicates.length > 0 && (
              <div className="max-h-48 overflow-auto border rounded-md bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Occurrences</TableHead>
                      <TableHead>Variants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicates.map((group, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{group[0].sku}</TableCell>
                        <TableCell className="text-xs">{group.length}</TableCell>
                        <TableCell className="text-xs">
                          {group.map(v => {
                            const p = products.find(p => p.id === v.productId);
                            return `${p?.name} (${v.name})`;
                          }).join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Utilities;
