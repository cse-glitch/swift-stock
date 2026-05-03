import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type Variant, type Business } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { getBusinessConfig } from '@/lib/business-config';
import { normalizeSku, validateSkuFormat, checkSkuConflicts, type SkuConflict } from '@/lib/sku-validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useEffect } from 'react';

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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">
            {activeBusiness ? `Managing ${activeBusiness.name}` : 'All business products'}
          </p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setDialogOpen(true); }} className="shrink-0" size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={activeBusinessId?.toString() ?? "all"}
            onValueChange={v => setActiveBusinessId(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-card text-sm">
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
            <SelectTrigger className="w-full sm:w-32 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products List - Desktop Table & Mobile Cards */}
      <div className="space-y-4">
        {/* Mobile Card View */}
        <div className="grid gap-3 md:hidden">
          {filtered.length === 0 ? (
            <Card className="border-dashed py-12 text-center text-muted-foreground">
              <BoxesIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No products found</p>
            </Card>
          ) : (
            filtered.map((product) => {
              const biz = getBizForProduct(product);
              const config = biz ? getBusinessConfig(biz.type) : null;
              const totalStock = getTotalStock(product.id!);
              const cat = categories.find(c => c.id === product.categoryId);
              const pvariants = getProductVariants(product.id!);
              const lowStock = pvariants.some(v => v.stock <= v.lowStockThreshold);

              return (
                <Card key={product.id} className="overflow-hidden border-none shadow-md bg-card/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-foreground truncate">{product.name}</p>
                          {lowStock && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate font-mono">{product.sku}</p>
                      </div>
                      <Badge
                        variant={product.status === 'active' ? 'default' : product.status === 'draft' ? 'secondary' : 'outline'}
                        className="text-[10px] capitalize h-5"
                      >
                        {product.status}
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2 py-2 border-y border-border/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Business & Category</span>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className="whitespace-nowrap text-[10px] h-5 px-2"
                            style={{ borderColor: biz ? `hsl(${biz.color})` : undefined }}
                          >
                            {biz?.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">{cat?.name ?? '—'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</span>
                        <Badge variant="secondary" className="w-fit text-[10px] capitalize mt-1 h-5 px-2">{product.type}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Stock</span>
                        <span className="text-lg font-mono font-bold text-foreground mt-0.5">
                          {config?.hasStock ? totalStock.toLocaleString() : '—'}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingProduct(product); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Product</TableHead>
                    <TableHead className="hidden sm:table-cell">SKU</TableHead>
                    {!activeBusinessId && <TableHead className="hidden md:table-cell">Business</TableHead>}
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-14">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
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
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-medium text-foreground text-sm truncate max-w-[120px] sm:max-w-[200px]">{product.name}</span>
                              {lowStock && <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                            </div>
                            <div className="sm:hidden font-mono text-xs text-muted-foreground mt-0.5">{product.sku}</div>
                            {product.tags.length > 0 && (
                              <div className="hidden sm:flex gap-1 mt-1">
                                {product.tags.slice(0, 2).map(t => (
                                  <Badge key={t} variant="outline" className="text-[10px] px-1">{t}</Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                          {!activeBusinessId && (
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-1.5">
                                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: biz ? `hsl(${biz.color})` : undefined }} />
                                <span className="text-xs truncate max-w-[100px]">{biz?.name}</span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="hidden md:table-cell text-sm">{cat?.name ?? '—'}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary" className="text-xs capitalize">{product.type}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
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
            </div>
          </CardContent>
        </Card>
      </div>

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

  const [businessId, setBusinessId] = useState<string>('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string>('none');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [status, setStatus] = useState<Product['status']>('active');
  const [tags, setTags] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>({});
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [expiryTracking, setExpiryTracking] = useState(false);
  const [variantsList, setVariantsList] = useState<Omit<Variant, 'id' | 'productId'>[]>([]);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [variantSkuErrors, setVariantSkuErrors] = useState<Record<number, string>>({});
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<SkuConflict[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBusinessId(product?.businessId?.toString() ?? activeBusiness?.id?.toString() ?? '');
      setName(product?.name ?? '');
      setSku(product?.sku ?? '');
      setCategoryId(product?.categoryId?.toString() ?? 'none');
      setDescription(product?.description ?? '');
      setBasePrice(product?.basePrice?.toString() ?? '');
      setStatus(product?.status ?? 'active');
      setTags(product?.tags?.join(', ') ?? '');
      setAttributes(product?.attributes ?? {});
      setIsSeasonal(product?.isSeasonal ?? false);
      setSeasonStart(product?.seasonStart ?? '');
      setSeasonEnd(product?.seasonEnd ?? '');
      setExpiryTracking(product?.expiryTracking ?? false);
      setVariantsList(existingVariants.map(({ id, productId, ...rest }) => rest));
      setSkuError(null);
      setVariantSkuErrors({});
    }
  }, [open, product, existingVariants, activeBusiness]);

  const selectedBiz = businesses.find(b => b.id === Number(businessId));
  const config = selectedBiz ? getBusinessConfig(selectedBiz.type) : null;
  const bizCategories = categories.filter(c => c.businessId === Number(businessId));
  const productType = config?.hasStock
    ? (config.type === 'properties' ? 'listing' : 'physical')
    : config?.type === 'services' ? 'service' : 'physical';

  function handleSkuChange(raw: string) {
    const normalized = normalizeSku(raw);
    setSku(normalized);
    setSkuError(validateSkuFormat(normalized));
  }

  async function handleSave() {
    if (!name.trim() || !sku.trim() || !businessId) {
      toast({ title: 'Missing fields', description: 'Name, SKU, and business are required.', variant: 'destructive' });
      return;
    }
    const normalizedSku = normalizeSku(sku);
    const fmtErr = validateSkuFormat(normalizedSku);
    if (fmtErr) {
      setSkuError(fmtErr);
      toast({ title: 'Invalid SKU format', description: fmtErr, variant: 'destructive' });
      return;
    }
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BoxesIcon className="h-5 w-5 text-primary shrink-0" />
              {isEdit ? 'Edit Product' : 'New Product'}
              {config && (
                <Badge variant="secondary" className="ml-1 capitalize text-xs">{config.productLabel}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic</TabsTrigger>
              <TabsTrigger value="attributes" className="text-xs sm:text-sm">Attrs</TabsTrigger>
              {config?.hasVariants && <TabsTrigger value="variants" className="text-xs sm:text-sm">Variants</TabsTrigger>}
              <TabsTrigger value="advanced" className="text-xs sm:text-sm">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 mt-4">
              {!activeBusiness && (
                <div>
                  <Label className="text-sm">Business</Label>
                  <Select value={businessId} onValueChange={setBusinessId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select business" /></SelectTrigger>
                    <SelectContent>
                      {businesses.map(b => (
                        <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Product Name</Label>
                  <Input className="mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="Product name" />
                </div>
                <div>
                  <Label className="text-sm">SKU</Label>
                  <Input
                    className={`mt-1 font-mono uppercase ${skuError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    value={sku}
                    onChange={e => handleSkuChange(e.target.value)}
                    placeholder="PRD-001"
                    maxLength={30}
                  />
                  {skuError && <p className="text-xs text-destructive mt-1">{skuError}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">A-Z, 0-9, hyphens. 2–30 chars.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {bizCategories.map(c => (
                        <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Base Price (৳)</Label>
                  <Input className="mt-1" type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <div>
                <Label className="text-sm">Description</Label>
                <Textarea className="mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
              </div>

              <div>
                <Label className="text-sm">Tags (comma-separated)</Label>
                <Input className="mt-1" value={tags} onChange={e => setTags(e.target.value)} placeholder="summer, new arrival" />
              </div>

              <div>
                <Label className="text-sm">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as 'active' | 'draft' | 'archived')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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

            <TabsContent value="advanced" className="space-y-3 mt-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Seasonal Product</p>
                  <p className="text-xs text-muted-foreground">Mark as available only during certain periods</p>
                </div>
                <Switch checked={isSeasonal} onCheckedChange={setIsSeasonal} />
              </div>

              {isSeasonal && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Season Start</Label>
                    <Input className="mt-1" type="date" value={seasonStart} onChange={e => setSeasonStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-sm">Season End</Label>
                    <Input className="mt-1" type="date" value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Expiry Tracking</p>
                  <p className="text-xs text-muted-foreground">Enable for perishable items</p>
                </div>
                <Switch checked={expiryTracking} onCheckedChange={setExpiryTracking} />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Checking...' : isEdit ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              SKU Conflicts Detected
            </DialogTitle>
            <DialogDescription>
              The following SKUs conflict with existing records. Go back and fix them.
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
                    <TableCell className="text-sm">{c.existingName}</TableCell>
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
