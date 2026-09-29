/**
 * HABINO ACCOUNTING - OPTIMISTIC CONCURRENCY CONTROL (OCC) ENGINE
 * موتور اعتبارسنجی همزمانی خوش‌بینانه و مدیریت نسخه‌های اسناد مالی
 *
 * هدف: جلوگیری از بازنویسی تصادفی رکوردهای همزمان در زمان همگام‌سازی پس از قطعی طولانی
 * یا فعالیت آفلاین همزمان در چند دستگاه/تب مرورگر.
 */

export interface OCCValidationResult {
  allowed: boolean;
  isConflict: boolean;
  reason?: string;
  clientVersion: number;
  currentVersion: number;
  actionRequired?: 'apply' | 'reject' | 'prompt_merge';
}

export type OCCConflictResolutionStrategy = 'server_wins' | 'client_wins' | 'newer_timestamp_wins' | 'manual';

export class OptimisticConcurrencyEngine {
  /**
   * بررسی انطباق نسخه ورودی با نسخه فعلی موجود در پایگاه‌داده یا استور
   */
  public static validateVersion<T extends { id?: string; version?: number; updated_at?: string }>(
    existingRecord: T | null | undefined,
    incomingRecord: T,
    baseVersion?: number
  ): OCCValidationResult {
    // If no existing record exists (insert scenario), it's always allowed
    if (!existingRecord) {
      return {
        allowed: true,
        isConflict: false,
        clientVersion: incomingRecord.version || 1,
        currentVersion: 0,
        actionRequired: 'apply'
      };
    }

    const currentVer = existingRecord.version ?? 1;
    const clientVer = incomingRecord.version ?? 1;
    const expectedBase = baseVersion ?? clientVer;

    // Check if the current version has moved ahead of the base version on which the client worked
    if (currentVer > expectedBase && currentVer !== clientVer) {
      return {
        allowed: false,
        isConflict: true,
        reason: `تداخل نسخه سند (OCC_VERSION_CONFLICT): سند شماره یا شناسه ${existingRecord.id || ''} در سرور نسخه ${currentVer} است، در حالی که تغییرات شما بر پایه نسخه ${expectedBase} اعمال شده بود.`,
        clientVersion: clientVer,
        currentVersion: currentVer,
        actionRequired: 'reject'
      };
    }

    return {
      allowed: true,
      isConflict: false,
      clientVersion: clientVer,
      currentVersion: currentVer,
      actionRequired: 'apply'
    };
  }

  /**
   * برچسب‌گذاری و تخصیص نسخه اولیه (نسخه ۱) برای ایجاد موجودیت جدید
   */
  public static stampNewRecord<T extends object>(entity: T): T & { version: number; created_at: string; updated_at: string } {
    const now = new Date().toISOString();
    return {
      ...entity,
      version: 1,
      created_at: (entity as any).created_at || now,
      updated_at: now
    };
  }

  /**
   * افزایش گام‌به‌گام نسخه (Increment Version) و به‌روزرسانی مهر زمانی هنگام ویرایش
   */
  public static stampUpdatedRecord<T extends object & { version?: number }>(entity: T): T & { version: number; updated_at: string } {
    const currentVer = entity.version || 1;
    const now = new Date().toISOString();
    return {
      ...entity,
      version: currentVer + 1,
      updated_at: now
    };
  }

  /**
   * استراتژی حل تعارض خودکار بین رکورد محلی و رکورد ابری
   */
  public static resolveConflict<T extends { id: string; version?: number; updated_at?: string }>(
    local: T,
    remote: T,
    strategy: OCCConflictResolutionStrategy = 'newer_timestamp_wins'
  ): { resolved: T; resolvedBy: string } {
    switch (strategy) {
      case 'server_wins':
        return {
          resolved: { ...remote },
          resolvedBy: 'server_wins'
        };

      case 'client_wins':
        return {
          resolved: {
            ...local,
            version: Math.max(local.version || 1, remote.version || 1) + 1,
            updated_at: new Date().toISOString()
          },
          resolvedBy: 'client_wins'
        };

      case 'newer_timestamp_wins':
      default: {
        const localTime = new Date(local.updated_at || 0).getTime();
        const remoteTime = new Date(remote.updated_at || 0).getTime();

        if (localTime >= remoteTime) {
          return {
            resolved: {
              ...local,
              version: Math.max(local.version || 1, remote.version || 1) + 1,
              updated_at: new Date().toISOString()
            },
            resolvedBy: 'local_timestamp_newer'
          };
        } else {
          return {
            resolved: { ...remote },
            resolvedBy: 'remote_timestamp_newer'
          };
        }
      }
    }
  }
}
