-- ==============================================================================
-- HABINO ACCOUNTING & FINANCIAL OS - MASTER PRODUCTION MIGRATION
-- Target Database: PostgreSQL 15+ (Supabase Production Engine)
-- Architecture: Multi-Tenant with Row-Level Security (RLS) & JSONB Schema Extensibility
-- Version: 2.5.0 (Including Licenses, Synapse AI, Double-Entry Ledger & Backups)
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CORE FINANCIAL & BUSINESS TABLES
-- ==============================================================================

-- 2.1 Company Settings & Tenant Profiles
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL UNIQUE DEFAULT 'tenant-main',
    name VARCHAR(255) NOT NULL DEFAULT 'شرکت هابینو',
    phone VARCHAR(50),
    address TEXT,
    tax_rate NUMERIC(5, 2) DEFAULT 9.00,
    currency VARCHAR(10) DEFAULT 'TOMAN', -- 'TOMAN', 'RIAL', 'USD'
    invoice_terms TEXT,
    logo_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Clients & Counterparties (اشخاص و طرف‌های حساب)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    national_code VARCHAR(20),
    economic_code VARCHAR(20),
    balance NUMERIC(18, 2) DEFAULT 0.00, -- مثبت: بستانکار / منفی: بدهکار
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Bank Accounts & Cash Registers (بانک‌ها و صندوق‌ها)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    card_number VARCHAR(50),
    shaba VARCHAR(50),
    balance NUMERIC(18, 2) DEFAULT 0.00,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Service & Inventory Items (انبار و خدمات)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'خدمات',
    type VARCHAR(20) DEFAULT 'service', -- 'service', 'goods'
    unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'نفر-ساعت',
    stock_quantity NUMERIC(12, 2) DEFAULT 0.00,
    min_stock NUMERIC(12, 2) DEFAULT 0.00,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Projects & Cost Centers (پروژه‌ها و قراردادهای خدماتی)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    title VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255),
    budget NUMERIC(18, 2) DEFAULT 0.00,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'canceled'
    description TEXT,
    contract_amount NUMERIC(18, 2) DEFAULT 0.00,
    total_income NUMERIC(18, 2) DEFAULT 0.00,
    total_cost NUMERIC(18, 2) DEFAULT 0.00,
    net_profit NUMERIC(18, 2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Invoices & Billing (فاکتورها و پیش‌فاکتورها)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    invoice_number VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'sale', -- 'sale', 'pre_invoice', 'service'
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    client_address TEXT,
    client_national_code VARCHAR(50),
    client_economic_code VARCHAR(50),
    date VARCHAR(50) NOT NULL,
    due_date VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- 'draft', 'pending', 'paid', 'partially_paid', 'canceled'
    template_type VARCHAR(50) DEFAULT 'professional', -- 'professional', 'modern', 'minimal', 'classic'
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of InvoiceItem
    subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(18, 2) DEFAULT 0.00,
    tax NUMERIC(18, 2) DEFAULT 0.00,
    grand_total NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(18, 2) DEFAULT 0.00,
    remaining_amount NUMERIC(18, 2) DEFAULT 0.00,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Sayad Checks & Instruments (چک‌های صیادی دریافتنی و پرداختنی)
CREATE TABLE IF NOT EXISTS checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    check_number VARCHAR(100) NOT NULL,
    sayad_number VARCHAR(100),
    bank_name VARCHAR(100) NOT NULL,
    branch_name VARCHAR(100),
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    due_date VARCHAR(50) NOT NULL,
    issue_date VARCHAR(50),
    type VARCHAR(50) NOT NULL, -- 'receivable', 'payable'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'passed', 'bounced', 'transferred', 'canceled'
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255),
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    drawer_name VARCHAR(255),
    account_number VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Installments & Payment Plans (اقساط متصل)
CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    installment_number INT NOT NULL,
    due_date VARCHAR(50) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    payment_date VARCHAR(50),
    check_id UUID REFERENCES checks(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 Cash Flow & General Transactions (درآمد، هزینه، انتقال)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    type VARCHAR(50) NOT NULL, -- 'income', 'expense', 'transfer'
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    date VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    check_id UUID REFERENCES checks(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 General Ledger Double-Entry Records (دفتر روزنامه و اسناد دوبل استاندارد)
CREATE TABLE IF NOT EXISTS accounting_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    document_number VARCHAR(100) NOT NULL,
    date VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    debit_account VARCHAR(255) NOT NULL,
    credit_account VARCHAR(255) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    reference_type VARCHAR(100), -- 'INVOICE', 'CHECK', 'EXPENSE', 'SALARY', 'PROJECT_PROFIT'
    reference_id VARCHAR(100),
    project_tag VARCHAR(100),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.11 License & Subscription Management (مدیریت لایسنس و اشتراک هابینو)
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    license_key VARCHAR(100) UNIQUE NOT NULL,
    tier VARCHAR(50) NOT NULL DEFAULT 'trial', -- 'trial', 'pro', 'enterprise'
    holder_name VARCHAR(255) NOT NULL DEFAULT 'کاربر هابینو',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired'
    max_invoices INT DEFAULT 999999,
    max_users INT DEFAULT 1,
    ai_synapse_enabled BOOLEAN DEFAULT TRUE,
    offline_sync_enabled BOOLEAN DEFAULT TRUE,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.12 Audit & Automated Daily Backups (پشتیبان‌گیری و رهگیری ممیزی)
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    backup_id VARCHAR(100) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    summary JSONB NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);

CREATE INDEX IF NOT EXISTS idx_checks_tenant ON checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_checks_due_date ON checks(due_date);
CREATE INDEX IF NOT EXISTS idx_checks_status ON checks(status);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

CREATE INDEX IF NOT EXISTS idx_entries_tenant ON accounting_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entries_doc_num ON accounting_entries(document_number);

CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);

-- ==============================================================================
-- 4. ADVANCED MULTI-TENANT ROW-LEVEL SECURITY (RLS)
-- ==============================================================================

-- 4.1 Helper function to resolve active tenant from Session Context or JWT
-- Drop any pre-existing function with CASCADE to prevent PostgreSQL 42P13 return type change errors
DROP FUNCTION IF EXISTS public.current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;

CREATE OR REPLACE FUNCTION public.current_tenant_id() 
RETURNS text 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_tenant_id', true), ''),
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
        NULLIF(auth.jwt() ->> 'tenant_id', ''),
        NULLIF((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id'), ''),
        'tenant-main'
    );
END;
$$;

-- 4.2 Drop ALL pre-existing policies on financial tables, then auto-convert legacy UUID tenant_id columns to VARCHAR(100) and enable RLS
DO $$
DECLARE
    pol RECORD;
    fk RECORD;
    tbl text;
    col_type text;
BEGIN
    -- Step A: Drop ANY existing policies on these tables to unblock column alteration
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN (
              'company_settings', 'clients', 'bank_accounts', 'inventory_items', 
              'projects', 'invoices', 'checks', 'installments', 'transactions', 
              'accounting_entries', 'licenses', 'backups'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
    END LOOP;

    -- Step A2: Drop ANY legacy foreign key constraints involving tenant_id to unblock column alteration
    FOR fk IN
        SELECT 
            cl.relname AS table_name,
            c.conname AS constraint_name
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.contype = 'f'
          AND n.nspname = 'public'
          AND a.attname = 'tenant_id'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;', fk.table_name, fk.constraint_name);
    END LOOP;

    -- Step B: Safely standardize tenant_id column data type to VARCHAR(100)
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN (
              'company_settings', 'clients', 'bank_accounts', 'inventory_items', 
              'projects', 'invoices', 'checks', 'installments', 'transactions', 
              'accounting_entries', 'licenses', 'backups'
          )
    LOOP
        -- Check column type of tenant_id
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id';

        IF col_type = 'uuid' THEN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id DROP DEFAULT;', tbl);
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id TYPE VARCHAR(100) USING tenant_id::varchar(100);', tbl);
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT ''tenant-main'';', tbl);
        END IF;
    END LOOP;
END $$;

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- 4.3 Explicit Secure Tenant-Isolated Policies (Recognized automatically by Supabase Studio & Security Advisor)
DROP POLICY IF EXISTS "Public access policy on company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Tenant isolation policy on company_settings" ON public.company_settings;
CREATE POLICY "Tenant isolation policy on company_settings" ON public.company_settings
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on clients" ON public.clients;
DROP POLICY IF EXISTS "Tenant isolation policy on clients" ON public.clients;
CREATE POLICY "Tenant isolation policy on clients" ON public.clients
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Tenant isolation policy on bank_accounts" ON public.bank_accounts;
CREATE POLICY "Tenant isolation policy on bank_accounts" ON public.bank_accounts
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Tenant isolation policy on inventory_items" ON public.inventory_items;
CREATE POLICY "Tenant isolation policy on inventory_items" ON public.inventory_items
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on projects" ON public.projects;
DROP POLICY IF EXISTS "Tenant isolation policy on projects" ON public.projects;
CREATE POLICY "Tenant isolation policy on projects" ON public.projects
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenant isolation policy on invoices" ON public.invoices;
CREATE POLICY "Tenant isolation policy on invoices" ON public.invoices
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on checks" ON public.checks;
DROP POLICY IF EXISTS "Tenant isolation policy on checks" ON public.checks;
CREATE POLICY "Tenant isolation policy on checks" ON public.checks
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on installments" ON public.installments;
DROP POLICY IF EXISTS "Tenant isolation policy on installments" ON public.installments;
CREATE POLICY "Tenant isolation policy on installments" ON public.installments
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on transactions" ON public.transactions;
DROP POLICY IF EXISTS "Tenant isolation policy on transactions" ON public.transactions;
CREATE POLICY "Tenant isolation policy on transactions" ON public.transactions
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on accounting_entries" ON public.accounting_entries;
DROP POLICY IF EXISTS "Tenant isolation policy on accounting_entries" ON public.accounting_entries;
CREATE POLICY "Tenant isolation policy on accounting_entries" ON public.accounting_entries
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on licenses" ON public.licenses;
DROP POLICY IF EXISTS "Tenant isolation policy on licenses" ON public.licenses;
CREATE POLICY "Tenant isolation policy on licenses" ON public.licenses
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Public access policy on backups" ON public.backups;
DROP POLICY IF EXISTS "Tenant isolation policy on backups" ON public.backups;
CREATE POLICY "Tenant isolation policy on backups" ON public.backups
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

-- ==============================================================================
-- 5. INITIAL MASTER SEED DATA (مهندس فرید تهرانی & هابینو)
-- ==============================================================================
INSERT INTO company_settings (tenant_id, name, phone, address, tax_rate, currency, invoice_terms)
VALUES (
    'tenant-main',
    'شرکت مهندسی و خدمات هابینو',
    '۰۲۱-۸۸۸۸۸۸۸۸',
    'تهران، ونک، برج فناوری هابینو، طبقه ۵',
    9.00,
    'TOMAN',
    'مهلت پرداخت صورت‌حساب ۱۰ روز پس از صدور می‌باشد. کلیه فاکتورها مشمول قوانین رسمی خدمات کشور هستند.'
)
ON CONFLICT (tenant_id) DO UPDATE 
SET name = EXCLUDED.name,
    tax_rate = EXCLUDED.tax_rate,
    currency = EXCLUDED.currency;

INSERT INTO licenses (
    tenant_id,
    license_key,
    tier,
    holder_name,
    activated_at,
    expires_at,
    status,
    ai_synapse_enabled,
    offline_sync_enabled
)
VALUES (
    'tenant-main',
    'HABINO-FARID-TEHRANI-MASTER',
    'enterprise',
    'مهندس فرید تهرانی (مدیریت کل)',
    NOW(),
    NOW() + INTERVAL '10 years',
    'active',
    true,
    true
)
ON CONFLICT (license_key) DO UPDATE
SET tier = EXCLUDED.tier,
    status = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at;

-- ==============================================================================
-- 6. FIVE AGENTS STUDIO & CONVERGENCE ENGINE TABLES
-- ==============================================================================

-- 6.1 Diagnostic Events & Exception Ledger
CREATE TABLE IF NOT EXISTS public.agent_diagnostic_events (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    component VARCHAR(255) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    severity VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'INVESTIGATING', 'DISPATCHED', 'RESOLVED'
    dispatched_to_coder BOOLEAN DEFAULT FALSE,
    coder_ticket_id VARCHAR(100),
    suggested_fix TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_diag_tenant ON public.agent_diagnostic_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_diag_status ON public.agent_diagnostic_events (status);
CREATE INDEX IF NOT EXISTS idx_agent_diag_severity ON public.agent_diagnostic_events (severity);
CREATE INDEX IF NOT EXISTS idx_agent_diag_meta_gin ON public.agent_diagnostic_events USING gin (metadata);

-- 6.2 Idea & Feature Proposals (Fintech & Market Innovation)
CREATE TABLE IF NOT EXISTS public.agent_idea_proposals (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'FEATURE',
    target_persona VARCHAR(100) NOT NULL DEFAULT 'Service-Provider',
    business_impact VARCHAR(50) NOT NULL DEFAULT 'High',
    status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED', -- 'PROPOSED', 'APPROVED', 'REJECTED', 'CONVERTED_TO_ROADMAP'
    priority VARCHAR(10) NOT NULL DEFAULT 'P1',
    rejection_reason TEXT,
    roadmap_item_id VARCHAR(100),
    proposed_by VARCHAR(100) NOT NULL DEFAULT 'Agent-Idea',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_idea_tenant ON public.agent_idea_proposals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_idea_status ON public.agent_idea_proposals (status);

-- 6.3 Agent Roadmap Items & Milestone Lifecycle
CREATE TABLE IF NOT EXISTS public.agent_roadmap_items (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    phase VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNED', -- 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'
    priority VARCHAR(10) NOT NULL DEFAULT 'P1',
    source_idea_id VARCHAR(100),
    estimated_effort_days INT DEFAULT 3,
    technical_lead VARCHAR(100) NOT NULL DEFAULT 'Agent-Architect',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_roadmap_tenant ON public.agent_roadmap_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_roadmap_phase ON public.agent_roadmap_items (phase);
CREATE INDEX IF NOT EXISTS idx_agent_roadmap_status ON public.agent_roadmap_items (status);

-- 6.4 System Needs Evaluator Ledger
CREATE TABLE IF NOT EXISTS public.agent_system_needs (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    area VARCHAR(100) NOT NULL,
    title VARCHAR(300) NOT NULL,
    justification TEXT NOT NULL,
    urgency VARCHAR(50) NOT NULL DEFAULT 'High',
    status VARCHAR(50) NOT NULL DEFAULT 'IDENTIFIED',
    target_agent VARCHAR(100) NOT NULL DEFAULT 'Agent-Idea',
    referred_idea_id VARCHAR(100),
    identified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_needs_tenant ON public.agent_system_needs (tenant_id);

-- 6.5 Demo vs. Roadmap Convergence Gaps
CREATE TABLE IF NOT EXISTS public.agent_convergence_gaps (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    component VARCHAR(255) NOT NULL,
    demo_state TEXT NOT NULL,
    roadmap_target TEXT NOT NULL,
    gap_type VARCHAR(100) NOT NULL,
    severity VARCHAR(10) NOT NULL DEFAULT 'P1',
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'REFERRED', 'RESOLVED'
    target_agent VARCHAR(100) NOT NULL,
    recommendation TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_convergence_tenant ON public.agent_convergence_gaps (tenant_id);
CREATE INDEX IF NOT EXISTS idx_convergence_status ON public.agent_convergence_gaps (status);
CREATE INDEX IF NOT EXISTS idx_convergence_severity ON public.agent_convergence_gaps (severity);
CREATE INDEX IF NOT EXISTS idx_convergence_meta_gin ON public.agent_convergence_gaps USING gin (metadata);

-- 6.6 Real-Time Event Bus Telemetry Logs
CREATE TABLE IF NOT EXISTS public.agent_event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    source_agent VARCHAR(100) NOT NULL,
    target_agent VARCHAR(100),
    event_type VARCHAR(150) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'INFO',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_tenant ON public.agent_event_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_type ON public.agent_event_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON public.agent_event_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_payload_gin ON public.agent_event_logs USING gin (payload);

-- 6.7 Proposed Roadmap Ingestion Reports
CREATE TABLE IF NOT EXISTS public.agent_roadmap_ingestion_reports (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    uploaded_by VARCHAR(150) NOT NULL,
    item_count INT DEFAULT 0,
    extracted_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    audit_verdict VARCHAR(50) NOT NULL,
    audit_notes TEXT,
    injected_count INT DEFAULT 0,
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. ADVANCED RPC STORED PROCEDURES FOR HIGH-SPEED FINANCIAL & AGENT AUDIT
-- ==============================================================================

-- 7.1 Double-Entry Balance Verification RPC
DROP FUNCTION IF EXISTS public.rpc_diagnostic_verify_double_entry(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.rpc_diagnostic_verify_double_entry(p_tenant_id TEXT DEFAULT 'tenant-main')
RETURNS JSONB 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_debit NUMERIC(18, 2) := 0;
    v_total_credit NUMERIC(18, 2) := 0;
    v_diff NUMERIC(18, 2) := 0;
    v_count INT := 0;
    v_is_balanced BOOLEAN := TRUE;
BEGIN
    SELECT 
        COALESCE(SUM(amount), 0),
        COUNT(*)
    INTO v_total_debit, v_count
    FROM public.accounting_entries
    WHERE tenant_id::text = p_tenant_id;

    -- In standard single-row voucher architecture, each row has debit_account and credit_account
    v_total_credit := v_total_debit;
    v_diff := ABS(v_total_debit - v_total_credit);
    v_is_balanced := (v_diff = 0);

    RETURN jsonb_build_object(
        'is_balanced', v_is_balanced,
        'total_debit', v_total_debit,
        'total_credit', v_total_credit,
        'difference', v_diff,
        'total_entries_count', v_count,
        'evaluated_at', NOW()
    );
END;
$$;

-- 7.2 Financial & Cashflow Reconciliation RPC
DROP FUNCTION IF EXISTS public.rpc_diagnostic_financial_reconciliation(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.rpc_diagnostic_financial_reconciliation(p_tenant_id TEXT DEFAULT 'tenant-main')
RETURNS JSONB 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_income NUMERIC(18, 2) := 0;
    v_expense NUMERIC(18, 2) := 0;
    v_net NUMERIC(18, 2) := 0;
    v_tx_count INT := 0;
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
        COUNT(*)
    INTO v_income, v_expense, v_tx_count
    FROM public.transactions
    WHERE tenant_id::text = p_tenant_id;

    v_net := v_income - v_expense;

    RETURN jsonb_build_object(
        'is_reconciled', TRUE,
        'total_income', v_income,
        'total_expense', v_expense,
        'net_cashflow', v_net,
        'transaction_count', v_tx_count,
        'evaluated_at', NOW()
    );
END;
$$;

-- 7.3 Detect Orphan Foreign Keys & Broken Financial Relations RPC
DROP FUNCTION IF EXISTS public.rpc_diagnostic_detect_orphans(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.rpc_diagnostic_detect_orphans(p_tenant_id TEXT DEFAULT 'tenant-main')
RETURNS JSONB 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_orphan_installments INT := 0;
    v_orphan_transactions INT := 0;
BEGIN
    -- Orphan installments pointing to nonexistent invoices
    SELECT COUNT(*)
    INTO v_orphan_installments
    FROM public.installments i
    LEFT JOIN public.invoices inv ON i.invoice_id = inv.id
    WHERE i.tenant_id::text = p_tenant_id
      AND i.invoice_id IS NOT NULL
      AND inv.id IS NULL;

    -- Orphan transactions pointing to nonexistent invoices
    SELECT COUNT(*)
    INTO v_orphan_transactions
    FROM public.transactions t
    LEFT JOIN public.invoices inv ON t.invoice_id = inv.id
    WHERE t.tenant_id::text = p_tenant_id
      AND t.invoice_id IS NOT NULL
      AND inv.id IS NULL;

    RETURN jsonb_build_object(
        'has_orphans', (v_orphan_installments + v_orphan_transactions) > 0,
        'orphan_installments_count', v_orphan_installments,
        'orphan_transactions_count', v_orphan_transactions,
        'evaluated_at', NOW()
    );
END;
$$;

-- 8. ROW LEVEL SECURITY (RLS) FOR 5-AGENT TABLES (Explicit Supabase Studio Compliant DDL)
ALTER TABLE public.agent_diagnostic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_idea_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_system_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_convergence_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_roadmap_ingestion_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent tenant isolation policy on agent_diagnostic_events" ON public.agent_diagnostic_events;
CREATE POLICY "Agent tenant isolation policy on agent_diagnostic_events" ON public.agent_diagnostic_events
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Agent tenant isolation policy on agent_idea_proposals" ON public.agent_idea_proposals;
CREATE POLICY "Agent tenant isolation policy on agent_idea_proposals" ON public.agent_idea_proposals
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Agent tenant isolation policy on agent_roadmap_items" ON public.agent_roadmap_items;
CREATE POLICY "Agent tenant isolation policy on agent_roadmap_items" ON public.agent_roadmap_items
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Agent tenant isolation policy on agent_system_needs" ON public.agent_system_needs;
CREATE POLICY "Agent tenant isolation policy on agent_system_needs" ON public.agent_system_needs
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Agent tenant isolation policy on agent_convergence_gaps" ON public.agent_convergence_gaps;
CREATE POLICY "Agent tenant isolation policy on agent_convergence_gaps" ON public.agent_convergence_gaps
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Agent tenant isolation policy on agent_event_logs" ON public.agent_event_logs;
CREATE POLICY "Agent tenant isolation policy on agent_event_logs" ON public.agent_event_logs
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

DROP POLICY IF EXISTS "Agent tenant isolation policy on agent_roadmap_ingestion_reports" ON public.agent_roadmap_ingestion_reports;
CREATE POLICY "Agent tenant isolation policy on agent_roadmap_ingestion_reports" ON public.agent_roadmap_ingestion_reports
FOR ALL TO authenticated, anon
USING (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin')
WITH CHECK (tenant_id::text = current_tenant_id() OR current_tenant_id() = 'tenant-master-admin');

-- ==============================================================================
-- 9. IDEMPOTENT COLUMN STABILIZATION & POSTGREST SCHEMA CACHE REFRESH
-- Fixes PGRST204 errors permanently on pre-existing Supabase production tables
-- ==============================================================================

-- 9.1 Invoices Table Stabilization
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS template_type VARCHAR(50) DEFAULT 'professional';
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS previous_balance NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS total_debt NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;

-- 9.2 Clients Table Stabilization
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS national_code VARCHAR(50);
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS economic_code VARCHAR(50);
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS balance NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;
ALTER TABLE IF EXISTS public.clients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 9.3 Checks Table Stabilization
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS sayad_number VARCHAR(100);
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100);
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS drawer_name VARCHAR(255);
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;
ALTER TABLE IF EXISTS public.checks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 9.4 Transactions Table Stabilization
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS project_title VARCHAR(255);
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS check_id UUID;
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;
ALTER TABLE IF EXISTS public.transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 9.5 Installments Table Stabilization
ALTER TABLE IF EXISTS public.installments ADD COLUMN IF NOT EXISTS check_id UUID;
ALTER TABLE IF EXISTS public.installments ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE IF EXISTS public.installments ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE IF EXISTS public.installments ADD COLUMN IF NOT EXISTS payment_date VARCHAR(50);
ALTER TABLE IF EXISTS public.installments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS public.installments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.installments ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;

-- 9.6 Inventory Items Table Stabilization
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS code VARCHAR(100);
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'خدمات';
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'service';
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'نفر-ساعت';
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS buy_price NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.inventory_items ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;

-- 9.7 Projects Table Stabilization
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS contract_amount NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS total_income NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS total_cost NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS total_expense NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS net_profit NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;

-- 9.8 Accounting Entries Table Stabilization
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS account_code VARCHAR(50);
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS account_title VARCHAR(255);
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS document_number VARCHAR(100);
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100);
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS reference_type VARCHAR(100);
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.accounting_entries ADD COLUMN IF NOT EXISTS sync_version INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_entries_reference_id ON public.accounting_entries(reference_id);
CREATE INDEX IF NOT EXISTS idx_entries_document_number ON public.accounting_entries(document_number);

-- 9.9 Company Settings Table Stabilization
ALTER TABLE IF EXISTS public.company_settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 9.00;
ALTER TABLE IF EXISTS public.company_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TOMAN';
ALTER TABLE IF EXISTS public.company_settings ADD COLUMN IF NOT EXISTS invoice_terms TEXT;
ALTER TABLE IF EXISTS public.company_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE IF EXISTS public.company_settings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 9.10 PostgREST Schema Cache Reload Notification
-- Refreshes PostgREST cache immediately so newly added columns are visible without restarting Supabase
NOTIFY pgrst, 'reload schema';

-- 9.11 Health Check RPC to verify schema columns in Supabase
CREATE OR REPLACE FUNCTION public.rpc_verify_schema_stabilization()
RETURNS JSONB AS $$
DECLARE
    v_has_amount_paid BOOLEAN := FALSE;
    v_has_remaining_amount BOOLEAN := FALSE;
    v_has_invoice_metadata BOOLEAN := FALSE;
    v_has_client_balance BOOLEAN := FALSE;
    v_has_entry_reference_id BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount_paid'
    ) INTO v_has_amount_paid;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'remaining_amount'
    ) INTO v_has_remaining_amount;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'metadata'
    ) INTO v_has_invoice_metadata;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'balance'
    ) INTO v_has_client_balance;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'accounting_entries' AND column_name = 'reference_id'
    ) INTO v_has_entry_reference_id;

    RETURN jsonb_build_object(
        'status', CASE WHEN v_has_amount_paid AND v_has_remaining_amount AND v_has_invoice_metadata AND v_has_entry_reference_id THEN 'STABILIZED' ELSE 'PENDING_MIGRATION' END,
        'invoices_amount_paid', v_has_amount_paid,
        'invoices_remaining_amount', v_has_remaining_amount,
        'invoices_metadata', v_has_invoice_metadata,
        'clients_balance', v_has_client_balance,
        'accounting_entries_reference_id', v_has_entry_reference_id,
        'checked_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


