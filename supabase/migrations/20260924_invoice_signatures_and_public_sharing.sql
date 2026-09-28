-- ==============================================================================
-- HABINO ACCOUNTING - PHYSICAL SIGNATURE & PROFORMA APPROVAL MODULE
-- Migration: 20260924_invoice_signatures_and_public_sharing.sql
-- Target Database: Supabase PostgreSQL 15+
-- Description: Physical signature metadata, cryptographic non-repudiation,
--              Row Level Security (RLS), and Public Sharing Tokens.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ALTER INVOICES TABLE (Add Signature & Public Share Attributes)
-- ==============================================================================
ALTER TABLE IF EXISTS invoices 
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signer_info JSONB DEFAULT '{}'::jsonb;

-- Create fast lookup index on share_token for public read access
CREATE INDEX IF NOT EXISTS idx_invoices_share_token 
  ON invoices (share_token) 
  WHERE share_token IS NOT NULL;

-- ==============================================================================
-- 3. CREATE INVOICE_SIGNATURES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoice_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'tenant-main',
    signature_url TEXT NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'signed' CHECK (status IN ('pending', 'signed', 'rejected')),
    signer_name VARCHAR(255),
    signer_national_id VARCHAR(50),
    signer_role VARCHAR(50) DEFAULT 'vendor' CHECK (signer_role IN ('vendor', 'client', 'representative')),
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    signature_hash VARCHAR(128), -- SHA-256 integrity hash of invoice totals + timestamp
    metadata JSONB DEFAULT '{}'::jsonb, -- Guild details, canvas dimensions, stylus pressure telemetry
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_signatures_invoice_id ON invoice_signatures (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_signatures_tenant_id ON invoice_signatures (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_signatures_token ON invoice_signatures (verification_token);
CREATE INDEX IF NOT EXISTS idx_invoice_signatures_status ON invoice_signatures (status);

-- Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION update_invoice_signature_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_signatures_updated_at ON invoice_signatures;
CREATE TRIGGER trg_invoice_signatures_updated_at
    BEFORE UPDATE ON invoice_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_signature_timestamp();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ==============================================================================

-- Enable RLS on invoice_signatures
ALTER TABLE invoice_signatures ENABLE ROW LEVEL SECURITY;

-- 4.1 Policy for Vendors / Business Owners (Full Management within Tenant)
-- Allows authenticated vendor users to SELECT, INSERT, UPDATE, and DELETE signatures for their tenant
DROP POLICY IF EXISTS "Vendors can view signatures in their tenant" ON invoice_signatures;
CREATE POLICY "Vendors can view signatures in their tenant"
    ON invoice_signatures
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
            OR auth.uid() IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Vendors can insert signatures in their tenant" ON invoice_signatures;
CREATE POLICY "Vendors can insert signatures in their tenant"
    ON invoice_signatures
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND (
            tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
            OR auth.uid() IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Vendors can update signatures in their tenant" ON invoice_signatures;
CREATE POLICY "Vendors can update signatures in their tenant"
    ON invoice_signatures
    FOR UPDATE
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
            OR auth.uid() IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "Vendors can delete signatures in their tenant" ON invoice_signatures;
CREATE POLICY "Vendors can delete signatures in their tenant"
    ON invoice_signatures
    FOR DELETE
    USING (
        auth.role() = 'authenticated' AND (
            tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
            OR auth.uid() IS NOT NULL
        )
    );

-- 4.2 Public Access for Clients with Valid Verification / Share Token
-- Allows recipients (customers) to view the signature verification data via the public token without login
DROP POLICY IF EXISTS "Public can view verified signature via token" ON invoice_signatures;
CREATE POLICY "Public can view verified signature via token"
    ON invoice_signatures
    FOR SELECT
    USING (
        verification_token IS NOT NULL
    );

-- 4.3 Allow Public Clients to Submit Proforma Signature with Valid Share Token
-- Allows the customer to approve/sign a proforma invoice when visiting the public link
DROP POLICY IF EXISTS "Clients can submit signature via valid invoice token" ON invoice_signatures;
CREATE POLICY "Clients can submit signature via valid invoice token"
    ON invoice_signatures
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_signatures.invoice_id
              AND (invoices.share_token IS NOT NULL OR invoices.id::text = invoice_signatures.verification_token)
        )
    );

-- ==============================================================================
-- 5. PUBLIC ACCESS POLICIES FOR INVOICES (Read-Only via Share Token)
-- ==============================================================================
-- Allow anonymous users to view an invoice if they have the exact share_token
DROP POLICY IF EXISTS "Public can view invoice with valid share token" ON invoices;
CREATE POLICY "Public can view invoice with valid share token"
    ON invoices
    FOR SELECT
    USING (
        share_token IS NOT NULL
    );

-- ==============================================================================
-- 6. SUPABASE STORAGE BUCKET: invoice-signatures
-- ==============================================================================
-- Create the storage bucket if not already present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoice-signatures',
    'invoice-signatures',
    true,
    5242880, -- 5 MB max limit
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Storage Bucket RLS Policies
-- Authenticated users (Vendors) can upload and manage signature assets
DROP POLICY IF EXISTS "Authenticated vendors can upload invoice signatures" ON storage.objects;
CREATE POLICY "Authenticated vendors can upload invoice signatures"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'invoice-signatures'
    );

-- Public read access for invoice signature images (renders on public invoice page and PDF)
DROP POLICY IF EXISTS "Public can view invoice signature images" ON storage.objects;
CREATE POLICY "Public can view invoice signature images"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'invoice-signatures'
    );

-- ==============================================================================
-- 7. HELPER RPC FUNCTION: Generate or Retrieve Share Token
-- ==============================================================================
CREATE OR REPLACE FUNCTION generate_invoice_share_token(p_invoice_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_token VARCHAR(255);
BEGIN
    SELECT share_token INTO v_token FROM invoices WHERE id = p_invoice_id;
    
    IF v_token IS NULL OR v_token = '' THEN
        v_token := encode(gen_random_bytes(24), 'hex');
        UPDATE invoices SET share_token = v_token, updated_at = NOW() WHERE id = p_invoice_id;
    END IF;
    
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
