import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Business } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Plus, ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase, Pencil } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag, Shirt, Droplets, Building2, Leaf, Briefcase,
};

const typeLabels: Record<string, string> = {
  general: 'General',
  fashion: 'Fashion',
  lubricants: 'Lubricants',
  properties: 'Properties',
  agro: 'Agro & Food',
  services: 'Services',
};

const BusinessManager = () => {
  const businesses = useLiveQuery(() => db.businesses.toArray()) ?? [];
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', type: 'general' as Business['type'], icon: 'ShoppingBag' });

  const toggleActive = async (business: Business) => {
    await db.businesses.update(business.id!, { isActive: !business.isActive });
    toast.success(`${business.name} ${business.isActive ? 'disabled' : 'enabled'}`);
  };

  const openAdd = () => {
    setEditingBusiness(null);
    setForm({ name: '', slug: '', type: 'general', icon: 'ShoppingBag' });
    setIsDialogOpen(true);
  };

  const openEdit = (b: Business) => {
    setEditingBusiness(b);
    setForm({ name: b.name, slug: b.slug, type: b.type, icon: b.icon });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    if (editingBusiness) {
      await db.businesses.update(editingBusiness.id!, { name: form.name, slug: form.slug, type: form.type, icon: form.icon });
      toast.success('Business updated');
    } else {
      await db.businesses.add({ ...form, color: '230 65% 52%', isActive: true, createdAt: new Date() });
      toast.success('Business added');
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground">Manage your SAMAN business pages</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Business</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBusiness ? 'Edit' : 'Add'} Business</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="SAMAN XYZ" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="xyz" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Business['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingBusiness ? 'Update' : 'Add'} Business
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile view (Grouped rows) */}
      <div className="sm:hidden space-y-4">
        {businesses.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-50 bg-card/20">
            <Store className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">No businesses found</p>
          </div>
        ) : (
          <div className="bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/30 shadow-sm divide-y divide-border/40">
            {businesses.map(b => {
              const Icon = iconMap[b.icon] ?? Store;
              return (
                <div key={b.id} className={`flex items-center gap-3.5 px-4 py-3.5 transition-all ${!b.isActive ? 'opacity-50' : ''}`}>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `hsl(${b.color} / 0.15)`, color: `hsl(${b.color})` }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => openEdit(b)}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{b.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">{typeLabels[b.type]}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">/{b.slug}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Switch checked={b.isActive} onCheckedChange={() => toggleActive(b)} className="scale-90" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map(b => {
          const Icon = iconMap[b.icon] ?? Store;
          return (
            <Card key={b.id} className={`relative transition-all ${!b.isActive ? 'opacity-50' : ''}`}>
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `hsl(${b.color} / 0.15)`, color: `hsl(${b.color})` }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">/{b.slug}</p>
                  </div>
                </div>
                <Switch checked={b.isActive} onCheckedChange={() => toggleActive(b)} />
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">{typeLabels[b.type]}</Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BusinessManager;
