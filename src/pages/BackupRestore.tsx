import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Business, type Category, type Product, type Variant, type InventoryLog, type PropertyListing, type Service, type Order } from "@/lib/db";

import { useAuth } from "@/contexts/AuthContext";
import { writeAuditLog } from "@/lib/auth-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, HardDrive, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BackupData {
  version: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

type BackupTableName = typeof BACKUP_TABLES[number];

type BackupTableType = Business | Category | Product | Variant | InventoryLog | PropertyListing | Service | Order;
type BackedTable = { count(): Promise<number>; toArray(): Promise<BackupTableType[]>; clear(): Promise<void>; bulkAdd(items: Omit<BackupTableType, 'id'>[]): Promise<unknown> };

const BACKUP_TABLES = [
  "businesses", "categories", "products", "variants",
  "inventoryLog", "propertyListings", "services", "orders",
] as const;

function getTable(tableName: BackupTableName): BackedTable {
  return db[tableName] as unknown as BackedTable;
}

export default function BackupRestore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restoring, setRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(() => localStorage.getItem("last_backup_time"));

  const counts = useLiveQuery(async () => {
    const results: Record<string, number> = {};
    for (const t of BACKUP_TABLES) {
      results[t] = await getTable(t).count();
    }
    return results;
  }) ?? {};

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  async function handleExport() {
    try {
      const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: {},
      };

      for (const tableName of BACKUP_TABLES) {
        backup.tables[tableName] = await getTable(tableName).toArray();
      }

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = format(new Date(), "yyyy-MM-dd_HH-mm");
      a.href = url;
      a.download = `saman-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      localStorage.setItem("last_backup_time", now);
      setLastBackup(now);

      await writeAuditLog(user, "EXPORT_BACKUP", undefined, undefined, { recordCount: totalRecords });
      toast({ title: "✅ Backup exported", description: `${totalRecords} records saved to file.` });
    } catch (err: unknown) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);

    try {
      const text = await file.text();
      const backup: BackupData = JSON.parse(text);

      if (backup.version !== 1 || !backup.tables) {
        throw new Error("Invalid backup file format");
      }

      for (const tableName of BACKUP_TABLES) {
        const rows = backup.tables[tableName];
        if (!Array.isArray(rows)) continue;
        const table = getTable(tableName);
        await table.clear();
        if (rows.length > 0) {
          const cleaned = rows.map(({ id: _id, ...rest }) => rest as Omit<BackupTableType, 'id'>);
          await table.bulkAdd(cleaned);
        }
      }

      await writeAuditLog(user, "IMPORT_BACKUP", undefined, undefined, {
        fileName: file.name,
        exportedAt: backup.exportedAt,
      });

      toast({
        title: "✅ Backup restored",
        description: `Data from ${format(new Date(backup.exportedAt), "MMM d, yyyy HH:mm")} has been restored.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Restore failed",
        description: err instanceof Error ? err.message : "Could not parse backup file.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HardDrive className="h-6 w-6" /> Backup & Restore
        </h1>
        <p className="text-muted-foreground mt-1">Export your data to a file and restore from a previous backup</p>
      </div>

      {/* Current data summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current Database</CardTitle>
          <CardDescription>Data that will be included in your backup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {BACKUP_TABLES.map(t => (
              <div key={t} className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-bold">{counts[t] ?? 0}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{t.replace(/([A-Z])/g, " $1")}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total records</span>
            <Badge variant="secondary">{totalRecords} records</Badge>
          </div>
          {lastBackup && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              Last backup: {format(new Date(lastBackup), "MMM d, yyyy 'at' HH:mm")}
            </div>
          )}
          {!lastBackup && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              No backup has been made yet — back up now to protect your data.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Backup
          </CardTitle>
          <CardDescription>
            Download all your data as a JSON file. Store it somewhere safe — external drive, cloud storage, or email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export All Data ({totalRecords} records)
          </Button>
        </CardContent>
      </Card>

      {/* Restore */}
      <Card className="border-warning/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-warning" />
            Restore from Backup
          </CardTitle>
          <CardDescription>
            Import a previously exported backup file. <strong>This will overwrite all current data.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-warning/40 hover:bg-warning/10">
                <Upload className="mr-2 h-4 w-4" />
                {restoring ? "Restoring…" : "Choose Backup File to Restore"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Overwrite current data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Restoring a backup will <strong>permanently replace</strong> all existing products, orders, inventory logs, and other records.
                  Your user accounts will not be affected. This cannot be undone — consider exporting a backup first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                  onClick={() => document.getElementById("backup-file-input")?.click()}
                >
                  Yes, proceed with restore
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Input
            id="backup-file-input"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">What gets restored:</p>
            <p>✅ Products, variants, categories, orders, inventory logs, services, and property listings</p>
            <p>⚠️ Businesses and user accounts are <em>not</em> replaced (they stay as-is)</p>
          </div>
        </CardContent>
      </Card>

      {/* Auto-backup reminder */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4 flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Backup Tip</p>
            <p className="text-muted-foreground mt-0.5">
              Export a backup at the end of each business day. Keep at least 3 recent copies in different locations (USB drive, Google Drive, email) to protect against hardware failure.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
