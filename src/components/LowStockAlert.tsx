import { useMemo, useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, AlertTriangle, PackagePlus, Trash2, X } from "lucide-react";

export function LowStockAlert() {
  const { businesses } = useBusiness();
  const products = useLiveQuery(() => db.products.toArray()) ?? [];
  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const navigate = useNavigate();

  const [dismissedIds, setDismissedIds] = useState<number[]>(() => {
    const saved = localStorage.getItem("dismissed_stock_alerts");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("dismissed_stock_alerts", JSON.stringify(dismissedIds));
  }, [dismissedIds]);

  const alerts = useMemo(() => {
    const items: { product: typeof products[0]; variant: typeof variants[0]; business: typeof businesses[0] | undefined; status: "low" | "out" }[] = [];

    for (const v of variants) {
      if (dismissedIds.includes(v.id!)) continue;

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
  }, [products, variants, businesses, dismissedIds]);

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

  const handleDismiss = (id: number) => {
    setDismissedIds(prev => [...prev, id]);
  };

  const handleClearAll = () => {
    const newDismissed = [...dismissedIds, ...alerts.map(a => a.variant.id!)];
    setDismissedIds(newDismissed);
  };

  const handleReset = () => {
    setDismissedIds([]);
  };

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
      <SheetContent className="w-[360px] sm:w-[400px] flex flex-col h-full p-0">
        <SheetHeader className="p-6 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Stock Alerts ({count})
            </SheetTitle>
            {count > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">All stock levels healthy</p>
              {dismissedIds.length > 0 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={handleReset}
                  className="mt-2 text-xs"
                >
                  Restore dismissed alerts
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-6 pb-6">
              {grouped.map(([bizName, items]) => (
                <div key={bizName}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">{bizName}</h3>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.variant.id} className="relative group rounded-lg border p-3 space-y-1 bg-card hover:border-muted-foreground/30 transition-colors">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDismiss(item.variant.id!)}
                        >
                          <X className="h-3.3 w-3.3 text-muted-foreground" />
                        </Button>
                        
                        <div className="flex items-center justify-between pr-6">
                          <span className="font-medium text-sm truncate">{item.product.name}</span>
                          <Badge variant={item.status === "out" ? "destructive" : "secondary"} className="text-[10px] h-4 px-1.5 shrink-0">
                            {item.status === "out" ? "Out" : "Low"}
                          </Badge>
                        </div>
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span className="truncate">{item.variant.name} · <span className="font-mono text-[10px]">{item.variant.sku}</span></span>
                          <div className="flex items-center justify-between mt-1">
                            <span>Stock: <span className="font-semibold text-foreground">{item.variant.stock}</span></span>
                            <span>Limit: {item.variant.lowStockThreshold}</span>
                          </div>
                        </div>
                        <Button
                          variant="default" size="sm" className="w-full h-8 text-[10px] mt-2 font-semibold"
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
