import React, { useState } from 'react';
import { useAccounting } from '../lib/store';
import { useSiraFlow } from '../lib/siraflowStore';
import { formatCurrency } from '../lib/currencyUtils';
import {
  FolderKanban,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  EyeOff,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Building2,
  Coins,
  Cpu,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  FileText,
  Scale,
  Award,
  Zap,
  RotateCcw,
  Tag,
  Filter,
  Edit3,
  Check
} from 'lucide-react';
import { RFPProject, ProjectScale, Project } from '../types';
import {
  COMPREHENSIVE_GUILDS_CATALOG,
  POPULAR_GUILDS,
  ALL_STANDARD_GUILDS
} from '../lib/guildsData';
import { HabinoDistributedLockManager } from '../lib/distributedLockEngine';

export const Projects: React.FC = () => {
  const {
    projects,
    clients,
    settings,
    addProject,
    deleteProject,
    registerProjectAdvance,
    closeProjectProfit
  } = useAccounting();
  const {
    rfpProjects,
    blindTenders,
    smartContracts,
    submitRFP,
    runAnalysis,
    launchTender,
    selectWinner,
    signContract,
    verifyContractProof,
    resolveTicket,
    resetToSampleData
  } = useSiraFlow();

  // Active View Tab
  const [activeView, setActiveView] = useState<'siraflow_workflow' | 'blind_tenders' | 'smart_contracts' | 'ledger_costing'>('siraflow_workflow');

  // Modals & States
  const [showRfpModal, setShowRfpModal] = useState(false);
  const [showClassicProjectModal, setShowClassicProjectModal] = useState(false);
  const [selectedRfpDetail, setSelectedRfpDetail] = useState<RFPProject | null>(null);
  const [fixTicketModal, setFixTicketModal] = useState<{ rfpId: string; ticketId: string } | null>(null);
  const [contractVerifyModal, setContractVerifyModal] = useState<{
    contractNumber: string;
    isValid: boolean;
    allSigned: boolean;
    partiesProof: Array<{
      role: string;
      title: string;
      did: string;
      signatureValid: boolean;
      hashMatches: boolean;
      signatureValue: string;
    }>;
  } | null>(null);

  // Accounting Advance Payment & Profit Close States (اصول ۶ و ۷ حسابداری هابینو)
  const [advanceModalProject, setAdvanceModalProject] = useState<Project | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [advanceDate, setAdvanceDate] = useState<string>(new Date().toLocaleDateString('fa-IR'));
  const [advanceDescription, setAdvanceDescription] = useState<string>('پیش‌پرداخت قرارداد پروژه');
  const [advanceError, setAdvanceError] = useState<string>('');
  const [advanceSuccess, setAdvanceSuccess] = useState<string>('');

  const [closeProfitModalProject, setCloseProfitModalProject] = useState<Project | null>(null);
  const [closeProfitDate, setCloseProfitDate] = useState<string>(new Date().toLocaleDateString('fa-IR'));
  const [closeProfitError, setCloseProfitError] = useState<string>('');
  const [closeProfitSuccess, setCloseProfitSuccess] = useState<string>('');

  const openAdvanceModal = async (p: Project) => {
    const tId = 'tenant-main';
    const lockRes = await HabinoDistributedLockManager.acquireLock({
      tenantId: tId,
      resourceType: 'project',
      resourceId: p.id,
      userId: 'current-user',
      userName: settings.name || 'مدیر پروژه'
    });

    if (!lockRes.acquired && lockRes.conflictUser) {
      const occupant = lockRes.conflictUser;
      const proceed = window.confirm(
        `هشدار همزمانی: عملیات مالی روی این پروژه در حال حاضر توسط «${occupant}» در تب دیگری باز است.\n\nآیا مایل به ادامه هستید؟`
      );
      if (!proceed) return;
    }

    setAdvanceModalProject(p);
    setAdvanceAmount(0);
    setAdvanceDescription(`پیش‌پرداخت پروژه ${p.title}`);
    setAdvanceError('');
    setAdvanceSuccess('');
  };

  const closeAdvanceModal = async () => {
    if (advanceModalProject) {
      await HabinoDistributedLockManager.releaseLock('tenant-main', 'project', advanceModalProject.id);
    }
    setAdvanceModalProject(null);
    setAdvanceAmount(0);
    setAdvanceSuccess('');
    setAdvanceError('');
  };

  const openCloseProfitModal = async (p: Project) => {
    const tId = 'tenant-main';
    const lockRes = await HabinoDistributedLockManager.acquireLock({
      tenantId: tId,
      resourceType: 'project',
      resourceId: p.id,
      userId: 'current-user',
      userName: settings.name || 'مدیر مالی'
    });

    if (!lockRes.acquired && lockRes.conflictUser) {
      const occupant = lockRes.conflictUser;
      const proceed = window.confirm(
        `هشدار همزمانی: بستن سود این پروژه توسط «${occupant}» در حال بررسی است.\n\nآیا مطمئنید می‌خواهید ادامه دهید؟`
      );
      if (!proceed) return;
    }

    setCloseProfitModalProject(p);
    setCloseProfitError('');
    setCloseProfitSuccess('');
  };

  const closeCloseProfitModal = async () => {
    if (closeProfitModalProject) {
      await HabinoDistributedLockManager.releaseLock('tenant-main', 'project', closeProfitModalProject.id);
    }
    setCloseProfitModalProject(null);
    setCloseProfitSuccess('');
    setCloseProfitError('');
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceModalProject) return;
    setAdvanceError('');
    setAdvanceSuccess('');
    try {
      if (advanceAmount <= 0) {
        setAdvanceError('مبلغ سند نامعتبر است.');
        return;
      }
      await registerProjectAdvance({
        projectId: advanceModalProject.id,
        amount: Number(advanceAmount),
        date: advanceDate,
        description: advanceDescription
      });
      setAdvanceSuccess('پیش‌پرداخت پروژه با موفقیت در حساب کارفرما و دفتر کل با برچسب پروژه ثبت گردید.');
      setTimeout(async () => {
        await closeAdvanceModal();
      }, 1200);
    } catch (err: any) {
      setAdvanceError(err.message || 'خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
    }
  };

  const handleCloseProfitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeProfitModalProject) return;
    setCloseProfitError('');
    setCloseProfitSuccess('');
    try {
      await closeProjectProfit({
        projectId: closeProfitModalProject.id,
        date: closeProfitDate
      });
      setCloseProfitSuccess('سود خالص پروژه با موفقیت محاسبه و به حساب سود سیستم منتقل گردید.');
      setTimeout(async () => {
        await closeCloseProfitModal();
      }, 1200);
    } catch (err: any) {
      setCloseProfitError(err.message || 'خطا در بستن سود پروژه');
    }
  };

  // New RFP Dynamic Form State
  const [rfpTitle, setRfpTitle] = useState('');
  const [rfpClientName, setRfpClientName] = useState('مهندس فرید تهرانی');
  const [rfpCategory, setRfpCategory] = useState('تأسیسات، برق و ابزار دقیق');
  const [customGuildMode, setCustomGuildMode] = useState(false);
  const [selectedGuildFilter, setSelectedGuildFilter] = useState<string>('all');
  const [rfpDescription, setRfpDescription] = useState('');
  const [rfpBrand, setRfpBrand] = useState('Schneider Electric');
  const [rfpModel, setRfpModel] = useState('Acti9 iC60N');
  const [rfpLocation, setRfpLocation] = useState('تهران، شهرک صنعتی شمس‌آباد');
  const [rfpDuration, setRfpDuration] = useState<number>(30);
  const [rfpEstimatedBudget, setRfpEstimatedBudget] = useState<number>(145000000);
  const [rfpScope, setRfpScope] = useState('تأمین و سیم‌کشی تابلوهای توزیع برق اضطراری');

  // Fix Ticket inputs
  const [fixBudget, setFixBudget] = useState(65000000);
  const [fixLocation, setFixLocation] = useState('تهران، خیابان سهروردی');
  const [fixScope, setFixScope] = useState('بازسازی کامل ویترین فروشگاه به متراژ ۴۵ متر مربع');

  // Submit New Dynamic RFP
  const handleRfpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfpTitle.trim()) return;

    await submitRFP({
      tenantId: 'tenant-main',
      clientRefId: 'c1',
      clientName: rfpClientName,
      clientPhone: '09120000000',
      title: rfpTitle,
      category: rfpCategory,
      description: rfpDescription,
      dynamicFormData: {
        brand: rfpBrand,
        model: rfpModel,
        location: rfpLocation,
        durationDays: Number(rfpDuration),
        estimatedBudget: Number(rfpEstimatedBudget),
        scope: rfpScope
      },
      attachments: [
        { id: `att-${Date.now()}`, name: 'پیوست_شرح_تعهدات_فنی.pdf', size: '1.2 MB', type: 'pdf' }
      ]
    });

    setShowRfpModal(false);
    setRfpTitle('');
    setRfpDescription('');
  };

  // Submit Classic Accounting Project
  const [classicTitle, setClassicTitle] = useState('');
  const [classicClientId, setClassicClientId] = useState('');
  const [classicBudget, setClassicBudget] = useState<number>(0);

  const handleClassicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classicTitle.trim() || !classicClientId) return;
    const client = clients.find(c => c.id === classicClientId);

    await addProject({
      title: classicTitle,
      clientId: classicClientId,
      clientName: client?.name || '',
      budget: Number(classicBudget) || 0,
      startDate: new Date().toLocaleDateString('fa-IR'),
      status: 'in_progress',
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      description: 'پروژه ثبت‌شده دستی'
    });

    setShowClassicProjectModal(false);
    setClassicTitle('');
    setClassicBudget(0);
  };

  const getScaleBadge = (scale?: ProjectScale) => {
    switch (scale) {
      case 'enterprise':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold border border-purple-200">سازمانی (Enterprise)</span>;
      case 'large':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200">پروژه بزرگ (Large)</span>;
      case 'medium':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200">متوسط (Medium)</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">کوچک (Small)</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10" id="projects-sira-orchestration">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <span>پروتکل ارکستراسیون سایرافلو و مدیریت مناقصات (SiraFlow Protocol)</span>
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                RLS & Blind Tender Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              سیستم‌عامل غیرمتمرکز هابینو: ثبت و اعتبارسنجی خودکار RFP، استخراج صفات حیاتی، مناقصه کور بدون سوگیری، ممیزی ضد دامپینگ و صدور قراردادهای هوشمند دیجیتال
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowRfpModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت پروژه جدید (فرم RFP)</span>
            </button>
            <button
              onClick={resetToSampleData}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
              title="بارگذاری مجدد سناریوهای آزمایشی سایرافلو"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workflow Stepper Mini-Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-slate-300 text-[11px]">
          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
            <span className="block font-bold text-white">۱. فرم RFP پویا</span>
            <span className="text-[10px] text-slate-400">ورودی‌های چندبعدی JSONB</span>
          </div>
          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
            <span className="block font-bold text-cyan-300">۲. تحلیل سایرافلو</span>
            <span className="text-[10px] text-slate-400">استخراج برند و مشخصات</span>
          </div>
          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
            <span className="block font-bold text-indigo-300">۳. طبقه‌بندی هوشمند</span>
            <span className="text-[10px] text-slate-400">ارزیابی ریسک و بازدید</span>
          </div>
          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
            <span className="block font-bold text-purple-300">۴. مناقصه کور (Blind)</span>
            <span className="text-[10px] text-slate-400">ممیزی دامپینگ و موازنه</span>
          </div>
          <div className="bg-white/5 p-2 rounded-xl border border-white/5">
            <span className="block font-bold text-emerald-300">۵. قرارداد هوشمند</span>
            <span className="text-[10px] text-slate-400">مایلستون‌های تضمینی هابینو</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveView('siraflow_workflow')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeView === 'siraflow_workflow'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>پروژه‌های RFP و ارکستراسیون سایرافلو</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{rfpProjects.length}</span>
        </button>

        <button
          onClick={() => setActiveView('blind_tenders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeView === 'blind_tenders'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <EyeOff className="w-4 h-4" />
          <span>مناقصات کور و ممیزی ضد دامپینگ</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{blindTenders.length}</span>
        </button>

        <button
          onClick={() => setActiveView('smart_contracts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeView === 'smart_contracts'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>قراردادهای هوشمند دیجیتال</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{smartContracts.length}</span>
        </button>

        <button
          onClick={() => setActiveView('ledger_costing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeView === 'ledger_costing'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>بهای تمام‌شده در دفاتر مالی</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">{projects.length}</span>
        </button>
      </div>

      {/* VIEW 1: SIRAFLOW RFP WORKFLOW */}
      {activeView === 'siraflow_workflow' && (() => {
        const allDistinctGuilds = Array.from(new Set(rfpProjects.map(p => p.category).filter(Boolean)));
        const displayedRfps = selectedGuildFilter === 'all'
          ? rfpProjects
          : rfpProjects.filter(p => p.category === selectedGuildFilter);

        return (
          <div className="space-y-4">
            {/* Guild / Industry Dynamic Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <span className="text-xs text-slate-500 font-bold flex items-center gap-1 shrink-0 ml-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>فیلتر صنف:</span>
                </span>
                <button
                  onClick={() => setSelectedGuildFilter('all')}
                  className={`text-xs px-3 py-1.5 rounded-xl transition-all shrink-0 font-medium ${
                    selectedGuildFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه اصناف ({rfpProjects.length})
                </button>
                {allDistinctGuilds.map((guild, gIdx) => {
                  const count = rfpProjects.filter(p => p.category === guild).length;
                  return (
                    <button
                      key={gIdx}
                      onClick={() => setSelectedGuildFilter(guild)}
                      className={`text-xs px-3 py-1.5 rounded-xl transition-all shrink-0 font-medium flex items-center gap-1 ${
                        selectedGuildFilter === guild
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Tag className="w-3 h-3 opacity-70" />
                      <span>{guild}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-mono">{count}</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] text-slate-400 font-mono">
                پروژه‌های ثبت‌شده: {displayedRfps.length} از {rfpProjects.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedRfps.map(rfp => {
                const hasTicket = (rfp.systemTickets || []).some(t => !t.resolved);
                const analysis = rfp.analysis;

                return (
                  <div
                    key={rfp.id}
                    className={`bg-white rounded-3xl border transition-all p-5 space-y-4 shadow-sm relative flex flex-col justify-between ${
                      hasTicket
                        ? 'border-rose-300 ring-2 ring-rose-500/20'
                        : rfp.status === 'in_blind_tender'
                        ? 'border-purple-300 ring-1 ring-purple-500/20'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Top Meta */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
                            <Cpu className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono block">RFP-ID: {rfp.id}</span>
                            <span className="text-xs font-semibold text-slate-600">{rfp.clientName}</span>
                          </div>
                        </div>

                        {getScaleBadge(analysis?.projectClassification.scale)}
                      </div>

                      {/* Title, Category & Description */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-indigo-500" />
                            <span>صنف: {rfp.category}</span>
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{rfp.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{rfp.description}</p>
                      </div>

                    {/* Exception Banner (System Ticket) */}
                    {hasTicket && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                        <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>تیکت سیستمی سایرافلو: نقص اطلاعات حیاتی</span>
                        </div>
                        <p className="text-[11px] text-rose-600 leading-relaxed">
                          {rfp.systemTickets?.find(t => !t.resolved)?.issue}
                        </p>
                        <button
                          onClick={() => setFixTicketModal({ rfpId: rfp.id, ticketId: rfp.systemTickets?.find(t => !t.resolved)!.id })}
                          className="w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                          تکمیل داده‌های ناقص و رفع تیکت
                        </button>
                      </div>
                    )}

                    {/* Extracted Attributes by SiraFlow */}
                    {analysis && !hasTicket && (
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-blue-500" />
                            برند و استاندارد:
                          </span>
                          <span className="font-bold text-slate-800 font-mono text-[11px]">
                            {analysis.extractedAttributes.brand || 'استاندارد ملی/بازار'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            محل اجرا:
                          </span>
                          <span className="font-medium text-slate-700 text-[11px]">
                            {analysis.extractedAttributes.location}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            مدت زمان تعهدات:
                          </span>
                          <span className="font-medium text-slate-700 text-[11px]">
                            {analysis.extractedAttributes.executionDurationDays} روز کاری
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200">
                          <span className="text-[11px] text-slate-500">نیاز به بازدید حضوری:</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            analysis.extractedAttributes.requiresOnSiteVisit
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {analysis.extractedAttributes.requiresOnSiteVisit ? 'الزامی (On-Site)' : 'منتفی (Remote)'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* AI Reasoning Preview */}
                    {analysis && !hasTicket && (
                      <div className="text-[11px] text-slate-600 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                        <span className="font-bold text-blue-700 block mb-0.5">تحلیل هوش مصنوعی سایرافلو:</span>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{analysis.aiReasoning}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                    <span className="text-[11px] text-slate-400">
                      وضعیت: <strong className="text-slate-700">{
                        rfp.status === 'in_blind_tender' ? 'در حال مناقصه کور' :
                        rfp.status === 'contract_generated' ? 'قرارداد صادر شد' :
                        rfp.status === 'needs_revision' ? 'نیازمند اصلاح' : 'طبقه‌بندی‌شده'
                      }</strong>
                    </span>

                    {rfp.status === 'classified' && !hasTicket && (
                      <button
                        onClick={() => {
                          launchTender(rfp.id);
                          setActiveView('blind_tenders');
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>ارسال به مناقصه کور</span>
                      </button>
                    )}

                    {rfp.status === 'in_blind_tender' && (
                      <button
                        onClick={() => setActiveView('blind_tenders')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition-all flex items-center gap-1"
                      >
                        <span>مشاهده پاکت‌ها</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    })()}

      {/* VIEW 2: BLIND TENDERS & ANTI-DUMPING AUDIT */}
      {activeView === 'blind_tenders' && (
        <div className="space-y-6">
          {blindTenders.map(tender => (
            <div key={tender.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              {/* Tender Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                      <EyeOff className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{tender.projectTitle}</h3>
                      <span className="text-xs text-slate-400 font-mono">مناقصه کد: {tender.id} | مقیاس: {tender.projectScale}</span>
                    </div>
                  </div>
                </div>

                {/* Budget & Dumping Rules */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 flex-wrap">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">سقف مجاز بودجه:</span>
                    <span className="text-xs font-bold text-slate-800">{formatCurrency(tender.budgetCeiling, settings.currency)}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="text-right">
                    <span className="text-[10px] text-rose-500 font-medium block">کف ممیزی ضد دامپینگ:</span>
                    <span className="text-xs font-bold text-rose-700">{formatCurrency(tender.dumpingAuditThreshold, settings.currency)}</span>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">مستأجران دعوت‌شده:</span>
                    <span className="text-xs font-bold text-indigo-700">{tender.invitedTenantsCount} مستأجر</span>
                  </div>
                </div>
              </div>

              {/* Bids Table with Blind Tenant Protection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <span>پاکت‌های پیشنهادی ارسالی (پنهان‌سازی کامل هویت مستأجران طبق ضوابط مناقصه کور)</span>
                  </h4>
                  <span className="text-xs text-slate-400">تعداد پیشنهادها: {tender.bids.length}</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">کد امن مستأجر (بی‌نام)</th>
                        <th className="p-3">مبلغ پیشنهادی</th>
                        <th className="p-3">زمان تحویل</th>
                        <th className="p-3">گارانتی</th>
                        <th className="p-3">امتیاز فنی</th>
                        <th className="p-3">نمره موازنه (قیمت+کیفیت)</th>
                        <th className="p-3">ممیزی ضد دامپینگ</th>
                        <th className="p-3">شرح پیشنهاد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tender.bids.map(bid => {
                        const isWinner = tender.winnerBidId === bid.id;
                        return (
                          <tr
                            key={bid.id}
                            className={`transition-colors ${
                              isWinner
                                ? 'bg-emerald-50/70 font-semibold'
                                : bid.isDumpingSuspected
                                ? 'bg-rose-50/40'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-3 font-mono font-bold text-slate-800 flex items-center gap-1.5">
                              {isWinner && <Award className="w-4 h-4 text-emerald-600" />}
                              <span>{bid.anonymousCode}</span>
                            </td>
                            <td className="p-3 font-bold text-slate-900">
                              {formatCurrency(bid.bidAmount, settings.currency)}
                            </td>
                            <td className="p-3 text-slate-600">{bid.deliveryDays} روز</td>
                            <td className="p-3 text-slate-600">{bid.warrantyMonths} ماه</td>
                            <td className="p-3 font-bold text-blue-600">{bid.technicalScore} / ۱۰۰</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                bid.finalBalancedScore >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : bid.finalBalancedScore >= 60
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {bid.finalBalancedScore} نمره کل
                              </span>
                            </td>
                            <td className="p-3">
                              {bid.isDumpingSuspected ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md" title={bid.dumpingAuditNote}>
                                  <AlertTriangle className="w-3 h-3" />
                                  دامپینگ مشکوک
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3 h-3" />
                                  سالم و مجاز
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-[11px] text-slate-500 max-w-xs truncate" title={bid.technicalProposal}>
                              {bid.technicalProposal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Award or Selection Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {tender.status === 'awarded' ? (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200 text-xs">
                    <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">برنده قطعی مناقصه تعیین گردید: </span>
                      <span>{tender.winnerAnonymousCode}</span>
                      <p className="text-[10px] text-emerald-600 mt-0.5">{tender.selectionReason}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>موتور موازنه سایرافلو آماده انتخاب برنده با لحاظ ۶۰٪ کیفیت فنی و ۴۰٪ قیمت رقابتی است.</span>
                  </div>
                )}

                {tender.status !== 'awarded' && (
                  <button
                    onClick={async () => {
                      const res = await selectWinner(tender.id);
                      setActiveView('smart_contracts');
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 self-end sm:self-auto active:scale-95"
                  >
                    <Award className="w-4 h-4" />
                    <span>انتخاب برنده توسط سایرافلو و صدور قرارداد دیجیتال</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: SMART CONTRACTS & ESCROW */}
      {activeView === 'smart_contracts' && (
        <div className="space-y-6">
          {smartContracts.map(contract => (
            <div key={contract.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              {/* Contract Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                      <FileCheck2 className="w-5 h-5" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{contract.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span>شماره قرارداد: {contract.contractNumber}</span>
                    <span>•</span>
                    <span className="text-[10px] text-slate-400">هش اعتبارسنجی: {contract.aiVerificationHash.substring(0, 18)}...</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const res = await verifyContractProof(contract.id);
                        setContractVerifyModal({
                          contractNumber: contract.contractNumber,
                          ...res
                        });
                      } catch (e: any) {
                        alert('خطا در راستی‌آزمایی: ' + e.message);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>راستی‌آزمایی رمزنگاری W3C DID</span>
                  </button>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">مبلغ کل قرارداد هوشمند:</span>
                    <span className="text-base font-extrabold text-blue-700">{formatCurrency(contract.totalAmount, contract.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Parties Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {contract.parties.map((p, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">
                        {p.role === 'employer' ? 'طرف اول (کارفرما)' : p.role === 'winning_tenant' ? 'طرف دوم (مستأجر برنده)' : 'طرف ناظر و امین اسناد'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.signatureStatus === 'signed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.signatureStatus === 'signed' ? 'امضا شده با W3C DID' : 'در انتظار امضا'}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">{p.title}</p>
                    
                    {p.did && (
                      <div className="p-2 bg-white rounded-xl border border-slate-100 text-[10px] text-blue-700 font-mono truncate" title={p.did}>
                        <span className="text-slate-400 font-sans ml-1">DID:</span>
                        {p.did}
                      </div>
                    )}

                    {p.signatureProof && (
                      <div className="text-[10px] text-slate-500 font-mono space-y-0.5 pt-1 border-t border-slate-200/80">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 font-bold font-sans">امضای رمزنگاری: تایید ✓</span>
                          <span>{p.signatureProof.algorithm}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">
                          هش سند: {p.signatureProof.documentHash.substring(0, 16)}...
                        </div>
                      </div>
                    )}

                    {p.signatureStatus !== 'signed' && (
                      <button
                        onClick={() => signContract(contract.id, p.role as any)}
                        className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        امضای رمزنگاری با کلید اختصاصی DID
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Milestones & Escrow Release Schedule */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>برنامه زمان‌بندی آزادسازی وجوه و مایلستون‌های هوشمند (Escrow Release)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {contract.milestones.map((m, mIdx) => (
                    <div key={mIdx} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-800">{m.title}</span>
                        <span className="text-blue-600 font-mono">{m.percentage}٪</span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{m.conditions}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                        <span>مبلغ مرحله:</span>
                        <span className="text-emerald-700">{formatCurrency(m.amount, contract.currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Clauses */}
              <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-1 text-xs text-amber-900">
                <span className="font-bold block">بند داوری و خسارت تأخیر:</span>
                <p className="text-[11px] text-amber-800 leading-relaxed">{contract.arbitrationClause}</p>
                <p className="text-[10px] text-amber-700">جریمه تأخیر غیرمجاز روزانه: {formatCurrency(contract.penaltiesPerDayDelay, contract.currency)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 4: CLASSIC COSTING & LEDGER (PREVIOUS PROJECTS) */}
      {activeView === 'ledger_costing' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">پروژه‌های ثبت‌شده در دفتر کل</h3>
              <p className="text-xs text-slate-400">بهای تمام‌شده، درآمدهای ثبتی و سود خالص در ترازنامه</p>
            </div>
            <button
              onClick={() => setShowClassicProjectModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-medium hover:bg-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>پروژه سنتی جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{p.title}</h3>
                      <p className="text-xs text-slate-400">{p.clientName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-200/60">
                    <span className="text-slate-500 text-[11px]">وضعیت پروژه:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {p.status === 'completed' ? 'تکمیل و سود بسته‌شده ✓' : 'در حال اجرا...'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>بودجه کل:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(p.budget, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>درآمدهای دریافتی:</span>
                    <span className="font-medium">{formatCurrency(p.totalIncome || 0, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>هزینه‌های انجام‌شده:</span>
                    <span className="font-medium">{formatCurrency(p.totalExpense || 0, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t pt-2 border-slate-200">
                    <span>سود خالص پروژه:</span>
                    <span className="text-blue-700">{formatCurrency((p.totalIncome || 0) - (p.totalExpense || 0), settings.currency)}</span>
                  </div>

                  {/* Accounting Operation Actions (اصول ۶ و ۷ حسابداری هابینو) */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => openAdvanceModal(p)}
                      className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold text-center transition-all cursor-pointer shadow-2xs"
                    >
                      💰 ثبت پیش‌پرداخت
                    </button>
                    <button
                      type="button"
                      disabled={p.status === 'completed'}
                      onClick={() => openCloseProfitModal(p)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold text-center transition-all border ${
                        p.status === 'completed'
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200 cursor-pointer shadow-2xs'
                      }`}
                    >
                      {p.status === 'completed' ? 'سود بسته شد' : '📊 بستن سود'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NEW DYNAMIC RFP FORM */}
      {showRfpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>ثبت و اعتبارسنجی فرم پویا (RFP Form)</span>
                </h3>
                <p className="text-xs text-slate-400">تحلیل آنی صفات، اعتبارسنجی فیلدهای حیاتی و طبقه‌بندی توسط سایرافلو</p>
              </div>
              <button
                onClick={() => setShowRfpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRfpSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">عنوان پروژه / RFP *</label>
                  <input
                    type="text"
                    required
                    value={rfpTitle}
                    onChange={e => setRfpTitle(e.target.value)}
                    placeholder="مثال: تأمین تابلو برق و اتوماسیون صنعتی"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">کارفرما (مشتری) *</label>
                  <input
                    type="text"
                    required
                    value={rfpClientName}
                    onChange={e => setRfpClientName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              {/* Guild / Industry Selector Section (Unlimited Guilds Support) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>صنف و رسته کاری (پشتیبانی از کلیه اصناف کشور) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomGuildMode(!customGuildMode)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{customGuildMode ? '📋 انتخاب از کاتالوگ جامع اصناف' : '✏️ تایپ صنف دلخواه و سفارشی'}</span>
                  </button>
                </div>

                {customGuildMode ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      list="all-guilds-datalist"
                      value={rfpCategory}
                      onChange={e => setRfpCategory(e.target.value)}
                      placeholder="نام صنف یا رسته دلخواه خود را آزادانه بنویسید (مثال: طلا و جواهر، کشاورزی، نانوتکنولوژی، ...)"
                      className="w-full p-2.5 bg-white border border-indigo-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl text-xs font-semibold text-slate-800 transition-all"
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      💡 سیستم‌عامل هابینو هیچ محدودیتی در انتخاب صنف ندارد؛ پروژه و مناقصه شما بر اساس ساختار استاندارد همین صنف ارکستریت و ممیزی خواهد شد.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <select
                      value={rfpCategory}
                      onChange={e => {
                        if (e.target.value === '__custom__') {
                          setCustomGuildMode(true);
                          setRfpCategory('');
                        } else {
                          setRfpCategory(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="" disabled>-- انتخاب صنف یا رسته کاری از دسته‌بندی‌های استاندارد --</option>
                      {COMPREHENSIVE_GUILDS_CATALOG.map((group, gIdx) => (
                        <optgroup key={gIdx} label={`── ${group.group} ──`}>
                          {group.guilds.map((g, idx) => (
                            <option key={idx} value={g}>{g}</option>
                          ))}
                        </optgroup>
                      ))}
                      <option value="__custom__">➕ سایر / صنف دلخواه و سفارشی (تایپ آزاد)...</option>
                    </select>
                  </div>
                )}

                {/* Datalist for instant suggestion & auto-completion */}
                <datalist id="all-guilds-datalist">
                  {ALL_STANDARD_GUILDS.map((g, idx) => (
                    <option key={idx} value={g} />
                  ))}
                </datalist>

                {/* Quick Selection Popular Guild Chips */}
                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">اصناف پرکاربرد:</span>
                  {POPULAR_GUILDS.map((pGuild, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setRfpCategory(pGuild);
                        if (customGuildMode) setCustomGuildMode(false);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        rfpCategory === pGuild
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {pGuild}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">برآورد سقف بودجه اولیه (تومان) *</label>
                <input
                  type="number"
                  required
                  value={rfpEstimatedBudget || ''}
                  onChange={e => setRfpEstimatedBudget(Number(e.target.value))}
                  placeholder="مثال: ۱۴۵۰۰۰۰۰۰"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-xs"
                />
              </div>

              {/* Dynamic JSONB Attributes Section */}
              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <span className="font-bold text-indigo-900 block">فیلدهای داینامیک و مشخصات فنی (Dynamic JSONB):</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">برند تجهیزات مدنظر</label>
                    <input
                      type="text"
                      value={rfpBrand}
                      onChange={e => setRfpBrand(e.target.value)}
                      placeholder="مثال: Schneider, Cisco, ..."
                      className="w-full p-2 bg-white border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">مدل یا پارت‌نامبر / استاندارد</label>
                    <input
                      type="text"
                      value={rfpModel}
                      onChange={e => setRfpModel(e.target.value)}
                      placeholder="مثال: Acti9, Catalyst, ..."
                      className="w-full p-2 bg-white border rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">محل فیزیکی اجرا (شهر و منطقه) *</label>
                    <input
                      type="text"
                      required
                      value={rfpLocation}
                      onChange={e => setRfpLocation(e.target.value)}
                      placeholder="تهران، شهرک صنعتی..."
                      className="w-full p-2 bg-white border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">مدت زمان پیشنهادی (روز)</label>
                    <input
                      type="number"
                      value={rfpDuration || ''}
                      onChange={e => setRfpDuration(Number(e.target.value))}
                      placeholder="۳۰"
                      className="w-full p-2 bg-white border rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1">شرح حجم کار (Scope)</label>
                  <input
                    type="text"
                    value={rfpScope}
                    onChange={e => setRfpScope(e.target.value)}
                    placeholder="شرح متراژ، تعداد یا نیازمندی‌ها..."
                    className="w-full p-2 bg-white border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">توضیحات تکمیلی کارفرما</label>
                <textarea
                  rows={2}
                  value={rfpDescription}
                  onChange={e => setRfpDescription(e.target.value)}
                  placeholder="نکات مهم و الزامات مورد انتظار..."
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRfpModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
                >
                  تحلیل و اعتبارسنجی توسط سایرافلو
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FIX TICKET EXCEPTION */}
      {fixTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2 border-b pb-3">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>رفع تیکت سیستمی و تکمیل داده‌های حیاتی</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              سایرافلو به دلیل نبود موقعیت مکانی و سقف بودجه، پروژه را در وضعیت «نیازمند اصلاح» قرار داده است. لطفاً داده‌ها را تکمیل کنید تا تحلیل خودکار از سر گرفته شود:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">محل فیزیکی و شهر پروژه *</label>
                <input
                  type="text"
                  value={fixLocation}
                  onChange={e => setFixLocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">برآورد بودجه یا حجم کار (تومان) *</label>
                <input
                  type="number"
                  value={fixBudget}
                  onChange={e => setFixBudget(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">شرح حجم کار (Scope) *</label>
                <input
                  type="text"
                  value={fixScope}
                  onChange={e => setFixScope(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => setFixTicketModal(null)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resolveTicket(fixTicketModal.rfpId, fixTicketModal.ticketId, {
                    location: fixLocation,
                    estimatedBudget: fixBudget,
                    scope: fixScope
                  });
                  setFixTicketModal(null);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                ثبت اصلاحات و ارزیابی مجدد سایرافلو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLASSIC PROJECT */}
      {showClassicProjectModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 border-b pb-3">ثبت پروژه سنتی در دفاتر</h3>
            <form onSubmit={handleClassicSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">عنوان پروژه *</label>
                <input
                  type="text"
                  required
                  value={classicTitle}
                  onChange={e => setClassicTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">کارفرما *</label>
                <select
                  value={classicClientId}
                  onChange={e => setClassicClientId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                >
                  <option value="">انتخاب کارفرما...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-600 block mb-1">مبلغ قرارداد *</label>
                <input
                  type="number"
                  required
                  value={classicBudget || ''}
                  onChange={e => setClassicBudget(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowClassicProjectModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  ثبت در دفتر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract W3C DID Verification Modal */}
      {contractVerifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 border border-slate-200 space-y-4 shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  راستی‌آزمایی رمزنگاری قرارداد هوشمند ({contractVerifyModal.contractNumber})
                </h3>
              </div>
              <button
                onClick={() => setContractVerifyModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
              contractVerifyModal.isValid
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {contractVerifyModal.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>صحت تمامی امضاهای رمزنگاری و عدم جعل سند با موفقیت تایید شد</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>برخی طرفین هنوز قرارداد را با کلید DID خود امضا نکرده‌اند یا هش مغایرت دارد</span>
                  </>
                )}
              </div>
              <p className="text-[11px] pt-1">
                راستی‌آزمایی به صورت آفلاین بر اساس استاندارد W3C DID با الگوریتم ECDSA (NIST P-256) و هش SHA-256 انجام گرفت.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 block">وضعیت امضای طرفین قرارداد:</span>
              {contractVerifyModal.partiesProof.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {item.role === 'employer' ? 'طرف اول (کارفرما)' : item.role === 'winning_tenant' ? 'طرف دوم (مستأجر)' : 'امین اسناد (هابینو)'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.signatureValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.signatureValid ? 'امضا معتبر ✓' : 'نامعتبر ✕'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">{item.title}</div>
                  <div className="text-[10px] text-blue-700 font-mono truncate">شناسه DID: {item.did}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">کد امضا: {item.signatureValue}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setContractVerifyModal(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                بستن پنجره راستی‌آزمایی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER PROJECT ADVANCE PAYMENT (اصل ۶ حسابداری هابینو) */}
      {advanceModalProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 space-y-4 shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ثبت پیش‌پرداخت پروژه ({advanceModalProject.title})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    کارفرما: {advanceModalProject.clientName} | برچسب پروژه در سند کل
                  </p>
                </div>
              </div>
              <button
                onClick={closeAdvanceModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Accounting Rule 6 Info Box */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>سند دوبل استاندارد پیش‌پرداخت (اصل ۶):</span>
              </div>
              <div className="font-mono text-[11px] space-y-0.5 pt-1">
                <div>• بدهکار: وجوه نقد و بانک (کد ۱۰۱۰۱)</div>
                <div>• بستانکار: حساب کارفرما / دریافتنی‌ها ({advanceModalProject.clientName} - کد ۱۱۲)</div>
                <div>• برچسب حسابداری: [پروژه {advanceModalProject.title}]</div>
              </div>
            </div>

            {advanceError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {advanceError}
              </div>
            )}

            {advanceSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
                {advanceSuccess}
              </div>
            )}

            <form onSubmit={handleAdvanceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  مبلغ پیش‌پرداخت دریافتی ({settings.currency === 'IRR' ? 'ریال' : 'تومان'}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={advanceAmount || ''}
                  onChange={e => setAdvanceAmount(Number(e.target.value))}
                  placeholder="مثال: ۲۵۰۰۰۰۰۰"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاریخ دریافت *</label>
                  <input
                    type="text"
                    required
                    value={advanceDate}
                    onChange={e => setAdvanceDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">روش تسویه</label>
                  <input
                    type="text"
                    disabled
                    value="واریز به حساب بانکی / نقد"
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">شرح و توضیحات سند</label>
                <input
                  type="text"
                  value={advanceDescription}
                  onChange={e => setAdvanceDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAdvanceModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all"
                >
                  تایید و ثبت اتمیک پیش‌پرداخت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLOSE AND RECOGNIZE PROJECT PROFIT (اصل ۷ حسابداری هابینو) */}
      {closeProfitModalProject && (() => {
        const income = closeProfitModalProject.totalIncome || 0;
        const expense = closeProfitModalProject.totalExpense || 0;
        const netProfit = income - expense;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 space-y-4 shadow-2xl" dir="rtl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      محاسبه و بستن سود نهایی پروژه ({closeProfitModalProject.title})
                    </h3>
                    <p className="text-[11px] text-slate-500">انتقال سود قطعی به حساب سود انباشته سیستم (اصل ۷)</p>
                  </div>
                </div>
                <button
                  onClick={closeCloseProfitModal}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>مجموع درآمدهای محقق‌شده پروژه:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(income, settings.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>مجموع هزینه‌های قطعی پروژه:</span>
                  <span className="font-bold text-rose-600">{formatCurrency(expense, settings.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t pt-2 border-slate-200 text-sm">
                  <span>سود خالص نهایی قابل شناسایی:</span>
                  <span className={netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}>
                    {formatCurrency(netProfit, settings.currency)}
                  </span>
                </div>
              </div>

              {/* Accounting Rule 7 Info Box */}
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-800">
                  <FileCheck2 className="w-4 h-4" />
                  <span>ثبت حسابداری انتقال سود (اصل ۷):</span>
                </div>
                <div className="font-mono text-[11px] space-y-0.5 pt-1">
                  <div>• بدهکار: حساب سود پروژه (کد ۵۰۱۰۱) - {formatCurrency(netProfit, settings.currency)}</div>
                  <div>• بستانکار: حساب سود سیستم و انباشته (کد ۳۰۲۰۱) - {formatCurrency(netProfit, settings.currency)}</div>
                  <div className="text-[10px] text-indigo-700 pt-0.5">
                    * پس از بستن، این مبلغ در گزارش دوره‌های بعد دوباره محاسبه نخواهد شد و وضعیت پروژه به «تکمیل» تغییر می‌یابد.
                  </div>
                </div>
              </div>

              {closeProfitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {closeProfitError}
                </div>
              )}

              {closeProfitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
                  {closeProfitSuccess}
                </div>
              )}

              <form onSubmit={handleCloseProfitSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاریخ بستن حساب و شناسایی سود *</label>
                  <input
                    type="text"
                    required
                    value={closeProfitDate}
                    onChange={e => setCloseProfitDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeCloseProfitModal}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all"
                  >
                    تایید، صدور سند و بستن سود پروژه
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
