import Dexie, { type Table } from 'dexie';

// ── Business types ──
export type BusinessType = 'general' | 'fashion' | 'lubricants' | 'properties' | 'agro' | 'services';
export type ProductType = 'physical' | 'service' | 'listing';
export type ProductStatus = 'active' | 'draft' | 'archived';
export type ListingAvailability = 'available' | 'sold' | 'rented' | 'pending';
export type InventoryAction = 'add' | 'remove' | 'adjust';

export interface Business {
  id?: number;
  name: string;
  slug: string;
  type: BusinessType;
  color: string;       // HSL accent color
  icon: string;        // Lucide icon name
  isActive: boolean;
  createdAt: Date;
}

export interface Category {
  id?: number;
  businessId: number;
  name: string;
  parentId?: number;
}

export interface Product {
  id?: number;
  businessId: number;
  categoryId?: number;
  name: string;
  sku: string;
  type: ProductType;
  description?: string;
  basePrice?: number;
  currency: string;
  tags: string[];
  attributes: Record<string, string | number | boolean>;
  status: ProductStatus;
  isSeasonal: boolean;
  seasonStart?: string;
  seasonEnd?: string;
  expiryTracking: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Variant {
  id?: number;
  productId: number;
  name: string;
  sku: string;
  attributes: Record<string, string | number>;
  price?: number;
  stock: number;
  lowStockThreshold: number;
  weight?: number;
  dimensions?: { l: number; w: number; h: number };
}

export interface InventoryLog {
  id?: number;
  productId: number;
  variantId?: number;
  businessId: number;
  type: InventoryAction;
  quantity: number;
  reason: string;
  note?: string;
  timestamp: Date;
}

export interface PropertyListing {
  id?: number;
  productId: number;
  listingType: 'sale' | 'rent';
  location: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  availability: ListingAvailability;
}

export interface Service {
  id?: number;
  productId: number;
  duration?: string;
  capacity?: number;
  currentBookings: number;
  availableDays: string[];
}

// ── Legacy tables (kept for migration) ──
export interface LegacyItem {
  id?: number;
  sku: string;
  productName: string;
  category?: string;
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  length?: number;
  width?: number;
  height?: number;
  sizeUnit?: 'cm' | 'in';
  quantity: number;
  lastUpdated: Date;
}

export interface LegacyRemoval {
  id?: number;
  sku: string;
  productName: string;
  quantityRemoved: number;
  reason: 'Sold' | 'Damaged' | 'Expired' | 'Returned' | 'Other';
  note?: string;
  timestamp: Date;
}

class InventoryDB extends Dexie {
  businesses!: Table<Business>;
  categories!: Table<Category>;
  products!: Table<Product>;
  variants!: Table<Variant>;
  inventoryLog!: Table<InventoryLog>;
  propertyListings!: Table<PropertyListing>;
  services!: Table<Service>;
  // Legacy
  items!: Table<LegacyItem>;
  removals!: Table<LegacyRemoval>;

  constructor() {
    super('InventoryManager');

    // Keep legacy versions for migration path
    this.version(1).stores({
      items: '++id, &sku, productName, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
    });
    this.version(2).stores({
      items: '++id, &sku, productName, category, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
    });

    // v3: Multi-business schema
    this.version(3).stores({
      items: '++id, &sku, productName, category, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
      businesses: '++id, &slug, type, isActive',
      categories: '++id, businessId, name, parentId',
      products: '++id, businessId, categoryId, sku, type, status, *tags',
      variants: '++id, productId, sku',
      inventoryLog: '++id, productId, variantId, businessId, type, timestamp',
      propertyListings: '++id, productId, listingType, availability',
      services: '++id, productId',
    });
  }
}

export const db = new InventoryDB();

// ── Seed default businesses ──
export async function seedBusinesses() {
  const count = await db.businesses.count();
  if (count > 0) return;

  await db.businesses.bulkAdd([
    { name: 'SAMAN Kenakata', slug: 'kenakata', type: 'general', color: '230 65% 52%', icon: 'ShoppingBag', isActive: true, createdAt: new Date() },
    { name: 'Saman Pink', slug: 'pink', type: 'fashion', color: '330 70% 60%', icon: 'Shirt', isActive: true, createdAt: new Date() },
    { name: 'Saman Blue', slug: 'blue', type: 'fashion', color: '210 75% 55%', icon: 'Shirt', isActive: true, createdAt: new Date() },
    { name: 'SAMAN Lubricants', slug: 'lubricants', type: 'lubricants', color: '38 92% 50%', icon: 'Droplets', isActive: true, createdAt: new Date() },
    { name: 'SAMAN Properties', slug: 'properties', type: 'properties', color: '160 50% 45%', icon: 'Building2', isActive: true, createdAt: new Date() },
    { name: 'SAMAN Agro & Food', slug: 'agro', type: 'agro', color: '120 50% 40%', icon: 'Leaf', isActive: true, createdAt: new Date() },
    { name: 'SAMAN Work Terminal', slug: 'terminal', type: 'services', color: '270 55% 55%', icon: 'Briefcase', isActive: true, createdAt: new Date() },
  ]);
}
