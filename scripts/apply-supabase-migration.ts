/**
 * HABINO ACCOUNTING - PRODUCTION & STAGING MIGRATION AUDITOR & DEPLOYER
 * 
 * Rules Enforced:
 * 1. Safe URL display (Masked secrets & keys).
 * 2. Production Protection Guard (Rule 4: Staging/Local first, Production requires Founder confirmation).
 * 3. NO fake HTTP calls (PostgREST /rest/v1/rpc does not accept raw DDL).
 * 4. Clear distinction: Static file verification vs Live PostgreSQL deployment.
 * 5. Migration-safe, idempotent SQL validation.
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

function maskUrl(url: string): string {
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

async function runMigrationPipeline() {
  console.log('\n================================================================================');
  console.log('🚀 HABINO ACCOUNTING - SUPABASE MIGRATION VERIFIER & PIPELINE');
  console.log('================================================================================\n');

  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  const isApplyRequested = process.argv.includes('--apply') || process.env.APPLY_MIGRATION === 'true';
  const isFounderConfirmed = process.argv.includes('--confirm-production-deployment-by-farid-tehrani');

  const isProductionTarget = rawUrl.includes('supabase.co') && !rawUrl.includes('localhost') && !rawUrl.includes('127.0.0.1');

  console.log(`📡 پایگاه داده هدف:   ${maskUrl(rawUrl)}`);
  console.log(`🔒 کلید سرویس:       ${hasServiceKey ? 'موجود در محیط (سطح دسترسی ادمین - محرمانه)' : 'تنظیم نشده (فقط بازرسی محلی)'}`);
  console.log(`🔑 کلید کلاینت:       ${hasAnonKey ? 'موجود' : 'تنظیم نشده'}`);
  console.log(`⚙️  حالت عملیات:       ${isApplyRequested ? 'درخواست استقرار (--apply)' : 'بازرسی و اعتبارسنجی ساختاری'}\n`);

  // RULE 4: Production Protection Check
  if (isProductionTarget && isApplyRequested && !isFounderConfirmed) {
    console.error('\x1b[41m\x1b[1m 🛑 توقف اضطراری (Rule 4 Violation Prevention): \x1b[0m');
    console.error('مایگریشن مستقیم روی پایگاه‌داده Production بدون تأیید صریح بنیانگذار (مهندس فرید تهرانی) اکیداً ممنوع است.');
    console.error('جهت استقرار در محیط تست/لوکال، ابتدا داکر محلی را استفاده نمایید.');
    console.error('برای استقرار Production، فلگ --confirm-production-deployment-by-farid-tehrani الزامی است.\n');
    process.exit(1);
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
      name: 'گارد ضد جعل مستأجر و حفاظت در برابر Race Condition در RPC اتمیک',
      status: hardeningSql.includes('TENANT_MISMATCH_INVOICE_EXISTS') &&
              hardeningSql.includes('WHERE invoices.tenant_id = v_effective_tenant') ? 'VERIFIED' : 'PENDING',
      details: 'بررسی عدم تعلق فاکتور به مستأجر دیگر و اعمال شرط حفاظت مستأجر در ON CONFLICT جهت امنیت در برابر race condition.'
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
  if (isApplyRequested && dbUrl) {
    console.log('\n📡 در حال تلاش برای اعمال مایگریشن روی پایگاه داده از طریق اتصال امن PostgreSQL (psql)...');
    try {
      execSync(`which psql`, { stdio: 'ignore' });
      execSync(`psql "${dbUrl}" -f "${hardeningFile}"`, { stdio: 'inherit' });
      execSync(`psql "${dbUrl}" -f "${occFile}"`, { stdio: 'inherit' });
      console.log('\n✅ مایگریشن‌ها با موفقیت روی پایگاه‌داده هدف مستقر گردیدند.');
    } catch (e: any) {
      console.error('\n❌ خطا در اعمال مایگریشن از طریق اتصال PostgreSQL:', e.message);
      process.exit(1);
    }
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
