import { db, type User, type UserRole } from '@/lib/db';
import { supabase, isSupabaseConfigured } from './supabase';

type SupabaseUserRow = {
  id?: string;
  username?: string;
  display_name?: string;
  displayName?: string;
  role?: string;
  password_hash?: string;
  passwordHash?: string;
  created_at?: string;
  createdAt?: string;
  last_login_at?: string;
  lastLoginAt?: string;
};

/** Map Supabase user rows to Dexie schema and keep local password hashes when remote omits them. */
async function pullUsersToLocal(rows: SupabaseUserRow[]) {
  const localUsers = await db.users.toArray();
  const localByUsername = new Map(localUsers.map((u) => [u.username.toLowerCase(), u]));

  const mapped: User[] = rows
    .filter((row) => row.username)
    .map((row) => {
      const username = row.username!.trim().toLowerCase();
      const local = localByUsername.get(username);
      const passwordHash =
        row.password_hash ?? row.passwordHash ?? local?.passwordHash ?? '';

      return {
        id: row.id ?? local?.id ?? crypto.randomUUID(),
        username,
        displayName: row.display_name ?? row.displayName ?? local?.displayName ?? username,
        role: (row.role ?? local?.role ?? 'staff') as UserRole,
        passwordHash,
        createdAt: row.created_at
          ? new Date(row.created_at)
          : row.createdAt
            ? new Date(row.createdAt)
            : (local?.createdAt ?? new Date()),
        lastLoginAt: row.last_login_at
          ? new Date(row.last_login_at)
          : row.lastLoginAt
            ? new Date(row.lastLoginAt)
            : local?.lastLoginAt,
        twoFactorEnabled: local?.twoFactorEnabled ?? false,
        twoFactorSecret: local?.twoFactorSecret,
        failedAttempts: local?.failedAttempts,
        lockedUntil: local?.lockedUntil,
      };
    });

  await db.users.bulkPut(mapped);
}

/**
 * This utility handles pushing local Dexie data to Supabase 
 * and pulling Supabase data back to local.
 */

export async function pushLocalToSupabase() {
  if (!isSupabaseConfigured) {
    console.warn('Sync: Skipping push — Supabase not configured.');
    return;
  }
  console.log('Sync: Pushing local data to Supabase...');

  try {
    const biz = await db.businesses.toArray();
    if (biz.length > 0) {
      const { error } = await supabase.from('businesses').upsert(biz.map(b => ({
        id: b.id, name: b.name, slug: b.slug, currency: b.currency,
        address: b.address, phone: b.phone, email: b.email,
        created_at: b.createdAt,
      })));
      if (error) console.error('Sync push businesses:', error.message);
    }

    const cats = await db.categories.toArray();
    if (cats.length > 0) {
      const { error } = await supabase.from('categories').upsert(cats.map(c => ({
        id: c.id, business_id: c.businessId, name: c.name, description: c.description,
      })));
      if (error) console.error('Sync push categories:', error.message);
    }

    const prods = await db.products.toArray();
    if (prods.length > 0) {
      const { error } = await supabase.from('products').upsert(prods.map(p => ({
        id: p.id, business_id: p.businessId, category_id: p.categoryId,
        name: p.name, sku: p.sku, description: p.description,
        type: p.type, base_price: p.basePrice, currency: p.currency,
        tags: p.tags, status: p.status, attributes: p.attributes,
        is_seasonal: p.isSeasonal, expiry_tracking: p.expiryTracking,
        created_at: p.createdAt, updated_at: p.updatedAt,
      })));
      if (error) console.error('Sync push products:', error.message);
    }

    const vars = await db.variants.toArray();
    if (vars.length > 0) {
      const { error } = await supabase.from('variants').upsert(vars.map(v => ({
        id: v.id, product_id: v.productId, name: v.name, sku: v.sku,
        attributes: v.attributes, price: v.price, stock: v.stock,
        low_stock_threshold: v.lowStockThreshold,
      })));
      if (error) console.error('Sync push variants:', error.message);
    }

    const orders = await db.orders.toArray();
    if (orders.length > 0) {
      const { error } = await supabase.from('orders').upsert(orders.map(o => ({
        id: o.id, business_id: o.businessId, order_number: o.orderNumber,
        customer_name: o.customerName, customer_phone: o.customerPhone,
        status: o.status, total: o.total, notes: o.notes,
        created_at: o.createdAt, updated_at: o.updatedAt,
      })));
      if (error) console.error('Sync push orders:', error.message);
    }

    const users = await db.users.toArray();
    if (users.length > 0) {
      const { error } = await supabase.from('users').upsert(users.map(u => ({
        id: u.id, username: u.username, display_name: u.displayName,
        role: u.role, password_hash: u.passwordHash,
        created_at: u.createdAt, last_login_at: u.lastLoginAt,
      })));
      if (error) console.error('Sync push users:', error.message);
    }

    const logs = await db.inventoryLog.toArray();
    if (logs.length > 0) {
      const { error } = await supabase.from('inventory_log').upsert(logs.map(l => ({
        id: l.id, business_id: l.businessId, product_id: l.productId,
        variant_id: l.variantId, type: l.type, quantity: l.quantity,
        reason: l.reason, note: l.note, timestamp: l.timestamp,
      })));
      if (error) console.error('Sync push inventory_log:', error.message);
    }

    const perms = await db.rolePermissions.toArray();
    if (perms.length > 0) {
      const { error } = await supabase.from('role_permissions').upsert(perms.map(p => ({
        id: p.id, role: p.role, permissions: p.permissions,
      })));
      if (error) console.error('Sync push role_permissions:', error.message);
    }

    const warehouses = await db.warehouses.toArray();
    if (warehouses.length > 0) {
      const { error } = await supabase.from('warehouses').upsert(warehouses.map(w => ({
        id: w.id, business_id: w.businessId, name: w.name,
        location: w.location, is_default: w.isDefault,
      })));
      if (error) console.error('Sync push warehouses:', error.message);
    }

    const stock = await db.warehouseStock.toArray();
    if (stock.length > 0) {
      const { error } = await supabase.from('warehouse_stock').upsert(stock.map(s => ({
        id: s.id, warehouse_id: s.warehouseId, variant_id: s.variantId, quantity: s.quantity,
      })));
      if (error) console.error('Sync push warehouse_stock:', error.message);
    }

    const transfers = await db.stockTransfers.toArray();
    if (transfers.length > 0) {
      await supabase.from('stock_transfers').upsert(transfers.map(t => ({
        id: t.id, from_warehouse_id: t.fromWarehouseId, to_warehouse_id: t.toWarehouseId,
        variant_id: t.variantId, quantity: t.quantity, status: t.status,
        notes: t.notes, created_at: t.createdAt,
      })));
    }

    console.log('Sync: Push complete.');
  } catch (err) {
    console.error('Sync push error:', err);
    throw err;
  }
}

export async function pullSupabaseToLocal() {
  if (!isSupabaseConfigured) {
    console.warn('Sync: Skipping pull — Supabase not configured.');
    return;
  }
  console.log('Sync: Pulling data from Supabase...');

  try {
    const tableMap: Record<string, string> = {
      businesses: 'businesses',
      categories: 'categories',
      products: 'products',
      variants: 'variants',
      orders: 'orders',
      users: 'users',
      inventory_log: 'inventoryLog',
      role_permissions: 'rolePermissions',
      warehouses: 'warehouses',
      warehouse_stock: 'warehouseStock',
      stock_transfers: 'stockTransfers',
    };

    for (const [tableName, dbTable] of Object.entries(tableMap)) {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.warn(`Sync pull ${tableName}:`, error.message);
        continue;
      }
      if (data && data.length > 0) {
        if (tableName === 'users') {
          await pullUsersToLocal(data as SupabaseUserRow[]);
          continue;
        }
        const store = (db as any)[dbTable];
        if (store) {
          await store.clear();
          await store.bulkPut(data);
        }
      }
    }
    console.log('Sync: Pull complete.');
  } catch (err) {
    console.error('Sync pull error:', err);
    throw err;
  }
}
