import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Supplier, type Business } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Plus, Mail, Phone, MapPin, 
  CreditCard, Briefcase, Trash2, Pencil,
  Search, Filter, ExternalLink, ShieldCheck,
  TrendingUp, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SUPPLIER_CATEGORIES = ['Wholesale', 'Manufacturer', 'Distributor', 'Local Vendor', 'International'];

export default function Suppliers() {
  const { activeBusinessId, businesses } = useBusiness();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ 
    name: '', email: '', phone: '', address: '', 
    category: 'Wholesale', paymentTerms: 'Net 30', creditLimit: '0' 
  });

  const rawSuppliers = useLiveQuery(
    () => {
      const query = activeBusinessId 
        ? db.suppliers.where('businessId').equals(activeBusinessId)
        : db.suppliers;
      
      return query.toArray();
    },
    [activeBusinessId]
  ) ?? [];

  const suppliers = useMemo(() => rawSuppliers, [rawSuppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [suppliers, search]);

  const handleSave = async () => {
    if (!form.name || !activeBusinessId) {
      toast.error('Name and Business are required');
      return;
    }

    try {
      if (editingSupplier) {
        await db.suppliers.update(editingSupplier.id, {
          ...form,
          creditLimit: parseFloat(form.creditLimit) || 0
        });
        toast.success('Supplier updated');
      } else {
        await db.suppliers.add({
          id: crypto.randomUUID(),
          businessId: activeBusinessId,
          ...form,
          creditLimit: parseFloat(form.creditLimit) || 0,
          isActive: true
        });
        toast.success('Supplier added');
      }
      setIsAddOpen(false);
      setEditingSupplier(null);
      setForm({ name: '', email: '', phone: '', address: '', category: 'Wholesale', paymentTerms: 'Net 30', creditLimit: '0' });
    } catch (err) {
      toast.error('Failed to save supplier');
    }
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      category: s.category,
      paymentTerms: s.paymentTerms,
      creditLimit: s.creditLimit.toString()
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Network</h1>
          <p className="text-muted-foreground mt-1">Manage vendors, manufacturers, and supply chain partners</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => {
                setEditingSupplier(null);
                setForm({ name: '', email: '', phone: '', address: '', category: 'Wholesale', paymentTerms: 'Net 30', creditLimit: '0' });
              }}>
                <Plus className="h-4 w-4" /> Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? 'Edit' : 'Add'} Supplier</DialogTitle>
                <DialogDescription>Register a new supply partner in your system.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Company Name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Global Trade Co." />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUPPLIER_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@supplier.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full street address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Payment Terms</Label>
                    <Input value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} placeholder="Net 30" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Credit Limit</Label>
                    <Input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} placeholder="50000" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingSupplier ? 'Update' : 'Register'} Supplier</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Suppliers", value: suppliers.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Pending Orders", value: 0, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Total Credit Used", value: "$0", icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Top Supplier", value: "N/A", icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-4 bg-card/30 p-2 rounded-2xl border backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search suppliers by name, email, or category..." 
            className="pl-9 bg-transparent border-none focus-visible:ring-0" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((s) => (
          <Card key={s.id} className="group overflow-hidden border-none shadow-lg bg-card/50 backdrop-blur-md transition-all hover:shadow-2xl hover:-translate-y-1">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={async () => {
                    if (confirm('Delete this supplier?')) {
                      await db.suppliers.delete(s.id);
                      toast.success('Supplier removed');
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-3 text-xl">{s.name}</CardTitle>
              <Badge variant="secondary" className="w-fit mt-1">{s.category}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {s.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {s.phone}</div>
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {s.address}</div>
              </div>
              
              <div className="pt-4 border-t flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Credit Limit</p>
                  <p className="font-mono font-bold">${s.creditLimit.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Terms</p>
                  <p className="font-medium">{s.paymentTerms}</p>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2 text-xs group/btn">
                <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all" />
                Supplier Portal
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredSuppliers.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl opacity-50">
            <Briefcase className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No suppliers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
