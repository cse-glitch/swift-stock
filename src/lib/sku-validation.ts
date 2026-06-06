import { db } from './db';

const SKU_REGEX = /^[A-Z0-9][A-Z0-9-]{0,28}[A-Z0-9]$/;
const SKU_MIN = 2;
const SKU_MAX = 30;

export function normalizeSku(raw: string): string {
  return raw.trim().toUpperCase();
}

export function validateSkuFormat(sku: string): string | null {
  if (!sku) return 'SKU is required';
  if (sku.length < SKU_MIN) return `SKU must be at least ${SKU_MIN} characters`;
  if (sku.length > SKU_MAX) return `SKU must be at most ${SKU_MAX} characters`;
  if (!SKU_REGEX.test(sku)) return 'SKU may only contain A-Z, 0-9, and hyphens (cannot start/end with hyphen)';
  return null;
}

export interface SkuConflict {
  sku: string;
  existingName: string;
  existingType: 'product' | 'variant';
}

/**
 * Checks a product SKU and an array of variant SKUs against the database
 * for the given business, excluding the current product (if editing).
 * Returns { productError, variantErrors, conflicts }.
 */
export async function checkSkuConflicts(
  businessId: string,
  productSku: string,
  variantSkus: string[],
  excludeProductId?: string,
): Promise<{
  productError: string | null;
  variantErrors: Record<number, string>;
  conflicts: SkuConflict[];
}> {
  const conflicts: SkuConflict[] = [];
  let productError: string | null = null;
  const variantErrors: Record<number, string> = {};

  const bizProducts = await db.products.where('businessId').equals(businessId).toArray();
  const otherProducts = bizProducts.filter(p => p.id !== excludeProductId);
  const productSkuMap = new Map(otherProducts.map(p => [p.sku, p.name]));

  const otherProductIds = otherProducts.map(p => p.id!);
  const existingVariants = otherProductIds.length > 0
    ? await db.variants.where('productId').anyOf(otherProductIds).toArray()
    : [];
  const variantSkuMap = new Map(existingVariants.map(v => [v.sku, v.name || `Variant #${v.id}`]));

  const allExistingSkus = new Map<string, { name: string; type: 'product' | 'variant' }>();
  for (const [sku, name] of productSkuMap) allExistingSkus.set(sku, { name, type: 'product' });
  for (const [sku, name] of variantSkuMap) allExistingSkus.set(sku, { name, type: 'variant' });

  const existing = allExistingSkus.get(productSku);
  if (existing) {
    productError = `Conflicts with existing ${existing.type}: "${existing.name}"`;
    conflicts.push({ sku: productSku, existingName: existing.name, existingType: existing.type });
  }

  const seenInForm = new Map<string, number>(); // sku → first index
  for (let i = 0; i < variantSkus.length; i++) {
    const vs = variantSkus[i];
    if (!vs) continue;

    if (seenInForm.has(vs)) {
      variantErrors[i] = `Duplicate of variant ${seenInForm.get(vs)! + 1}`;
      continue;
    }
    seenInForm.set(vs, i);

    if (vs === productSku) {
      variantErrors[i] = 'Same as product SKU';
      continue;
    }

    const ex = allExistingSkus.get(vs);
    if (ex) {
      variantErrors[i] = `Conflicts with existing ${ex.type}: "${ex.name}"`;
      conflicts.push({ sku: vs, existingName: ex.name, existingType: ex.type });
    }
  }

  return { productError, variantErrors, conflicts };
}

/**
 * Validate SKUs in a CSV import dataset against an entire business.
 * Returns rows with errors and rows that are clean.
 */
export async function validateCsvSkus(
  rows: { sku: string; name: string; [key: string]: unknown }[],
  businessId: string,
): Promise<{
  validRows: typeof rows;
  errorRows: { row: number; sku: string; name: string; error: string }[];
}> {
  const bizProducts = await db.products.where('businessId').equals(businessId).toArray();
  const existingProductSkus = new Set(bizProducts.map(p => p.sku));

  const allVariants = bizProducts.length > 0
    ? await db.variants.where('productId').anyOf(bizProducts.map(p => p.id!)).toArray()
    : [];
  const existingVariantSkus = new Set(allVariants.map(v => v.sku));

  const validRows: typeof rows = [];
  const errorRows: { row: number; sku: string; name: string; error: string }[] = [];
  const seenInFile = new Map<string, number>();

  rows.forEach((row, i) => {
    const normalized = normalizeSku(row.sku);
    const formatErr = validateSkuFormat(normalized);

    if (formatErr) {
      errorRows.push({ row: i + 2, sku: row.sku, name: row.name, error: formatErr });
      return;
    }

    if (seenInFile.has(normalized)) {
      errorRows.push({ row: i + 2, sku: row.sku, name: row.name, error: `Duplicate of row ${seenInFile.get(normalized)! + 2}` });
      return;
    }
    seenInFile.set(normalized, i);

    if (existingProductSkus.has(normalized)) {
      errorRows.push({ row: i + 2, sku: row.sku, name: row.name, error: 'Product SKU already exists in this business' });
      return;
    }

    if (existingVariantSkus.has(normalized)) {
      errorRows.push({ row: i + 2, sku: row.sku, name: row.name, error: 'Variant SKU already exists in this business' });
      return;
    }

    validRows.push({ ...row, sku: normalized });
  });

  return { validRows, errorRows };
}
