import { useBusiness } from '@/contexts/BusinessContext';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, ShoppingBag, Shirt, Droplets, Leaf, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase,
};

export function BusinessSwitcher() {
  const { businesses, activeBusinessId, setActiveBusinessId } = useBusiness();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  if (collapsed) {
    return (
      <button
        onClick={() => setActiveBusinessId(null)}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        title="All Businesses"
      >
        <Building2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Select
      value={activeBusinessId?.toString() ?? 'all'}
      onValueChange={(v) => setActiveBusinessId(v === 'all' ? null : v)}
    >
      <SelectTrigger className="w-full border-0 bg-transparent text-sidebar-foreground text-xs h-9 shadow-none focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder="All Businesses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            All Businesses
          </span>
        </SelectItem>
        {businesses.filter(b => b.isActive).map(b => {
          const Icon = iconMap[b.icon] ?? Building2;
          return (
            <SelectItem key={b.id} value={b.id!.toString()}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${b.color})` }}
                />
                <span className="truncate">{b.name}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
