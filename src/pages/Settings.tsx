import { useState, useMemo } from "react";
import { db } from "@/lib/db";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings2, Shield, Building2, Users, Package, 
  Warehouse, ShoppingCart, Banknote, Bell, 
  Zap, Lock, Globe, Mail, MessageSquare,
  Save, RefreshCw, Trash2, Database, Key,
  Fingerprint, Monitor, Share2, Terminal,
  Cpu, Activity, History, ShieldAlert
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: 'general', title: 'General System', icon: Globe, description: 'Core application identity and localization' },
  { id: 'business', title: 'Multi-Business', icon: Building2, description: 'Manage 7-8 business entities and branching' },
  { id: 'security', title: 'Security & Auth', icon: Lock, description: '2FA, session policies, and IP protection' },
  { id: 'rbac', title: 'Roles & Permissions', icon: Shield, description: 'Granular permission matrix and role control' },
  { id: 'employees', title: 'Employee Settings', icon: Users, description: 'Designations, departments, and monitoring' },
  { id: 'inventory', title: 'Inventory Rules', icon: Package, description: 'SKU patterns, expiry, and reorder rules' },
  { id: 'warehouse', title: 'Warehouse Ops', icon: Warehouse, description: 'Multi-facility distribution and transfers' },
  { id: 'finance', title: 'Accounting', icon: Banknote, description: 'Taxation, fiscal years, and profit rules' },
  { id: 'automation', title: 'Smart Automation', icon: Zap, description: 'AI-driven forecasting and auto-tasks' },
  { id: 'notifications', title: 'Notifications', icon: Bell, description: 'SMTP, SMS, and WhatsApp configurations' },
  { id: 'api', title: 'API & Integrations', icon: Key, description: 'Webhooks, ERP, and POS integrations' },
  { id: 'data', title: 'Data & Maintenance', icon: Database, description: 'Backups, logs, and system health' },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const { toast } = useToast();

  const handleSave = () => {
    saveSettings(settings);
    toast({ 
      title: "Settings synchronized", 
      description: "Enterprise configuration has been updated across all nodes.",
    });
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col gap-6 animate-page-enter pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/30 p-6 rounded-2xl border border-border/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Control Panel</h1>
            <p className="text-sm text-muted-foreground">Master configuration for SAMAN Inventory Enterprise</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setSettings(getSettings())}>
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
          <Button onClick={handleSave} className="gap-2 rounded-xl px-6 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Navigation Sidebar / Horizontal scroll on mobile */}
        <aside className="lg:w-72 space-y-2 shrink-0">
          <div className="relative mb-2 lg:mb-4">
            <Input 
              placeholder="Search settings..." 
              className="bg-card/50 border-none pl-10 h-10 lg:h-11 rounded-xl shadow-inner text-sm"
            />
            <Terminal className="absolute left-3.5 top-3 lg:top-3.5 h-4 w-4 text-muted-foreground" />
          </div>
          
          <nav className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 lg:py-3 rounded-full lg:rounded-xl text-xs lg:text-sm font-medium transition-all group shrink-0 relative whitespace-nowrap",
                  activeSection === s.id 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "hover:bg-muted/50 bg-card/40 lg:bg-transparent text-muted-foreground hover:text-foreground border border-border/20 lg:border-none"
                )}
              >
                <s.icon className={cn("h-3.5 w-3.5 lg:h-4 lg:w-4 transition-transform group-hover:scale-110", activeSection === s.id ? "text-white" : "text-primary")} />
                <span>{s.title}</span>
                {activeSection === s.id && <div className="hidden lg:block absolute left-0 w-1 h-6 bg-white rounded-full -translate-x-2" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pb-20">
          <Tabs value={activeSection} className="w-full h-full">
            
            {/* General Section */}
            <TabsContent value="general" className="mt-0 space-y-6">
              <section className="animate-scale-in">
                <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
                  <div className="h-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" /> Application Identity
                    </CardTitle>
                    <CardDescription>Global branding and regional localization rules.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Application Name</Label>
                        <Input value={settings.appName} onChange={e => update('appName', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>System Language</Label>
                        <Select value={settings.language} onValueChange={v => update('language', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en-US">English (US)</SelectItem>
                            <SelectItem value="bn-BD">Bengali (Bangladesh)</SelectItem>
                            <SelectItem value="ar-SA">Arabic (Saudi Arabia)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Select value={settings.timezone} onValueChange={v => update('timezone', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Dhaka">UTC+6 (Dhaka)</SelectItem>
                            <SelectItem value="UTC">UTC (Universal)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Input value={settings.currency} onChange={e => update('currency', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Date Format</Label>
                        <Select value={settings.dateFormat} onValueChange={v => update('dateFormat', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="animate-scale-in delay-100">
                <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Zap className="h-5 w-5 text-amber-500" /> Operational Modes
                    </CardTitle>
                    <CardDescription>Control system accessibility and background processes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                      <div className="space-y-0.5">
                        <Label className="text-base">Maintenance Mode</Label>
                        <p className="text-xs text-muted-foreground">Block all non-admin access for system upgrades.</p>
                      </div>
                      <Switch checked={settings.maintenanceMode} onCheckedChange={v => update('maintenanceMode', v)} />
                    </div>
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                      <div className="space-y-0.5">
                        <Label className="text-base">Auto-Sync Cloud</Label>
                        <p className="text-xs text-muted-foreground">Keep local data synchronized with Supabase clusters.</p>
                      </div>
                      <Switch checked={settings.autoSyncCloud} onCheckedChange={v => update('autoSyncCloud', v)} />
                    </div>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>

            {/* Inventory Section */}
            <TabsContent value="inventory" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" /> SKU & Labeling
                  </CardTitle>
                  <CardDescription>Rules for product identification and automated tracking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>SKU Generation Pattern</Label>
                    <div className="flex gap-2">
                      <Input value={settings.skuPattern} onChange={e => update('skuPattern', e.target.value)} className="font-mono text-sm" />
                      <Button variant="outline" size="icon" title="View Documentation"><History className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground px-1 uppercase tracking-widest font-bold">Supported: &#123;BIZ&#125;, &#123;CAT&#125;, &#123;RAND:n&#125;, &#123;DATE&#125;</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Low Stock Threshold (Global)</Label>
                      <Input type="number" value={settings.lowStockThreshold} onChange={e => update('lowStockThreshold', parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Alert (Days)</Label>
                      <Input type="number" value={settings.expiryAlertDays} onChange={e => update('expiryAlertDays', parseInt(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Auto-Generate Barcodes</Label>
                      <p className="text-xs text-muted-foreground">Create QR/Barcodes automatically for new variants.</p>
                    </div>
                    <Switch checked={settings.autoBarcode} onCheckedChange={v => update('autoBarcode', v)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Section */}
            <TabsContent value="security" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                    <Lock className="h-5 w-5" /> Enterprise Security
                  </CardTitle>
                  <CardDescription>Fortify system access with multi-factor auth and session control.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-destructive/5 border border-destructive/10">
                    <div className="space-y-0.5">
                      <Label className="text-base">Mandatory 2FA</Label>
                      <p className="text-xs text-destructive/70">Force all management staff to use 2FA verification.</p>
                    </div>
                    <Switch checked={settings.mfaRequired} onCheckedChange={v => update('mfaRequired', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Session Timeout (Minutes)</Label>
                      <Input type="number" value={settings.sessionTimeoutMinutes} onChange={e => update('sessionTimeoutMinutes', parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Password Policy</Label>
                      <Select value={settings.passwordComplexity} onValueChange={v => update('passwordComplexity', v as AppSettings['passwordComplexity'])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Standard (6 chars)</SelectItem>
                          <SelectItem value="medium">Secure (8+ chars, numbers)</SelectItem>
                          <SelectItem value="high">Enterprise (12+ chars, special)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">IP Restrictions</Label>
                      <p className="text-xs text-muted-foreground">Limit admin access to authorized office IP addresses.</p>
                    </div>
                    <Switch checked={settings.ipWhitelisting} onCheckedChange={v => update('ipWhitelisting', v)} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-primary" /> Biometric & Device Sync
                  </CardTitle>
                  <CardDescription>Configuration for mobile app and hardware authentication.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Monitor className="h-8 w-8 opacity-40" />
                  </div>
                  <div>
                    <h3 className="font-bold">Device Tracking Active</h3>
                    <p className="text-sm text-muted-foreground">34 employee devices currently synchronized across 5 locations.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl">View Authorized Devices</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Section */}
            <TabsContent value="notifications" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" /> Alert Channels
                  </CardTitle>
                  <CardDescription>Configure how the system communicates with stakeholders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Mail className="h-5 w-5" /></div>
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Gateway (SMTP)</Label>
                        <p className="text-xs text-muted-foreground">Amazon SES Cluster Active</p>
                      </div>
                    </div>
                    <Switch checked={settings.emailEnabled} onCheckedChange={v => update('emailEnabled', v)} />
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><MessageSquare className="h-5 w-5" /></div>
                      <div className="space-y-0.5">
                        <Label className="text-base">WhatsApp Business API</Label>
                        <p className="text-xs text-muted-foreground">Not Configured</p>
                      </div>
                    </div>
                    <Switch checked={settings.whatsappEnabled} onCheckedChange={v => update('whatsappEnabled', v)} />
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><ShieldAlert className="h-5 w-5" /></div>
                      <div className="space-y-0.5">
                        <Label className="text-base">Critical Stock Alerts</Label>
                        <p className="text-xs text-muted-foreground">Instant notifications for out-of-stock items.</p>
                      </div>
                    </div>
                    <Switch checked={settings.lowStockAlerts} onCheckedChange={v => update('lowStockAlerts', v)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Employee Section */}
            <TabsContent value="employees" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Workforce Management
                  </CardTitle>
                  <CardDescription>Policies for staff monitoring, scheduling, and labor rules.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Shift Scheduling</Label>
                      <p className="text-xs text-muted-foreground">Enable automated shift rotations for warehouse and sales staff.</p>
                    </div>
                    <Switch checked={settings.shiftSchedulingEnabled} onCheckedChange={v => update('shiftSchedulingEnabled', v)} />
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Employee Activity Monitoring</Label>
                      <p className="text-xs text-destructive">Logs detailed UI interactions for audit and performance review.</p>
                    </div>
                    <Switch checked={settings.employeeMonitoringEnabled} onCheckedChange={v => update('employeeMonitoringEnabled', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Standard Work Day (Hours)</Label>
                      <Input type="number" value={settings.defaultWorkHours} onChange={e => update('defaultWorkHours', parseInt(e.target.value))} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Automation Section */}
            <TabsContent value="automation" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" /> Smart Workflows
                  </CardTitle>
                  <CardDescription>AI-driven optimizations and automated system tasks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                    <div className="space-y-0.5">
                      <Label className="text-base">AI Demand Forecasting</Label>
                      <p className="text-xs text-muted-foreground">Predict future stock needs based on historical sales trends.</p>
                    </div>
                    <Switch checked={settings.aiForecastingEnabled} onCheckedChange={v => update('aiForecastingEnabled', v)} />
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Smart Auto-Reorder</Label>
                      <p className="text-xs text-muted-foreground">Automatically create draft Purchase Orders when stock is low.</p>
                    </div>
                    <Switch checked={settings.smartReorderEnabled} onCheckedChange={v => update('smartReorderEnabled', v)} />
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <Cpu className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-bold">Automation Engine Status</p>
                      <p className="text-xs text-muted-foreground">Processing 1,240 events per minute. Latency: 45ms.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Section */}
            <TabsContent value="api" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" /> Developer Tools & API
                  </CardTitle>
                  <CardDescription>Connect SAMAN with external platforms and ERP systems.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable API Access</Label>
                      <p className="text-xs text-muted-foreground">Allow external systems to interact with your data via REST.</p>
                    </div>
                    <Switch checked={settings.apiAccessEnabled} onCheckedChange={v => update('apiAccessEnabled', v)} />
                  </div>
                  
                  {settings.apiAccessEnabled && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label>Global Webhook URL</Label>
                        <Input value={settings.webhookUrl} onChange={e => update('webhookUrl', e.target.value)} placeholder="https://your-app.com/api/saman-webhook" />
                      </div>
                      <div className="p-6 rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 flex flex-col items-center gap-4 text-center">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold">Production API Key</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-2 p-2 bg-card rounded border">sk_live_51P...9f2x</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs text-destructive">Revoke Access</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Management Section */}
            <TabsContent value="data" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" /> Backup & Recovery
                  </CardTitle>
                  <CardDescription>Ensure data persistence and disaster recovery capability.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Automated Backup Interval (Hours)</Label>
                      <Input type="number" value={settings.backupIntervalHours} onChange={e => update('backupIntervalHours', parseInt(e.target.value))} />
                    </div>
                    <div className="flex flex-col justify-end">
                      <Button variant="outline" className="gap-2 rounded-xl h-11">
                        <Share2 className="h-4 w-4" /> Run Manual Backup
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4">
                    <Activity className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-500">System Integrity Healthy</p>
                      <p className="text-xs text-amber-700/70 mt-0.5">Last automated backup successfully uploaded to encrypted S3 bucket 4 hours ago.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-xl text-destructive flex items-center gap-2">
                    <Trash2 className="h-5 w-5" /> Danger Zone
                  </CardTitle>
                  <CardDescription>Irreversible actions that modify or purge entire datasets.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Button variant="outline" className="justify-start gap-3 h-12 rounded-xl text-amber-600 hover:bg-amber-500/5">
                      <RefreshCw className="h-4 w-4" /> Re-seed Business Logic Defaults
                    </Button>
                    <Button variant="destructive" className="justify-start gap-3 h-12 rounded-xl shadow-lg shadow-destructive/20">
                      <Trash2 className="h-4 w-4" /> Wipe Local Database (Reset Application)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Multi-Business Section (Placeholder for detailed list) */}
            <TabsContent value="business" className="mt-0 space-y-6">
               <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                  <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner">
                    <Building2 className="h-10 w-10 opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold">Business Hub Configuration</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-3 leading-relaxed">
                    You are currently managing 8 distinct business entities. 
                    Individual branding, invoice templates, and tax rules are synchronized via the <strong>Business Switcher</strong> in the sidebar.
                  </p>
                  <div className="flex gap-3 mt-8">
                    <Button variant="secondary" className="rounded-xl px-6">Manage Entities</Button>
                    <Button variant="outline" className="rounded-xl px-6">Invoice Designer</Button>
                  </div>
               </Card>
            </TabsContent>

            {/* RBAC Section (Link to Team) */}
            <TabsContent value="rbac" className="mt-0 space-y-6">
               <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                  <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner">
                    <Shield className="h-10 w-10 opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold">Granular Permission Matrix</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-3 leading-relaxed">
                    RBAC policies are currently enforced at the system core. 
                    You can manage role-specific permissions and user assignments in the <strong>Team Management</strong> module.
                  </p>
                  <Button className="rounded-xl px-8 mt-8" asChild>
                    <a href="/team">Open Team Settings</a>
                  </Button>
               </Card>
            </TabsContent>

            {/* Warehouse Ops Section */}
            <TabsContent value="warehouse" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-primary" /> Logistics & Stock Movement
                  </CardTitle>
                  <CardDescription>Rules for multi-facility distribution and stock safety.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Stock Transfer Approval</Label>
                      <p className="text-xs text-muted-foreground">Require Manager approval for all cross-warehouse movements.</p>
                    </div>
                    <Switch checked={settings.stockTransferApprovalRequired} onCheckedChange={v => update('stockTransferApprovalRequired', v)} />
                  </div>
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable Warehouse Hierarchy</Label>
                      <p className="text-xs text-muted-foreground">Support Parent/Child relationships between storage locations.</p>
                    </div>
                    <Switch checked={settings.warehouseHierarchyEnabled} onCheckedChange={v => update('warehouseHierarchyEnabled', v)} />
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <History className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-bold">Transfer Transit Time</p>
                      <p className="text-xs text-muted-foreground">Average inter-warehouse transit: 14.2 hours based on last 50 transfers.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Accounting Section */}
            <TabsContent value="finance" className="mt-0 space-y-6">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" /> Financial Configuration
                  </CardTitle>
                  <CardDescription>Configure accounting standards and profit calculation rules.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Accounting Method</Label>
                      <Select value={settings.accountingMode} onValueChange={v => update('accountingMode', v as AppSettings['accountingMode'])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accrual">Accrual Accounting (Standard)</SelectItem>
                          <SelectItem value="cash">Cash Accounting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Profit Calculation</Label>
                      <Select value={settings.profitCalculation} onValueChange={v => update('profitCalculation', v as AppSettings['profitCalculation'])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="margin">Margin % (Price - Cost) / Price</SelectItem>
                          <SelectItem value="markup">Markup % (Price - Cost) / Cost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Standard Tax Rate (%)</Label>
                      <Input type="number" value={settings.taxRate} onChange={e => update('taxRate', parseFloat(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fiscal Year Start</Label>
                      <Input value={settings.fiscalYearStart} onChange={e => update('fiscalYearStart', e.target.value)} placeholder="01-01" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Auto-Reorder Logic
                  </CardTitle>
                  <CardDescription>Automated procurement suggestions based on inventory levels.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Global Reorder Trigger (%)</Label>
                    <Input type="number" value={settings.autoReorderThreshold} onChange={e => update('autoReorderThreshold', parseInt(e.target.value))} />
                    <p className="text-[10px] text-muted-foreground">Suggest restock when level drops below this percentage of max capacity.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'outline' | 'secondary', className?: string }) {
  const styles = {
    default: 'bg-primary text-primary-foreground',
    outline: 'border border-border text-foreground',
    secondary: 'bg-muted text-muted-foreground'
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest", styles[variant], className)}>
      {children}
    </span>
  );
}
