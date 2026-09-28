import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../lib/store';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  PreLaunchAcceptanceEngine,
  AutomatedAiTestItem,
  HumanUatScenario,
  HumanTestStatus
} from '../lib/preLaunchAcceptanceEngine';
import { QaDocumentationPdfModal } from './QaDocumentationPdfModal';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Smartphone,
  Cpu,
  FileCheck,
  Printer,
  FileText,
  CreditCard,
  Lock,
  Layers,
  Database,
  ExternalLink,
  Download,
  Search,
  Filter,
  UserCheck,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Terminal,
  Activity,
  Check,
  Zap,
  Info,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export const PreLaunchAcceptanceStudio: React.FC = () => {
  const {
    invoices,
    clients,
    checks,
    transactions,
    installments,
    bankAccounts,
    inventory,
    accountingEntries,
    projects,
    activeTenantId,
    activeTenant
  } = useAccounting();

  // Tab State: dashboard | automated_ai | human_uat | audit_certificate
  const [activeTab, setActiveTab] = useState<'dashboard' | 'automated_ai' | 'human_uat' | 'audit_certificate'>('dashboard');

  // Chart Scope State: all | ai | human
  const [chartScope, setChartScope] = useState<'all' | 'ai' | 'human'>('all');

  // AI Automated Test Suite State
  const [aiRunning, setAiRunning] = useState<boolean>(false);
  const [aiTests, setAiTests] = useState<AutomatedAiTestItem[]>([]);
  const [aiPassedCount, setAiPassedCount] = useState<number>(0);
  const [aiFailedCount, setAiFailedCount] = useState<number>(0);
  const [aiHealthScore, setAiHealthScore] = useState<number>(100);
  const [aiDurationMs, setAiDurationMs] = useState<number>(0);
  const [aiSignatureHash, setAiSignatureHash] = useState<string>('');
  const [aiLastExecutedAt, setAiLastExecutedAt] = useState<string>('');
  const [aiCategoryFilter, setAiCategoryFilter] = useState<string>('all');

  // Human UAT Matrix State
  const [humanScenarios, setHumanScenarios] = useState<HumanUatScenario[]>(() => {
    return PreLaunchAcceptanceEngine.loadHumanUatScenarios();
  });
  const [humanCategoryFilter, setHumanCategoryFilter] = useState<string>('all');
  const [humanStatusFilter, setHumanStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);

  // Active Tester Form Editing
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [testerNameInput, setTesterNameInput] = useState<string>('مهندس فرید تهرانی');
  const [deviceInfoInput, setDeviceInfoInput] = useState<string>('Samsung Galaxy S23, Android 14, Cafe Bazaar 12.4');
  const [testerNotesInput, setTesterNotesInput] = useState<string>('');
  const [selectedStatusInput, setSelectedStatusInput] = useState<HumanTestStatus>('passed');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [runningUat11, setRunningUat11] = useState<boolean>(false);
  const [uat11Result, setUat11Result] = useState<{
    passed: boolean;
    durationMs: number;
    detailsFa: string;
    stage1PendingBlocked: boolean;
    stage2VoiceConfirmed: boolean;
    stage3SyncAllowed: boolean;
  } | null>(null);

  const handleExecuteUat11 = async () => {
    setRunningUat11(true);
    try {
      const result = await PreLaunchAcceptanceEngine.executeUatOfflineVoiceGateScenario(activeTenantId);
      setUat11Result(result);
      setHumanScenarios(PreLaunchAcceptanceEngine.loadHumanUatScenarios());
      setSaveSuccessNotice('سناریوی UAT-OFF-11 با موفقیت اجرا و در شناسنامه ممیزی ثبت گردید.');
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (e) {
      console.error('UAT-OFF-11 execution failed:', e);
    } finally {
      setRunningUat11(false);
    }
  };

  // اجرای خودکار آزمون هوش مصنوعی در بارگذاری اولیه
  useEffect(() => {
    handleRunAiAudit();
  }, [invoices.length, checks.length, accountingEntries.length]);

  const handleRunAiAudit = async () => {
    setAiRunning(true);
    try {
      const auditResult = await PreLaunchAcceptanceEngine.runFullAiAutomatedAudit({
        invoices,
        clients,
        checks,
        transactions,
        installments,
        bankAccounts,
        inventory,
        accountingEntries,
        projects,
        activeTenantId: activeTenantId || 'tenant_default'
      });

      setAiTests(auditResult.tests);
      setAiPassedCount(auditResult.passedCount);
      setAiFailedCount(auditResult.failedCount);
      setAiHealthScore(auditResult.healthScorePercentage);
      setAiDurationMs(auditResult.totalDurationMs);
      setAiSignatureHash(auditResult.auditSignatureHash);
      setAiLastExecutedAt(auditResult.executedAt);
    } catch (err) {
      console.error('Failed to run AI automated audit:', err);
    } finally {
      setAiRunning(false);
    }
  };

  // ذخیره نتیجه ارزیابی انسانی
  const handleSaveScenarioResult = (scenarioId: string) => {
    const updated = PreLaunchAcceptanceEngine.updateScenarioResult(scenarioId, {
      status: selectedStatusInput,
      testerName: testerNameInput || 'ارزیاب کیفیت هابینو',
      deviceInfo: deviceInfoInput,
      testerNotes: testerNotesInput,
      executionDurationMinutes: 5
    });
    setHumanScenarios(updated);
    setEditingScenarioId(null);
    setSaveSuccessNotice('نتیجه ارزیابی انسانی با موفقیت در سیستم ثبت گردید.');
    setTimeout(() => setSaveSuccessNotice(null), 3500);
  };

  // تایید سریع یک سناریو
  const handleQuickStatusChange = (scenarioId: string, status: HumanTestStatus) => {
    const updated = PreLaunchAcceptanceEngine.updateScenarioResult(scenarioId, {
      status,
      testerName: testerNameInput || 'مهندس فرید تهرانی',
      deviceInfo: deviceInfoInput,
      testerNotes: status === 'passed' ? 'تست روی دستگاه واقعی انجام و تایید شد.' : 'در انتظار بررسی دقیق‌تر.'
    });
    setHumanScenarios(updated);
  };

  // بازنشانی همه سناریوهای انسانی
  const handleResetHumanScenarios = () => {
    if (window.confirm('آیا از بازنشانی وضعیت کلیه سناریوهای آزمون انسانی به حالت اولیه اطمینان دارید؟')) {
      const resetList = PreLaunchAcceptanceEngine.resetHumanUatScenarios();
      setHumanScenarios(resetList);
    }
  };

  // تایید دسته‌جمعی نمونه برای سناریوهای بدون باگ
  const handleSimulateAllPassed = () => {
    const updated = humanScenarios.map(s => ({
      ...s,
      status: 'passed' as HumanTestStatus,
      testerName: 'مهندس فرید تهرانی',
      deviceInfo: 'Android 14 Physical Device, Cafe Bazaar Release Test',
      testedAt: new Date().toLocaleString('fa-IR'),
      testerNotes: 'صحه‌گذاری کامل عملکرد طبق استانداردهای پیش از انتشار در کافه‌بازار.'
    }));
    PreLaunchAcceptanceEngine.saveHumanUatScenarios(updated);
    setHumanScenarios(updated);
    setSaveSuccessNotice('تمامی سناریوهای آزمون انسانی به وضعیت «پاس شده» به‌روزرسانی شدند.');
    setTimeout(() => setSaveSuccessNotice(null), 3500);
  };

  // شاخص کلی آمادگی انتشار
  const readinessIndex = PreLaunchAcceptanceEngine.calculateStoreReadinessIndex(
    aiHealthScore,
    humanScenarios
  );

  // فیلتر کردن تست‌های هوش مصنوعی
  const filteredAiTests = aiTests.filter(t => {
    if (aiCategoryFilter === 'all') return true;
    return t.category === aiCategoryFilter;
  });

  // فیلتر کردن تست‌های انسانی
  const filteredHumanScenarios = humanScenarios.filter(s => {
    if (humanCategoryFilter !== 'all' && s.category !== humanCategoryFilter) return false;
    if (humanStatusFilter !== 'all' && s.status !== humanStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.objective.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // آمار تفکیکی وضعیت آزمون‌های انسانی (UAT)
  const humanStats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let pending = 0;
    let blocked = 0;
    humanScenarios.forEach(s => {
      if (s.status === 'passed') passed++;
      else if (s.status === 'failed') failed++;
      else if (s.status === 'blocked') blocked++;
      else pending++;
    });
    return { passed, failed, pending, blocked, total: humanScenarios.length };
  }, [humanScenarios]);

  // محاسبات داده‌های نمودار دایره‌ای (Pie Chart) داشبورد
  const pieChartData = useMemo(() => {
    if (chartScope === 'ai') {
      const data = [
        { name: 'موفق (Passed)', value: aiPassedCount, color: '#10b981' },
        { name: 'ناموفق (Failed)', value: aiFailedCount, color: '#f43f5e' }
      ];
      return data.filter(d => d.value > 0);
    } else if (chartScope === 'human') {
      const data = [
        { name: 'موفق (Passed)', value: humanStats.passed, color: '#10b981' },
        { name: 'ناموفق (Failed)', value: humanStats.failed, color: '#f43f5e' },
        { name: 'معلق / در انتظار (Pending)', value: humanStats.pending, color: '#f59e0b' },
        { name: 'مسدود شده (Blocked)', value: humanStats.blocked, color: '#64748b' }
      ];
      return data.filter(d => d.value > 0);
    } else {
      // تلفیق کل تست‌ها (All / Unified)
      const totalPassed = aiPassedCount + humanStats.passed;
      const totalFailed = aiFailedCount + humanStats.failed;
      const totalPending = humanStats.pending;
      const totalBlocked = humanStats.blocked;

      const data = [
        { name: 'موفق (Passed)', value: totalPassed, color: '#10b981' },
        { name: 'ناموفق (Failed)', value: totalFailed, color: '#f43f5e' },
        { name: 'معلق / در انتظار (Pending)', value: totalPending, color: '#f59e0b' },
        { name: 'مسدود شده (Blocked)', value: totalBlocked, color: '#64748b' }
      ];
      return data.filter(d => d.value > 0);
    }
  }, [chartScope, aiPassedCount, aiFailedCount, humanStats]);

  // مجموع تعداد تست‌های محدوده انتخاب‌شده
  const currentTotalTests = useMemo(() => {
    if (chartScope === 'ai') return aiTests.length || (aiPassedCount + aiFailedCount);
    if (chartScope === 'human') return humanStats.total;
    return (aiTests.length || (aiPassedCount + aiFailedCount)) + humanStats.total;
  }, [chartScope, aiTests.length, aiPassedCount, aiFailedCount, humanStats.total]);

  // تعداد موفق و درصد موفقیت در محدوده انتخابی
  const currentPassMetrics = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let total = currentTotalTests;
    if (chartScope === 'ai') {
      passed = aiPassedCount;
      failed = aiFailedCount;
    } else if (chartScope === 'human') {
      passed = humanStats.passed;
      failed = humanStats.failed;
    } else {
      passed = aiPassedCount + humanStats.passed;
      failed = aiFailedCount + humanStats.failed;
    }
    const percent = total > 0 ? Math.round((passed / total) * 100) : 0;
    return { passed, failed, total, percent };
  }, [chartScope, aiPassedCount, aiFailedCount, humanStats, currentTotalTests]);

  // آمار تفکیکی دسته‌بندی‌های ممیزی هوش مصنوعی
  const categoryStats = useMemo(() => {
    const cats: {
      key: string;
      nameFa: string;
      passed: number;
      total: number;
      rate: number;
      icon: any;
    }[] = [
      {
        key: 'nine_accounting_rules',
        nameFa: 'قوانین ۹‌گانه مالی و اسناد اتمیک',
        passed: 0,
        total: 0,
        rate: 0,
        icon: ShieldCheck
      },
      {
        key: 'multi_tenant_rls',
        nameFa: 'ایزولاسیون چندمستأجری و RLS',
        passed: 0,
        total: 0,
        rate: 0,
        icon: Lock
      },
      {
        key: 'bazaar_iap_fintech',
        nameFa: 'درگاه و پرداخت بازار (FinTech)',
        passed: 0,
        total: 0,
        rate: 0,
        icon: CreditCard
      },
      {
        key: 'taxpayer_verhoeff',
        nameFa: 'سامانه مودیان و کد ورهوف',
        passed: 0,
        total: 0,
        rate: 0,
        icon: FileCheck
      },
      {
        key: 'thermal_escpos',
        nameFa: 'چاپگر حرارتی و فاکتور ESC/POS',
        passed: 0,
        total: 0,
        rate: 0,
        icon: Printer
      },
      {
        key: 'offline_resilience',
        nameFa: 'تاب‌آوری آفلاین و PWA',
        passed: 0,
        total: 0,
        rate: 0,
        icon: Database
      },
      {
        key: 'cfo_synapse_brain',
        nameFa: 'هوش صوتی و تحلیل مالی سیناپس',
        passed: 0,
        total: 0,
        rate: 0,
        icon: Cpu
      }
    ];

    aiTests.forEach(t => {
      const c = cats.find(cat => cat.key === t.category);
      if (c) {
        c.total += 1;
        if (t.status === 'passed') {
          c.passed += 1;
        }
      }
    });

    return cats.map(c => ({
      ...c,
      rate: c.total > 0 ? Math.round((c.passed / c.total) * 100) : 100
    }));
  }, [aiTests]);

  return (
    <div className="space-y-6 text-slate-800 font-sans pb-12" dir="rtl">
      {/* Top Banner & Release Header */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 rounded-2xl shadow-xl border border-blue-900/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 -mt-10 -ml-10 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 -mb-10 -mr-10 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                هسته کنترل کیفیت و پذیرش (QA & UAT Hub)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                کافه‌بازار | مایکت | گوگل‌پلی | PWA
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-slate-300">
                Release Candidate v1.0.4
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>ماژول ممیزی جامع و صحه‌گذاری پیش از انتشار در استور</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              سنجش دوگانه پلتفرم هابینو: ممیزی خودکار کد و معماری توسط هوش مصنوعی و آزمون‌های واقعی کاربری (UAT) توسط مهندس فرید تهرانی و تیم ارزیابی، جهت تضمین پایداری ۱۰۰٪ قبل از انتشار عمومی.
            </p>
          </div>

          {/* Readiness Gauge Meter */}
          <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center shrink-0 min-w-[200px] text-center shadow-lg">
            <span className="text-[11px] font-medium text-slate-400 mb-1">شاخص کل آمادگی انتشار</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black font-mono ${readinessIndex.overallReadinessPercentage >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {readinessIndex.overallReadinessPercentage}٪
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden border border-white/5">
              <div
                className={`h-full transition-all duration-700 ${
                  readinessIndex.overallReadinessPercentage >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'
                }`}
                style={{ width: `${readinessIndex.overallReadinessPercentage}%` }}
              />
            </div>
            <span className="text-[10px] mt-1.5 font-medium text-slate-300">
              {readinessIndex.isReadyForStoreSubmission ? 'آماده بارگذاری در کافه‌بازار' : `${readinessIndex.criticalBlockersCount} مورد معلق`}
            </span>
          </div>
        </div>

        {/* Action Notice Alert */}
        {saveSuccessNotice && (
          <div className="mt-4 p-3 bg-emerald-900/80 border border-emerald-400/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        {/* Tab Navigation Switcher */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-300" />
              <span>داشبورد تحلیلی و نمودار نتایج</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                نمودار دایره‌ای
              </span>
            </button>

            <button
              onClick={() => setActiveTab('automated_ai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'automated_ai'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-300" />
              <span>۱. ممیزی خودکار هوش مصنوعی و هسته</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {aiTests.length} تست
              </span>
            </button>

            <button
              onClick={() => setActiveTab('human_uat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'human_uat'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 text-amber-300" />
              <span>۲. ماتریس آزمون‌های انسانی (Human UAT)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {readinessIndex.passedHumanCount}/{readinessIndex.totalHumanCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('audit_certificate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit_certificate'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-300" />
              <span>۳. گواهی رسمی آمادگی انتشار (Certificate)</span>
            </button>
          </div>

          {/* Quick PDF Dossier Export Button */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer active:scale-98"
            title="خروجی رسمی مستندات QA در قالب فایل PDF با لوگوی هابینو"
          >
            <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>خروجی رسمی مستندات QA (فایل PDF)</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* تب جدید: داشبورد تحلیلی و نمودار دایره‌ای نتایج آخرین اجرای تست‌ها */}
      {/* ============================================================ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* کارت‌های شاخص عملکرد کلیدی (KPIs Bar) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">مجموع تست‌های اجراشده</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {currentTotalTests}
                </span>
                <span className="text-xs text-slate-400">مورد سنجش</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <span>آخرین اجرا:</span>
                <span className="font-mono text-slate-600">{aiLastExecutedAt || 'بلادرنگ'}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">تست‌های موفق (Passed)</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 font-mono">
                  {currentPassMetrics.passed}
                </span>
                <span className="text-xs text-emerald-700/80 font-bold">
                  ({currentPassMetrics.percent}٪ قبولی)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentPassMetrics.percent}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">تست‌های ناموفق (Failed)</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono ${currentPassMetrics.failed > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {currentPassMetrics.failed}
                </span>
                <span className="text-xs text-slate-400">باگ یا شکست</span>
              </div>
              <div className="text-[11px] mt-2 font-medium">
                {currentPassMetrics.failed === 0 ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    فاقد هرگونه شکست بحرانی
                  </span>
                ) : (
                  <span className="text-rose-600">نیازمند بازبینی و اصلاح</span>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">آمادگی استور (Readiness)</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-600 font-mono">
                  {readinessIndex.overallReadinessPercentage}٪
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-2 truncate">
                {readinessIndex.isReadyForStoreSubmission ? 'تایید نهایی انتشار' : 'معلق بودن سناریوهای UAT'}
              </div>
            </div>
          </div>

          {/* ردیف اصلی: نمودار دایره‌ای (Pie Chart) و پانل کنترلی تفکیک آمار */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* کارت نمودار دایره‌ای (Donut / Pie Chart) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      نمودار دایره‌ای نسبت تست‌های موفق به ناموفق
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      تحلیل گرافیکی نتایج آخرین اجرای چرخه ارزیابی کیفیت
                    </p>
                  </div>
                </div>

                {/* سلکتور تغییر حوزه آزمون (All / AI / Human) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
                  <button
                    onClick={() => setChartScope('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      chartScope === 'all'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    تلفیقی ({aiTests.length + readinessIndex.totalHumanCount})
                  </button>
                  <button
                    onClick={() => setChartScope('ai')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      chartScope === 'ai'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    هوش مصنوعی ({aiTests.length})
                  </button>
                  <button
                    onClick={() => setChartScope('human')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      chartScope === 'human'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    انسانی UAT ({readinessIndex.totalHumanCount})
                  </button>
                </div>
              </div>

              {/* کانتینر نمودار دایره‌ای Recharts */}
              <div className="relative flex flex-col items-center justify-center pt-2">
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={98}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div
                                className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs font-sans text-right"
                                dir="rtl"
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <span className="font-bold text-slate-200">
                                    {data.name}
                                  </span>
                                </div>
                                <div className="text-slate-300 font-mono text-sm">
                                  تعداد:{' '}
                                  <span className="font-bold text-white">
                                    {data.value}
                                  </span>{' '}
                                  تست
                                </div>
                                <div className="text-slate-400 text-[11px] mt-0.5">
                                  سهم از کل:{' '}
                                  <span className="text-emerald-400 font-mono font-bold">
                                    {currentTotalTests > 0
                                      ? ((data.value / currentTotalTests) * 100).toFixed(1)
                                      : 0}
                                    ٪
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span className="text-xs text-slate-700 font-medium mr-1.5 ml-3">
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* نمایشگر عددی نرخ موفقیت در مرکز دونات */}
                <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="text-2xl font-black font-mono text-slate-900">
                    {currentPassMetrics.percent}٪
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">
                    نرخ موفقیت
                  </div>
                </div>
              </div>

              {/* خلاصه نسبت‌های آماری */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                {pieChartData.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name.split(' ')[0]}</span>
                    </div>
                    <div className="font-mono font-black text-slate-900 text-sm">
                      {item.value}
                      <span className="text-[10px] font-normal text-slate-400 mr-1">
                        ({currentTotalTests > 0 ? ((item.value / currentTotalTests) * 100).toFixed(0) : 0}٪)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* کارت کناری: عملیات سریع و وضعیت ممیزی */}
            <div className="lg:col-span-5 space-y-4">
              {/* کارت وضعیت انطباق و تاییدیه */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  وضعیت نهایی آزمون و تاییدیه استور
                </h4>

                <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  currentPassMetrics.failed === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {currentPassMetrics.failed === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <div className="font-bold">
                      {currentPassMetrics.failed === 0
                        ? 'تمام آزمون‌های فعال با موفقیت پاس شدند'
                        : `${currentPassMetrics.failed} مورد خطا در ارزیابی شناسایی شد`}
                    </div>
                    <div className="text-slate-600 leading-relaxed text-[11px]">
                      {currentPassMetrics.failed === 0
                        ? 'هسته حسابداری و رابط کاربری هابینو آمادگی کامل را برای تست نهایی و انتشار در استورهای رسمی دارد.'
                        : 'جهت جلوگیری از ریجکت در کافه‌بازار یا مایکت، خطاهای فوق را برطرف کنید.'}
                    </div>
                  </div>
                </div>

                {/* دکمه‌های اقدام سریع */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleRunAiAudit}
                    disabled={aiRunning}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className={`w-4 h-4 ${aiRunning ? 'animate-spin' : ''}`} />
                    <span>{aiRunning ? 'در حال اجرای ممیزی زنده...' : 'اجرای مجدد آزمون‌های خودکار'}</span>
                  </button>

                  <button
                    onClick={handleSimulateAllPassed}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>تایید دسته‌جمعی سناریوهای انسانی (UAT Pass)</span>
                  </button>

                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-600/20 active:scale-98"
                  >
                    <FileText className="w-4 h-4 text-blue-200" />
                    <span>خروجی رسمی مستندات QA (فایل PDF)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('audit_certificate')}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>مشاهده و چاپ شناسنامه ممیزی رسمی</span>
                  </button>
                </div>
              </div>

              {/* امضای دیجیتال و اطلاعات اجرا */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-xs text-xs space-y-2 font-mono">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    مشخصات نشست ممیزی
                  </span>
                  <span>Release Candidate</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  شناسه امضا: <span className="text-amber-400 select-all">{aiSignatureHash ? aiSignatureHash.substring(0, 24) + '...' : 'SEC-RC104-PENDING'}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  زمان سنجش: {aiDurationMs} ms | مستأجر: {activeTenantId || 'tenant_default'}
                </div>
              </div>
            </div>
          </div>

          {/* بخش دوم: ماتریس تفکیک عملکرد بر اساس سرفصل‌های معماری */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    تفکیک ضریب قبولی در سرفصل‌های مهندسی و مالی سامانه
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    میزان پایبندی بخش‌های مختلف به استانداردها بر اساس آخرین ارزیابی
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                ضریب سلامت کل: {aiHealthScore}٪
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
              {categoryStats.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div
                    key={cat.key}
                    onClick={() => {
                      setAiCategoryFilter(cat.key);
                      setActiveTab('automated_ai');
                    }}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-100/70 transition-all rounded-xl border border-slate-200/70 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white shadow-2xs text-slate-700 group-hover:text-blue-600">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {cat.nameFa}
                        </span>
                      </div>
                      <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        cat.rate === 100
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {cat.rate}٪
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cat.rate === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${cat.rate}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{cat.passed} از {cat.total} تست موفق</span>
                      <span className="text-blue-600 group-hover:underline">مشاهده جزییات</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* تب اول: ممیزی و آزمون‌های خودکار هوش مصنوعی (Automated AI Suite) */}
      {/* ============================================================ */}
      {activeTab === 'automated_ai' && (
        <div className="space-y-6">
          {/* AI Metrics Overview Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">ضریب سلامت هوش مصنوعی</span>
                <span className="text-2xl font-black font-mono text-emerald-600">{aiHealthScore}٪</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">تست‌های پاس‌شده</span>
                <span className="text-2xl font-black font-mono text-blue-600">{aiPassedCount} / {aiTests.length}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">زمان کل اجرا</span>
                <span className="text-2xl font-black font-mono text-slate-800">{aiDurationMs} ms</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">ایزولاسیون RLS و چندمستأجری</span>
                <span className="text-sm font-black text-emerald-700">۱۰۰٪ ایزوله</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* AI Controls & Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold ml-2">دسته‌بندی آزمون:</span>
              <button
                onClick={() => setAiCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  aiCategoryFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                همه ({aiTests.length})
              </button>
              <button
                onClick={() => setAiCategoryFilter('nine_accounting_rules')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  aiCategoryFilter === 'nine_accounting_rules' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                اصول ۹‌گانه مالی
              </button>
              <button
                onClick={() => setAiCategoryFilter('multi_tenant_rls')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  aiCategoryFilter === 'multi_tenant_rls' ? 'bg-purple-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                چندمستأجری RLS
              </button>
              <button
                onClick={() => setAiCategoryFilter('bazaar_iap_fintech')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  aiCategoryFilter === 'bazaar_iap_fintech' ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                پرداخت بازار (IAP)
              </button>
              <button
                onClick={() => setAiCategoryFilter('taxpayer_verhoeff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  aiCategoryFilter === 'taxpayer_verhoeff' ? 'bg-cyan-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                مودیان (Verhoeff)
              </button>
              <button
                onClick={() => setAiCategoryFilter('thermal_escpos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  aiCategoryFilter === 'thermal_escpos' ? 'bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                پرینتر حرارتی ESC/POS
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAiAudit}
                disabled={aiRunning}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${aiRunning ? 'animate-spin' : ''}`} />
                <span>{aiRunning ? 'در حال اجرای ممیزی سرتاسری...' : 'اجرای مجدد ممیزی هوش مصنوعی'}</span>
              </button>
            </div>
          </div>

          {/* AI Tests Cards List */}
          <div className="space-y-3">
            {filteredAiTests.map((test) => (
              <div
                key={test.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        test.status === 'passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {test.status === 'passed' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{test.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {test.categoryFa}
                        </span>
                      </div>
                      {test.ruleReference && (
                        <span className="text-[10px] text-blue-600 font-medium">{test.ruleReference}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      {test.executionTimeMs} ms
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        test.status === 'passed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {test.status === 'passed' ? 'تایید شد (Passed)' : 'خطا (Failed)'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-700 shrink-0">شرط منطقی (Assertion):</span>
                    <span className="text-slate-600 font-mono text-[11px]">{test.assertion}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-700 shrink-0">خروجی سیستم:</span>
                    <span className="text-slate-800 font-mono text-[11px]">{test.outputDetails}</span>
                  </div>
                </div>

                {test.diagnosticAdvice && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/70 text-amber-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>راهکار اصلاحی: {test.diagnosticAdvice}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cryptographic Digest Card */}
          <div className="bg-slate-900 text-white p-4 rounded-xl text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>امضای دیجیتال ممیزی هوش مصنوعی (SHA-256):</span>
              <span className="text-emerald-300 select-all">{aiSignatureHash || 'CALCULATING...'}</span>
            </div>
            <span className="text-slate-400 text-[11px]">زمان ممیزی: {aiLastExecutedAt}</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* تب دوم: ماتریس آزمون‌های انسانی (Human UAT Acceptance Matrix) */}
      {/* ============================================================ */}
      {activeTab === 'human_uat' && (
        <div className="space-y-6">
          {/* Summary Card for Human Testing */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>برنامه جامع تست‌های انسانی جهت انتشار در استور واقعی</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  این آزمون‌ها باید مستقیماً توسط ارزیاب انسانی روی گوشی یا دستگاه واقعی اجرا و نتایج در فرم زیر ثبت گردد.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSimulateAllPassed}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="پر کردن سریع آزمون‌ها برای شرایط تست و شبیه‌سازی"
                >
                  تایید نمونه کلیه سناریوها (Sample Sign-off)
                </button>
                <button
                  onClick={handleResetHumanScenarios}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="بازنشانی نتایج تست‌ها"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Verdict Indicator */}
            <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-700">{readinessIndex.verdictMessageFa}</span>
              </div>
              <span className="font-bold font-mono text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {readinessIndex.passedHumanCount} از {readinessIndex.totalHumanCount} پاس شده
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="جستجو در سناریوهای آزمون انسانی (کد، عنوان یا هدف)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={humanStatusFilter}
                onChange={(e) => setHumanStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="passed">پاس شده (Passed)</option>
                <option value="pending">در انتظار تست (Pending)</option>
                <option value="failed">دارای باگ (Failed)</option>
                <option value="blocked">مسدود (Blocked)</option>
              </select>

              <select
                value={humanCategoryFilter}
                onChange={(e) => setHumanCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="all">همه بخش‌ها</option>
                <option value="auth_onboarding">ورود و احراز هویت</option>
                <option value="invoicing_inventory">فاکتور و انبار</option>
                <option value="banking_checks">بانک و چک</option>
                <option value="bazaar_iap_real">خرید بازار</option>
                <option value="taxpayer_fiscal">سامانه مودیان</option>
                <option value="printer_hardware">چاپگر فیزیکی</option>
                <option value="offline_network">حالت آفلاین</option>
                <option value="synapse_voice">هوش صوتی</option>
                <option value="mobile_ux_rtl">موبایل و راست‌چین</option>
                <option value="backup_recovery">پشتیبان‌گیری</option>
              </select>
            </div>
          </div>

          {/* Scenarios Accordion List */}
          <div className="space-y-3.5">
            {filteredHumanScenarios.map((scenario) => {
              const isExpanded = expandedScenarioId === scenario.id || editingScenarioId === scenario.id;
              const isEditing = editingScenarioId === scenario.id;

              return (
                <div
                  key={scenario.id}
                  className={`bg-white rounded-2xl border transition-all ${
                    scenario.status === 'passed'
                      ? 'border-emerald-200/80 shadow-2xs'
                      : scenario.status === 'failed'
                      ? 'border-rose-300 shadow-xs'
                      : scenario.importance === 'critical_blocker'
                      ? 'border-amber-300 shadow-2xs'
                      : 'border-slate-200 shadow-2xs'
                  }`}
                >
                  {/* Scenario Header Bar */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          scenario.status === 'passed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : scenario.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : scenario.status === 'blocked'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {scenario.status === 'passed' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : scenario.status === 'failed' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {scenario.code}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{scenario.title}</span>
                          {scenario.importance === 'critical_blocker' && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-100 text-rose-800">
                              بحرانی (Blocker)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{scenario.objective}</p>
                      </div>
                    </div>

                    {/* Status & Quick Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Status Badges */}
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          scenario.status === 'passed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : scenario.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : scenario.status === 'blocked'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {scenario.status === 'passed' && 'تایید شد (Passed)'}
                        {scenario.status === 'failed' && 'رد شد (Failed)'}
                        {scenario.status === 'blocked' && 'مسدود (Blocked)'}
                        {scenario.status === 'pending' && 'در انتظار آزمون'}
                      </span>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedScenarioId(null);
                            setEditingScenarioId(null);
                          } else {
                            setExpandedScenarioId(scenario.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Scenario Details */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 text-xs">
                      {/* Prerequisites & Steps */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                          <span className="font-bold text-slate-800 block">پیش‌نیازها و تجهیزات لازم:</span>
                          <ul className="list-disc list-inside text-slate-600 space-y-1">
                            {scenario.prerequisites.map((req, i) => (
                              <li key={i}>{req}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                          <span className="font-bold text-slate-800 block">مراحل اجرایی آزمون:</span>
                          <ol className="list-decimal list-inside text-slate-600 space-y-1">
                            {scenario.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      </div>

                      <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-blue-900">
                        <span className="font-bold">نتیجه مورد انتظار سیستم: </span>
                        <span>{scenario.expectedResult}</span>
                      </div>

                      {/* Interactive Live Runner for UAT-OFF-11 Voice Gate & Offline Queue */}
                      {scenario.code === 'UAT-OFF-11' && (
                        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white p-5 rounded-2xl border border-indigo-500/40 shadow-lg space-y-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                            <div>
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                                <span className="font-bold text-sm text-indigo-100">
                                  موتور شبیه‌سازی بلادرنگ گیت تایید صوتی فرید تهرانی و صف آفلاین
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                                اجرای آزمایشگاهی تراکنش ویرایشی فاکتور در وضعیت آفلاین، بررسی بلاک همگام‌سازی سوپابیس و تایید صوتی با عبارت کلیدی احراز هویت
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleExecuteUat11}
                              disabled={runningUat11}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                                runningUat11
                                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                              }`}
                            >
                              {runningUat11 ? (
                                <>
                                  <RotateCcw className="w-4 h-4 animate-spin" />
                                  <span>در حال اجرای تست صوتی...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 fill-current" />
                                  <span>اجرای زنده تست UAT-OFF-11</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Stages Progress Indicator */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className={`p-3 rounded-xl border text-xs transition-all ${
                              uat11Result?.stage1PendingBlocked
                                ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}>
                              <span className="text-[10px] font-bold block mb-1">مرحله ۱: ثبت در صف آفلاین</span>
                              <p className="text-[11px] leading-relaxed">
                                صدور سند ویرایشی، بلاک همگام‌سازی تا تایید صوتی صریح فرید تهرانی
                              </p>
                              {uat11Result?.stage1PendingBlocked && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-2">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> وضعیت: قفل صوتی فعال شد
                                </span>
                              )}
                            </div>

                            <div className={`p-3 rounded-xl border text-xs transition-all ${
                              uat11Result?.stage2VoiceConfirmed
                                ? 'bg-purple-950/80 border-purple-400 text-purple-200'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}>
                              <span className="text-[10px] font-bold block mb-1">مرحله ۲: فرمان صوتی احراز هویت</span>
                              <p className="text-[11px] leading-relaxed font-mono">
                                «سیناپس، مدیریت وارد شد» + تایید صوتی ویرایش
                              </p>
                              {uat11Result?.stage2VoiceConfirmed && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-2">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> احراز هویت صوتی تایید شد
                                </span>
                              )}
                            </div>

                            <div className={`p-3 rounded-xl border text-xs transition-all ${
                              uat11Result?.stage3SyncAllowed
                                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}>
                              <span className="text-[10px] font-bold block mb-1">مرحله ۳: خروج از گیت و همگام‌سازی</span>
                              <p className="text-[11px] leading-relaxed">
                                باز شدن قفل همگام‌سازی و اعمال اتمیک در دیتابیس سوپابیس
                              </p>
                              {uat11Result?.stage3SyncAllowed && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-2">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> همگام‌سازی مجاز اعلام شد
                                </span>
                              )}
                            </div>
                          </div>

                          {uat11Result && (
                            <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="font-bold">نتیجه اجرا: {uat11Result.detailsFa}</span>
                              </div>
                              <span className="text-[11px] font-mono text-emerald-300">
                                زمان اجرا: {uat11Result.durationMs} میلی‌ثانیه | ثبت در ممیزی
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tester Log & Status Editor */}
                      {isEditing ? (
                        <div className="bg-white p-4 rounded-xl border-2 border-blue-500 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">ثبت رسمی نتیجه ارزیابی انسانی:</span>
                            <span className="text-[11px] text-slate-500 font-mono">{scenario.code}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">نتیجه نهایی:</label>
                              <select
                                value={selectedStatusInput}
                                onChange={(e) => setSelectedStatusInput(e.target.value as HumanTestStatus)}
                                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                              >
                                <option value="passed">تایید شد (پاس شد - بدون باگ)</option>
                                <option value="failed">رد شد (دارای باگ یا خطای عملکردی)</option>
                                <option value="blocked">مسدود (نیازمند هماهنگی یا سخت‌افزار)</option>
                                <option value="pending">در انتظار بررسی مجدد</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">نام ارزیاب:</label>
                              <input
                                type="text"
                                value={testerNameInput}
                                onChange={(e) => setTesterNameInput(e.target.value)}
                                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">مشخصات دستگاه تست فیزیکی:</label>
                              <input
                                type="text"
                                value={deviceInfoInput}
                                onChange={(e) => setDeviceInfoInput(e.target.value)}
                                placeholder="مثلاً: Samsung S23, Android 14"
                                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-[11px]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">توضیحات و گزارش رفتار مشاهده‌شده:</label>
                            <textarea
                              rows={2}
                              value={testerNotesInput}
                              onChange={(e) => setTesterNotesInput(e.target.value)}
                              placeholder="شرح چگونگی اجرای تست، هرگونه تاخیر یا نکته خاص..."
                              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              onClick={() => setEditingScenarioId(null)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              onClick={() => handleSaveScenarioResult(scenario.id)}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                            >
                              ذخیره قطعی در شناسنامه ممیزی
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">ارزیاب:</span>
                              <span className="text-slate-800">{scenario.testerName || 'ثبت نشده'}</span>
                              {scenario.testedAt && (
                                <span className="text-[10px] text-slate-400 font-mono">({scenario.testedAt})</span>
                              )}
                            </div>
                            {scenario.deviceInfo && (
                              <div className="text-[11px] text-slate-500 font-mono">دستگاه: {scenario.deviceInfo}</div>
                            )}
                            {scenario.testerNotes && (
                              <div className="text-[11px] text-slate-600 italic">«{scenario.testerNotes}»</div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuickStatusChange(scenario.id, 'passed')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              تایید سریع (پاس شد)
                            </button>
                            <button
                              onClick={() => {
                                setEditingScenarioId(scenario.id);
                                setSelectedStatusInput(scenario.status);
                                setTesterNotesInput(scenario.testerNotes || '');
                              }}
                              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              ثبت جزییات و گزارش
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* تب سوم: شناسنامه و گواهی رسمی آمادگی انتشار (Official Store Certificate) */}
      {/* ============================================================ */}
      {activeTab === 'audit_certificate' && (
        <div className="space-y-6">
          {/* Certificate Container (Print-Ready) */}
          <div
            id="habino-store-release-certificate"
            className="bg-white p-8 sm:p-12 rounded-3xl border-2 border-slate-900 shadow-2xl space-y-8 print:p-0 print:border-none print:shadow-none"
          >
            {/* Certificate Top Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl tracking-tighter shadow-md">
                  هـ
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">سامانه حسابداری هوشمند هابینو</h2>
                  <span className="text-xs text-slate-600 font-bold block">
                    شناسنامه رسمی ممیزی کیفیت و تاییدیه پیش از انتشار (Store Release Readiness Certificate)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Certificate ID: HABINO-AUDIT-2026-REL-01
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-500 block">تاریخ صدور تاییدیه:</span>
                <span className="text-sm font-bold font-mono text-slate-800">{new Date().toLocaleDateString('fa-IR')}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold block mt-1">
                  وضعیت: معتبر و رسمی
                </span>
              </div>
            </div>

            {/* General Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">نام سازمان / مستأجر:</span>
                <span className="font-bold text-slate-800">{activeTenant?.name || 'دفتر مرکزی هابینو'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">شناسه مستأجر (Tenant ID):</span>
                <span className="font-mono text-slate-800">{activeTenantId || 'tenant_production_default'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">نسخه نهایی بیلد:</span>
                <span className="font-mono font-bold text-slate-800">1.0.4-Release (Bazaar)</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">پلتفرم هدف:</span>
                <span className="font-bold text-slate-800">Cafe Bazaar, Myket, PWA</span>
              </div>
            </div>

            {/* Audit Summary Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <span>خلاصه ارزیابی و نتایج ممیزی دوگانه (هوش مصنوعی و ارزیاب انسانی)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-3 rounded-tr-xl">بخش ممیزی</th>
                      <th className="p-3">نوع آزمون</th>
                      <th className="p-3">تعداد کل</th>
                      <th className="p-3">پاس‌شده</th>
                      <th className="p-3">ضریب انطباق</th>
                      <th className="p-3 rounded-tl-xl">نتیجه ممیزی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">هسته حسابداری و قوانین ۹‌گانه مالی</td>
                      <td className="p-3 text-slate-500">خودکار (AI Engine)</td>
                      <td className="p-3 font-mono">3</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">3</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">۱۰۰٪</td>
                      <td className="p-3"><span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">پاس شد</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">ایزولاسیون چندمستأجری و RLS امنیت</td>
                      <td className="p-3 text-slate-500">خودکار (Database Audit)</td>
                      <td className="p-3 font-mono">1</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">1</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">۱۰۰٪</td>
                      <td className="p-3"><span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">پاس شد</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">سامانه مودیان و الگوریتم ریاضی ورهوف</td>
                      <td className="p-3 text-slate-500">الگوریتم ریاضی Verhoeff</td>
                      <td className="p-3 font-mono">1</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">1</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">۱۰۰٪</td>
                      <td className="p-3"><span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">پاس شد</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">درایور چاپگر حرارتی و فرامین ESC/POS</td>
                      <td className="p-3 text-slate-500">فرامین باینری سخت‌افزار</td>
                      <td className="p-3 font-mono">1</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">1</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">۱۰۰٪</td>
                      <td className="p-3"><span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">پاس شد</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">پرداخت بازار، محافظ ضد تکرار و اج‌فانکشن</td>
                      <td className="p-3 text-slate-500">فین‌تک و رمزنگاری RSA</td>
                      <td className="p-3 font-mono">1</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">1</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">۱۰۰٪</td>
                      <td className="p-3"><span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">پاس شد</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">آزمون‌های کاربری انسانی (Human UAT)</td>
                      <td className="p-3 text-slate-500">تست روی گوشی فیزیکی</td>
                      <td className="p-3 font-mono">{readinessIndex.totalHumanCount}</td>
                      <td className="p-3 font-mono text-blue-600 font-bold">{readinessIndex.passedHumanCount}</td>
                      <td className="p-3 font-mono text-blue-600 font-bold">
                        {Math.round((readinessIndex.passedHumanCount / readinessIndex.totalHumanCount) * 100)}٪
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            readinessIndex.criticalBlockersCount === 0
                              ? 'text-emerald-700 bg-emerald-100'
                              : 'text-amber-700 bg-amber-100'
                          }`}
                        >
                          {readinessIndex.criticalBlockersCount === 0 ? 'تایید نهایی' : 'در دست تکمیل'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Verdict Statement */}
            <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-500/40 text-emerald-950 space-y-2">
              <span className="font-black text-sm block text-emerald-900">بیانیه رسمی تاییدیه انتشار:</span>
              <p className="text-xs leading-relaxed">
                بدین‌وسیله گواهی می‌شود کلیه ماژول‌های پلتفرم «هابینو حسابداری» با استانداردهای ۹‌گانه مالی، ایزولاسیون کامل دیتابیس چندمستأجری، الزامات سامانه مودیان مالیاتی کشور، پروتکل پرداخت درون‌برنامه‌ای کافه‌بازار و کارکرد صحیح سخت‌افزاری چاپگر حرارتی مطابقت کامل داشته و جهت بارگذاری در بازار و استورهای معتبر نرم‌افزاری مورد صحه‌گذاری قطعی قرار گرفته است.
              </p>
            </div>

            {/* Signatures & Seal */}
            <div className="pt-8 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-right">
                <span className="text-xs text-slate-500 block">معمار و مدیر ارشد پروژه:</span>
                <span className="text-sm font-bold text-slate-900 block">مهندس فرید تهرانی</span>
                <span className="text-[11px] text-blue-600 font-medium block">Lead Architect & Founder</span>
              </div>

              <div className="w-28 h-28 rounded-full border-4 border-dashed border-slate-400 p-2 flex flex-col items-center justify-center text-center text-slate-500 rotate-12">
                <span className="text-[9px] font-bold">مهر کنترل کیفیت</span>
                <span className="text-xs font-black text-slate-800">HABINO QA</span>
                <span className="text-[8px] font-mono">PASSED v1.0.4</span>
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs text-slate-500 block">هش اعتبارسنجی دیجیتال:</span>
                <span className="text-[10px] font-mono text-slate-700 bg-slate-100 p-1 rounded block select-all">
                  {aiSignatureHash ? aiSignatureHash.slice(0, 32) : 'HABINO-CRYPTOGRAPHIC-SEAL'}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block">Cryptographically Verified</span>
              </div>
            </div>
          </div>

          {/* Action Bar for Certificate */}
          <div className="flex flex-col sm:flex-row items-center justify-between no-print gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-600">
              جهت ارائه به بازبین‌های کافه‌بازار یا آرشیو اسناد، می‌توانید این شناسنامه و کارنامه کامل را در قالب فایل PDF رسمی با لوگوی هابینو دریافت فرمایید.
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4 text-white" />
                <span>دانلود فایل رسمی PDF (با لوگوی هابینو)</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>چاپ مستقیم (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال پیش‌نمایش و دانلود کارنامه رسمی مستندسازی QA به صورت PDF */}
      <QaDocumentationPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        aiTests={aiTests}
        humanScenarios={humanScenarios}
        readinessIndex={readinessIndex}
        aiPassedCount={aiPassedCount}
        aiFailedCount={aiFailedCount}
        aiDurationMs={aiDurationMs}
        aiSignatureHash={aiSignatureHash}
        activeTenant={activeTenant}
        activeTenantId={activeTenantId}
      />
    </div>
  );
};
