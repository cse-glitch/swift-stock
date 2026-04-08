// Weight conversions (internal storage: kg)
export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;

// Dimension conversions (internal storage: cm)
export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (inch: number) => inch * 2.54;

// Volume: cm³ → m³
export const cm3ToM3 = (cm3: number) => cm3 / 1_000_000;
// Volume: cm³ → ft³
export const cm3ToFt3 = (cm3: number) => cm3 / 28316.846592;

export const displayWeight = (kg: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? kg : kgToLb(kg);

export const displayDim = (cm: number, unit: 'cm' | 'in') =>
  unit === 'cm' ? cm : cmToIn(cm);

export const toStorageWeight = (value: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? value : lbToKg(value);

export const toStorageDim = (value: number, unit: 'cm' | 'in') =>
  unit === 'cm' ? value : inToCm(value);

export const formatNumber = (n: number, decimals = 2) =>
  Number(n.toFixed(decimals));

export const calcVolumeCm3 = (l: number, w: number, h: number) => l * w * h;

export const HEAVY_THRESHOLD_KG = 20;
