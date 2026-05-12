import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import bcrypt from "bcryptjs";
import { db, type UserRole, type User as DBUser } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
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

  // Stats
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
    <div className="space-y-6 animate-page-enter">
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
          { label: "Total Members", value: stats.total, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Admins", value: stats.admins, icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active Today", value: stats.activeToday, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Recent Logs", value: logs.length, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="overflow-x-auto">
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
                    {DISPLAY_PERMISSIONS.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium">{item.label}</td>
                        {(["super_admin", "admin", "manager", "inventory_manager", "sales_manager", "accountant", "cashier", "warehouse_staff", "staff"] as UserRole[]).map((role) => {

                          const roleObj = dbRolePermissions.find(p => p.role === role);
                          const isAllowed = permissionChanges[role]
                            ? permissionChanges[role].includes(item.perm)
                            : (roleObj?.permissions.includes(item.perm) || false);
                          return (
                            <td key={role} className="text-center py-3">
                              <button onClick={() => handleTogglePermission(role, item.perm)} disabled={me?.role !== 'admin'} className={cn("focus:outline-none transition-transform active:scale-90", me?.role !== 'admin' && "cursor-not-allowed opacity-50")}>
                                {isAllowed ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-muted/30 mx-auto" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="px-8 shadow-lg shadow-primary/20">{saving ? "Processing…" : editingId ? "Save Changes" : "Create Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
