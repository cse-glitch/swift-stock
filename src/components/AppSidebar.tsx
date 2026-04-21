import { LayoutDashboard, PackagePlus, PackageMinus, History, Settings, Wrench, Package, Store, Layers, BoxesIcon, Building2, Briefcase } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
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
  { title: "Add Stock", url: "/add", icon: PackagePlus },
  { title: "Remove Stock", url: "/remove", icon: PackageMinus },
  { title: "Inventory", url: "/inventory", icon: Package },
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
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
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
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">SAMAN</span>
              <span className="text-xs text-sidebar-foreground/60">Inventory Hub</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <BusinessSwitcher />
        </div>
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
