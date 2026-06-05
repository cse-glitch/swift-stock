import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, PackagePlus, History, Settings, Wrench,
  Package, Store, Layers, BoxesIcon, Building2, Briefcase,
  BarChart3, ShoppingCart, Users, Banknote, ScrollText, ShieldCheck,
  ChevronDown, LogOut, User,
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
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Inventory Hub", url: "/inventory", icon: Package },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const logisticsNav: NavItem[] = [
  { title: "Warehouses", url: "/warehouses", icon: Building2 },
  { title: "Suppliers", url: "/suppliers", icon: Users },
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

/** Section accent colors per nav item */
const navAccent: Record<string, { bg: string; text: string }> = {
  Dashboard:    { bg: "bg-primary/15",       text: "text-primary" },
  Products:     { bg: "bg-amber-500/15",     text: "text-amber-400" },
  Orders:       { bg: "bg-emerald-500/15",   text: "text-emerald-400" },
  Inventory:    { bg: "bg-blue-500/15",      text: "text-blue-400" },
  Analytics:    { bg: "bg-cyan-500/15",      text: "text-cyan-400" },
  Warehouses:   { bg: "bg-blue-500/15",      text: "text-blue-400" },
  Suppliers:    { bg: "bg-purple-500/15",    text: "text-purple-400" },
  "Stock Ops":  { bg: "bg-emerald-500/15",   text: "text-emerald-400" },
  Accounting:   { bg: "bg-rose-500/15",      text: "text-rose-400" },
  Businesses:   { bg: "bg-primary/15",       text: "text-primary" },
  Categories:   { bg: "bg-amber-500/15",     text: "text-amber-400" },
  Properties:   { bg: "bg-indigo-500/15",    text: "text-indigo-400" },
  Services:     { bg: "bg-violet-500/15",    text: "text-violet-400" },
  Team:         { bg: "bg-primary/15",       text: "text-primary" },
  History:      { bg: "bg-yellow-500/15",    text: "text-yellow-400" },
  "Audit Logs": { bg: "bg-slate-500/15",     text: "text-slate-400" },
  Utilities:    { bg: "bg-slate-500/15",     text: "text-slate-400" },
  Settings:     { bg: "bg-slate-500/15",     text: "text-slate-400" },
};

const defaultAccent = { bg: "bg-primary/15", text: "text-primary" };

/* ─── Section accent colors for the group header badges ─── */
const groupAccent: Record<string, { icon: string; ring: string; dot: string }> = {
  Overview:   { icon: "text-primary",       ring: "border-primary/30",       dot: "bg-primary" },
  Logistics:  { icon: "text-blue-400",      ring: "border-blue-400/30",      dot: "bg-blue-400" },
  Financials: { icon: "text-rose-400",      ring: "border-rose-400/30",      dot: "bg-rose-400" },
  Manage:     { icon: "text-amber-400",     ring: "border-amber-400/30",     dot: "bg-amber-400" },
  System:     { icon: "text-slate-400",     ring: "border-slate-400/30",     dot: "bg-slate-400" },
};

/* ─── Mobile NavGroup: collapsible accordion ─── */
interface NavGroupProps {
  label: string;
  items: NavItem[];
  isExpanded: boolean;
  onToggle: () => void;
  isMobile: boolean;
  collapsed: boolean;
  setOpenMobile: (open: boolean) => void;
}

function NavGroup({
  label,
  items,
  isExpanded,
  onToggle,
  isMobile,
  collapsed,
  setOpenMobile,
}: NavGroupProps) {
  const g = groupAccent[label] ?? { icon: "text-primary", ring: "border-primary/30", dot: "bg-primary" };

  /* ── MOBILE: accordion dropdown ── */
  if (isMobile) {
    return (
      <SidebarGroup className="px-3 py-0">
        {/* Section header / toggle button */}
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left",
            "transition-all duration-200 focus:outline-none",
            isExpanded
              ? "bg-sidebar-accent/50"
              : "hover:bg-sidebar-accent/30"
          )}
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2.5">
            {/* Colored indicator dot */}
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", g.dot)} />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-sidebar-foreground/70">
              {label}
            </span>
            {/* Item count badge */}
            <span className={cn(
              "flex h-4 min-w-[1rem] items-center justify-center rounded-full border px-1",
              "text-[9px] font-bold text-sidebar-foreground/50",
              g.ring
            )}>
              {items.length}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-sidebar-foreground/40 transition-transform duration-300",
              isExpanded ? "rotate-0" : "-rotate-90"
            )}
          />
        </button>

        {/* Collapsible content */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-in-out overflow-hidden",
            isExpanded
              ? "grid-rows-[1fr] opacity-100 mt-1 mb-1"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
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
          </div>
        </div>
      </SidebarGroup>
    );
  }

  /* ── DESKTOP: standard sidebar group (always visible) ── */
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
                  className={cn(
                    "hover:bg-sidebar-accent flex w-full h-full items-center transition-colors duration-200",
                    collapsed && "justify-center"
                  )}
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
}

/* ─── AppSidebar ─── */
export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const collapsed = state === "collapsed";

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Overview:   true,
    Logistics:  false,
    Financials: false,
    Manage:     false,
    System:     false,
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const groups = [
    { label: "Overview",   items: mainNav },
    { label: "Logistics",  items: logisticsNav },
    { label: "Financials", items: financeNav },
    { label: "Manage",     items: manageNav },
    { label: "System",     items: systemNav },
  ];

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleLogout = () => {
    setOpenMobile(false);
    logout();
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

      <SidebarContent className={cn(isMobile ? "gap-1.5 py-3" : "gap-0")}>
        {isMobile ? (
          /* ── Mobile: render all sections as accordion, no separators ── */
          groups.map(({ label, items }) => (
            <NavGroup
              key={label}
              label={label}
              items={items}
              isExpanded={expandedGroups[label] ?? false}
              onToggle={() => toggleGroup(label)}
              isMobile={isMobile}
              collapsed={collapsed}
              setOpenMobile={setOpenMobile}
            />
          ))
        ) : (
          /* ── Desktop: render all sections with separators ── */
          groups.map(({ label, items }, idx) => (
            <div key={label}>
              {idx > 0 && <SidebarSeparator />}
              <NavGroup
                label={label}
                items={items}
                isExpanded={true}
                onToggle={() => {}}
                isMobile={false}
                collapsed={collapsed}
                setOpenMobile={setOpenMobile}
              />
            </div>
          ))
        )}
      </SidebarContent>

      {/* ── Mobile: sticky profile + logout footer ── */}
      {isMobile && (
        <div className="sticky bottom-0 z-10 border-t border-sidebar-border/40 bg-sidebar-background/95 backdrop-blur-md px-3 py-3 pb-safe-bottom">
          {/* Profile row */}
          <Link
            to="/profile"
            onClick={() => setOpenMobile(false)}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-sidebar-accent/60 active:scale-[0.98] group"
          >
            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-sm font-black text-primary ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-sidebar-foreground leading-tight">
                {user?.displayName ?? "User"}
              </p>
              <p className="truncate text-[10px] text-sidebar-foreground/50 font-medium">
                @{user?.username} · <span className="capitalize">{user?.role?.replace(/_/g, " ")}</span>
              </p>
            </div>
            <User className="h-4 w-4 shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 transition-colors" />
          </Link>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="mt-1.5 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 hover:bg-rose-500/10 active:scale-[0.98] group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 transition-all group-hover:bg-rose-500/20">
              <LogOut className="h-5 w-5 text-rose-400 group-hover:text-rose-500 transition-colors" />
            </div>
            <span className="text-sm font-bold text-rose-400 group-hover:text-rose-500 transition-colors">
              Sign Out
            </span>
          </button>
        </div>
      )}
    </Sidebar>
  );
}
