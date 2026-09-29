-- ==============================================================================
-- HABINO ACCOUNTING - PRODUCTION HARDENING & MULTI-TENANT RLS ISOLATION (V3)
-- Migration: 20260929_security_and_rls_hardening.sql
-- Target Database: Supabase PostgreSQL 15+
-- Description:
--   1. Zero-Trust current_tenant_id() (NO fallback to 'tenant-main', returns NULL for anon).
--   2. Explicit is_super_admin() helper based on server-verified JWT claims.
--   3. Complete purge of legacy permissive policies across ALL multi-tenant tables.
--   4. Rebuilding strict tenant-scoped RLS policies on all financial & system tables:
--      (invoices, invoice_signatures, clients, checks, transactions, accounting_entries,
--       installments, bank_accounts, projects, inventory_items, company_settings, licenses, backups).
--   5. Cryptographically bound public invoice viewing & signature RPCs.
--   6. Hardened ACID atomic invoice registration RPC:
--      - Anti-spoofing via verified JWT claims
--      - Cross-tenant invoice hijacking protection (verifies existing invoice tenant)
--      - ON CONFLICT with tenant_id guard against race conditions
--      - Scoped ledger deletion (prevents deleting another tenant's entries)
--      - Draft vs definitive invoice validation
--      - Rule 1 (Mandatory Contact) and Rule 9 (Double-entry balance) enforcement.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. HELPER FUNCTIONS: is_super_admin() & current_tenant_id()
-- ==============================================================================

-- 1.1 Verified Super-Admin helper (Checks verified JWT claims)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() <> 'authenticated' THEN
        RETURN FALSE;
    END IF;
    RETURN COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin',
        (auth.jwt() ->> 'role') = 'super_admin',
        FALSE
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated, service_role;

-- 1.2 Zero-Trust current_tenant_id() (Never defaults to 'tenant-main', returns NULL for anon)
DROP FUNCTION IF EXISTS public.current_tenant_id() CASCADE;

CREATE OR REPLACE FUNCTION public.current_tenant_id() 
RETURNS TEXT 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tenant TEXT;
BEGIN
    -- Anonymous requests NEVER have a tenant context - strictly return NULL
    IF auth.role() = 'anon' THEN
        RETURN NULL;
    END IF;

    -- Authenticated requests: extract tenant claim from verified JWT or session setting
    v_tenant := COALESCE(
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
        NULLIF(auth.jwt() ->> 'tenant_id', ''),
        NULLIF(current_setting('app.current_tenant_id', true), ''),
        NULLIF((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id'), '')
    );
    
    -- Returns verified tenant string or NULL if claim is absent. NEVER defaults to 'tenant-main'!
    RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated, service_role;

-- ==============================================================================
-- 2. PURGE ALL INSECURE & PERMISSIVE POLICIES ACROSS ALL FINANCIAL TABLES
-- ==============================================================================
-- Invoices & Signatures
DROP POLICY IF EXISTS "invoices_permissive_sync_policy" ON public.invoices;
DROP POLICY IF EXISTS "company_settings_permissive_access" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_public_access" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_tenant_all" ON public.company_settings;
DROP POLICY IF EXISTS "Public can view invoice with valid share token" ON public.invoices;
DROP POLICY IF EXISTS "allow_anon_invoices" ON public.invoices;
DROP POLICY IF EXISTS "allow_all_invoices" ON public.invoices;
DROP POLICY IF EXISTS "allow_anon_all" ON public.invoices;

-- Financial Tables
DROP POLICY IF EXISTS "allow_all_accounting_entries" ON public.accounting_entries;
DROP POLICY IF EXISTS "allow_anon_entries" ON public.accounting_entries;
DROP POLICY IF EXISTS "allow_anon_checks" ON public.checks;
DROP POLICY IF EXISTS "allow_anon_transactions" ON public.transactions;
DROP POLICY IF EXISTS "allow_anon_clients" ON public.clients;
DROP POLICY IF EXISTS "allow_anon_installments" ON public.installments;
DROP POLICY IF EXISTS "allow_anon_bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "allow_anon_projects" ON public.projects;
DROP POLICY IF EXISTS "allow_anon_inventory_items" ON public.inventory_items;

-- Drop generic "Public access policy on *" and "Public policy on *"
DO $$
DECLARE
    tbl text;
    pol text;
    tables text[] := ARRAY[
        'invoices', 'invoice_signatures', 'clients', 'checks', 'transactions', 
        'accounting_entries', 'installments', 'bank_accounts', 'projects', 
        'inventory_items', 'company_settings', 'licenses', 'backups'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Public access policy on ' || tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Public policy on ' || tbl, tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Tenant isolation policy on ' || tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- Drop legacy signature policies
DROP POLICY IF EXISTS "Vendors can view signatures in their tenant" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Vendors can insert signatures in their tenant" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Vendors can update signatures in their tenant" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Vendors can delete signatures in their tenant" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Public can view verified signature via token" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Clients can submit signature via valid invoice token" ON public.invoice_signatures;

-- ==============================================================================
-- 3. REBUILD STRICT TENANT-SCOPED RLS POLICIES ACROSS ALL MULTI-TENANT TABLES
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'invoices', 'invoice_signatures', 'clients', 'checks', 'transactions', 
        'accounting_entries', 'installments', 'bank_accounts', 'projects', 
        'inventory_items', 'company_settings', 'licenses', 'backups'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Enable and Force RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);

            -- Drop old isolation policies
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'tenant_isolation_' || tbl || '_select', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'tenant_isolation_' || tbl || '_insert', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'tenant_isolation_' || tbl || '_update', tbl);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'tenant_isolation_' || tbl || '_delete', tbl);

            -- SELECT Policy (Strictly Authenticated Tenant OR Super-Admin)
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR SELECT
                USING (
                    auth.role() = ''authenticated'' AND (
                        tenant_id = public.current_tenant_id()
                        OR public.is_super_admin()
                    )
                );
            ', 'tenant_isolation_' || tbl || '_select', tbl);

            -- INSERT Policy (Strictly Authenticated Tenant OR Super-Admin with matching WITH CHECK)
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR INSERT
                WITH CHECK (
                    auth.role() = ''authenticated'' AND (
                        tenant_id = public.current_tenant_id()
                        OR public.is_super_admin()
                    )
                );
            ', 'tenant_isolation_' || tbl || '_insert', tbl);

            -- UPDATE Policy (Strictly Authenticated Tenant OR Super-Admin with matching WITH CHECK)
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR UPDATE
                USING (
                    auth.role() = ''authenticated'' AND (
                        tenant_id = public.current_tenant_id()
                        OR public.is_super_admin()
                    )
                )
                WITH CHECK (
                    auth.role() = ''authenticated'' AND (
                        tenant_id = public.current_tenant_id()
                        OR public.is_super_admin()
                    )
                );
            ', 'tenant_isolation_' || tbl || '_update', tbl);

            -- DELETE Policy (Strictly Authenticated Tenant OR Super-Admin)
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR DELETE
                USING (
                    auth.role() = ''authenticated'' AND (
                        tenant_id = public.current_tenant_id()
                        OR public.is_super_admin()
                    )
                );
            ', 'tenant_isolation_' || tbl || '_delete', tbl);
        END IF;
    END LOOP;
END $$;

-- ==============================================================================
-- 4. SECURE TOKEN-BOUND RPC FOR PUBLIC INVOICE VIEWING
-- ==============================================================================
-- Anonymous callers CANNOT query the invoices table directly.
-- They can only call this function with an exact token.
CREATE OR REPLACE FUNCTION public.get_public_invoice_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice RECORD;
    v_signature RECORD;
    v_result JSONB;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'توکن ارائه نشده است.');
    END IF;

    SELECT 
        id,
        tenant_id,
        invoice_number,
        type,
        status,
        template,
        date,
        due_date,
        client_id,
        client_name,
        items,
        subtotal,
        total_discount,
        total_tax,
        grand_total,
        amount_paid,
        remaining_amount,
        notes,
        terms,
        is_signed,
        signed_at,
        signature_url,
        signer_info,
        design_config
    INTO v_invoice
    FROM public.invoices
    WHERE share_token = p_token
      AND (is_deleted IS NULL OR is_deleted = false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'فاکتور مورد نظر با این پیوند یافت نشد.');
    END IF;

    -- Fetch latest signature record for this invoice if available
    SELECT 
        id,
        signer_name,
        signer_role,
        signed_at,
        signature_url,
        verification_token
    INTO v_signature
    FROM public.invoice_signatures
    WHERE invoice_id = v_invoice.id
    ORDER BY signed_at DESC
    LIMIT 1;

    v_result := jsonb_build_object(
        'success', true,
        'invoice', jsonb_build_object(
            'id', v_invoice.id,
            'invoiceNumber', v_invoice.invoice_number,
            'type', v_invoice.type,
            'status', v_invoice.status,
            'template', v_invoice.template,
            'date', v_invoice.date,
            'dueDate', v_invoice.due_date,
            'clientName', v_invoice.client_name,
            'items', v_invoice.items,
            'subtotal', v_invoice.subtotal,
            'totalDiscount', v_invoice.total_discount,
            'totalTax', v_invoice.total_tax,
            'grandTotal', v_invoice.grand_total,
            'amountPaid', v_invoice.amount_paid,
            'remainingAmount', v_invoice.remaining_amount,
            'notes', v_invoice.notes,
            'terms', v_invoice.terms,
            'isSigned', v_invoice.is_signed,
            'signedAt', v_invoice.signed_at,
            'signatureUrl', v_invoice.signature_url,
            'signerInfo', v_invoice.signer_info,
            'designConfig', v_invoice.design_config
        ),
        'signature', CASE 
            WHEN v_signature.id IS NOT NULL THEN jsonb_build_object(
                'id', v_signature.id,
                'signerName', v_signature.signer_name,
                'signerRole', v_signature.signer_role,
                'signedAt', v_signature.signed_at,
                'signatureUrl', v_signature.signature_url,
                'verificationToken', v_signature.verification_token
            )
            ELSE NULL 
        END
    );

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_invoice_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_invoice_by_token(TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- 5. SECURE RPC FOR PUBLIC CLIENT SIGNATURE SUBMISSION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.submit_public_invoice_signature(
    p_token TEXT,
    p_signature_url TEXT,
    p_signer_name TEXT,
    p_signer_role TEXT DEFAULT 'client',
    p_signer_national_id TEXT DEFAULT NULL,
    p_signature_hash TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice RECORD;
    v_sig_id UUID := gen_random_uuid();
    v_now TIMESTAMPTZ := NOW();
    v_clean_role VARCHAR(50);
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'توکن نامعتبر است.');
    END IF;

    IF p_signature_url IS NULL OR trim(p_signature_url) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'آدرس تصویر امضا ارائه نشده است.');
    END IF;

    IF p_signer_role NOT IN ('client', 'representative') THEN
        v_clean_role := 'client';
    ELSE
        v_clean_role := p_signer_role;
    END IF;

    -- Find invoice by exact share_token
    SELECT id, tenant_id, invoice_number, status, is_signed
    INTO v_invoice
    FROM public.invoices
    WHERE share_token = p_token
      AND (is_deleted IS NULL OR is_deleted = false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'پیش‌فاکتور معتبری برای این پیوند یافت نشد.');
    END IF;

    -- Record signature with verified tenant_id derived directly from the invoice record
    INSERT INTO public.invoice_signatures (
        id,
        invoice_id,
        tenant_id,
        signature_url,
        ip_address,
        user_agent,
        signed_at,
        status,
        signer_name,
        signer_national_id,
        signer_role,
        verification_token,
        signature_hash,
        metadata
    ) VALUES (
        v_sig_id,
        v_invoice.id,
        v_invoice.tenant_id,
        p_signature_url,
        p_ip_address,
        p_user_agent,
        v_now,
        'signed',
        COALESCE(p_signer_name, 'مشتری'),
        p_signer_national_id,
        v_clean_role,
        p_token,
        p_signature_hash,
        jsonb_build_object('submissionMode', 'public_token_rpc', 'timestamp', v_now)
    );

    -- Update invoice: mark signed (Do NOT mark status as paid!)
    UPDATE public.invoices
    SET 
        is_signed = true,
        signed_at = v_now,
        signature_url = p_signature_url,
        signer_info = jsonb_build_object(
            'signer_name', COALESCE(p_signer_name, 'مشتری'),
            'signer_role', v_clean_role,
            'signer_national_id', p_signer_national_id,
            'signed_at', v_now,
            'verification_token', p_token
        ),
        updated_at = v_now
    WHERE id = v_invoice.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'امضا و تاییدیه پیش‌فاکتور با موفقیت در پایگاه داده ثبت گردید.',
        'signatureId', v_sig_id,
        'signedAt', v_now
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_invoice_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_invoice_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- 6. HARDENED ATOMIC INVOICE REGISTRATION RPC (ACID, Anti-Hijacking, Rule 1 & Rule 9)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_register_invoice_atomic(
    p_invoice JSONB,
    p_entries JSONB DEFAULT '[]'::jsonb,
    p_tenant_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv_id UUID;
    v_entry JSONB;
    v_caller_tenant TEXT;
    v_is_super_admin BOOLEAN := FALSE;
    v_effective_tenant TEXT;
    v_existing_tenant TEXT;
    v_client_id TEXT;
    v_inv_type TEXT;
    v_inv_status TEXT;
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
    v_discrepancy NUMERIC := 0;
    v_entry_count INT := 0;
    v_entry_debit NUMERIC;
    v_entry_credit NUMERIC;
    v_entry_acc_code TEXT;
    v_entry_ref_id TEXT;
    v_upserted_id UUID := NULL;
BEGIN
    -- --------------------------------------------------------------------------
    -- 1. SECURITY & TENANT AUTHORIZATION CHECK (Server-Side Verified Claims)
    -- --------------------------------------------------------------------------
    IF auth.role() = 'authenticated' THEN
        -- Check verified super_admin role from JWT
        v_is_super_admin := COALESCE(
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin',
            (auth.jwt() ->> 'role') = 'super_admin',
            FALSE
        );

        -- Extract verified tenant_id from JWT
        v_caller_tenant := COALESCE(
            NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
            NULLIF(auth.jwt() ->> 'tenant_id', '')
        );

        IF v_is_super_admin THEN
            -- Super-admin must specify an explicit target tenant (cannot be empty, null, or generic 'all')
            IF p_tenant_id IS NULL OR trim(p_tenant_id) = '' OR p_tenant_id = 'all' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'errorCode', 'INVALID_TARGET_TENANT',
                    'error', 'خطای راهبر ارشد: شناسه مستأجر هدف باید به طور صریح مشخص شود و مقدار عمومی مانند all مجاز نیست.'
                );
            END IF;
            v_effective_tenant := p_tenant_id;
        ELSE
            -- Normal authenticated user: Must have valid tenant claim
            IF v_caller_tenant IS NULL OR trim(v_caller_tenant) = '' THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'errorCode', 'AUTH_TENANT_MISSING',
                    'error', 'خطای احراز هویت: شناسه سازمان در توکن معتبر کاربر موجود نیست.'
                );
            END IF;

            -- Target tenant parameter (if provided) MUST strictly match caller tenant
            IF p_tenant_id IS NOT NULL AND trim(p_tenant_id) <> '' AND p_tenant_id <> v_caller_tenant THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'errorCode', 'TENANT_MISMATCH',
                    'error', 'دسترسی غیرمجاز: امکان ثبت سند برای سازمان یا مستأجر دیگر مجاز نمی‌باشد.'
                );
            END IF;
            v_effective_tenant := v_caller_tenant;
        END IF;
    ELSIF auth.role() = 'service_role' THEN
        -- Direct service role call (e.g. backend automated job): require explicit tenant
        IF p_tenant_id IS NULL OR trim(p_tenant_id) = '' OR p_tenant_id = 'all' THEN
            RETURN jsonb_build_object(
                'success', false, 
                'errorCode', 'MISSING_TENANT_PARAM',
                'error', 'درخواست مستقیم سیستمی نیازمند تعیین صریح شناسه مستأجر است.'
            );
        END IF;
        v_effective_tenant := p_tenant_id;
    ELSE
        RETURN jsonb_build_object(
            'success', false, 
            'errorCode', 'UNAUTHENTICATED',
            'error', 'دسترسی غیرمجاز: ثبت سند نیازمند احراز هویت است.'
        );
    END IF;

    IF p_invoice IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'errorCode', 'INVALID_INVOICE_DATA',
            'error', 'اطلاعات فاکتور ارسال نشده است.'
        );
    END IF;

    -- Extract invoice ID
    IF (p_invoice->>'id') IS NOT NULL AND trim(p_invoice->>'id') <> '' THEN
        BEGIN
            v_inv_id := (p_invoice->>'id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'errorCode', 'INVALID_UUID',
                'error', 'شناسه فاکتور ساختار معتبر UUID ندارد.'
            );
        END;
    ELSE
        v_inv_id := gen_random_uuid();
    END IF;

    -- --------------------------------------------------------------------------
    -- 2. CROSS-TENANT INVOICE HIJACKING & RACE-CONDITION PROTECTION
    -- --------------------------------------------------------------------------
    -- Check if invoice ID already exists in the database
    SELECT tenant_id INTO v_existing_tenant 
    FROM public.invoices 
    WHERE id = v_inv_id;

    IF v_existing_tenant IS NOT NULL AND v_existing_tenant <> v_effective_tenant THEN
        RETURN jsonb_build_object(
            'success', false,
            'errorCode', 'TENANT_MISMATCH_INVOICE_EXISTS',
            'error', 'خطای امنیتی: سند مالی با این شناسه متعلق به مستأجر دیگری است و هرگونه تغییر در آن مسدود است.'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- 3. ENFORCE RULE 1: MANDATORY CONTACT (الزام طرف‌حساب)
    -- --------------------------------------------------------------------------
    v_client_id := COALESCE(NULLIF(p_invoice->>'clientId', ''), NULLIF(p_invoice->>'client_id', ''));
    v_inv_type := COALESCE(p_invoice->>'type', 'sale');
    v_inv_status := COALESCE(p_invoice->>'status', 'pending');

    -- Proforma inquiry can be neutral, but all commercial invoices MUST have a valid client_id
    IF v_inv_type NOT IN ('proforma', 'proforma_sale', 'proforma_purchase') THEN
        IF v_client_id IS NULL OR trim(v_client_id) = '' OR v_client_id = 'null' OR v_client_id = 'undefined' THEN
            RETURN jsonb_build_object(
                'success', false,
                'errorCode', 'RULE_1_MANDATORY_CONTACT_VIOLATION',
                'error', 'ثبت سند بدون انتخاب مخاطب مجاز نیست.'
            );
        END IF;
    END IF;

    -- --------------------------------------------------------------------------
    -- 4. DRAFT VS DEFINITIVE ACCOUNTING VALIDATION & RULE 9 (توازن دفاتر دوبل)
    -- --------------------------------------------------------------------------
    v_entry_count := COALESCE(jsonb_array_length(p_entries), 0);

    -- Commercial non-draft invoices MUST have ledger entries
    IF v_inv_status <> 'draft' AND v_inv_type NOT IN ('proforma', 'proforma_sale', 'proforma_purchase') THEN
        IF v_entry_count < 2 THEN
            RETURN jsonb_build_object(
                'success', false,
                'errorCode', 'DEFINITIVE_INVOICE_REQUIRES_LEDGER_ENTRIES',
                'error', 'ثبت قطعی فاکتور بدون ردیف‌های معتبر دفتر کل (حداقل دو ردیف بدهکار و بستانکار) مجاز نیست.'
            );
        END IF;
    END IF;

    -- Validate ledger rows and double-entry balance if entries provided
    IF v_entry_count > 0 THEN
        FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
        LOOP
            v_entry_debit := COALESCE((v_entry->>'debit')::numeric, 0);
            v_entry_credit := COALESCE((v_entry->>'credit')::numeric, 0);
            v_entry_acc_code := v_entry->>'accountCode';
            v_entry_ref_id := COALESCE(v_entry->>'referenceId', v_entry->>'reference_id');

            -- Numeric checks: no negative debit/credit, at least one must be positive
            IF v_entry_debit < 0 OR v_entry_credit < 0 OR (v_entry_debit = 0 AND v_entry_credit = 0) THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'errorCode', 'INVALID_ENTRY_AMOUNTS',
                    'error', 'مبالغ بدهکار و بستانکار در ردیف‌های دفتر کل نامعتبر است.'
                );
            END IF;

            -- Account code check
            IF v_entry_acc_code IS NULL OR trim(v_entry_acc_code) = '' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'errorCode', 'MISSING_ACCOUNT_CODE',
                    'error', 'کد حساب در یکی از ردیف‌های دفتر کل مشخص نشده است.'
                );
            END IF;

            -- Reference integrity check: reference must match this invoice ID or number
            IF v_entry_ref_id IS NOT NULL AND trim(v_entry_ref_id) <> '' AND 
               v_entry_ref_id <> v_inv_id::text AND 
               v_entry_ref_id <> (p_invoice->>'invoiceNumber') THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'errorCode', 'ENTRY_REFERENCE_MISMATCH',
                    'error', 'مرجع ردیف دفتر کل با شناسه فاکتور تطابق ندارد.'
                );
            END IF;

            v_total_debit := v_total_debit + v_entry_debit;
            v_total_credit := v_total_credit + v_entry_credit;
        END LOOP;

        v_discrepancy := abs(v_total_debit - v_total_credit);
        IF v_discrepancy > 0.001 THEN
            RETURN jsonb_build_object(
                'success', false,
                'errorCode', 'LEDGER_UNBALANCED',
                'error', 'خطای ناترازی سند: مجموع بدهکار و بستانکار در دفتر کل متوازن نیست (اختلاف: ' || v_discrepancy::text || ' ریال).'
            );
        END IF;
    END IF;

    -- --------------------------------------------------------------------------
    -- 5. ATOMIC PERSISTENCE (UPSERT & LEDGER REBUILD)
    -- --------------------------------------------------------------------------
    -- Insert or update invoice with strict ON CONFLICT WHERE tenant_id matches
    INSERT INTO public.invoices (
        id,
        tenant_id,
        invoice_number,
        type,
        status,
        template,
        date,
        due_date,
        client_id,
        client_name,
        items,
        subtotal,
        total_discount,
        total_tax,
        grand_total,
        amount_paid,
        remaining_amount,
        notes,
        terms,
        created_at,
        updated_at
    ) VALUES (
        v_inv_id,
        v_effective_tenant,
        p_invoice->>'invoiceNumber',
        v_inv_type,
        v_inv_status,
        COALESCE(p_invoice->>'template', 'modern'),
        p_invoice->>'date',
        p_invoice->>'dueDate',
        v_client_id,
        p_invoice->>'clientName',
        COALESCE(p_invoice->'items', '[]'::jsonb),
        COALESCE((p_invoice->>'subtotal')::numeric, 0),
        COALESCE((p_invoice->>'totalDiscount')::numeric, 0),
        COALESCE((p_invoice->>'totalTax')::numeric, 0),
        COALESCE((p_invoice->>'grandTotal')::numeric, 0),
        COALESCE((p_invoice->>'amountPaid')::numeric, 0),
        COALESCE((p_invoice->>'remainingAmount')::numeric, 0),
        p_invoice->>'notes',
        p_invoice->>'terms',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        invoice_number = EXCLUDED.invoice_number,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        template = EXCLUDED.template,
        date = EXCLUDED.date,
        due_date = EXCLUDED.due_date,
        client_id = EXCLUDED.client_id,
        client_name = EXCLUDED.client_name,
        items = EXCLUDED.items,
        subtotal = EXCLUDED.subtotal,
        total_discount = EXCLUDED.total_discount,
        total_tax = EXCLUDED.total_tax,
        grand_total = EXCLUDED.grand_total,
        amount_paid = EXCLUDED.amount_paid,
        remaining_amount = EXCLUDED.remaining_amount,
        notes = EXCLUDED.notes,
        terms = EXCLUDED.terms,
        updated_at = NOW()
    WHERE invoices.tenant_id = v_effective_tenant -- Atomic race-condition protection!
    RETURNING id INTO v_upserted_id;

    -- CRITICAL CHECK: Verify UPSERT actually affected a row
    -- If a conflict occurred with another tenant's row, the WHERE clause skipped the update,
    -- leaving v_upserted_id as NULL. We MUST reject immediately before deleting or inserting any ledger rows!
    IF v_upserted_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'errorCode', 'TENANT_MISMATCH_UPSERT_BLOCKED',
            'error', 'خطای امنیتی: به‌روزرسانی فاکتور به دلیل عدم تطابق شناسه مستأجر مسدود گردید. هیچ تغییری در دفتر کل اعمال نشد.'
        );
    END IF;

    -- Atomic Ledger Rebuild:
    -- Restricted to caller's verified tenant and exact reference of this invoice
    DELETE FROM public.accounting_entries 
    WHERE tenant_id = v_effective_tenant 
      AND (reference_id = v_inv_id::text OR reference_id = (p_invoice->>'invoiceNumber'));

    IF v_entry_count > 0 THEN
        FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
        LOOP
            INSERT INTO public.accounting_entries (
                id,
                tenant_id,
                document_number,
                date,
                description,
                account_code,
                account_title,
                debit,
                credit,
                client_id,
                client_name,
                project_tag,
                reference_id,
                created_at
            ) VALUES (
                COALESCE((v_entry->>'id')::uuid, gen_random_uuid()),
                v_effective_tenant, -- Always bound to verified tenant
                COALESCE(v_entry->>'documentNumber', p_invoice->>'invoiceNumber'),
                COALESCE(v_entry->>'date', p_invoice->>'date'),
                COALESCE(v_entry->>'description', 'ثبت سند فاکتور #' || (p_invoice->>'invoiceNumber')),
                v_entry->>'accountCode',
                v_entry->>'accountTitle',
                COALESCE((v_entry->>'debit')::numeric, 0),
                COALESCE((v_entry->>'credit')::numeric, 0),
                COALESCE(v_entry->>'clientId', v_client_id),
                COALESCE(v_entry->>'clientName', p_invoice->>'clientName'),
                v_entry->>'projectTag',
                v_inv_id::text, -- Strict verified reference
                NOW()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoiceId', v_inv_id,
        'tenantId', v_effective_tenant,
        'message', 'سند مالی و آرتیکل‌های دوبل با رعایت کامل توازن و اعتبارسنجی طرف‌حساب به صورت اتمیک ثبت شدند.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'errorCode', 'DB_TRANSACTION_ROLLBACK',
        'error', 'خطا در ثبت اتمیک سند: ' || SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_register_invoice_atomic(JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_register_invoice_atomic(JSONB, JSONB, TEXT) TO authenticated, service_role;
