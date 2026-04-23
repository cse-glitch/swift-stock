import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, AlertTriangle, PackagePlus } from "lucide-react";

export function LowStockAlert() {
  const { businesses } = useBusiness();
  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const navigate = useNavigate();

  const alerts = useMemo(() => {
    const items: { product: typeof products[0]; variant: typeof variants[0]; business: typeof businesses[0] | undefined; status: "low" | "out" }[] = [];

    for (const v of variants) {
      if (v.stock === 0 || (v.stock > 0 && v.stock <= v.lowStockThreshold)) {
        const product = products.find(p => p.id === v.productId);
        if (!product) continue;
        const business = businesses.find(b => b.id === product.businessId);
        items.push({
          product,
          variant: v,
          business,
          status: v.stock === 0 ? "out" : "low",
        });
      }
    }

    return items;
  }, [products, variants, businesses]);

  // Group by business
  const grouped = useMemo(() => {
    const map = new Map<string, typeof alerts>();
    for (const item of alerts) {
      const key = item.business?.name ?? "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [alerts]);

  const count = alerts.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Stock Alerts ({count})
          </SheetTitle>
        </SheetHeader>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">All stock levels healthy</p>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {grouped.map(([bizName, items]) => (
              <div key={bizName}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">{bizName}</h3>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.variant.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{item.product.name}</span>
                        <Badge variant={item.status === "out" ? "destructive" : "secondary"} className="text-xs shrink-0">
                          {item.status === "out" ? "Out of stock" : "Low stock"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.variant.name} · <span className="font-mono">{item.variant.sku}</span></span>
                        <span>Stock: <span className="font-semibold text-foreground">{item.variant.stock}</span> / Threshold: {item.variant.lowStockThreshold}</span>
                      </div>
                      <Button
                        variant="ghost" size="sm" className="h-7 text-xs mt-1"
                        onClick={() => navigate("/add")}
                      >
                        <PackagePlus className="mr-1 h-3 w-3" /> Add Stock
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
