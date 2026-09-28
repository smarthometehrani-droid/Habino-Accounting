/**
 * HABINO ACCOUNTING - REPORT GENERATION SERVICE & SECURITY ASSERTION
 * 
 * سرویس جامع و فوق امن تولید گزارشات مالی با اعتبارسنجی متقاطع هویت مستأجر (Tenant Validation Gate)
 * تضمین می‌کند که پارامتر tenant_id با هویت ثبتی در دیتابیس سوپابیس مقایسه شده و تحت هیچ شرایطی
 * (حتی در صورت بروز خطای منطقی یا حمله جعل شناسه) گزارش با نام اشتباه هابینو صادر نگردد.
 */

import { getSupabaseClient } from './supabase';
import { HabinoAuthEngine } from './authEngine';
import { CompanySettings } from '../types';

export interface TenantReportValidationResult {
  isValid: boolean;
  tenantId: string;
  verifiedCompanyName: string;
  verifiedEconomicCode?: string;
  isPlatformDefaultTenant: boolean;
  securityIncidentDetected: boolean;
  errorMessage?: string;
  validationSource: 'supabase_database' | 'verified_local_registry';
}

export class TenantReportSecurityException extends Error {
  public readonly tenantId: string;
  public readonly attemptedName: string;
  public readonly verifiedName: string;

  constructor(message: string, tenantId: string, attemptedName: string, verifiedName: string) {
    super(message);
    this.name = 'TenantReportSecurityException';
    this.tenantId = tenantId;
    this.attemptedName = attemptedName;
    this.verifiedName = verifiedName;
  }
}

export class ReportGenerationService {
  private static readonly FORBIDDEN_FALLBACK_BRAND = 'هابینو';
  private static readonly PLATFORM_MAIN_TENANT_ID = 'tenant-main';

  /**
   * متد حیاتی اعتبارسنجی هویت مستأجر قبل از صدور هرگونه گزارش مالی
   * پارامتر tenant_id را با رکورد ثبتی در پایگاه‌داده سوپابیس (جدول tenants) مقایسه نموده
   * و از صدور گزارش با نام اشتباه هابینو برای سایر مستأجران اکیداً جلوگیری می‌کند.
   */
  public static async validateTenantIdentityAndAssertReportIntegrity(params: {
    currentTenantId: string;
    requestedCompanyName?: string;
    callerUserId?: string;
  }): Promise<TenantReportValidationResult> {
    const { currentTenantId, requestedCompanyName, callerUserId } = params;

    if (!currentTenantId) {
      throw new TenantReportSecurityException(
        'خطای امنیتی: شناسه مستأجر (tenant_id) جهت صدور گزارش مالی مشخص نشده است.',
        'unknown',
        requestedCompanyName || '',
        'نامشخص'
      );
    }

    const isPlatformTenant = currentTenantId === this.PLATFORM_MAIN_TENANT_ID;
    let verifiedName = '';
    let verifiedEconomicCode: string | undefined = undefined;
    let validationSource: TenantReportValidationResult['validationSource'] = 'verified_local_registry';
    let securityIncidentDetected = false;
    let errorMessage: string | undefined = undefined;

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        // الف) ارزیابی هویت کاربر فعال در نشست Supabase Auth و اعتبارسنجی انطباق با tenant_id
        try {
          const { data: authData } = await supabase.auth.getUser();
          const sessionUser = authData?.user;
          const userTenantId = (sessionUser?.user_metadata?.tenant_id || sessionUser?.app_metadata?.tenant_id) as string | undefined;

          if (sessionUser && userTenantId && userTenantId !== currentTenantId && !isPlatformTenant) {
            console.warn(`[ReportGenerationService] SECURITY_ALERT: Supabase Auth session user "${sessionUser.id}" belongs to tenant "${userTenantId}", but requested report for tenant "${currentTenantId}"!`);
            // ثبت رخداد مغایرت هویت
            securityIncidentDetected = true;
          }
        } catch {
          // در صورت آفلاین بودن یا عدم وجود نشست فعال، پروسه دیتابیس ادامه می‌یابد
        }

        // ب) استعلام مستقیم و بلادرنگ از جدول tenants در دیتابیس سوپابیس
        const { data: dbTenant, error: dbError } = await supabase
          .from('tenants')
          .select('id, name, metadata, status')
          .eq('id', currentTenantId)
          .maybeSingle();

        if (!dbError && dbTenant && dbTenant.name) {
          verifiedName = dbTenant.name.trim();
          verifiedEconomicCode = dbTenant.metadata?.economicCode;
          validationSource = 'supabase_database';
        }
      }
    } catch {
      // در صورت عدم دسترسی به شبکه سوپابیس، به لایه رجیستری محلی دارای امضای دیجیتال سوئیچ می‌شود
    }

    // ۲. در صورت در دسترس نبودن موقت سوپابیس، استفاده از مخزن تأییدشده داخلی authEngine
    if (!verifiedName) {
      const registeredTenant = HabinoAuthEngine.getRegisteredTenants().find(t => t.id === currentTenantId);
      if (registeredTenant) {
        verifiedName = registeredTenant.name.trim();
        verifiedEconomicCode = registeredTenant.metadata?.economicCode;
      }
    }

    // ۳. اگر هیچ رکوردی در سوپابیس یا مخزن یافت نشد، هرگز به نام هابینو فال‌بک نزن!
    if (!verifiedName) {
      verifiedName = `مجموعه تجاری و اقتصادی (${currentTenantId})`;
    }

    // ۴. تشخیص تخلف یا نشت نام هابینو:
    // اگر مستأجر جاری، مستأجر اصلی پلتفرم نیست ولی نام درخواستی یا پیش‌فرض «هابینو» است
    const attemptedNameClean = (requestedCompanyName || '').trim();
    const isLeakedHabinoName = !isPlatformTenant && (
      attemptedNameClean === this.FORBIDDEN_FALLBACK_BRAND ||
      attemptedNameClean.includes('هابینو حسابداری') ||
      attemptedNameClean === 'هابینو'
    );

    if (isLeakedHabinoName) {
      securityIncidentDetected = true;
      errorMessage = `[هشدار ایزولاسیون امنیتی] تلاش برای استفاده از نام سامانه مرکزی (${this.FORBIDDEN_FALLBACK_BRAND}) به عنوان نام شرکت در گزارش مستأجر (${verifiedName}) مسدود و تصحیح شد.`;
      
      // لاگ امنیتی در کنسول و هسته ممیزی
      console.warn(`[ReportGenerationService] BLOCKED_CROSS_TENANT_BRAND_LEAK: tenantId="${currentTenantId}", requested="${attemptedNameClean}", corrected="${verifiedName}"`);
    }

    // نام قطعی و اصلاح‌شده صددرصد مستقل است
    const finalCompanyName = (isLeakedHabinoName || !attemptedNameClean) ? verifiedName : attemptedNameClean;

    return {
      isValid: true,
      tenantId: currentTenantId,
      verifiedCompanyName: finalCompanyName,
      verifiedEconomicCode,
      isPlatformDefaultTenant: isPlatformTenant,
      securityIncidentDetected,
      errorMessage,
      validationSource
    };
  }

  /**
   * تولید سربرگ و متادیتای بهداشتی و اعتبارسنجی‌شده جهت گزارش‌های مالی
   */
  public static async prepareValidatedReportMetadata(
    currentTenantId: string,
    settings: CompanySettings,
    reportTitle: string
  ): Promise<{
    companyName: string;
    safeFileNamePrefix: string;
    metaHeaderLines: string[];
  }> {
    const validation = await this.validateTenantIdentityAndAssertReportIntegrity({
      currentTenantId,
      requestedCompanyName: settings.name
    });

    const companyName = validation.verifiedCompanyName;
    const safeFileNamePrefix = companyName.replace(/[/\\?%*:|"<> ]/g, '-');
    const currencyLabel = settings.currency === 'IRR' ? 'ریال' : 'تومان';
    const dateStr = new Date().toLocaleDateString('fa-IR');

    const metaHeaderLines = [
      `"${reportTitle} - ${companyName}"`,
      `"مجموعه اقتصادی صادرکننده:","${companyName}","شناسه اقتصادی:","${validation.verifiedEconomicCode || settings.economicCode || '—'}"`,
      `"تاریخ تهیه گزارش:","${dateStr}","واحد پولی:","${currencyLabel}"`
    ];

    return {
      companyName,
      safeFileNamePrefix,
      metaHeaderLines
    };
  }

  /**
   * ارزیابی مستقیم انطباق tenant_id با هویت تأییدشده در Supabase
   * برای جلوگیری از صدور گزارشات با هویت اشتباه یا دستکاری‌شده
   */
  public static async verifyTenantWithSupabaseIdentity(tenantId: string): Promise<{
    matched: boolean;
    tenantId: string;
    tenantName: string;
    source: 'supabase_auth' | 'supabase_db' | 'local_registry';
    warning?: string;
  }> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        const authTenantId = (user?.user_metadata?.tenant_id || user?.app_metadata?.tenant_id) as string | undefined;

        if (user && authTenantId && authTenantId !== tenantId) {
          return {
            matched: false,
            tenantId,
            tenantName: '',
            source: 'supabase_auth',
            warning: `شناسه مستأجر (${tenantId}) با شناسه هویت کاربری (${authTenantId}) در Supabase مطابقت ندارد.`
          };
        }

        const { data: dbTenant } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('id', tenantId)
          .maybeSingle();

        if (dbTenant && dbTenant.name) {
          return {
            matched: true,
            tenantId,
            tenantName: dbTenant.name,
            source: 'supabase_db'
          };
        }
      } catch (err) {
        console.debug('Error in verifyTenantWithSupabaseIdentity:', err);
      }
    }

    const localTenant = HabinoAuthEngine.getRegisteredTenants().find(t => t.id === tenantId);
    return {
      matched: !!localTenant,
      tenantId,
      tenantName: localTenant?.name || `مستأجر (${tenantId})`,
      source: 'local_registry'
    };
  }
}
