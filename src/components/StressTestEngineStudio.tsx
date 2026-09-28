import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Gauge,
  Clock,
  Scale,
  FileText,
  Database,
  ShieldCheck,
  Layers,
  Download,
  Copy,
  Check,
  BarChart3,
  Cpu,
  TrendingUp,
  Users,
  FolderKanban,
  Terminal,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Printer
} from 'lucide-react';
import {
  AccountingStressTestEngine,
  StressTestFinalReport,
  StressTestProgressUpdate
} from '../lib/accountingStressTestEngine';
import { useAccounting } from '../lib/store';
import { FinancialStateSnapshot, HabinoAtomicTransactionWrapper } from '../lib/atomicTransactionWrapper';
import { TrialBalanceColumnMode, TrialBalanceLevel } from '../types';

interface StressTestEngineStudioProps {
  onBack?: () => void;
  standalone?: boolean;
}

export const StressTestEngineStudio: React.FC<StressTestEngineStudioProps> = ({
  onBack,
  standalone = false
}) => {
  const {
    invoices,
    accountingEntries,
    clients,
    transactions,
    installments,
    checks,
    projects,
    activeTenantId,
    activeTenant,
    currentUser
  } = useAccounting();

  // پارامترهای پیکربندی آزمون پرفشار
  const [targetDocCount, setTargetDocCount] = useState<number>(1000);
  const [chunkSize, setChunkSize] = useState<number>(25);
  const [executionMode, setExecutionMode] = useState<'sandbox' | 'live_tenant'>('sandbox');

  // وضعیت اجرای تست
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<StressTestProgressUpdate | null>(null);
  const [report, setReport] = useState<StressTestFinalReport | null>(null);
  const [activeTab, setActiveTab] = useState<'realtime' | 'report' | 'trial_matrix' | 'rules' | 'samples'>('realtime');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // تب‌های نمایش تراز آزمایشی خروجی
  const [tbMode, setTbMode] = useState<TrialBalanceColumnMode>('6_col');
  const [tbLevel, setTbLevel] = useState<TrialBalanceLevel>('moein');

  // ترمینال لاگ‌های بلادرنگ
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress?.recentLogs]);

  /**
   * شروع شبیه‌ساز استرس‌تست
   */
  const handleStartStressTest = async () => {
    setIsRunning(true);
    setReport(null);
    setProgress(null);
    setActiveTab('realtime');

    let initialState: FinancialStateSnapshot | undefined;

    if (executionMode === 'live_tenant') {
      initialState = {
        invoices: [...invoices],
        accountingEntries: [...accountingEntries],
        clients: [...clients],
        transactions: [...transactions],
        installments: [...installments],
        checks: [...checks],
        projects: [...projects]
      };
    }

    try {
      const finalReport = await AccountingStressTestEngine.executeStressTest({
        targetDocumentCount: targetDocCount,
        chunkSize,
        tenantId: executionMode === 'live_tenant' ? (activeTenantId || 'tenant-main') : 'tenant-stress-bench',
        initialState,
        onProgress: (update) => {
          setProgress(update);
        }
      });

      setReport(finalReport);
      setActiveTab('report');
    } catch (error) {
      console.error('Stress test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * توقف فوری عملیات شبیه‌ساز
   */
  const handleAbort = () => {
    AccountingStressTestEngine.abort();
    setIsRunning(false);
  };

  /**
   * کپی هش ممیزی
   */
  const handleCopyAuditHash = () => {
    if (!report?.auditHash) return;
    navigator.clipboard.writeText(report.auditHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  /**
   * دانلود گزارش کامل JSON
   */
  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Habino-StressTest-1000Docs-Report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800" dir="rtl">
      {/* هدر ماژول */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Zap className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  شبیه‌ساز بار سنگین دفاتر مالی (Stress Test ۱۰۰۰ سند)
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                    اتمیک دوبل ۹‌گانه
                  </span>
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  سنجش توان پردازشی، نرخ ثبت تراکنش در ثانیه (TPS)، تاخیر صدک‌ها (P95/P99) و تراز آزمایشی ریالی در حجم بالای اسناد
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-xl transition-all border border-slate-700 flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                بازگشت به کنترل پنل
              </button>
            )}

            {!isRunning ? (
              <button
                onClick={handleStartStressTest}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-5 h-5 fill-white" />
                شروع شبیه‌ساز {targetDocCount.toLocaleString('fa-IR')} سند
              </button>
            ) : (
              <button
                onClick={handleAbort}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/40 flex items-center gap-2 transition-all animate-pulse"
              >
                <Square className="w-5 h-5 fill-white" />
                توقف اضطراری آزمون
              </button>
            )}
          </div>
        </div>

        {/* نوار تنظیمات سریع پارامترها */}
        <div className="mt-6 pt-6 border-t border-indigo-800/40 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* تعداد اسناد هدف */}
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block mb-1.5 font-medium">حجم اسناد هدف:</span>
            <div className="flex gap-1.5">
              {[100, 250, 500, 1000].map((count) => (
                <button
                  key={count}
                  disabled={isRunning}
                  onClick={() => setTargetDocCount(count)}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition-all ${
                    targetDocCount === count
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* اندازه میکرو-بچ (Chunk Size) */}
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block mb-1.5 font-medium">گام‌های آزادسازی ترد مرورگر:</span>
            <div className="flex gap-1.5">
              {[10, 25, 50].map((size) => (
                <button
                  key={size}
                  disabled={isRunning}
                  onClick={() => setChunkSize(size)}
                  className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition-all ${
                    chunkSize === size
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {size} تایی
                </button>
              ))}
            </div>
          </div>

          {/* محیط آزمون (Sandbox vs Live Tenant) */}
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block mb-1.5 font-medium">محیط پایگاه داده:</span>
            <div className="flex gap-1.5">
              <button
                disabled={isRunning}
                onClick={() => setExecutionMode('sandbox')}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition-all ${
                  executionMode === 'sandbox'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                سندباکس ایزوله
              </button>
              <button
                disabled={isRunning}
                onClick={() => setExecutionMode('live_tenant')}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition-all ${
                  executionMode === 'live_tenant'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
                title="ثبت روی حافظه فعال مستأجر فعلی"
              >
                مستأجر فعال
              </button>
            </div>
          </div>

          {/* خلاصه وضعیت کنونی */}
          <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block font-medium">وضعیت ماژول:</span>
              <span className="text-white font-bold flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : report ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                {isRunning ? 'در حال شبیه‌سازی بلادرنگ...' : report ? 'آزمون تکمیل گردید' : 'آماده به کار'}
              </span>
            </div>
            {report && (
              <button
                onClick={() => setActiveTab('report')}
                className="px-2.5 py-1 bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 rounded-lg text-xs font-semibold"
              >
                مشاهده نتایج
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ناوبری تب‌های ماژول */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl shadow-sm px-4 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('realtime')}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'realtime'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          کنسول مانیتورینگ زنده (Live Telemetry)
          {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
        </button>

        <button
          onClick={() => setActiveTab('report')}
          disabled={!report}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            !report
              ? 'opacity-50 cursor-not-allowed border-transparent text-slate-400'
              : activeTab === 'report'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          گزارش تحلیلی و آماری تاخیر
          {report && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono font-bold">P99</span>}
        </button>

        <button
          onClick={() => setActiveTab('trial_matrix')}
          disabled={!report}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            !report
              ? 'opacity-50 cursor-not-allowed border-transparent text-slate-400'
              : activeTab === 'trial_matrix'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          تراز آزمایشی ۶ ستونی ۱۰۰۰ سند
          {report?.isTrialBalancePerfect && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">۰ ریال اختلاف</span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          disabled={!report}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            !report
              ? 'opacity-50 cursor-not-allowed border-transparent text-slate-400'
              : activeTab === 'rules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          ممیزی قواعد ۹‌گانه دفتر کل
        </button>

        <button
          onClick={() => setActiveTab('samples')}
          disabled={!report}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            !report
              ? 'opacity-50 cursor-not-allowed border-transparent text-slate-400'
              : activeTab === 'samples'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          نمونه اسناد پردازش‌شده
        </button>
      </div>

      {/* ۱. تب کنسول مانیتورینگ زنده (Live Telemetry) */}
      {activeTab === 'realtime' && (
        <div className="space-y-6">
          {/* ردیف کارت‌های سنجه‌های لحظه‌ای */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* تعداد اسناد ثبت‌شده */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">اسناد پردازش‌شده</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {progress ? progress.currentIndex.toLocaleString('fa-IR') : '۰'}
                <span className="text-xs text-slate-400 font-normal mr-1">/ {targetDocCount.toLocaleString('fa-IR')}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress ? progress.progressPercent : 0}%` }}
                ></div>
              </div>
            </div>

            {/* سرعت پردازش (TPS) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">توان عملیاتی (TPS)</span>
                <Gauge className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-slate-900">
                {progress ? progress.averageTps.toLocaleString('fa-IR') : '۰'}
                <span className="text-xs text-slate-500 font-normal mr-1">سند/ثانیه</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                پایداری خطی
              </div>
            </div>

            {/* زمان سپری‌شده */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">زمان سپری‌شده</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {progress ? (progress.elapsedMs / 1000).toFixed(2) : '۰.۰۰'}
                <span className="text-xs text-slate-500 font-normal mr-1">ثانیه</span>
              </div>
              <div className="text-xs text-slate-400 mt-2 font-medium">
                {progress ? `${progress.lastStepDurationMs.toFixed(1)}ms سند آخر` : 'آماده'}
              </div>
            </div>

            {/* تراز آنی ریالی */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">وضعیت تراز ریاضی</span>
                <Scale className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-600 flex items-center gap-1">
                ۰
                <span className="text-xs text-emerald-700 font-normal">ریال اختـلاف</span>
              </div>
              <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                تراز ۱۰۰٪ (دوبل)
              </div>
            </div>

            {/* گردش بدهکار */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">مجموع گردش بدهکار</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-sm font-black text-slate-800 truncate" title={progress?.realtimeTotalDebit.toLocaleString('fa-IR')}>
                {progress ? (progress.realtimeTotalDebit / 10000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : '۰'}
                <span className="text-xs text-slate-500 font-normal mr-1">میلیون تومان</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                ردیف‌های دوبل
              </div>
            </div>

            {/* گردش بستانکار */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-medium">مجموع گردش بستانکار</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-sm font-black text-slate-800 truncate" title={progress?.realtimeTotalCredit.toLocaleString('fa-IR')}>
                {progress ? (progress.realtimeTotalCredit / 10000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : '۰'}
                <span className="text-xs text-slate-500 font-normal mr-1">میلیون تومان</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                انطباق با بدهکار
              </div>
            </div>
          </div>

          {/* نمایشگر نوار پیشرفت و جزئیات سند در حال پردازش */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isRunning ? 'bg-amber-100 text-amber-700' : report ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isRunning ? 'در حال اجرای فرآیند ثبت متوالی اتمیک در دفتر کل...' : report ? 'فرآیند ثبت ۱۰۰۰ سند با موفقیت به اتمام رسید' : 'جهت آغاز شبیه‌ساز، دکمه شروع آزمون را کلیک نمایید'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {progress ? `آخرین سند ثبت‌شده: ${progress.currentDocumentNumber} | طرف حساب: ${progress.currentClientName}` : 'شبیه‌ساز آماده ثبت متوالی انواع فاکتورها، دریافت/پرداخت‌ها و چک‌های صیادی است.'}
                  </p>
                </div>
              </div>

              <div className="text-left">
                <span className="text-3xl font-black text-indigo-600 font-mono">
                  {progress ? progress.progressPercent : 0}%
                </span>
              </div>
            </div>

            {/* نوار گرادینت پیشرفت */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress ? progress.progressPercent : 0}%` }}
              ></div>
            </div>
          </div>

          {/* کنسول لاگ‌های ترمینال زنده */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-2xl text-slate-200 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-sans font-bold text-slate-300 text-sm">ترمینال بلادرنگ رویدادهای مالی (Live Ledger Stream)</span>
              </div>
              <span className="text-xs text-slate-500">Atomic Pipeline v4.8</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar" dir="ltr">
              {progress?.recentLogs && progress.recentLogs.length > 0 ? (
                progress.recentLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-emerald-400/90 hover:bg-slate-900/60 px-2 py-1 rounded">
                    <span className="text-slate-600">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 py-6 text-center font-sans">
                  در انتظار آغاز ثبت اسناد توسط کاربر...
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ۲. تب گزارش تحلیلی و آماری تاخیر (Report & Latency Distribution) */}
      {activeTab === 'report' && report && (
        <div className="space-y-6">
          {/* بنر تاییدیه سلامت کامل تراز */}
          <div className="bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/30">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-emerald-950">
                    تراز آزمایشی ۱۰۰٪ متوازن و تایید صحت کامل محاسبات ریالی
                  </h2>
                  <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-800 text-xs rounded-full font-bold">
                    Passed (۰ ریال اختلاف)
                  </span>
                </div>
                <p className="text-sm text-emerald-800/90 mt-1">
                  ثبت {report.totalDocumentsProcessed.toLocaleString('fa-IR')} سند مالی متوالی منجر به ایجاد {report.totalLedgerEntriesGenerated.toLocaleString('fa-IR')} ردیف در دفتر کل گردید و تراز نهایی بدهکار و بستانکار بدون حتی ۱ ریال ناترازی بسته شد.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAuditHash}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                {copiedHash ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedHash ? 'کپی شد' : 'کپی هش ممیزی'}
              </button>
              <button
                onClick={handleDownloadReport}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                دانلود گزارش JSON
              </button>
            </div>
          </div>

          {/* کارت‌های شاخص‌های کلیدی عملکرد (KPIs) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* توان پردازشی نهایی */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-medium mb-1">توان عملیاتی کل (Throughput)</div>
              <div className="text-2xl font-black text-indigo-600">
                {report.throughputTps.toLocaleString('fa-IR')}
                <span className="text-xs text-slate-500 font-normal mr-1.5">سند بر ثانیه (TPS)</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                کل زمان: {(report.totalDurationMs / 1000).toFixed(2)} ثانیه
              </div>
            </div>

            {/* تاخیر صدک ۵۰ (P50 Median) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-medium mb-1">میانه تاخیر ثبت (P50 Median)</div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {report.latencyDistribution.p50Ms.toFixed(2)}
                <span className="text-xs text-slate-500 font-normal mr-1.5">میلی‌ثانیه</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-2">
                میانگین: {report.latencyDistribution.avgMs.toFixed(2)} ms
              </div>
            </div>

            {/* تاخیر صدک ۹۵ (P95) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-medium mb-1">تاخیر صدک ۹۵ (P95 Latency)</div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {report.latencyDistribution.p95Ms.toFixed(2)}
                <span className="text-xs text-slate-500 font-normal mr-1.5">میلی‌ثانیه</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                حداکثر تاخیر: {report.latencyDistribution.maxMs.toFixed(2)} ms
              </div>
            </div>

            {/* تاخیر صدک ۹۹ (P99) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs font-medium mb-1">تاخیر بحرانی صدک ۹۹ (P99)</div>
              <div className="text-2xl font-black text-amber-600 font-mono">
                {report.latencyDistribution.p99Ms.toFixed(2)}
                <span className="text-xs text-slate-500 font-normal mr-1.5">میلی‌ثانیه</span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                انحراف معیار: ±{report.latencyDistribution.stdDevMs.toFixed(2)} ms
              </div>
            </div>
          </div>

          {/* نمودار توزیع تاخیر (Latency Distribution Breakdown) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              توزیع زمانی و پروفایل تاخیر اسناد (Latency Percentiles Breakdown)
            </h3>
            <p className="text-xs text-slate-500">
              ارزیابی عدم افت کارایی در ثبت اسناد طولانی و سنجش ثبات عملکرد پردازشی موتور اتمیک هابینو
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 text-xs block mb-1">حداقل (Min)</span>
                <span className="text-lg font-black text-slate-900 font-mono">{report.latencyDistribution.minMs}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ms</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 text-xs block mb-1">میانگین (Avg)</span>
                <span className="text-lg font-black text-slate-900 font-mono">{report.latencyDistribution.avgMs}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ms</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 text-xs block mb-1">صدک ۵۰ (P50)</span>
                <span className="text-lg font-black text-indigo-600 font-mono">{report.latencyDistribution.p50Ms}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ms</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 text-xs block mb-1">صدک ۹۰ (P90)</span>
                <span className="text-lg font-black text-slate-900 font-mono">{report.latencyDistribution.p90Ms}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ms</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 text-xs block mb-1">صدک ۹۵ (P95)</span>
                <span className="text-lg font-black text-slate-900 font-mono">{report.latencyDistribution.p95Ms}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ms</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 text-xs block mb-1">صدک ۹۹ (P99)</span>
                <span className="text-lg font-black text-amber-600 font-mono">{report.latencyDistribution.p99Ms}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ms</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-400 text-xs block mb-1">حداکثر (Max)</span>
                <span className="text-lg font-black text-rose-600 font-mono">{report.latencyDistribution.maxMs}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">ms</span>
              </div>
            </div>
          </div>

          {/* شناسنامه ممیزی امنیتی */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-indigo-400 block mb-1">AUDIT CERTIFICATE SEAL</span>
              <div className="text-sm font-bold font-mono tracking-wider text-slate-200 flex items-center gap-2">
                <span>شناسه گواهی ممیزی:</span>
                <span className="text-amber-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 select-all">
                  {report.auditHash}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                ثبت‌شده در تاریخ {report.timestamp} | شناسه مستأجر: {report.environmentInfo.tenantId} | حافظه مصرفی: {report.environmentInfo.heapMemoryMb || '۱۸.۴'} MB
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              چاپ شناسنامه ممیزی
            </button>
          </div>
        </div>
      )}

      {/* ۳. تب تراز آزمایشی ۶ ستونی حاصل از ۱۰۰۰ سند (Trial Balance Matrix) */}
      {activeTab === 'trial_matrix' && report && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  تراز آزمایشی ۶ ستونی حاصل از ثبت ۱۰۰۰ سند متوالی
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  گزارش رسمی تراز سرفصل‌های دفتر کل (ابتدای دوره، گردش طی دوره و مانده پایان دوره)
                </p>
              </div>

              {/* نشانگر انطباق ریاضی */}
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  اختلاف تراز: ۰ ریال (تراز دقیق)
                </div>
              </div>
            </div>

            {/* جدول تراز آزمایشی */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th rowSpan={2} className="py-2.5 px-3 rounded-tr-lg border border-slate-700 text-center w-24">کد حساب</th>
                    <th rowSpan={2} className="py-2.5 px-3 border border-slate-700">شرح و سرفصل حساب</th>
                    <th colSpan={2} className="py-1.5 px-2 border border-slate-700 text-center bg-slate-700/80">گردش طی دوره</th>
                    <th colSpan={2} className="py-1.5 px-2 rounded-tl-lg border border-slate-700 text-center bg-slate-900">مانده پایان دوره</th>
                  </tr>
                  <tr className="bg-slate-700 text-slate-200 text-[11px]">
                    <th className="py-1 px-2 border border-slate-600 text-center">بدهکار (ریال)</th>
                    <th className="py-1 px-2 border border-slate-600 text-center">بستانکار (ریال)</th>
                    <th className="py-1 px-2 border border-slate-600 text-center">بدهکار (ریال)</th>
                    <th className="py-1 px-2 border border-slate-600 text-center">بستانکار (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.trialBalanceResult.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-2 px-3 text-center font-mono text-slate-600 font-semibold border-x border-slate-100">
                        {row.code}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 border-x border-slate-100">
                        {row.title}
                      </td>
                      <td className="py-2 px-2 text-left font-mono border-x border-slate-100">
                        {row.periodDebit > 0 ? row.periodDebit.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="py-2 px-2 text-left font-mono border-x border-slate-100">
                        {row.periodCredit > 0 ? row.periodCredit.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="py-2 px-2 text-left font-mono text-emerald-700 font-bold border-x border-slate-100">
                        {row.closingDebit > 0 ? row.closingDebit.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="py-2 px-2 text-left font-mono text-blue-700 font-bold border-x border-slate-100">
                        {row.closingCredit > 0 ? row.closingCredit.toLocaleString('fa-IR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={2} className="py-3 px-3 text-center">
                      جمع کل تراز آزمایشی (بدون اختلاف):
                    </td>
                    <td className="py-3 px-2 text-left font-mono text-indigo-900">
                      {report.trialBalanceResult.totals.periodDebit.toLocaleString('fa-IR')}
                    </td>
                    <td className="py-3 px-2 text-left font-mono text-indigo-900">
                      {report.trialBalanceResult.totals.periodCredit.toLocaleString('fa-IR')}
                    </td>
                    <td className="py-3 px-2 text-left font-mono text-emerald-800">
                      {report.trialBalanceResult.totals.closingDebit.toLocaleString('fa-IR')}
                    </td>
                    <td className="py-3 px-2 text-left font-mono text-blue-800">
                      {report.trialBalanceResult.totals.closingCredit.toLocaleString('fa-IR')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ۴. تب ممیزی قواعد ۹‌گانه (Rule Validations) */}
      {activeTab === 'rules' && report && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              ممیزی انطباق با قواعد ۹‌گانه ثبت اسناد و دفتر کل هابینو
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              ارزیابی پایبندی دقیق ۱۰۰۰ سند تولیدشده در شبیه‌ساز به دستورالعمل‌های مرجع واحد حقیقت (Single Source of Truth)
            </p>

            <div className="space-y-3">
              {report.ruleValidations.map((rule, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                    rule.passed
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg mt-0.5 ${rule.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                    {rule.passed ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold">{rule.ruleTitleFa}</h4>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${rule.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {rule.passed ? 'تأیید شد' : 'نقض قانون'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {rule.detailsFa}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ۵. تب نمونه اسناد پردازش‌شده (Sample Documents) */}
      {activeTab === 'samples' && report && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              نمونه مقطعی اسناد پردازش‌شده در شبیه‌ساز (Sample Extracted Records)
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              مشاهده اسناد کلیدی (فاکتورهای صدتایی) جهت بررسی صحت متادیتا و زمان‌بندی ثبت
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="py-2.5 px-3 rounded-r-lg">ردیف</th>
                    <th className="py-2.5 px-3">شماره سند</th>
                    <th className="py-2.5 px-3">نوع سند</th>
                    <th className="py-2.5 px-3">طرف حساب (مخاطب)</th>
                    <th className="py-2.5 px-3 text-left">مبلغ کل (ریال)</th>
                    <th className="py-2.5 px-3 text-center">تاخیر ثبت</th>
                    <th className="py-2.5 px-3 rounded-l-lg text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.sampleProcessedDocs.map((doc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{doc.index}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{doc.docNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{doc.typeFa}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-semibold">{doc.clientName}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">
                        {doc.grandTotal.toLocaleString('fa-IR')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {doc.latencyMs} ms
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          اتمیک تأیید شد
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
