-- =========================================================================
-- هابینو حسابداری (Habino Accounting) - اسکریپت اصلاحی و هماهنگ‌سازی پایگاه داده
-- این اسکریپت ساختار جدول invoices و invoice_signatures را برای ماندگاری امضا
-- و همگام‌سازی ابری خودکار تثبیت و استانداردسازی می‌کند.
-- این اسکریپت به صورت کاملاً امن و Idempotent (چندبار اجراپذیر) طراحی شده است.
-- =========================================================================

-- ۱. اطمینان از وجود ستون‌های امضا و توکن در جدول invoices
DO $$ 
BEGIN
    -- ستون آدرس امضا
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signature_url') THEN
        ALTER TABLE public.invoices ADD COLUMN signature_url TEXT;
    END IF;

    -- ستون وضعیت امضا
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'is_signed') THEN
        ALTER TABLE public.invoices ADD COLUMN is_signed BOOLEAN DEFAULT FALSE;
    END IF;

    -- ستون تاریخ و زمان امضا
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signed_at') THEN
        ALTER TABLE public.invoices ADD COLUMN signed_at TIMESTAMPTZ;
    END IF;

    -- ستون توکن امن اشتراک‌گذاری عمومی
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'share_token') THEN
        ALTER TABLE public.invoices ADD COLUMN share_token TEXT;
    END IF;

    -- ستون متادیتای امضای دیجیتال
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signature_metadata') THEN
        ALTER TABLE public.invoices ADD COLUMN signature_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- ستون اطلاعات امضاکننده
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'signer_info') THEN
        ALTER TABLE public.invoices ADD COLUMN signer_info JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- ۲. ساخت شاخص‌های سرعت (Indexes) برای جستجوی فوری پیش‌فاکتور عمومی با توکن
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON public.invoices (share_token);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_signed ON public.invoices (tenant_id, is_signed);

-- ۳. ایجاد یا به‌روزرسانی جدول لاگ امضاها (invoice_signatures)
CREATE TABLE IF NOT EXISTS public.invoice_signatures (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    invoice_number TEXT,
    tenant_id TEXT DEFAULT 'tenant-main',
    signature_url TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'signed',
    signer_name TEXT,
    signer_national_id TEXT,
    signer_role TEXT DEFAULT 'client',
    verification_token TEXT,
    signature_hash TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_signatures_inv_id ON public.invoice_signatures (invoice_id);
CREATE INDEX IF NOT EXISTS idx_inv_signatures_token ON public.invoice_signatures (verification_token);
CREATE INDEX IF NOT EXISTS idx_inv_signatures_tenant ON public.invoice_signatures (tenant_id);

-- ۴. اعمال سیاست‌های امنیتی RLS برای دسترسی‌های عمومی و مستأجرین
ALTER TABLE public.invoice_signatures ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- سیاست خواندن امضاها
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_signatures' AND policyname = 'Allow read invoice signatures') THEN
        CREATE POLICY "Allow read invoice signatures" ON public.invoice_signatures
            FOR SELECT USING (true);
    END IF;

    -- سیاست ثبت امضا توسط کلاینت / مهمان
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_signatures' AND policyname = 'Allow insert invoice signatures') THEN
        CREATE POLICY "Allow insert invoice signatures" ON public.invoice_signatures
            FOR INSERT WITH CHECK (true);
    END IF;

    -- سیاست ویرایش امضا
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_signatures' AND policyname = 'Allow update invoice signatures') THEN
        CREATE POLICY "Allow update invoice signatures" ON public.invoice_signatures
            FOR UPDATE USING (true);
    END IF;
END $$;

-- ۵. فعال‌سازی ذخیره‌سازی باکت Storage برای فایل‌های تصویری امضا
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-signatures', 'invoice-signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- سیاست باکت استوریج
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public signature upload') THEN
        CREATE POLICY "Allow public signature upload" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id = 'invoice-signatures');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public signature read') THEN
        CREATE POLICY "Allow public signature read" ON storage.objects
            FOR SELECT USING (bucket_id = 'invoice-signatures');
    END IF;
END $$;
