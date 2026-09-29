-- ================================================================================
-- HABINO ACCOUNTING - OPTIMISTIC CONCURRENCY CONTROL (OCC) & VERSION VALIDATION
-- مایگریشن فعال‌سازی اعتبارسنجی همزمانی خوش‌بینانه و ستون نسخه در جداول مالی
-- ================================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'version') THEN
    ALTER TABLE public.invoices ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'updated_at') THEN
    ALTER TABLE public.invoices ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'version') THEN
    ALTER TABLE public.transactions ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'updated_at') THEN
    ALTER TABLE public.transactions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'version') THEN
    ALTER TABLE public.checks ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checks' AND column_name = 'updated_at') THEN
    ALTER TABLE public.checks ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'version') THEN
    ALTER TABLE public.clients ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'updated_at') THEN
    ALTER TABLE public.clients ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'version') THEN
    ALTER TABLE public.inventory_items ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'updated_at') THEN
    ALTER TABLE public.inventory_items ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_entries' AND column_name = 'version') THEN
    ALTER TABLE public.accounting_entries ADD COLUMN version INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounting_entries' AND column_name = 'updated_at') THEN
    ALTER TABLE public.accounting_entries ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_enforce_optimistic_concurrency()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.version IS NOT NULL AND OLD.version IS NOT NULL AND NEW.version <= OLD.version THEN
      RAISE EXCEPTION 'OCC_VERSION_CONFLICT: Record (%) has been modified concurrently by another session. Database version is %, attempted overwrite with version %.',
        OLD.id, OLD.version, NEW.version;
    END IF;

    IF NEW.version IS NULL OR NEW.version = OLD.version THEN
      NEW.version := OLD.version + 1;
    END IF;
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
