import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Briefcase, Mail, Phone, Camera, Save, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Tanvir Ahmed",
    email: "tanvir@saman.com",
    phone: "+880 1711-223344",
    location: "Dhaka, Bangladesh",
    position: "Inventory Manager",
    department: "Operations",
    joiningDate: "January 15, 2024",
    avatar: "/logo.svg"
  });

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
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
                  <AvatarFallback className="text-2xl font-bold">TA</AvatarFallback>
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
                {profile.department}
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">Activity Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Sales Managed</span>
                <span className="text-lg font-bold">৳1,245,600</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none">+12%</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Inventory Updates</span>
                <span className="text-lg font-bold">842 Actions</span>
              </div>
              <Badge variant="outline">Top 5%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold">System Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Admin Access</Badge>
              <Badge variant="secondary">Financial Reports</Badge>
              <Badge variant="secondary">Inventory Control</Badge>
              <Badge variant="secondary">User Management</Badge>
              <Badge variant="secondary">Export CSV</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
