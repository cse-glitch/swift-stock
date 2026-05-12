const SETTINGS_KEY = "inv_settings";

export interface AppSettings {
  appName: string;
  logoUrl?: string;
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  taxRate: number;
  fiscalYearStart: string;
  maintenanceMode: boolean;
  skuPattern: string;
  autoBarcode: boolean;
  lowStockThreshold: number;
  expiryAlertDays: number;
  autoReorderEnabled: boolean;
  mfaRequired: boolean;
  sessionTimeoutMinutes: number;
  passwordComplexity: 'low' | 'medium' | 'high';
  ipWhitelisting: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  lowStockAlerts: boolean;
  expiryAlerts: boolean;
  warehouseHierarchyEnabled: boolean;
  stockTransferApprovalRequired: boolean;
  employeeMonitoringEnabled: boolean;
  shiftSchedulingEnabled: boolean;
  defaultWorkHours: number;
  aiForecastingEnabled: boolean;
  autoBackupCloud: boolean;
  smartReorderEnabled: boolean;
  apiAccessEnabled: boolean;
  webhookUrl?: string;
  backupIntervalHours: number;
  autoSyncCloud: boolean;
  accountingMode: 'accrual' | 'cash';
  profitCalculation: 'margin' | 'markup';
  autoReorderThreshold: number;
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
  } catch (e) {
    console.error(e);
  }
  return defaults;
};

export const saveSettings = (s: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
};
