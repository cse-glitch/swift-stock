import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Receipt, Wallet, BarChart3, Plus, X, 
  ShoppingCart, Package, MinusCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceOrderModal } from "@/components/PlaceOrderModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MobileNav() {
  const navigate = useNavigate();
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const handleQuickAction = (path: string) => {
    setQuickMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe">
        <div className="relative flex items-center justify-around h-16 px-2">
          
          {/* Dashboard Tab */}
          <NavLink
            to="/"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </NavLink>

          {/* Invoices Tab */}
          <NavLink
            to="/orders"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Receipt className="h-5 w-5" />
            <span className="text-[10px] font-medium">Invoices</span>
          </NavLink>

          {/* Floating Action Button (Center) */}
          <div className="flex-1 flex justify-center h-full relative">
            <button
              onClick={() => setQuickMenuOpen(true)}
              className="absolute -top-5 flex items-center justify-center w-14 h-14 bg-foreground text-background rounded-full shadow-lg border-4 border-background active:scale-90 hover:scale-105 transition-all duration-200 z-50 focus:outline-none"
              aria-label="Quick Actions"
            >
              <Plus className="h-6 w-6 font-bold" />
            </button>
            <div className="h-4" /> {/* Spacer */}
          </div>

          {/* Expenses Tab */}
          <NavLink
            to="/accounting"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[10px] font-medium">Expenses</span>
          </NavLink>

          {/* Reports Tab */}
          <NavLink
            to="/analytics"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-200",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-[10px] font-medium">Reports</span>
          </NavLink>

        </div>
      </nav>

      {/* Quick Action Bottom Drawer / Modal */}
      <Dialog open={quickMenuOpen} onOpenChange={setQuickMenuOpen}>
        <DialogContent className="sm:max-w-md rounded-t-[2rem] rounded-b-none md:rounded-3xl border-t border-border bg-card p-6 gap-6 fixed bottom-0 top-auto translate-y-0 duration-300">
          <DialogHeader className="relative">
            <DialogTitle className="text-center text-lg font-bold">Quick Actions</DialogTitle>
            <button 
              onClick={() => setQuickMenuOpen(false)}
              className="absolute right-0 top-0 p-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            
            {/* Create Order (using the actual PlaceOrderModal) */}
            <div className="col-span-2">
              <PlaceOrderModal 
                trigger={
                  <button 
                    onClick={() => setQuickMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/10 active:scale-[0.98] transition-transform"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Create Invoice</span>
                  </button>
                }
              />
            </div>

            {/* Record Expense */}
            <button
              onClick={() => handleQuickAction("/accounting")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 transition-colors font-medium text-sm active:scale-95"
            >
              <Wallet className="h-6 w-6" />
              <span>Add Expense</span>
            </button>

            {/* Add Stock */}
            <button
              onClick={() => handleQuickAction("/add")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 transition-colors font-medium text-sm active:scale-95"
            >
              <Package className="h-6 w-6" />
              <span>Add Stock</span>
            </button>

            {/* Remove Stock */}
            <button
              onClick={() => handleQuickAction("/remove")}
              className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 transition-colors font-medium text-sm active:scale-95"
            >
              <MinusCircle className="h-4 w-4" />
              <span>Remove / Adjust Stock</span>
            </button>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
