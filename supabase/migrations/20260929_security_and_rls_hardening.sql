-- ==============================================================================
-- HABINO ACCOUNTING - PRODUCTION HARDENING & RLS ISOLATION MIGRATION (V2)
-- Migration: 20260929_security_and_rls_hardening.sql
-- Target Database: Supabase PostgreSQL 15+
-- Description: 
--   1. Zero-Trust current_tenant_id() (NO fallback to 'tenant-main', returns NULL for anon).
--   2. Drop ALL legacy permissive policies (including invoices_permissive_sync_policy USING (true)).
--   3. Strict authenticated tenant isolation on financial tables (Zero anon table access).
--   4. Cryptographically bound public invoice viewing & signature RPCs.
--   5. ACID atomic invoice registration RPC with caller tenant enforcement, Rule 1 (Mandatory Contact)
--      and Rule 9 (Double-entry balance) validation directly inside PostgreSQL.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. HARDEN current_tenant_id() FUNCTION (Eliminate dangerous default fallback)
-- ==============================================================================
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
    -- 1. Anonymous requests NEVER have a tenant context - strictly return NULL
    IF auth.role() = 'anon' THEN
        RETURN NULL;
    END IF;

    -- 2. Authenticated requests: extract tenant claim from verified JWT or session setting
    v_tenant := COALESCE(
        NULLIF(current_setting('app.current_tenant_id', true), ''),
        NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
        NULLIF(auth.jwt() ->> 'tenant_id', ''),
        NULLIF((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id'), '')
    );
    
    -- Returns verified tenant string or NULL if claim is absent. NEVER defaults to 'tenant-main'!
    RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated, service_role;

-- ==============================================================================
-- 2. PURGE ALL INSECURE & PERMISSIVE POLICIES ACROSS FINANCIAL TABLES
-- ==============================================================================
-- Drop dangerous USING (true) policies from old migrations that bypass RLS
DROP POLICY IF EXISTS "invoices_permissive_sync_policy" ON public.invoices;
DROP POLICY IF EXISTS "company_settings_permissive_access" ON public.company_settings;
DROP POLICY IF EXISTS "Public can view invoice with valid share token" ON public.invoices;
DROP POLICY IF EXISTS "allow_anon_invoices" ON public.invoices;
DROP POLICY IF EXISTS "allow_all_invoices" ON public.invoices;
DROP POLICY IF EXISTS "allow_anon_all" ON public.invoices;
DROP POLICY IF EXISTS "allow_all_accounting_entries" ON public.accounting_entries;
DROP POLICY IF EXISTS "allow_anon_entries" ON public.accounting_entries;
DROP POLICY IF EXISTS "allow_anon_checks" ON public.checks;
DROP POLICY IF EXISTS "allow_anon_transactions" ON public.transactions;
DROP POLICY IF EXISTS "allow_anon_clients" ON public.clients;

-- Drop legacy signature policies
DROP POLICY IF EXISTS "Vendors can view signatures in their tenant" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Vendors can insert signatures in their tenant" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Vendors can update signatures in their tenant" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Vendors can delete signatures in their tenant" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Public can view verified signature via token" ON public.invoice_signatures;
DROP POLICY IF EXISTS "Clients can submit signature via valid invoice token" ON public.invoice_signatures;

-- Drop previous tenant policies to recreate clean strict ones
DROP POLICY IF EXISTS "tenant_isolation_invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "tenant_isolation_invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "tenant_isolation_invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "tenant_isolation_invoices_delete" ON public.invoices;

-- ==============================================================================
-- 3. ENFORCE STRICT ROW LEVEL SECURITY (RLS) ON INVOICES & SIGNATURES
-- ==============================================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_signatures FORCE ROW LEVEL SECURITY;

-- INVOICES: Strictly authenticated tenant access (Zero anon access to raw table)
CREATE POLICY "tenant_isolation_invoices_select"
    ON public.invoices FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = public.current_tenant_id()
            OR public.current_tenant_id() = 'tenant-master-admin'
            OR public.current_tenant_id() = 'all'
        )
    );

CREATE POLICY "tenant_isolation_invoices_insert"
    ON public.invoices FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            tenant_id = public.current_tenant_id()
            OR public.current_tenant_id() = 'tenant-master-admin'
            OR public.current_tenant_id() = 'all'
        )
    );

CREATE POLICY "tenant_isolation_invoices_update"
    ON public.invoices FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = public.current_tenant_id()
            OR public.current_tenant_id() = 'tenant-master-admin'
            OR public.current_tenant_id() = 'all'
        )
    );

CREATE POLICY "tenant_isolation_invoices_delete"
    ON public.invoices FOR DELETE
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = public.current_tenant_id()
            OR public.current_tenant_id() = 'tenant-master-admin'
            OR public.current_tenant_id() = 'all'
        )
    );

-- INVOICE_SIGNATURES: Strictly authenticated tenant access
CREATE POLICY "tenant_isolation_signatures_select"
    ON public.invoice_signatures FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = public.current_tenant_id()
            OR public.current_tenant_id() = 'tenant-master-admin'
            OR public.current_tenant_id() = 'all'
        )
    );

CREATE POLICY "tenant_isolation_signatures_insert"
    ON public.invoice_signatures FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            tenant_id = public.current_tenant_id()
            OR public.current_tenant_id() = 'tenant-master-admin'
            OR public.current_tenant_id() = 'all'
        )
    );

CREATE POLICY "tenant_isolation_signatures_update"
    ON public.invoice_signatures FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = public.current_tenant_id()
            OR public.current_tenant_id() = 'tenant-master-admin'
            OR public.current_tenant_id() = 'all'
        )
    );

CREATE POLICY "tenant_isolation_signatures_delete"
    ON public.invoice_signatures FOR DELETE
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = public.current_tenant_id()
            OR public.current_tenant_id() = 'tenant-master-admin'
            OR public.current_tenant_id() = 'all'
        )
    );

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

    -- Record signature with verified tenant_id derived from the invoice record
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
-- 6. HARDENED ATOMIC INVOICE REGISTRATION RPC (ACID, Rule 1, Rule 9, Caller Tenant Check)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_register_invoice_atomic(
    p_invoice JSONB,
    p_entries JSONB DEFAULT '[]'::jsonb,
    p_tenant_id TEXT DEFAULT 'tenant-main'
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
    v_client_id TEXT;
    v_inv_type TEXT;
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
    v_discrepancy NUMERIC := 0;
BEGIN
    -- --------------------------------------------------------------------------
    -- 1. SECURITY & TENANT AUTHORIZATION CHECK
    -- --------------------------------------------------------------------------
    IF auth.role() = 'authenticated' THEN
        v_caller_tenant := COALESCE(
            auth.jwt() -> 'app_metadata' ->> 'tenant_id',
            auth.jwt() ->> 'tenant_id'
        );
        IF v_caller_tenant IS NULL THEN
            RETURN jsonb_build_object(
                'success', false, 
                'errorCode', 'AUTH_TENANT_MISSING',
                'error', 'خطای احراز هویت: شناسه سازمان در توکن کاربر موجود نیست.'
            );
        END IF;

        -- Prohibit cross-tenant injection unless super-admin
        IF v_caller_tenant <> 'all' AND v_caller_tenant <> 'tenant-master-admin' AND v_caller_tenant <> p_tenant_id THEN
            RETURN jsonb_build_object(
                'success', false, 
                'errorCode', 'TENANT_MISMATCH',
                'error', 'دسترسی غیرمجاز: امکان ثبت سند برای سازمان یا مستأجر دیگر مجاز نمی‌باشد.'
            );
        END IF;
    ELSIF auth.role() <> 'service_role' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'errorCode', 'UNAUTHENTICATED',
            'error', 'دسترسی غیرمجاز: ثبت سند نیازمند احراز هویت است.'
        );
    END IF;

    IF p_invoice IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'اطلاعات فاکتور ارسال نشده است.');
    END IF;

    -- --------------------------------------------------------------------------
    -- 2. ENFORCE RULE 1: MANDATORY CONTACT (الزام وجود طرف‌حساب)
    -- --------------------------------------------------------------------------
    v_client_id := COALESCE(p_invoice->>'clientId', p_invoice->>'client_id');
    v_inv_type := COALESCE(p_invoice->>'type', 'sale');

    -- Proforma inquiry can be neutral, but all commercial invoices MUST have client_id
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
    -- 3. ENFORCE RULE 9: DOUBLE-ENTRY BALANCE (توازن بدهکار = بستانکار در دفتر کل)
    -- --------------------------------------------------------------------------
    IF p_entries IS NOT NULL AND jsonb_array_length(p_entries) > 0 THEN
        FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
        LOOP
            v_total_debit := v_total_debit + COALESCE((v_entry->>'debit')::numeric, 0);
            v_total_credit := v_total_credit + COALESCE((v_entry->>'credit')::numeric, 0);

            -- Validate entry account code
            IF (v_entry->>'accountCode') IS NULL OR trim(v_entry->>'accountCode') = '' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'errorCode', 'MISSING_ACCOUNT_CODE',
                    'error', 'کد حساب در یکی از ردیف‌های دفتر کل مشخص نشده است.'
                );
            END IF;
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
    -- 4. ATOMIC DATABASE PERSISTENCE
    -- --------------------------------------------------------------------------
    v_inv_id := COALESCE((p_invoice->>'id')::uuid, gen_random_uuid());

    -- Insert or update invoice
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
        p_tenant_id,
        p_invoice->>'invoiceNumber',
        v_inv_type,
        COALESCE(p_invoice->>'status', 'pending'),
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
        status = EXCLUDED.status,
        client_id = EXCLUDED.client_id,
        client_name = EXCLUDED.client_name,
        items = EXCLUDED.items,
        grand_total = EXCLUDED.grand_total,
        updated_at = NOW();

    -- Insert ledger entries atomically if provided
    IF p_entries IS NOT NULL AND jsonb_array_length(p_entries) > 0 THEN
        -- Remove existing entries for this invoice to guarantee idempotency and avoid duplicates
        DELETE FROM public.accounting_entries WHERE reference_id = v_inv_id::text;

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
                p_tenant_id,
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
                v_inv_id::text,
                NOW()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoiceId', v_inv_id,
        'message', 'سند مالی و آرتیکل‌های دوبل با رعایت کامل توازن و اعتبارسنجی طرف‌حساب به صورت اتمیک ثبت شدند.'
    );
EXCEPTION WHEN OTHERS THEN
    -- Any unexpected SQL error triggers full rollback
    RETURN jsonb_build_object(
        'success', false,
        'errorCode', 'DB_TRANSACTION_ROLLBACK',
        'error', 'خطا در ثبت اتمیک سند: ' || SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_register_invoice_atomic(JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_register_invoice_atomic(JSONB, JSONB, TEXT) TO authenticated, service_role;
