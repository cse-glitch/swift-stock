import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, PackageMinus, Minus, ExternalLink, PackagePlus } from "lucide-react";
import { Link } from "react-router-dom";

const REASONS = ["Sold", "Damaged", "Expired", "Returned", "Adjustment", "Other"] as const;

const RemoveStock = () => {
  const { businesses, activeBusinessId } = useBusiness();
  const activeBusinesses = businesses.filter(b => b.isActive);

  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(activeBusinessId);
  const bizId = selectedBusinessId ?? activeBusinessId;

  const products = useLiveQuery(() =>
    bizId ? db.products.where('businessId').equals(bizId).toArray() : db.products.toArray()
  , [bizId]) ?? [];

  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [removals, setRemovals] = useState<Map<number, number>>(new Map());
  const { toast } = useToast();

  const stockItems = useMemo(() => {
    const q = search.toLowerCase();
    return products.flatMap(p => {
      const pVariants = variants.filter(v => v.productId === p.id && v.stock > 0);
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

  const setRemoveQty = (variantId: number, qty: number) => {
    setRemovals(prev => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(variantId);
      else next.set(variantId, qty);
      return next;
    });
  };

  const pendingRemovals = useMemo(() =>
    Array.from(removals.entries())
      .map(([vid, qty]) => {
        const item = stockItems.find(s => s.variant.id === vid);
        if (!item) return null;
        return { ...item, removeQty: Math.min(qty, item.variant.stock) };
      })
      .filter(Boolean) as (typeof stockItems[number] & { removeQty: number })[]
  , [removals, stockItems]);

  const handleConfirm = async () => {
    if (!reason) {
      toast({ title: "Reason required", description: "Select a reason code before removing.", variant: "destructive" });
      return;
    }
    if (pendingRemovals.length === 0) {
      toast({ title: "Nothing to remove", description: "Set a quantity for at least one item.", variant: "destructive" });
      return;
    }

    try {
      await db.transaction("rw", db.variants, db.inventoryLog, async () => {
        for (const item of pendingRemovals) {
          const v = await db.variants.get(item.variant.id!);
          if (!v) continue;
          const newStock = Math.max(0, v.stock - item.removeQty);
          await db.variants.update(item.variant.id!, { stock: newStock });
          await db.inventoryLog.add({
            productId: item.product.id!,
            variantId: item.variant.id!,
            businessId: item.product.businessId,
            type: 'remove',
            quantity: item.removeQty,
            reason: reason,
            note: note.trim() || undefined,
            timestamp: new Date(),
          });
        }
      });

      const totalRemoved = pendingRemovals.reduce((s, i) => s + i.removeQty, 0);
      toast({
        title: "Stock removed",
        description: `Removed ${totalRemoved} units across ${pendingRemovals.length} variant(s). Reason: ${reason}`,
      });
      setRemovals(new Map());
      setReason("");
      setNote("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Remove Stock</h1>
          <p className="text-muted-foreground">Search for items and deduct quantities with a reason code</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link to="/add">
            <PackagePlus className="h-4 w-4" />
            Add Stock
          </Link>
        </Button>
      </div>

      {/* Business filter */}
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by SKU or product name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-3">
        {stockItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <PackageMinus className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">{search ? "No matching items" : "No items in stock"}</p>
              <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-sm">Create products first and add stock before removing.</p>
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
            const qty = removals.get(item.variant.id!) ?? 0;
            return (
              <Card key={item.variant.id} className={qty > 0 ? "ring-2 ring-destructive/30" : ""}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.label}</span>
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{item.variant.sku}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      In stock: <span className="font-semibold text-foreground">{item.variant.stock}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRemoveQty(item.variant.id!, Math.max(0, qty - 1))} disabled={qty === 0}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input type="number" min={0} max={item.variant.stock} value={qty || ""} onChange={e => setRemoveQty(item.variant.id!, Math.min(item.variant.stock, parseInt(e.target.value) || 0))} className="w-16 text-center h-8" />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRemoveQty(item.variant.id!, Math.min(item.variant.stock, qty + 1))} disabled={qty >= item.variant.stock}>
                      <span className="text-sm font-bold">+</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {pendingRemovals.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg">Confirm Removal</CardTitle>
            <CardDescription>{pendingRemovals.length} variant(s) selected for removal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              {pendingRemovals.map(item => (
                <div key={item.variant.id} className="flex justify-between">
                  <span>{item.label} <span className="text-muted-foreground">({item.variant.sku})</span></span>
                  <span className="font-medium text-destructive">-{item.removeQty}</span>
                </div>
              ))}
            </div>

            <div>
              <Label>Reason Code <span className="text-destructive">*</span></Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Additional details..." className="mt-1" />
            </div>

            <Button variant="destructive" className="w-full" onClick={handleConfirm}>
              <PackageMinus className="mr-2 h-4 w-4" />
              Remove {pendingRemovals.reduce((s, i) => s + i.removeQty, 0)} Unit(s)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RemoveStock;
