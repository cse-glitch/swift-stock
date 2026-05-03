import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 flex items-center border-b px-3 sm:px-4 bg-card shrink-0 sticky top-0 z-20 shadow-sm">
            <SidebarTrigger className="mr-3 shrink-0" />
            <div className="flex-1 min-w-0" />
          </header>
          {/* key forces React to remount (and re-animate) on every route change */}
          <main
            key={location.pathname}
            className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 custom-scrollbar animate-page-enter"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
