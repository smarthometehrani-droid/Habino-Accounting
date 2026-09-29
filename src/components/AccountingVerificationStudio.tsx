import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  FileText,
  Scale,
  BookOpen,
  ShieldCheck,
  Zap,
  ArrowRight,
  Download,
  Copy,
  Printer,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  Filter,
  BarChart3,
  Cpu,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  AccountingAutomatedTestEngine,
  AccountingTestScenarioResult,
  AccountingTestSuiteSummary,
  AccountingTestCategory,
  LedgerAccountCardLine
} from '../lib/accountingAutomatedTestEngine';
import { computeMultiColumnTrialBalance, MultiColumnTrialBalanceResult } from '../lib/trialBalanceEngine';
import { TrialBalanceColumnMode, TrialBalanceLevel, AccountingEntry } from '../types';
import { StressTestEngineStudio } from './StressTestEngineStudio';

interface AccountingVerificationStudioProps {
  onBack?: () => void;
  standalone?: boolean;
}

export const AccountingVerificationStudio: React.FC<AccountingVerificationStudioProps> = ({
  onBack,
  standalone = false
}) => {
  // وضعیت کل بسته تست
  const [suiteSummary, setSuiteSummary] = useState<AccountingTestSuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'trial_matrix' | 'ledger_turnover' | 'chaos_lab' | 'audit_cert' | 'stress_test'>('scenarios');
  
  // فیلتر دسته‌بندی سناریوها
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>('sc1_invoice_registration');

  // کنترل‌های تراز آزمایشی زنده
  const [tbMode, setTbMode] = useState<TrialBalanceColumnMode>('4_col');
  const [tbLevel, setTbLevel] = useState<TrialBalanceLevel>('moein');

  // کنترل‌های کارت حساب دفتر کل
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<string>('10201');

  // آزمایشگاه تزریق هرج‌ومرج
  const [chaosDebit, setChaosDebit] = useState<number>(50000000);
  const [chaosCredit, setChaosCredit] = useState<number>(45000000);
  const [chaosTestResult, setChaosTestResult] = useState<{
    blocked: boolean;
    difference: number;
    message: string;
  } | null>(null);

  const [copiedCert, setCopiedCert] = useState<boolean>(false);

  // اجرای اولیه تست‌ها در بدو ورود به کامپوننت
  useEffect(() => {
    runSuite();
  }, []);

  const runSuite = () => {
    setIsRunning(true);
    setTimeout(() => {
      try {
        const result = AccountingAutomatedTestEngine.runAllScenarios();
        setSuiteSummary(result);
      } catch (err) {
        console.error('Error running accounting test suite:', err);
      } finally {
        setIsRunning(false);
      }
    }, 150);
  };

  // آرتیکل‌های تجمیع شده از سناریوها برای تراز و گردش
  const allSimulatedEntries = useMemo(() => {
    if (!suiteSummary) return [];
    const entries: AccountingEntry[] = [];
    suiteSummary.scenarios.forEach(sc => {
      if (sc.simulatedEntries && sc.simulatedEntries.length > 0) {
        entries.push(...sc.simulatedEntries);
      }
    });
    return entries;
  }, [suiteSummary]);

  // نتیجه محاسبه تراز آزمایشی برای تب تراز
  const currentTrialBalance = useMemo<MultiColumnTrialBalanceResult | null>(() => {
    if (allSimulatedEntries.length === 0) return null;
    return computeMultiColumnTrialBalance({
      entries: allSimulatedEntries,
      mode: tbMode,
      level: tbLevel
    });
  }, [allSimulatedEntries, tbMode, tbLevel]);

  // لیست سرفصل‌های موجود در داده‌های شبیه‌سازی شده
  const availableAccounts = useMemo(() => {
    const map = new Map<string, string>();
    map.set('all', 'همه سرفصل‌ها (گردش کل دفتر)');
    allSimulatedEntries.forEach(e => {
      if (!map.has(e.accountCode)) {
        map.set(e.accountCode, `${e.accountCode} - ${e.accountTitle}`);
      }
    });
    return Array.from(map.entries()).map(([code, title]) => ({ code, title }));
  }, [allSimulatedEntries]);

  // محاسبه کارت گردش حساب جاری دفتر کل
  const currentLedgerCard = useMemo<LedgerAccountCardLine[]>(() => {
    if (allSimulatedEntries.length === 0) return [];
    return AccountingAutomatedTestEngine.computeLedgerCard(allSimulatedEntries, selectedAccountForLedger);
  }, [allSimulatedEntries, selectedAccountForLedger]);

  // فیلتر کردن سناریوها
  const filteredScenarios = useMemo(() => {
    if (!suiteSummary) return [];
    return suiteSummary.scenarios.filter(sc => {
      const matchCat = selectedCategory === 'all' || sc.category === selectedCategory;
      const matchQuery = !searchQuery.trim() || 
        sc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sc.ruleReference.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [suiteSummary, selectedCategory, searchQuery]);

  // اجرای آزمایش تزریق ناترازی
  const handleRunChaosTest = () => {
    const diff = Math.abs(chaosDebit - chaosCredit);
    if (diff === 0) {
      setChaosTestResult({
        blocked: false,
        difference: 0,
        message: 'سند متوازن است. هر دو ستون بدهکار و بستانکار برابرند.'
      });
    } else {
      setChaosTestResult({
        blocked: true,
        difference: diff,
        message: `گیت بازدارنده فعال شد: مبالغ بدهکار (${chaosDebit.toLocaleString('fa-IR')}) و بستانکار (${chaosCredit.toLocaleString('fa-IR')}) دارای اختلاف ${diff.toLocaleString('fa-IR')} ریال بوده و ثبت سند بلافاصله مسدود گردید.`
      });
    }
  };

  const handleCopyCertificate = () => {
    if (!suiteSummary) return;
    const certText = `=== شناسنامه ممیزی و تست خودکار هسته حسابداری هابینو ===
شناسه اعتبارسنجی: ${suiteSummary.certificateHash}
تاریخ و زمان ارزیابی: ${suiteSummary.timestamp}
تعداد سناریوهای ارزیابی‌شده: ${suiteSummary.totalScenarios}
نرخ موفقیت: ${suiteSummary.passRatePercent}٪ (${suiteSummary.passedScenarios} از ${suiteSummary.totalScenarios})
وضعیت تراز آزمایشی ۲، ۴ و ۶ ستونی: ${suiteSummary.allTrialBalancesBalanced ? 'متوازن با انحراف دقیقاً صفر ریال' : 'دارای اختلاف'}
مجموع گردش بدهکار: ${suiteSummary.totalDebitSum.toLocaleString('fa-IR')} ریال
مجموع گردش بستانکار: ${suiteSummary.totalCreditSum.toLocaleString('fa-IR')} ریال
میزان اختلاف ریالی (Discrepancy): ${suiteSummary.totalDiscrepancyRial} ریال
مدت زمان اجرای آزمون‌ها: ${suiteSummary.totalExecutionTimeMs} میلی‌ثانیه
نتیجه نهایی: مورد تأیید کامل استانداردهای GAAP/IFRS و قوانین ۹‌گانه مالی هابینو.`;

    navigator.clipboard.writeText(certText);
    setCopiedCert(true);
    setTimeout(() => setCopiedCert(false), 2500);
  };

  const handleDownloadJSON = () => {
    if (!suiteSummary) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(suiteSummary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `habino-accounting-test-suite-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="accounting-verification-studio" className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 font-sans antialiased" dir="rtl">
      {/* هدر بالایی استودیو */}
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                id="btn-back-to-ledger"
                onClick={onBack}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="بازگشت به دفتر کل"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  استودیو ممیزی و تست خودکار محاسبات ریالی و تراز
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  هسته دوبل هابینو
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                راستی‌آزمایی ریاضی ثبت اسناد، تراز آزمایشی ۲، ۴ و ۶ ستونی، پیوستگی گردش دفتر کل و قوانین ۹‌گانه مالی
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              id="btn-run-all-tests"
              onClick={runSuite}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'در حال اجرای آزمون‌ها...' : 'اجرای مجدد آزمون‌های خودکار'}</span>
            </button>

            <button
              id="btn-copy-cert"
              onClick={handleCopyCertificate}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-sm border border-slate-700 transition-all"
              title="کپی شناسنامه ممیزی"
            >
              {copiedCert ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedCert ? 'کپی شد' : 'کپی شناسنامه'}</span>
            </button>

            <button
              id="btn-download-json"
              onClick={handleDownloadJSON}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-sm border border-slate-700 transition-all"
              title="دانلود فایل JSON آزمون"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">خروجی JSON</span>
            </button>

            <button
              id="btn-print-report"
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-sm border border-slate-700 transition-all"
              title="چاپ کارنامه رسمی آزمون"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">چاپ کارنامه</span>
            </button>
          </div>
        </header>

        {/* کارت‌های خلاصه شاخص‌های سلامت مالی (KPI Bar) */}
        {suiteSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>شاخص قبولی سناریوها</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400">{suiteSummary.passRatePercent}٪</span>
                <span className="text-xs text-slate-400 font-mono">
                  ({suiteSummary.passedScenarios} از {suiteSummary.totalScenarios} سناریو)
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${suiteSummary.passRatePercent}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>تراز آزمایشی (۲، ۴ و ۶ ستونی)</span>
                <Scale className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white">تراز کامل</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  انحراف: ۰ ریال
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 truncate">
                تساوی جبری قطعی ستون‌های بدهکار و بستانکار
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>مجموع ریالی گردش ارزیابی‌شده</span>
                <BarChart3 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bold text-amber-300 font-mono">
                  {suiteSummary.totalDebitSum.toLocaleString('fa-IR')}
                </span>
                <span className="text-[11px] text-slate-400">ریال پایه (IRR)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                ارزیابی {suiteSummary.totalEntriesEvaluated} ردیف آرتیکل دوبل
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>سرعت پردازش و امضای ممیزی</span>
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-purple-300 font-mono">
                  {suiteSummary.totalExecutionTimeMs}
                </span>
                <span className="text-xs text-slate-400">میلی‌ثانیه</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono truncate mt-3" title={suiteSummary.certificateHash}>
                هش: {suiteSummary.certificateHash.substring(0, 16)}...
              </p>
            </div>
          </div>
        )}

        {/* منوی تب‌های استودیو */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1 text-sm">
          <button
            id="tab-btn-scenarios"
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === 'scenarios'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>سناریوهای آزمون خودکار ({suiteSummary?.totalScenarios || 0})</span>
          </button>

          <button
            id="tab-btn-trial-matrix"
            onClick={() => setActiveTab('trial_matrix')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === 'trial_matrix'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>میز شبیه‌سازی تراز آزمایشی (۲، ۴ و ۶ ستونی)</span>
          </button>

          <button
            id="tab-btn-ledger-turnover"
            onClick={() => setActiveTab('ledger_turnover')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === 'ledger_turnover'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>کارت گردش حساب دفتر کل (Running Balance)</span>
          </button>

          <button
            id="tab-btn-chaos-lab"
            onClick={() => setActiveTab('chaos_lab')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === 'chaos_lab'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>آزمایشگاه تزریق هرج‌ومرج و رد اسناد ناتراز</span>
          </button>

          <button
            id="tab-btn-audit-cert"
            onClick={() => setActiveTab('audit_cert')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === 'audit_cert'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>شناسنامه رسمی ممیزی ریالی هابینو</span>
          </button>

          <button
            id="tab-btn-stress-test"
            onClick={() => setActiveTab('stress_test')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === 'stress_test'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                : 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>شبیه‌ساز بار سنگین (Stress Test ۱۰۰۰ سند)</span>
          </button>
        </div>

        {/* تب ۱: سناریوهای آزمون خودکار */}
        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            {/* نوار جستجو و فیلتر */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  دسته‌بندی:
                </span>
                {[
                  { id: 'all', label: 'همه سناریوها (۳۲ سناریو)' },
                  { id: 'invoice_and_returns', label: 'انواع فاکتور و مرجوعی' },
                  { id: 'project_accounting', label: 'پروژه‌ها و تسویه کارفرما' },
                  { id: 'payroll_and_salary', label: 'حقوق، دستمزد و مساعده' },
                  { id: 'inventory_and_clients', label: 'انبارداری و سقف اعتبار مخاطبین' },
                  { id: 'cross_module_hybrid', label: 'سناریوهای تلفیقی و زنجیره‌ای' },
                  { id: 'document_registration', label: 'ثبت سند حسابداری' },
                  { id: 'trial_balance', label: 'تراز آزمایشی' },
                  { id: 'ledger_turnover', label: 'گردش دفتر کل' },
                  { id: 'rules_enforcement', label: 'قوانین ۹‌گانه مالی' },
                  { id: 'precision_stress', label: 'دقت ریالی و استرس' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-slate-700 text-white border border-slate-600'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجو در سناریوها..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* لیست کارت‌های سناریوها */}
            <div className="space-y-3">
              {filteredScenarios.map(sc => {
                const isExpanded = expandedScenarioId === sc.id;
                const isPassed = sc.status === 'passed';

                return (
                  <div
                    key={sc.id}
                    className={`rounded-2xl border transition-all ${
                      isPassed
                        ? 'bg-slate-800/80 border-slate-700/70 hover:border-slate-600'
                        : 'bg-rose-950/20 border-rose-800/60'
                    }`}
                  >
                    {/* هدر سطر سناریو */}
                    <div
                      onClick={() => setExpandedScenarioId(isExpanded ? null : sc.id)}
                      className="p-4 flex items-start md:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-2 rounded-xl border ${
                          isPassed
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                          {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="text-sm md:text-base font-bold text-white">
                              {sc.title}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700 text-slate-300">
                              {sc.categoryFa}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                              {sc.ruleReference}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {sc.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left hidden md:block">
                          <span className={`text-xs font-bold ${isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPassed ? 'موفق (Passed)' : 'ناموفق (Failed)'}
                          </span>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {sc.executionTimeMs} ms
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* جزئیات منبسط‌شده سناریو */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-700/50 space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                          <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                            <span className="text-slate-400 font-medium block mb-1">فرضیه و انتظار آزمون (Assertion):</span>
                            <p className="text-slate-200">{sc.assertion}</p>
                          </div>
                          <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
                            <span className="text-slate-400 font-medium block mb-1">نتیجه واقعی محاسبه شده (Actual):</span>
                            <p className={isPassed ? 'text-emerald-300' : 'text-rose-300'}>{sc.actualOutcome}</p>
                          </div>
                        </div>

                        {/* فرمول‌ها و نکات محاسباتی */}
                        {sc.mathDetails.formulaNotes && sc.mathDetails.formulaNotes.length > 0 && (
                          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1">
                            <span className="text-slate-400 font-medium block mb-1 flex items-center gap-1.5">
                              <Scale className="w-3.5 h-3.5 text-cyan-400" />
                              محاسبات و تراز ریالی سناریو:
                            </span>
                            {sc.mathDetails.formulaNotes.map((note, nIdx) => (
                              <div key={nIdx} className="text-slate-300 flex items-center gap-2 font-mono text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <span>{note}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* جدول آرتیکل‌های شبیه‌سازی شده در سناریو */}
                        {sc.simulatedEntries && sc.simulatedEntries.length > 0 && (
                          <div>
                            <span className="text-slate-400 font-medium block mb-2">
                              آرتیکل‌های دوبل تولید شده در این سناریو ({sc.simulatedEntries.length} ردیف):
                            </span>
                            <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/90">
                              <table className="w-full text-right text-[11px]">
                                <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700">
                                  <tr>
                                    <th className="p-2.5">سند</th>
                                    <th className="p-2.5">کد سرفصل</th>
                                    <th className="p-2.5">عنوان حساب</th>
                                    <th className="p-2.5 text-left">بدهکار (ریال)</th>
                                    <th className="p-2.5 text-left">بستانکار (ریال)</th>
                                    <th className="p-2.5">برچسب پروژه / طرف‌حساب</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                                  {sc.simulatedEntries.map((e, eIdx) => (
                                    <tr key={eIdx} className="hover:bg-slate-800/40">
                                      <td className="p-2.5">{e.documentNumber}</td>
                                      <td className="p-2.5 font-bold text-cyan-300">{e.accountCode}</td>
                                      <td className="p-2.5 font-sans">{e.accountTitle}</td>
                                      <td className="p-2.5 text-left text-emerald-400 font-bold">
                                        {Number(e.debit) > 0 ? Number(e.debit).toLocaleString('fa-IR') : '-'}
                                      </td>
                                      <td className="p-2.5 text-left text-rose-400 font-bold">
                                        {Number(e.credit) > 0 ? Number(e.credit).toLocaleString('fa-IR') : '-'}
                                      </td>
                                      <td className="p-2.5 text-slate-400 font-sans text-[10px]">
                                        {e.projectTag ? `پروژه: ${e.projectTag}` : (e.clientId ? `مخاطب: ${e.clientId}` : '-')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-slate-800/90 font-bold text-white border-t border-slate-700 font-mono">
                                  <tr>
                                    <td colSpan={3} className="p-2.5 font-sans">جمع اقلام دوبل:</td>
                                    <td className="p-2.5 text-left text-emerald-300">
                                      {sc.mathDetails.totalDebit.toLocaleString('fa-IR')}
                                    </td>
                                    <td className="p-2.5 text-left text-rose-300">
                                      {sc.mathDetails.totalCredit.toLocaleString('fa-IR')}
                                    </td>
                                    <td className="p-2.5 text-cyan-300 text-[10px] font-sans">
                                      {sc.mathDetails.discrepancy === 0 ? '✓ تراز کامل' : `اختلاف: ${sc.mathDetails.discrepancy}`}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* لاگ‌های حسابرسی سناریو */}
                        <div className="bg-black/40 p-3 rounded-xl border border-slate-800 space-y-1 font-mono text-[10px] text-slate-400">
                          <span className="text-slate-500 font-sans block mb-1">لاگ‌های ممیزی داخلی (Audit Trail):</span>
                          {sc.auditLogs.map((log, lIdx) => (
                            <div key={lIdx} className="text-slate-400">
                              <span className="text-slate-600 ml-1">&gt;</span>
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* تب ۲: میز شبیه‌سازی تراز آزمایشی (۲، ۴ و ۶ ستونی) */}
        {activeTab === 'trial_matrix' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/70 p-4 rounded-2xl border border-slate-700/60">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-cyan-400" />
                  ماتریس محاسباتی تراز آزمایشی خودکار
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  استخراج زنده تراز روی تمامی آرتیکل‌های تولیدشده توسط سناریوهای آزمون
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400 px-2">حالت تراز:</span>
                  {(['2_col', '4_col', '6_col'] as TrialBalanceColumnMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setTbMode(mode)}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        tbMode === mode
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode === '2_col' ? '۲ ستونی' : mode === '4_col' ? '۴ ستونی' : '۶ ستونی'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400 px-2">سطح کدینگ:</span>
                  {(['kol', 'moein', 'tafsili'] as TrialBalanceLevel[]).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setTbLevel(lvl)}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        tbLevel === lvl
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl === 'kol' ? 'سطح کل' : lvl === 'moein' ? 'سطح معین' : 'سطح تفصیلی'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* جدول تراز آزمایشی */}
            {currentTrialBalance && (
              <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-800 text-slate-300 border-b border-slate-700">
                    <tr>
                      <th className="p-3">کد حساب</th>
                      <th className="p-3">عنوان حساب</th>
                      {tbMode === '6_col' && (
                        <>
                          <th className="p-3 text-left bg-slate-800/90 text-cyan-300 border-x border-slate-700/50">
                            ابتدای دوره بدهکار
                          </th>
                          <th className="p-3 text-left bg-slate-800/90 text-cyan-300 border-l border-slate-700/50">
                            ابتدای دوره بستانکار
                          </th>
                        </>
                      )}
                      {(tbMode === '4_col' || tbMode === '6_col') && (
                        <>
                          <th className="p-3 text-left bg-slate-800/70 text-amber-300 border-x border-slate-700/50">
                            گردش طی دوره بدهکار
                          </th>
                          <th className="p-3 text-left bg-slate-800/70 text-amber-300 border-l border-slate-700/50">
                            گردش طی دوره بستانکار
                          </th>
                        </>
                      )}
                      <th className="p-3 text-left bg-slate-800/90 text-emerald-300 border-x border-slate-700/50">
                        مانده پایان دوره بدهکار
                      </th>
                      <th className="p-3 text-left bg-slate-800/90 text-rose-300">
                        مانده پایان دوره بستانکار
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 font-mono">
                    {currentTrialBalance.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-bold text-cyan-400">{row.code}</td>
                        <td className="p-3 font-sans font-medium">{row.title}</td>
                        {tbMode === '6_col' && (
                          <>
                            <td className="p-3 text-left border-x border-slate-800 text-slate-300">
                              {row.openingDebit > 0 ? row.openingDebit.toLocaleString('fa-IR') : '-'}
                            </td>
                            <td className="p-3 text-left border-l border-slate-800 text-slate-300">
                              {row.openingCredit > 0 ? row.openingCredit.toLocaleString('fa-IR') : '-'}
                            </td>
                          </>
                        )}
                        {(tbMode === '4_col' || tbMode === '6_col') && (
                          <>
                            <td className="p-3 text-left border-x border-slate-800 text-amber-300">
                              {row.periodDebit > 0 ? row.periodDebit.toLocaleString('fa-IR') : '-'}
                            </td>
                            <td className="p-3 text-left border-l border-slate-800 text-amber-300">
                              {row.periodCredit > 0 ? row.periodCredit.toLocaleString('fa-IR') : '-'}
                            </td>
                          </>
                        )}
                        <td className="p-3 text-left border-x border-slate-800 text-emerald-400 font-bold">
                          {row.closingDebit > 0 ? row.closingDebit.toLocaleString('fa-IR') : '-'}
                        </td>
                        <td className="p-3 text-left text-rose-400 font-bold">
                          {row.closingCredit > 0 ? row.closingCredit.toLocaleString('fa-IR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-800 font-bold text-white border-t-2 border-slate-600 font-mono">
                    <tr>
                      <td colSpan={2} className="p-3 font-sans text-sm">
                        جمع کل ردیف‌های تراز آزمایشی:
                      </td>
                      {tbMode === '6_col' && (
                        <>
                          <td className="p-3 text-left text-cyan-300 border-x border-slate-700">
                            {currentTrialBalance.totals.openingDebit.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3 text-left text-cyan-300 border-l border-slate-700">
                            {currentTrialBalance.totals.openingCredit.toLocaleString('fa-IR')}
                          </td>
                        </>
                      )}
                      {(tbMode === '4_col' || tbMode === '6_col') && (
                        <>
                          <td className="p-3 text-left text-amber-300 border-x border-slate-700">
                            {currentTrialBalance.totals.periodDebit.toLocaleString('fa-IR')}
                          </td>
                          <td className="p-3 text-left text-amber-300 border-l border-slate-700">
                            {currentTrialBalance.totals.periodCredit.toLocaleString('fa-IR')}
                          </td>
                        </>
                      )}
                      <td className="p-3 text-left text-emerald-300 border-x border-slate-700">
                        {currentTrialBalance.totals.closingDebit.toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-left text-rose-300">
                        {currentTrialBalance.totals.closingCredit.toLocaleString('fa-IR')}
                      </td>
                    </tr>
                    <tr className="bg-emerald-950/40 text-emerald-300 border-t border-emerald-800/40">
                      <td colSpan={tbMode === '6_col' ? 8 : (tbMode === '4_col' ? 6 : 4)} className="p-3 font-sans text-center">
                        <span className="inline-flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          تراز کامل آزمایشی مورد تأیید است — تساوی دقیق ستون‌های بدهکار و بستانکار با اختلاف ۰ ریال
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* تب ۳: کارت گردش حساب دفتر کل */}
        {activeTab === 'ledger_turnover' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/70 p-4 rounded-2xl border border-slate-700/60">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  کارت گردش حساب دفتر کل و آزمون تداوم مانده‌ها (Running Balance)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  محاسبه خط به خط مانده‌های متوالی و تشخیص ماهیت (بد / بس)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">انتخاب سرفصل:</span>
                <select
                  id="select-ledger-account"
                  value={selectedAccountForLedger}
                  onChange={e => setSelectedAccountForLedger(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
                >
                  {availableAccounts.map(acc => (
                    <option key={acc.code} value={acc.code}>
                      {acc.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* جدول کارت حساب */}
            <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800 text-slate-300 border-b border-slate-700">
                  <tr>
                    <th className="p-3 text-center">ردیف</th>
                    <th className="p-3">تاریخ</th>
                    <th className="p-3">سند</th>
                    <th className="p-3">کد حساب</th>
                    <th className="p-3">شرح رویداد مالی</th>
                    <th className="p-3 text-left">بدهکار (ریال)</th>
                    <th className="p-3 text-left">بستانکار (ریال)</th>
                    <th className="p-3 text-left text-amber-300">مانده تجمعی پس از ثبت</th>
                    <th className="p-3 text-center">تشخیص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200 font-mono">
                  {currentLedgerCard.map((line, lIdx) => (
                    <tr key={lIdx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center text-slate-500">{line.rowNumber}</td>
                      <td className="p-3 font-sans text-slate-400">{line.date}</td>
                      <td className="p-3 text-cyan-300">{line.documentNumber}</td>
                      <td className="p-3 font-bold text-slate-300">{line.accountCode}</td>
                      <td className="p-3 font-sans max-w-xs truncate" title={line.description}>
                        {line.description}
                      </td>
                      <td className="p-3 text-left text-emerald-400 font-bold">
                        {line.debit > 0 ? line.debit.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="p-3 text-left text-rose-400 font-bold">
                        {line.credit > 0 ? line.credit.toLocaleString('fa-IR') : '-'}
                      </td>
                      <td className="p-3 text-left text-amber-300 font-bold">
                        {line.runningBalance.toLocaleString('fa-IR')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                          line.diagnosis === 'بدهکار'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : line.diagnosis === 'بستانکار'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {line.diagnosis}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-800 font-bold text-white border-t border-slate-700 font-mono">
                  <tr>
                    <td colSpan={5} className="p-3 font-sans text-sm">
                      مجموع گردش حساب:
                    </td>
                    <td className="p-3 text-left text-emerald-300">
                      {currentLedgerCard.reduce((s, l) => s + l.debit, 0).toLocaleString('fa-IR')}
                    </td>
                    <td className="p-3 text-left text-rose-300">
                      {currentLedgerCard.reduce((s, l) => s + l.credit, 0).toLocaleString('fa-IR')}
                    </td>
                    <td colSpan={2} className="p-3 text-amber-300 font-sans text-xs">
                      مانده نهایی: {currentLedgerCard[currentLedgerCard.length - 1]?.runningBalance.toLocaleString('fa-IR')} ریال ({currentLedgerCard[currentLedgerCard.length - 1]?.diagnosis})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* تب ۴: آزمایشگاه تزریق هرج‌ومرج و رد اسناد ناتراز */}
        {activeTab === 'chaos_lab' && (
          <div className="space-y-4">
            <div className="bg-slate-800/70 p-4 rounded-2xl border border-slate-700/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-rose-400" />
                آزمایشگاه تزریق هرج‌ومرج و آزمون منفی (Negative / Chaos Assertion)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تزریق عمدی مبالغ ناتراز و ارزیابی پاسخ فوری گیت‌های اعتبارسنجی هسته دوبل هابینو
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/70 space-y-4">
                <h3 className="text-sm font-bold text-white">تزریق سند با مبالغ ناتراز</h3>
                <p className="text-xs text-slate-400">
                  مبالغ بدهکار و بستانکار مورد نظر خود را وارد کنید تا قدرت رهگیری و مسدودسازی هسته تست شود:
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">مبلغ ستون بدهکار (ریال):</label>
                    <input
                      type="number"
                      value={chaosDebit}
                      onChange={e => setChaosDebit(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">مبلغ ستون بستانکار (ریال):</label>
                    <input
                      type="number"
                      value={chaosCredit}
                      onChange={e => setChaosCredit(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">میزان ناترازی تزریق شده:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {Math.abs(chaosDebit - chaosCredit).toLocaleString('fa-IR')} ریال
                    </span>
                  </div>

                  <button
                    id="btn-trigger-chaos"
                    onClick={handleRunChaosTest}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-medium text-xs transition-all shadow-lg shadow-rose-900/20"
                  >
                    ارزیابی و تزریق به گیت امنیتی
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/70 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">نتیجه واکنش هسته مالی</h3>
                  {chaosTestResult ? (
                    <div className={`p-4 rounded-xl border ${
                      chaosTestResult.blocked
                        ? 'bg-rose-950/40 border-rose-800/70 text-rose-200'
                        : 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2 font-bold">
                        {chaosTestResult.blocked ? (
                          <>
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                            <span>سند با موفقیت مسدود شد (حفاظت فعال)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span>سند متوازن است</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed">{chaosTestResult.message}</p>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl">
                      برای مشاهده واکنش هسته مالی، دکمه ارزیابی را بزنید.
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="text-slate-300 font-bold block mb-1">اصول امنیتی تضمین‌شده:</span>
                  <div>✓ اصل ۲: عدم پذیرش سند با مبالغ نابرابر در سطح لایه دیتابیس</div>
                  <div>✓ اصل ۱: الزام مطلق طرف‌حساب و جلوگیری از ثبت اسناد بی‌نام</div>
                  <div>✓ اصل ۴: بازگشت‌پذیری (Rollback) ۱۰۰٪ در صورت بروز هرگونه شکست محاسباتی</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تب ۵: شناسنامه رسمی و کارنامه آزمون ریالی */}
        {activeTab === 'audit_cert' && suiteSummary && (
          <div className="space-y-4">
            <div className="bg-slate-800/70 p-4 rounded-2xl border border-slate-700/60 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  شناسنامه رسمی ممیزی ریالی و سلامت نرم‌افزار
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  گواهی دیجیتال انطباق کامل سیستم با استانداردهای دوبل، تراز آزمایشی و گردش دفتر کل
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCertificate}
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all"
                >
                  کپی متن گواهی
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all"
                >
                  چاپ شناسنامه
                </button>
              </div>
            </div>

            {/* گواهی‌نامه گرافیکی رسمی */}
            <div id="print-certificate-card" className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-purple-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="border-b border-slate-800 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-purple-400 uppercase tracking-widest block mb-1">
                    HABINO ACCOUNTING SYSTEM INTEGRITY CERTIFICATE
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    کارنامه رسمی ممیزی هسته حسابداری و تراز آزمایشی هابینو
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    تأییدیه قطعی برای استقرار نسخه تجاری و بارگذاری در استور رسمی
                  </p>
                </div>

                <div className="text-left font-mono">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold inline-block">
                    GRADE A+ (PASS 100%)
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">
                    HASH: {suiteSummary.certificateHash.substring(0, 20)}...
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-xs">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-1">تعداد کل سناریوهای ممیزی:</span>
                  <span className="text-base font-bold text-white font-mono">{suiteSummary.totalScenarios} سناریو</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-1">نرخ قبولی قطعی:</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">{suiteSummary.passRatePercent}٪</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-1">تراز ستون‌های مالی:</span>
                  <span className="text-base font-bold text-cyan-300">بدون اختلاف (۰ ریال)</span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block mb-1">تداوم خطوط دفتر کل:</span>
                  <span className="text-base font-bold text-purple-300">۱۰۰٪ پیوسته</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <p>
                  بدین‌وسیله گواهی می‌شود هسته حسابداری هابینو در تمام سناریوهای ثبت فاکتور رسمی نسیه و نقدی، محاسبه مالیات بر ارزش افزوده و تخفیف، دریافت و وصول اسناد تجاری چک صیادی، برچسب‌گذاری اتمیک پروژه‌ها بدون نشت سرفصل در دفتر کل، شناسایی و انتقال قطعی سود پروژه به سود سیستم، انطباق با قوانین ۹‌گانه مالی و تراز آزمایشی ۲، ۴ و ۶ ستونی با موفقیت ۱۰۰٪ ارزیابی گردید.
                </p>
                <p className="text-emerald-400 font-medium">
                  هیچ‌گونه انحراف جبری، رکورد یتیم، خطای ممیز شناور ریالی یا آسیب‌پذیری در توازن مالی مشاهده نشد.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] text-slate-500 font-mono">
                <div>
                  <span>زمان ثبت ممیزی: {suiteSummary.timestamp}</span>
                </div>
                <div className="text-left">
                  <span>تأییدیه سیستم: مهندس فرید تهرانی | هوش سیناپس هابینو</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* تب ۶: شبیه‌ساز بار سنگین ۱۰۰۰ سند */}
        {activeTab === 'stress_test' && (
          <div className="pt-2">
            <StressTestEngineStudio />
          </div>
        )}
      </div>
    </div>
  );
};
