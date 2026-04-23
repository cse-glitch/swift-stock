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
import { PackagePlus, Search } from "lucide-react";

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
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <PackagePlus className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">{search ? "No matching products" : "No products found"}</p>
              <p className="text-sm mt-1">Create products first in the Products page</p>
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
                  <span className="font-medium text-primary">+{item.addQty}</span>
                </div>
              ))}
            </div>

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
              Add {pendingItems.reduce((s, i) => s + i.addQty, 0)} Unit(s)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddStock;
