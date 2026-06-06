import { useMemo, useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useBusiness } from "@/contexts/BusinessContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, AlertTriangle, PackagePlus, Trash2, X, Info, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function LowStockAlert() {
  const { businesses } = useBusiness();
  const rawProducts = useLiveQuery(() => db.products.toArray());
  const rawVariants = useLiveQuery(() => db.variants.toArray());
  const products = useMemo(() => rawProducts ?? [], [rawProducts]);
  const variants = useMemo(() => rawVariants ?? [], [rawVariants]);
  const navigate = useNavigate();

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof alerts>();
    for (const item of alerts) {
      const key = item.business?.name ?? "Global";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [alerts]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => [...prev, id]);
  };

  const handleClearAll = () => {
    const newDismissed = [...dismissedIds, ...alerts.map(a => a.variant.id!)];
    setDismissedIds(newDismissed);
  };

  const count = alerts.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-lg hover:bg-muted/80 transition-all border border-border/20 shadow-sm">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded bg-destructive text-[10px] font-black text-white shadow-lg shadow-destructive/20 animate-in zoom-in">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[340px] sm:w-[400px] p-0 shadow-2xl rounded-xl overflow-hidden border-none mt-2" 
        align="end" 
        sideOffset={8}
      >
        <div className="bg-gradient-to-br from-card via-card to-primary/5 p-5 border-b border-border/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight">Stock Alerts</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">Inventory Status</p>
              </div>
            </div>
            {count > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-3 rounded-lg transition-colors"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[480px] overflow-y-auto no-scrollbar">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="h-20 w-20 rounded-xl bg-muted/30 flex items-center justify-center mb-6 shadow-inner">
                <Bell className="h-10 w-10 text-muted-foreground/20" />
              </div>
              <p className="text-base font-black tracking-tight text-foreground">No active alerts</p>
              <p className="text-xs font-medium text-muted-foreground mt-1.5 max-w-[200px]">All your stock levels are currently within healthy thresholds.</p>
            </div>
          ) : (
            <div className="p-3 space-y-6 pb-6">
              {grouped.map(([bizName, items]) => (
                <div key={bizName} className="space-y-3">
                  <div className="px-3 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">{bizName}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.variant.id} className="relative group rounded-xl p-4 bg-muted/20 border border-transparent hover:bg-muted/40 hover:border-border/30 transition-all">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDismiss(item.variant.id!);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        
                        <div className="flex items-center justify-between gap-4 mb-2 pr-6">
                          <span className="font-black text-sm tracking-tight truncate">{item.product.name}</span>
                          <Badge 
                            className={cn(
                              "text-[9px] h-4.5 px-2 font-black uppercase tracking-widest border-none",
                              item.status === "out" ? "bg-destructive/10 text-destructive shadow-sm" : "bg-warning/10 text-warning shadow-sm"
                            )}
                          >
                            {item.status === "out" ? "Out of Stock" : "Low Stock"}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground truncate flex-1">
                              {item.variant.name} <span className="opacity-40 font-mono text-[10px] ml-1">#{item.variant.sku}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-4 pt-3 border-t border-border/10">
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                                <span>Current Level</span>
                                <span>{item.variant.stock} / {item.variant.lowStockThreshold}</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    item.status === "out" ? "bg-destructive" : "bg-warning"
                                  )}
                                  style={{ width: `${Math.max(5, (item.variant.stock / (item.variant.lowStockThreshold || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>
                            
                            <Button
                              variant="secondary" 
                              size="sm" 
                              className="h-10 px-4 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-primary hover:text-white transition-all shrink-0"
                              onClick={() => {
                                navigate("/add");
                              }}
                            >
                              <PackagePlus className="mr-2 h-3.5 w-3.5" /> 
                              Restock
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {count > 0 && (
          <div className="p-4 bg-primary/[0.03] border-t border-border/10 flex items-center justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Monitoring active inventory alerts
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
