import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type Service } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Briefcase, Clock, Users, Plus, Calendar, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ServicesPage() {
  const { businesses } = useBusiness();
  const svcBiz = businesses.find(b => b.type === 'services');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const services = useLiveQuery(() => db.services.toArray()) ?? [];
  const products = useLiveQuery(
    () => svcBiz?.id ? db.products.where('businessId').equals(svcBiz.id).toArray() : Promise.resolve([]),
    [svcBiz?.id]
  ) ?? [];

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [duration, setDuration] = useState('');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');
  const [availableDays, setAvailableDays] = useState<string[]>(DAYS.slice(0, 5));

  function getProduct(svc: Service) {
    return products.find(p => p.id === svc.productId);
  }

  function toggleDay(day: string) {
    setAvailableDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  function handleEdit(svc: Service) {
    const product = getProduct(svc);
    setEditingService(svc);
    setName(product?.name ?? '');
    setSku(product?.sku ?? '');
    setDuration(svc.duration ?? '');
    setCapacity(svc.capacity?.toString() ?? '');
    setPrice(product?.basePrice?.toString() ?? '');
    setAvailableDays(svc.availableDays);
    setDialogOpen(true);
  }

  async function handleDelete(svc: Service) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await db.transaction('rw', [db.services, db.products], async () => {
        await db.services.delete(svc.id!);
        await db.products.delete(svc.productId);
      });
      toast({ title: 'Service deleted' });
    } catch (err) {
      toast({ title: 'Error deleting service', variant: 'destructive' });
    }
  }

  async function handleSave() {
    if (!name.trim() || !svcBiz?.id) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }

    const productData: Omit<Product, 'id'> = {
      businessId: svcBiz.id,
      name: name.trim(),
      sku: sku.trim() || (editingService ? getProduct(editingService)?.sku || '' : `SVC-${Date.now()}`),
      type: 'service',
      currency: 'BDT',
      tags: ['service'],
      attributes: {},
      status: 'active',
      isSeasonal: false,
      expiryTracking: false,
      basePrice: price ? Number(price) : undefined,
      createdAt: editingService ? getProduct(editingService)?.createdAt || new Date() : new Date(),
      updatedAt: new Date(),
    };

    const serviceData: Omit<Service, 'id' | 'productId'> = {
      duration: duration.trim() || undefined,
      capacity: capacity ? Number(capacity) : undefined,
      currentBookings: editingService?.currentBookings ?? 0,
      availableDays,
    };

    try {
      await db.transaction('rw', [db.products, db.services], async () => {
        let productId: number;
        if (editingService) {
          productId = editingService.productId;
          await db.products.update(productId, productData);
          await db.services.update(editingService.id!, serviceData);
        } else {
          productId = await db.products.add({ ...productData, createdAt: new Date() } as Product);
          await db.services.add({ ...serviceData, productId });
        }
      });

      toast({ title: editingService ? 'Service updated' : 'Service added' });
      setDialogOpen(false);
      setEditingService(null);
      setName(''); setSku(''); setDuration(''); setCapacity(''); setPrice('');
      setAvailableDays(DAYS.slice(0, 5));
    } catch (err) {
      toast({ title: 'Error saving service', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground">Manage workspace rentals and service offerings</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No services yet. Add your first offering.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map(svc => {
            const product = getProduct(svc);
            const utilization = svc.capacity ? Math.round((svc.currentBookings / svc.capacity) * 100) : null;
            return (
              <Card key={svc.id}>
                <div className="h-2" style={{ background: svcBiz ? `hsl(${svcBiz.color})` : undefined }} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{product?.name ?? 'Unknown'}</CardTitle>
                    <Badge variant={product?.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {product?.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {svc.duration && (
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{svc.duration}</span>
                    )}
                    {svc.capacity != null && (
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{svc.currentBookings}/{svc.capacity}</span>
                    )}
                  </div>

                  {utilization !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Utilization</span>
                        <span className="font-mono">{utilization}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-1 flex-wrap">
                    {svc.availableDays.map(day => (
                      <Badge key={day} variant="outline" className="text-[10px] px-1.5">{day}</Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(svc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(svc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {product?.basePrice && (
                      <p className="font-mono font-semibold text-foreground">৳{product.basePrice.toLocaleString()}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingService(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'New Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Service Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Workspace Rental" /></div>
              <div><Label>SKU</Label><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Auto-generated" className="font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Duration</Label><Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Hourly / Daily / Monthly" /></div>
              <div><Label>Capacity</Label><Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Max slots" /></div>
            </div>
            <div><Label>Price (৳)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" /></div>
            <div>
              <Label>Available Days</Label>
              <div className="flex gap-2 mt-2">
                {DAYS.map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={availableDays.includes(day) ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingService ? 'Update Service' : 'Create Service'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
