import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, MapPin, Briefcase, Mail, Phone, Camera, Save,
  User as UserIcon, Trash2, AlertTriangle, ShieldCheck,
  Users, ScrollText, HardDrive, ArrowRight, LogOut,
  ChevronRight, Bell, Lock, Palette, HelpCircle, Info,
  Edit3, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { db, seedBusinesses } from "@/lib/db";
import { useAuth } from "@/contexts/use-auth";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────── */
interface SettingsRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sublabel?: string;
  rightEl?: React.ReactNode;
  onClick?: () => void;
  asChild?: boolean;
  href?: string;
  danger?: boolean;
}

/* ─── Settings Row ───────────────────────────────────── */
function SettingsRow({
  icon, iconBg, label, sublabel, rightEl, onClick, href, danger,
}: SettingsRowProps) {
  const inner = (
    <div
      role={onClick || href ? "button" : undefined}
      tabIndex={onClick || href ? 0 : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5 w-full transition-colors",
        (onClick || href) && "active:bg-muted/60 cursor-pointer",
        danger && "text-destructive",
      )}
    >
      {/* Icon pill */}
      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold leading-none", danger && "text-destructive")}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{sublabel}</p>}
      </div>

      {/* Right slot */}
      {rightEl ?? ((onClick || href) && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
      ))}
    </div>
  );

  if (href) {
    return <Link to={href} className="block">{inner}</Link>;
  }
  return inner;
}

/* ─── Section Wrapper ────────────────────────────────── */
function SettingsSection({
  title, children,
}: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      {title && (
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-4 mb-1">
          {title}
        </p>
      )}
      <div className="bg-card/60 backdrop-blur-sm rounded-2xl overflow-hidden divide-y divide-border/40 shadow-sm border border-border/30">
        {children}
      </div>
    </div>
  );
}

/* ─── Editable Field ─────────────────────────────────── */
function EditableField({
  id, label, icon, value, disabled, onChange,
}: {
  id: string; label: string; icon: React.ReactNode;
  value: string; disabled: boolean; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <Input
          id={id}
          value={value}
          disabled={disabled}
          className={cn(
            "pl-10 h-11 rounded-xl border-border/50 bg-background/50 text-sm font-medium transition-all",
            disabled && "opacity-70 cursor-not-allowed",
            !disabled && "focus:border-primary/60 focus:ring-2 focus:ring-primary/20",
          )}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────── */
const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.displayName || "User",
    email: user?.username + "@saman.com",
    phone: "+880 1711-223344",
    location: "Dhaka, Bangladesh",
    position: user?.role === "admin" ? "System Administrator" : "Staff Member",
    department: "Operations",
    joiningDate: user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        })
      : "January 15, 2024",
    avatar: "/logo.svg",
  });

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleReset = async () => {
    try {
      await db.delete();
      await seedBusinesses();
      toast.success("Application reset successfully!");
      setTimeout(() => { window.location.href = "/"; }, 1000);
    } catch (error) {
      console.error("Failed to reset application:", error);
      toast.error("Failed to reset application.");
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to sign out?")) {
      sessionStorage.clear();
      window.location.href = "#/login";
      window.location.reload();
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-24 md:max-w-2xl">

      {/* ── Hero / Avatar Banner ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg">
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-br from-primary/70 via-primary/50 to-violet-500/40" />

        {/* Avatar + name overlay */}
        <div className="bg-card/80 backdrop-blur-md px-5 pt-0 pb-5">
          <div className="flex items-end gap-4 -mt-10">
            {/* Avatar with ring */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-full p-[3px] bg-gradient-to-br from-primary to-violet-500 shadow-xl shadow-primary/30">
                <Avatar className="h-full w-full border-2 border-background">
                  <AvatarImage src={profile.avatar} className="object-contain p-1.5 bg-white rounded-full" />
                  <AvatarFallback className="text-xl font-black bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              {isEditing && (
                <button className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl font-black tracking-tight leading-none truncate">{profile.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{profile.position}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                >
                  {user?.role}
                </Badge>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {profile.location}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Joined {profile.joiningDate}
                </span>
              </div>
            </div>

            {/* Edit toggle */}
            <button
              onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all",
                isEditing
                  ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                  : "bg-primary/10 text-primary hover:bg-primary/20",
              )}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Edit Form (collapsed by default) ── */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isEditing ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/30 p-4 space-y-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Edit Information</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <EditableField
              id="name" label="Full Name"
              icon={<UserIcon className="h-4 w-4" />}
              value={profile.name} disabled={!isEditing}
              onChange={(v) => setProfile({ ...profile, name: v })}
            />
            <EditableField
              id="email" label="Email Address"
              icon={<Mail className="h-4 w-4" />}
              value={profile.email} disabled={!isEditing}
              onChange={(v) => setProfile({ ...profile, email: v })}
            />
            <EditableField
              id="phone" label="Phone Number"
              icon={<Phone className="h-4 w-4" />}
              value={profile.phone} disabled={!isEditing}
              onChange={(v) => setProfile({ ...profile, phone: v })}
            />
            <EditableField
              id="location" label="Location"
              icon={<MapPin className="h-4 w-4" />}
              value={profile.location} disabled={!isEditing}
              onChange={(v) => setProfile({ ...profile, location: v })}
            />
            <EditableField
              id="position" label="Position"
              icon={<Briefcase className="h-4 w-4" />}
              value={profile.position} disabled={!isEditing}
              onChange={(v) => setProfile({ ...profile, position: v })}
            />
            <EditableField
              id="joining" label="Date of Joining"
              icon={<Calendar className="h-4 w-4" />}
              value={profile.joiningDate} disabled={true}
              onChange={() => {}}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} className="flex-1 gap-2 h-11 rounded-xl font-bold">
              <Check className="h-4 w-4" /> Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1 gap-2 h-11 rounded-xl font-bold"
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* ── Account Section ── */}
      <SettingsSection title="Account">
        <SettingsRow
          icon={<Mail className="h-4 w-4 text-blue-500" />}
          iconBg="bg-blue-500/10"
          label="Email"
          sublabel={profile.email}
        />
        <SettingsRow
          icon={<Phone className="h-4 w-4 text-green-500" />}
          iconBg="bg-green-500/10"
          label="Phone"
          sublabel={profile.phone}
        />
        <SettingsRow
          icon={<Lock className="h-4 w-4 text-orange-500" />}
          iconBg="bg-orange-500/10"
          label="Change Password"
          sublabel="Update your account password"
          href="/settings"
        />
      </SettingsSection>

      {/* ── Admin Section (role-gated) ── */}
      {user?.role === "admin" && (
        <SettingsSection title="Administration">
          <SettingsRow
            icon={<ShieldCheck className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            label="Team Management"
            sublabel="Manage users and roles"
            href="/team"
          />
          <SettingsRow
            icon={<ScrollText className="h-4 w-4 text-purple-500" />}
            iconBg="bg-purple-500/10"
            label="Audit Logs"
            sublabel="View system activity history"
            href="/audit-logs"
          />
          <SettingsRow
            icon={<HardDrive className="h-4 w-4 text-cyan-500" />}
            iconBg="bg-cyan-500/10"
            label="Data Backup"
            sublabel="Export / Import database"
            href="/backup"
          />
        </SettingsSection>
      )}

      {/* ── Preferences Section ── */}
      <SettingsSection title="Preferences">
        <SettingsRow
          icon={<Bell className="h-4 w-4 text-amber-500" />}
          iconBg="bg-amber-500/10"
          label="Notifications"
          sublabel="Manage alerts and push notifications"
          href="/settings"
        />
        {/* Live dark/light mode toggle */}
        <ThemeToggle showLabel className="divide-y-0" />
      </SettingsSection>

      {/* ── About & Support ── */}
      <SettingsSection title="Support">
        <SettingsRow
          icon={<HelpCircle className="h-4 w-4 text-sky-500" />}
          iconBg="bg-sky-500/10"
          label="Help & Support"
          sublabel="FAQ and documentation"
          onClick={() => toast.info("Help center coming soon!")}
        />
        <SettingsRow
          icon={<Info className="h-4 w-4 text-slate-500" />}
          iconBg="bg-slate-500/10"
          label="About SAMAN"
          sublabel="Version 1.0.0 · Swift Stock"
          onClick={() => toast.info("SAMAN Inventory v1.0.0")}
        />
      </SettingsSection>

      {/* ── Sign Out ── */}
      <SettingsSection>
        <SettingsRow
          icon={<LogOut className="h-4 w-4 text-destructive" />}
          iconBg="bg-destructive/10"
          label="Sign Out"
          sublabel="Log out of your account"
          onClick={handleLogout}
          danger
        />
      </SettingsSection>

      {/* ── Danger Zone ── */}
      {user?.role === "admin" && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-destructive/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-sm font-bold text-destructive">Danger Zone</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Irreversible actions that affect your entire account and database.
            </p>
          </div>
          <div className="p-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full gap-2 h-11 rounded-xl font-bold shadow-lg shadow-destructive/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Reset Application Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>all data</strong> from your local database.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                  >
                    Yes, Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
