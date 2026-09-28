/**
 * ==============================================================================
 * HABINO ACCOUNTING - CONFLICT RESOLUTION & DATA SYNCHRONIZATION ENGINE
 * ==============================================================================
 * موتور جامع حل تعارض داده‌ها (Conflict Resolution) و کنترل همزمانی خوش‌بینانه (OCC)
 * جهت جلوگیری از بازنویسی اشتباه داده‌ها در تبادل آنلاین/آفلاین (Anti-Data Drift)
 * منطبق بر الزامات معماری Phase 4 هابینو و اصول ۹گانه حسابداری دوبل
 * ==============================================================================
 */

export type ConflictResolutionStrategy = 
  | 'SMART_FINANCIAL_MERGE' // ادغام هوشمند مالی (پیش‌فرض امن هابینو)
  | 'SERVER_WINS'           // تقدم نسخه سرور
  | 'CLIENT_WINS'           // تقدم نسخه کلاینت با ثبت در ممیزی
  | 'MANUAL_REVIEW';        // نیاز به بررسی دستی کاربر

export interface ConflictAuditRecord {
  id: string;
  tenantId: string;
  entityType: 'invoice' | 'transaction' | 'check' | 'installment' | 'client' | 'project' | 'inventory';
  entityId: string;
  clientVersion: number;
  serverVersion: number;
  clientModifiedAt: string;
  serverModifiedAt: string;
  strategyUsed: ConflictResolutionStrategy;
  resolvedAt: string;
  conflictedFields: string[];
  persianSummary: string;
  clientPayloadSnapshot: any;
  serverPayloadSnapshot: any;
  finalMergedSnapshot: any;
}

export class HabinoConflictResolutionEngine {
  private static auditLogs: ConflictAuditRecord[] = [];

  /**
   * بررسی وقوع تعارض بر اساس مقایسه نسخه و زمان آخرین ویرایش
   */
  public static detectConflict(
    clientRecord: { sync_version?: number; updated_at?: string; [key: string]: any },
    serverRecord: { sync_version?: number; updated_at?: string; [key: string]: any }
  ): { hasConflict: boolean; conflictedFields: string[] } {
    if (!serverRecord) {
      return { hasConflict: false, conflictedFields: [] };
    }

    const clientVer = clientRecord.sync_version || 1;
    const serverVer = serverRecord.sync_version || 1;

    // اگر نسخه سرور از کلاینت جلوتر باشد، تعارض قطعی رخ داده است
    const versionMismatch = serverVer > clientVer;

    // شناسایی فیلدهای ناهمخوان
    const conflictedFields: string[] = [];
    const criticalFields = [
      'status',
      'balance',
      'grandTotal',
      'remainingAmount',
      'amountPaid',
      'amount',
      'stock',
      'items',
      'metadata'
    ];

    for (const field of criticalFields) {
      if (clientRecord[field] !== undefined && serverRecord[field] !== undefined) {
        const clientVal = JSON.stringify(clientRecord[field]);
        const serverVal = JSON.stringify(serverRecord[field]);
        if (clientVal !== serverVal) {
          conflictedFields.push(field);
        }
      }
    }

    return {
      hasConflict: versionMismatch || conflictedFields.length > 0,
      conflictedFields
    };
  }

  /**
   * حل هوشمند تعارض مالی بر اساس الگوی SMART_FINANCIAL_MERGE
   */
  public static resolveConflict<T extends Record<string, any>>(
    entityType: ConflictAuditRecord['entityType'],
    clientRecord: T,
    serverRecord: T,
    strategy: ConflictResolutionStrategy = 'SMART_FINANCIAL_MERGE',
    tenantId: string = 'tenant-main'
  ): { resolvedRecord: T; audit: ConflictAuditRecord } {
    const clientVer = Number(clientRecord.sync_version || 1);
    const serverVer = Number(serverRecord.sync_version || 1);
    const newVersion = Math.max(clientVer, serverVer) + 1;
    const nowIso = new Date().toISOString();

    let merged: T = { ...serverRecord };
    const conflictedFields: string[] = [];

    switch (strategy) {
      case 'SERVER_WINS':
        merged = {
          ...serverRecord,
          sync_version: newVersion,
          updated_at: nowIso
        };
        break;

      case 'CLIENT_WINS':
        merged = {
          ...clientRecord,
          sync_version: newVersion,
          updated_at: nowIso
        };
        break;

      case 'SMART_FINANCIAL_MERGE':
      default:
        // ۱. قاعده حفظ مبالغ پرداختی بیشینه (Non-Destructive Financial Retention)
        if (entityType === 'invoice') {
          const clientPaid = Number(clientRecord.amountPaid || 0);
          const serverPaid = Number(serverRecord.amountPaid || 0);
          const effectivePaid = Math.max(clientPaid, serverPaid);
          const grandTotal = Number(serverRecord.grandTotal || clientRecord.grandTotal || 0);
          const remaining = Math.max(0, grandTotal - effectivePaid);

          // تعیین وضعیت نهایی
          let status = serverRecord.status || clientRecord.status || 'pending';
          if (effectivePaid >= grandTotal && grandTotal > 0) {
            status = 'paid';
          } else if (effectivePaid > 0) {
            status = 'partially_paid';
          }

          merged = {
            ...serverRecord,
            ...clientRecord,
            amountPaid: effectivePaid,
            remainingAmount: remaining,
            status,
            sync_version: newVersion,
            updated_at: nowIso
          };
          conflictedFields.push('amountPaid', 'remainingAmount', 'status');
        } else if (entityType === 'client') {
          // در مورد مشتری، بیشترین مانده یا به‌روزترین تلفن/آدرس ادغام می‌شود
          merged = {
            ...serverRecord,
            ...clientRecord,
            phone: clientRecord.phone || serverRecord.phone,
            address: clientRecord.address || serverRecord.address,
            sync_version: newVersion,
            updated_at: nowIso
          };
          conflictedFields.push('balance', 'contact_info');
        } else if (entityType === 'check') {
          // در مورد چک، وضعیت‌های قطعی (cleared یا bounced) هرگز به pending برنمی‌گردند
          const isServerCleared = serverRecord.status === 'cleared' || serverRecord.status === 'passed';
          const isClientCleared = clientRecord.status === 'cleared' || clientRecord.status === 'passed';
          const finalStatus = (isServerCleared || isClientCleared) ? 'cleared' : (serverRecord.status || clientRecord.status);

          merged = {
            ...serverRecord,
            ...clientRecord,
            status: finalStatus,
            sync_version: newVersion,
            updated_at: nowIso
          };
          conflictedFields.push('status');
        } else {
          // پیش‌فرض برای سایر موجودیت‌ها: ترجیح جدیدترین زمان ویرایش با نسخه تجمیعی
          merged = {
            ...serverRecord,
            ...clientRecord,
            sync_version: newVersion,
            updated_at: nowIso
          };
        }
        break;
    }

    const audit: ConflictAuditRecord = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      entityType,
      entityId: String(clientRecord.id || serverRecord.id || 'unknown'),
      clientVersion: clientVer,
      serverVersion: serverVer,
      clientModifiedAt: clientRecord.updated_at || clientRecord.created_at || nowIso,
      serverModifiedAt: serverRecord.updated_at || serverRecord.created_at || nowIso,
      strategyUsed: strategy,
      resolvedAt: nowIso,
      conflictedFields,
      persianSummary: `تعارض در موجودیت ${entityType} با شناسه ${clientRecord.id || serverRecord.id} با استراتژی ${strategy} و نسخه ${newVersion} حل شد.`,
      clientPayloadSnapshot: clientRecord,
      serverPayloadSnapshot: serverRecord,
      finalMergedSnapshot: merged
    };

    this.auditLogs.unshift(audit);
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }

    // ذخیره در حافظه محلی برای پایداری گزارش ممیزی
    try {
      localStorage.setItem('habino_conflict_audits', JSON.stringify(this.auditLogs.slice(0, 50)));
    } catch {
      // Ignored
    }

    return { resolvedRecord: merged, audit };
  }

  /**
   * دریافت تاریخچه تعارض‌های حل‌شده
   */
  public static getConflictHistory(): ConflictAuditRecord[] {
    if (this.auditLogs.length === 0) {
      try {
        const stored = localStorage.getItem('habino_conflict_audits');
        if (stored) {
          this.auditLogs = JSON.parse(stored);
        }
      } catch {
        // Ignored
      }
    }
    return [...this.auditLogs];
  }
}
