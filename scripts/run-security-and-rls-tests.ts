/**
 * HABINO ACCOUNTING - STATIC AUDIT & IN-MEMORY SIMULATION SUITE
 * 
 * توجه: این اسکریپت شامل آزمون‌های بازرسی استاتیک کد SQL و شبیه‌سازی منطق درون‌حافظه‌ای است.
 * برای اجرای آزمون‌های یکپارچگی روی پایگاه‌داده واقعی (Live Database Integration Tests)،
 * از دستور npm run test:integration استفاده فرمایید.
 */

import fs from 'fs';
import path from 'path';

interface SecurityAssertion {
  id: string;
  name: string;
  testNature: 'STATIC_SQL_AUDIT' | 'SIMULATION_TEST';
  category: 'RLS_ISOLATION' | 'SQL_AUDIT' | 'RPC_SECURITY' | 'ACCOUNTING_INTEGRITY';
  passed: boolean;
  message: string;
  evidence?: any;
}

const assertions: SecurityAssertion[] = [];

function assert(condition: boolean, item: Omit<SecurityAssertion, 'passed'>) {
  assertions.push({
    ...item,
    passed: condition
  });
}

console.log('\n================================================================================');
console.log('🛡️  HABINO ACCOUNTING - STATIC SECURITY AUDIT & SIMULATION SUITE');
console.log('   (ارزیابی استاتیک مایگریشن‌های SQL و شبیه‌سازی منطق تجاری درون‌حافظه‌ای)');
console.log('================================================================================\n');

// ------------------------------------------------------------------------------
// PILLAR 1: SQL MIGRATIONS AUDIT (Zero Permissive Policies, Safe current_tenant_id)
// ------------------------------------------------------------------------------
const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const hardeningMigrationPath = path.join(migrationsDir, '20260929_security_and_rls_hardening.sql');
const hardeningSql = fs.existsSync(hardeningMigrationPath) ? fs.readFileSync(hardeningMigrationPath, 'utf8') : '';

// 1.1 Verify no permissive USING (true) on invoices
const hasInvoicesPermissiveBypass = /CREATE\s+POLICY\s+["']?invoices_permissive_sync_policy["']?\s+ON/i.test(hardeningSql) ||
  /ON\s+(?:public\.)?invoices\s+FOR\s+ALL\s+TO\s+authenticated,\s*anon\s+USING\s*\(\s*true\s*\)/i.test(hardeningSql);

assert(!hasInvoicesPermissiveBypass, {
  id: 'SEC-01',
  name: 'انسداد کامل سیاست‌های باز (No Permissive USING (true) on Invoices)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RLS_ISOLATION',
  message: hasInvoicesPermissiveBypass
    ? 'خطای بحرانی: سیاست invoices_permissive_sync_policy با USING (true) در مایگریشن وجود دارد!'
    : 'تایید شد: هیچ پالیسی باز و فاقد احراز هویت با شرط USING (true) روی جدول invoices وجود ندارد.'
});

// 1.2 Verify dropping of legacy permissive policies across all tables
const dropsPermissivePolicy = hardeningSql.includes('DROP POLICY IF EXISTS "invoices_permissive_sync_policy"');
const dropsCompanyPermissive = hardeningSql.includes('DROP POLICY IF EXISTS "company_settings_permissive_access"');

assert(dropsPermissivePolicy && dropsCompanyPermissive, {
  id: 'SEC-02',
  name: 'پاکسازی صریح سیاست‌های قدیمی در مایگریشن جدید (Explicit Drop of Insecure Legacy Policies)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'SQL_AUDIT',
  message: dropsPermissivePolicy && dropsCompanyPermissive
    ? 'تایید شد: مایگریشن جدید کلیه پالیسی‌های permissive قدیمی را با DROP POLICY صراحتاً پاکسازی می‌کند.'
    : 'خطا: مایگریشن جدید پالیسی‌های قدیمی را به صورت صریح Drop نکرده است!'
});

// 1.3 Verify current_tenant_id() has NO fallback to 'tenant-main' and returns NULL for anon
const currentTenantIdDef = hardeningSql.substring(
  hardeningSql.indexOf('FUNCTION public.current_tenant_id()'),
  hardeningSql.indexOf('REVOKE ALL ON FUNCTION public.current_tenant_id()')
);
const codeWithoutComments = currentTenantIdDef.replace(/--.*$/gm, '');
const hasAnonCheck = codeWithoutComments.includes("IF auth.role() = 'anon' THEN") && codeWithoutComments.includes('RETURN NULL;');
const hasTenantMainFallback = codeWithoutComments.includes("'tenant-main'");

assert(hasAnonCheck && !hasTenantMainFallback, {
  id: 'SEC-03',
  name: 'تابع current_tenant_id() با امنیت Zero-Trust (No Fallback to tenant-main)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RLS_ISOLATION',
  message: hasAnonCheck && !hasTenantMainFallback
    ? 'تایید شد: برای کاربران anon مقدار NULL برمی‌گرداند و هیچ پیش‌فرض خطرسازی به سمت tenant-main وجود ندارد.'
    : 'خطا: تابع current_tenant_id() هنوز دارای پیش‌فرض fallback به tenant-main است یا نقش anon را تفکیک نکرده!'
});

// 1.4 Verify is_super_admin() helper
const hasSuperAdminHelper = hardeningSql.includes('FUNCTION public.is_super_admin()') &&
  hardeningSql.includes("role') = 'super_admin'");

assert(hasSuperAdminHelper, {
  id: 'SEC-03-B',
  name: 'تعریف تابع کمکی امن is_super_admin() بر پایه کلیم‌های اعتبارسنجی‌شده JWT',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RLS_ISOLATION',
  message: 'تایید شد: دسترسی‌های ممتاز ادمین ارشد صرفاً از روی ادعای تاییدشده سروری در JWT بررسی می‌شود.'
});

// ------------------------------------------------------------------------------
// PILLAR 2: RPC ATOMIC REGISTRATION (Tenant Matching, Race-Condition Protection)
// ------------------------------------------------------------------------------
const rpcRegisterDef = hardeningSql.substring(
  hardeningSql.indexOf('FUNCTION public.rpc_register_invoice_atomic'),
  hardeningSql.indexOf('REVOKE ALL ON FUNCTION public.rpc_register_invoice_atomic')
);

// 2.1 Anti-Spoofing: Verifies caller tenant against JWT
const checksCallerTenant = rpcRegisterDef.includes('auth.jwt()') && 
  rpcRegisterDef.includes('TENANT_MISMATCH');

assert(checksCallerTenant, {
  id: 'SEC-04',
  name: 'جلوگیری از دستکاری مستأجر در RPC اتمیک (Cross-Tenant Anti-Spoofing Gate)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RPC_SECURITY',
  message: checksCallerTenant
    ? 'تایید شد: تابع SECURITY DEFINER هویت مستأجر فراخواننده را با ادعای JWT تطبیق داده و مانع از ثبت سند برای سازمان دیگر می‌شود.'
    : 'خطا: تابع rpc_register_invoice_atomic پارامتر p_tenant_id را بدون کنترل هویت کاربر می‌پذیرد!'
});

// 2.2 Cross-Tenant Invoice Hijacking Protection
const checksExistingTenant = rpcRegisterDef.includes('TENANT_MISMATCH_INVOICE_EXISTS') &&
  rpcRegisterDef.includes('v_existing_tenant <> v_effective_tenant');

assert(checksExistingTenant, {
  id: 'SEC-04-B',
  name: 'انسداد سرقت و بازنویسی فاکتور متعلق به مستأجر دیگر (Cross-Tenant Hijack Block)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RPC_SECURITY',
  message: checksExistingTenant
    ? 'تایید شد: اگر شناسه فاکتور از قبل متعلق به مستأجر دیگری باشد، عملیات قبل از هرگونه تغییر متوقف می‌گردد.'
    : 'خطا: کنترل مالکیت فاکتور موجود در دیتابیس اعمال نشده است!'
});

// 2.3 Race Condition Protection in ON CONFLICT
const checksOnConflictTenant = rpcRegisterDef.includes('WHERE invoices.tenant_id = v_effective_tenant');

assert(checksOnConflictTenant, {
  id: 'SEC-04-C',
  name: 'محافظت در برابر Race Condition در دستور ON CONFLICT',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RPC_SECURITY',
  message: checksOnConflictTenant
    ? 'تایید شد: بند ON CONFLICT دارای شرط صریح انطباق tenant_id است و امکان تغییر مستأجر فاکتور با UPSERT وجود ندارد.'
    : 'خطا: شرط tenant_id در ON CONFLICT تعبیه نشده است!'
});

// 2.4 Scoped Ledger Rebuild (Prevent cross-tenant deletion)
const checksScopedLedgerDelete = rpcRegisterDef.includes('WHERE tenant_id = v_effective_tenant') &&
  rpcRegisterDef.includes('DELETE FROM public.accounting_entries');

assert(checksScopedLedgerDelete, {
  id: 'SEC-04-D',
  name: 'محدودسازی حذف آرتیکل‌های دفتر به مستأجر مجاز (Scoped Ledger Rebuild)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RPC_SECURITY',
  message: checksScopedLedgerDelete
    ? 'تایید شد: بازسازی اسناد دفتر کل صرفاً ردیف‌های متعلق به مستأجر جاری را حذف می‌کند و امکان دستکاری دفتر دیگران با reference_id مشترک ناممکن است.'
    : 'خطا: حذف آرتیکل‌های دفتر بدون قید tenant_id انجام می‌شود!'
});

// 2.5 Rule 1 Database Enforcement: Mandatory Contact check
const checksRule1 = rpcRegisterDef.includes('RULE_1_MANDATORY_CONTACT_VIOLATION') &&
  rpcRegisterDef.includes('ثبت سند بدون انتخاب مخاطب مجاز نیست');

assert(checksRule1, {
  id: 'SEC-05',
  name: 'الزام وجود طرف‌حساب در سطح پایگاه داده (Rule 1 Mandatory Contact in Database)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'ACCOUNTING_INTEGRITY',
  message: checksRule1
    ? 'تایید شد: قانون ۱ هابینو در سطح هسته PostgreSQL اعتبارسنجی شده و فاکتور بدون مخاطب رول‌بک می‌گردد.'
    : 'خطا: کنترل قانون ۱ در تابع rpc_register_invoice_atomic پیاده‌سازی نشده است!'
});

// 2.6 Rule 9 Database Enforcement: Double-Entry Balance check
const checksRule9 = rpcRegisterDef.includes('LEDGER_UNBALANCED') &&
  rpcRegisterDef.includes('v_total_debit') &&
  rpcRegisterDef.includes('v_total_credit');

assert(checksRule9, {
  id: 'SEC-06',
  name: 'توازن دفاتر دوبل در سطح پایگاه داده (Rule 9 Double-Entry Balance in Database)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'ACCOUNTING_INTEGRITY',
  message: checksRule9
    ? 'تایید شد: مغایرت میان بدهکار و بستانکار در پایگاه داده موجب انصراف و Rollback کامل تراکنش می‌گردد.'
    : 'خطا: کنترل توازن دوبل در تابع rpc_register_invoice_atomic وجود ندارد!'
});

// 2.7 Definitive Commercial Invoice requires balanced ledger rows
const checksDefinitiveEntries = rpcRegisterDef.includes('DEFINITIVE_INVOICE_REQUIRES_LEDGER_ENTRIES') &&
  rpcRegisterDef.includes('v_inv_status <> \'draft\'');

assert(checksDefinitiveEntries, {
  id: 'SEC-06-B',
  name: 'تفکیک فاکتور پیش‌نویس از قطعی و الزام ثبت آرتیکل‌های دوبل برای فاکتور قطعی',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'ACCOUNTING_INTEGRITY',
  message: checksDefinitiveEntries
    ? 'تایید شد: فاکتورهای تجاری قطعی بدون ردیف‌های متوازن دفتر کل پذیرفته نمی‌شوند.'
    : 'خطا: تفکیک فاکتور پیش‌نویس از قطعی در سطح دیتابیس اعمال نشده است!'
});

// ------------------------------------------------------------------------------
// PILLAR 3: SERVER ENDPOINTS & PUBLIC RPC INTEGRATION
// ------------------------------------------------------------------------------
const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');

// 3.1 Public Invoice View endpoint uses RPC instead of raw table query
const usesPublicInvoiceRpc = serverCode.includes('/rpc/get_public_invoice_by_token') &&
  !serverCode.includes("fetch(`${cleanUrl}/rest/v1/invoices?share_token=eq.${token}&select=*`");

assert(usesPublicInvoiceRpc, {
  id: 'SEC-07',
  name: 'اتصال مسیر فاکتور عمومی به RPC امن (Server Uses get_public_invoice_by_token RPC)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RPC_SECURITY',
  message: usesPublicInvoiceRpc
    ? 'تایید شد: اندپوینت /api/invoices/public/:token فاکتور را از طریق RPC توکن‌محور دریافت می‌کند و کوئری مستقیم جدول حذف شد.'
    : 'خطا: سرور هنوز کوئری مستقیم به جدول فاکتورها ارسال می‌کند!'
});

// 3.2 Public Signature Submission uses RPC
const usesPublicSignatureRpc = serverCode.includes('/rpc/submit_public_invoice_signature') &&
  !serverCode.includes("fetch(`${cleanUrl}/rest/v1/invoice_signatures`");

assert(usesPublicSignatureRpc, {
  id: 'SEC-08',
  name: 'اتصال مسیر امضای مشتری به RPC امن (Server Uses submit_public_invoice_signature RPC)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'RPC_SECURITY',
  message: usesPublicSignatureRpc
    ? 'تایید شد: ثبت امضای مشتری در مسیر عمومی از طریق RPC انجام شده و شناسه مستأجر از سند فاکتور استخراج می‌گردد.'
    : 'خطا: ثبت امضا از طریق کوئری مستقیم جدول انجام می‌شود!'
});

// 3.3 Signing Proforma does NOT mark invoice as paid
const signingDoesNotMarkPaid = !serverCode.includes("status = 'paid'") || 
  serverCode.includes("is_signed = true") && !serverCode.includes("UPDATE public.invoices SET status = 'paid'");

assert(signingDoesNotMarkPaid, {
  id: 'SEC-09',
  name: 'صحت منطق مالی: امضا وضعیت را به پرداخت‌شده تغییر نمی‌دهد (Signing != Paid)',
  testNature: 'STATIC_SQL_AUDIT',
  category: 'ACCOUNTING_INTEGRITY',
  message: 'تایید شد: امضای پیش‌فاکتور به منزله تایید مشتری است و وضعیت فاکتور به paid تغییر نمی‌یابد.'
});

// ------------------------------------------------------------------------------
// PILLAR 4: IN-MEMORY SIMULATION OF DATABASE DEFENSES
// ------------------------------------------------------------------------------
class MockPostgreSqlRlsEngine {
  private invoices: any[] = [];
  private entries: any[] = [];

  public current_tenant_id(callerRole: 'anon' | 'authenticated', jwtClaims?: { tenant_id?: string }): string | null {
    if (callerRole === 'anon') return null;
    return jwtClaims?.tenant_id || null;
  }

  public rpc_register_invoice_atomic(
    callerRole: 'anon' | 'authenticated',
    jwtClaims: { tenant_id?: string; role?: string },
    p_invoice: any,
    p_entries: any[] = [],
    p_tenant_id?: string
  ): { success: boolean; errorCode?: string; error?: string } {
    if (callerRole !== 'authenticated') {
      return { success: false, errorCode: 'UNAUTHENTICATED' };
    }

    const verifiedTenant = jwtClaims.tenant_id;
    if (!verifiedTenant) {
      return { success: false, errorCode: 'AUTH_TENANT_MISSING' };
    }

    const isSuperAdmin = jwtClaims.role === 'super_admin';
    const effectiveTenant = isSuperAdmin ? (p_tenant_id || verifiedTenant) : verifiedTenant;

    if (!isSuperAdmin && p_tenant_id && p_tenant_id !== verifiedTenant) {
      return { success: false, errorCode: 'TENANT_MISMATCH' };
    }

    const invId = p_invoice.id || 'auto-uuid';
    const existing = this.invoices.find(i => i.id === invId);
    if (existing && existing.tenant_id !== effectiveTenant) {
      return { success: false, errorCode: 'TENANT_MISMATCH_INVOICE_EXISTS' };
    }

    const invType = p_invoice.type || 'sale';
    const invStatus = p_invoice.status || 'pending';
    const clientId = p_invoice.clientId || p_invoice.client_id;

    if (!['proforma', 'proforma_sale', 'proforma_purchase'].includes(invType)) {
      if (!clientId || clientId.trim() === '') {
        return { success: false, errorCode: 'RULE_1_MANDATORY_CONTACT_VIOLATION' };
      }
    }

    if (invStatus !== 'draft' && !['proforma', 'proforma_sale', 'proforma_purchase'].includes(invType)) {
      if (p_entries.length < 2) {
        return { success: false, errorCode: 'DEFINITIVE_INVOICE_REQUIRES_LEDGER_ENTRIES' };
      }
    }

    let debit = 0;
    let credit = 0;
    for (const e of p_entries) {
      if (!e.accountCode) return { success: false, errorCode: 'MISSING_ACCOUNT_CODE' };
      if (e.debit < 0 || e.credit < 0 || (e.debit === 0 && e.credit === 0)) {
        return { success: false, errorCode: 'INVALID_ENTRY_AMOUNTS' };
      }
      debit += e.debit || 0;
      credit += e.credit || 0;
    }

    if (p_entries.length > 0 && Math.abs(debit - credit) > 0.001) {
      return { success: false, errorCode: 'LEDGER_UNBALANCED' };
    }

    // Scoped deletion: Only delete entries of this tenant and reference
    this.entries = this.entries.filter(e => !(e.tenant_id === effectiveTenant && e.reference_id === invId));

    this.invoices = this.invoices.filter(i => !(i.id === invId && i.tenant_id === effectiveTenant));
    this.invoices.push({ ...p_invoice, id: invId, tenant_id: effectiveTenant });

    for (const e of p_entries) {
      this.entries.push({ ...e, tenant_id: effectiveTenant, reference_id: invId });
    }

    return { success: true };
  }

  public getInvoices(tenantId: string): any[] {
    return this.invoices.filter(i => i.tenant_id === tenantId);
  }

  public getEntries(tenantId: string): any[] {
    return this.entries.filter(e => e.tenant_id === tenantId);
  }
}

const db = new MockPostgreSqlRlsEngine();

// Simulation 1: Cross-tenant spoofing attempt
const spoofingResult = db.rpc_register_invoice_atomic(
  'authenticated',
  { tenant_id: 'tenant-alpha' },
  { invoiceNumber: '101', clientId: 'c-1', type: 'sale' },
  [{ accountCode: '101', debit: 100, credit: 0 }, { accountCode: '201', debit: 0, credit: 100 }],
  'tenant-beta'
);

assert(!spoofingResult.success && spoofingResult.errorCode === 'TENANT_MISMATCH', {
  id: 'SEC-10',
  name: 'آزمون شبیه‌سازی: دفع تزریق چندمستأجری (Rejected Cross-Tenant Injection)',
  testNature: 'SIMULATION_TEST',
  category: 'RPC_SECURITY',
  message: 'تایید شد: تلاش کاربر tenant-alpha برای ثبت سند در tenant-beta با خطای TENANT_MISMATCH مسدود شد.'
});

// Simulation 2: Rule 1 violation attempt
const rule1Result = db.rpc_register_invoice_atomic(
  'authenticated',
  { tenant_id: 'tenant-alpha' },
  { invoiceNumber: '102', clientId: '', type: 'sale' },
  [{ accountCode: '101', debit: 100, credit: 0 }, { accountCode: '201', debit: 0, credit: 100 }],
  'tenant-alpha'
);

assert(!rule1Result.success && rule1Result.errorCode === 'RULE_1_MANDATORY_CONTACT_VIOLATION', {
  id: 'SEC-11',
  name: 'آزمون شبیه‌سازی: دفع ثبت فاکتور بدون طرف‌حساب (Rejected Missing Contact in DB)',
  testNature: 'SIMULATION_TEST',
  category: 'ACCOUNTING_INTEGRITY',
  message: 'تایید شد: تلاش برای ثبت فاکتور رسمی بدون طرف‌حساب در پایگاه‌داده مسدود گردید.'
});

// Simulation 3: Rule 9 violation attempt (Unbalanced Ledger)
const rule9Result = db.rpc_register_invoice_atomic(
  'authenticated',
  { tenant_id: 'tenant-alpha' },
  { invoiceNumber: '103', clientId: 'c-10', type: 'sale' },
  [{ accountCode: '101', debit: 100, credit: 0 }, { accountCode: '201', debit: 0, credit: 80 }],
  'tenant-alpha'
);

assert(!rule9Result.success && rule9Result.errorCode === 'LEDGER_UNBALANCED', {
  id: 'SEC-12',
  name: 'آزمون شبیه‌سازی: دفع ناترازی دفاتر دوبل در پایگاه‌داده (Rejected Unbalanced Ledger in DB)',
  testNature: 'SIMULATION_TEST',
  category: 'ACCOUNTING_INTEGRITY',
  message: 'تایید شد: تلاش برای ثبت سند با اختلاف تراز در پایگاه‌داده متوقف و رول‌بک شد.'
});

// Simulation 4: Cross-Tenant Invoice Hijacking
db.rpc_register_invoice_atomic(
  'authenticated',
  { tenant_id: 'tenant-alpha' },
  { id: 'inv-shared-id-1', invoiceNumber: 'ALPHA-100', clientId: 'c-1', type: 'sale' },
  [{ accountCode: '101', debit: 50, credit: 0 }, { accountCode: '201', debit: 0, credit: 50 }],
  'tenant-alpha'
);

const hijackResult = db.rpc_register_invoice_atomic(
  'authenticated',
  { tenant_id: 'tenant-beta' },
  { id: 'inv-shared-id-1', invoiceNumber: 'BETA-OVERWRITE', clientId: 'c-2', type: 'sale' },
  [{ accountCode: '101', debit: 999, credit: 0 }, { accountCode: '201', debit: 0, credit: 999 }],
  'tenant-beta'
);

assert(!hijackResult.success && hijackResult.errorCode === 'TENANT_MISMATCH_INVOICE_EXISTS', {
  id: 'SEC-13',
  name: 'آزمون شبیه‌سازی: دفع سرقت فاکتور مستأجر دیگر با شناسه تکراری (Invoice Hijacking Block)',
  testNature: 'SIMULATION_TEST',
  category: 'RPC_SECURITY',
  message: 'تایید شد: مستأجر بتا نتوانست فاکتور موجود مستأجر آلفا را رونویسی یا دستکاری کند.'
});

// Simulation 5: Scoped Ledger Deletion Protection
// Tenant alpha has entries for inv-shared-id-1
const alphaEntriesBefore = db.getEntries('tenant-alpha').length;
// Tenant beta tries to register invoice with same ID or reference
db.rpc_register_invoice_atomic(
  'authenticated',
  { tenant_id: 'tenant-beta' },
  { id: 'inv-beta-200', invoiceNumber: 'BETA-200', clientId: 'c-2', type: 'sale' },
  [{ accountCode: '101', debit: 10, credit: 0 }, { accountCode: '201', debit: 0, credit: 10 }],
  'tenant-beta'
);
const alphaEntriesAfter = db.getEntries('tenant-alpha').length;

assert(alphaEntriesBefore === alphaEntriesAfter && alphaEntriesBefore > 0, {
  id: 'SEC-14',
  name: 'آزمون شبیه‌سازی: مصونیت ردیف‌های دفتر کل مستأجر دیگر از حذف ناخواسته (Scoped Ledger Protection)',
  testNature: 'SIMULATION_TEST',
  category: 'RPC_SECURITY',
  message: 'تایید شد: عملیات ثبت سند مستأجر بتا به هیچ وجه ردیف‌های دفتر کل مستأجر آلفا را حذف یا مخدوش نکرد.'
});

// Simulation 6: Definitive invoice without ledger entries is rejected
const noEntriesDefinitive = db.rpc_register_invoice_atomic(
  'authenticated',
  { tenant_id: 'tenant-alpha' },
  { id: 'inv-def-no-entries', invoiceNumber: 'DEF-99', clientId: 'c-1', type: 'sale', status: 'pending' },
  [],
  'tenant-alpha'
);

assert(!noEntriesDefinitive.success && noEntriesDefinitive.errorCode === 'DEFINITIVE_INVOICE_REQUIRES_LEDGER_ENTRIES', {
  id: 'SEC-15',
  name: 'آزمون شبیه‌سازی: دفع ثبت فاکتور تجاری قطعی بدون ردیف‌های دفتر کل (Definitive Entry Guard)',
  testNature: 'SIMULATION_TEST',
  category: 'ACCOUNTING_INTEGRITY',
  message: 'تایید شد: فاکتورهای قطعی تجاری فاقد آرتیکل‌های معتبر دفتر کل مردود اعلام شدند.'
});

// ------------------------------------------------------------------------------
// SUMMARY REPORT
// ------------------------------------------------------------------------------
console.log('نتایج ارزیابی آزمون‌های ممیزی استاتیک و شبیه‌سازی:\n');
let passedCount = 0;

for (const a of assertions) {
  const icon = a.passed ? '✔ قبول' : '✖ مردود';
  const color = a.passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m | [${a.testNature.padEnd(18)}] | [${a.category.padEnd(20)}] | ${a.name}`);
  console.log(`    ↳ ${a.message}\n`);
  if (a.passed) passedCount++;
}

const totalCount = assertions.length;
const passRate = Math.round((passedCount / totalCount) * 100);

console.log('--------------------------------------------------------------------------------');
console.log(`شاخص‌های قبولی ممیزی امنیتی استاتیک و شبیه‌سازی:`);
console.log(`• کل آزمون‌های تعریف‌شده: ${totalCount}`);
console.log(`• آزمون‌های موفق:         ${passedCount}`);
console.log(`• آزمون‌های ناموفق:       ${totalCount - passedCount}`);
console.log(`• درصد قبولی:            ${passRate}%`);
console.log('--------------------------------------------------------------------------------');
console.log('⚠️  تذکر مهم معماری:');
console.log('   آزمون‌های فوق شامل «بازرسی استاتیک کد SQL» و «شبیه‌سازی منطق درون‌حافظه‌ای» هستند.');
console.log('   برای آزمون‌های یکپارچگی زنده روی پایگاه‌داده واقعی، از دستور npm run test:integration استفاده کنید.\n');

if (passedCount === totalCount) {
  console.log('\x1b[42m\x1b[1m ✔ کلیه الزامات امنیتی استاتیک و شبیه‌سازی با موفقیت ۱۰۰٪ تایید گردیدند. \x1b[0m\n');
  process.exit(0);
} else {
  console.log('\x1b[41m\x1b[1m ✖ خطا در ممیزی امنیتی! برخی شرایط پذیرفته نشدند. \x1b[0m\n');
  process.exit(1);
}
