import React, { useState, useMemo } from 'react';
import {
  Milestone,
  MilestoneStatus,
  MilestonePriority,
  MilestoneCategory,
  ArchitectureDecisionRecord,
  ROADMAP_PHASES,
  getStoredRoadmapMilestones,
  saveStoredRoadmapMilestones,
  getStoredADRs,
  saveStoredADRs
} from '../lib/roadmapEngine';
import {
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCode2,
  Layers,
  Sparkles,
  Filter,
  Plus,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Boxes,
  Lock,
  GitBranch,
  Tag,
  Download,
  RotateCcw,
  Check,
  Search,
  ExternalLink,
  BookOpen,
  Code2,
  ShoppingBag
} from 'lucide-react';
import { RoadmapIngestionStudio } from './RoadmapIngestionStudio';
import { LiveAgentDiagnosticStudio } from './LiveAgentDiagnosticStudio';
import { BazaarLaunchFastTrackView } from './BazaarLaunchFastTrackView';
import { VisualRoadmapTimeline } from './VisualRoadmapTimeline';
import { MultiAgentChatRoom } from './MultiAgentChatRoom';
import { DeveloperEngineeringHandbook } from './DeveloperEngineeringHandbook';

export const RoadmapStudio: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(() => getStoredRoadmapMilestones());
  const [adrs, setAdrs] = useState<ArchitectureDecisionRecord[]>(() => getStoredADRs());

  // Active Tab View
  const [activeTab, setActiveTab] = useState<
    'visual_timeline' | 'timeline' | 'bazaar_launch' | 'agent_roundtable' | 'dev_handbook' | 'adrs' | 'risk_matrix' | 'ingestion' | 'agents_live'
  >('visual_timeline');

  const [chatInitialPrompt, setChatInitialPrompt] = useState<string>('');

  // Filters State
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals / Forms State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewAdrModalOpen, setIsNewAdrModalOpen] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  // New Milestone Form State
  const [newTitle, setNewTitle] = useState('');
  const [newPhaseId, setNewPhaseId] = useState('phase-3');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<MilestoneCategory>('decentralized_id');
  const [newPriority, setNewPriority] = useState<MilestonePriority>('P1');
  const [newComplexity, setNewComplexity] = useState<'low' | 'medium' | 'high' | 'epic'>('medium');
  const [newRiskLevel, setNewRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [newKpi, setNewKpi] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [newTechStack, setNewTechStack] = useState('WebCrypto, TypeScript');
  const [newAssignee, setNewAssignee] = useState('مهندس ارشد زیرساخت');

  // New ADR Form State
  const [newAdrCode, setNewAdrCode] = useState('ADR-005');
  const [newAdrTitle, setNewAdrTitle] = useState('');
  const [newAdrContext, setNewAdrContext] = useState('');
  const [newAdrDecision, setNewAdrDecision] = useState('');
  const [newAdrConsequences, setNewAdrConsequences] = useState('');
  const [newAdrOwner, setNewAdrOwner] = useState('معمار ارشد سیستم‌عامل');

  // KPI Calculations
  const stats = useMemo(() => {
    const total = milestones.length;
    const completed = milestones.filter(m => m.status === 'completed').length;
    const inProgress = milestones.filter(m => m.status === 'in_progress').length;
    const planned = milestones.filter(m => m.status === 'planned').length;
    const underReview = milestones.filter(m => m.status === 'under_review').length;
    const p0Count = milestones.filter(m => m.priority === 'P0').length;
    const highRiskCount = milestones.filter(m => m.riskLevel === 'high').length;

    const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      planned,
      underReview,
      p0Count,
      highRiskCount,
      overallProgress
    };
  }, [milestones]);

  // Filtered Milestones
  const filteredMilestones = useMemo(() => {
    return milestones.filter(m => {
      if (selectedPhase !== 'all' && m.phaseId !== selectedPhase) return false;
      if (selectedStatus !== 'all' && m.status !== selectedStatus) return false;
      if (selectedPriority !== 'all' && m.priority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchTech = m.techStack.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchTech) return false;
      }
      return true;
    });
  }, [milestones, selectedPhase, selectedStatus, selectedPriority, searchQuery]);

  // Toggle or Update Milestone Status
  const handleUpdateMilestoneStatus = (id: string, newStatus: MilestoneStatus) => {
    const updated = milestones.map(m => {
      if (m.id === id) {
        return {
          ...m,
          status: newStatus,
          progressPercent: newStatus === 'completed' ? 100 : newStatus === 'in_progress' ? 50 : 0
        };
      }
      return m;
    });
    setMilestones(updated);
    saveStoredRoadmapMilestones(updated);
  };

  const handleUpdateProgressPercent = (id: string, pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    const updated = milestones.map(m => {
      if (m.id === id) {
        const autoStatus: MilestoneStatus =
          clamped === 100 ? 'completed' : clamped > 0 ? 'in_progress' : m.status;
        return { ...m, progressPercent: clamped, status: autoStatus };
      }
      return m;
    });
    setMilestones(updated);
    saveStoredRoadmapMilestones(updated);
  };

  // Add Milestone Handler
  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const phase = ROADMAP_PHASES.find(p => p.id === newPhaseId);
    const techArray = newTechStack
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const created: Milestone = {
      id: `m-${Date.now().toString().slice(-4)}`,
      phaseId: newPhaseId,
      phaseTitle: phase ? phase.title : 'مایلستون سفارشی',
      day: 50 + milestones.length * 2,
      targetQuarter: '1403-Q4',
      title: newTitle.trim(),
      description: newDescription.trim() || 'شرح نیازمندی‌های پیاده‌سازی و استانداردهای معماری.',
      status: 'planned',
      category: newCategory,
      priority: newPriority,
      complexity: newComplexity,
      riskLevel: newRiskLevel,
      kpiMetric: newKpi.trim() || 'تأیید تست‌های خودکار و عدم رگرسیون تراز',
      technicalRationale: newRationale.trim() || 'ارتقای قابلیت‌های عملیاتی و پاسخ به معماری غیرمتمرکز.',
      techStack: techArray.length > 0 ? techArray : ['TypeScript', 'Supabase'],
      dependencies: [],
      assigneeRole: newAssignee.trim() || 'تیم توسعه محصول',
      progressPercent: 0
    };

    const updated = [...milestones, created];
    setMilestones(updated);
    saveStoredRoadmapMilestones(updated);

    // Reset Form
    setNewTitle('');
    setNewDescription('');
    setNewKpi('');
    setNewRationale('');
    setIsAddModalOpen(false);
  };

  // Add ADR Handler
  const handleCreateADR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdrTitle.trim()) return;

    const created: ArchitectureDecisionRecord = {
      id: `adr-${Date.now().toString().slice(-4)}`,
      code: newAdrCode.trim() || `ADR-00${adrs.length + 1}`,
      title: newAdrTitle.trim(),
      status: 'implemented',
      context: newAdrContext.trim() || 'تحلیل فنی مسأله و نیازمندی مقیاس‌پذیری پلتفرم.',
      decision: newAdrDecision.trim() || 'تصمیم فنی برگزیده همراه با پشته تکنولوژی.',
      consequences: newAdrConsequences.trim() || 'پیامدهای عملکردی و تضمین کارایی سیستم.',
      technicalOwner: newAdrOwner.trim() || 'معمار نرم‌افزار هابینو',
      updatedAt: '1403/06/14'
    };

    const updated = [created, ...adrs];
    setAdrs(updated);
    saveStoredADRs(updated);

    // Reset
    setNewAdrTitle('');
    setNewAdrContext('');
    setNewAdrDecision('');
    setNewAdrConsequences('');
    setIsNewAdrModalOpen(false);
  };

  // Reset to Defaults
  const handleResetToDefaults = () => {
    if (window.confirm('آیا از بازنشانی مایلستون‌ها و تصمیمات معماری به تنظیمات اولیه کارخانه اطمینان دارید؟')) {
      localStorage.removeItem('habino_engineering_roadmap_v2');
      localStorage.removeItem('habino_engineering_adrs_v2');
      window.location.reload();
    }
  };

  // Export Summary as JSON
  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      platform: 'Habino OS & SiraFlow Architecture Decision Matrix',
      overallProgress: `${stats.overallProgress}%`,
      milestones,
      adrs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habino-architecture-roadmap-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Status & Priority Badges Helper
  const getStatusBadge = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>پیاده‌سازی شده</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>اسپرینت جاری</span>
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <Boxes className="w-3.5 h-3.5" />
            <span>در صف تصمیم‌گیری</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
            <GitBranch className="w-3.5 h-3.5" />
            <span>برنامه‌ریزی‌شده</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (p: MilestonePriority) => {
    switch (p) {
      case 'P0':
        return (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-500 text-white font-mono shadow-2xs">
            P0 بحرانی
          </span>
        );
      case 'P1':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
            P1 اولویت بالا
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-mono">
            P2 عادی
          </span>
        );
    }
  };

  const getRiskBadge = (r: 'low' | 'medium' | 'high') => {
    switch (r) {
      case 'high':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>ریسک معماری بالا</span>
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            ریسک متوسط
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            ریسک پایین
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 select-text" id="roadmap-studio" dir="rtl">
      {/* HEADER: Title & Quick Actions */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Compass className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              رودمپ مهندسی و تابلوی تصمیمات معماری سیستم‌عامل هابینو
            </h2>
            <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-bold shadow-xs">
              SiraFlow Engineering OS
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            موتور تصمیم‌گیری فنی تیم توسعه، مستندسازی رکوردهای معماری (ADRs)، کنترل پیشرفت اسپرینت‌ها، تفکیک ریسک و تحلیل KPIهای تجاری سیستم‌عامل تجارت و پروتکل هویت وب.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت مایلستون فنی</span>
          </button>
          <button
            onClick={() => setIsNewAdrModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <FileCode2 className="w-4 h-4" />
            <span>ثبت تصمیم معماری (ADR)</span>
          </button>
          <button
            onClick={handleExportJSON}
            title="خروجی گزارش کامل مهندسی"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetToDefaults}
            title="بازنشانی اطلاعات"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-rose-600 transition-all border border-slate-200 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">تحقق کل پروژه</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{stats.overallProgress}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.overallProgress}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">پیاده‌سازی‌شده</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600">{stats.completed}</div>
          <span className="text-[10px] text-slate-400 font-mono">از مجموع {stats.total} مایلستون</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">اسپرینت جاری</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600">{stats.inProgress}</div>
          <span className="text-[10px] text-slate-400">در دست توسعه فعال</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">مسدودکننده (P0)</span>
            <ShieldCheck className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-600">{stats.p0Count}</div>
          <span className="text-[10px] text-slate-400">بحرانی برای پروداکشن</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">ریسک معماری بالا</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-800">{stats.highRiskCount}</div>
          <span className="text-[10px] text-slate-400">نیازمند بازبینی امنیتی</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold">اسناد معماری (ADR)</span>
            <FileCode2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-600">{adrs.length}</div>
          <span className="text-[10px] text-slate-400">ثبت رسمی تصمیمات</span>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('visual_timeline')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'visual_timeline'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                : 'bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Compass className="w-4 h-4 text-indigo-300 animate-spin-slow" />
            <span>تایم‌لاین گرافیکی و گام بعدی (Visual Journey)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-mono font-bold">زنده</span>
          </button>
          <button
            onClick={() => setActiveTab('agent_roundtable')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'agent_roundtable'
                ? 'bg-purple-700 text-white shadow-md'
                : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>میزگرد و چت ۵ ایجنت (Roundtable)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-900 text-[9px] font-mono font-bold">جلسه</span>
          </button>
          <button
            onClick={() => setActiveTab('dev_handbook')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dev_handbook'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>دفترچه راهنمای مهندسی (Playbook)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-200 text-blue-900 text-[9px] font-mono font-bold">راهنما</span>
          </button>
          <button
            onClick={() => setActiveTab('bazaar_launch')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bazaar_launch'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <span>آمادگی عرضه در بازار (Fast-Track)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono">P0</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>نقشه فازها و اسپرینت‌ها ({filteredMilestones.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('adrs')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'adrs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>رکوردهای تصمیمات معماری (ADRs) ({adrs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('risk_matrix')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'risk_matrix'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>ماتریس وابستگی و آمادگی اسپرینت</span>
          </button>
          <button
            onClick={() => setActiveTab('ingestion')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ingestion'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>استودیو تزریق و ارزیابی رودمپ</span>
          </button>
          <button
            onClick={() => setActiveTab('agents_live')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'agents_live'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>استودیو ۵ ایجنت هابینو (زنده)</span>
          </button>
        </div>

        {activeTab === 'timeline' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="جستجو در تسک‌ها و تکنولوژی‌ها..."
                className="pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB: VISUAL ROADMAP TIMELINE & NEXT-STEP ENGINE */}
      {activeTab === 'visual_timeline' && (
        <VisualRoadmapTimeline
          milestones={milestones}
          onMilestonesChange={setMilestones}
          onNavigateToBazaar={() => setActiveTab('bazaar_launch')}
          onOpenHandbook={() => setActiveTab('dev_handbook')}
          onOpenAgentChat={(prompt) => {
            if (prompt) setChatInitialPrompt(prompt);
            setActiveTab('agent_roundtable');
          }}
        />
      )}

      {/* TAB: MULTI-AGENT CHAT ROUNDTABLE */}
      {activeTab === 'agent_roundtable' && (
        <MultiAgentChatRoom
          onMilestonesUpdated={setMilestones}
          initialPrompt={chatInitialPrompt}
        />
      )}

      {/* TAB: DEVELOPER ENGINEERING HANDBOOK & PLAYBOOK */}
      {activeTab === 'dev_handbook' && (
        <DeveloperEngineeringHandbook />
      )}

      {/* TAB 1: TIMELINE & MILESTONES */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* BAZAAR LAUNCH FAST-TRACK CALLOUT BANNER */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <span className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-xs">
                <ShoppingBag className="w-6 h-6" />
              </span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-sm md:text-base">
                    مأموریت ضربتی: آماده‌سازی هابینو برای عرضه در کافه‌بازار (Cafe Bazaar Launch)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono">
                    P0 Fast-Track
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  رودمپ ویژه ۹ مایلستون فوری جهت استقرار در استورهای اندرویدی ایرانی: پرداخت درون‌برنامه‌ای، کانتینر TWA، سامانه مودیان و فیش‌پرینتر حرارتی اصناف.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('bazaar_launch')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>داشبورد و شبیه‌سازهای بازار</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          {/* PHASES CAROUSEL / OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ROADMAP_PHASES.map(phase => {
              const phaseMilestones = milestones.filter(m => m.phaseId === phase.id);
              const completedCount = phaseMilestones.filter(m => m.status === 'completed').length;
              const isSelected = selectedPhase === phase.id;

              return (
                <div
                  key={phase.id}
                  onClick={() => setSelectedPhase(isSelected ? 'all' : phase.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                      : phase.status === 'completed'
                      ? 'bg-white border-slate-200 hover:border-emerald-300'
                      : phase.status === 'active'
                      ? 'bg-white border-blue-200 ring-1 ring-blue-500/10 hover:border-blue-300'
                      : 'bg-white/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        فاز {phase.number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          phase.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : phase.status === 'active'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {phase.badge}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">{phase.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{phase.tagline}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{phase.targetTimeline}</span>
                    <span className="font-bold text-slate-700">
                      {completedCount}/{phaseMilestones.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FILTER TOOLBAR */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-bold flex items-center gap-1 shrink-0 ml-1">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>فیلتر وضعیت:</span>
              </span>
              {[
                { id: 'all', label: 'همه' },
                { id: 'completed', label: 'پیاده‌سازی‌شده' },
                { id: 'in_progress', label: 'اسپرینت جاری' },
                { id: 'planned', label: 'برنامه‌ریزی‌شده' },
                { id: 'under_review', label: 'در صف تصمیم‌گیری' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedStatus(f.id)}
                  className={`text-xs px-3 py-1 rounded-xl transition-all cursor-pointer font-medium ${
                    selectedStatus === f.id
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">اولویت:</span>
              <select
                value={selectedPriority}
                onChange={e => setSelectedPriority(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700"
              >
                <option value="all">همه اولویت‌ها</option>
                <option value="P0">فقط P0 بحرانی</option>
                <option value="P1">P1 اولویت بالا</option>
                <option value="P2">P2 عادی</option>
              </select>
            </div>
          </div>

          {/* MILESTONES LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMilestones.map(m => {
              const isEditing = editingMilestoneId === m.id;

              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-3xl border transition-all p-5 space-y-4 shadow-sm relative flex flex-col justify-between ${
                    m.status === 'completed'
                      ? 'border-slate-200 hover:border-emerald-300'
                      : m.status === 'in_progress'
                      ? 'border-blue-300 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          روز {m.day} • {m.targetQuarter}
                        </span>
                        {getPriorityBadge(m.priority)}
                      </div>
                      {getStatusBadge(m.status)}
                    </div>

                    {/* Title & Phase */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-indigo-600 block">{m.phaseTitle}</span>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">{m.title}</h3>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>

                    {/* KPI & Metric */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-bold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-indigo-600" />
                          <span>معیار پذیرش فنی (KPI):</span>
                        </span>
                        {m.adrRef && (
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {m.adrRef}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-800 leading-snug">{m.kpiMetric}</p>
                    </div>

                    {/* Tech Stack Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {m.techStack.map((tech, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Rationale & Assignee */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>نقش مسئول: <strong className="text-slate-700">{m.assigneeRole}</strong></span>
                      {getRiskBadge(m.riskLevel)}
                    </div>
                  </div>

                  {/* Card Footer: Progress Slider & Status Selector */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px]">پیشرفت پیاده‌سازی:</span>
                      <span className="font-mono font-bold text-slate-700 text-[11px]">{m.progressPercent}%</span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={m.progressPercent}
                      onChange={e => handleUpdateProgressPercent(m.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="text-[10px] text-slate-400">تغییر وضعیت:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateMilestoneStatus(m.id, 'completed')}
                          className={`text-[10px] px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                            m.status === 'completed'
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          تکمیل ۱۰۰٪
                        </button>
                        <button
                          onClick={() => handleUpdateMilestoneStatus(m.id, 'in_progress')}
                          className={`text-[10px] px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                            m.status === 'in_progress'
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          در جریان
                        </button>
                        <button
                          onClick={() => handleUpdateMilestoneStatus(m.id, 'under_review')}
                          className={`text-[10px] px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                            m.status === 'under_review'
                              ? 'bg-purple-600 text-white font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                          }`}
                        >
                          بازبینی
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ARCHITECTURE DECISION RECORDS (ADRs) */}
      {activeTab === 'adrs' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-indigo-950">
                سوابق رسمی تصمیمات معماری (Architecture Decision Records - ADR)
              </h4>
              <p className="text-indigo-800 leading-relaxed">
                هر رکورد ADR سندی رسمی است که چرایی و چگونگی انتخاب یک رویکرد فنی، معایب، مزایا و استدلال‌های پشت آن را ثبت می‌کند تا تصمیم‌گیری‌های تیم توسعه در آینده با شفافیت ۱۰۰٪ و بدون اتلاف وقت در بازطراحی‌های تکراری اتخاذ شود.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {adrs.map(adr => (
              <div
                key={adr.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-slate-900 text-white">
                      {adr.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {adr.status === 'implemented' ? 'عملیاتی شده' : 'پذیرفته شده'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{adr.updatedAt}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm leading-snug">{adr.title}</h3>

                {/* Context */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 block">بافت مسأله و چالش فنی (Context):</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {adr.context}
                  </p>
                </div>

                {/* Decision */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-indigo-700 block">تصمیم فنی اتخاذ شده (Decision):</span>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                    {adr.decision}
                  </p>
                </div>

                {/* Consequences */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-700 block">پیامدها و دستاوردها (Consequences):</span>
                  <p className="text-xs text-slate-600 leading-relaxed bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100">
                    {adr.consequences}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>مالک فنی: <strong className="text-slate-700">{adr.technicalOwner}</strong></span>
                  <span className="text-indigo-600 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>مورد تأیید شورای فنی</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: RISK MATRIX & SPRINT READINESS */}
      {activeTab === 'risk_matrix' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Risk Radar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>توزیع ریسک معماری در اسپرینت‌ها</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">{milestones.length} تسک ارزیابی‌شده</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-rose-700 font-bold">ریسک بالا (نیازمند Proof of Concept و ممیزی)</span>
                    <span className="font-mono font-bold text-rose-700">
                      {milestones.filter(m => m.riskLevel === 'high').length} تسک
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{
                        width: `${(milestones.filter(m => m.riskLevel === 'high').length / milestones.length) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-amber-700 font-bold">ریسک متوسط (وابسته به ادغام با سرویس‌های بیرونی)</span>
                    <span className="font-mono font-bold text-amber-700">
                      {milestones.filter(m => m.riskLevel === 'medium').length} تسک
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${(milestones.filter(m => m.riskLevel === 'medium').length / milestones.length) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-emerald-700 font-bold">ریسک پایین (الگوهای تثبیت‌شده و تست‌شده)</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {milestones.filter(m => m.riskLevel === 'low').length} تسک
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${(milestones.filter(m => m.riskLevel === 'low').length / milestones.length) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                💡 <strong>راهبرد تصمیم‌گیری:</strong> کلیه تسک‌های با ریسک بالا (نظیر هویت غیرمتمرکز W3C DID و تسویه P2P) ابتدا در محیط تستی (Sandbox) و با معماری افزونه‌های مستقل ارزیابی شده و سپس وارد هسته پروداکشن خواهند شد.
              </div>
            </div>

            {/* Sprint Readiness Checklist */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>چک‌لیست آمادگی ورود به اسپرینت بعدی (Definition of Ready)</span>
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>ایزولاسیون کامل چندمستأجری با RLS و شاخص‌های GIN روی JSONB به صورت کامل پیاده شد.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>موتور ارکستراسیون مناقصه کور سایرافلو و ممیزی ضد دامپینگ در پروداکشن عملیاتی شد.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>پشتیبانی از کاتالوگ باز اصناف کشور با قابلیت تایپ کاملاً آزاد به بهره‌برداری رسید.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                  <Clock className="w-4 h-4 shrink-0 text-blue-600 animate-spin" />
                  <span>مشخصات فنی پروتکل هویت W3C DID و جفت‌کلیدهای محلی Ed25519 در فاز آزمایشی قرار دارد.</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200">
                  <GitBranch className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>مستندات Swagger / OpenAPI جهت اتصال وب‌سرویس‌های فروشگاهی تدوین شده است.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB BAZAAR LAUNCH FAST-TRACK */}
      {activeTab === 'bazaar_launch' && (
        <BazaarLaunchFastTrackView
          milestones={milestones}
          onMilestonesChange={setMilestones}
        />
      )}

      {/* TAB 4: ROADMAP INGESTION STUDIO */}
      {activeTab === 'ingestion' && (
        <RoadmapIngestionStudio
          onMilestonesUpdated={() => setMilestones(getStoredRoadmapMilestones())}
          onNavigateToTab={(tab: string) => setActiveTab(tab as any)}
        />
      )}

      {/* TAB 5: 5 AGENTS LIVE STUDIO */}
      {activeTab === 'agents_live' && (
        <LiveAgentDiagnosticStudio />
      )}

      {/* MODAL: ADD MILESTONE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>ثبت مایلستون یا فیچر فنی جدید برای تصمیم‌گیری تیم</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">عنوان مایلستون یا تسک معماری *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="مثال: راه‌اندازی درگاه پرداخت خرد چندمستأجری با وب‌هوک HMAC"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">فاز پروژه *</label>
                  <select
                    value={newPhaseId}
                    onChange={e => setNewPhaseId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    {ROADMAP_PHASES.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">حوزه تخصصی (Category) *</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as MilestoneCategory)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="bazaar_market">انتشار بازار و استورهای ایرانی (Bazaar)</option>
                    <option value="decentralized_id">پروتکل هویت و DID</option>
                    <option value="smart_contracts">قراردادهای هوشمند و کریپتو</option>
                    <option value="ai_siraflow">ارکستراسیون و هوش مصنوعی سایرافلو</option>
                    <option value="architecture">معماری و امنیت زیرساخت</option>
                    <option value="accounting_ledger">موتور دوبل و دفاتر حسابداری</option>
                    <option value="open_api">APIهای تجاری باز و افزونه‌ها</option>
                    <option value="pwa_devops">زیرساخت PWA و آفلاین</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">اولویت توسعه (Priority) *</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as MilestonePriority)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="P0">P0 - مسدودکننده و بحرانی</option>
                    <option value="P1">P1 - اولویت بالا</option>
                    <option value="P2">P2 - بهینه‌سازی و عادی</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">سطح ریسک معماری *</label>
                  <select
                    value={newRiskLevel}
                    onChange={e => setNewRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="low">ریسک پایین (الگوهای مرسوم)</option>
                    <option value="medium">ریسک متوسط (نیازمند تست پرفورمنس)</option>
                    <option value="high">ریسک بالا (پروتکل‌های جدید کریپتوگرافی)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">معیار پذیرش فنی (Acceptance KPI) *</label>
                  <input
                    type="text"
                    required
                    value={newKpi}
                    onChange={e => setNewKpi(e.target.value)}
                    placeholder="مثال: زمان پاسخ زیر ۸۰ میلی‌ثانیه و پوشش ۱۰۰٪ تست موازنه تراز"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">شرح جزئیات فنی و مستندات</label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="شرح جزئیات پیاده‌سازی و نیازمندی‌های اینترفیس..."
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تکنولوژی‌ها (کاما جدا کنید)</label>
                  <input
                    type="text"
                    value={newTechStack}
                    onChange={e => setNewTechStack(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">نقش مسئول در تیم</label>
                  <input
                    type="text"
                    value={newAssignee}
                    onChange={e => setNewAssignee(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-sm"
                >
                  ثبت در تابلوی رودمپ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ADR */}
      {isNewAdrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-600" />
                <span>ثبت سند رسمی تصمیم معماری (New Architecture Decision Record)</span>
              </h3>
              <button
                onClick={() => setIsNewAdrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateADR} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">کد سند (ADR Code) *</label>
                  <input
                    type="text"
                    required
                    value={newAdrCode}
                    onChange={e => setNewAdrCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">عنوان تصمیم معماری *</label>
                  <input
                    type="text"
                    required
                    value={newAdrTitle}
                    onChange={e => setNewAdrTitle(e.target.value)}
                    placeholder="مثال: پیاده‌سازی همگام‌سازی توزیع‌شده با CRDT"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-bold text-slate-700 block mb-1">بافت مسأله و چالش فنی (Context) *</label>
                  <textarea
                    rows={2}
                    required
                    value={newAdrContext}
                    onChange={e => setNewAdrContext(e.target.value)}
                    placeholder="توضیح دهید چه مسأله‌ای وجود داشت و چرا نیازمند اتخاذ این تصمیم فنی بودیم..."
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-bold text-slate-700 block mb-1">تصمیم فنی نهایی (Decision) *</label>
                  <textarea
                    rows={2}
                    required
                    value={newAdrDecision}
                    onChange={e => setNewAdrDecision(e.target.value)}
                    placeholder="رویکرد برگزیده، کتابخانه‌ها، پروتکل و پشته فنی منتخب..."
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-bold text-slate-700 block mb-1">پیامدها و مصالحه‌ها (Consequences & Trade-offs) *</label>
                  <textarea
                    rows={2}
                    required
                    value={newAdrConsequences}
                    onChange={e => setNewAdrConsequences(e.target.value)}
                    placeholder="مزایا، بهبود کارایی و نقاط ضعفی که با این تصمیم پذیرفته شد..."
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-bold text-slate-700 block mb-1">مالک فنی یا شورا (Technical Owner)</label>
                  <input
                    type="text"
                    value={newAdrOwner}
                    onChange={e => setNewAdrOwner(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAdrModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer shadow-sm"
                >
                  ثبت سند ADR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
