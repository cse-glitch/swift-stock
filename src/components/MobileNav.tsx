import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { icon: LayoutDashboard, label: "Home", to: "/" },
  { icon: Package, label: "Stock", to: "/products" },
  { icon: ShoppingCart, label: "Orders", to: "/orders" },
  { icon: Users, label: "Team", to: "/team" },
  { icon: Settings, label: "More", to: "/settings" },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-t pb-safe">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
              isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
