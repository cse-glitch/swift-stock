import { useState } from "react";
import { db } from "@/lib/db";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Trash2, Save } from "lucide-react";

const Settings = () => {
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const { toast } = useToast();

  const handleSave = () => {
    if (settings.heavyThresholdKg <= 0) {
      toast({ title: "Invalid threshold", description: "Must be a positive number.", variant: "destructive" });
      return;
    }
    saveSettings(settings);
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  const handleReset = async () => {
    try {
      await db.items.clear();
      await db.removals.clear();
      toast({ title: "Database cleared", description: "All inventory and removal records have been deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
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
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Size Unit</Label>
              <Select value={settings.defaultSizeUnit} onValueChange={v => setSettings(s => ({ ...s, defaultSizeUnit: v as 'cm' | 'in' }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
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
          <CardDescription>Items above this weight (in kg) are flagged as "Heavy" on the dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              step="any"
              value={settings.heavyThresholdKg}
              onChange={e => setSettings(s => ({ ...s, heavyThresholdKg: parseFloat(e.target.value) || 0 }))}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">kg</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        Save Settings
      </Button>

      {/* Database Reset */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Permanently delete all inventory data and removal history</CardDescription>
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
                  This will permanently delete all inventory items and removal history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
