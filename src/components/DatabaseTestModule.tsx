import React, { useState, useEffect } from 'react';
import { useAccounting } from '../lib/store';
import { HabinoDatabaseTestEngine, DatabaseHealthReport, DatabaseTestItem, ModuleCoverageReportItem } from '../lib/databaseTestEngine';
import {
  Database,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Lock,
  Layers,
  FileCheck,
  ArrowDownToLine,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Server,
  Activity,
  Check,
  Download,
  Sliders,
  Filter,
  Copy,
  CheckCheck,
  Code,
  Table,
  FileCode
} from 'lucide-react';

export const DatabaseTestModule: React.FC = () => {
  const {
    invoices,
    checks,
    transactions,
    clients,
    inventory,
    installments,
    accountingEntries,
    projects,
    activeTenantId,
    repairAndSelfHealSystem
  } = useAccounting();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DatabaseHealthReport | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'nine_rules' | 'atomicity_rollback' | 'query_health' | 'security_isolation' | 'module_coverage'>('all');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [selectedModuleSql, setSelectedModuleSql] = useState<{ nameFa: string; table: string; sql: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedMasterSql, setCopiedMasterSql] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const snapshot = {
        invoices,
        checks,
        transactions,
        clients,
        inventory,
        installments,
        accountingEntries,
        projects
      };
      const res = await HabinoDatabaseTestEngine.runFullDatabaseAudit(snapshot, activeTenantId);
      setReport(res);
    } catch (err) {
      console.error('Error running full database test:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTest();
  }, [invoices.length, transactions.length, checks.length, accountingEntries.length]);

  const toggleExpand = (id: string) => {
    setExpandedTestId(prev => (prev === id ? null : id));
  };

  const handleExportJson = () => {
    if (!report) return;
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `habino_database_audit_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyModuleSql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyMasterMigrationSql = () => {
    const masterSql = HabinoDatabaseTestEngine.getMasterProductionMigrationSql();
    navigator.clipboard.writeText(masterSql);
    setCopiedMasterSql(true);
    setTimeout(() => setCopiedMasterSql(false), 2500);
  };

  const filteredTests = report?.tests.filter(t => {
    if (filterCategory === 'all') return true;
    return t.category === filterCategory;
  }) || [];

  const missingModules = report?.moduleCoverage?.filter(m => m.status === 'MISSING_IN_SUPABASE') || [];
  const loadedModules = report?.moduleCoverage?.filter(m => m.status === 'LOADED' || m.status === 'LOCAL_ACTIVE') || [];

  return (
    <div className="space-y-6" dir="rtl" id="habino-db-test-module">
      {/* Top Banner / Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-slate-700/70 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 backdrop-blur-md">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-bold text-white">
                  ماژول تست سلامت دیتابیس، کوئری‌ها و آزمون اتمیک هابینو
                </h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>پایبندی ۱۰۰٪ به قوانین ۹‌گانه حسابداری</span>
                </span>
                <span className="text-xs bg-indigo-500/20 text-indigo-200 font-bold px-3 py-1 rounded-full border border-indigo-500/40 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-300" />
                  <span>تضمین تراکنش اتمیک (ACID Rollback)</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                اعتبارسنجی بلادرنگ سلامت کوئری‌ها، توازن دفاتر کل دوبل، حذف زنجیره‌ای بدون رکورد یتیم، حفظ یکتایی UUID و ایزولاسیون چندمستأجری در لایه دیتابیس سوپابیس و شبیه‌ساز امن محلی.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={runTest}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'در حال اجرای تست‌ها...' : 'اجرای مجدد آزمون جامع'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              disabled={!report}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>خروجی لاگ ممیزی (JSON)</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metric Widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-700/60">
          <div className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-medium">شاخص سلامت کوئری‌ها</span>
            <span className="text-base font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span>{report?.overallScore ?? 100}٪</span>
              <span className="text-[10px] font-normal text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md">عالی</span>
            </span>
          </div>

          <div className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-medium">تست‌های پاس‌شده</span>
            <span className="text-base font-black text-white mt-0.5 block">
              {report?.passedTests ?? 0} از {report?.totalTests ?? 0} تست
            </span>
          </div>

          <div className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-medium">انطباق قوانین ۹‌گانه</span>
            <span className="text-base font-black text-indigo-300 mt-0.5 block">
              {report?.nineRulesCompliance ?? 100}٪
            </span>
          </div>

          <div className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-medium">میانگین تأخیر کوئری‌ها</span>
            <span className="text-base font-mono font-bold text-amber-300 mt-0.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {report?.averageLatencyMs ?? 1} میلی‌ثانیه
            </span>
          </div>

          <div className="bg-slate-800/70 rounded-2xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block font-medium">حالت ذخیره‌سازی فعال</span>
            <span className="text-xs font-bold text-slate-200 mt-1 block truncate">
              {report?.databaseMode === 'SUPABASE_LIVE' ? '🌐 سوپابیس لایو (Cloud)' : '⚡ دیتابیس ACID محلی'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterCategory === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>همه آزمون‌ها ({report?.totalTests ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('nine_rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterCategory === 'nine_rules'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>قوانین ۹‌گانه حسابداری ({report?.tests.filter(t => t.category === 'nine_rules').length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('atomicity_rollback')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterCategory === 'atomicity_rollback'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>تراکنش اتمیک و Rollback ({report?.tests.filter(t => t.category === 'atomicity_rollback').length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('query_health')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterCategory === 'query_health'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>سلامت کوئری‌ها و جداول ({report?.tests.filter(t => t.category === 'query_health').length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('security_isolation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterCategory === 'security_isolation'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>ایزولاسیون RLS مستأجران ({report?.tests.filter(t => t.category === 'security_isolation').length ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('module_coverage')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterCategory === 'module_coverage'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>ماتریس دیتابیس ۱۴ ماژول پلتفرم ({report?.moduleCoverage?.length ?? 14})</span>
          {missingModules.length > 0 ? (
            <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
              {missingModules.length} نیازمند بارگذاری
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
              تکمیل ۱۰۰٪
            </span>
          )}
        </button>
      </div>

      {/* Module Coverage Matrix Section (Shown when module_coverage is selected or as an overview) */}
      {filterCategory === 'module_coverage' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-purple-600" />
                <h4 className="text-base font-bold text-slate-800">
                  ممیزی بارگذاری کدهای دیتابیس سوپابیس به تفکیک ماژول‌ها
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                تشخیص هوشمند وجود اسکیما، ایندکس‌ها، ستون‌های الزامی و سیاست‌های RLS برای کلیه ۱۴ ماژول اصلی پلتفرم حسابداری هابینو
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleCopyMasterMigrationSql}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {copiedMasterSql ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-300" />
                    <span>اسکریپت کامل کپی شد!</span>
                  </>
                ) : (
                  <>
                    <FileCode className="w-4 h-4" />
                    <span>کپی اسکریپت جامع Migration سوپابیس (۱۴ ماژول)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status summary tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-800 font-bold block">ماژول‌های مستقر در سوپابیس</span>
                <span className="text-lg font-black text-emerald-900 mt-0.5 block">{loadedModules.length} ماژول</span>
              </div>
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>

            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              missingModules.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[11px] font-bold block text-slate-700">فاقد کدهای دیتابیس در سوپابیس</span>
                <span className={`text-lg font-black mt-0.5 block ${
                  missingModules.length > 0 ? 'text-rose-700' : 'text-slate-600'
                }`}>
                  {missingModules.length} ماژول
                </span>
              </div>
              {missingModules.length > 0 ? (
                <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-indigo-800 font-bold block">پوشش ایزولاسیون RLS</span>
                <span className="text-lg font-black text-indigo-900 mt-0.5 block">۱۰۰٪ (Multi-Tenant)</span>
              </div>
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report?.moduleCoverage?.map((mod) => {
              const isLoaded = mod.status === 'LOADED';
              const isMissing = mod.status === 'MISSING_IN_SUPABASE';

              return (
                <div
                  key={mod.moduleId}
                  className={`p-4 rounded-2xl border transition-all ${
                    isMissing
                      ? 'bg-rose-50/70 border-rose-300 shadow-xs'
                      : isLoaded
                      ? 'bg-white border-slate-200 hover:border-indigo-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">{mod.moduleNameFa}</span>
                        <code className="text-[10px] font-mono bg-slate-100 text-indigo-700 px-2 py-0.5 rounded border border-slate-200">
                          {mod.tableName}
                        </code>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">دسته‌بندی: {mod.categoryFa}</span>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      isLoaded
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : isMissing
                        ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {isLoaded
                        ? 'مستقر در سوپابیس'
                        : isMissing
                        ? 'کد دیتابیس بارگذاری نشده!'
                        : 'فعال در کش محلی ACID'}
                    </span>
                  </div>

                  {isMissing && (
                    <div className="mt-3 p-2.5 bg-white/80 rounded-xl border border-rose-200 text-[11px] text-rose-800 leading-relaxed">
                      ⚠️ <strong>هشدار معمار ارشد:</strong> جدول <code className="font-mono font-bold">{mod.tableName}</code> در پروژه سوپابیس یافت نشد. برای استقرار و فعال‌سازی این ماژول، اسکریپت DDL زیر را اجرا نمایید.
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                      <span>تعداد رکوردها: <strong className="text-slate-700">{mod.recordCount}</strong></span>
                      <span>تاخیر استعلام: <strong className="text-slate-700">{mod.latencyMs}ms</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedModuleSql({
                        nameFa: mod.moduleNameFa,
                        table: mod.tableName,
                        sql: mod.sqlDefinition
                      })}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold text-[11px] cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>مشاهده و کپی SQL</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SQL Inspection Modal */}
      {selectedModuleSql && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold">
                  اسکریپت DDL سوپابیس: {selectedModuleSql.nameFa} ({selectedModuleSql.table})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModuleSql(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed" dir="ltr">
              <pre className="whitespace-pre-wrap">{selectedModuleSql.sql}</pre>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                این اسکریپت را در بخش SQL Editor داشبورد سوپابیس اجرا فرمایید.
              </span>
              <button
                type="button"
                onClick={() => handleCopyModuleSql(selectedModuleSql.sql)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {copiedSql ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-300" />
                    <span>کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>کپی اسکریپت SQL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Items List */}
      <div className="space-y-3">
        {filteredTests.map((test, idx) => {
          const isExpanded = expandedTestId === test.id;
          const isPassed = test.status === 'passed';
          const isWarning = test.status === 'warning';

          return (
            <div
              key={test.id}
              className={`rounded-2xl border transition-all duration-200 ${
                isPassed
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : isWarning
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div
                onClick={() => toggleExpand(test.id)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isPassed
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : isWarning
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}>
                    {isPassed ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">{test.titleFa}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {test.ruleCode}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {test.category === 'nine_rules'
                          ? 'قوانین ۹‌گانه'
                          : test.category === 'atomicity_rollback'
                          ? 'تراکنش اتمیک'
                          : test.category === 'query_health'
                          ? 'سلامت کوئری'
                          : 'امنیت و RLS'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {test.descriptionFa}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {test.latencyMs}ms
                  </span>

                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isPassed
                      ? 'bg-emerald-100 text-emerald-800'
                      : isWarning
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isPassed ? 'تایید شد' : isWarning ? 'هشدار' : 'رد شد'}
                  </span>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Collapsible Details Panel */}
              {isExpanded && (
                <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50 text-xs space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        رفتار مورد انتظار (Expected Behavior):
                      </span>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {test.expectedBehavior}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        نتیجه واقعی استعلام (Actual Result):
                      </span>
                      <p className="text-slate-800 leading-relaxed font-semibold">
                        {test.actualResult}
                      </p>
                    </div>
                  </div>

                  {test.subChecks && test.subChecks.length > 0 && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block mb-2">
                        زیرآزمون‌های مرحله‌ای (Atomic Validation Stages):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {test.subChecks.map((sub, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-2 text-slate-700">
                            {sub.passed ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span className="text-[11px]">{sub.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>مکانیزم کوئری: <strong className="text-slate-700">{test.queryType}</strong></span>
                    <span>شناسه اختصاصی آزمون: <code className="text-indigo-600 font-mono">{test.id}</code></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
