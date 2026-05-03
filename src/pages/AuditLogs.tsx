import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollText, Search, Filter, LogIn, LogOut, Plus, Pencil, Trash2, Download, Upload, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

const ACTION_CONFIG: Record<string, { icon: typeof LogIn; color: string; label: string }> = {
  LOGIN:          { icon: LogIn,       color: "text-green-500",       label: "Login" },
  LOGOUT:         { icon: LogOut,      color: "text-muted-foreground", label: "Logout" },
  CREATE_USER:    { icon: Plus,        color: "text-primary",          label: "Create User" },
  UPDATE_USER:    { icon: Pencil,      color: "text-blue-500",         label: "Update User" },
  DELETE_USER:    { icon: Trash2,      color: "text-destructive",      label: "Delete User" },
  EXPORT_BACKUP:  { icon: Download,    color: "text-green-500",        label: "Export Backup" },
  IMPORT_BACKUP:  { icon: Upload,      color: "text-warning",          label: "Import Backup" },
  CREATE_PRODUCT: { icon: Plus,        color: "text-primary",          label: "Create Product" },
  UPDATE_PRODUCT: { icon: Pencil,      color: "text-blue-500",         label: "Update Product" },
  DELETE_PRODUCT: { icon: Trash2,      color: "text-destructive",      label: "Delete Product" },
};

const DEFAULT_CONFIG = { icon: ShieldAlert, color: "text-muted-foreground", label: "System Action" };

const ALL_ACTIONS = [
  "LOGIN", "LOGOUT", "CREATE_USER", "UPDATE_USER", "DELETE_USER",
  "EXPORT_BACKUP", "IMPORT_BACKUP", "CREATE_PRODUCT", "UPDATE_PRODUCT", "DELETE_PRODUCT",
];

export default function AuditLogs() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const logs = useLiveQuery(
    () => db.auditLogs.orderBy("timestamp").reverse().toArray(),
    []
  ) ?? [];

  if (!hasPermission("settings.manage")) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4 opacity-30" />
        <p className="font-medium">Admin access required to view audit logs.</p>
      </div>
    );
  }

  const filtered = logs.filter(log => {
    const matchesSearch =
      !search ||
      log.username.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.entityType ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function getActionConfig(action: string) {
    return ACTION_CONFIG[action] ?? DEFAULT_CONFIG;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6" /> Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">Complete history of all user actions in the system</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {filtered.length} events
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, action, or entity…"
            className="pl-9"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ALL_ACTIONS.map(a => (
              <SelectItem key={a} value={a}>{getActionConfig(a).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log entries */}
      {paged.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ScrollText className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No audit logs found</p>
            <p className="text-sm">Actions will be recorded here as users interact with the system</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {paged.map(log => {
            const cfg = getActionConfig(log.action);
            const Icon = cfg.icon;
            let parsedDetails: Record<string, unknown> | null = null;
            try { if (log.details) parsedDetails = JSON.parse(log.details); } catch {}

            return (
              <div key={log.id} className="flex items-start gap-4 rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{cfg.label}</span>
                    {log.entityType && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {log.entityType}
                        {log.entityId ? ` #${log.entityId}` : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono bg-muted rounded px-1">@{log.username}</span>
                    {parsedDetails && Object.keys(parsedDetails).length > 0 && (
                      <span className="truncate max-w-sm">
                        {Object.entries(parsedDetails).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground text-right">
                  <p>{format(new Date(log.timestamp), "MMM d, yyyy")}</p>
                  <p className="font-mono">{format(new Date(log.timestamp), "HH:mm:ss")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} total events
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
