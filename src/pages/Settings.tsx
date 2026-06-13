import { useState } from "react";
import { getSettings, saveSettings, type AppSettings } from "@/lib/settings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Building2, Users, Package, Banknote, Bell, Terminal,
  Globe, Palette, Shield, Warehouse, ArrowRightLeft,
  Calculator, Coins, Mail, Smartphone, AlertTriangle,
  Key, Webhook, Activity, Briefcase, Lock, CheckCircle2,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// IA Definition
const SETTINGS_CATEGORIES = [
  {
    id: "organization",
    title: "Organization",
    icon: Building2,
    sections: [
      { id: "general", title: "General", icon: Globe, description: "Core identity and localization" },
      { id: "multi-business", title: "Multi Business", icon: Briefcase, description: "Manage multiple entities" },
      { id: "branding", title: "Branding", icon: Palette, description: "Theme and visual identity" },
    ]
  },
  {
    id: "users-access",
    title: "Users & Access",
    icon: Users,
    sections: [
      { id: "employees", title: "Employees", icon: Users, description: "Staff profiles and monitoring" },
      { id: "roles", title: "Roles", icon: Shield, description: "Designations and access levels" },
      { id: "permissions", title: "Permissions", icon: Lock, description: "Granular access control" },
    ]
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: Package,
    sections: [
      { id: "inventory-rules", title: "Inventory Rules", icon: Package, description: "SKU, expiry, and reorder" },
      { id: "warehouses", title: "Warehouses", icon: Warehouse, description: "Storage facilities" },
      { id: "transfers", title: "Transfers", icon: ArrowRightLeft, description: "Stock movement policies" },
    ]
  },
  {
    id: "finance",
    title: "Finance",
    icon: Banknote,
    sections: [
      { id: "accounting", title: "Accounting", icon: Calculator, description: "Fiscal year and methods" },
      { id: "taxes", title: "Taxes", icon: Banknote, description: "Tax rates and rules" },
      { id: "currency", title: "Currency", icon: Coins, description: "Multi-currency and formatting" },
    ]
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: Bell,
    sections: [
      { id: "email", title: "Email", icon: Mail, description: "SMTP and email templates" },
      { id: "in-app", title: "In-App", icon: Smartphone, description: "Push and platform alerts" },
      { id: "alerts", title: "Alerts", icon: AlertTriangle, description: "Low stock and expiry warnings" },
    ]
  },
  {
    id: "system",
    title: "System",
    icon: Terminal,
    sections: [
      { id: "api-keys", title: "API Keys", icon: Key, description: "Programmatic access" },
      { id: "webhooks", title: "Webhooks", icon: Webhook, description: "Event-driven integrations" },
      { id: "audit-log", title: "Audit Log", icon: Activity, description: "Security and compliance" },
    ]
  }
];

// Vercel/Linear style Setting Card Component
interface SettingsCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const SettingsCard = ({ title, description, children, footer, className }: SettingsCardProps) => (
  <div className={cn("border border-border/60 shadow-sm rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm transition-all", className)}>
    <div className="p-6 md:p-8">
      <h3 className="text-lg font-medium text-foreground tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{description}</p>
      {children}
    </div>
    {footer && (
      <div className="bg-muted/30 px-6 py-4 md:px-8 border-t border-border/60 flex items-center justify-between">
        {footer}
      </div>
    )}
  </div>
);

export default function Settings() {
  const [activeSection, setActiveSection] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveSettings(settings);
      setIsSaving(false);
      toast({ 
        title: "Settings synchronized", 
        description: "Enterprise configuration has been updated successfully.",
      });
    }, 400); // Simulate network delay for premium feel
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const activeCategory = SETTINGS_CATEGORIES.find(c => c.sections.some(s => s.id === activeSection));
  const currentSectionData = activeCategory?.sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-background/50 flex flex-col animate-in fade-in duration-500 pb-20 md:pb-0">
      
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
            {activeCategory && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-border">/</span>
                <span>{activeCategory.title}</span>
                <span className="text-border">/</span>
                <span className="text-foreground font-medium">{currentSectionData?.title}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search settings..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/40 border-border/60 transition-colors focus-visible:bg-background rounded-md text-sm"
              />
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-9 px-4 shadow-sm transition-all rounded-md font-medium"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Save Changes
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-8 flex flex-col lg:flex-row gap-10">
        
        {/* Desktop Sidebar (Linear Style) */}
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-[6.5rem] h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none pr-6">
          <div className="space-y-8">
            {SETTINGS_CATEGORIES.map((category) => {
              const hasVisibleSections = category.sections.some(s => 
                !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (!hasVisibleSections) return null;

              return (
                <div key={category.id} className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 pl-3">
                    <category.icon className="h-3.5 w-3.5" />
                    {category.title}
                  </h4>
                  <nav className="flex flex-col space-y-0.5">
                    {category.sections.map((section) => {
                      if (searchQuery && !section.title.toLowerCase().includes(searchQuery.toLowerCase())) return null;
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all text-left group",
                            isActive 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          {section.title}
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Mobile Accordion Navigation */}
        <div className="lg:hidden w-full mb-6">
          <Accordion type="single" collapsible className="w-full bg-card/20 border border-border/60 rounded-xl px-4 shadow-sm backdrop-blur-sm">
            {SETTINGS_CATEGORIES.map(cat => (
              <AccordionItem value={cat.id} key={cat.id} className="border-b-border/40 last:border-0">
                <AccordionTrigger className="hover:no-underline py-4 text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <cat.icon className="h-4 w-4 text-muted-foreground" />
                    {cat.title}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-1 pl-7">
                  {cat.sections.map(sec => {
                    const isActive = activeSection === sec.id;
                    return (
                      <button 
                        key={sec.id}
                        onClick={() => {
                          setActiveSection(sec.id);
                          // Smooth scroll slightly down to show content
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }} 
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-md text-sm transition-colors flex justify-between items-center", 
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {sec.title}
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                    )
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl min-w-0">
          
          <div className="mb-8 hidden md:block">
            <h2 className="text-3xl font-semibold tracking-tight">{currentSectionData?.title}</h2>
            <p className="text-muted-foreground mt-2">{currentSectionData?.description}</p>
          </div>

          <div className="space-y-8 pb-12 animate-in slide-in-from-bottom-4 fade-in duration-500">
            
            {/* --- Organization: General --- */}
            {activeSection === 'general' && (
              <>
                <SettingsCard 
                  title="Workspace Name" 
                  description="Used to identify your workspace on the dashboard and emails."
                  footer={
                    <>
                      <p className="text-xs text-muted-foreground">Please use 32 characters at maximum.</p>
                      <Button variant="outline" size="sm" onClick={handleSave}>Save</Button>
                    </>
                  }
                >
                  <Input 
                    className="max-w-md bg-background" 
                    value={settings.appName} 
                    onChange={e => update('appName', e.target.value)} 
                    maxLength={32}
                  />
                </SettingsCard>

                <SettingsCard 
                  title="Localization" 
                  description="Set your primary language, timezone, and date format preferences."
                >
                  <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
                    <div className="space-y-2">
                      <Label>Primary Language</Label>
                      <Select value={settings.language} onValueChange={v => update('language', v)}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="bn-BD">Bengali (Bangladesh)</SelectItem>
                          <SelectItem value="ar-SA">Arabic (Saudi Arabia)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select value={settings.timezone} onValueChange={v => update('timezone', v)}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Dhaka">UTC+6 (Dhaka)</SelectItem>
                          <SelectItem value="UTC">UTC (Universal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date Format</Label>
                      <Select value={settings.dateFormat} onValueChange={v => update('dateFormat', v)}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SettingsCard>
              </>
            )}

            {/* --- Organization: Multi Business --- */}
            {activeSection === 'multi-business' && (
              <SettingsCard 
                title="Business Entities" 
                description="Manage sub-companies, branches, and unique business profiles."
              >
                <div className="p-8 border border-border/40 bg-background/50 rounded-lg flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <h4 className="font-medium">Manage 8 Active Entities</h4>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    Switch between active entities directly from the sidebar. Each entity has independent billing and tax rules.
                  </p>
                  <Button asChild className="mt-6" variant="secondary">
                    <a href="#/businesses">Open Business Manager</a>
                  </Button>
                </div>
              </SettingsCard>
            )}

            {/* --- Organization: Branding --- */}
            {activeSection === 'branding' && (
              <>
                <SettingsCard 
                  title="Theme Preference" 
                  description="Choose how the Swift Stock dashboard looks for you."
                >
                  <Select value={settings.themeMode} onValueChange={v => update('themeMode', v as AppSettings['themeMode'])}>
                    <SelectTrigger className="max-w-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System Default</SelectItem>
                      <SelectItem value="light">Light Theme</SelectItem>
                      <SelectItem value="dark">Dark Theme</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsCard>
                
                <SettingsCard 
                  title="Brand Color" 
                  description="Set the primary accent color used across buttons and links."
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md border border-border shadow-sm overflow-hidden shrink-0">
                      <input 
                        type="color" 
                        value={settings.primaryColor} 
                        onChange={e => update('primaryColor', e.target.value)}
                        className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                      />
                    </div>
                    <Input 
                      className="max-w-[120px] font-mono bg-background" 
                      value={settings.primaryColor} 
                      onChange={e => update('primaryColor', e.target.value)} 
                    />
                  </div>
                </SettingsCard>
              </>
            )}

            {/* --- Users & Access: Employees --- */}
            {activeSection === 'employees' && (
              <>
                <SettingsCard 
                  title="Workforce Rules" 
                  description="Configure shift timings and monitoring policies for staff."
                >
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 pr-4">
                        <Label className="text-base">Automated Shift Scheduling</Label>
                        <p className="text-sm text-muted-foreground">Allow the system to rotate shifts automatically.</p>
                      </div>
                      <Switch checked={settings.shiftSchedulingEnabled} onCheckedChange={v => update('shiftSchedulingEnabled', v)} />
                    </div>
                    <div className="w-full h-px bg-border/40" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 pr-4">
                        <Label className="text-base">Activity Monitoring</Label>
                        <p className="text-sm text-muted-foreground">Log detailed UI interactions for audits.</p>
                      </div>
                      <Switch checked={settings.employeeMonitoringEnabled} onCheckedChange={v => update('employeeMonitoringEnabled', v)} />
                    </div>
                    <div className="w-full h-px bg-border/40" />
                    <div className="space-y-2 max-w-[200px]">
                      <Label>Standard Work Day (Hours)</Label>
                      <Input className="bg-background" type="number" value={settings.defaultWorkHours} onChange={e => update('defaultWorkHours', parseInt(e.target.value))} />
                    </div>
                  </div>
                </SettingsCard>
              </>
            )}

            {/* --- Users & Access: Roles & Permissions --- */}
            {(activeSection === 'roles' || activeSection === 'permissions') && (
              <SettingsCard 
                title="Access Control" 
                description="Define what users can see and do within the application."
              >
                <div className="p-8 border border-border/40 bg-background/50 rounded-lg flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h4 className="font-medium">Role-Based Access Control (RBAC)</h4>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    Permissions are managed directly in the Team section. You can assign roles like Admin, Manager, and Viewer.
                  </p>
                  <Button asChild className="mt-6" variant="secondary">
                    <a href="#/team">Configure Team Roles</a>
                  </Button>
                </div>
              </SettingsCard>
            )}

            {/* --- Inventory: Rules --- */}
            {activeSection === 'inventory-rules' && (
              <>
                <SettingsCard 
                  title="SKU Generation" 
                  description="Define the automated pattern for generating Stock Keeping Units."
                >
                  <div className="space-y-2 max-w-md">
                    <Input className="font-mono bg-background" value={settings.skuPattern} onChange={e => update('skuPattern', e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-2">
                      Available macros: <code className="bg-muted px-1 py-0.5 rounded">{"{BIZ}"}</code>, <code className="bg-muted px-1 py-0.5 rounded">{"{CAT}"}</code>, <code className="bg-muted px-1 py-0.5 rounded">{"{RAND:4}"}</code>
                    </p>
                  </div>
                </SettingsCard>
                
                <SettingsCard 
                  title="Stock Thresholds" 
                  description="Configure when the system should alert you about inventory levels."
                >
                  <div className="grid gap-6 sm:grid-cols-2 max-w-xl">
                    <div className="space-y-2">
                      <Label>Low Stock Warning Limit</Label>
                      <Input className="bg-background" type="number" value={settings.lowStockThreshold} onChange={e => update('lowStockThreshold', parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Alert (Days Before)</Label>
                      <Input className="bg-background" type="number" value={settings.expiryAlertDays} onChange={e => update('expiryAlertDays', parseInt(e.target.value))} />
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard 
                  title="Automation" 
                  description="Automated inventory workflows."
                >
                  <div className="flex items-center justify-between max-w-2xl">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base">Auto-Generate Barcodes</Label>
                      <p className="text-sm text-muted-foreground">Create QR/Barcodes automatically for new variants.</p>
                    </div>
                    <Switch checked={settings.autoBarcode} onCheckedChange={v => update('autoBarcode', v)} />
                  </div>
                </SettingsCard>
              </>
            )}

            {/* --- Inventory: Warehouses & Transfers --- */}
            {(activeSection === 'warehouses' || activeSection === 'transfers') && (
              <SettingsCard 
                title="Logistics & Movement" 
                description="Manage how stock flows between your storage facilities."
              >
                <div className="space-y-6 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base">Warehouse Hierarchy</Label>
                      <p className="text-sm text-muted-foreground">Enable parent/child relationships for zones and bins.</p>
                    </div>
                    <Switch checked={settings.warehouseHierarchyEnabled} onCheckedChange={v => update('warehouseHierarchyEnabled', v)} />
                  </div>
                  <div className="w-full h-px bg-border/40" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-base">Transfer Approval Flow</Label>
                      <p className="text-sm text-muted-foreground">Require Manager approval for inter-warehouse movements.</p>
                    </div>
                    <Switch checked={settings.stockTransferApprovalRequired} onCheckedChange={v => update('stockTransferApprovalRequired', v)} />
                  </div>
                </div>
              </SettingsCard>
            )}

            {/* --- Finance: Accounting & Taxes --- */}
            {(activeSection === 'accounting' || activeSection === 'taxes') && (
              <>
                <SettingsCard 
                  title="Fiscal Rules" 
                  description="Core accounting methodology and tax rates."
                >
                  <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mb-6">
                    <div className="space-y-2">
                      <Label>Accounting Method</Label>
                      <Select value={settings.accountingMode} onValueChange={v => update('accountingMode', v as AppSettings['accountingMode'])}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accrual">Accrual Accounting</SelectItem>
                          <SelectItem value="cash">Cash Accounting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Profit Calculation</Label>
                      <Select value={settings.profitCalculation} onValueChange={v => update('profitCalculation', v as AppSettings['profitCalculation'])}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="margin">Margin %</SelectItem>
                          <SelectItem value="markup">Markup %</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 max-w-2xl">
                    <div className="space-y-2">
                      <Label>Fiscal Year Start (MM-DD)</Label>
                      <Input className="bg-background" value={settings.fiscalYearStart} onChange={e => update('fiscalYearStart', e.target.value)} placeholder="01-01" />
                    </div>
                    <div className="space-y-2">
                      <Label>Standard Tax Rate (%)</Label>
                      <Input className="bg-background" type="number" value={settings.taxRate} onChange={e => update('taxRate', parseFloat(e.target.value))} />
                    </div>
                  </div>
                </SettingsCard>
              </>
            )}

            {/* --- Finance: Currency --- */}
            {activeSection === 'currency' && (
              <SettingsCard 
                title="Display Currency" 
                description="Configure how monetary values are displayed across the dashboard."
              >
                <div className="grid gap-6 sm:grid-cols-2 max-w-xl">
                  <div className="space-y-2">
                    <Label>Currency Symbol/Code</Label>
                    <Input className="bg-background" value={settings.currency} onChange={e => update('currency', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Symbol Position</Label>
                    <Select value={settings.currencyPosition} onValueChange={v => update('currencyPosition', v as AppSettings['currencyPosition'])}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left ($100)</SelectItem>
                        <SelectItem value="right">Right (100$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SettingsCard>
            )}

            {/* --- Notifications: Email & In-App --- */}
            {(activeSection === 'email' || activeSection === 'in-app' || activeSection === 'alerts') && (
              <>
                <SettingsCard 
                  title="Communication Channels" 
                  description="Enable or disable delivery methods for system alerts."
                >
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 pr-4">
                        <Label className="text-base">Email Gateway (SMTP)</Label>
                        <p className="text-sm text-muted-foreground">Send reports and alerts via email.</p>
                      </div>
                      <Switch checked={settings.emailEnabled} onCheckedChange={v => update('emailEnabled', v)} />
                    </div>
                    <div className="w-full h-px bg-border/40" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 pr-4">
                        <Label className="text-base">In-App Notifications</Label>
                        <p className="text-sm text-muted-foreground">Show push alerts inside the application.</p>
                      </div>
                      <Switch checked={settings.inAppNotificationsEnabled} onCheckedChange={v => update('inAppNotificationsEnabled', v)} />
                    </div>
                  </div>
                </SettingsCard>

                {activeSection === 'email' && settings.emailEnabled && (
                  <SettingsCard 
                    title="Email Configuration" 
                    description="Set the primary recipient for critical alerts."
                  >
                    <div className="max-w-md space-y-2">
                      <Label>Admin Alert Email</Label>
                      <Input className="bg-background" value={settings.alertEmail} onChange={e => update('alertEmail', e.target.value)} placeholder="admin@example.com" />
                    </div>
                  </SettingsCard>
                )}

                {activeSection === 'alerts' && (
                  <SettingsCard 
                    title="Alert Triggers" 
                    description="Configure which events generate a notification."
                  >
                    <div className="space-y-6 max-w-2xl">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <Label className="text-base">Low Stock Alerts</Label>
                          <p className="text-sm text-muted-foreground">Trigger when items hit their threshold.</p>
                        </div>
                        <Switch checked={settings.lowStockAlerts} onCheckedChange={v => update('lowStockAlerts', v)} />
                      </div>
                      <div className="w-full h-px bg-border/40" />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 pr-4">
                          <Label className="text-base">Expiry Warnings</Label>
                          <p className="text-sm text-muted-foreground">Trigger before perishable goods expire.</p>
                        </div>
                        <Switch checked={settings.expiryAlerts} onCheckedChange={v => update('expiryAlerts', v)} />
                      </div>
                    </div>
                  </SettingsCard>
                )}
              </>
            )}

            {/* --- System: API & Webhooks & Logs --- */}
            {(activeSection === 'api-keys' || activeSection === 'webhooks' || activeSection === 'audit-log') && (
              <>
                {(activeSection === 'api-keys' || activeSection === 'webhooks') && (
                  <SettingsCard 
                    title="Developer API" 
                    description="Connect external ERPs and point-of-sale systems."
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between max-w-2xl">
                        <div className="space-y-0.5 pr-4">
                          <Label className="text-base">Enable API Access</Label>
                          <p className="text-sm text-muted-foreground">Open REST API endpoints for external integrations.</p>
                        </div>
                        <Switch checked={settings.apiAccessEnabled} onCheckedChange={v => update('apiAccessEnabled', v)} />
                      </div>
                      
                      {settings.apiAccessEnabled && (
                        <div className="pt-6 border-t border-border/40">
                          <div className="max-w-2xl space-y-4">
                            <div className="space-y-2">
                              <Label>Production API Key</Label>
                              <div className="flex items-center gap-3">
                                <Input className="font-mono bg-muted text-muted-foreground" readOnly value="sk_live_51P...9f2x" />
                                <Button variant="secondary">Regenerate</Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Global Webhook URL</Label>
                              <Input className="bg-background" value={settings.webhookUrl || ''} onChange={e => update('webhookUrl', e.target.value)} placeholder="https://api.example.com/webhook" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SettingsCard>
                )}

                {activeSection === 'audit-log' && (
                  <SettingsCard 
                    title="Audit Log" 
                    description="Compliance records for security monitoring."
                  >
                    <div className="p-8 border border-border/40 bg-background/50 rounded-lg flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                        <Activity className="h-6 w-6" />
                      </div>
                      <h4 className="font-medium">System Activity Monitored</h4>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        Review detailed logs of user logins, data exports, and configuration changes for compliance auditing.
                      </p>
                      <Button asChild className="mt-6" variant="secondary">
                        <a href="#/audit-logs">View Full Audit Log</a>
                      </Button>
                    </div>
                  </SettingsCard>
                )}
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
