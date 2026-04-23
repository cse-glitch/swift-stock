import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PackagePlus, Search, Upload, ExternalLink, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const AddStock = () => {
  const { businesses, activeBusinessId } = useBusiness();
  const activeBusinesses = businesses.filter(b => b.isActive);

  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(activeBusinessId);
  const bizId = selectedBusinessId ?? activeBusinessId;

  const products = useLiveQuery(() =>
    bizId ? db.products.where('businessId').equals(bizId).toArray() : db.products.toArray()
  , [bizId]) ?? [];

  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map());
  const [note, setNote] = useState("");
  const [pendingUpload, setPendingUpload] = useState<any[] | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  // Build a flat list of variant+product combos for display
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

  const setQty = (variantId: number, qty: number) => {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!bizId) {
      toast({ title: "Select a business", description: "Please select a specific business before uploading.", variant: "destructive" });
      e.target.value = '';
      return;
    }

    try {
      let data: any[] = [];
      if (file.name.endsWith('.csv')) {
        data = await new Promise<any[]>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error),
          });
        });
      } else if (file.name.match(/\.xlsx?$/)) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error("Unsupported file format.");
      }

      setPendingUpload(data);
      setIsUploadDialogOpen(true);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      e.target.value = '';
    }
  };

  const applyUpload = (mode: 'add' | 'replace') => {
    if (!pendingUpload) return;

    const nextQuantities = new Map(quantities);
    let matchCount = 0;
    let skipCount = 0;

    for (const row of pendingUpload) {
      const skuKey = Object.keys(row).find(k => k.toLowerCase() === 'sku' || k.toLowerCase() === 'item number' || k.toLowerCase() === 'item_number');
      const qtyKey = Object.keys(row).find(k => k.toLowerCase() === 'quantity' || k.toLowerCase() === 'qty');

      if (!skuKey || !qtyKey) continue;

      const sku = String(row[skuKey]).trim();
      const qty = parseInt(String(row[qtyKey]), 10);

      if (!sku || isNaN(qty)) continue;

      const variant = variants.find(v => v.sku.toLowerCase() === sku.toLowerCase());
      if (variant) {
        const product = products.find(p => p.id === variant.productId);
        if (product) {
          if (mode === 'add') {
            const currentVal = nextQuantities.get(variant.id!) ?? 0;
            nextQuantities.set(variant.id!, currentVal + qty);
          } else {
            // Replace mode: delta = target - current_db_stock
            // Note: AddStock handleConfirm will do variant.stock + addQty
            // So addQty = target - variant.stock
            const delta = qty - variant.stock;
            nextQuantities.set(variant.id!, delta);
          }
          matchCount++;
        } else {
          skipCount++;
        }
      } else {
        skipCount++;
      }
    }

    setQuantities(nextQuantities);
    setIsUploadDialogOpen(false);
    setPendingUpload(null);

    toast({ 
      title: "Upload processed", 
      description: `Matched ${matchCount} items in ${mode} mode. Skipped ${skipCount} items.`,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Stock</h1>
        <p className="text-muted-foreground">Search for products and add quantities to their variants</p>
      </div>

      {/* Business filter */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Select
            value={bizId?.toString() ?? "all"}
            onValueChange={v => setSelectedBusinessId(v === "all" ? null : Number(v))}
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
            <p className="text-xs text-muted-foreground mt-2">Select a business to enable file upload.</p>
          )}
        </div>
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
              Upload File
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

      {/* Upload Choice Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Uploaded Stock</DialogTitle>
            <DialogDescription>
              We found {pendingUpload?.length} items in your file. How should we apply these quantities?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button variant="outline" className="flex flex-col items-start h-auto p-4 gap-1 text-left" onClick={() => applyUpload('add')}>
              <span className="font-bold">Add to current stock</span>
              <span className="text-xs text-muted-foreground font-normal">Incremental: Stock will be increased by the numbers in the file.</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-start h-auto p-4 gap-1 text-left" onClick={() => applyUpload('replace')}>
              <span className="font-bold">Replace current stock</span>
              <span className="text-xs text-muted-foreground font-normal">Absolute: Stock will be adjusted so the final count matches the file exactly.</span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddStock;
