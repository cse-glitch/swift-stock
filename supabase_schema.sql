-- ============================================================
-- Supabase Schema for SAMAN Inventory / Swift Stock
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- BUSINESSES
create table if not exists public.businesses (
  id          bigint primary key,
  name        text not null,
  slug        text unique not null,
  currency    text,
  address     text,
  phone       text,
  email       text,
  created_at  timestamptz
);

-- CATEGORIES
create table if not exists public.categories (
  id          bigint primary key,
  business_id bigint references public.businesses(id) on delete cascade,
  name        text not null,
  description text
);

-- PRODUCTS
create table if not exists public.products (
  id               bigint primary key,
  business_id      bigint references public.businesses(id) on delete cascade,
  category_id      bigint references public.categories(id) on delete set null,
  name             text not null,
  sku              text not null,
  description      text,
  type             text,
  base_price       numeric,
  currency         text,
  tags             text[],
  status           text,
  attributes       jsonb,
  is_seasonal      boolean default false,
  expiry_tracking  boolean default false,
  created_at       timestamptz,
  updated_at       timestamptz
);

-- VARIANTS
create table if not exists public.variants (
  id                  bigint primary key,
  product_id          bigint references public.products(id) on delete cascade,
  name                text not null,
  sku                 text not null,
  attributes          jsonb,
  price               numeric,
  stock               integer default 0,
  low_stock_threshold integer default 5
);

-- ORDERS
create table if not exists public.orders (
  id             text primary key,
  business_id    bigint references public.businesses(id) on delete cascade,
  order_number   text,
  customer_name  text,
  customer_phone text,
  status         text,
  total          numeric,
  notes          text,
  created_at     timestamptz,
  updated_at     timestamptz
);

-- USERS
create table if not exists public.users (
  id             text primary key,
  username       text unique not null,
  display_name   text,
  role           text,
  password_hash  text,
  created_at     timestamptz,
  last_login_at  timestamptz
);

-- INVENTORY LOG
create table if not exists public.inventory_log (
  id          text primary key,
  business_id bigint,
  product_id  bigint,
  variant_id  bigint,
  type        text,
  quantity    integer,
  reason      text,
  note        text,
  timestamp   timestamptz
);

-- ROLE PERMISSIONS
create table if not exists public.role_permissions (
  id          bigint primary key generated always as identity,
  role        text unique not null,
  permissions text[]
);

-- WAREHOUSES
create table if not exists public.warehouses (
  id          bigint primary key,
  business_id bigint references public.businesses(id) on delete cascade,
  name        text not null,
  location    text,
  is_default  boolean default false
);

-- WAREHOUSE STOCK
create table if not exists public.warehouse_stock (
  id           bigint primary key,
  warehouse_id bigint references public.warehouses(id) on delete cascade,
  variant_id   bigint references public.variants(id) on delete cascade,
  quantity     integer default 0
);

-- STOCK TRANSFERS
create table if not exists public.stock_transfers (
  id                text primary key,
  from_warehouse_id bigint,
  to_warehouse_id   bigint,
  variant_id        bigint,
  quantity          integer,
  status            text,
  notes             text,
  created_at        timestamptz
);

-- ============================================================
-- Enable Row Level Security (open access — adjust as needed)
-- ============================================================
alter table public.businesses       enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.variants         enable row level security;
alter table public.orders           enable row level security;
alter table public.users            enable row level security;
alter table public.inventory_log    enable row level security;
alter table public.role_permissions enable row level security;
alter table public.warehouses       enable row level security;
alter table public.warehouse_stock  enable row level security;
alter table public.stock_transfers  enable row level security;

-- ============================================================
-- Policies: allow full access via anon/service key
-- ============================================================
do $$
declare
  tbl text;
  pol_name text;
begin
  foreach tbl in array array[
    'businesses','categories','products','variants','orders',
    'users','inventory_log','role_permissions','warehouses',
    'warehouse_stock','stock_transfers'
  ] loop
    pol_name := 'allow_all_' || tbl;
    execute format('
      drop policy if exists %I on public.%I;
      create policy %I on public.%I
      for all
      to anon, authenticated
      using (true)
      with check (true);
    ', pol_name, tbl, pol_name, tbl);
  end loop;
end $$;
