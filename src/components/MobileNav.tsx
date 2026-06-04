import { NavLink, useNavigate } from "react-router-dom";
import { Home, Receipt, Plus, Banknote, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceOrderModal } from "@/components/PlaceOrderModal";

export function MobileNav() {
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/40 px-4 pb-safe-bottom shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around h-16 relative">
        {/* Dashboard / Home */}
        <NavLink
          to="/"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-bold tracking-tight">Dashboard</span>
        </NavLink>

        {/* Invoices / Orders */}
        <NavLink
          to="/orders"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Receipt className="h-5 w-5" />
          <span className="text-[10px] font-bold tracking-tight">Invoices</span>
        </NavLink>

        {/* Floating Action Button (FAB) + */}
        <div className="flex-1 flex justify-center -mt-6 z-50">
          <PlaceOrderModal
            trigger={
              <button 
                className="h-12 w-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label="Add Transaction"
              >
                <Plus className="h-6 w-6 stroke-[3]" />
              </button>
            }
          />
        </div>

        {/* Expenses / Ledger */}
        <NavLink
          to="/accounting"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Banknote className="h-5 w-5" />
          <span className="text-[10px] font-bold tracking-tight">Expenses</span>
        </NavLink>

        {/* Reports / Analytics */}
        <NavLink
          to="/analytics"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-[10px] font-bold tracking-tight">Reports</span>
        </NavLink>
      </div>
    </nav>
  );
}
