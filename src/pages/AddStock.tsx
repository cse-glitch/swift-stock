import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ProductType } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PackagePlus, Search, Upload, ExternalLink, AlertCircle, PackageMinus, Download, FileWarning, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const getTemplateColumns = (businessType: string) => {
  const base = ['Product SKU', 'Product Name', 'Category', 'Base Price'];
  const physicalBase = [...base, 'Variant SKU', 'Variant Name', 'Stock', 'Low Stock Threshold'];
  const propertiesBase = [...base, 'Listing Type', 'Location', 'Area', 'Bedrooms', 'Bathrooms', 'Availability'];
  const servicesBase = [...base, 'Duration', 'Capacity', 'Available Days'];

  switch (businessType) {
    case 'fashion': return [...physicalBase, 'Material', 'Color', 'Size'];
    case 'lubricants': return [...physicalBase, 'Grade', 'Volume'];
    case 'agro': return [...physicalBase, 'Origin', 'Weight'];
    case 'properties': return propertiesBase;
    case 'services': return servicesBase;
    default: return [...physicalBase, 'Brand', 'Material', 'Color']; // general
  }
};

const AddStock = () => {
  const { businesses, activeBusinessId } = useBusiness();
  const activeBusinesses = businesses.filter(b => b.isActive);

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(activeBusinessId);
  const bizId = selectedBusinessId ?? activeBusinessId;
  const selectedBusiness = businesses.find(b => b.id === bizId);

  const products = useLiveQuery(() =>
    bizId ? db.products.where('businessId').equals(bizId).toArray() : db.products.toArray()
  , [bizId]) ?? [];

  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [note, setNote] = useState("");
  
  // File Upload State
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{row: number, message: string}[]>([]);
  const [validatedData, setValidatedData] = useState<any[] | null>(null);

  const { toast } = useToast();

  const stockItems = useMemo(() => {
    const q = search.toLowerCase();
    return products.flatMap(p => {
      const pVariants = variants.filter(v => v.productId === p.id);
      if (pVariants.length === 0) return [];
      return pVariants.map(v => ({
        product: p,
        variant: v,
        label: pVariants.length === 1 ? p.name : `${p.name} — ${v.name}`,
      }));
    }).filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.variant.sku.toLowerCase().includes(q) ||
      item.product.sku.toLowerCase().includes(q)
    );
  }, [products, variants, search]);

  const setQty = (variantId: string, qty: number) => {
    setQuantities(prev => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(variantId);
      else next.set(variantId, qty);
      return next;
    });
  };

  const pendingItems = useMemo(() =>
    Array.from(quantities.entries())
      .map(([vid, qty]) => {
        const item = stockItems.find(s => s.variant.id === vid);
        if (!item) return null;
        return { ...item, addQty: qty };
      })
      .filter(Boolean) as (typeof stockItems[number] & { addQty: number })[]
  , [quantities, stockItems]);

  const handleConfirm = async () => {
    if (pendingItems.length === 0) {
      toast({ title: "Nothing to add", description: "Set a quantity for at least one item.", variant: "destructive" });
      return;
    }

    try {
      await db.transaction("rw", db.variants, db.inventoryLog, async () => {
        for (const item of pendingItems) {
          const v = await db.variants.get(item.variant.id!);
          if (!v) continue;
          await db.variants.update(item.variant.id!, { stock: v.stock + item.addQty });
          await db.inventoryLog.add({
            productId: item.product.id!,
            variantId: item.variant.id!,
            businessId: item.product.businessId,
            type: 'add',
            quantity: item.addQty,
            reason: 'Restock',
            note: note.trim() || undefined,
            timestamp: new Date(),
          });
        }
      });

      const totalAdded = pendingItems.reduce((s, i) => s + i.addQty, 0);
      toast({
        title: "Stock added",
        description: `Added ${totalAdded} units across ${pendingItems.length} variant(s).`,
      });
      setQuantities(new Map());
      setNote("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const downloadTemplate = () => {
    if (!selectedBusiness) return;
    const cols = getTemplateColumns(selectedBusiness.type);
    const csvStr = Papa.unparse([cols]);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBusiness.slug}_stock_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedBusiness) {
      toast({ title: "Select a business", description: "Please select a specific business before uploading.", variant: "destructive" });
      e.target.value = '';
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'csv' && fileExt !== 'xlsx' && fileExt !== 'xls') {
      toast({ title: "Invalid file", description: "Only .csv and .xlsx files are allowed.", variant: "destructive" });
      e.target.value = '';
      return;
    }

    try {
      let rawData: any[] = [];
      if (fileExt === 'csv') {
        rawData = await new Promise<any[]>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error),
          });
        });
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rawData = XLSX.utils.sheet_to_json(worksheet);
      }

      // Validation
      const expectedCols = getTemplateColumns(selectedBusiness.type);
      const errors: {row: number, message: string}[] = [];
      const parsedData: any[] = [];
      
      if (rawData.length === 0) {
        errors.push({ row: 0, message: "File is empty or could not be read." });
      } else {
        const actualCols = Object.keys(rawData[0]);
        const missingCols = expectedCols.filter(c => !actualCols.find(a => a.toLowerCase().trim() === c.toLowerCase().trim()));
        if (missingCols.length > 0) {
          errors.push({ row: 0, message: `Missing required columns: ${missingCols.join(', ')}` });
        }
      }

      const seenVariantSkus = new Set<string>();

      if (errors.length === 0) {
        rawData.forEach((row, idx) => {
          const rowNum = idx + 2; // +1 for 0-index, +1 for header
          const getVal = (col: string) => {
            const key = Object.keys(row).find(k => k.toLowerCase().trim() === col.toLowerCase().trim());
            return key ? row[key] : undefined;
          };

          const productSku = getVal('Product SKU');
          const productName = getVal('Product Name');
          const category = getVal('Category');
          const basePrice = getVal('Base Price');

          if (!productSku) errors.push({ row: rowNum, message: "Missing Product SKU" });
          if (!productName) errors.push({ row: rowNum, message: "Missing Product Name" });
          if (!category) errors.push({ row: rowNum, message: "Missing Category" });
          
          const priceVal = parseFloat(String(basePrice));
          if (isNaN(priceVal) || priceVal < 0) errors.push({ row: rowNum, message: "Invalid Base Price (must be a positive number)" });

          if (selectedBusiness.type !== 'properties' && selectedBusiness.type !== 'services') {
            const variantSku = getVal('Variant SKU');
            const stock = parseInt(String(getVal('Stock')), 10);
            const lowStock = parseInt(String(getVal('Low Stock Threshold')), 10);

            if (!variantSku) errors.push({ row: rowNum, message: "Missing Variant SKU" });
            else {
              const vSkuStr = String(variantSku).trim().toLowerCase();
              if (seenVariantSkus.has(vSkuStr)) {
                errors.push({ row: rowNum, message: `Duplicate Variant SKU in file: ${variantSku}` });
              }
              seenVariantSkus.add(vSkuStr);
            }

            if (isNaN(stock) || stock < 0) errors.push({ row: rowNum, message: "Invalid Stock (must be a positive number)" });
            if (isNaN(lowStock) || lowStock < 0) errors.push({ row: rowNum, message: "Invalid Low Stock Threshold" });
          }
          
          parsedData.push(row);
        });
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
        setValidatedData(null);
      } else {
        setValidationErrors([]);
        setValidatedData(parsedData);
      }
      setIsUploadDialogOpen(true);

    } catch (error: any) {
      toast({ title: "Parsing failed", description: error.message, variant: "destructive" });
    } finally {
      e.target.value = '';
    }
  };

  const confirmUpload = async () => {
    if (!validatedData || !selectedBusiness) return;
    try {
      await db.transaction('rw', [db.categories, db.products, db.variants, db.propertyListings, db.services, db.inventoryLog], async () => {
        for (const row of validatedData) {
          const getVal = (col: string) => {
            const key = Object.keys(row).find(k => k.toLowerCase().trim() === col.toLowerCase().trim());
            return key ? row[key] : undefined;
          };
          
          const categoryName = String(getVal('Category')).trim();
          let category = await db.categories.where({ businessId: selectedBusiness.id!, name: categoryName }).first();
          if (!category) {
            const catId = await db.categories.add({ businessId: selectedBusiness.id!, name: categoryName });
            category = { id: catId as number, businessId: selectedBusiness.id!, name: categoryName };
          }

          const productSku = String(getVal('Product SKU')).trim();
          let product = await db.products.where('sku').equals(productSku).first();
          
          let productType: ProductType = 'physical';
          if (selectedBusiness.type === 'properties') productType = 'listing';
          if (selectedBusiness.type === 'services') productType = 'service';

          const basePrice = parseFloat(String(getVal('Base Price')));
          const attributes: Record<string, any> = {};
          
          const standardCols = getTemplateColumns(selectedBusiness.type).map(c => c.toLowerCase().trim());
          Object.keys(row).forEach(k => {
             if (!standardCols.includes(k.toLowerCase().trim())) {
                attributes[k] = row[k];
             }
          });

          if (!product) {
            const pid = await db.products.add({
              businessId: selectedBusiness.id!,
              categoryId: category.id!,
              name: String(getVal('Product Name')).trim(),
              sku: productSku,
              type: productType,
              basePrice: basePrice,
              currency: 'BDT',
              tags: [],
              attributes: productType === 'physical' ? {} : attributes,
              status: 'active',
              isSeasonal: false,
              expiryTracking: false,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            product = await db.products.get(pid as number);
          }

          if (productType === 'physical') {
             const variantSku = String(getVal('Variant SKU')).trim();
             let variant = await db.variants.where('sku').equals(variantSku).first();
             const stockQty = parseInt(String(getVal('Stock')), 10) || 0;
             const lowStock = parseInt(String(getVal('Low Stock Threshold')), 10) || 5;
             
             const vAttr: Record<string, any> = {};
             if (selectedBusiness.type === 'fashion') {
               if(getVal('Material')) vAttr.material = getVal('Material');
               if(getVal('Color')) vAttr.color = getVal('Color');
               if(getVal('Size')) vAttr.size = getVal('Size');
             } else if (selectedBusiness.type === 'lubricants') {
               if(getVal('Grade')) vAttr.grade = getVal('Grade');
               if(getVal('Volume')) vAttr.volume = getVal('Volume');
             } else if (selectedBusiness.type === 'agro') {
               if(getVal('Origin')) vAttr.origin = getVal('Origin');
               if(getVal('Weight')) vAttr.weight = getVal('Weight');
             } else {
               if(getVal('Brand')) vAttr.brand = getVal('Brand');
               if(getVal('Material')) vAttr.material = getVal('Material');
               if(getVal('Color')) vAttr.color = getVal('Color');
             }
             Object.keys(attributes).forEach(k => vAttr[k] = attributes[k]);

             let diff = 0;
             if (!variant) {
               await db.variants.add({
                 productId: product!.id!,
                 name: String(getVal('Variant Name')).trim(),
                 sku: variantSku,
                 attributes: vAttr,
                 stock: stockQty,
                 lowStockThreshold: lowStock
               });
               diff = stockQty;
             } else {
               diff = stockQty - variant.stock;
               await db.variants.update(variant.id!, {
                 stock: stockQty,
                 lowStockThreshold: lowStock,
                 attributes: { ...variant.attributes, ...vAttr }
               });
             }

             if (diff !== 0) {
                const addedVariant = await db.variants.where('sku').equals(variantSku).first();
                await db.inventoryLog.add({
                  productId: product!.id!,
                  variantId: addedVariant!.id!,
                  businessId: selectedBusiness.id!,
                  type: diff > 0 ? 'add' : 'remove',
                  quantity: Math.abs(diff),
                  reason: 'Bulk Upload/Update',
                  timestamp: new Date()
                });
             }
          } else if (productType === 'listing') {
             let listing = await db.propertyListings.where('productId').equals(product!.id!).first();
             if (!listing) {
               await db.propertyListings.add({
                 productId: product!.id!,
                 listingType: String(getVal('Listing Type')).toLowerCase() as any || 'sale',
                 location: String(getVal('Location')),
                 area: parseFloat(String(getVal('Area'))),
                 bedrooms: parseInt(String(getVal('Bedrooms'))),
                 bathrooms: parseInt(String(getVal('Bathrooms'))),
                 availability: String(getVal('Availability')).toLowerCase() as any || 'available'
               });
             }
          } else if (productType === 'service') {
             let service = await db.services.where('productId').equals(product!.id!).first();
             if (!service) {
               const days = String(getVal('Available Days')).split(',').map(d => d.trim());
               await db.services.add({
                 productId: product!.id!,
                 duration: String(getVal('Duration')),
                 capacity: parseInt(String(getVal('Capacity'))),
                 currentBookings: 0,
                 availableDays: days
               });
             }
          }
        }
      });
      toast({ title: "Success", description: "Products and stock updated successfully from file." });
      setIsUploadDialogOpen(false);
      setValidatedData(null);
    } catch (err: any) {
      toast({ title: "Database Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Stock</h1>
          <p className="text-muted-foreground">Search for products and add quantities to their variants</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link to="/remove">
            <PackageMinus className="h-4 w-4" />
            Remove Stock
          </Link>
        </Button>
      </div>

      {/* Business filter */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <Select
            value={bizId || "all"}
            onValueChange={v => setSelectedBusinessId(v === "all" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Businesses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {activeBusinesses.map(b => (
                <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!bizId && (
            <p className="text-xs text-muted-foreground mt-2">Select a business to download template and enable file upload.</p>
          )}
        </div>
        
        {bizId && (
          <Button variant="outline" onClick={downloadTemplate} className="gap-2 shrink-0">
            <Download className="w-4 h-4" />
            Template
          </Button>
        )}

        <div>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            id="stock-upload"
            onChange={handleFileUpload}
            disabled={!bizId}
          />
          <Label htmlFor="stock-upload" className={!bizId ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
            <div className={`flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md h-10 ${!bizId ? "" : "hover:bg-primary/90"}`}>
              <Upload className="w-4 h-4" />
              Upload
            </div>
          </Label>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {stockItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <PackagePlus className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">{search ? "No matching products" : "No products found"}</p>
              <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-sm">Create products first in the Products page</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link to="/products" className="gap-2">
                    <ExternalLink className="h-3 w-3" />
                    Go to Products
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          stockItems.map(item => {
            const qty = quantities.get(item.variant.id!) ?? 0;
            return (
              <Card key={item.variant.id} className={qty > 0 ? "ring-2 ring-primary/30" : ""}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.label}</span>
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{item.variant.sku}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Current stock: <span className="font-semibold text-foreground">{item.variant.stock}</span>
                      {item.variant.stock <= item.variant.lowStockThreshold && item.variant.stock > 0 && (
                        <span className="text-warning ml-2">⚠ Low</span>
                      )}
                      {item.variant.stock === 0 && (
                        <span className="text-destructive ml-2">Out of stock</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => setQty(item.variant.id!, Math.max(0, qty - 1))}
                      disabled={qty === 0}
                    >
                      <span className="text-sm font-bold">−</span>
                    </Button>
                    <Input
                      type="number" min={0}
                      value={qty || ""}
                      onChange={e => setQty(item.variant.id!, Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 text-center h-8"
                    />
                    <Button
                      variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => setQty(item.variant.id!, qty + 1)}
                    >
                      <span className="text-sm font-bold">+</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Confirm panel */}
      {pendingItems.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Confirm Addition</CardTitle>
            <CardDescription>{pendingItems.length} variant(s) selected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              {pendingItems.map(item => (
                <div key={item.variant.id} className="flex justify-between">
                  <span>{item.label} <span className="text-muted-foreground">({item.variant.sku})</span></span>
                  <span className={`font-medium ${item.addQty < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {item.addQty > 0 ? '+' : ''}{item.addQty}
                  </span>
                </div>
              ))}
            </div>
            {pendingItems.some(i => i.addQty < 0) && (
              <div className="flex gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-xs border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Some items will have their stock reduced to match the replacement target.</span>
              </div>
            )}

            <div>
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Shipment #1234"
                className="mt-1"
              />
            </div>

            <Button className="w-full" onClick={handleConfirm}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Add/Adjust {pendingItems.reduce((s, i) => s + i.addQty, 0)} Unit(s)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Validation Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {validationErrors.length > 0 ? (
                <><FileWarning className="w-5 h-5 text-destructive" /> Upload Errors</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 text-success" /> Upload Validated</>
              )}
            </DialogTitle>
            <DialogDescription>
              {validationErrors.length > 0
                ? "Your file has validation errors. Please fix them and upload again."
                : `We successfully validated ${validatedData?.length} items. They will be added or updated.`}
            </DialogDescription>
          </DialogHeader>

          {validationErrors.length > 0 ? (
            <div className="max-h-64 overflow-y-auto border border-destructive/20 rounded-md p-3 bg-destructive/5 text-destructive text-sm space-y-2">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex gap-3">
                  <span className="font-semibold shrink-0">Row {err.row}:</span>
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg text-sm border">
              The file format matches the <strong>{selectedBusiness?.name}</strong> schema. <br/><br/>
              Clicking <strong>Confirm Upload</strong> will create new products/variants if they don't exist, and update stock quantities for existing ones.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              {validationErrors.length > 0 ? "Close" : "Cancel"}
            </Button>
            {validationErrors.length === 0 && (
              <Button onClick={confirmUpload}>Confirm Upload</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddStock;
