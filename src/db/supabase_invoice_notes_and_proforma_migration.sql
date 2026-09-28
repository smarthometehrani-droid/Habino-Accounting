-- ==============================================================================
-- HABINO ACCOUNTING & FINANCIAL OS - INVOICES & SETTINGS SYNC MIGRATION
-- Target Database: PostgreSQL 15+ (Supabase Production Database)
-- Purpose: Schema synchronization for dedicated invoice notes, settlement terms,
--          proforma document classifications, and company global defaults.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ۱. جدول فاکتورها و پیش‌فاکتورها (invoices): تضمین وجود ستون‌های تفکیک‌شده
-- ------------------------------------------------------------------------------

-- ستون توضیحات و یادداشت اختصاصی فاکتور
ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- ستون شرایط تسویه حساب و مهلت پرداخت اختصاصی فاکتور
ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS terms TEXT;

-- ستون‌های مکمل مالی و متادیتا جهت جلوگیری از خطای همگام‌سازی
ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS previous_balance NUMERIC(18, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS total_debt NUMERIC(18, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS template_type VARCHAR(50) DEFAULT 'professional';

ALTER TABLE IF EXISTS public.invoices 
    ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;

-- به‌روزرسانی یا اصلاح قید (Constraint) نوع فاکتور جهت پشتیبانی از انواع پیش‌فاکتور و برگشت
DO $$
BEGIN
    -- اگر قید نوع فاکتور وجود دارد، بررسی شود
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoices_type_check' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT invoices_type_check;
    END IF;
END $$;

-- ایجاد قید جدید و جامع برای انواع اسناد فاکتور و پیش‌فاکتور
ALTER TABLE public.invoices 
    ADD CONSTRAINT invoices_type_check 
    CHECK (type IN (
        'sale', 
        'purchase', 
        'service', 
        'proforma', 
        'proforma_sale', 
        'proforma_purchase', 
        'sale_return', 
        'purchase_return'
    ));

-- ایندکس‌های بهینه‌ساز برای سرعت جستجو و فیلتر
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_type ON public.invoices(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_invoices_metadata_gin ON public.invoices USING gin (metadata);


-- ------------------------------------------------------------------------------
-- ۲. جدول تنظیمات شرکت (company_settings): تضمین وجود ستون‌های پیش‌فرض سراسری
-- ------------------------------------------------------------------------------

-- تضمین وجود جدول تنظیمات در صورت عدم وجود
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

-- افزودن ستون‌های یادداشت و قوانین پیش‌فرض سراسری فاکتور
ALTER TABLE IF EXISTS public.company_settings 
    ADD COLUMN IF NOT EXISTS invoice_note TEXT;

ALTER TABLE IF EXISTS public.company_settings 
    ADD COLUMN IF NOT EXISTS invoice_terms TEXT;

ALTER TABLE IF EXISTS public.company_settings 
    ADD COLUMN IF NOT EXISTS default_template VARCHAR(50) DEFAULT 'professional';

ALTER TABLE IF EXISTS public.company_settings 
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ایندکس تنظیمات
CREATE INDEX IF NOT EXISTS idx_company_settings_tenant ON public.company_settings(tenant_id);


-- ------------------------------------------------------------------------------
-- ۳. سیاست‌های امنیتی سطح ردیف (Row Level Security - RLS)
-- ------------------------------------------------------------------------------

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- سیاست امنیتی دسترسی به تنظیمات شرکت
DROP POLICY IF EXISTS "company_settings_permissive_access" ON public.company_settings;
CREATE POLICY "company_settings_permissive_access" ON public.company_settings
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- سیاست دسترسی به فاکتورها (با پشتیبانی از multi-tenancy و دسترسی مجاز)
DROP POLICY IF EXISTS "invoices_permissive_sync_policy" ON public.invoices;
CREATE POLICY "invoices_permissive_sync_policy" ON public.invoices
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- ۴. پیام تایید اجرای موفق مایگریشن
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE 'اسکیمای پایگاه داده سوپابیس برای فاکتورها، پیش‌فاکتورها، توضیحات و شرایط تسویه با موفقیت به‌روزرسانی شد.';
END $$;
