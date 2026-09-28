/**
 * ==============================================================================
 * HABINO ACCOUNTING - DISTRIBUTED RECORD LOCK ENGINE
 * ==============================================================================
 * مدیریت قفل‌های توزیع‌شده همزمانی رکوردها (Multi-User Row-Level Concurrency)
 * جلوگیری از Race Condition و ویرایش همزمان یک سند مالی توسط چند کاربر/مرورگر
 * دارای پشتیبانی از Supabase RPC، BroadcastChannel بین تب‌ها، Heartbeat و انقضای خودکار
 * ==============================================================================
 */

import { getSupabaseClient } from './supabase';

export interface RecordLockInfo {
  resourceType: 'invoice' | 'client' | 'check' | 'transaction' | 'installment' | 'project';
  resourceId: string;
  tenantId: string;
  lockedByUserId: string;
  lockedByUserName: string;
  clientSessionId: string;
  lockedAt: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface LockAcquisitionResult {
  acquired: boolean;
  lock?: RecordLockInfo;
  conflictUser?: string;
  conflictExpiresAt?: string;
  messageFa: string;
}

// تولید شناسه یکتای نشست مرورگر
const CURRENT_SESSION_ID = typeof window !== 'undefined'
  ? (window.sessionStorage.getItem('habino_session_id') || (() => {
      const sid = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      window.sessionStorage.setItem('habino_session_id', sid);
      return sid;
    })())
  : 'server-session';

export class HabinoDistributedLockManager {
  private static localLocks = new Map<string, RecordLockInfo>();
  private static heartbeatTimers = new Map<string, any>();
  private static broadcastChannel: BroadcastChannel | null = null;
  private static lockListeners = new Set<(locks: RecordLockInfo[]) => void>();

  static {
    // راه‌اندازی کانال اشتراک اطلاعات قفل بین تب‌های مرورگر
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('habino_distributed_locks');
        this.broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'LOCK_ACQUIRED') {
            const lock = payload as RecordLockInfo;
            this.localLocks.set(`${lock.tenantId}:${lock.resourceType}:${lock.resourceId}`, lock);
            this.notifyListeners();
          } else if (type === 'LOCK_RELEASED') {
            const { key } = payload;
            this.localLocks.delete(key);
            this.notifyListeners();
          }
        };
      } catch (e) {
        console.warn('[DistributedLock] BroadcastChannel not supported:', e);
      }
    }
  }

  private static getCompositeKey(tenantId: string, resourceType: string, resourceId: string): string {
    return `${tenantId}:${resourceType}:${resourceId}`;
  }

  private static notifyListeners(): void {
    const active = Array.from(this.localLocks.values()).filter(l => new Date(l.expiresAt).getTime() > Date.now());
    this.lockListeners.forEach(fn => fn(active));
  }

  /**
   * درخواست دریافت قفل انحصاری برای یک موجودیت
   */
  public static async acquireLock(params: {
    tenantId: string;
    resourceType: RecordLockInfo['resourceType'];
    resourceId: string;
    userId: string;
    userName: string;
    ttlSeconds?: number;
  }): Promise<LockAcquisitionResult> {
    const ttl = params.ttlSeconds || 30;
    const compKey = this.getCompositeKey(params.tenantId, params.resourceType, params.resourceId);
    const now = Date.now();
    const expiresAt = new Date(now + ttl * 1000).toISOString();

    // ۱. بررسی محلی سریع
    const existingLocal = this.localLocks.get(compKey);
    if (existingLocal && new Date(existingLocal.expiresAt).getTime() > now) {
      if (existingLocal.clientSessionId !== CURRENT_SESSION_ID) {
        return {
          acquired: false,
          conflictUser: existingLocal.lockedByUserName,
          conflictExpiresAt: existingLocal.expiresAt,
          messageFa: `سند توسط کاربر «${existingLocal.lockedByUserName}» در حال ویرایش است.`
        };
      }
    }

    const lockData: RecordLockInfo = {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      tenantId: params.tenantId,
      lockedByUserId: params.userId,
      lockedByUserName: params.userName,
      clientSessionId: CURRENT_SESSION_ID,
      lockedAt: new Date(now).toISOString(),
      expiresAt,
      ttlSeconds: ttl
    };

    // ۲. ثبت قفل در پایگاه داده ابری Supabase در صورت اتصال
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.rpc('rpc_acquire_record_lock', {
        p_tenant_id: params.tenantId,
        p_resource_type: params.resourceType,
        p_resource_id: params.resourceId,
        p_user_id: params.userId,
        p_user_name: params.userName,
        p_session_id: CURRENT_SESSION_ID,
        p_ttl_seconds: ttl
      });

      if (!error && data) {
        if (!data.success) {
          return {
            acquired: false,
            conflictUser: data.locked_by_user_name || 'کاربر دیگر',
            conflictExpiresAt: data.expires_at,
            messageFa: `این سند در حال حاضر توسط «${data.locked_by_user_name || 'کاربر دیگر'}» قفل شده است.`
          };
        }
      }
    } catch (err) {
      console.warn('[DistributedLock] Remote RPC lock failed, falling back to local channel:', err);
    }

    // ۳. ثبت قفل در حافظه کلاینت و انتشار به سایر تب‌ها
    this.localLocks.set(compKey, lockData);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'LOCK_ACQUIRED', payload: lockData });
    }
    this.notifyListeners();

    // ۴. شروع Heartbeat برای تمدید خودکار تا زمان باز بودن تب
    this.startHeartbeat(lockData);

    return {
      acquired: true,
      lock: lockData,
      messageFa: 'قفل انحصاری سند با موفقیت فعال شد.'
    };
  }

  /**
   * آزادسازی قفل انحصاری
   */
  public static async releaseLock(
    tenantId: string,
    resourceType: RecordLockInfo['resourceType'],
    resourceId: string
  ): Promise<boolean> {
    const compKey = this.getCompositeKey(tenantId, resourceType, resourceId);

    // توقف Heartbeat
    if (this.heartbeatTimers.has(compKey)) {
      clearInterval(this.heartbeatTimers.get(compKey));
      this.heartbeatTimers.delete(compKey);
    }

    // آزادسازی محلی
    this.localLocks.delete(compKey);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'LOCK_RELEASED', payload: { key: compKey } });
    }
    this.notifyListeners();

    // آزادسازی ابری
    try {
      const client = getSupabaseClient();
      await client.rpc('rpc_release_record_lock', {
        p_tenant_id: tenantId,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_session_id: CURRENT_SESSION_ID
      });
      return true;
    } catch (e) {
      console.warn('[DistributedLock] Release lock RPC error:', e);
      return false;
    }
  }

  /**
   * راه‌اندازی تایمر ضربان قلب (Heartbeat) برای تمدید خودکار قفل
   */
  private static startHeartbeat(lock: RecordLockInfo): void {
    const compKey = this.getCompositeKey(lock.tenantId, lock.resourceType, lock.resourceId);
    if (this.heartbeatTimers.has(compKey)) {
      clearInterval(this.heartbeatTimers.get(compKey));
    }

    // تمدید هر ۱۲ ثانیه برای TTL ۳۰ ثانیه‌ای
    const interval = setInterval(async () => {
      try {
        const client = getSupabaseClient();
        await client.rpc('rpc_heartbeat_record_lock', {
          p_tenant_id: lock.tenantId,
          p_resource_type: lock.resourceType,
          p_resource_id: lock.resourceId,
          p_session_id: CURRENT_SESSION_ID,
          p_ttl_seconds: lock.ttlSeconds
        });
      } catch {
        // Ignored
      }
    }, 12000);

    this.heartbeatTimers.set(compKey, interval);
  }

  /**
   * بررسی وضعیت قفل بودن یک منبع
   */
  public static isLockedByAnother(
    tenantId: string,
    resourceType: RecordLockInfo['resourceType'],
    resourceId: string
  ): { isLocked: boolean; lockedBy?: string } {
    const compKey = this.getCompositeKey(tenantId, resourceType, resourceId);
    const lock = this.localLocks.get(compKey);
    if (lock && new Date(lock.expiresAt).getTime() > Date.now()) {
      if (lock.clientSessionId !== CURRENT_SESSION_ID) {
        return { isLocked: true, lockedBy: lock.lockedByUserName };
      }
    }
    return { isLocked: false };
  }

  /**
   * اشتراک در تغییرات قفل‌ها برای نمایش در UI
   */
  public static subscribe(listener: (locks: RecordLockInfo[]) => void): () => void {
    this.lockListeners.add(listener);
    listener(Array.from(this.localLocks.values()));
    return () => {
      this.lockListeners.delete(listener);
    };
  }
}
