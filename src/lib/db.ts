import Dexie, { type Table } from 'dexie';

// ── Business types ──
export type BusinessType = 'general' | 'fashion' | 'lubricants' | 'properties' | 'agro' | 'services';
export type ProductType = 'physical' | 'service' | 'listing';
export type ProductStatus = 'active' | 'draft' | 'archived';
export type ListingAvailability = 'available' | 'sold' | 'rented' | 'pending';
export type InventoryAction = 'add' | 'remove' | 'adjust';
export type UserRole = 'admin' | 'manager' | 'staff';

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

export interface Order {
  id?: number;
  businessId: number;
  productId: number;
  variantId?: number;
  customerName: string;
  customerNumber: string;
  price: number;
  location: string;
  status: 'pending' | 'completed' | 'cancelled';
  timestamp: Date;
  note?: string;
}

export interface User {
  id?: number;
  username: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AuditLog {
  id?: number;
  userId?: number;
  username: string;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: string;
  timestamp: Date;
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
  orders!: Table<Order>;
  users!: Table<User>;
  auditLogs!: Table<AuditLog>;
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

    // v4: Added orders table
    this.version(4).stores({
      items: '++id, &sku, productName, category, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
      businesses: '++id, &slug, type, isActive',
      categories: '++id, businessId, name, parentId',
      products: '++id, businessId, categoryId, sku, type, status, *tags',
      variants: '++id, productId, sku',
      inventoryLog: '++id, productId, variantId, businessId, type, timestamp',
      propertyListings: '++id, productId, listingType, availability',
      services: '++id, productId',
      orders: '++id, businessId, productId, customerName, customerNumber, status, timestamp',
    });

    // v5: Compound indexes for performance-critical queries
    this.version(5).stores({
      items: '++id, &sku, productName, category, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
      businesses: '++id, &slug, type, isActive',
      categories: '++id, businessId, name, parentId',
      products: '++id, businessId, categoryId, sku, type, status, *tags',
      variants: '++id, productId, sku, [productId+id]',
      inventoryLog: '++id, productId, variantId, businessId, type, timestamp, [businessId+type], [businessId+type+timestamp]',
      propertyListings: '++id, productId, listingType, availability',
      services: '++id, productId',
      orders: '++id, businessId, productId, customerName, customerNumber, status, timestamp, [businessId+status]',
    });

    // v6: Authentication + Audit logs
    this.version(6).stores({
      items: '++id, &sku, productName, category, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
      businesses: '++id, &slug, type, isActive',
      categories: '++id, businessId, name, parentId',
      products: '++id, businessId, categoryId, sku, type, status, *tags',
      variants: '++id, productId, sku, [productId+id]',
      inventoryLog: '++id, productId, variantId, businessId, type, timestamp, [businessId+type], [businessId+type+timestamp]',
      propertyListings: '++id, productId, listingType, availability',
      services: '++id, productId',
      orders: '++id, businessId, productId, customerName, customerNumber, status, timestamp, [businessId+status]',
      users: '++id, &username, role',
      auditLogs: '++id, userId, action, entityType, timestamp',
    });
  }
}

export const db = new InventoryDB();

// ── Seed default businesses ──
export async function seedBusinesses() {
  const count = await db.businesses.count();
  if (count > 0) {
    // Even if businesses exist, check if we should seed sample data
    await seedSampleData();
    return;
  }

  await db.businesses.bulkAdd([
    { name: 'SAMAN Kenakata', slug: 'kenakata', type: 'general', color: '230 65% 52%', icon: 'ShoppingBag', isActive: true, createdAt: new Date() },
    { name: 'Saman Pink', slug: 'pink', type: 'fashion', color: '330 70% 60%', icon: 'Shirt', isActive: true, createdAt: new Date() },
    { name: 'Saman Blue', slug: 'blue', type: 'fashion', color: '210 75% 55%', icon: 'Shirt', isActive: true, createdAt: new Date() },
    { name: 'SAMAN Lubricants', slug: 'lubricants', type: 'lubricants', color: '38 92% 50%', icon: 'Droplets', isActive: true, createdAt: new Date() },
    { name: 'SAMAN Properties', slug: 'properties', type: 'properties', color: '160 50% 45%', icon: 'Building2', isActive: true, createdAt: new Date() },
    { name: 'SAMAN Agro & Food', slug: 'agro', type: 'agro', color: '120 50% 40%', icon: 'Leaf', isActive: true, createdAt: new Date() },
    { name: 'SAMAN Work Terminal', slug: 'terminal', type: 'services', color: '270 55% 55%', icon: 'Briefcase', isActive: true, createdAt: new Date() },
  ]);

  await seedSampleData();
}

async function seedSampleData() {
  const productCount = await db.products.count();
  
  // If we have products, check if the "wrong" sample data exists (iPhone in Kenakata)
  if (productCount > 0) {
    const iphone = await db.products.where('sku').equals('KEN-PH-001').first();
    if (iphone) {
      // Remove the old sample data to replace it
      await db.products.delete(iphone.id!);
      await db.variants.where('productId').equals(iphone.id!).delete();
      await db.inventoryLog.where('productId').equals(iphone.id!).delete();
      // Continue and add the new correct sample data
    } else {
      return;
    }
  }

  const businesses = await db.businesses.toArray();
  const now = new Date();

  for (const biz of businesses) {
    // 1. Create Categories
    let catId: number;
    if (biz.type === 'general') {
      // Ensure we don't duplicate categories if they already exist from a previous seed
      const existingCat = await db.categories.where({ businessId: biz.id!, name: 'Home & Kitchen' }).first();
      catId = existingCat ? existingCat.id! : await db.categories.add({ businessId: biz.id!, name: 'Home & Kitchen' });
      
      const giftCat = await db.categories.where({ businessId: biz.id!, name: 'Gifts' }).first();
      if (!giftCat) await db.categories.add({ businessId: biz.id!, name: 'Gifts' });
      
      const pId = await db.products.add({
        businessId: biz.id!, categoryId: catId, name: 'Premium Ceramic Dinner Set', sku: 'KEN-HK-001',
        type: 'physical', basePrice: 8500, currency: 'BDT', tags: ['kitchen', 'ceramic', 'dinnerware'],
        attributes: { brand: 'Shinepukur', material: 'Bone China', pieces: 32 }, status: 'active',
        isSeasonal: false, expiryTracking: false, createdAt: now, updatedAt: now
      });
      await db.variants.add({
        productId: pId as number, name: 'White / Floral', sku: 'KEN-HK-001-WF',
        attributes: { color: 'White', pattern: 'Floral' }, stock: 12, lowStockThreshold: 2
      });

      const pId2 = await db.products.add({
        businessId: biz.id!, categoryId: catId, name: 'Stainless Steel Water Bottle', sku: 'KEN-HK-002',
        type: 'physical', basePrice: 1200, currency: 'BDT', tags: ['bottle', 'eco-friendly'],
        attributes: { brand: 'RFL', material: 'Steel' }, status: 'active',
        isSeasonal: false, expiryTracking: false, createdAt: now, updatedAt: now
      });
      await db.variants.bulkAdd([
        { productId: pId2 as number, name: 'Blue 750ml', sku: 'KEN-HK-002-B7', attributes: { color: 'Blue', size: '750ml' }, stock: 45, lowStockThreshold: 5 },
        { productId: pId2 as number, name: 'Black 750ml', sku: 'KEN-HK-002-BK7', attributes: { color: 'Black', size: '750ml' }, stock: 30, lowStockThreshold: 5 },
      ]);
    } 
    else if (biz.type === 'fashion') {
      catId = await db.categories.add({ businessId: biz.id!, name: 'Clothing' });
      const pId = await db.products.add({
        businessId: biz.id!, categoryId: catId, name: 'Slim Fit Chino', sku: `FASH-CH-${biz.slug}`,
        type: 'physical', basePrice: 2500, currency: 'BDT', tags: ['casual', 'pants'],
        attributes: { material: 'Cotton' }, status: 'active',
        isSeasonal: true, seasonStart: '03-01', seasonEnd: '08-31',
        expiryTracking: false, createdAt: now, updatedAt: now
      });
      await db.variants.bulkAdd([
        { productId: pId as number, name: 'Navy / 32', sku: `FASH-CH-${biz.slug}-NV32`, attributes: { color: 'Navy', size: '32' }, stock: 20, lowStockThreshold: 5 },
        { productId: pId as number, name: 'Navy / 34', sku: `FASH-CH-${biz.slug}-NV34`, attributes: { color: 'Navy', size: '34' }, stock: 15, lowStockThreshold: 5 },
        { productId: pId as number, name: 'Khaki / 32', sku: `FASH-CH-${biz.slug}-KH32`, attributes: { color: 'Khaki', size: '32' }, stock: 10, lowStockThreshold: 5 },
      ]);
    }
    else if (biz.type === 'lubricants') {
      catId = await db.categories.add({ businessId: biz.id!, name: 'Engine Oils' });
      const pId = await db.products.add({
        businessId: biz.id!, categoryId: catId, name: 'Super Synthetic 5W-30', sku: 'LUB-SS-5W30',
        type: 'physical', basePrice: 1200, currency: 'BDT', tags: ['synthetic', 'engine-oil'],
        attributes: { grade: '5W-30' }, status: 'active',
        isSeasonal: false, expiryTracking: true, createdAt: now, updatedAt: now
      });
      await db.variants.bulkAdd([
        { productId: pId as number, name: '1 Liter', sku: 'LUB-SS-5W30-1L', attributes: { volume: '1L' }, price: 1200, stock: 100, lowStockThreshold: 20 },
        { productId: pId as number, name: '4 Liter', sku: 'LUB-SS-5W30-4L', attributes: { volume: '4L' }, price: 4500, stock: 40, lowStockThreshold: 10 },
      ]);
    }
    else if (biz.type === 'properties') {
      catId = await db.categories.add({ businessId: biz.id!, name: 'Residential' });
      const pId = await db.products.add({
        businessId: biz.id!, categoryId: catId, name: 'Gulshan luxury Apartment', sku: 'PROP-GL-001',
        type: 'listing', basePrice: 45000000, currency: 'BDT', tags: ['luxury', 'gulshan'],
        attributes: { type: 'Apartment' }, status: 'active',
        isSeasonal: false, expiryTracking: false, createdAt: now, updatedAt: now
      });
      await db.propertyListings.add({
        productId: pId as number, listingType: 'sale', location: 'Gulshan 2, Dhaka',
        area: 2800, bedrooms: 4, bathrooms: 4, availability: 'available'
      });
    }
    else if (biz.type === 'agro') {
      catId = await db.categories.add({ businessId: biz.id!, name: 'Grains' });
      const pId = await db.products.add({
        businessId: biz.id!, categoryId: catId, name: 'Premium Chinigura Rice', sku: 'AGRO-CR-001',
        type: 'physical', basePrice: 180, currency: 'BDT', tags: ['rice', 'premium'],
        attributes: { origin: 'Dinajpur' }, status: 'active',
        isSeasonal: false, expiryTracking: true, createdAt: now, updatedAt: now
      });
      await db.variants.add({
        productId: pId as number, name: '5kg Pack', sku: 'AGRO-CR-001-5KG',
        attributes: { weight: '5kg' }, stock: 500, lowStockThreshold: 50
      });
    }
    else if (biz.type === 'services') {
      catId = await db.categories.add({ businessId: biz.id!, name: 'Development' });
      const pId = await db.products.add({
        businessId: biz.id!, categoryId: catId, name: 'Custom ERP Solution', sku: 'SERV-ERP-001',
        type: 'service', basePrice: 500000, currency: 'BDT', tags: ['software', 'erp'],
        attributes: { platform: 'Web' }, status: 'active',
        isSeasonal: false, expiryTracking: false, createdAt: now, updatedAt: now
      });
      await db.services.add({
        productId: pId as number, duration: '3-6 months', capacity: 2,
        currentBookings: 0, availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      });
    }
  }

  // Add some inventory logs to make the dashboard look alive
  const allProducts = await db.products.toArray();
  const allVariants = await db.variants.toArray();
  
  for (const prod of allProducts) {
    const pVariants = allVariants.filter(v => v.productId === prod.id);
    
    // Initial stock-in log
    await db.inventoryLog.add({
      productId: prod.id!, businessId: prod.businessId,
      type: 'add', quantity: 50, reason: 'Initial Stocking',
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
      note: 'Bulk arrival'
    });

    // Add some sales (removals) for revenue
    if (pVariants.length > 0) {
      for (const v of pVariants) {
        await db.inventoryLog.add({
          productId: prod.id!, variantId: v.id, businessId: prod.businessId,
          type: 'remove', quantity: Math.floor(Math.random() * 5) + 1,
          reason: 'Sold', timestamp: new Date(now.getTime() - 1000 * 60 * 60 * Math.random() * 48), // Last 48 hours
        });
      }
    } else {
      // For products without variants (listings/services)
      await db.inventoryLog.add({
        productId: prod.id!, businessId: prod.businessId,
        type: 'remove', quantity: 1, reason: 'Sold',
        timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 12),
      });
    }
  }
}
