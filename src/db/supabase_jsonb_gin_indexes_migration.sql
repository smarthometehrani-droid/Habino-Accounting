-- ==============================================================================
-- HABINO FINANCIAL OS - JSONB GIN INDEX OPTIMIZATION MIGRATION
-- Target: PostgreSQL 15+ (Supabase Multi-Tenant Production Architecture)
-- Objective: Maximize query throughput & eliminate sequential scans on guild metadata
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 2. GIN INDEXES ON CORE TENANT TABLES (JSONB Extensibility)
-- These allow extremely fast key-value containment operators (@>, ?, ?|, ?&)
CREATE INDEX IF NOT EXISTS idx_invoices_metadata_gin 
ON public.invoices USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_clients_metadata_gin 
ON public.clients USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_inventory_items_metadata_gin 
ON public.inventory_items USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_transactions_metadata_gin 
ON public.transactions USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_accounting_entries_metadata_gin 
ON public.accounting_entries USING gin (metadata);

-- 3. COMPOSITE MULTI-TENANT GIN WITH JSONB_PATH_OPS
-- Reduces index footprint by ~60% and optimizes tenant-isolated JSON containment queries
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_meta_path_gin 
ON public.invoices USING gin (tenant_id, metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_meta_path_gin 
ON public.clients USING gin (tenant_id, metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_meta_path_gin 
ON public.inventory_items USING gin (tenant_id, metadata jsonb_path_ops);

-- 4. FUNCTIONAL EXPRESSION BTREE INDEXES FOR HIGH-FREQUENCY GUILD FIELDS
-- Technical Services Guild (شماره شاسی خودرو، شماره موتور، کیلومتر کارکرد)
CREATE INDEX IF NOT EXISTS idx_invoices_meta_chassis 
ON public.invoices USING btree ((metadata->>'vehicleChassis')) 
WHERE (metadata->>'vehicleChassis') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_meta_engine_number 
ON public.invoices USING btree ((metadata->>'engineNumber')) 
WHERE (metadata->>'engineNumber') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_meta_warranty_serial 
ON public.invoices USING btree ((metadata->>'warrantySerial')) 
WHERE (metadata->>'warrantySerial') IS NOT NULL;

-- Retail & Barcode Guild (بارکد کالا، شماره بچ تولید، تاریخ انقضا)
CREATE INDEX IF NOT EXISTS idx_inventory_meta_barcode 
ON public.inventory_items USING btree ((metadata->>'barcode')) 
WHERE (metadata->>'barcode') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_meta_batch_lot 
ON public.inventory_items USING btree ((metadata->>'batchLot')) 
WHERE (metadata->>'batchLot') IS NOT NULL;

-- Gold & Jewelry Guild (وزن طلا، عیار، کد استاندارد اتحادیه)
CREATE INDEX IF NOT EXISTS idx_inventory_meta_gold_weight 
ON public.inventory_items USING btree (((metadata->>'goldWeight')::numeric)) 
WHERE (metadata->>'goldWeight') IS NOT NULL;

-- Identity & Compliance (کد ملی، شناسه صیادی، برچسب صنف مستأجر)
CREATE INDEX IF NOT EXISTS idx_clients_meta_national_id 
ON public.clients USING btree ((metadata->>'nationalId')) 
WHERE (metadata->>'nationalId') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_meta_guild_type 
ON public.invoices USING btree ((metadata->>'guildType')) 
WHERE (metadata->>'guildType') IS NOT NULL;

-- 5. VERIFICATION & QUERY BENCHMARK QUERY
-- Test execution plan ensuring bitmap index scan is selected:
-- EXPLAIN ANALYZE SELECT * FROM invoices WHERE metadata @> '{"guildType": "service_technical"}';
-- EXPLAIN ANALYZE SELECT * FROM inventory_items WHERE metadata->>'barcode' = '6260123456789';
