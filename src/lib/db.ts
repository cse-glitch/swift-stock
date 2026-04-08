import Dexie, { type Table } from 'dexie';

export interface InventoryItem {
  id?: number;
  sku: string;
  productName: string;
  weight: number;       // stored in kg
  weightUnit: 'kg' | 'lb';
  length: number;       // stored in cm
  width: number;        // stored in cm
  height: number;       // stored in cm
  sizeUnit: 'cm' | 'in';
  quantity: number;
  lastUpdated: Date;
}

export interface RemovalRecord {
  id?: number;
  sku: string;
  productName: string;
  quantityRemoved: number;
  reason: 'Sold' | 'Damaged' | 'Expired' | 'Returned' | 'Other';
  note?: string;
  timestamp: Date;
}

class InventoryDB extends Dexie {
  items!: Table<InventoryItem>;
  removals!: Table<RemovalRecord>;

  constructor() {
    super('InventoryManager');
    this.version(1).stores({
      items: '++id, &sku, productName, weight, lastUpdated',
      removals: '++id, sku, reason, timestamp',
    });
  }
}

export const db = new InventoryDB();
