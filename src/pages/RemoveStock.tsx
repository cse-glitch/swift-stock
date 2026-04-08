import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/units";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, PackageMinus, Minus } from "lucide-react";

const REASONS = ["Sold", "Damaged", "Expired", "Returned", "Other"] as const;

interface Removal {
  itemId: number;
  sku: string;
  productName: string;
  available: number;
  removeQty: number;
}

const RemoveStock = () => {
  const items = useLiveQuery(() => db.items.toArray()) ?? [];
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState<string>("");
  const [removals, setRemovals] = useState<Map<number, number>>(new Map());
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q)) && i.quantity > 0
    );
  }, [items, search]);

  const setRemoveQty = (id: number, qty: number) => {
    setRemovals(prev => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(id);
      else next.set(id, qty);
      return next;
    });
  };

  const pendingRemovals: Removal[] = useMemo(() => {
    return Array.from(removals.entries()).map(([id, qty]) => {
      const item = items.find(i => i.id === id);
      if (!item) return null;
      return { itemId: id, sku: item.sku, productName: item.productName, available: item.quantity, removeQty: Math.min(qty, item.quantity) };
    }).filter(Boolean) as Removal[];
  }, [removals, items]);

  const handleConfirm = async () => {
    if (!reason) {
      toast({ title: "Reason required", description: "Select a reason code before removing.", variant: "destructive" });
      return;
    }
    if (pendingRemovals.length === 0) {
      toast({ title: "Nothing to remove", description: "Set a quantity to remove for at least one item.", variant: "destructive" });
      return;
    }

    try {
      await db.transaction("rw", db.items, db.removals, async () => {
        for (const r of pendingRemovals) {
          const item = await db.items.get(r.itemId);
          if (!item) continue;
          const newQty = Math.max(0, item.quantity - r.removeQty);
          await db.items.update(r.itemId, { quantity: newQty, lastUpdated: new Date() });
          await db.removals.add({
            sku: r.sku,
            productName: r.productName,
            quantityRemoved: r.removeQty,
            reason: reason as any,
            timestamp: new Date(),
          });
        }
      });

      const totalRemoved = pendingRemovals.reduce((s, r) => s + r.removeQty, 0);
      toast({
        title: "Stock removed",
        description: `Removed ${totalRemoved} items across ${pendingRemovals.length} SKU(s). Reason: ${reason}`,
      });
      setRemovals(new Map());
      setReason("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Remove Stock</h1>
        <p className="text-muted-foreground">Search for items and deduct quantities with a reason code</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by SKU or product name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <PackageMinus className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">{search ? "No matching items" : "No items in stock"}</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(item => {
            const qty = removals.get(item.id!) ?? 0;
            return (
              <Card key={item.id} className={qty > 0 ? "ring-2 ring-destructive/30" : ""}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.productName}</span>
                      <Badge variant="outline" className="font-mono text-xs shrink-0">{item.sku}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      In stock: <span className="font-semibold text-foreground">{item.quantity}</span>
                      {" · "}{formatNumber(item.weight)} kg
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Label className="text-xs text-muted-foreground sr-only">Remove</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setRemoveQty(item.id!, Math.max(0, qty - 1))}
                        disabled={qty === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={qty || ""}
                        onChange={e => setRemoveQty(item.id!, Math.min(item.quantity, parseInt(e.target.value) || 0))}
                        className="w-16 text-center h-8"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setRemoveQty(item.id!, Math.min(item.quantity, qty + 1))}
                        disabled={qty >= item.quantity}
                      >
                        <span className="text-sm font-bold">+</span>
                      </Button>
                    </div>
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
            <CardDescription>
              {pendingRemovals.length} item(s) selected for removal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              {pendingRemovals.map(r => (
                <div key={r.itemId} className="flex justify-between">
                  <span>{r.productName} <span className="text-muted-foreground">({r.sku})</span></span>
                  <span className="font-medium text-destructive">-{r.removeQty}</span>
                </div>
              ))}
            </div>

            <div>
              <Label>Reason Code <span className="text-destructive">*</span></Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="destructive" className="w-full" onClick={handleConfirm}>
              <PackageMinus className="mr-2 h-4 w-4" />
              Remove {pendingRemovals.reduce((s, r) => s + r.removeQty, 0)} Item(s)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RemoveStock;
