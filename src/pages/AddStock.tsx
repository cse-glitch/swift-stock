import { useState } from "react";
import { db } from "@/lib/db";
import { toStorageWeight, toStorageDim, calcVolumeCm3, cm3ToM3, formatNumber } from "@/lib/units";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { PackagePlus, Box } from "lucide-react";

const UNITS_KEY = "inv_lastEntry";

interface FormData {
  productName: string;
  sku: string;
  weight: string;
  weightUnit: 'kg' | 'lb';
  length: string;
  width: string;
  height: string;
  sizeUnit: 'cm' | 'in';
  quantity: string;
}

const defaultForm: FormData = {
  productName: "", sku: "", weight: "", weightUnit: "kg",
  length: "", width: "", height: "", sizeUnit: "cm", quantity: "1",
};

const AddStock = () => {
  const saved = localStorage.getItem(UNITS_KEY);
  const initial = saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm;

  const [form, setForm] = useState<FormData>(initial);
  const [memoryFill, setMemoryFill] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const { toast } = useToast();

  const set = (key: keyof FormData, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.productName.trim()) e.productName = "Required";
    if (!form.sku.trim()) e.sku = "Required";
    const w = parseFloat(form.weight);
    if (isNaN(w) || w <= 0) e.weight = "Must be positive";
    const l = parseFloat(form.length);
    if (isNaN(l) || l <= 0) e.length = "Must be positive";
    const wd = parseFloat(form.width);
    if (isNaN(wd) || wd <= 0) e.width = "Must be positive";
    const h = parseFloat(form.height);
    if (isNaN(h) || h <= 0) e.height = "Must be positive";
    const q = parseInt(form.quantity);
    if (isNaN(q) || q < 1) e.quantity = "Must be ≥ 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const volumePreview = () => {
    const l = parseFloat(form.length) || 0;
    const w = parseFloat(form.width) || 0;
    const h = parseFloat(form.height) || 0;
    const lCm = toStorageDim(l, form.sizeUnit);
    const wCm = toStorageDim(w, form.sizeUnit);
    const hCm = toStorageDim(h, form.sizeUnit);
    return cm3ToM3(calcVolumeCm3(lCm, wCm, hCm));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const weightKg = toStorageWeight(parseFloat(form.weight), form.weightUnit);
    const lengthCm = toStorageDim(parseFloat(form.length), form.sizeUnit);
    const widthCm = toStorageDim(parseFloat(form.width), form.sizeUnit);
    const heightCm = toStorageDim(parseFloat(form.height), form.sizeUnit);
    const qty = parseInt(form.quantity);

    try {
      const existing = await db.items.where("sku").equals(form.sku.trim()).first();
      if (existing) {
        await db.items.update(existing.id!, {
          quantity: existing.quantity + qty,
          weight: weightKg,
          length: lengthCm,
          width: widthCm,
          height: heightCm,
          weightUnit: form.weightUnit,
          sizeUnit: form.sizeUnit,
          lastUpdated: new Date(),
        });
        toast({
          title: "Stock updated",
          description: `Added ${qty} units to ${form.productName} (${form.sku}). Total: ${existing.quantity + qty}`,
        });
      } else {
        await db.items.add({
          sku: form.sku.trim(),
          productName: form.productName.trim(),
          weight: weightKg,
          weightUnit: form.weightUnit,
          length: lengthCm,
          width: widthCm,
          height: heightCm,
          sizeUnit: form.sizeUnit,
          quantity: qty,
          lastUpdated: new Date(),
        });
        toast({
          title: "Item added",
          description: `Created ${form.productName} (${form.sku}) with ${qty} units.`,
        });
      }

      // Save for memory fill
      localStorage.setItem(UNITS_KEY, JSON.stringify({
        weight: form.weight, weightUnit: form.weightUnit,
        length: form.length, width: form.width, height: form.height,
        sizeUnit: form.sizeUnit,
      }));

      // Reset form
      if (memoryFill) {
        setForm(f => ({ ...f, productName: "", sku: "", quantity: "1" }));
      } else {
        setForm(defaultForm);
      }
      setErrors({});
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const UnitToggle = ({ value, options, onChange }: {
    value: string; options: [string, string]; onChange: (v: any) => void
  }) => (
    <div className="flex rounded-md border overflow-hidden">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const FieldError = ({ field }: { field: keyof FormData }) =>
    errors[field] ? <p className="text-xs text-destructive mt-1">{errors[field]}</p> : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Stock</h1>
        <p className="text-muted-foreground">Enter product details to add to inventory</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            New Entry
          </CardTitle>
          <CardDescription>
            Fill in the product information below. Toggle units as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input id="productName" value={form.productName} onChange={e => set("productName", e.target.value)} placeholder="Widget A" />
                <FieldError field="productName" />
              </div>
              <div>
                <Label htmlFor="sku">SKU / ID</Label>
                <Input id="sku" value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="WDG-001" className="font-mono" />
                <FieldError field="sku" />
              </div>
            </div>

            {/* Weight */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="weight">Weight</Label>
                <UnitToggle value={form.weightUnit} options={["kg", "lb"]} onChange={(v: 'kg'|'lb') => set("weightUnit", v)} />
              </div>
              <Input id="weight" type="number" step="any" min="0" value={form.weight} onChange={e => set("weight", e.target.value)} placeholder={`e.g. 5.0 ${form.weightUnit}`} />
              <FieldError field="weight" />
            </div>

            {/* Dimensions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Dimensions (L × W × H)</Label>
                <UnitToggle value={form.sizeUnit} options={["cm", "in"]} onChange={(v: 'cm'|'in') => set("sizeUnit", v)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Input type="number" step="any" min="0" value={form.length} onChange={e => set("length", e.target.value)} placeholder="Length" />
                  <FieldError field="length" />
                </div>
                <div>
                  <Input type="number" step="any" min="0" value={form.width} onChange={e => set("width", e.target.value)} placeholder="Width" />
                  <FieldError field="width" />
                </div>
                <div>
                  <Input type="number" step="any" min="0" value={form.height} onChange={e => set("height", e.target.value)} placeholder="Height" />
                  <FieldError field="height" />
                </div>
              </div>
              {/* Volume preview */}
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Box className="h-4 w-4" />
                Volume: {formatNumber(volumePreview(), 4)} m³
              </div>
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="1" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
              <FieldError field="quantity" />
            </div>

            {/* Memory Fill */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="memoryFill"
                checked={memoryFill}
                onCheckedChange={(v) => setMemoryFill(!!v)}
              />
              <Label htmlFor="memoryFill" className="text-sm cursor-pointer">
                Keep dimensions & weight for next entry
              </Label>
            </div>

            <Button type="submit" className="w-full">
              <PackagePlus className="mr-2 h-4 w-4" />
              Add to Inventory
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddStock;
