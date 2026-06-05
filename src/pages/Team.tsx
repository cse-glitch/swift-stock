import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import bcrypt from "bcryptjs";
import { db, type UserRole, type User as DBUser, type AuditLog, type RolePermission } from "@/lib/db";
import { useAuth } from '@/contexts/use-auth';
import { writeAuditLog } from "@/lib/auth-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Plus, Pencil, Trash2, ShieldCheck, Shield, User as UserIcon,
  Activity, Key, Mail, CheckCircle2, AlertCircle, Clock, Search,
  Filter, MoreHorizontal, UserPlus, Fingerprint, ShieldAlert,
  BoxesIcon, ShoppingCart, Banknote, Building2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monitor, Smartphone, Globe as GlobeIcon, Laptop, ShieldCheck as VerifiedIcon, History, ExternalLink, Download } from "lucide-react";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Shield; color: string; bg: string; border: string }> = {
  super_admin: { label: "Super Admin", icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  admin: { label: "Administrator", icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  manager: { label: "General Manager", icon: Shield, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  inventory_manager: { label: "Inventory Lead", icon: BoxesIcon, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  sales_manager: { label: "Sales Lead", icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  accountant: { label: "Accountant", icon: Banknote, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  cashier: { label: "Cashier", icon: Users, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  warehouse_staff: { label: "Warehouse Op", icon: Building2, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  staff: { label: "Field Staff", icon: UserIcon, color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
};

interface UserFormData {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
}

const defaultForm: UserFormData = { username: "", displayName: "", password: "", role: "staff" };

const DISPLAY_PERMISSIONS = [
  { label: "View Dashboard & Stats", perm: "analytics.view" },
  { label: "Add/Remove Stock", perm: "inventory.add" },
  { label: "Stock Transfers", perm: "inventory.transfer" },
  { label: "Create Products", perm: "products.create" },
  { label: "Edit/Delete Products", perm: "products.edit" },
  { label: "Process Sales Orders", perm: "orders.create" },
  { label: "Financial Reports", perm: "accounting.view" },
  { label: "Manage Expenses", perm: "accounting.manage" },
  { label: "Manage Suppliers", perm: "suppliers.manage" },
  { label: "Warehouse Controls", perm: "warehouses.manage" },
  { label: "Manage Team Members", perm: "users.manage" },
  { label: "System Settings", perm: "settings.manage" },
  { label: "Manage Notifications", perm: "notifications.manage" },
];


export default function TeamPage() {
  const { user: me, hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("members");

  const rawUsers = useLiveQuery(() => db.users.orderBy("createdAt").toArray());
  const users = useMemo(() => rawUsers ?? [], [rawUsers]);
  const logs = useLiveQuery(() => db.auditLogs.orderBy("timestamp").reverse().limit(50).toArray()) ?? [];
  const dbRolePermissions = useLiveQuery(() => db.rolePermissions.toArray()) ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [permissionChanges, setPermissionChanges] = useState<Record<string, string[]>>({});
  const [activeStatsType, setActiveStatsType] = useState<'total' | 'admins' | 'active' | 'logs' | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [permissionsRoleFilter, setPermissionsRoleFilter] = useState<string>("admin");

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      managers: users.filter(u => u.role === 'manager').length,
      staff: users.filter(u => u.role === 'staff').length,
      activeToday: users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt).toDateString() === new Date().toDateString()).length
    };
  }, [users]);

  const filteredUsers = users.filter(u =>
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hasPermission("users.manage")) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4 opacity-30" />
        <p className="font-medium">Admin access required to manage the team.</p>
      </div>
    );
  }

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(u: DBUser) {
    setEditingId(u.id!);
    setForm({ username: u.username, displayName: u.displayName, role: u.role, password: "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (me?.role !== 'admin') {
      toast({ title: "Only Admin can create account.", variant: "destructive" });
      return;
    }
    
    if (!form.username.trim() || !form.displayName.trim()) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const updates: Partial<DBUser> = {
          username: form.username.trim().toLowerCase(),
          displayName: form.displayName.trim(),
          role: form.role,
        };
        if (form.password) {
          updates.passwordHash = await bcrypt.hash(form.password, 10);
        }
        await db.users.update(editingId, updates);
        await writeAuditLog(me, "UPDATE_USER", "user", editingId, { username: form.username });
        toast({ title: "Profile updated" });
      } else {
        const hash = await bcrypt.hash(form.password, 10);
        const id = await db.users.add({
          id: crypto.randomUUID(),
          username: form.username.trim().toLowerCase(),
          displayName: form.displayName.trim(),
          passwordHash: hash,
          role: form.role,
          createdAt: new Date(),
          twoFactorEnabled: false
        });
        await writeAuditLog(me, "CREATE_USER", "user", String(id), { username: form.username });
        toast({ title: "Member added" });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      console.error('Team save error:', err);
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string, username: string) {
    if (me?.role !== 'admin') {
      toast({ title: "Only Admin can delete accounts.", variant: "destructive" });
      return;
    }
    if (userId === me?.id) return;
    await db.users.delete(userId);
    await writeAuditLog(me, "DELETE_USER", "user", userId, { username });
    toast({ title: "Member removed" });
  }

  async function handleTogglePermission(role: UserRole, permission: string) {
    const roleObj = dbRolePermissions.find(p => p.role === role);
    if (!roleObj) return;
    const currentPerms = permissionChanges[role] || roleObj.permissions;
    const newPerms = currentPerms.includes(permission)
      ? currentPerms.filter(p => p !== permission)
      : [...currentPerms, permission];
    setPermissionChanges(prev => ({ ...prev, [role]: newPerms }));
  }

  async function handleSavePermissions() {
    if (me?.role !== 'admin') {
      toast({ title: "Only Admin can assign roles.", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      for (const [role, perms] of Object.entries(permissionChanges)) {
        const roleObj = dbRolePermissions.find(p => p.role === role);
        if (roleObj) {
          await db.rolePermissions.update(roleObj.id!, { permissions: perms });
        }
      }
      setPermissionChanges({});
      toast({ title: "Permissions saved" });
      await writeAuditLog(me, "UPDATE_PERMISSIONS", "system", "0", { roles: Object.keys(permissionChanges) });
    } catch (err) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-page-enter pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">Control access, roles, and monitor team activity</p>
        </div>
        {me?.role === 'admin' && (
          <Button onClick={openCreate} className="shadow-lg shadow-primary/20 gap-2">
            <UserPlus className="h-4 w-4" /> Add Member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'total', label: "Total Members", value: stats.total, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { id: 'admins', label: "Admins", value: stats.admins, icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10" },
          { id: 'active', label: "Active Today", value: stats.activeToday, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { id: 'logs', label: "Recent Logs", value: logs.length, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((stat, i) => (
          <Card 
            key={i} 
            className="border-none shadow-md bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-card/80 hover:scale-[1.02] transition-all active:scale-95 group"
            onClick={() => {
              setActiveStatsType(stat.id as StatsDetailDialogProps['type']);
              setStatsDialogOpen(true);
            }}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-12", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList className="bg-muted/50 border backdrop-blur-sm p-1">
            <TabsTrigger value="members" className="gap-2 px-4 py-2"><Users className="h-4 w-4" /> Members</TabsTrigger>
            <TabsTrigger value="roles" className="gap-2 px-4 py-2"><Shield className="h-4 w-4" /> Permissions</TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 px-4 py-2"><Activity className="h-4 w-4" /> Activity Feed</TabsTrigger>
          </TabsList>
          {activeTab === "members" && (
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search members..." className="pl-9 bg-card/50" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          )}
        </div>

        <TabsContent value="members" className="space-y-4">
          {/* Mobile view: Grouped list rows */}
          <div className="sm:hidden space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-50 bg-card/20">
                <Users className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">No members found</p>
              </div>
            ) : (
              <div className="bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-border/30 shadow-sm divide-y divide-border/40">
                {filteredUsers.map((u) => {
                  const rc = ROLE_CONFIG[u.role];
                  const RoleIcon = rc.icon;
                  const isMe = u.id === me?.id;
                  return (
                    <div key={u.id} className={cn("p-4 flex items-center gap-3.5 transition-colors active:bg-accent/40", isMe && "bg-primary/5")} onClick={() => openEdit(u)}>
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-sm font-bold border border-border shadow-inner shrink-0">
                        {u.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{u.displayName}</span>
                          {isMe && <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 font-normal">YOU</Badge>}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                          <span>@{u.username}</span>
                          <span className="text-border">•</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{u.lastLoginAt ? format(new Date(u.lastLoginAt), "MMM d, HH:mm") : "New"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <Badge className={cn("gap-1 py-0 px-2 text-[9px] font-normal border", rc.bg, rc.color, rc.border)}>
                          <RoleIcon className="h-2.5 w-2.5" />
                          {rc.label}
                        </Badge>
                        {me?.role === 'admin' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="mr-2 h-4 w-4" /> Edit Profile</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" disabled={isMe} onClick={() => handleDelete(u.id as string, u.username)}><Trash2 className="mr-2 h-4 w-4" /> Remove</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop view */}
          <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((u) => {
              const rc = ROLE_CONFIG[u.role];
              const RoleIcon = rc.icon;
              const isMe = u.id === me?.id;
              return (
                <Card key={u.id} className={cn("group border-none shadow-lg transition-all hover:-translate-y-1", isMe ? "bg-primary/5 ring-1 ring-primary/20" : "bg-card/50 backdrop-blur-sm")}>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-xl font-bold border-2 border-background shadow-inner">
                        {u.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      {me?.role === 'admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEdit(u)}><Pencil className="mr-2 h-4 w-4" /> Edit Profile</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" disabled={isMe} onClick={() => handleDelete(u.id as string, u.username)}><Trash2 className="mr-2 h-4 w-4" /> Remove</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <h3 className="font-bold text-lg">{u.displayName} {isMe && <Badge variant="secondary" className="text-[9px] px-1 h-3.5 ml-1">YOU</Badge>}</h3>
                    <p className="text-sm text-muted-foreground">@{u.username}</p>
                    <div className="mt-5 pt-5 border-t flex items-center justify-between">
                      <Badge className={cn("gap-1.5 py-1", rc.bg, rc.color, rc.border)}><RoleIcon className="h-3 w-3" />{rc.label}</Badge>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{u.lastLoginAt ? format(new Date(u.lastLoginAt), "MMM d, HH:mm") : "New"}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Role Permissions Overview</CardTitle>
                <CardDescription>Detailed breakdown of what each team role can perform within the system.</CardDescription>
              </div>
              {Object.keys(permissionChanges).length > 0 && me?.role === 'admin' && (
                <Button onClick={handleSavePermissions} disabled={saving} size="sm" className="gap-2 shadow-lg shadow-primary/20">
                  <CheckCircle2 className="h-4 w-4" /> Save Changes
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mobile View: Role-by-Role Toggles */}
                <div className="md:hidden space-y-4">
                  <div className="bg-muted/30 p-4 rounded-2xl border border-dashed">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Select Role to Configure</Label>
                    <Select value={permissionsRoleFilter} onValueChange={setPermissionsRoleFilter}>
                      <SelectTrigger className="h-12 bg-background border-muted-foreground/20 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(ROLE_CONFIG).map(r => (
                          <SelectItem key={r} value={r}>{ROLE_CONFIG[r as UserRole].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    {DISPLAY_PERMISSIONS.map((item, idx) => {
                      const role = permissionsRoleFilter as UserRole;
                      const roleObj = dbRolePermissions.find(p => p.role === role);
                      const isAllowed = permissionChanges[role]
                        ? permissionChanges[role].includes(item.perm)
                        : (roleObj?.permissions.includes(item.perm) || false);

                      return (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-card/30 border border-muted/20">
                          <div className="space-y-1">
                            <p className="text-sm font-bold">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{ROLE_CONFIG[role].label} Access</p>
                          </div>
                          <Switch 
                            checked={isAllowed} 
                            onCheckedChange={() => handleTogglePermission(role, item.perm)}
                            disabled={me?.role !== 'admin' || role === 'super_admin'}
                            className="data-[state=checked]:bg-emerald-500 scale-110"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop View: Full Matrix Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground font-medium">
                        <th className="text-left py-3">Capability</th>
                        <th className="text-center py-3">Super</th>
                        <th className="text-center py-3">Admin</th>
                        <th className="text-center py-3">GM</th>
                        <th className="text-center py-3">Inv</th>
                        <th className="text-center py-3">Sales</th>
                        <th className="text-center py-3">Acc</th>
                        <th className="text-center py-3">Cash</th>
                        <th className="text-center py-3">Whse</th>
                        <th className="text-center py-3">Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dbRolePermissions.length === 0 ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td className="py-4"><Skeleton className="h-4 w-32" /></td>
                            {Array.from({ length: 9 }).map((_, j) => (
                              <td key={j} className="py-4"><Skeleton className="h-6 w-10 mx-auto rounded-full" /></td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        DISPLAY_PERMISSIONS.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 font-medium">{item.label}</td>
                            {(["super_admin", "admin", "manager", "inventory_manager", "sales_manager", "accountant", "cashier", "warehouse_staff", "staff"] as UserRole[]).map((role) => {
                              const roleObj = dbRolePermissions.find(p => p.role === role);
                              const isAllowed = permissionChanges[role]
                                ? permissionChanges[role].includes(item.perm)
                                : (roleObj?.permissions.includes(item.perm) || false);
                              
                              return (
                                <td key={role} className="text-center py-3">
                                  <div className="flex items-center justify-center">
                                    <Switch 
                                      checked={isAllowed} 
                                      onCheckedChange={() => handleTogglePermission(role, item.perm)}
                                      disabled={me?.role !== 'admin' || role === 'super_admin'}
                                      className="data-[state=checked]:bg-emerald-500 scale-90"
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Team Activity Feed</CardTitle><CardDescription>Real-time monitor of administrative actions.</CardDescription></div>
              <Badge variant="outline" className="h-6">Last 50 events</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Activity className="h-10 w-10 mx-auto mb-3 opacity-20" /><p>No activity yet</p></div> :
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-4 items-start relative pb-4 last:pb-0">
                      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border last:hidden" />
                      <div className="h-10 w-10 rounded-full bg-muted border flex items-center justify-center shrink-0 z-10"><Fingerprint className="h-5 w-5 text-muted-foreground" /></div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm"><span className="font-bold text-foreground">@{log.username}</span> performed <Badge variant="outline" className="text-[10px] font-mono h-5 bg-background uppercase">{log.action.replace('_', ' ')}</Badge></p>
                          <span className="text-xs text-muted-foreground shrink-0">{format(new Date(log.timestamp), "MMM d, HH:mm")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Target: <span className="font-medium text-foreground">{log.entityType || 'system'}</span> {log.entityId && `#${log.entityId}`}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingId ? "Edit Member" : "Add Team Member"}</DialogTitle>
            <DialogDescription>{editingId ? "Update profile details." : "Register a new member."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="font-semibold">Full Name</Label><Input placeholder="John Doe" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} className="bg-muted/50" /></div>
              <div className="space-y-2"><Label className="font-semibold">Username</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span><Input placeholder="johndoe" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="pl-7 bg-muted/50" /></div></div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Access Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger className="bg-muted/50 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin (System Owner)</SelectItem>
                  <SelectItem value="admin">Admin (All Modules)</SelectItem>
                  <SelectItem value="manager">General Manager</SelectItem>
                  <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                  <SelectItem value="staff">Field Staff</SelectItem>
                </SelectContent>

              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{editingId ? "Reset Password" : "Password"}</Label>
              <div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="password" placeholder={editingId ? "Leave blank to keep current" : "••••••••"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="pl-10 bg-muted/50" /></div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-between items-center gap-2">
            {editingId && editingId !== me?.id ? (
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (confirm(`Remove this team member?`)) {
                    handleDelete(editingId, form.username);
                    setDialogOpen(false);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="px-8 shadow-lg shadow-primary/20">{saving ? "Processing…" : editingId ? "Save Changes" : "Create Account"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Detail Dialog */}
      <StatsDetailDialog 
        open={statsDialogOpen} 
        onOpenChange={setStatsDialogOpen}
        type={activeStatsType}
        users={users}
        logs={logs}
        dbRolePermissions={dbRolePermissions}
      />
    </div>
  );
}

interface StatsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'total' | 'admins' | 'active' | 'logs' | null;
  users: DBUser[];
  logs: AuditLog[];
  dbRolePermissions: RolePermission[];
}

function StatsDetailDialog({ open, onOpenChange, type, users, logs, dbRolePermissions }: StatsDetailDialogProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  const filteredData = useMemo(() => {
    if (!type) return [];
    
    switch(type) {
      case 'total': {
        return users.filter(u => 
          (roleFilter === 'all' || u.role === roleFilter) &&
          (u.displayName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()))
        );
      }
      case 'admins': {
        return users.filter(u => 
          ['admin', 'super_admin'].includes(u.role) &&
          (u.displayName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()))
        );
      }
      case 'active': {
        const today = new Date().toDateString();
        return users.filter(u => 
          u.lastLoginAt && new Date(u.lastLoginAt).toDateString() === today &&
          (u.displayName.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()))
        );
      }
      case 'logs': {
        return logs.filter(l => 
          l.username.toLowerCase().includes(search.toLowerCase()) || 
          l.action.toLowerCase().includes(search.toLowerCase())
        );
      }
      default: return [];
    }
  }, [type, users, logs, search, roleFilter]);

  const titles = {
    total: "Organization Directory",
    admins: "Administrative Control",
    active: "Daily Attendance & Activity",
    logs: "System Audit Logs"
  };

  const icons = {
    total: Users,
    admins: ShieldCheck,
    active: Activity,
    logs: Clock
  };

  const ActiveIcon = type ? icons[type] : Users;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden bg-background/80 backdrop-blur-2xl">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <ActiveIcon className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">{type && titles[type]}</DialogTitle>
              <DialogDescription>
                Viewing {filteredData.length} {type === 'logs' ? 'entries' : 'members'} for this category
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 pb-0 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={`Search ${type === 'logs' ? 'logs' : 'members'}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-muted/30 border-none rounded-xl h-11"
            />
          </div>
          {type === 'total' && (
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] bg-muted/30 border-none rounded-xl h-11">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.keys(ROLE_CONFIG).map(r => (
                  <SelectItem key={r} value={r}>{ROLE_CONFIG[r as UserRole].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" className="rounded-xl h-11 px-6 border-muted-foreground/20 hover:bg-muted/50 gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="rounded-2xl border bg-card/30 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-none">
                  {type === 'logs' ? (
                    <>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Device/IP</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="w-[300px]">Member</TableHead>
                      <TableHead>Role & Access</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Activity className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No results found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.map((item, i) => (
                  <TableRow key={i} className="group border-b last:border-none border-muted/20 hover:bg-muted/10 transition-colors">
                    {type === 'logs' ? (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarFallback className="text-[10px] bg-muted">{item.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-sm">@{item.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase bg-background border-primary/20 text-primary">
                            {item.action.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.entityType || 'system'} {item.entityId && `#${item.entityId}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Monitor className="h-3 w-3" />
                            <span>192.168.1.1 (Chrome)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono text-muted-foreground">
                          {format(new Date(item.timestamp), "HH:mm:ss")}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                              <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                {item.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{item.displayName}</span>
                              <span className="text-xs text-muted-foreground">@{item.username}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1.5 py-0.5", ROLE_CONFIG[item.role as UserRole].bg, ROLE_CONFIG[item.role as UserRole].color, ROLE_CONFIG[item.role as UserRole].border)}>
                            {item.role === 'admin' && <VerifiedIcon className="h-3 w-3" />}
                            {ROLE_CONFIG[item.role as UserRole].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", item.lastLoginAt && new Date().getTime() - new Date(item.lastLoginAt).getTime() < 300000 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
                            <span className="text-xs font-medium">
                              {item.lastLoginAt && new Date().getTime() - new Date(item.lastLoginAt).getTime() < 300000 ? "Online" : "Offline"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <History className="h-3 w-3" />
                            {item.lastLoginAt ? format(new Date(item.lastLoginAt), "MMM d, HH:mm") : "Never"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Enterprise Access Node: DHAKA_PRIMARY_CLUSTER</p>
          <div className="flex gap-2">
             <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
             <Button size="sm" className="shadow-lg shadow-primary/20">Print Report</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
