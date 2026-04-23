import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type Variant, type Business } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { getBusinessConfig } from '@/lib/business-config';
import { normalizeSku, validateSkuFormat, checkSkuConflicts, type SkuConflict } from '@/lib/sku-validation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VariantManager } from '@/components/VariantManager';
import { DynamicAttributeEditor } from '@/components/DynamicAttributeEditor';
import { Plus, Search, BoxesIcon, AlertTriangle, Pencil, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Products() {
  const { businesses, activeBusiness, activeBusinessId, setActiveBusinessId } = useBusiness();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const products = useLiveQuery(
    () => activeBusinessId
      ? db.products.where('businessId').equals(activeBusinessId).toArray()
      : db.products.toArray(),
    [activeBusinessId]
  ) ?? [];

  const categories = useLiveQuery(
    () => activeBusinessId
      ? db.categories.where('businessId').equals(activeBusinessId).toArray()
      : db.categories.toArray(),
    [activeBusinessId]
  ) ?? [];

  const variants = useLiveQuery(() => db.variants.toArray()) ?? [];

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function getProductVariants(productId: number) {
    return variants.filter(v => v.productId === productId);
  }

  function getTotalStock(productId: number) {
    return getProductVariants(productId).reduce((sum, v) => sum + v.stock, 0);
  }

  function getBizForProduct(p: Product): Business | undefined {
    return businesses.find(b => b.id === p.businessId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">
            {activeBusiness ? `Managing ${activeBusiness.name}` : 'All business products'}
          </p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9" />
        </div>
        <div className="flex gap-3">
          <Select
            value={activeBusinessId?.toString() ?? "all"}
            onValueChange={v => setActiveBusinessId(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="All Businesses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businesses.map(b => (
                <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                {!activeBusinessId && <TableHead>Business</TableHead>}
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No products found. Add your first product to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(product => {
                  const biz = getBizForProduct(product);
                  const config = biz ? getBusinessConfig(biz.type) : null;
                  const totalStock = getTotalStock(product.id!);
                  const cat = categories.find(c => c.id === product.categoryId);
                  const pvariants = getProductVariants(product.id!);
                  const lowStock = pvariants.some(v => v.stock <= v.lowStockThreshold);

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{product.name}</span>
                          {lowStock && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                        </div>
                        {product.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {product.tags.slice(0, 3).map(t => (
                              <Badge key={t} variant="outline" className="text-[10px] px-1">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                      {!activeBusinessId && (
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: biz ? `hsl(${biz.color})` : undefined }} />
                            <span className="text-xs">{biz?.name}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-sm">{cat?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs capitalize">{product.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {config?.hasStock ? totalStock : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.status === 'active' ? 'default' : product.status === 'draft' ? 'secondary' : 'outline'}
                          className="text-xs capitalize"
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingProduct(product); setDialogOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        businesses={businesses}
        activeBusiness={activeBusiness}
        categories={categories}
        existingVariants={editingProduct ? getProductVariants(editingProduct.id!) : []}
      />
    </div>
  );
}

/* ── Product Add/Edit Dialog ── */

function ProductDialog({
  open,
  onOpenChange,
  product,
  businesses,
  activeBusiness,
  categories,
  existingVariants,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  businesses: Business[];
  activeBusiness: Business | null;
  categories: { id?: number; businessId: number; name: string }[];
  existingVariants: Variant[];
}) {
  const isEdit = !!product;

  const [businessId, setBusinessId] = useState<string>(product?.businessId?.toString() ?? activeBusiness?.id?.toString() ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [categoryId, setCategoryId] = useState<string>(product?.categoryId?.toString() ?? 'none');
  const [description, setDescription] = useState(product?.description ?? '');
  const [basePrice, setBasePrice] = useState(product?.basePrice?.toString() ?? '');
  const [status, setStatus] = useState(product?.status ?? 'active');
  const [tags, setTags] = useState(product?.tags?.join(', ') ?? '');
  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>(product?.attributes ?? {});
  const [isSeasonal, setIsSeasonal] = useState(product?.isSeasonal ?? false);
  const [seasonStart, setSeasonStart] = useState(product?.seasonStart ?? '');
  const [seasonEnd, setSeasonEnd] = useState(product?.seasonEnd ?? '');
  const [expiryTracking, setExpiryTracking] = useState(product?.expiryTracking ?? false);
  const [variantsList, setVariantsList] = useState<Omit<Variant, 'id' | 'productId'>[]>(
    existingVariants.map(({ id, productId, ...rest }) => rest)
  );

  // Inline error states
  const [skuError, setSkuError] = useState<string | null>(null);
  const [variantSkuErrors, setVariantSkuErrors] = useState<Record<number, string>>({});

  // Conflict confirmation modal
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<SkuConflict[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedBiz = businesses.find(b => b.id === Number(businessId));
  const config = selectedBiz ? getBusinessConfig(selectedBiz.type) : null;
  const bizCategories = categories.filter(c => c.businessId === Number(businessId));
  const productType = config?.hasStock
    ? (config.type === 'properties' ? 'listing' : 'physical')
    : config?.type === 'services' ? 'service' : 'physical';

  // Normalize SKU on change
  function handleSkuChange(raw: string) {
    const normalized = normalizeSku(raw);
    setSku(normalized);
    const fmtErr = validateSkuFormat(normalized);
    setSkuError(fmtErr);
  }

  async function handleSave() {
    // 1. Basic required fields
    if (!name.trim() || !sku.trim() || !businessId) {
      toast({ title: 'Missing fields', description: 'Name, SKU, and business are required.', variant: 'destructive' });
      return;
    }

    // 2. Format validation
    const normalizedSku = normalizeSku(sku);
    const fmtErr = validateSkuFormat(normalizedSku);
    if (fmtErr) {
      setSkuError(fmtErr);
      toast({ title: 'Invalid SKU format', description: fmtErr, variant: 'destructive' });
      return;
    }

    // Validate variant SKU formats
    const varFmtErrors: Record<number, string> = {};
    variantsList.forEach((v, i) => {
      if (v.sku) {
        const err = validateSkuFormat(normalizeSku(v.sku));
        if (err) varFmtErrors[i] = err;
      }
    });
    if (Object.keys(varFmtErrors).length > 0) {
      setVariantSkuErrors(varFmtErrors);
      toast({ title: 'Invalid variant SKU format', description: 'Fix the highlighted variant SKUs.', variant: 'destructive' });
      return;
    }

    // 3. Uniqueness checks
    setSaving(true);
    const bizId = Number(businessId);
    const normalizedVariantSkus = variantsList.map(v => normalizeSku(v.sku));
    const { productError, variantErrors, conflicts } = await checkSkuConflicts(
      bizId, normalizedSku, normalizedVariantSkus, product?.id
    );

    if (productError || Object.keys(variantErrors).length > 0) {
      setSkuError(productError);
      setVariantSkuErrors(variantErrors);

      if (conflicts.length > 0) {
        // Show confirmation modal with conflict details
        setPendingConflicts(conflicts);
        setConflictModalOpen(true);
        setSaving(false);
        return;
      }

      toast({ title: 'SKU conflicts found', description: 'Fix the highlighted fields.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    await commitSave(normalizedSku, normalizedVariantSkus);
  }

  async function commitSave(finalSku?: string, finalVariantSkus?: string[]) {
    setSaving(true);
    const normalizedSku = finalSku ?? normalizeSku(sku);
    const normalizedVarSkus = finalVariantSkus ?? variantsList.map(v => normalizeSku(v.sku));

    const productData: Omit<Product, 'id'> = {
      businessId: Number(businessId),
      categoryId: categoryId !== 'none' ? Number(categoryId) : undefined,
      name: name.trim(),
      sku: normalizedSku,
      type: productType,
      description: description.trim() || undefined,
      basePrice: basePrice ? Number(basePrice) : undefined,
      currency: 'BDT',
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      attributes,
      status: status as 'active' | 'draft' | 'archived',
      isSeasonal,
      seasonStart: isSeasonal ? seasonStart : undefined,
      seasonEnd: isSeasonal ? seasonEnd : undefined,
      expiryTracking,
      createdAt: product?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    try {
      let productId: number;
      if (isEdit && product?.id) {
        await db.products.update(product.id, productData);
        productId = product.id;
        await db.variants.where('productId').equals(productId).delete();
      } else {
        productId = await db.products.add(productData as Product);
      }

      if (variantsList.length > 0) {
        await db.variants.bulkAdd(
          variantsList.map((v, i) => ({
            ...v,
            sku: normalizedVarSkus[i],
            productId,
          }) as Variant)
        );
      }

      toast({ title: isEdit ? 'Product updated' : 'Product added' });
      setSkuError(null);
      setVariantSkuErrors({});
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BoxesIcon className="h-5 w-5 text-primary" />
              {isEdit ? 'Edit Product' : 'New Product'}
              {config && (
                <Badge variant="secondary" className="ml-2 capitalize">{config.productLabel}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
              <TabsTrigger value="attributes" className="flex-1">Attributes</TabsTrigger>
              {config?.hasVariants && <TabsTrigger value="variants" className="flex-1">Variants</TabsTrigger>}
              <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {!activeBusiness && (
                <div>
                  <Label>Business</Label>
                  <Select value={businessId} onValueChange={setBusinessId}>
                    <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                    <SelectContent>
                      {businesses.map(b => (
                        <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Product name" />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={sku}
                    onChange={e => handleSkuChange(e.target.value)}
                    placeholder="PRD-001"
                    className={`font-mono uppercase ${skuError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    maxLength={30}
                  />
                  {skuError && (
                    <p className="text-xs text-destructive mt-1">{skuError}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">A-Z, 0-9, hyphens. 2–30 chars. Auto-uppercased.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {bizCategories.map(c => (
                        <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Base Price</Label>
                  <Input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={3} />
              </div>

              <div>
                <Label>Tags (comma-separated)</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="summer, new arrival, trending" />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as 'active' | 'draft' | 'archived')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="attributes" className="mt-4">
              {config ? (
                <DynamicAttributeEditor fields={config.attributeFields} values={attributes} onChange={setAttributes} />
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Select a business first to see type-specific attributes.</p>
              )}
            </TabsContent>

            {config?.hasVariants && (
              <TabsContent value="variants" className="mt-4">
                <VariantManager
                  variants={variantsList}
                  onChange={setVariantsList}
                  attributeLabels={config.variantAttributes}
                  skuErrors={variantSkuErrors}
                />
              </TabsContent>
            )}

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Seasonal Product</p>
                  <p className="text-xs text-muted-foreground">Mark as available only during certain periods</p>
                </div>
                <Switch checked={isSeasonal} onCheckedChange={setIsSeasonal} />
              </div>

              {isSeasonal && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Season Start</Label>
                    <Input type="date" value={seasonStart} onChange={e => setSeasonStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>Season End</Label>
                    <Input type="date" value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Expiry Tracking</p>
                  <p className="text-xs text-muted-foreground">Enable for perishable items (agro/food)</p>
                </div>
                <Switch checked={expiryTracking} onCheckedChange={setExpiryTracking} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Checking...' : isEdit ? 'Update' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Confirmation Modal */}
      <Dialog open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              SKU Conflicts Detected
            </DialogTitle>
            <DialogDescription>
              The following SKUs conflict with existing records in this business.
              Go back and fix them, or review the details below.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Conflicts With</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingConflicts.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{c.sku}</TableCell>
                    <TableCell>{c.existingName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{c.existingType}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictModalOpen(false)}>
              Go Back & Fix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
