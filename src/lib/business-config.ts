import type { BusinessType } from './db';

export interface AttributeField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  required?: boolean;
}

export interface BusinessConfig {
  type: BusinessType;
  productLabel: string;
  hasVariants: boolean;
  hasStock: boolean;
  variantAttributes: string[];
  attributeFields: AttributeField[];
  defaultCategories: string[];
}

export const businessConfigs: Record<BusinessType, BusinessConfig> = {
  general: {
    type: 'general',
    productLabel: 'Product',
    hasVariants: true,
    hasStock: true,
    variantAttributes: ['size', 'color'],
    attributeFields: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'warranty', label: 'Warranty', type: 'text' },
    ],
    defaultCategories: ['Electronics', 'Accessories', 'Kids Dress', 'Gifts', 'Home & Kitchen'],
  },
  fashion: {
    type: 'fashion',
    productLabel: 'Fashion Item',
    hasVariants: true,
    hasStock: true,
    variantAttributes: ['size', 'color'],
    attributeFields: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['Unisex', 'Male', 'Female'], required: true },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'season', label: 'Season', type: 'select', options: ['All Season', 'Summer', 'Winter', 'Monsoon'] },
    ],
    defaultCategories: ['Dress', 'Shoes', 'Watches', 'Ornaments', 'Bags', 'Accessories'],
  },
  lubricants: {
    type: 'lubricants',
    productLabel: 'Lubricant',
    hasVariants: true,
    hasStock: true,
    variantAttributes: ['volume', 'grade'],
    attributeFields: [
      { key: 'vehicleType', label: 'Vehicle Type', type: 'select', options: ['Car', 'Bike', 'Truck', 'Universal'], required: true },
      { key: 'viscosity', label: 'Viscosity Grade', type: 'text' },
      { key: 'synthetic', label: 'Synthetic', type: 'boolean' },
    ],
    defaultCategories: ['Engine Oil', 'Gear Oil', 'Brake Fluid', 'Coolant', 'Grease'],
  },
  properties: {
    type: 'properties',
    productLabel: 'Property',
    hasVariants: false,
    hasStock: false,
    variantAttributes: [],
    attributeFields: [
      { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Land', 'Commercial', 'Office'], required: true },
      { key: 'furnished', label: 'Furnished', type: 'boolean' },
      { key: 'parking', label: 'Parking', type: 'boolean' },
    ],
    defaultCategories: ['Residential', 'Commercial', 'Land', 'Rental'],
  },
  agro: {
    type: 'agro',
    productLabel: 'Agro Product',
    hasVariants: true,
    hasStock: true,
    variantAttributes: ['weight', 'grade'],
    attributeFields: [
      { key: 'origin', label: 'Origin', type: 'text' },
      { key: 'organic', label: 'Organic', type: 'boolean' },
      { key: 'shelfLife', label: 'Shelf Life (days)', type: 'number' },
    ],
    defaultCategories: ['Fruits', 'Vegetables', 'Grains', 'Spices', 'Dairy', 'Processed'],
  },
  services: {
    type: 'services',
    productLabel: 'Service',
    hasVariants: false,
    hasStock: false,
    variantAttributes: [],
    attributeFields: [
      { key: 'serviceType', label: 'Service Type', type: 'select', options: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Fixed'], required: true },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'requiresBooking', label: 'Requires Booking', type: 'boolean' },
    ],
    defaultCategories: ['Workspace Rental', 'Consultation', 'Equipment Rental', 'Training'],
  },
};

export function getBusinessConfig(type: BusinessType): BusinessConfig {
  return businessConfigs[type];
}
