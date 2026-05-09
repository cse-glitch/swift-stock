import Dexie, { type Table } from 'dexie';

export const generateId = () => crypto.randomUUID();

// ── Business types ──
export type BusinessType = 'general' | 'fashion' | 'lubricants' | 'properties' | 'agro' | 'services';
export type ProductType = 'physical' | 'service' | 'listing';
export type ProductStatus = 'active' | 'draft' | 'archived';
export type ListingAvailability = 'available' | 'sold' | 'rented' | 'pending';
export type InventoryAction = 'add' | 'remove' | 'adjust';
export type UserRole = 'admin' | 'manager' | 'staff';

export interface Business {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  color: string;       // HSL accent color
  icon: string;        // Lucide icon name
  isActive: boolean;
  createdAt: Date;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  parentId?: string;
}

export interface Product {
  id: string;
  businessId: string;
  categoryId?: string;
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
  id: string;
  productId: string;
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
  id: string;
  productId: string;
  variantId?: string;
  businessId: string;
  type: InventoryAction;
  quantity: number;
  reason: string;
  note?: string;
  timestamp: Date;
}

export interface PropertyListing {
  id: string;
  productId: string;
  listingType: 'sale' | 'rent';
  location: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  availability: ListingAvailability;
}

export interface Service {
  id: string;
  productId: string;
  duration?: string;
  capacity?: number;
  currentBookings: number;
  availableDays: string[];
}

export interface Order {
  id: string;
  businessId: string;
  productId: string;
  variantId?: string;
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

export interface RolePermission {
  id?: number;
  role: UserRole;
  permissions: string[];
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
  rolePermissions!: Table<RolePermission>;

  constructor() {
    super('InventoryManager');

    this.version(1).stores({
      items: '++id, &sku, productName, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
    });
    this.version(2).stores({
      items: '++id, &sku, productName, category, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
    });
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
    this.version(7).stores({
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
      users: '++id, &username, role, createdAt',
      auditLogs: '++id, userId, action, entityType, timestamp',
    });
    this.version(8).stores({
      auditLogs: '++id, userId, action, entityType, timestamp',
      rolePermissions: '++id, &role',
    });
    this.version(9).stores({
      businesses: 'id, &slug, type, isActive',
      categories: 'id, businessId, name, parentId',
      products: 'id, businessId, categoryId, sku, type, status, *tags',
      variants: 'id, productId, sku, [productId+id]',
      inventoryLog: 'id, productId, variantId, businessId, type, timestamp, [businessId+type], [businessId+type+timestamp]',
      propertyListings: 'id, productId, listingType, availability',
      services: 'id, productId',
      orders: 'id, businessId, productId, customerName, customerNumber, status, timestamp, [businessId+status]',
    });
  }
}

export const db = new InventoryDB();

export async function seedRolesIfEmpty() {
  const count = await db.rolePermissions.count();
  if (count > 0) return;

  await db.rolePermissions.bulkAdd([
    {
      role: 'admin',
      permissions: [
        'products.create', 'products.edit', 'products.delete',
        'orders.create', 'orders.edit', 'orders.delete',
        'inventory.add', 'inventory.remove',
        'businesses.manage', 'users.manage', 'settings.manage',
        'analytics.view', 'export.data',
      ]
    },
    {
      role: 'manager',
      permissions: [
        'products.create', 'products.edit',
        'orders.create', 'orders.edit',
        'inventory.add', 'inventory.remove',
        'analytics.view', 'export.data',
      ]
    },
    {
      role: 'staff',
      permissions: [
        'products.create',
        'orders.create',
        'inventory.add',
      ]
    }
  ]);
}

export async function seedBusinesses() {
  const count = await db.businesses.count();
  if (count > 0) {
    await seedSampleData();
    return;
  }

  await db.businesses.bulkAdd([
    { id: generateId(), name: 'SAMAN Kenakata', slug: 'kenakata', type: 'general', color: '230 65% 52%', icon: 'ShoppingBag', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'Saman Pink', slug: 'pink', type: 'fashion', color: '330 70% 60%', icon: 'Shirt', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'Saman Blue', slug: 'blue', type: 'fashion', color: '210 75% 55%', icon: 'Shirt', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'SAMAN Lubricants', slug: 'lubricants', type: 'lubricants', color: '38 92% 50%', icon: 'Droplets', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'SAMAN Properties', slug: 'properties', type: 'properties', color: '160 50% 45%', icon: 'Building2', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'SAMAN Agro & Food', slug: 'agro', type: 'agro', color: '120 50% 40%', icon: 'Leaf', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'SAMAN Work Terminal', slug: 'terminal', type: 'services', color: '270 55% 55%', icon: 'Briefcase', isActive: true, createdAt: new Date() },
  ]);

  await seedSampleData();
}

async function seedSampleData() {
  const productCount = await db.products.count();
  if (productCount > 0) return;

  const businesses = await db.businesses.toArray();
  const now = new Date();

  for (const biz of businesses) {
    const catId = generateId();
    await db.categories.add({ id: catId, businessId: biz.id!, name: 'Default Category' });
    const pId = generateId();
    await db.products.add({
      id: pId,
      businessId: biz.id!, categoryId: catId, name: `Sample Product ${biz.name}`, sku: `${biz.slug.toUpperCase()}-001`,
      type: 'physical', basePrice: 1000, currency: 'BDT', tags: ['sample'],
      attributes: {}, status: 'active', isSeasonal: false, expiryTracking: false, createdAt: now, updatedAt: now
    });
    await db.variants.add({
      id: generateId(),
      productId: pId, name: 'Standard', sku: `${biz.slug.toUpperCase()}-001-STD`,
      attributes: {}, stock: 50, lowStockThreshold: 5
    });
  }
}
