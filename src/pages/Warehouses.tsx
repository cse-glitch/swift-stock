import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Warehouse, type WarehouseStock, type Business } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, MapPin, Boxes, ArrowRightLeft, ShieldCheck, Activity, Trash2, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Warehouses() {
  const { activeBusinessId, businesses } = useBusiness();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    location: '', 
    capacity: '', 
    isMain: false,
    managerName: '',
    managerPhone: '',
    primaryProducts: '',
    businessId: activeBusinessId || ''
  });

  const warehousesFromDB = useLiveQuery(
    () => activeBusinessId 
      ? db.warehouses.where('businessId').equals(activeBusinessId).toArray()
      : db.warehouses.toArray(),
    [activeBusinessId]
  );

  const allStocksFromDB = useLiveQuery(() => db.warehouseStock.toArray());

  const warehouses = useMemo(() => warehousesFromDB ?? [], [warehousesFromDB]);
  const allStocks = useMemo(() => allStocksFromDB ?? [], [allStocksFromDB]);

  const stats = useMemo(() => {
    const total = warehouses.length;
    const mainCount = warehouses.filter(w => w.isMain).length;
    const stockCount = allStocks.reduce((sum, s) => sum + s.quantity, 0);
    return { total, mainCount, stockCount };
  }, [warehouses, allStocks]);

  const handleSave = async () => {
    if (!form.name || !form.businessId) {
      toast.error('Name and Business are required');
      return;
    }

    try {
      if (editingWarehouse) {
        await db.warehouses.update(editingWarehouse.id, {
          name: form.name,
          location: form.location,
          capacity: parseFloat(form.capacity) || undefined,
          isMain: form.isMain,
          managerName: form.managerName,
          managerPhone: form.managerPhone,
          primaryProducts: form.primaryProducts,
          businessId: form.businessId
        });
        toast.success('Warehouse updated');
      } else {
        await db.warehouses.add({
          id: crypto.randomUUID(),
          businessId: form.businessId,
          name: form.name,
          location: form.location,
          capacity: parseFloat(form.capacity) || undefined,
          isMain: form.isMain,
          managerName: form.managerName,
          managerPhone: form.managerPhone,
          primaryProducts: form.primaryProducts,
          isActive: true
        });
        toast.success('Warehouse added');
      }
      setIsAddOpen(false);
      setEditingWarehouse(null);
      setForm({ name: '', location: '', capacity: '', isMain: false, managerName: '', managerPhone: '', primaryProducts: '', businessId: activeBusinessId || '' });
    } catch (err) {
      toast.error('Failed to save warehouse');
    }
  };

  const openEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setForm({
      name: w.name,
      location: w.location,
      capacity: w.capacity?.toString() ?? '',
      isMain: w.isMain,
      managerName: w.managerName ?? '',
      managerPhone: w.managerPhone ?? '',
      primaryProducts: w.primaryProducts ?? '',
      businessId: w.businessId
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Management</h1>
          <p className="text-muted-foreground mt-1">Manage multiple storage locations and stock distribution</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => {
              setEditingWarehouse(null);
              setForm({ name: '', location: '', capacity: '', isMain: false });
            }}>
              <Plus className="h-4 w-4" /> Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? 'Edit' : 'Add New'} Warehouse</DialogTitle>
              <DialogDescription>Enter the details for your storage facility.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Warehouse Name</Label>
                <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Central Distribution" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location / Address</Label>
                <Input id="location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="123 Storage Lane" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacity (Units)</Label>
                  <Input id="capacity" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="5000" />
                </div>
                <div className="flex items-end pb-1">
                   <label className="flex items-center gap-2 cursor-pointer">
                     <input type="checkbox" checked={form.isMain} onChange={e => setForm(f => ({ ...f, isMain: e.target.checked }))} className="rounded border-gray-300 text-primary focus:ring-primary" />
                     <span className="text-sm font-medium">Main Hub</span>
                   </label>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="business">Assigned Business</Label>
                <Select value={form.businessId} onValueChange={v => setForm(f => ({ ...f, businessId: v }))}>
                  <SelectTrigger id="business">
                    <SelectValue placeholder="Select Business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="managerName">Manager Name</Label>
                  <Input id="managerName" value={form.managerName} onChange={e => setForm(f => ({ ...f, managerName: e.target.value }))} placeholder="John Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="managerPhone">Manager Contact</Label>
                  <Input id="managerPhone" value={form.managerPhone} onChange={e => setForm(f => ({ ...f, managerPhone: e.target.value }))} placeholder="+880..." />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="primaryProducts">Products Handled / Description</Label>
                <Input id="primaryProducts" value={form.primaryProducts} onChange={e => setForm(f => ({ ...f, primaryProducts: e.target.value }))} placeholder="e.g. Electronics, Raw Materials, Finished Goods" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingWarehouse ? 'Update' : 'Create'} Warehouse</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Facilities</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-amber-500/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Main Hubs</p>
              <p className="text-2xl font-bold">{stats.mainCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-emerald-500/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Boxes className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Live Stock Units</p>
              <p className="text-2xl font-bold">{stats.stockCount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((w) => {
          const warehouseStocks = allStocks.filter(s => s.warehouseId === w.id);
          const stockValue = warehouseStocks.reduce((sum, s) => sum + s.quantity, 0);
          const biz = businesses.find(b => b.id === w.businessId);

          return (
            <Card key={w.id} className="group overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-md transition-all hover:-translate-y-1">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:w-2 transition-all" />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{w.name}</CardTitle>
                      {w.isMain && <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Main Hub</Badge>}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground gap-1">
                      <MapPin className="h-3 w-3" /> {w.location}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => openEdit(w)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={async () => {
                      if (confirm('Delete this warehouse?')) {
                        await db.warehouses.delete(w.id);
                        toast.success('Warehouse removed');
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Stock</p>
                    <p className="text-lg font-bold mt-1">{stockValue} <span className="text-xs font-normal text-muted-foreground">units</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Utilization</p>
                    <p className="text-lg font-bold mt-1">
                      {w.capacity ? Math.round((stockValue / w.capacity) * 100) : 0}%
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-col gap-2">
                  {w.managerName && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span className="font-medium text-foreground">{w.managerName}</span>
                      {w.managerPhone && <span>({w.managerPhone})</span>}
                    </div>
                  )}
                  {w.primaryProducts && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span className="truncate">{w.primaryProducts}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {biz?.name || 'All Access'}
                      </Badge>
                    </div>
                    <StockTransferDialog sourceWarehouse={w} warehouses={warehouses} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {warehouses.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl opacity-50">
            <Building2 className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No warehouses defined yet</p>
            <p className="text-sm">Click "Add Warehouse" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StockTransferDialog({ sourceWarehouse, warehouses }: { sourceWarehouse: Warehouse, warehouses: Warehouse[] }) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState<string>('');
  const [variantId, setVariantId] = useState<string>('');
  const [qty, setQty] = useState('');

  const currentStocks = useLiveQuery(
    () => db.warehouseStock.where('warehouseId').equals(sourceWarehouse.id).toArray(),
    [sourceWarehouse.id]
  ) ?? [];

  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];
  const products = useLiveQuery(() => db.products.toArray()) ?? [];

  const handleTransfer = async () => {
    if (!targetId || !variantId || !qty) {
      toast.error('All fields are required');
      return;
    }

    const amount = parseInt(qty);
    const sourceStock = currentStocks.find(s => s.variantId === variantId);

    if (!sourceStock || sourceStock.quantity < amount) {
      toast.error('Insufficient stock in source warehouse');
      return;
    }

    try {
      await db.transaction('rw', [db.warehouseStock, db.inventoryLog, db.stockTransfers], async () => {
        await db.warehouseStock.update(sourceStock.id, { quantity: sourceStock.quantity - amount });

        const targetStock = await db.warehouseStock.where({ warehouseId: targetId, variantId }).first();
        if (targetStock) {
          await db.warehouseStock.update(targetStock.id, { quantity: targetStock.quantity + amount });
        } else {
          await db.warehouseStock.add({
            id: crypto.randomUUID(),
            warehouseId: targetId,
            variantId,
            quantity: amount,
            lastUpdated: new Date()
          });
        }

        await db.stockTransfers.add({
          id: crypto.randomUUID(),
          businessId: sourceWarehouse.businessId,
          sourceWarehouseId: sourceWarehouse.id,
          targetWarehouseId: targetId,
          variantId,
          quantity: amount,
          status: 'completed',
          performedBy: 'current-user', // Should be auth.user.id
          createdAt: new Date()
        });
      });

      toast.success('Stock transferred successfully');
      setOpen(false);
      setQty('');
    } catch (err) {
      toast.error('Transfer failed');
    }
  };

  const otherWarehouses = warehouses.filter(w => w.id !== sourceWarehouse.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <ArrowRightLeft className="h-3 w-3" /> Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock Transfer</DialogTitle>
          <DialogDescription>Move items from {sourceWarehouse.name} to another location.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Item to Move</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an item in stock..." />
              </SelectTrigger>
              <SelectContent>
                {currentStocks.filter(s => s.quantity > 0).map(s => {
                  const v = variants.find(v => v.id === s.variantId);
                  const p = products.find(p => p.id === v?.productId);
                  return (
                    <SelectItem key={s.id} value={s.variantId}>
                      {p?.name} {v?.name ? `(${v.name})` : ''} — {s.quantity} available
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Destination Warehouse</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Where to?" />
              </SelectTrigger>
              <SelectContent>
                {otherWarehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Quantity</Label>
            <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleTransfer}>Confirm Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

