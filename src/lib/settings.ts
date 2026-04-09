const SETTINGS_KEY = "inv_settings";

export interface AppSettings {
  defaultWeightUnit: 'kg' | 'lb';
  defaultSizeUnit: 'cm' | 'in';
  heavyThresholdKg: number;
}

const defaults: AppSettings = {
  defaultWeightUnit: 'kg',
  defaultSizeUnit: 'cm',
  heavyThresholdKg: 20,
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
