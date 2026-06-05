import { NavLink } from "react-router-dom";
import { Home, Receipt, Plus, Banknote, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceOrderModal } from "@/components/PlaceOrderModal";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/orders", icon: Receipt, label: "Invoices" },
  null, // FAB placeholder
  { to: "/accounting", icon: Banknote, label: "Expenses" },
  { to: "/analytics", icon: BarChart3, label: "Reports" },
] as const;

export function MobileNav() {
  return (
    <nav
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border/30",
        "bg-background/85 backdrop-blur-xl",
        "shadow-[0_-1px_0_0_hsl(var(--border)/0.5),0_-8px_32px_-4px_hsl(var(--foreground)/0.06)]",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-[60px] px-1 relative">
        {NAV_ITEMS.map((item, i) => {
          /* ── FAB centre slot ── */
          if (item === null) {
            return (
              <div key="fab" className="flex-1 flex justify-center items-center -mt-5">
                <PlaceOrderModal
                  trigger={
                    <button
                      className={cn(
                        "h-[52px] w-[52px] rounded-xl",
                        "bg-primary text-primary-foreground",
                        "flex items-center justify-center",
                        "shadow-lg shadow-primary/30",
                        "transition-all duration-200",
                        "hover:shadow-primary/40 hover:scale-[1.06]",
                        "active:scale-95",
                        "ring-[3px] ring-background",
                      )}
                      aria-label="Place Order"
                    >
                      <Plus className="h-6 w-6 stroke-[2.5]" />
                    </button>
                  }
                />
              </div>
            );
          }

          const { to, icon: Icon, label, end } = item as {
            to: string; icon: typeof Home; label: string; end?: boolean;
          };

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 h-full",
                  "relative transition-colors duration-200 select-none",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground/70",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active pill / glow dot at top */}
                  <span
                    className={cn(
                      "absolute top-0 inset-x-0 mx-auto h-[3px] w-8 rounded-b-full",
                      "transition-all duration-300",
                      isActive
                        ? "bg-primary opacity-100 scale-x-100"
                        : "bg-transparent opacity-0 scale-x-50",
                    )}
                  />

                  {/* Icon wrapper with subtle active bg */}
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      "transition-all duration-200",
                      isActive ? "bg-primary/10" : "bg-transparent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isActive ? "stroke-[2.2]" : "stroke-[1.8]",
                      )}
                    />
                  </span>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-[10px] font-bold tracking-tight leading-none",
                      "transition-all duration-200",
                    )}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
