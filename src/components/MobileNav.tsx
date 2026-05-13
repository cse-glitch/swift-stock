import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: LayoutDashboard, label: "Home", to: "/" },
  { icon: Package, label: "Stock", to: "/products" },
  { icon: ShoppingCart, label: "Orders", to: "/orders" },
  { icon: Building2, label: "Warehouses", to: "/warehouses" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      <div className="flex items-center justify-around h-16 bg-card/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 relative",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "absolute -top-1 w-8 h-1 rounded-full transition-all duration-500 bg-primary",
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
                <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
                <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
