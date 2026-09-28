import React, { useState, useEffect } from 'react';
import { useAccounting } from '../lib/store';
import { getSupabaseConfig, setSupabaseCredentials, testSupabaseDirectConnection, syncSupabaseConfigWithServer } from '../lib/supabase';
import { SupabaseSyncEngine, LiveSupabaseTestReport, TableAuditStatus } from '../lib/supabaseSyncEngine';
import {
  Database,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Server,
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  Code,
  Eye,
  Key,
  Globe,
  Sliders,
  Check,
  Copy,
  Info
} from 'lucide-react';

export const LiveSupabaseTester: React.FC = () => {
  const { activeTenantId, currentUser, syncFromSupabase, pushToSupabase } = useAccounting();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; counts?: Record<string, number> } | null>(null);
  const [report, setReport] = useState<LiveSupabaseTestReport | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableAuditStatus | null>(null);
  
  // Credentials modal / inline editor
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const currentConfig = getSupabaseConfig();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const runLiveTest = async () => {
    setLoading(true);
    setSyncResult(null);
    try {
      const res = await SupabaseSyncEngine.runFullLiveTest(activeTenantId, isSuperAdmin);
      setReport(res);
    } catch (err: any) {
      console.error('Error running live Supabase test:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const cfg = await syncSupabaseConfigWithServer();
      setInputUrl(cfg.url);
      setInputKey(cfg.key);
      runLiveTest();
    };
    init();

    const onConfigChanged = () => {
      const updated = getSupabaseConfig();
      setInputUrl(updated.url);
      setInputKey(updated.key);
      runLiveTest();
    };

    window.addEventListener('habino_supabase_config_changed', onConfigChanged);
    return () => {
      window.removeEventListener('habino_supabase_config_changed', onConfigChanged);
    };
  }, []);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setSupabaseCredentials(inputUrl, inputKey);
    setShowConfigModal(false);
    runLiveTest();
  };

  const handleDirectSyncToLocal = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncFromSupabase(isSuperAdmin ? 'all' : activeTenantId);
      setSyncResult(result);
      // Rerun test to show updated state
      runLiveTest();
    } catch (e: any) {
      setSyncResult({ success: false, message: e.message || 'خطا در همگام‌سازی' });
    } finally {
      setSyncing(false);
    }
  };

  const handlePushToCloud = async () => {
    setPushing(true);
    setSyncResult(null);
    try {
      const result = await pushToSupabase();
      setSyncResult(result);
      runLiveTest();
    } catch (e: any) {
      setSyncResult({ success: false, message: e.message || 'خطا در ارسال به سوپابیس' });
    } finally {
      setPushing(false);
    }
  };

  const handleCopySqlHint = () => {
    navigator.clipboard.writeText('-- فایل supabase_master_production_migration.sql در ریشه پروژه قرار دارد.');
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-bold text-white">آزمون زنده پایگاه داده سوپابیس (Supabase Live Test)</h3>
                <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full ${
                  report?.overallStatus === 'HEALTHY_ONLINE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : report?.overallStatus === 'PARTIAL_ONLINE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {report?.overallStatus === 'HEALTHY_ONLINE'
                    ? '🟢 متصل و پایدار'
                    : report?.overallStatus === 'PARTIAL_ONLINE'
                    ? '🟡 آنلاین با خطای جداول'
                    : '🔴 در حالت حافظه محلی / قطع'}
                </span>
                {isSuperAdmin && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
                    اکانت ادمین ارشد (Super Admin)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                بررسی بلادرنگ ارتباط شبکه، اعتبارسنجی توکن دسترسی، استعلام تفکیکی ۱۰ جدول حسابداری، و امکان بارگذاری مستقیم داده‌های ذخیره‌شده ابری در محیط تست لوکال.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>تنظیم کلید و آدرس</span>
            </button>

            <button
              type="button"
              onClick={runLiveTest}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'در حال آزمون...' : 'آزمون مجدد'}</span>
            </button>

            <button
              type="button"
              onClick={handleDirectSyncToLocal}
              disabled={syncing || !currentConfig.isConfigured}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="بارگذاری تمام اطلاعات موجود در سوپابیس به نرم‌افزار"
            >
              <ArrowDownToLine className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
              <span>{syncing ? 'در حال دریافت...' : 'دریافت داده‌ها از سوپابیس'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">پینگ شبکه و زمان پاسخ</span>
            <span className="text-xs font-mono font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {report?.directPing.latencyMs ?? 0} میلی‌ثانیه
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">کل رکوردهای یافت‌شده</span>
            <span className="text-xs font-mono font-bold text-indigo-300 mt-1 block">
              {report?.totalRecordsFound.toLocaleString('fa-IR') ?? 0} رکورد
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">مستأجر فعال و ایزولاسیون</span>
            <span className="text-xs font-mono font-bold text-slate-200 mt-1 block truncate">
              {activeTenantId} (RLS)
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">منبع تنظیمات</span>
            <span className="text-xs font-bold text-slate-300 mt-1 block">
              {report?.configSource === 'localStorage'
                ? 'حافظه مرورگر (سفارشی)'
                : report?.configSource === 'env'
                ? 'متغیر محیطی .env'
                : 'نامشخص'}
            </span>
          </div>
        </div>
      </div>

      {/* Sync / Push Feedback Alert */}
      {syncResult && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-fade-in ${
          syncResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {syncResult.success ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="text-xs font-bold">{syncResult.message}</h4>
            {syncResult.counts && Object.keys(syncResult.counts).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(syncResult.counts).map(([tbl, cnt]) => (
                  <span key={tbl} className="text-[11px] bg-white/80 px-2.5 py-0.5 rounded-lg font-medium border border-emerald-200">
                    {tbl}: {cnt}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diagnosis & Advice Box */}
      {report && (
        <div className={`p-4 rounded-2xl border ${
          report.overallStatus === 'HEALTHY_ONLINE'
            ? 'bg-emerald-50/70 border-emerald-200'
            : report.overallStatus === 'PARTIAL_ONLINE'
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="flex items-start gap-3">
            <Info className={`w-5 h-5 shrink-0 mt-0.5 ${
              report.overallStatus === 'HEALTHY_ONLINE'
                ? 'text-emerald-600'
                : report.overallStatus === 'PARTIAL_ONLINE'
                ? 'text-amber-600'
                : 'text-rose-600'
            }`} />
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                تشخیص هوشمند وضعیت سوپابیس: {report.primaryIssueFa}
              </h4>
              {report.resolutionFa && (
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  راهکار پیشنهادی: {report.resolutionFa}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tables Live Audit Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              وضعیت استعلام زنده ۱۰ جدول مالی و داده‌های مستأجر
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              برای مشاهده نمونه داده‌های خام دریافت‌شده از سوپابیس، روی هر جدول کلیک کنید.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePushToCloud}
              disabled={pushing || !currentConfig.isConfigured}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="انتقال داده‌های لوکال فعلی به جداول سوپابیس"
            >
              <ArrowUpFromLine className={`w-3.5 h-3.5 ${pushing ? 'animate-bounce' : ''}`} />
              <span>{pushing ? 'در حال ارسال...' : 'ارسال داده‌های محلی به سوپابیس'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {report?.tables.map(tbl => {
            const isSelected = selectedTable?.tableName === tbl.tableName;
            return (
              <div
                key={tbl.tableName}
                onClick={() => setSelectedTable(tbl)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                    : tbl.status === 'passed'
                    ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                    : tbl.status === 'warning'
                    ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                    : 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {tbl.status === 'passed' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : tbl.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-900">{tbl.titleFa}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {tbl.tableName}
                    </span>
                  </div>

                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    tbl.rowCount > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : tbl.status === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {tbl.rowCount} رکورد
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-1">{tbl.message}</p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>زمان استعلام: {tbl.latencyMs}ms</span>
                  <span className="text-indigo-600 font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    مشاهده جزئیات داده
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Table Raw Data Viewer */}
      {selectedTable && (
        <div className="bg-slate-900 rounded-3xl p-5 text-white border border-slate-800 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white">
                نمونه داده‌های خام دریافت شده از جدول: <span className="text-emerald-400 font-mono">{selectedTable.tableName}</span> ({selectedTable.titleFa})
              </h4>
            </div>
            <button
              onClick={() => setSelectedTable(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              بستن
            </button>
          </div>

          {selectedTable.rawSample && selectedTable.rawSample.length > 0 ? (
            <pre className="text-[11px] font-mono text-emerald-300 bg-slate-950 p-4 rounded-xl overflow-x-auto max-h-64 border border-slate-800" dir="ltr">
              {JSON.stringify(selectedTable.rawSample, null, 2)}
            </pre>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              رکوردی در این جدول یافت نشد یا جدول هنوز خالی است.
            </div>
          )}
        </div>
      )}

      {/* Credentials Configuration Drawer / Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200" dir="rtl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">تنظیم مشخصات اتصال به سوپابیس (Supabase Credentials)</h3>
                  <p className="text-xs text-slate-500">برای تست زنده در محیط لوکال، مشخصات پروژه سوپابیس را وارد فرمایید.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  آدرس پروژه سوپابیس (Project URL)
                </label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full text-xs font-mono px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  کلید ناشناس عمومی (anon public key)
                </label>
                <textarea
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  rows={3}
                  className="w-full text-xs font-mono px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  dir="ltr"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p>
                  این مشخصات به صورت امن در مرورگر لوکال شما ذخیره شده و پس از ذخیره، آزمون زنده سریعاً اجرا خواهد شد.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  ذخیره و اتصال زنده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
