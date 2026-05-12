import {
  LayoutDashboard, PackagePlus, History, Settings, Wrench,
  Package, Store, Layers, BoxesIcon, Building2, Briefcase,
  BarChart3, ShoppingCart, Users, HardDrive, ScrollText, ShieldCheck,
  Banknote
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: BoxesIcon },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const logisticsNav = [
  { title: "Warehouses", url: "/warehouses", icon: Building2 },
  { title: "Suppliers", url: "/suppliers", icon: Users },
  { title: "Stock Ops", url: "/add", icon: PackagePlus },
];

const financeNav = [
  { title: "Accounting", url: "/accounting", icon: Banknote },
];

const manageNav = [
  { title: "Businesses", url: "/businesses", icon: Store },
  { title: "Categories", url: "/categories", icon: Layers },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Services", url: "/services", icon: Briefcase },
];

const systemNav = [
  { title: "Team", url: "/team", icon: ShieldCheck },
  { title: "History", url: "/history", icon: History },
  { title: "Audit Logs", url: "/audit-logs", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
];

// Admin-only items are now moved to Profile page for a cleaner sidebar
const adminNav: { title: string; url: string; icon: React.ElementType }[] = [];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const collapsed = state === "collapsed";

  const NavGroup = ({ label, items }: { label: string; items: { title: string; url: string; icon: React.ElementType }[] }) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={cn("hover:bg-sidebar-accent flex w-full h-full items-center transition-colors duration-200", collapsed && "justify-center")}
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                >
                  <item.icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={cn("transition-[padding] duration-200", collapsed ? "p-2" : "p-4")}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-transparent transition-all duration-200 overflow-hidden",
            collapsed ? "h-9 w-9" : "h-12 w-12"
          )}>
            <img src="/logo.svg" alt="SAMAN Logo" className={cn("transition-all object-contain", collapsed ? "h-7 w-7" : "h-10 w-10")} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground truncate tracking-tight">SAMAN</span>
              <span className="text-[10px] text-sidebar-foreground/60 leading-none">Inventory Hub</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-3">
            <BusinessSwitcher />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Overview" items={mainNav} />
        <SidebarSeparator />
        <NavGroup label="Logistics" items={logisticsNav} />
        <SidebarSeparator />
        <NavGroup label="Financials" items={financeNav} />
        <SidebarSeparator />
        <NavGroup label="Manage" items={manageNav} />
        <SidebarSeparator />
        <NavGroup label="System" items={systemNav} />
      </SidebarContent>
    </Sidebar>
  );
}

