import Dexie, { type Table } from 'dexie';

export const generateId = () => crypto.randomUUID();

// Subscription system for auto-sync
export const dbEvents = {
  listeners: [] as (() => void)[],
  subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  },
  notify() {
    this.listeners.forEach(fn => fn());
  }
};

// ── Business types ──
export type BusinessType = 'general' | 'fashion' | 'lubricants' | 'properties' | 'agro' | 'services';
export type ProductType = 'physical' | 'service' | 'listing';
export type ProductStatus = 'active' | 'draft' | 'archived';
export type ListingAvailability = 'available' | 'sold' | 'rented' | 'pending';
export type InventoryAction = 'add' | 'remove' | 'adjust' | 'transfer';
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'inventory_manager' | 'sales_manager' | 'accountant' | 'cashier' | 'warehouse_staff' | 'staff';

export interface Business {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  color: string;       // HSL accent color
  icon: string;        // Lucide icon name
  isActive: boolean;
  createdAt: Date;
  // Enterprise fields
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  currency?: string;
  language?: string;
  timezone?: string;
  invoiceTemplate?: string;
  smtpConfig?: { host: string; port: number; user: string; pass: string; from: string };
  smsConfig?: { provider: string; apiKey: string; senderId: string };
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
  brandId?: string;
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
  barcode?: string;
  qrcode?: string;
  attributes: Record<string, string | number>;
  price?: number;
  stock: number; // Total stock across all warehouses
  lowStockThreshold: number;
  weight?: number;
  dimensions?: { l: number; w: number; h: number };
}

export interface Warehouse {
  id: string;
  businessId: string;
  name: string;
  location: string;
  capacity?: number;
  managerName?: string;
  managerPhone?: string;
  primaryProducts?: string;
  isActive: boolean;
  isMain: boolean;
}

export interface WarehouseStock {
  id: string;
  warehouseId: string;
  variantId: string;
  quantity: number;
  lastUpdated: Date;
}

export interface InventoryLog {
  id: string;
  productId: string;
  variantId?: string;
  businessId: string;
  warehouseId?: string;
  type: InventoryAction;
  quantity: number;
  reason: string;
  note?: string;
  timestamp: Date;
}

export interface StockTransfer {
  id: string;
  businessId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  variantId: string;
  quantity: number;
  status: 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  timestamp: Date;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  paymentTerms: string;
  creditLimit: number;
  isActive: boolean;
}

export interface PurchaseOrder {
  id: string;
  businessId: string;
  supplierId: string;
  status: 'draft' | 'pending' | 'ordered' | 'received' | 'cancelled';
  totalAmount: number;
  taxAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Expense {
  id: string;
  businessId: string;
  categoryId: string;
  amount: number;
  date: Date;
  description: string;
  paymentMethod: string;
  reference?: string;
}

export interface ExpenseCategory {
  id: string;
  businessId: string;
  name: string;
}

export interface Department {
  id: string;
  businessId: string;
  name: string;
}

export interface EmployeeDetail {
  id: string;
  userId: string;
  businessId: string;
  departmentId?: string;
  designation: string;
  salary: number;
  joinDate: Date;
  shiftStart?: string;
  shiftEnd?: string;
  status: 'active' | 'on_leave' | 'terminated';
}

export interface Notification {
  id: string;
  userId: string;
  businessId?: string;
  type: 'stock_alert' | 'expiry_alert' | 'payment_due' | 'approval_request' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  businessId: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsedAt?: Date;
  createdAt: Date;
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
  discount?: number;
  tax?: number;
  totalPrice: number;
  location: string;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: string;
  timestamp: Date;
  note?: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  username: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  timestamp: Date;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permissions: string[];
}

class InventoryDB extends Dexie {
  businesses!: Table<Business>;
  categories!: Table<Category>;
  products!: Table<Product>;
  variants!: Table<Variant>;
  warehouses!: Table<Warehouse>;
  warehouseStock!: Table<WarehouseStock>;
  inventoryLog!: Table<InventoryLog>;
  stockTransfers!: Table<StockTransfer>;
  suppliers!: Table<Supplier>;
  purchaseOrders!: Table<PurchaseOrder>;
  purchaseItems!: Table<PurchaseItem>;
  expenses!: Table<Expense>;
  expenseCategories!: Table<ExpenseCategory>;
  departments!: Table<Department>;
  employeeDetails!: Table<EmployeeDetail>;
  notifications!: Table<Notification>;
  apiKeys!: Table<ApiKey>;
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
    this.version(10).stores({
      users: null,
      auditLogs: null,
      rolePermissions: null,
    });
    this.version(11).stores({
      users: 'id, &username, role, createdAt',
      auditLogs: 'id, userId, action, entityType, timestamp',
      rolePermissions: 'id, &role',
    });
    this.version(12).stores({
      warehouses: 'id, businessId, name, isActive',
      warehouseStock: 'id, warehouseId, variantId, [warehouseId+variantId]',
      stockTransfers: 'id, businessId, fromWarehouseId, toWarehouseId, variantId, status, timestamp',
      suppliers: 'id, businessId, name, email, phone, category, isActive',
      purchaseOrders: 'id, businessId, supplierId, status, createdAt',
      purchaseItems: 'id, purchaseOrderId, productId, variantId',
      expenses: 'id, businessId, categoryId, date',
      expenseCategories: 'id, businessId, name',
      departments: 'id, businessId, name',
      employeeDetails: 'id, userId, businessId, departmentId, status',
      notifications: 'id, userId, businessId, type, isRead, createdAt',
      apiKeys: 'id, businessId, &key',
    });

    this.version(13).stores({
      stockTransfers: 'id, businessId, sourceWarehouseId, targetWarehouseId, variantId, quantity, status, createdAt',
    });

    // --- Mutation Hooks for Auto-Sync ---
    const tables = [
      'businesses', 'categories', 'products', 'variants', 
      'warehouses', 'warehouseStock', 'inventoryLog', 'stockTransfers',
      'suppliers', 'purchaseOrders', 'purchaseItems',
      'expenses', 'expenseCategories', 'departments', 'employeeDetails',
      'notifications', 'apiKeys',
      'propertyListings', 'services', 
      'orders', 'users', 'auditLogs', 'rolePermissions'
    ];

    tables.forEach(tableName => {
      const table = this.table(tableName);
      if (table && typeof table.hook === 'function') {
        table.hook('creating', () => dbEvents.notify());
        table.hook('updating', () => dbEvents.notify());
        table.hook('deleting', () => dbEvents.notify());
      }
    });
  }
}

export const db = new InventoryDB();

export async function seedRolesIfEmpty() {
  const defaultRoles: RolePermission[] = [
    {
      id: 'role-super-admin',
      role: 'super_admin',
      permissions: ['*']
    },
    {
      id: 'role-admin',
      role: 'admin',
      permissions: [
        'products.create', 'products.edit', 'products.delete',
        'orders.create', 'orders.edit', 'orders.delete',
        'inventory.add', 'inventory.remove', 'inventory.transfer',
        'businesses.manage', 'users.manage', 'settings.manage',
        'analytics.view', 'export.data', 'suppliers.manage', 'suppliers.view',
        'warehouses.manage', 'warehouses.view', 'accounting.view'
      ]
    },
    {
      id: 'role-manager',
      role: 'manager',
      permissions: [
        'products.create', 'products.edit',
        'orders.create', 'orders.edit',
        'inventory.add', 'inventory.remove', 'inventory.transfer',
        'analytics.view', 'export.data', 'suppliers.manage',
        'warehouses.manage', 'warehouses.view', 'suppliers.view'
      ]
    },
    {
      id: 'role-inventory-manager',
      role: 'inventory_manager',
      permissions: ['products.create', 'products.edit', 'inventory.add', 'inventory.remove', 'inventory.transfer', 'warehouses.manage', 'warehouses.view']
    },
    {
      id: 'role-sales-manager',
      role: 'sales_manager',
      permissions: ['orders.create', 'orders.edit', 'analytics.view']
    },
    {
      id: 'role-accountant',
      role: 'accountant',
      permissions: ['accounting.view', 'accounting.manage', 'analytics.view']
    },
    {
      id: 'role-cashier',
      role: 'cashier',
      permissions: ['orders.create']
    },
    {
      id: 'role-warehouse-staff',
      role: 'warehouse_staff',
      permissions: ['inventory.add', 'inventory.remove', 'warehouses.view']
    },
    {
      id: 'role-staff',
      role: 'staff',
      permissions: ['products.create', 'orders.create', 'inventory.add']
    }
  ];

  for (const r of defaultRoles) {
    const existing = await db.rolePermissions.where('role').equals(r.role).first();
    if (!existing) {
      await db.rolePermissions.add(r);
    } else {
      // Update with latest permissions if missing
      const newPerms = [...new Set([...existing.permissions, ...r.permissions])];
      if (newPerms.length !== existing.permissions.length) {
        await db.rolePermissions.update(existing.id, { permissions: newPerms });
      }
    }
  }
}

export async function seedBusinesses() {
  const count = await db.businesses.count();
  if (count > 0) {
    await seedSampleData();
    return;
  }

  const businesses: Business[] = [
    { id: generateId(), name: 'SAMAN Kenakata', slug: 'kenakata', type: 'general', color: '230 65% 52%', icon: 'ShoppingBag', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'Saman Pink', slug: 'pink', type: 'fashion', color: '330 70% 60%', icon: 'Shirt', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'Saman Blue', slug: 'blue', type: 'fashion', color: '210 75% 55%', icon: 'Shirt', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'SAMAN Lubricants', slug: 'lubricants', type: 'lubricants', color: '38 92% 50%', icon: 'Droplets', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'SAMAN Properties', slug: 'properties', type: 'properties', color: '160 50% 45%', icon: 'Building2', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'SAMAN Agro & Food', slug: 'agro', type: 'agro', color: '120 50% 40%', icon: 'Leaf', isActive: true, createdAt: new Date() },
    { id: generateId(), name: 'SAMAN Work Terminal', slug: 'terminal', type: 'services', color: '270 55% 55%', icon: 'Briefcase', isActive: true, createdAt: new Date() },
  ];

  await db.businesses.bulkAdd(businesses);

  // Seed default warehouses for each business
  for (const biz of businesses) {
    await db.warehouses.add({
      id: generateId(),
      businessId: biz.id,
      name: 'Main Warehouse',
      location: 'Default Location',
      isActive: true,
      isMain: true
    });
  }

  await seedSampleData();
}

async function seedSampleData() {
  const productCount = await db.products.count();
  if (productCount > 0) return;

  const businesses = await db.businesses.toArray();
  const now = new Date();

  for (const biz of businesses) {
    const catId = generateId();
    await db.categories.add({ id: catId, businessId: biz.id, name: 'Default Category' });
    const pId = generateId();
    await db.products.add({
      id: pId,
      businessId: biz.id, categoryId: catId, name: `Sample Product ${biz.name}`, sku: `${biz.slug.toUpperCase()}-001`,
      type: 'physical', basePrice: 1000, currency: 'BDT', tags: ['sample'],
      attributes: {}, status: 'active', isSeasonal: false, expiryTracking: false, createdAt: now, updatedAt: now
    });
    
    const vId = generateId();
    await db.variants.add({
      id: vId,
      productId: pId, name: 'Standard', sku: `${biz.slug.toUpperCase()}-001-STD`,
      attributes: {}, stock: 50, lowStockThreshold: 5
    });

    // Link stock to main warehouse
    const mainWarehouse = await db.warehouses.where('businessId').equals(biz.id).and(w => w.isMain).first();
    if (mainWarehouse) {
      await db.warehouseStock.add({
        id: generateId(),
        warehouseId: mainWarehouse.id,
        variantId: vId,
        quantity: 50,
        lastUpdated: now
      });
    }
  }
}
