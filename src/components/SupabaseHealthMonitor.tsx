import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Clock,
  ExternalLink,
  ShieldCheck,
  Server,
  Zap,
  Radio,
  Sliders,
  X,
  Bell,
  Check
} from 'lucide-react';
import { testSupabaseDirectConnection, getSupabaseConfig } from '../lib/supabase';

export interface SupabaseHealthState {
  status: 'checking' | 'connected' | 'disconnected' | 'unconfigured';
  latencyMs: number;
  lastChecked: string | null;
  lastError: string | null;
  routeUsed: string;
  statusCode: number;
  consecutiveFailures: number;
  history: Array<{ timestamp: string; ok: boolean; latencyMs: number }>;
}

interface SupabaseHealthMonitorProps {
  onOpenLiveTester?: () => void;
  onStatusChange?: (status: SupabaseHealthState['status'], latencyMs: number) => void;
}

export const SupabaseHealthMonitor: React.FC<SupabaseHealthMonitorProps> = ({
  onOpenLiveTester,
  onStatusChange
}) => {
  const [health, setHealth] = useState<SupabaseHealthState>({
    status: 'checking',
    latencyMs: 0,
    lastChecked: null,
    lastError: null,
    routeUsed: '',
    statusCode: 0,
    consecutiveFailures: 0,
    history: []
  });

  const [isAutoCheckActive, setIsAutoCheckActive] = useState<boolean>(true);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(20);
  const [isManualChecking, setIsManualChecking] = useState<boolean>(false);
  const [showAlertNotification, setShowAlertNotification] = useState<boolean>(false);
  const [showRestoredNotification, setShowRestoredNotification] = useState<boolean>(false);
  const [dismissedForNow, setDismissedForNow] = useState<boolean>(false);

  const prevStatusRef = useRef<SupabaseHealthState['status']>('checking');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const performHealthCheck = useCallback(async (isManual: boolean = false) => {
    if (isManual) {
      setIsManualChecking(true);
    }

    const cfg = getSupabaseConfig();
    if (!cfg.isConfigured) {
      const nowStr = new Date().toLocaleTimeString('fa-IR');
      setHealth(prev => ({
        ...prev,
        status: 'unconfigured',
        latencyMs: 0,
        lastChecked: nowStr,
        lastError: 'پایگاه داده Supabase پیکربندی نشده است. نرم‌افزار در حالت ذخیره‌ساز محلی کار می‌کند.',
        statusCode: 0
      }));
      onStatusChange?.('unconfigured', 0);
      if (isManual) setIsManualChecking(false);
      return;
    }

    try {
      const res = await testSupabaseDirectConnection();
      const nowStr = new Date().toLocaleTimeString('fa-IR');

      if (res.ok) {
        setHealth(prev => {
          const newHistory = [
            ...prev.history.slice(-7),
            { timestamp: nowStr, ok: true, latencyMs: res.latencyMs }
          ];
          return {
            status: 'connected',
            latencyMs: res.latencyMs,
            lastChecked: nowStr,
            lastError: null,
            routeUsed: res.routeUsed,
            statusCode: res.status,
            consecutiveFailures: 0,
            history: newHistory
          };
        });

        // Trigger reconnected notice if we were previously disconnected
        if (prevStatusRef.current === 'disconnected') {
          setShowRestoredNotification(true);
          setShowAlertNotification(false);
          setDismissedForNow(false);
          setTimeout(() => setShowRestoredNotification(false), 5000);
        }
        prevStatusRef.current = 'connected';
        onStatusChange?.('connected', res.latencyMs);
      } else {
        // Disconnected or network error
        setHealth(prev => {
          const newFailures = prev.consecutiveFailures + 1;
          const newHistory = [
            ...prev.history.slice(-7),
            { timestamp: nowStr, ok: false, latencyMs: res.latencyMs }
          ];
          return {
            status: 'disconnected',
            latencyMs: res.latencyMs,
            lastChecked: nowStr,
            lastError: res.error || 'عدم دریافت پاسخ از سرور Supabase',
            routeUsed: res.routeUsed,
            statusCode: res.status,
            consecutiveFailures: newFailures,
            history: newHistory
          };
        });

        // Show alert notification
        setShowAlertNotification(true);
        setShowRestoredNotification(false);
        prevStatusRef.current = 'disconnected';
        onStatusChange?.('disconnected', res.latencyMs);
      }
    } catch (err: any) {
      const nowStr = new Date().toLocaleTimeString('fa-IR');
      setHealth(prev => ({
        status: 'disconnected',
        latencyMs: 0,
        lastChecked: nowStr,
        lastError: err?.message || 'خطای غیرمنتظره در ارزیابی سلامت شبکه',
        routeUsed: 'error',
        statusCode: 0,
        consecutiveFailures: prev.consecutiveFailures + 1,
        history: [...prev.history.slice(-7), { timestamp: nowStr, ok: false, latencyMs: 0 }]
      }));
      setShowAlertNotification(true);
      setShowRestoredNotification(false);
      prevStatusRef.current = 'disconnected';
      onStatusChange?.('disconnected', 0);
    } finally {
      if (isManual) {
        setIsManualChecking(false);
      }
    }
  }, [onStatusChange]);

  // Periodic Polling Interval
  useEffect(() => {
    // Initial run immediately
    performHealthCheck();

    if (!isAutoCheckActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      performHealthCheck();
    }, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoCheckActive, intervalSeconds, performHealthCheck]);

  // Latency quality helper
  const getLatencyBadge = (latency: number) => {
    if (latency <= 0) return { label: 'نامشخص', color: 'bg-slate-100 text-slate-600' };
    if (latency < 250) return { label: `${latency}ms (عالی)`, color: 'bg-emerald-100 text-emerald-800' };
    if (latency < 600) return { label: `${latency}ms (مناسب)`, color: 'bg-blue-100 text-blue-800' };
    return { label: `${latency}ms (کند)`, color: 'bg-amber-100 text-amber-800' };
  };

  return (
    <div className="space-y-4" id="supabase-health-monitor-section">
      {/* 1. Proactive Disconnection Alert Banner (Displayed whenever connection drops) */}
      {showAlertNotification && !dismissedForNow && health.status === 'disconnected' && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 shadow-sm text-rose-950 animate-fade-in relative overflow-hidden" role="alert">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                <WifiOff className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-rose-900">
                    هشدار مانیتور سلامت: ارتباط با پایگاه داده ابری Supabase قطع شد!
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800 font-bold">
                    قطع موقت
                  </span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed max-w-3xl">
                  پایشگر دوره‌ای سلامت متوجه عدم دسترسی به سرورهای ابری گردید.
                  <span className="font-bold text-rose-800 mr-1">
                    «جای نگرانی نیست؛ کلیه تراکنش‌ها و اسناد مالی شما به طور کامل در کش محلی امن (IndexedDB) ثبت و محافظت می‌شوند.»
                  </span>
                </p>
                {health.lastError && (
                  <p className="text-[11px] text-rose-600 bg-rose-100/60 px-3 py-1.5 rounded-xl inline-block font-mono border border-rose-200/60 mt-1">
                    جزئیات خطا: {health.lastError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => performHealthCheck(true)}
                disabled={isManualChecking}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualChecking ? 'animate-spin' : ''}`} />
                <span>بررسی مجدد اتصال</span>
              </button>

              {onOpenLiveTester && (
                <button
                  type="button"
                  onClick={onOpenLiveTester}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>تنظیمات و تست زنده</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDismissedForNow(true)}
                title="بستن اعلان"
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-rose-200/60 flex flex-wrap items-center justify-between text-[11px] text-rose-600 gap-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
              پیشنهاد: در صورت استفاده از اینترنت داخلی، فعال‌سازی سامانه تحریم‌شکن (مانند shecan.ir) یا بررسی اینترنت توصیه می‌شود.
            </span>
            <span className="font-mono text-[10px] text-rose-500">
              تعداد دفعات عدم پاسخ پی‌درپی: {health.consecutiveFailures} مرتبه
            </span>
          </div>
        </div>
      )}

      {/* 2. Reconnection Success Notification */}
      {showRestoredNotification && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-900 shadow-sm animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-emerald-900">ارتباط با پایگاه داده Supabase مجدداً برقرار شد!</h5>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                سرور ابری با پینگ {health.latencyMs} میلی‌ثانیه پاسخگو است و داده‌ها همگام هستند.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRestoredNotification(false)}
            className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Main Health Monitor Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs transition-all hover:border-slate-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Header & Status Indicator */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs relative ${
                health.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : health.status === 'disconnected'
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : health.status === 'checking'
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              {health.status === 'connected' ? (
                <>
                  <Wifi className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                </>
              ) : health.status === 'disconnected' ? (
                <>
                  <WifiOff className="w-6 h-6" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white animate-pulse"></span>
                </>
              ) : (
                <Radio className="w-6 h-6 animate-spin text-blue-500" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  مانیتور وضعیت سلامت ارتباط Supabase (Health Watchdog)
                </h3>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    health.status === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : health.status === 'disconnected'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : health.status === 'checking'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {health.status === 'connected'
                    ? 'متصل و پایدار'
                    : health.status === 'disconnected'
                    ? 'قطع ارتباط'
                    : health.status === 'checking'
                    ? 'در حال ارزیابی...'
                    : 'پیکربندی نشده'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                بررسی دوره‌ای سلامت شبکه، استعلام مسیرهای Auth و REST، و ارسال هشدار خودکار در صورت نوسان ارتباط
              </p>
            </div>
          </div>

          {/* Controls: Periodic Toggle, Interval Selector, Immediate Check */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Auto-check Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoCheckActive(!isAutoCheckActive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isAutoCheckActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title={isAutoCheckActive ? 'پایش دوره‌ای خودکار فعال است' : 'پایش خودکار متوقف شده است'}
            >
              {isAutoCheckActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-emerald-600" />
                  <span>پایش خودکار: فعال</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-slate-500" />
                  <span>پایش خودکار: موقت</span>
                </>
              )}
            </button>

            {/* Interval Selector */}
            {isAutoCheckActive && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs">
                <Clock className="w-3 h-3 text-slate-400" />
                <select
                  aria-label="بازه پایش دوره‌ای"
                  value={intervalSeconds}
                  onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                  className="bg-transparent text-slate-700 font-bold text-xs focus:outline-hidden cursor-pointer"
                >
                  <option value={10}>هر ۱۰ ثانیه</option>
                  <option value={20}>هر ۲۰ ثانیه</option>
                  <option value={30}>هر ۳۰ ثانیه</option>
                  <option value={60}>هر ۶۰ ثانیه</option>
                </select>
              </div>
            )}

            {/* Immediate Refresh Button */}
            <button
              type="button"
              onClick={() => performHealthCheck(true)}
              disabled={isManualChecking}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualChecking ? 'animate-spin' : ''}`} />
              <span>{isManualChecking ? 'در حال بررسی...' : 'بررسی آنی'}</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/80">
            <span className="text-[10px] text-slate-400 block font-medium">تاخیر پاسخگویی (Latency)</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-bold text-slate-800">
                {health.latencyMs > 0 ? `${health.latencyMs} ms` : '---'}
              </span>
              {health.status === 'connected' && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${getLatencyBadge(health.latencyMs).color}`}>
                  {getLatencyBadge(health.latencyMs).label}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/80">
            <span className="text-[10px] text-slate-400 block font-medium">آخرین بررسی سلامت</span>
            <span className="text-xs font-bold text-slate-800 mt-1 block">
              {health.lastChecked || 'هنوز بررسی نشده'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/80">
            <span className="text-[10px] text-slate-400 block font-medium">روش دسترسی (Endpoint)</span>
            <span className="text-xs font-mono font-medium text-slate-700 mt-1 block truncate" title={health.routeUsed}>
              {health.routeUsed || 'مستقیم / پروکسی سرور'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/80">
            <span className="text-[10px] text-slate-400 block font-medium">تاریخچه سلامت (۸ بررسی اخیر)</span>
            <div className="flex items-center gap-1.5 mt-2">
              {health.history.length === 0 ? (
                <span className="text-[10px] text-slate-400">در حال ثبت...</span>
              ) : (
                health.history.map((h, i) => (
                  <span
                    key={i}
                    title={`${h.timestamp}: ${h.ok ? `موفق (${h.latencyMs}ms)` : 'ناموفق'}`}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      h.ok ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                    }`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
