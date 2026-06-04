import {
  LayoutDashboard, PackagePlus, History, Settings, Wrench,
  Package, Store, Layers, BoxesIcon, Building2, Briefcase,
  BarChart3, ShoppingCart, Users, Banknote, ScrollText, ShieldCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
import { useAuth } from "@/contexts/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; icon: React.ElementType };

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: BoxesIcon },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const logisticsNav: NavItem[] = [
  { title: "Warehouses", url: "/warehouses", icon: Building2 },
  { title: "Suppliers", url: "/suppliers", icon: Users },
  { title: "Stock Ops", url: "/add", icon: PackagePlus },
];

const financeNav: NavItem[] = [
  { title: "Accounting", url: "/accounting", icon: Banknote },
];

const manageNav: NavItem[] = [
  { title: "Businesses", url: "/businesses", icon: Store },
  { title: "Categories", url: "/categories", icon: Layers },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Services", url: "/services", icon: Briefcase },
];

const systemNav: NavItem[] = [
  { title: "Team", url: "/team", icon: ShieldCheck },
  { title: "History", url: "/history", icon: History },
  { title: "Audit Logs", url: "/audit-logs", icon: ScrollText },
  { title: "Utilities", url: "/utilities", icon: Wrench },
  { title: "Settings", url: "/settings", icon: Settings },
];

/** Dashboard quick-action accent colors (dark-friendly) */
const navAccent: Record<string, { bg: string; text: string }> = {
  Dashboard: { bg: "bg-primary/15", text: "text-primary" },
  Products: { bg: "bg-amber-500/15", text: "text-amber-400" },
  Orders: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  Inventory: { bg: "bg-blue-500/15", text: "text-blue-400" },
  Analytics: { bg: "bg-cyan-500/15", text: "text-cyan-400" },
  Warehouses: { bg: "bg-blue-500/15", text: "text-blue-400" },
  Suppliers: { bg: "bg-purple-500/15", text: "text-purple-400" },
  "Stock Ops": { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  Accounting: { bg: "bg-rose-500/15", text: "text-rose-400" },
  Businesses: { bg: "bg-primary/15", text: "text-primary" },
  Categories: { bg: "bg-amber-500/15", text: "text-amber-400" },
  Properties: { bg: "bg-indigo-500/15", text: "text-indigo-400" },
  Services: { bg: "bg-violet-500/15", text: "text-violet-400" },
  Team: { bg: "bg-primary/15", text: "text-primary" },
  History: { bg: "bg-yellow-500/15", text: "text-yellow-400" },
  "Audit Logs": { bg: "bg-slate-500/15", text: "text-slate-400" },
  Utilities: { bg: "bg-slate-500/15", text: "text-slate-400" },
  Settings: { bg: "bg-slate-500/15", text: "text-slate-400" },
};

const defaultAccent = { bg: "bg-primary/15", text: "text-primary" };

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const collapsed = state === "collapsed";

  const NavGroup = ({ label, items }: { label: string; items: NavItem[] }) => {
    if (isMobile) {
      return (
        <SidebarGroup className="p-3 pt-0">
          <SidebarGroupLabel className="h-auto px-1 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/45">
            {label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => {
                const accent = navAccent[item.title] ?? defaultAccent;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="lg" className="h-auto p-0 hover:bg-transparent">
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        onClick={() => setOpenMobile(false)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sidebar-foreground transition-all duration-200 hover:border-sidebar-border/50 hover:bg-sidebar-accent/60"
                        activeClassName="border-primary/25 bg-primary/10 font-semibold shadow-sm shadow-primary/5"
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            accent.bg,
                            accent.text,
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-bold tracking-tight">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
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
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={cn(
          "transition-[padding] duration-200",
          isMobile ? "border-b border-sidebar-border/40 p-4 pb-3" : collapsed ? "p-2" : "p-4",
        )}
      >
        {isMobile ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sidebar-border/50 bg-sidebar-accent/80 shadow-sm">
                <img src="/logo.svg" alt="SAMAN Logo" className="h-8 w-8 object-contain" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-base font-black tracking-tight text-sidebar-foreground">
                  SAMAN
                </span>
                <span className="text-[11px] font-medium text-sidebar-foreground/55">
                  Inventory Hub
                </span>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-sidebar-border/40 bg-sidebar-accent/40 p-0.5">
              <BusinessSwitcher />
            </div>
            {user && (
              <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-sidebar-border/40 bg-sidebar-accent/30 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xs font-bold text-primary">
                  {user.displayName
                    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                    : "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-sidebar-foreground">{user.displayName}</p>
                  <p className="truncate text-[10px] text-sidebar-foreground/50">@{user.username}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-lg bg-transparent transition-all duration-200 overflow-hidden",
                  collapsed ? "h-9 w-9" : "h-12 w-12",
                )}
              >
                <img
                  src="/logo.svg"
                  alt="SAMAN Logo"
                  className={cn("transition-all object-contain", collapsed ? "h-7 w-7" : "h-10 w-10")}
                />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-sidebar-foreground truncate tracking-tight">
                    SAMAN
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/60 leading-none">Inventory Hub</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="mt-3">
                <BusinessSwitcher />
              </div>
            )}
          </>
        )}
      </SidebarHeader>

      <SidebarContent className={cn(isMobile && "gap-0 pb-6")}>
        <NavGroup label="Overview" items={mainNav} />
        <SidebarSeparator className={cn(isMobile && "mx-4 bg-sidebar-border/30")} />
        <NavGroup label="Logistics" items={logisticsNav} />
        <SidebarSeparator className={cn(isMobile && "mx-4 bg-sidebar-border/30")} />
        <NavGroup label="Financials" items={financeNav} />
        <SidebarSeparator className={cn(isMobile && "mx-4 bg-sidebar-border/30")} />
        <NavGroup label="Manage" items={manageNav} />
        <SidebarSeparator className={cn(isMobile && "mx-4 bg-sidebar-border/30")} />
        <NavGroup label="System" items={systemNav} />
      </SidebarContent>
    </Sidebar>
  );
}
