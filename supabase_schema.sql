-- Supabase Schema for SAMAN Inventory / Swift Stock

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL
);

-- 3. Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  tags JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  is_seasonal BOOLEAN DEFAULT false,
  season_start TIMESTAMPTZ,
  season_end TIMESTAMPTZ,
  expiry_tracking BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Variants
CREATE TABLE IF NOT EXISTS public.variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  attributes JSONB DEFAULT '{}'::jsonb,
  price NUMERIC(10, 2),
  stock NUMERIC DEFAULT 0,
  low_stock_threshold NUMERIC DEFAULT 10,
  weight NUMERIC,
  dimensions JSONB
);

-- 5. Inventory Logs
CREATE TABLE IF NOT EXISTS public.inventory_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.variants(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'add', 'remove', 'adjust'
  quantity NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Property Listings
CREATE TABLE IF NOT EXISTS public.property_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL, -- 'sale', 'rent'
  location TEXT NOT NULL,
  area NUMERIC,
  bedrooms INTEGER,
  bathrooms INTEGER,
  availability TEXT NOT NULL
);

-- 7. Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  duration TEXT,
  capacity INTEGER,
  current_bookings INTEGER DEFAULT 0,
  available_days JSONB DEFAULT '[]'::jsonb
);

-- 8. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.variants(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_number TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT, -- UUIDs or numbers as string
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Role Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT UNIQUE NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Optional: Initial Role Seeds
INSERT INTO public.role_permissions (id, role, permissions) VALUES 
  (uuid_generate_v4(), 'admin', '["products.create", "products.edit", "products.delete", "orders.create", "orders.edit", "orders.delete", "inventory.add", "inventory.remove", "businesses.manage", "users.manage", "settings.manage", "analytics.view", "export.data"]'),
  (uuid_generate_v4(), 'manager', '["products.create", "products.edit", "orders.create", "orders.edit", "inventory.add", "inventory.remove", "analytics.view", "export.data"]'),
  (uuid_generate_v4(), 'staff', '["products.create", "orders.create", "inventory.add"]')
ON CONFLICT (role) DO NOTHING;
