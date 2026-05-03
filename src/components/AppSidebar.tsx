import { LayoutDashboard, PackagePlus, PackageMinus, History, Settings, Wrench, Package, Store, Layers, BoxesIcon, Building2, Briefcase, BarChart3, ShoppingCart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
import { LowStockAlert } from "@/components/LowStockAlert";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: BoxesIcon },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Add Stock", url: "/add", icon: PackagePlus },
  { title: "Remove Stock", url: "/remove", icon: PackageMinus },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const manageNav = [
  { title: "Businesses", url: "/businesses", icon: Store },
  { title: "Categories", url: "/categories", icon: Layers },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Services", url: "/services", icon: Briefcase },
];

const systemNav = [
  { title: "History", url: "/history", icon: History },
  { title: "Utilities", url: "/utilities", icon: Wrench },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const NavGroup = ({ label, items }: { label: string; items: typeof mainNav }) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={cn("hover:bg-sidebar-accent/50 flex w-full h-full items-center", collapsed && "justify-center")}
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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
            "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all duration-200",
            collapsed ? "h-8 w-8" : "h-9 w-9"
          )}>
            <Package className={cn("transition-all", collapsed ? "h-4 w-4" : "h-5 w-5")} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground truncate tracking-tight">SAMAN</span>
              <span className="text-[10px] text-sidebar-foreground/60 leading-none">Inventory Hub</span>
            </div>
          )}
          {!collapsed && <div className="ml-auto"><LowStockAlert /></div>}
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
        <NavGroup label="Manage" items={manageNav} />
        <SidebarSeparator />
        <NavGroup label="System" items={systemNav} />
      </SidebarContent>
    </Sidebar>
  );
}
