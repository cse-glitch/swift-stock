import { useState } from "react";
import { db, ProductType, generateId } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileWarning, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

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

export function BulkUploadDialog() {
  const { businesses, activeBusinessId } = useBusiness();
  const activeBusinesses = businesses.filter(b => b.isActive);

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(activeBusinessId);
  const bizId = selectedBusinessId ?? activeBusinessId;
  const selectedBusiness = businesses.find(b => b.id === bizId);

  const [isOpen, setIsOpen] = useState(false);
  const [isValidationView, setIsValidationView] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{row: number, message: string}[]>([]);
  const [validatedData, setValidatedData] = useState<Record<string, unknown>[] | null>(null);

  const { toast } = useToast();

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
      let rawData: Record<string, unknown>[] = [];
      if (fileExt === 'csv') {
        rawData = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
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

      const expectedCols = getTemplateColumns(selectedBusiness.type);
      const errors: {row: number, message: string}[] = [];
      const parsedData: Record<string, unknown>[] = [];
      
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
          const rowNum = idx + 2;
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
      setIsValidationView(true);

    } catch (error) {
      toast({ title: "Parsing failed", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
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
            const newCatId = generateId();
            await db.categories.add({ id: newCatId, businessId: selectedBusiness.id!, name: categoryName });
            category = { id: newCatId, businessId: selectedBusiness.id!, name: categoryName };
          }

          const productSku = String(getVal('Product SKU')).trim();
          let product = await db.products.where('sku').equals(productSku).first();
          
          let productType: ProductType = 'physical';
          if (selectedBusiness.type === 'properties') productType = 'listing';
          if (selectedBusiness.type === 'services') productType = 'service';

          const basePrice = parseFloat(String(getVal('Base Price')));
          const attributes: Record<string, string | number> = {};
          
          const standardCols = getTemplateColumns(selectedBusiness.type).map(c => c.toLowerCase().trim());
          Object.keys(row).forEach(k => {
             if (!standardCols.includes(k.toLowerCase().trim())) {
                attributes[k] = row[k];
             }
          });

          if (!product) {
            const newPid = generateId();
            await db.products.add({
              id: newPid,
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
            product = await db.products.get(newPid);
          }

          if (productType === 'physical') {
             const variantSku = String(getVal('Variant SKU')).trim();
             const variant = await db.variants.where('sku').equals(variantSku).first();
             const stockQty = parseInt(String(getVal('Stock')), 10) || 0;
             const lowStock = parseInt(String(getVal('Low Stock Threshold')), 10) || 5;
             
             const vAttr: Record<string, string | number> = {};
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
                 id: generateId(),
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
                  id: generateId(),
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
             const listing = await db.propertyListings.where('productId').equals(product!.id!).first();
             if (!listing) {
               await db.propertyListings.add({
                 id: generateId(),
                 productId: product!.id!,
                 listingType: (String(getVal('Listing Type')).toLowerCase() as 'sale' | 'rent') || 'sale',
                 location: String(getVal('Location')),
                 area: parseFloat(String(getVal('Area'))),
                 bedrooms: parseInt(String(getVal('Bedrooms'))),
                 bathrooms: parseInt(String(getVal('Bathrooms'))),
                 availability: (String(getVal('Availability')).toLowerCase() as 'available' | 'sold' | 'rented' | 'pending') || 'available'
               });
             }
          } else if (productType === 'service') {
             const service = await db.services.where('productId').equals(product!.id!).first();
             if (!service) {
               const days = String(getVal('Available Days')).split(',').map(d => d.trim());
               await db.services.add({
                 id: generateId(),
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
      setIsOpen(false);
      setIsValidationView(false);
      setValidatedData(null);
    } catch (err) {
      toast({ title: "Database Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setIsValidationView(false);
        setValidationErrors([]);
        setValidatedData(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md sm:max-w-2xl">
        {!isValidationView ? (
          <>
            <DialogHeader>
              <DialogTitle>Bulk Upload Data</DialogTitle>
              <DialogDescription>
                Download a template for your business, fill it out, and upload it back to batch-create products and variants.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>1. Select Business</Label>
                <Select
                  value={bizId || "all"}
                  onValueChange={v => setSelectedBusinessId(v === "all" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Businesses" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBusinesses.map(b => (
                      <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!bizId && (
                  <p className="text-xs text-muted-foreground">Select a specific business to proceed.</p>
                )}
              </div>

              {bizId && (
                <div className="space-y-2 pt-2">
                  <Label>2. Download Template</Label>
                  <div>
                    <Button variant="outline" onClick={downloadTemplate} className="gap-2 w-full sm:w-auto">
                      <Download className="w-4 h-4" />
                      Download {selectedBusiness?.name} Template
                    </Button>
                  </div>
                </div>
              )}

              {bizId && (
                <div className="space-y-2 pt-2">
                  <Label>3. Upload File (.csv, .xlsx)</Label>
                  <div>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      id="stock-upload-modal"
                      onChange={handleFileUpload}
                    />
                    <Label htmlFor="stock-upload-modal" className="cursor-pointer">
                      <div className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-border rounded-md hover:bg-muted/50 transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">Click to select file</span>
                      </div>
                    </Label>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            </DialogFooter>
          </>
        ) : (
          <>
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

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsValidationView(false)}>
                {validationErrors.length > 0 ? "Back" : "Cancel"}
              </Button>
              {validationErrors.length === 0 && (
                <Button onClick={confirmUpload}>Confirm Upload</Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
