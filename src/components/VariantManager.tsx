import { useState } from 'react';
import type { Variant } from '@/lib/db';
import { normalizeSku, validateSkuFormat } from '@/lib/sku-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package } from 'lucide-react';

interface VariantManagerProps {
  variants: Omit<Variant, 'id' | 'productId'>[];
  onChange: (variants: Omit<Variant, 'id' | 'productId'>[]) => void;
  attributeLabels: string[];
  skuErrors?: Record<number, string>;
}

const emptyVariant = (labels: string[]): Omit<Variant, 'id' | 'productId'> => ({
  name: '',
  sku: '',
  attributes: Object.fromEntries(labels.map(l => [l, ''])),
  stock: 0,
  lowStockThreshold: 5,
});

export function VariantManager({ variants, onChange, attributeLabels, skuErrors }: VariantManagerProps) {
  function addVariant() {
    onChange([...variants, emptyVariant(attributeLabels)]);
  }

  function updateVariant(index: number, field: string, value: string | number) {
    const updated = [...variants];
    if (field.startsWith('attr.')) {
      const attrKey = field.slice(5);
      updated[index] = { ...updated[index], attributes: { ...updated[index].attributes, [attrKey]: value } };
    } else if (field === 'sku') {
      // Normalize on the fly
      updated[index] = { ...updated[index], sku: normalizeSku(value as string) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    if (field.startsWith('attr.')) {
      const attrVals = Object.values(updated[index].attributes).filter(Boolean);
      updated[index].name = attrVals.join(' / ');
    }
    onChange(updated);
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  function getLocalFormatError(sku: string): string | null {
    if (!sku) return null; // empty is optional
    return validateSkuFormat(sku);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Variants ({variants.length})
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={addVariant}>
          <Plus className="mr-1 h-3 w-3" /> Add Variant
        </Button>
      </div>

      {variants.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No variants. Add one to track different sizes, colors, etc.
        </p>
      )}

      {variants.map((v, i) => {
        const formatErr = getLocalFormatError(v.sku);
        const conflictErr = skuErrors?.[i];
        const skuError = formatErr || conflictErr;

        return (
          <Card key={i} className={`border-dashed ${skuError ? 'border-destructive/50' : ''}`}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {v.name || `Variant ${i + 1}`}
                </Badge>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeVariant(i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">SKU</label>
                  <Input
                    value={v.sku}
                    onChange={e => updateVariant(i, 'sku', e.target.value)}
                    placeholder="VAR-001"
                    className={`h-8 text-sm font-mono uppercase ${skuError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {skuError && (
                    <p className="text-xs text-destructive mt-1">{skuError}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Price</label>
                  <Input type="number" value={v.price ?? ''} onChange={e => updateVariant(i, 'price', Number(e.target.value))} placeholder="0.00" className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {attributeLabels.map(attr => (
                  <div key={attr}>
                    <label className="text-xs text-muted-foreground capitalize">{attr}</label>
                    <Input
                      value={(v.attributes[attr] as string) ?? ''}
                      onChange={e => updateVariant(i, `attr.${attr}`, e.target.value)}
                      placeholder={attr}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Stock</label>
                  <Input type="number" value={v.stock} onChange={e => updateVariant(i, 'stock', Number(e.target.value))} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Low Stock Alert</label>
                  <Input type="number" value={v.lowStockThreshold} onChange={e => updateVariant(i, 'lowStockThreshold', Number(e.target.value))} className="h-8 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
