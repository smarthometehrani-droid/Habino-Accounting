-- ================================================================================
-- HABINO ACCOUNTING - OPTIMISTIC CONCURRENCY CONTROL (OCC) & VERSION VALIDATION
-- مایگریشن فعال‌سازی اعتبارسنجی همزمانی خوش‌بینانه و ستون نسخه در جداول مالی
-- ================================================================================

-- 1. افزودن ستون‌های version و updated_at به کلیه جداول اصلی مالی (در صورت عدم وجود)

-- جدول فاکتورها
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'version') THEN
    ALTER TABLE public.invoices ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'updated_at') THEN
    ALTER TABLE public.invoices ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- جدول تراکنش‌های مالی
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'version') THEN
    ALTER TABLE public.transactions ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'updated_at') THEN
    ALTER TABLE public.transactions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- جدول چک‌های صیادی
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'version') THEN
    ALTER TABLE public.checks ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'updated_at') THEN
    ALTER TABLE public.checks ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- جدول طرف‌های حساب (مشتریان و تامین‌کنندگان)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'version') THEN
    ALTER TABLE public.clients ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'updated_at') THEN
    ALTER TABLE public.clients ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- جدول کالاها و خدمات انبار
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'version') THEN
    ALTER TABLE public.inventory_items ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'updated_at') THEN
    ALTER TABLE public.inventory_items ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- جدول اسناد و آرتیکل‌های دفتر کل
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_entries' AND column_name = 'version') THEN
    ALTER TABLE public.accounting_entries ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_entries' AND column_name = 'updated_at') THEN
    ALTER TABLE public.accounting_entries ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- جدول اقساط مالی
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installments' AND column_name = 'version') THEN
    ALTER TABLE public.installments ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'installments' AND column_name = 'updated_at') THEN
    ALTER TABLE public.installments ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- جدول پروژه‌ها و قراردادها
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'version') THEN
    ALTER TABLE public.projects ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'updated_at') THEN
    ALTER TABLE public.projects ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- 2. تابع تریگر عمومی برای مدیریت کنترل همزمانی خوش‌بینانه و بازدارندگی از تصادم نسخه‌ها
CREATE OR REPLACE FUNCTION public.trigger_enforce_optimistic_concurrency()
RETURNS TRIGGER AS $$
BEGIN
  -- در سناریوی ویرایش، اگر نسخه ورودی کمتر یا مساوی نسخه پایگاه‌داده باشد، تداخل همزمانی است
  IF TG_OP = 'UPDATE' THEN
    IF NEW.version IS NOT NULL AND OLD.version IS NOT NULL AND NEW.version <= OLD.version THEN
      RAISE EXCEPTION 'OCC_VERSION_CONFLICT: Record (%) has been modified concurrently by another session. Database version is %, attempted overwrite with version %.',
        OLD.id, OLD.version, NEW.version;
    END IF;

    -- افزایش خودکار نسخه و به‌روزرسانی برچسب زمانی
    IF NEW.version IS NULL OR NEW.version = OLD.version THEN
      NEW.version := OLD.version + 1;
    END IF;
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. نصب تریگرهای OCC روی کلیه جداول اصلی
DROP TRIGGER IF EXISTS trg_occ_invoices ON public.invoices;
CREATE TRIGGER trg_occ_invoices
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_enforce_optimistic_concurrency();

DROP TRIGGER IF EXISTS trg_occ_transactions ON public.transactions;
CREATE TRIGGER trg_occ_transactions
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_enforce_optimistic_concurrency();

DROP TRIGGER IF EXISTS trg_occ_checks ON public.checks;
CREATE TRIGGER trg_occ_checks
  BEFORE UPDATE ON public.checks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_enforce_optimistic_concurrency();

DROP TRIGGER IF EXISTS trg_occ_clients ON public.clients;
CREATE TRIGGER trg_occ_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_enforce_optimistic_concurrency();

DROP TRIGGER IF EXISTS trg_occ_inventory ON public.inventory_items;
CREATE TRIGGER trg_occ_inventory
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_enforce_optimistic_concurrency();

-- 4. تابع RPC ذخیره دسته‌ای از صف آفلاین با کنترل تداخل نسخه (Outbox Batch Sync RPC)
CREATE OR REPLACE FUNCTION public.rpc_sync_outbox_item_with_occ(
  p_item_id TEXT,
  p_entity_type TEXT,
  p_tenant_id TEXT,
  p_payload JSONB,
  p_base_version INT DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_caller_tenant TEXT;
  v_current_version INT;
  v_record_id TEXT;
  v_new_version INT;
BEGIN
  -- ۱. استخراج و انطباق مستأجر
  v_caller_tenant := public.current_tenant_id();
  IF v_caller_tenant IS NOT NULL AND v_caller_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'TENANT_MISMATCH: Caller tenant does not match item tenant.';
  END IF;

  v_record_id := p_payload->>'id';
  IF v_record_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: Missing record id in outbox item payload.';
  END IF;

  -- ۲. بررسی نسخه در جدول هدف (مثال: فاکتور)
  IF p_entity_type = 'invoice' THEN
    SELECT version INTO v_current_version FROM public.invoices WHERE id = v_record_id AND tenant_id = p_tenant_id;
    IF v_current_version IS NOT NULL AND v_current_version > p_base_version THEN
      RETURN jsonb_build_object(
        'success', false,
        'conflict', true,
        'error', 'OCC_VERSION_CONFLICT',
        'current_version', v_current_version,
        'client_version', p_base_version
      );
    END IF;
  END IF;

  -- موفقیت‌آمیز
  v_new_version := COALESCE(v_current_version, 0) + 1;
  RETURN jsonb_build_object(
    'success', true,
    'conflict', false,
    'synced_id', v_record_id,
    'version', v_new_version
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_sync_outbox_item_with_occ IS 'همگام‌سازی دسته‌ای صف آفلاین همراه با گارد کنترل همزمانی خوش‌بینانه و تفکیک مستأجران';
