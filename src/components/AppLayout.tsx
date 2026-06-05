import { useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LowStockAlert } from "@/components/LowStockAlert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/use-auth";
import { MobileNav } from "@/components/MobileNav";

const ROLE_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  super_admin: { label: 'Super Admin', variant: 'default' },
  admin:       { label: 'Admin',       variant: 'default' },
  manager:     { label: 'Manager',     variant: 'secondary' },
  staff:       { label: 'Staff',       variant: 'outline' },
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const roleInfo = ROLE_LABEL[user?.role ?? 'staff'] ?? { label: 'Staff', variant: 'outline' as const };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden relative">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* ── Header ── */}
          <header className="h-14 flex items-center border-b px-3 sm:px-4 bg-card/80 backdrop-blur-md shrink-0 sticky top-0 z-30 shadow-sm transition-all duration-200">
            <SidebarTrigger className="mr-3 shrink-0" />

            {/* Centered brand on mobile */}
            <div className="flex-1 md:hidden flex justify-center">
              <Link to="/" className="flex items-center gap-2 select-none">
                <img src="/logo.svg" alt="SAMAN" className="h-6 w-6 object-contain" />
                <span className="font-black text-base tracking-tight text-foreground">
                  SAMAN
                </span>
              </Link>
            </div>

            {/* Spacer for desktop */}
            <div className="hidden md:flex flex-1 min-w-0" />

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <LowStockAlert />

              {/* ── Mobile: compact avatar dropdown ── */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary ring-2 ring-primary/20 hover:ring-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Account menu"
                    >
                      {initials}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none">{user?.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">@{user?.username}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer w-full flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer w-full flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onClick={logout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* ── Desktop: full name + badge dropdown ── */}
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 rounded-full px-2 gap-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Avatar className="h-7 w-7 border border-border/50">
                        <AvatarImage src="/logo.svg" alt="Profile" className="p-0.5 object-contain bg-white" />
                        <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                        {user?.displayName}
                      </span>
                      <Badge variant={roleInfo.variant} className="hidden sm:flex text-[10px] h-4 px-1.5">
                        {roleInfo.label}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold leading-none">{user?.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">@{user?.username}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer w-full flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to="/team" className="cursor-pointer w-full flex items-center">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          <span>Users & Roles</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="cursor-pointer w-full flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onClick={logout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* ── Page content ── */}
          <main
            key={location.pathname}
            className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 pb-[76px] md:pb-6 custom-scrollbar animate-page-enter"
          >
            {children}
          </main>

          <MobileNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
