import { db, type BusinessType, type ProductType, type ProductStatus, type InventoryAction, type UserRole, type StockTransfer } from './db';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Sync Engine for SAMAN Inventory
 * This utility handles pushing local Dexie data to Supabase 
 * and pulling remote data to local storage.
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
        id: b.id, name: b.name, slug: b.slug, type: b.type,
        color: b.color, icon: b.icon, is_active: b.isActive, created_at: b.createdAt
      })));
      if (error) console.error('Push Error (businesses):', error);
    }

    const cats = await db.categories.toArray();
    if (cats.length > 0) {
      const { error } = await supabase.from('categories').upsert(cats.map(c => ({
        id: c.id, business_id: c.businessId, name: c.name, parent_id: c.parentId
      })));
      if (error) console.error('Push Error (categories):', error);
    }

    const prods = await db.products.toArray();
    if (prods.length > 0) {
      const { error } = await supabase.from('products').upsert(prods.map(p => ({
        id: p.id, business_id: p.businessId, category_id: p.categoryId,
        name: p.name, sku: p.sku, type: p.type, description: p.description,
        base_price: p.basePrice, currency: p.currency, tags: p.tags,
        attributes: p.attributes, status: p.status, is_seasonal: p.isSeasonal,
        season_start: p.seasonStart, season_end: p.seasonEnd,
        expiry_tracking: p.expiryTracking, created_at: p.createdAt, updated_at: p.updatedAt
      })));
      if (error) console.error('Push Error (products):', error);
    }

    const vars = await db.variants.toArray();
    if (vars.length > 0) {
      const { error } = await supabase.from('variants').upsert(vars.map(v => ({
        id: v.id, product_id: v.productId, name: v.name, sku: v.sku,
        attributes: v.attributes, price: v.price, stock: v.stock,
        low_stock_threshold: v.lowStockThreshold, weight: v.weight, dimensions: v.dimensions
      })));
      if (error) console.error('Push Error (variants):', error);
    }

    const orders = await db.orders.toArray();
    if (orders.length > 0) {
      const { error } = await supabase.from('orders').upsert(orders.map(o => ({
        id: o.id, business_id: o.businessId, product_id: o.productId,
        variant_id: o.variantId, customer_name: o.customerName,
        customer_number: o.customerNumber, price: o.price, location: o.location,
        status: o.status, note: o.note, timestamp: o.timestamp
      })));
      if (error) console.error('Push Error (orders):', error);
    }

    const users = await db.users.toArray();
    if (users.length > 0) {
      const { error } = await supabase.from('users').upsert(users.map(u => ({
        id: u.id, username: u.username, password_hash: u.passwordHash,
        display_name: u.displayName, role: u.role, created_at: u.createdAt,
        last_login_at: u.lastLoginAt
      })));
      if (error) console.error('Push Error (users):', error);
    }

    const logs = await db.inventoryLog.toArray();
    if (logs.length > 0) {
      const { error } = await supabase.from('inventory_log').upsert(logs.map(l => ({
        id: l.id, product_id: l.productId, variant_id: l.variantId,
        business_id: l.businessId, type: l.type, quantity: l.quantity,
        reason: l.reason, note: l.note, timestamp: l.timestamp
      })));
      if (error) console.error('Push Error (inventory_log):', error);
    }

    const perms = await db.rolePermissions.toArray();
    if (perms.length > 0) {
      const { error } = await supabase.from('role_permissions').upsert(perms.map(p => ({
        id: p.id, role: p.role, permissions: p.permissions
      })));
      if (error) console.error('Push Error (role_permissions):', error);
    }

    const warehouses = await db.warehouses.toArray();
    if (warehouses.length > 0) {
      const { error } = await supabase.from('warehouses').upsert(warehouses.map(w => ({
        id: w.id, business_id: w.businessId, name: w.name, location: w.location, 
        is_active: w.isActive, is_main: w.isMain, manager_name: w.managerName, 
        manager_phone: w.managerPhone
      })));
      if (error) console.error('Push Error (warehouses):', error);
    }

    const stock = await db.warehouseStock.toArray();
    if (stock.length > 0) {
      const { error } = await supabase.from('warehouse_stock').upsert(stock.map(s => ({
        id: s.id, warehouse_id: s.warehouseId, variant_id: s.variantId, 
        quantity: s.quantity, last_updated: s.lastUpdated
      })));
      if (error) console.error('Push Error (warehouse_stock):', error);
    }

    const transfers = await db.stockTransfers.toArray();
    for (const t of transfers) {
      await supabase.from('stock_transfers').upsert({
        id: t.id,
        business_id: t.businessId,
        source_warehouse_id: t.fromWarehouseId,
        target_warehouse_id: t.toWarehouseId,
        variant_id: t.variantId,
        quantity: t.quantity,
        status: t.status,
        created_at: t.timestamp.toISOString()
      });
    }

    console.log('Sync: Push complete.');
  } catch (err) {
    console.error('Sync: Critical failure in push:', err);
  }
}

export async function pullSupabaseToLocal() {
  if (!isSupabaseConfigured) {
    console.warn('Sync: Skipping pull — Supabase not configured.');
    return;
  }
  console.log('Sync: Pulling data from Supabase...');

  try {
    const pullTable = async <T, U>(
      tableName: string, 
      dbTable: { bulkPut: (items: T[]) => Promise<unknown> }, 
      mapFn: (item: U) => T
    ) => {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.error(`Pull Error (${tableName}):`, error);
        return;
      }
      if (data && data.length > 0) {
        await dbTable.bulkPut(data.map(mapFn));
      }
    };

    await pullTable('businesses', db.businesses, (b: { id: string; name: string; slug: string; type: BusinessType; color: string; icon: string; is_active: boolean; created_at: string }) => ({
      id: b.id, name: b.name, slug: b.slug, type: b.type, color: b.color,
      icon: b.icon, isActive: b.is_active, createdAt: new Date(b.created_at)
    }));

    await pullTable('categories', db.categories, (c: { id: string; business_id: string; name: string; parent_id?: string }) => ({
      id: c.id, businessId: c.business_id, name: c.name, parentId: c.parent_id
    }));

    await pullTable('products', db.products, (p: { id: string; business_id: string; category_id?: string; name: string; sku: string; type: ProductType; description?: string; base_price?: number; currency: string; tags: string[]; attributes: Record<string, string | number | boolean>; status: ProductStatus; is_seasonal: boolean; season_start?: string; season_end?: string; expiry_tracking: boolean; created_at: string; updated_at: string }) => ({
      id: p.id, businessId: p.business_id, categoryId: p.category_id,
      name: p.name, sku: p.sku, type: p.type, description: p.description,
      basePrice: p.base_price, currency: p.currency, tags: p.tags,
      attributes: p.attributes, status: p.status, isSeasonal: p.is_seasonal,
      seasonStart: p.season_start, seasonEnd: p.season_end,
      expiryTracking: p.expiry_tracking, createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at)
    }));

    await pullTable('variants', db.variants, (v: { id: string; product_id: string; name: string; sku: string; attributes: Record<string, string | number>; price?: number; stock: number; low_stock_threshold: number; weight?: number; dimensions?: { l: number; w: number; h: number } }) => ({
      id: v.id, productId: v.product_id, name: v.name, sku: v.sku,
      attributes: v.attributes, price: v.price, stock: v.stock,
      lowStockThreshold: v.low_stock_threshold, weight: v.weight, dimensions: v.dimensions
    }));

    await pullTable('orders', db.orders, (o: { id: string; business_id: string; product_id: string; variant_id?: string; customer_name: string; customer_number: string; price: number; total_price?: number; payment_method?: string; location: string; status: "pending" | "completed" | "cancelled"; note?: string; timestamp: string }) => ({
      id: o.id, businessId: o.business_id, productId: o.product_id, variantId: o.variant_id, 
      customerName: o.customer_name, customerNumber: o.customer_number, 
      price: o.price, totalPrice: o.total_price || o.price, 
      paymentMethod: o.payment_method || 'Cash',
      location: o.location, status: o.status, note: o.note || '', timestamp: new Date(o.timestamp)
    }));

    await pullTable('users', db.users, (u: { id: string; username: string; password_hash: string; display_name: string; role: UserRole; created_at: string; last_login_at?: string; two_factor_enabled?: boolean }) => ({
      id: u.id, username: u.username, passwordHash: u.password_hash, displayName: u.display_name, 
      role: u.role, createdAt: new Date(u.created_at), lastLoginAt: u.last_login_at ? new Date(u.last_login_at) : undefined,
      twoFactorEnabled: u.two_factor_enabled || false
    }));

    await pullTable('inventory_log', db.inventoryLog, (l: { id: string; product_id: string; variant_id?: string; business_id: string; type: InventoryAction; quantity: number; reason: string; note?: string; timestamp: string }) => ({
      id: l.id, productId: l.product_id, variantId: l.variant_id,
      businessId: l.business_id, type: l.type, quantity: l.quantity,
      reason: l.reason, note: l.note, timestamp: new Date(l.timestamp)
    }));

    await pullTable('role_permissions', db.rolePermissions, (p: { id: string; role: UserRole; permissions: string[] }) => ({
      id: p.id, role: p.role, permissions: p.permissions
    }));
    
    await pullTable('warehouses', db.warehouses, (w: { id: string; business_id: string; name: string; location: string; is_active: boolean; is_main: boolean; manager_name?: string; manager_phone?: string }) => ({
      id: w.id, businessId: w.business_id, name: w.name, location: w.location, 
      isActive: w.is_active, isMain: w.is_main, managerName: w.manager_name, 
      managerPhone: w.manager_phone
    }));

    await pullTable('warehouse_stock', db.warehouseStock, (s: { id: string; warehouse_id: string; variant_id: string; quantity: number; last_updated: string }) => ({
      id: s.id, warehouseId: s.warehouse_id, variantId: s.variant_id, 
      quantity: s.quantity, lastUpdated: new Date(s.last_updated)
    }));

    await pullTable('stock_transfers', db.stockTransfers, (t: { id: string; business_id: string; source_warehouse_id: string; target_warehouse_id: string; variant_id: string; quantity: number; status: string; requested_by?: string; created_at: string }) => ({
      id: t.id, businessId: t.business_id, 
      fromWarehouseId: t.source_warehouse_id, 
      toWarehouseId: t.target_warehouse_id, 
      variantId: t.variant_id, 
      quantity: t.quantity, 
      status: t.status as StockTransfer['status'], 
      requestedBy: t.requested_by || 'system',
      timestamp: new Date(t.created_at)
    }));

    console.log('Sync: Pull complete.');
  } catch (err) {
    console.error('Sync: Critical failure in pull:', err);
  }
}
