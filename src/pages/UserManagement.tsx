import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import bcrypt from "bcryptjs";
import { db, type UserRole } from "@/lib/db";
import { useAuth, writeAuditLog } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Pencil, Trash2, ShieldCheck, Shield, User } from "lucide-react";
import { format } from "date-fns";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Shield; color: string }> = {
  admin:   { label: "Admin",   icon: ShieldCheck, color: "text-primary" },
  manager: { label: "Manager", icon: Shield,      color: "text-warning" },
  staff:   { label: "Staff",   icon: User,        color: "text-muted-foreground" },
};

interface UserFormData {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
}

const defaultForm: UserFormData = { username: "", displayName: "", password: "", role: "staff" };

export default function UserManagement() {
  const { user: me, hasPermission } = useAuth();
  const { toast } = useToast();
  const users = useLiveQuery(() => db.users.orderBy("createdAt").toArray()) ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  if (!hasPermission("users.manage")) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <ShieldCheck className="h-12 w-12 mb-4 opacity-30" />
        <p className="font-medium">You don't have permission to manage users.</p>
      </div>
    );
  }

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(u: typeof users[0]) {
    setEditingId(u.id!);
    setForm({ username: u.username, displayName: u.displayName, role: u.role, password: "" });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.username.trim() || !form.displayName.trim()) {
      toast({ title: "Required fields missing", variant: "destructive" });
      return;
    }
    if (!editingId && !form.password) {
      toast({ title: "Password is required for new users", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update
        const updates: Partial<typeof users[0]> = {
          username: form.username.trim().toLowerCase(),
          displayName: form.displayName.trim(),
          role: form.role,
        };
        if (form.password) {
          updates.passwordHash = await bcrypt.hash(form.password, 10);
        }
        await db.users.update(editingId, updates);
        await writeAuditLog(me, "UPDATE_USER", "user", editingId, { username: form.username });
        toast({ title: "User updated" });
      } else {
        // Create
        const hash = await bcrypt.hash(form.password, 10);
        const id = await db.users.add({
          username: form.username.trim().toLowerCase(),
          displayName: form.displayName.trim(),
          passwordHash: hash,
          role: form.role,
          createdAt: new Date(),
        });
        await writeAuditLog(me, "CREATE_USER", "user", Number(id), { username: form.username });
        toast({ title: "User created" });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: msg.includes("ConstraintError") ? "Username already exists" : msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: number, username: string) {
    if (userId === me?.id) {
      toast({ title: "Cannot delete your own account", variant: "destructive" });
      return;
    }
    await db.users.delete(userId);
    await writeAuditLog(me, "DELETE_USER", "user", userId, { username });
    toast({ title: "User deleted" });
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" /> User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage who can access the application and their permissions</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="space-y-3">
        {users.map(u => {
          const rc = ROLE_CONFIG[u.role];
          const RoleIcon = rc.icon;
          const isMe = u.id === me?.id;
          return (
            <Card key={u.id} className={isMe ? "border-primary/40 bg-primary/5" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                    {u.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{u.displayName}</span>
                      {isMe && <Badge variant="outline" className="text-[10px] h-4">You</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${rc.color}`}>
                    <RoleIcon className="h-3.5 w-3.5" />
                    {rc.label}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {u.lastLoginAt ? `Last login ${format(u.lastLoginAt, "MMM d")}` : "Never logged in"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isMe}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete user?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove <strong>{u.displayName}</strong> (@{u.username}). They will no longer be able to log in.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(u.id!, u.username)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role permissions info */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            {(["admin", "manager", "staff"] as UserRole[]).map(role => {
              const rc = ROLE_CONFIG[role];
              const RIcon = rc.icon;
              return (
                <div key={role} className="space-y-1.5">
                  <div className={`flex items-center gap-1.5 font-semibold ${rc.color}`}>
                    <RIcon className="h-3.5 w-3.5" /> {rc.label}
                  </div>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {role === "admin" && (<>
                      <li>• Full access to everything</li>
                      <li>• Manage users & settings</li>
                      <li>• Export & backup data</li>
                    </>)}
                    {role === "manager" && (<>
                      <li>• Create & edit products/orders</li>
                      <li>• Add & remove inventory</li>
                      <li>• View analytics & export</li>
                    </>)}
                    {role === "staff" && (<>
                      <li>• Create products & orders</li>
                      <li>• Add stock only</li>
                      <li>• No delete or settings access</li>
                    </>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Display Name *</Label>
                <Input placeholder="Full name" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input placeholder="username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{editingId ? "New Password (leave blank to keep current)" : "Password *"}</Label>
              <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full Access</SelectItem>
                  <SelectItem value="manager">Manager — Can edit, no system access</SelectItem>
                  <SelectItem value="staff">Staff — Limited access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
