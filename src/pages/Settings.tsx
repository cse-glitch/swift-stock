import { useState } from "react";
import { db, seedBusinesses } from "@/lib/db";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Trash2, Save, RefreshCw } from "lucide-react";

const TABLES = [
  { key: "products", label: "Products" },
  { key: "variants", label: "Variants" },
  { key: "categories", label: "Categories" },
  { key: "inventoryLog", label: "Inventory Logs" },
  { key: "propertyListings", label: "Property Listings" },
  { key: "services", label: "Services" },
  { key: "items", label: "Legacy Items" },
  { key: "removals", label: "Legacy Removals" },
] as const;

const Settings = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleSave = () => {
    if (settings.heavyThresholdKg <= 0) {
      toast({ title: "Invalid threshold", description: "Must be a positive number.", variant: "destructive" });
      return;
    }
    saveSettings(settings);
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  const handleResetAll = async () => {
    try {
      await db.transaction("rw", [db.products, db.variants, db.categories, db.inventoryLog, db.propertyListings, db.services, db.items, db.removals], async () => {
        await db.products.clear();
        await db.variants.clear();
        await db.categories.clear();
        await db.inventoryLog.clear();
        await db.propertyListings.clear();
        await db.services.clear();
        await db.items.clear();
        await db.removals.clear();
      });
      toast({ title: "Database cleared", description: "All data has been deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSelectiveClear = async () => {
    if (selectedTables.size === 0) {
      toast({ title: "Nothing selected", description: "Select at least one table to clear.", variant: "destructive" });
      return;
    }
    try {
      const tableMap: Record<string, any> = {
        products: db.products, variants: db.variants, categories: db.categories,
        inventoryLog: db.inventoryLog, propertyListings: db.propertyListings,
        services: db.services, items: db.items, removals: db.removals,
      };
      const tables = Array.from(selectedTables).map(k => tableMap[k]).filter(Boolean);
      await db.transaction("rw", tables, async () => {
        for (const t of tables) await t.clear();
      });
      toast({ title: "Tables cleared", description: `Cleared ${selectedTables.size} table(s).` });
      setSelectedTables(new Set());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleReseed = async () => {
    try {
      await db.businesses.clear();
      await seedBusinesses();
      toast({ title: "Businesses re-seeded", description: "Default 7 businesses have been restored." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleTable = (key: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure defaults and manage your data</p>
      </div>

      {/* Unit Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Default Units
          </CardTitle>
          <CardDescription>Set the default unit system for new entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Weight Unit</Label>
              <Select value={settings.defaultWeightUnit} onValueChange={v => setSettings(s => ({ ...s, defaultWeightUnit: v as 'kg' | 'lb' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Size Unit</Label>
              <Select value={settings.defaultSizeUnit} onValueChange={v => setSettings(s => ({ ...s, defaultSizeUnit: v as 'cm' | 'in' }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                  <SelectItem value="in">Inches (in)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight Threshold */}
      <Card>
        <CardHeader>
          <CardTitle>Heavy Item Threshold</CardTitle>
          <CardDescription>Items above this weight (in kg) are flagged as "Heavy"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input type="number" min={1} step="any" value={settings.heavyThresholdKg}
              onChange={e => setSettings(s => ({ ...s, heavyThresholdKg: parseFloat(e.target.value) || 0 }))}
              className="w-32" />
            <span className="text-sm text-muted-foreground">kg</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        Save Settings
      </Button>

      {/* Re-seed Businesses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Re-seed Businesses
          </CardTitle>
          <CardDescription>Clear and restore the default 7 SAMAN businesses</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Re-seed Default Businesses</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Re-seed businesses?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all existing businesses and restore the 7 defaults. Products and other data will remain but may reference missing businesses.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReseed}>Yes, re-seed</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Selective Clear */}
      <Card className="border-warning/30">
        <CardHeader>
          <CardTitle>Selective Clear</CardTitle>
          <CardDescription>Choose specific tables to clear</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {TABLES.map(t => (
              <label key={t.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selectedTables.has(t.key)} onCheckedChange={() => toggleTable(t.key)} />
                <span className="text-sm">{t.label}</span>
              </label>
            ))}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={selectedTables.size === 0}>
                Clear {selectedTables.size} Table(s)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear selected tables?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all data in: {Array.from(selectedTables).join(", ")}. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSelectiveClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, clear selected
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Full Reset */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Permanently delete all data from every table (businesses are preserved)</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Reset Entire Database</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all products, variants, inventory logs, categories, and other data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
