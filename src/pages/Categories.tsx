import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, type Category } from '@/lib/db';
import { useBusiness } from '@/contexts/BusinessContext';
import { getBusinessConfig } from '@/lib/business-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Layers, FolderTree, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Categories() {
  const { businesses, activeBusiness, activeBusinessId } = useBusiness();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('none');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const categories = useLiveQuery(
    () => activeBusinessId
      ? db.categories.where('businessId').equals(activeBusinessId).toArray()
      : db.categories.toArray(),
    [activeBusinessId]
  ) ?? [];

  const targetBusinessId = activeBusinessId ?? selectedBusinessId;

  const topLevel = categories.filter(c => !c.parentId);
  const getChildren = (parentId: string) => categories.filter(c => c.parentId === parentId);

  function openAdd() {
    setEditingCategory(null);
    setName('');
    setParentId('none');
    setSelectedBusinessId(activeBusinessId ?? null);
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setName(cat.name);
    setParentId(cat.parentId ?? 'none');
    setSelectedBusinessId(cat.businessId);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !targetBusinessId) {
      toast({ title: 'Missing fields', description: 'Name and business are required.', variant: 'destructive' });
      return;
    }

    const data = {
      businessId: targetBusinessId,
      name: name.trim(),
      parentId: parentId !== 'none' ? parentId : undefined,
    };

    if (editingCategory?.id) {
      await db.categories.update(editingCategory.id, data);
      toast({ title: 'Category updated' });
    } else {
      await db.categories.add({ id: generateId(), ...data });
      toast({ title: 'Category added' });
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const children = await db.categories.where('parentId').equals(id).count();
    const products = await db.products.where('categoryId').equals(id).count().catch(() => 0);
    if (children > 0 || products > 0) {
      toast({ title: 'Cannot delete', description: 'Category has subcategories or products.', variant: 'destructive' });
      return;
    }
    await db.categories.delete(id);
    toast({ title: 'Category deleted' });
  }

  async function seedDefaults(bizId: string) {
    const biz = businesses.find(b => b.id === bizId);
    if (!biz) return;
    const config = getBusinessConfig(biz.type);
    const existing = await db.categories.where('businessId').equals(bizId).count();
    if (existing > 0) {
      toast({ title: 'Categories exist', description: 'Default categories already seeded.', variant: 'destructive' });
      return;
    }
    await db.categories.bulkAdd(
      config.defaultCategories.map(name => ({ id: crypto.randomUUID(), businessId: bizId, name }))
    );
    toast({ title: 'Defaults added', description: `${config.defaultCategories.length} categories created.` });
  }

  const groupedByBusiness = businesses.reduce((acc, biz) => {
    acc[biz.id!] = categories.filter(c => c.businessId === biz.id);
    return acc;
  }, {} as Record<string, Category[]>);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">Organize products with hierarchical categories</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {activeBusiness ? (
        <Card className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/30 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {activeBusiness.name}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => seedDefaults(activeBusiness.id!)}>
              <Sparkles className="mr-1 h-3 w-3" /> Seed Defaults
            </Button>
          </CardHeader>
          <CardContent>
            <CategoryTree
              categories={topLevel.filter(c => c.businessId === activeBusiness.id)}
              getChildren={getChildren}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      ) : (
        businesses.map(biz => {
          const bizCats = groupedByBusiness[biz.id!] ?? [];
          const bizTop = bizCats.filter(c => !c.parentId);
          return (
            <Card key={biz.id} className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/30 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: `hsl(${biz.color})` }} />
                  {biz.name}
                  <Badge variant="secondary" className="ml-2">{bizCats.length}</Badge>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => seedDefaults(biz.id!)}>
                  <Sparkles className="mr-1 h-3 w-3" /> Seed Defaults
                </Button>
              </CardHeader>
              <CardContent>
                <CategoryTree categories={bizTop} getChildren={getChildren} onEdit={openEdit} onDelete={handleDelete} />
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!activeBusinessId && (
              <div>
                <label className="text-sm font-medium text-foreground">Business</label>
                <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                  <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                  <SelectContent>
                    {businesses.map(b => (
                      <SelectItem key={b.id} value={b.id!.toString()}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Parent Category</label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {categories
                    .filter(c => c.businessId === targetBusinessId && !c.parentId && c.id !== editingCategory?.id)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id!.toString()}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingCategory ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryTree({
  categories,
  getChildren,
  onEdit,
  onDelete,
}: {
  categories: Category[];
  getChildren: (id: string) => Category[];
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
}) {
  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No categories yet. Add one or seed defaults.</p>;
  }

  return (
    <div className="space-y-1">
      {categories.map(cat => {
        const children = getChildren(cat.id!);
        return (
          <div key={cat.id}>
            <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 group">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                {children.length > 0 && (
                  <Badge variant="outline" className="text-xs">{children.length} sub</Badge>
                )}
              </div>
              <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cat)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(cat.id!)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {children.length > 0 && (
              <div className="ml-6 border-l border-border pl-3">
                <CategoryTree categories={children} getChildren={getChildren} onEdit={onEdit} onDelete={onDelete} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
