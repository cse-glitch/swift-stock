import { db } from './db';
import { supabase } from './supabase';

/**
 * Sync Engine for SAMAN Inventory
 * This utility handles pushing local Dexie data to Supabase 
 * and pulling remote data to local storage.
 */

export async function pushLocalToSupabase() {
  console.log('Sync: Pushing local data to Supabase...');

  // 1. Sync Businesses
  const localBusinesses = await db.businesses.toArray();
  for (const biz of localBusinesses) {
    const { error } = await supabase
      .from('businesses')
      .upsert({
        id: biz.id,
        name: biz.name,
        slug: biz.slug,
        type: biz.type,
        color: biz.color,
        icon: biz.icon,
        is_active: biz.isActive,
        created_at: biz.createdAt
      });
    if (error) console.error('Sync Error (businesses):', error);
  }

  // 2. Sync Products
  const localProducts = await db.products.toArray();
  for (const p of localProducts) {
    const { error } = await supabase
      .from('products')
      .upsert({
        id: p.id,
        business_id: p.businessId,
        category_id: p.categoryId,
        name: p.name,
        sku: p.sku,
        type: p.type,
        description: p.description,
        base_price: p.basePrice,
        currency: p.currency,
        tags: p.tags,
        attributes: p.attributes,
        status: p.status,
        is_seasonal: p.isSeasonal,
        season_start: p.seasonStart,
        season_end: p.seasonEnd,
        expiry_tracking: p.expiryTracking,
        created_at: p.createdAt,
        updated_at: p.updatedAt
      });
    if (error) console.error('Sync Error (products):', error);
  }

  // 3. Sync Variants
  const localVariants = await db.variants.toArray();
  for (const v of localVariants) {
    const { error } = await supabase
      .from('variants')
      .upsert({
        id: v.id,
        product_id: v.productId,
        name: v.name,
        sku: v.sku,
        attributes: v.attributes,
        price: v.price,
        stock: v.stock,
        low_stock_threshold: v.lowStockThreshold,
        weight: v.weight,
        dimensions: v.dimensions
      });
    if (error) console.error('Sync Error (variants):', error);
  }

  // 4. Sync Orders
  const localOrders = await db.orders.toArray();
  for (const o of localOrders) {
    const { error } = await supabase
      .from('orders')
      .upsert({
        id: o.id,
        business_id: o.businessId,
        product_id: o.productId,
        variant_id: o.variantId,
        customer_name: o.customerName,
        customer_number: o.customerNumber,
        price: o.price,
        location: o.location,
        status: o.status,
        note: o.note,
        timestamp: o.timestamp
      });
    if (error) console.error('Sync Error (orders):', error);
  }

  console.log('Sync: Push complete.');
}

export async function pullSupabaseToLocal() {
  console.log('Sync: Pulling data from Supabase...');

  // Pull Businesses
  const { data: remoteBiz } = await supabase.from('businesses').select('*');
  if (remoteBiz) {
    await db.businesses.bulkPut(remoteBiz.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      type: b.type,
      color: b.color,
      icon: b.icon,
      isActive: b.is_active,
      createdAt: new Date(b.created_at)
    })));
  }

  // Pull Products
  const { data: remoteProducts } = await supabase.from('products').select('*');
  if (remoteProducts) {
    await db.products.bulkPut(remoteProducts.map(p => ({
      id: p.id,
      businessId: p.business_id,
      categoryId: p.category_id,
      name: p.name,
      sku: p.sku,
      type: p.type,
      description: p.description,
      basePrice: p.base_price,
      currency: p.currency,
      tags: p.tags,
      attributes: p.attributes,
      status: p.status,
      isSeasonal: p.is_seasonal,
      seasonStart: p.season_start,
      seasonEnd: p.season_end,
      expiryTracking: p.expiry_tracking,
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at)
    })));
  }

  // Pull Variants
  const { data: remoteVariants } = await supabase.from('variants').select('*');
  if (remoteVariants) {
    await db.variants.bulkPut(remoteVariants.map(v => ({
      id: v.id,
      productId: v.product_id,
      name: v.name,
      sku: v.sku,
      attributes: v.attributes,
      price: v.price,
      stock: v.stock,
      lowStockThreshold: v.low_stock_threshold,
      weight: v.weight,
      dimensions: v.dimensions
    })));
  }

  console.log('Sync: Pull complete.');
}
