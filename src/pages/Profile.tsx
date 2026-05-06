import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, MapPin, Briefcase, Mail, Phone, Camera, Save, 
  User as UserIcon, Trash2, AlertTriangle, ShieldCheck, 
  Users, ScrollText, HardDrive, ArrowRight, FileText, LogOut
} from "lucide-react";
import { toast } from "sonner";
import { db, seedBusinesses } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
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

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.displayName || "User",
    email: user?.username + "@saman.com",
    phone: "+880 1711-223344",
    location: "Dhaka, Bangladesh",
    position: user?.role === 'admin' ? "System Administrator" : "Staff Member",
    department: "Operations",
    joiningDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "January 15, 2024",
    avatar: "/logo.svg"
  });

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleReset = async () => {
    try {
      await db.delete();
      await seedBusinesses();
      toast.success("Application reset successfully!");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error) {
      console.error("Failed to reset application:", error);
      toast.error("Failed to reset application.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <Button 
          variant={isEditing ? "outline" : "default"} 
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          className="gap-2"
        >
          {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1 border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/40" />
          <CardContent className="pt-0 relative">
            <div className="flex flex-col items-center -mt-12">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarImage src={profile.avatar} className="object-contain p-2 bg-white" />
                  <AvatarFallback className="text-2xl font-bold">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <h2 className="mt-4 text-xl font-bold">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.position}</p>
              <Badge variant="secondary" className="mt-2 px-3 py-0.5 rounded-full uppercase text-[10px] tracking-widest font-bold">
                {user?.role}
              </Badge>
            </div>

            <div className="mt-6 space-y-4 pt-6 border-t border-border/50">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Joined {profile.joiningDate}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Info */}
        <Card className="md:col-span-2 border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
            <CardDescription>Update your contact information and role details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    value={profile.name} 
                    disabled={!isEditing} 
                    className="pl-10"
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    value={profile.email} 
                    disabled={!isEditing} 
                    className="pl-10"
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    value={profile.phone} 
                    disabled={!isEditing} 
                    className="pl-10"
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="location" 
                    value={profile.location} 
                    disabled={!isEditing} 
                    className="pl-10"
                    onChange={(e) => setProfile({...profile, location: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="position" 
                    value={profile.position} 
                    disabled={!isEditing} 
                    className="pl-10"
                    onChange={(e) => setProfile({...profile, position: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="joining">Date of Joining</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="joining" 
                    value={profile.joiningDate} 
                    disabled={true} 
                    className="pl-10 opacity-70"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Tools Section */}
      {user?.role === 'admin' && (
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-bold">Administration</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Button variant="ghost" asChild className="w-full justify-between hover:bg-primary/10 h-12 px-4 group transition-all duration-200 border border-transparent hover:border-primary/20">
                <Link to="/users" className="flex items-center gap-3 w-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold text-foreground">Team Management</span>
                    <span className="text-[10px] text-muted-foreground">Manage users and roles</span>
                  </div>
                  <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </Link>
              </Button>

              <Button variant="ghost" asChild className="w-full justify-between hover:bg-primary/10 h-12 px-4 group transition-all duration-200 border border-transparent hover:border-primary/20">
                <Link to="/audit-logs" className="flex items-center gap-3 w-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <ScrollText className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold text-foreground">Audit Logs</span>
                    <span className="text-[10px] text-muted-foreground">View system activity history</span>
                  </div>
                  <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </Link>
              </Button>

              <Button variant="ghost" asChild className="w-full justify-between hover:bg-primary/10 h-12 px-4 group transition-all duration-200 border border-transparent hover:border-primary/20">
                <Link to="/backup" className="flex items-center gap-3 w-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold text-foreground">Data Backup</span>
                    <span className="text-[10px] text-muted-foreground">Export/Import database JSON</span>
                  </div>
                  <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Support & Legal */}
        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Support & Legal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3">
              <FileText className="h-4 w-4 text-primary/70" />
              <span className="text-sm">Terms of Service</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3">
              <ShieldCheck className="h-4 w-4 text-primary/70" />
              <span className="text-sm">Privacy Policy</span>
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                if(confirm('Are you sure you want to sign out?')) {
                  sessionStorage.clear();
                  window.location.href = '#/login';
                  window.location.reload();
                }
              }}
              className="w-full justify-start gap-3 h-10 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-semibold">Sign Out</span>
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Resetting the application will delete all data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2 shadow-lg shadow-destructive/20">
                  <Trash2 className="h-4 w-4" />
                  Reset Application
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all data from your local database.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
