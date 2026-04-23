

# Phase 4: Automation, Migration, Polish, and Bulk Import

This phase covers everything you selected plus addresses the stock management confusion with a CSV/Excel bulk upload system.

---

## Understanding the Current Stock Flow

The Add/Remove Stock pages work like this: you must first create a **Product** (in the Products page) with at least one **Variant** -- the variant is what holds the stock count. Then on Add Stock, you search for that product's variant and increment its quantity. This is by design (products need SKUs, categories, pricing before stock makes sense), but currently there is no way to bulk-create products from a file.

The bulk import feature below solves this by letting you upload a CSV/Excel file that creates products, variants, and sets initial stock in one step.

---

## What Will Be Built

### 1. CSV/Excel Bulk Import for Products and Stock

**New component on the Utilities page** that accepts a CSV or Excel (.xlsx) file to bulk-create products with variants and initial stock.

- **Template download**: A "Download Template" button generates a sample CSV with columns: `Business (slug)`, `Category`, `Product Name`, `SKU`, `Variant Name`, `Variant SKU`, `Price`, `Stock`, `Low Stock Threshold`, plus dynamic attribute columns.
- **File upload**: Accepts `.csv` or `.xlsx` files. Excel files are parsed using the SheetJS (xlsx) library already available in the browser.
- **Validation pipeline**: Runs SKU format checks, duplicate detection (in-file and against DB), required field validation, and business slug matching.
- **Preview table**: Shows parsed rows with error highlights before committing.
- **Error report**: Downloadable CSV of all rows that failed validation.
- **Commit**: Creates products, variants, and inventory log entries in a single Dexie transaction.

### 2. History Page Migration

Rewrite `History.tsx` to use the new `inventoryLog` table instead of the legacy `removals` table.

- Shows **both** add and remove events (not just removals).
- Add a business filter dropdown and action type filter (Add / Remove / Adjust).
- Display product name and variant name by joining with products/variants tables.
- Reason codes match the new schema: Sold, Damaged, Expired, Returned, Restock, Adjustment, Other.
- CSV export updated to include business name, action type, and variant details.

### 3. Settings Page Migration

Update `Settings.tsx` to work with the new multi-business schema.

- **Database reset**: Clear all new tables (products, variants, inventoryLog, categories, propertyListings, services) instead of only legacy items/removals.
- **Per-table selective reset**: Option to clear specific tables (e.g., just inventory logs, just products).
- **Re-seed businesses**: Button to re-seed the 7 default businesses if they were deleted.
- Keep existing unit defaults and heavy threshold settings.

### 4. Utilities Page Upgrade

Rewrite backup/export to cover the full new schema.

- **JSON backup**: Export all tables (businesses, categories, products, variants, inventoryLog, propertyListings, services) in one JSON file.
- **JSON restore**: Import a full backup, with confirmation dialog showing record counts before overwriting.
- **CSV export**: Export products with their variants and stock levels (not legacy items).
- **Label printing**: Updated to work with products/variants instead of legacy items.

### 5. Low Stock Alerts

- Add a **notification bell** in the sidebar header that shows a count badge of low-stock and out-of-stock variants.
- Clicking it opens a slide-out panel listing all affected items grouped by business.
- Each item shows product name, variant, current stock, and threshold.
- Quick action button to navigate to Add Stock with that business pre-selected.

### 6. Logo and UI Polish

- Add the uploaded `Saman.ai` logo to the sidebar header area.
- Apply subtle background gradients to dashboard bento cards (the visual enhancement from earlier).
- Consistent accent colors on business-specific cards using each business's HSL color.

---

## File Changes

| File | Action | Purpose |
|---|---|---|
| `src/pages/Utilities.tsx` | Rewrite | Full-schema backup/export, bulk CSV/Excel import with template |
| `src/pages/History.tsx` | Rewrite | Use inventoryLog table, multi-business filtering, add/remove events |
| `src/pages/Settings.tsx` | Rewrite | Multi-table reset, re-seed businesses, selective clear |
| `src/components/LowStockAlert.tsx` | Create | Notification bell with low-stock panel |
| `src/components/AppSidebar.tsx` | Edit | Add logo image, integrate LowStockAlert |
| `src/pages/Index.tsx` | Edit | Add gradient backgrounds to summary cards |
| `public/saman-logo.*` | Create | Copy uploaded logo to public assets |
| `package.json` | Edit | Add `xlsx` (SheetJS) package for Excel parsing |

---

## Technical Details

**Bulk import CSV columns:**
```text
business_slug, category, product_name, product_sku, variant_name, variant_sku, price, stock, low_stock_threshold, [dynamic attributes...]
```

**Import logic:**
1. Parse file (PapaParse for CSV, SheetJS for .xlsx)
2. Group rows by `product_sku` -- rows sharing a product SKU become variants of the same product
3. Validate all SKUs (format + uniqueness)
4. Show preview with error highlighting
5. On confirm: create products, then variants with initial stock, then log entries -- all in one `db.transaction("rw", ...)`

**Low stock query:**
```typescript
const lowStock = variants.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
const outOfStock = variants.filter(v => v.stock === 0);
```

