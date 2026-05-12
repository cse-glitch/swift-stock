import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type PropertyListing } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, MapPin, Plus, BedDouble, Bath, Maximize, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Properties() {
  const { businesses } = useBusiness();
  const propBiz = businesses.find(b => b.type === 'properties');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<PropertyListing | null>(null);

  const listings = useLiveQuery(
    () => db.propertyListings.toArray(),
    []
  ) ?? [];

  const products = useLiveQuery(
    () => propBiz?.id
      ? db.products.where('businessId').equals(propBiz.id).toArray()
      : Promise.resolve([]),
    [propBiz?.id]
  ) ?? [];

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [price, setPrice] = useState('');
  const [availability, setAvailability] = useState<'available' | 'sold' | 'rented' | 'pending'>('available');

  function getProduct(listing: PropertyListing) {
    return products.find(p => p.id === listing.productId);
  }

  function handleEdit(listing: PropertyListing) {
    const product = getProduct(listing);
    setEditingListing(listing);
    setName(product?.name ?? '');
    setSku(product?.sku ?? '');
    setListingType(listing.listingType);
    setLocation(listing.location);
    setArea(listing.area?.toString() ?? '');
    setBedrooms(listing.bedrooms?.toString() ?? '');
    setBathrooms(listing.bathrooms?.toString() ?? '');
    setPrice(product?.basePrice?.toString() ?? '');
    setAvailability(listing.availability);
    setDialogOpen(true);
  }

  async function handleDelete(listing: PropertyListing) {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    
    try {
      await db.transaction('rw', [db.propertyListings, db.products], async () => {
        await db.propertyListings.delete(listing.id!);
        await db.products.delete(listing.productId);
      });
      toast({ title: 'Listing deleted' });
    } catch (err) {
      toast({ title: 'Error deleting listing', variant: 'destructive' });
    }
  }

  async function handleSave() {
    if (!name.trim() || !propBiz?.id) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }

    const productData: Omit<Product, 'id'> = {
      businessId: propBiz.id,
      name: name.trim(),
      sku: sku.trim() || (editingListing ? getProduct(editingListing)?.sku || '' : `PROP-${Date.now()}`),
      type: 'listing',
      currency: 'BDT',
      tags: [listingType],
      attributes: { propertyType: 'House' },
      status: 'active',
      isSeasonal: false,
      expiryTracking: false,
      basePrice: price ? Number(price) : undefined,
      createdAt: editingListing ? getProduct(editingListing)?.createdAt || new Date() : new Date(),
      updatedAt: new Date(),
    };

    const listingData: Omit<PropertyListing, 'id' | 'productId'> = {
      listingType,
      location: location.trim(),
      area: area ? Number(area) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      availability,
    };

    try {
      await db.transaction('rw', [db.products, db.propertyListings], async () => {
        let productId: number;
        if (editingListing) {
          productId = editingListing.productId;
          await db.products.update(productId, productData);
          await db.propertyListings.update(editingListing.id!, listingData);
        } else {
          productId = await db.products.add({ ...productData, createdAt: new Date() } as Product);
          await db.propertyListings.add({ ...listingData, productId });
        }
      });

      toast({ title: editingListing ? 'Property updated' : 'Property listing added' });
      setDialogOpen(false);
      setEditingListing(null);
      setName(''); setSku(''); setLocation(''); setArea(''); setBedrooms(''); setBathrooms(''); setPrice('');
    } catch (err) {
      toast({ title: 'Error saving property', variant: 'destructive' });
    }
  }

  const availabilityColors: Record<string, string> = {
    available: 'bg-success/10 text-success',
    sold: 'bg-destructive/10 text-destructive',
    rented: 'bg-primary/10 text-primary',
    pending: 'bg-warning/10 text-warning',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Property Listings</h1>
          <p className="text-sm text-muted-foreground">Manage real estate — buy, sell, and rent</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Listing
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No property listings yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listings.map(listing => {
            const product = getProduct(listing);
            return (
              <Card key={listing.id} className="overflow-hidden">
                <div className="h-2" style={{ background: propBiz ? `hsl(${propBiz.color})` : undefined }} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{product?.name ?? 'Unknown'}</CardTitle>
                    <Badge className={`capitalize text-xs ${availabilityColors[listing.availability]}`}>
                      {listing.availability}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {listing.location || 'No location'}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {listing.bedrooms != null && (
                      <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{listing.bedrooms}</span>
                    )}
                    {listing.bathrooms != null && (
                      <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{listing.bathrooms}</span>
                    )}
                    {listing.area != null && (
                      <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{listing.area} sqft</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(listing)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(listing)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {product?.basePrice && (
                      <span className="font-mono font-semibold text-foreground">৳{product.basePrice.toLocaleString()}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Property Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Property Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="3BR Apartment" /></div>
              <div><Label>SKU</Label><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="Auto-generated" className="font-mono" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Listing Type</Label>
                <Select value={listingType} onValueChange={v => setListingType(v as 'sale' | 'rent')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="rent">For Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Availability</Label>
                <Select value={availability} onValueChange={v => setAvailability(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Dhaka, Bangladesh" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Area (sqft)</Label><Input type="number" value={area} onChange={e => setArea(e.target.value)} /></div>
              <div><Label>Bedrooms</Label><Input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} /></div>
              <div><Label>Bathrooms</Label><Input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} /></div>
            </div>
            <div><Label>Price (৳)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingListing ? 'Update Listing' : 'Create Listing'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
