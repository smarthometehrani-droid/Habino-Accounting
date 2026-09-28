-- ====================================================================
-- HABINO DECENTRALIZED OS & SIRAFLOW PROTOCOL SCHEMA (SUPABASE / POSTGRES)
-- Multi-Tenant RFP, Blind Tendering, Anti-Dumping Audit & Smart Contracts
-- Row Level Security (RLS) Enforced
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Projects & RFP Submissions Table (with JSONB Dynamic Data)
CREATE TABLE IF NOT EXISTS public.rfp_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    client_ref_id VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    title VARCHAR(300) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    dynamic_form_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- dynamic attributes, brand, specs
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'rfp_submitted',
    scale VARCHAR(50) DEFAULT 'medium', -- small, medium, large, enterprise
    analysis_result JSONB, -- SiraFlow classification, extracted attributes, dumping rules
    system_tickets JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for high performance JSONB querying & tenant lookup
CREATE INDEX IF NOT EXISTS idx_rfp_tenant_id ON public.rfp_projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfp_status ON public.rfp_projects (status);
CREATE INDEX IF NOT EXISTS idx_rfp_dynamic_gin ON public.rfp_projects USING gin (dynamic_form_data);

-- 3. Blind Tenders Table
CREATE TABLE IF NOT EXISTS public.blind_tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfp_id UUID NOT NULL REFERENCES public.rfp_projects(id) ON DELETE CASCADE,
    project_scale VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, closed, awarded
    budget_floor NUMERIC(18, 2) NOT NULL DEFAULT 0,
    budget_ceiling NUMERIC(18, 2) NOT NULL DEFAULT 0,
    dumping_audit_threshold NUMERIC(18, 2) NOT NULL DEFAULT 0,
    invited_tenants_count INT DEFAULT 0,
    winner_bid_id UUID,
    winner_tenant_id UUID,
    winner_anonymous_code VARCHAR(100),
    selection_reason TEXT,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closing_date TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tender_rfp ON public.blind_tenders (rfp_id);

-- 4. Blind Tender Bids Table (Anti-Collusion & Anti-Dumping)
CREATE TABLE IF NOT EXISTS public.tender_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.blind_tenders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    anonymous_code VARCHAR(100) NOT NULL, -- e.g. "مستأجر امن #T-9921"
    bid_amount NUMERIC(18, 2) NOT NULL,
    delivery_days INT NOT NULL,
    warranty_months INT NOT NULL DEFAULT 12,
    technical_proposal TEXT NOT NULL,
    technical_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    price_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    final_balanced_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    is_dumping_suspected BOOLEAN DEFAULT FALSE,
    dumping_audit_note TEXT,
    compliance_checked BOOLEAN DEFAULT TRUE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bids_tender ON public.tender_bids (tender_id);
CREATE INDEX IF NOT EXISTS idx_bids_tenant ON public.tender_bids (tenant_id);

-- 5. Digital Smart Contracts Table
CREATE TABLE IF NOT EXISTS public.smart_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfp_id UUID NOT NULL REFERENCES public.rfp_projects(id) ON DELETE RESTRICT,
    tender_id UUID NOT NULL REFERENCES public.blind_tenders(id) ON DELETE RESTRICT,
    contract_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(300) NOT NULL,
    parties JSONB NOT NULL DEFAULT '[]'::jsonb, -- employer, winning tenant, habino escrow
    total_amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'IRT',
    penalties_per_day NUMERIC(18, 2) NOT NULL DEFAULT 0,
    warranty_period_months INT NOT NULL DEFAULT 12,
    arbitration_clause TEXT NOT NULL,
    milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_verification_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, pending_signatures, active_in_execution, settled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SiraFlow Audit & Orchestration Event Logs
CREATE TABLE IF NOT EXISTS public.siraflow_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    rfp_id UUID REFERENCES public.rfp_projects(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL, -- employer, tenant, superadmin, siraflow_ai
    event_payload JSONB NOT NULL,
    reasoning TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.rfp_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blind_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siraflow_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to extract auth tenant_id from Supabase JWT
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id', '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS 1: Tenants can view and update their own RFPs; SuperAdmin can view all
CREATE POLICY "Tenants isolation for RFP Projects"
ON public.rfp_projects
FOR ALL
USING (
    tenant_id = public.current_tenant_id()
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'superadmin')
);

-- RLS 2: Blind Tenders - Open tenders visible to all verified tenants, but bids protected
CREATE POLICY "Public read for open blind tenders"
ON public.blind_tenders
FOR SELECT
USING (status IN ('open', 'closed', 'awarded'));

-- RLS 3: Blind Tender Bids - Strict blind protection
-- Tenants can ONLY see their own bids.
-- Other tenants CANNOT see competitor identities even after award (identities remain anonymous codes).
CREATE POLICY "Tenant bid privacy in blind tender"
ON public.tender_bids
FOR ALL
USING (
    tenant_id = public.current_tenant_id()
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'superadmin')
);

-- RLS 4: Smart Contracts - Visible only to involved contract parties and platform escrow
CREATE POLICY "Contract visibility for contract parties"
ON public.smart_contracts
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM jsonb_array_elements(parties) AS p
        WHERE (p->>'identifier')::UUID = public.current_tenant_id()
    )
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'superadmin')
);
