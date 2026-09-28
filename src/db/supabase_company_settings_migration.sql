-- ==============================================================================
-- HABINO ACCOUNTING & FINANCIAL OS - COMPANY SETTINGS MIGRATION SCRIPT
-- Target Database: PostgreSQL 15+ (Supabase Production Engine)
-- Purpose: Provision & Normalize company_settings table for full persistence & RLS
-- ==============================================================================

-- 1. Create company_settings table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL UNIQUE DEFAULT 'tenant-main',
    name VARCHAR(255) NOT NULL DEFAULT 'شرکت هابینو',
    legal_name VARCHAR(255),
    economic_code VARCHAR(50),
    national_id VARCHAR(50),
    registration_number VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    postal_code VARCHAR(50),
    website VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'IRT',
    tax_rate NUMERIC(5, 2) DEFAULT 10.00,
    default_tax_rate NUMERIC(5, 2) DEFAULT 10.00,
    invoice_note TEXT,
    invoice_terms TEXT,
    default_template VARCHAR(50) DEFAULT 'professional',
    template VARCHAR(50) DEFAULT 'professional',
    logo_url TEXT,
    stamp_url TEXT,
    signature_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Safely add any missing columns in case table was created with an older schema
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS economic_code VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS postal_code VARCHAR(50);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IRT';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 10.00;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5, 2) DEFAULT 10.00;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS invoice_note TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS invoice_terms TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS default_template VARCHAR(50) DEFAULT 'professional';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS template VARCHAR(50) DEFAULT 'professional';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS stamp_url TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure index on tenant_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_company_settings_tenant ON public.company_settings(tenant_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting legacy policies
DROP POLICY IF EXISTS "company_settings_tenant_all" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_public_access" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_select_policy" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_upsert_policy" ON public.company_settings;

-- 5. Create Permissive Multi-Tenant & Anonymous Access Policy
-- Allows app users and anonymous API clients to view and update their business profile
CREATE POLICY "company_settings_permissive_access" ON public.company_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. Insert Default Company Profile if table is completely empty
INSERT INTO public.company_settings (
    tenant_id, 
    name, 
    legal_name, 
    phone, 
    address, 
    currency, 
    tax_rate, 
    default_tax_rate, 
    invoice_note, 
    invoice_terms, 
    metadata
) VALUES (
    'tenant-main', 
    'شرکت خدمات فنی و مهندسی هابینو',
    'شرکت هابینو با مسئولیت محدود',
    '۰۲۱-۸۸۸۸۸۸۸۸',
    'تهران، خیابان ولیعصر، برج فناوری',
    'IRT',
    10.00,
    10.00,
    'از حسن اعتماد و همکاری شما با مجموعه هابینو صمیمانه سپاسگزاریم.',
    'مهلت تسویه فاکتور حداکثر تا ۷ روز کاری پس از تاریخ صدور می‌باشد.',
    '{"guild": "services", "defaultInvoiceTemplate": "professional", "defaultInvoiceDesign": {"showTaxColumn": true, "showDiscountColumn": true, "fontFamily": "vazir"}}'::jsonb
)
ON CONFLICT (tenant_id) DO UPDATE 
SET updated_at = NOW();
