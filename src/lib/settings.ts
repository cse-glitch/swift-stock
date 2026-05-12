const SETTINGS_KEY = "inv_settings";

export interface AppSettings {
  // General
  appName: string;
  logoUrl?: string;
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  taxRate: number;
  fiscalYearStart: string;
  maintenanceMode: boolean;

  // Inventory
  skuPattern: string;
  autoBarcode: boolean;
  lowStockThreshold: number;
  expiryAlertDays: number;
  autoReorderEnabled: boolean;

  // Security
  mfaRequired: boolean;
  sessionTimeoutMinutes: number;
  passwordComplexity: 'low' | 'medium' | 'high';
  ipWhitelisting: boolean;

  // Notifications
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  lowStockAlerts: boolean;
  expiryAlerts: boolean;

  // Warehouse
  warehouseHierarchyEnabled: boolean;
  stockTransferApprovalRequired: boolean;

  // Employees
  employeeMonitoringEnabled: boolean;
  shiftSchedulingEnabled: boolean;
  defaultWorkHours: number;

  // Automation
  aiForecastingEnabled: boolean;
  autoBackupCloud: boolean;
  smartReorderEnabled: boolean;

  // API
  apiAccessEnabled: boolean;
  webhookUrl?: string;

  // System
  backupIntervalHours: number;
  autoSyncCloud: boolean;
}

const defaults: AppSettings = {
  appName: "SAMAN Enterprise",
  language: "en-US",
  timezone: "Asia/Dhaka",
  currency: "BDT",
  dateFormat: "DD/MM/YYYY",
  taxRate: 5,
  fiscalYearStart: "01-01",
  maintenanceMode: false,
  skuPattern: "{BIZ}-{CAT}-{RAND:4}",
  autoBarcode: true,
  lowStockThreshold: 10,
  expiryAlertDays: 30,
  autoReorderEnabled: false,
  mfaRequired: false,
  sessionTimeoutMinutes: 30,
  passwordComplexity: 'medium',
  ipWhitelisting: false,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  lowStockAlerts: true,
  expiryAlerts: true,
  warehouseHierarchyEnabled: false,
  stockTransferApprovalRequired: true,
  accountingMode: 'accrual',
  profitCalculation: 'margin',
  autoReorderThreshold: 20,
  employeeMonitoringEnabled: false,
  shiftSchedulingEnabled: true,
  defaultWorkHours: 8,
  aiForecastingEnabled: false,
  autoBackupCloud: true,
  smartReorderEnabled: true,
  apiAccessEnabled: false,
  backupIntervalHours: 24,
  autoSyncCloud: true,
};

export const getSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
};

export const saveSettings = (s: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
};
