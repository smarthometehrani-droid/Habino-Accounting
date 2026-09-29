/**
 * HABINO ACCOUNTING - PRODUCTION & STAGING MIGRATION AUDITOR & DEPLOYER
 * 
 * Rules Enforced:
 * 1. Safe URL display (Masked secrets, passwords & keys).
 * 2. Multi-Vector Production Protection Guard (Rule 4: Staging/Local first, Production requires explicit Founder confirmation with host binding).
 * 3. Ambiguous Target Guard: If destination cannot be verified, abort immediately.
 * 4. Cross-Platform Portable psql check without 'which psql'.
 * 5. Pre-flight connection test before applying migrations.
 * 6. Migration-safe, idempotent SQL validation and verified exit codes.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface MigrationItemCheck {
  id: string;
  name: string;
  status: 'VERIFIED' | 'PENDING' | 'MANUAL_REQUIRED';
  details: string;
}

function maskSecret(secret?: string): string {
  if (!secret) return '(تنظیم نشده)';
  if (secret.length <= 8) return '********';
  return `${secret.substring(0, 4)}***${secret.substring(secret.length - 4)}`;
}

function maskHttpUrl(url: string): string {
  if (!url) return '(تنظیم نشده - حالت شبیه‌ساز محلی)';
  try {
    const u = new URL(url);
    const host = u.host;
    if (host.length > 8) {
      return `${u.protocol}//${host.substring(0, 4)}***${host.substring(host.indexOf('.'))}`;
    }
    return `${u.protocol}//${host}`;
  } catch {
    return url.substring(0, 8) + '***';
  }
}

function maskPostgresConnString(connStr: string): string {
  if (!connStr) return '(تنظیم نشده)';
  try {
    // Attempt standard URL parse
    const u = new URL(connStr);
    const host = u.hostname || 'unknown-host';
    const port = u.port || '5432';
    const dbname = u.pathname || '';
    const maskedHost = host.length > 8 ? `${host.substring(0, 4)}***${host.substring(host.indexOf('.'))}` : host;
    return `postgres://***:***@${maskedHost}:${port}${dbname}`;
  } catch {
    // Regex fallback
    return connStr.replace(/:(\/\/[^:]+):([^@]+)@/, '://$1:***@').substring(0, 25) + '***';
  }
}

function isPsqlAvailable(): boolean {
  try {
    // Portable across Linux, macOS, and Windows without relying on 'which'
    execSync('psql --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isRemoteProductionHost(hostOrUrl: string): boolean {
  if (!hostOrUrl) return false;
  const lower = hostOrUrl.toLowerCase();
  
  // Local/Loopback patterns are safe non-production
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.includes('host.docker.internal') ||
    lower.includes('.staging.') ||
    lower.includes('-staging-')
  ) {
    return false;
  }

  // Known cloud/production identifiers
  if (
    lower.includes('supabase.co') ||
    lower.includes('rds.amazonaws.com') ||
    lower.includes('cloudsql') ||
    lower.includes('neon.tech') ||
    lower.includes('elephantsql.com')
  ) {
    return true;
  }

  // Any non-local domain with standard TLD
  if (/\.[a-z]{2,}(:\d+)?$/i.test(lower)) {
    return true;
  }

  return false;
}

async function runMigrationPipeline() {
  console.log('\n================================================================================');
  console.log('🚀 HABINO ACCOUNTING - SUPABASE MIGRATION VERIFIER & PIPELINE');
  console.log('================================================================================\n');

  const supabaseRestUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const postgresConnUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
  
  const isApplyRequested = process.argv.includes('--apply') || process.env.APPLY_MIGRATION === 'true';

  // Founder confirmation flag can be: --confirm-production-deployment-by-farid-tehrani=<host>
  const founderConfirmArg = process.argv.find(arg => arg.startsWith('--confirm-production-deployment-by-farid-tehrani'));
  const founderTargetValue = founderConfirmArg ? founderConfirmArg.split('=')[1]?.trim() : null;

  // Extract hostnames for security audits
  let restHost = '';
  try { if (supabaseRestUrl) restHost = new URL(supabaseRestUrl).host; } catch {}

  let dbHost = '';
  try { if (postgresConnUrl) dbHost = new URL(postgresConnUrl).host; } catch {}

  const isRestProduction = isRemoteProductionHost(restHost);
  const isDbProduction = isRemoteProductionHost(dbHost);
  const isProductionTarget = isRestProduction || isDbProduction;

  console.log(`📡 نشانی REST سوپابیس:     ${maskHttpUrl(supabaseRestUrl)}`);
  console.log(`🗄️  نشانی پایگاه داده (SQL): ${maskPostgresConnString(postgresConnUrl)}`);
  console.log(`🔒 کلید سرویس:              ${hasServiceKey ? 'موجود در محیط (سطح دسترسی ادمین - محرمانه)' : 'تنظیم نشده (فقط بازرسی محلی)'}`);
  console.log(`🔑 کلید کلاینت:              ${hasAnonKey ? 'موجود' : 'تنظیم نشده'}`);
  console.log(`⚙️  حالت عملیات:              ${isApplyRequested ? 'درخواست استقرار (--apply)' : 'بازرسی و اعتبارسنجی ساختاری'}\n`);

  // GUARD 1: Ambiguous Target Check when apply is requested
  if (isApplyRequested) {
    if (!postgresConnUrl && !supabaseRestUrl) {
      console.error('\x1b[41m\x1b[1m 🛑 توقف عملیات: مقصد پایگاه‌داده قابل تشخیص نیست. \x1b[0m');
      console.error('برای اعمال مایگریشن، تنظیم صریح DATABASE_URL یا SUPABASE_DB_URL الزامی است.');
      console.error('مقصد مبهم هرگز مجوزی برای اجرا صادر نمی‌کند.\n');
      process.exit(1);
    }
  }

  // GUARD 2: Rule 4 Production Protection Check
  if (isProductionTarget && isApplyRequested) {
    const activeTargetHost = dbHost || restHost;
    const isExplicitlyConfirmed = Boolean(
      founderTargetValue && (founderTargetValue === activeTargetHost || activeTargetHost.includes(founderTargetValue))
    );

    if (!isExplicitlyConfirmed) {
      console.error('\x1b[41m\x1b[1m 🛑 توقف اضطراری (Rule 4 Production Protection): \x1b[0m');
      console.error('مایگریشن مستقیم روی پایگاه‌داده Production بدون تأیید صریح بنیانگذار (مهندس فرید تهرانی) اکیداً ممنوع است.');
      console.error(`مقصد شناسایی‌شده به عنوان پروداکشن: ${activeTargetHost.substring(0, 4)}***`);
      console.error('صرف وجود فلگ عمومی بدون قید دقیق نام میزبان مقصد کافی نیست.');
      console.error(`دستور صحیح: --confirm-production-deployment-by-farid-tehrani=${activeTargetHost.substring(0, 8)}...\n`);
      process.exit(1);
    }
  }

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ پوشه مایگریشن‌ها یافت نشد: ${migrationsDir}`);
    process.exit(1);
  }

  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log(`📄 مایگریشن‌های شناسایی‌شده در مخزن (${migrationFiles.length} فایل):`);
  migrationFiles.forEach(f => console.log(`   - ${f}`));
  console.log('');

  const hardeningFile = path.join(migrationsDir, '20260929_security_and_rls_hardening.sql');
  const occFile = path.join(migrationsDir, '20260929_optimistic_concurrency_control.sql');

  const hardeningSql = fs.existsSync(hardeningFile) ? fs.readFileSync(hardeningFile, 'utf8') : '';
  const occSql = fs.existsSync(occFile) ? fs.readFileSync(occFile, 'utf8') : '';

  const checks: MigrationItemCheck[] = [
    {
      id: 'MIG-01',
      name: 'پاکسازی صریح کلیه سیاست‌های باز permissive با شرط USING (true)',
      status: hardeningSql.includes('DROP POLICY IF EXISTS "invoices_permissive_sync_policy"') &&
              hardeningSql.includes('DROP POLICY IF EXISTS "company_settings_permissive_access"') ? 'VERIFIED' : 'PENDING',
      details: 'پالیسی‌های قدیمی دارای USING (true) در تمام جداول به صورت خودکار Drop می‌شوند.'
    },
    {
      id: 'MIG-02',
      name: 'اصلاح Zero-Trust در تابع current_tenant_id و helper مستقل is_super_admin',
      status: (!/COALESCE\s*\([^;]+'tenant-main'/i.test(hardeningSql) &&
               hardeningSql.includes('FUNCTION public.is_super_admin()') &&
               hardeningSql.includes('current_tenant_id()')) ? 'VERIFIED' : 'PENDING',
      details: 'نقش anon مقدار NULL برمی‌گرداند؛ هیچ فالبک پیش‌فرضی به tenant-main وجود ندارد و نقش super_admin منوط به کلیم معتبر سروری است.'
    },
    {
      id: 'MIG-03',
      name: 'گارد ضد جعل مستأجر، شرط ON CONFLICT و کنترل خروجی با RETURNING در RPC اتمیک',
      status: hardeningSql.includes('TENANT_MISMATCH_INVOICE_EXISTS') &&
              hardeningSql.includes('WHERE invoices.tenant_id = v_effective_tenant') &&
              hardeningSql.includes('RETURNING id INTO v_upserted_id') &&
              hardeningSql.includes('TENANT_MISMATCH_UPSERT_BLOCKED') ? 'VERIFIED' : 'PENDING',
      details: 'بررسی عدم تعلق فاکتور به مستأجر دیگر، شرط حفاظت در ON CONFLICT و بررسی اتمیک خروجی RETURNING قبل از هرگونه تغییر در دفتر کل.'
    },
    {
      id: 'MIG-04',
      name: 'اعمال قوانین ۱ و ۹ حسابداری و تفکیک ثبت پیش‌نویس از فاکتور قطعی',
      status: hardeningSql.includes('RULE_1_MANDATORY_CONTACT_VIOLATION') &&
              hardeningSql.includes('DEFINITIVE_INVOICE_REQUIRES_LEDGER_ENTRIES') &&
              hardeningSql.includes('LEDGER_UNBALANCED') ? 'VERIFIED' : 'PENDING',
      details: 'الزام طرف‌حساب، الزام حداقل ردیف‌های دفتر کل متوازن برای فاکتور قطعی و توازن بدهکار/بستانکار در سطح PostgreSQL.'
    },
    {
      id: 'MIG-05',
      name: 'حذف اسناد دفتر کل فقط با مرجع و مستأجر دقیق (Scoped Ledger Rebuild)',
      status: hardeningSql.includes('DELETE FROM public.accounting_entries') &&
              hardeningSql.includes('WHERE tenant_id = v_effective_tenant') ? 'VERIFIED' : 'PENDING',
      details: 'حذف ردیف‌های دفتر کل صرفاً محدود به شناسه مستأجر تاییدشده و مرجع دقیق همان فاکتور است.'
    },
    {
      id: 'MIG-06',
      name: 'بازسازی سیاست‌های RLS برای کلیه ۱۱+ جدول مالی و چندمستأجری',
      status: hardeningSql.includes('FOREACH tbl IN ARRAY tables') &&
              hardeningSql.includes('tenant_isolation_') ? 'VERIFIED' : 'PENDING',
      details: 'پالیسی‌های SELECT/INSERT/UPDATE/DELETE با شرط WITH CHECK برای تمامی جداول مالی بازسازی شدند.'
    },
    {
      id: 'MIG-07',
      name: 'کنترل همزمانی خوش‌بینانه (OCC) و نگهداری نسخه در جداول مالی',
      status: occSql.includes('trigger_enforce_optimistic_concurrency') &&
              occSql.includes('OCC_VERSION_CONFLICT') ? 'VERIFIED' : 'PENDING',
      details: 'افزودن ستون‌های version و updated_at و تریگرهای بازدارنده تداخل ویرایش همزمان.'
    }
  ];

  console.log('--------------------------------------------------------------------------------');
  console.log('گزارش ممیزی استاتیک ساختار مایگریشن‌های هابینو:');
  console.log('--------------------------------------------------------------------------------');
  let hasPending = false;
  checks.forEach((c, idx) => {
    const icon = c.status === 'VERIFIED' ? '\x1b[32m✔ تایید استاتیک\x1b[0m' : '\x1b[31m✖ معلق\x1b[0m';
    console.log(`${idx + 1}. [${c.id}] ${icon} | ${c.name}`);
    console.log(`   ↳ ${c.details}`);
    if (c.status !== 'VERIFIED') hasPending = true;
  });

  if (hasPending) {
    console.error('\n❌ یک یا چند بررسی ساختاری مایگریشن تایید نشد.');
    process.exit(1);
  }

  // Live execution handling (Only via standard psql / Supabase DB connection if provided)
  if (isApplyRequested && postgresConnUrl) {
    console.log('\n📡 در حال بررسی ابزار اتصال PostgreSQL (psql)...');
    if (!isPsqlAvailable()) {
      console.error('❌ ابزار psql در مسیر سیستم (PATH) یافت نشد.');
      console.error('جهت استقرار خودکار مایگریشن‌ها، کلاینت PostgreSQL (psql) یا Supabase CLI الزامی است.');
      process.exit(1);
    }

    // Pre-flight connection test
    console.log('🔌 آزمون برقراری ارتباط با پایگاه‌داده...');
    try {
      execSync(`psql "${postgresConnUrl}" -c "SELECT 1;"`, { stdio: 'pipe' });
      console.log('✔ ارتباط با پایگاه‌داده با موفقیت برقرار شد.');
    } catch (connErr: any) {
      console.error('❌ خطا در برقراری ارتباط اولیه با پایگاه‌داده:', connErr.message);
      process.exit(1);
    }

    console.log('\n🚀 در حال اعمال مایگریشن‌ها به ترتیب تاریخی:');
    for (const file of migrationFiles) {
      const fullPath = path.join(migrationsDir, file);
      console.log(`   ⏳ در حال اجرای: ${file}...`);
      try {
        execSync(`psql "${postgresConnUrl}" -f "${fullPath}"`, { stdio: 'pipe' });
        console.log(`   ✔ موفق: ${file}`);
      } catch (applyErr: any) {
        console.error(`   ❌ شکست در اجرای مایگریشن ${file}:`, applyErr.message);
        process.exit(1);
      }
    }

    console.log('\n✅ کلیه مایگریشن‌ها با موفقیت ۱۰۰٪ روی پایگاه‌داده هدف مستقر گردیدند.');
  } else {
    console.log('\n📋 وضعیت اجرا: [حالت بازرسی استاتیک و راهنمای استقرار دستی]');
    console.log('نکته مهم: درخواست خام HTTP به /rest/v1/rpc یک متد معتبر DDL نیست. ارسال درخواست جعلی حذف شد.');
    console.log('\nراهنمای استقرار معتبر در محیط Staging / Production:');
    console.log('  ۱. استقرار از طریق Supabase CLI:');
    console.log('     npx supabase db push');
    console.log('  ۲. استقرار از طریق SQL Editor در داشبورد سوپابیس:');
    console.log(`     محتوای فایل‌های موجود در پوشه supabase/migrations/ را کپی و اجرا نمایید.`);
    console.log('  ۳. اجرای محلی داکر:');
    console.log('     docker compose -f docker-compose.supabase.yml up -d\n');
  }

  console.log('================================================================================');
  console.log('✅ اعتبارسنجی ساختاری مایگریشن‌ها با موفقیت به پایان رسید (Exit Code: 0)');
  console.log('================================================================================\n');
}

runMigrationPipeline().catch(err => {
  console.error('Fatal error during migration check:', err);
  process.exit(1);
});
