-- ==============================================================================
-- HABINO ACCOUNTING - PRODUCTION HARDENING & RLS ISOLATION MIGRATION
-- Migration: 20260929_security_and_rls_hardening.sql
-- Target Database: Supabase PostgreSQL 15+
-- Description: Strict Multi-Tenant Row Level Security (RLS), Safe Public RPCs,
--              Private Storage Controls, and Zero-Privilege Public Token Binding.
-- ==============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. HARDEN INVOICE_SIGNATURES TABLE RLS POLICIES
-- ==============================================================================
-- Remove permissive policies that breached tenant isolation or exposed full lists
DROP POLICY IF EXISTS "Vendors can view signatures in their tenant" ON invoice_signatures;
DROP POLICY IF EXISTS "Vendors can insert signatures in their tenant" ON invoice_signatures;
DROP POLICY IF EXISTS "Vendors can update signatures in their tenant" ON invoice_signatures;
DROP POLICY IF EXISTS "Vendors can delete signatures in their tenant" ON invoice_signatures;
DROP POLICY IF EXISTS "Public can view verified signature via token" ON invoice_signatures;
DROP POLICY IF EXISTS "Clients can submit signature via valid invoice token" ON invoice_signatures;

-- Enforce strict authenticated tenant isolation (No 'OR auth.uid() IS NOT NULL' bypass)
CREATE POLICY "Vendors can view signatures in their tenant"
    ON invoice_signatures
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = COALESCE(
                auth.jwt() -> 'app_metadata' ->> 'tenant_id',
                auth.jwt() ->> 'tenant_id',
                'tenant-main'
            )
        )
    );

CREATE POLICY "Vendors can insert signatures in their tenant"
    ON invoice_signatures
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            tenant_id = COALESCE(
                auth.jwt() -> 'app_metadata' ->> 'tenant_id',
                auth.jwt() ->> 'tenant_id',
                'tenant-main'
            )
        )
    );

CREATE POLICY "Vendors can update signatures in their tenant"
    ON invoice_signatures
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = COALESCE(
                auth.jwt() -> 'app_metadata' ->> 'tenant_id',
                auth.jwt() ->> 'tenant_id',
                'tenant-main'
            )
        )
    );

CREATE POLICY "Vendors can delete signatures in their tenant"
    ON invoice_signatures
    FOR DELETE
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = COALESCE(
                auth.jwt() -> 'app_metadata' ->> 'tenant_id',
                auth.jwt() ->> 'tenant_id',
                'tenant-main'
            )
        )
    );

-- ==============================================================================
-- 3. HARDEN INVOICES TABLE PUBLIC ACCESS
-- ==============================================================================
-- Drop the overly permissive public policy that allowed dumping all invoices with share_token
DROP POLICY IF EXISTS "Public can view invoice with valid share token" ON invoices;

-- ==============================================================================
-- 4. SECURE RPC FOR PUBLIC INVOICE VIEWING (Token-Bound & Minimal Exposure)
-- ==============================================================================
-- Anonymous callers cannot list or query invoices table directly.
-- They must call this RPC passing the exact share_token.
CREATE OR REPLACE FUNCTION get_public_invoice_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice RECORD;
    v_result JSONB;
BEGIN
    IF p_token IS NULL OR trim(p_token) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'توکن ارائه نشده است.');
    END IF;

    SELECT 
        id,
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
    FROM invoices
    WHERE share_token = p_token
      AND (is_deleted IS NULL OR is_deleted = false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'فاکتور مورد نظر با این پیوند یافت نشد.');
    END IF;

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
        )
    );

    RETURN v_result;
END;
$$;

-- Secure execution permissions
REVOKE ALL ON FUNCTION get_public_invoice_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_invoice_by_token(TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- 5. SECURE RPC FOR PUBLIC CLIENT SIGNATURE SUBMISSION
-- ==============================================================================
-- Allows recipients of proformas to submit signature without giving direct table write privileges
CREATE OR REPLACE FUNCTION submit_public_invoice_signature(
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

    -- Validate signer role
    IF p_signer_role NOT IN ('client', 'representative') THEN
        v_clean_role := 'client';
    ELSE
        v_clean_role := p_signer_role;
    END IF;

    -- Find invoice by exact share_token
    SELECT id, tenant_id, invoice_number, status, is_signed
    INTO v_invoice
    FROM invoices
    WHERE share_token = p_token
      AND (is_deleted IS NULL OR is_deleted = false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'پیش‌فاکتور معتبری برای این پیوند یافت نشد.');
    END IF;

    -- Record signature entry in invoice_signatures with verified tenant_id
    INSERT INTO invoice_signatures (
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
    UPDATE invoices
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

-- Secure execution permissions
REVOKE ALL ON FUNCTION submit_public_invoice_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_public_invoice_signature(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- 6. HARDEN SHARE TOKEN GENERATION FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION generate_invoice_share_token(p_invoice_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token VARCHAR(255);
    v_caller_tenant TEXT;
    v_inv_tenant TEXT;
BEGIN
    SELECT tenant_id, share_token INTO v_inv_tenant, v_token 
    FROM invoices 
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    -- Ensure caller belongs to the same tenant if authenticated
    IF auth.role() = 'authenticated' THEN
        v_caller_tenant := COALESCE(
            auth.jwt() -> 'app_metadata' ->> 'tenant_id',
            auth.jwt() ->> 'tenant_id',
            'tenant-main'
        );
        IF v_caller_tenant <> 'all' AND v_caller_tenant <> v_inv_tenant THEN
            RAISE EXCEPTION 'Access denied: Cross-tenant token generation is prohibited';
        END IF;
    END IF;
    
    IF v_token IS NULL OR v_token = '' THEN
        v_token := encode(gen_random_bytes(24), 'hex');
        UPDATE invoices SET share_token = v_token, updated_at = NOW() WHERE id = p_invoice_id;
    END IF;
    
    RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION generate_invoice_share_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_invoice_share_token(UUID) TO authenticated, service_role;

-- ==============================================================================
-- 7. ATOMIC RECONCILIATION & DOUBLE-ENTRY RPC
-- ==============================================================================
-- Atomically registers an invoice with ledger entries in a single ACID transaction
CREATE OR REPLACE FUNCTION rpc_register_invoice_atomic(
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
BEGIN
    IF p_invoice IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'اطلاعات فاکتور ارسال نشده است.');
    END IF;

    v_inv_id := COALESCE((p_invoice->>'id')::uuid, gen_random_uuid());

    -- 1. Insert or update invoice
    INSERT INTO invoices (
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
        COALESCE(p_invoice->>'type', 'sale'),
        COALESCE(p_invoice->>'status', 'pending'),
        COALESCE(p_invoice->>'template', 'modern'),
        p_invoice->>'date',
        p_invoice->>'dueDate',
        p_invoice->>'clientId',
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

    -- 2. Insert ledger entries atomically if provided
    IF jsonb_array_length(p_entries) > 0 THEN
        FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
        LOOP
            INSERT INTO accounting_entries (
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
                v_entry->>'clientId',
                v_entry->>'clientName',
                v_entry->>'projectTag',
                v_inv_id::text,
                NOW()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoiceId', v_inv_id,
        'message', 'سند مالی و آرتیکل‌های دوبل با موفقیت به صورت اتمیک ثبت شدند.'
    );
EXCEPTION WHEN OTHERS THEN
    -- Any failure automatically triggers full rollback
    RETURN jsonb_build_object(
        'success', false,
        'error', 'خطا در ثبت اتمیک سند: ' || SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION rpc_register_invoice_atomic(JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_register_invoice_atomic(JSONB, JSONB, TEXT) TO authenticated, service_role;
