import React, { useState, useMemo } from 'react';
import {
  Milestone,
  MilestoneStatus,
  ROADMAP_PHASES,
  NextStepAnalysis,
  ProposedNextStep,
  calculateNextStepAnalysis,
  adoptProposedNextStep,
  updateMilestoneStatus,
  saveStoredRoadmapMilestones
} from '../lib/roadmapEngine';
import { generateEngineeringCodePrompt } from '../lib/promptGenerator';
import {
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
  Layers,
  Flag,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Info,
  ExternalLink,
  ShieldAlert,
  Play,
  ShoppingBag,
  Cpu,
  BookOpen,
  Terminal,
  Copy,
  Send,
  Code2,
  CheckCheck,
  Download,
  RotateCcw,
  FileText
} from 'lucide-react';

interface VisualRoadmapTimelineProps {
  milestones: Milestone[];
  onMilestonesChange: (updated: Milestone[]) => void;
  onNavigateToBazaar?: () => void;
  onOpenAgentChat?: (promptText?: string) => void;
  onOpenHandbook?: () => void;
}

export const VisualRoadmapTimeline: React.FC<VisualRoadmapTimelineProps> = ({
  milestones,
  onMilestonesChange,
  onNavigateToBazaar,
  onOpenAgentChat,
  onOpenHandbook
}) => {
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [adoptedFeedback, setAdoptedFeedback] = useState<string | null>(null);

  // Active Milestone for Engineering Prompt Modal
  const [activePromptMilestone, setActivePromptMilestone] = useState<Milestone | null>(null);
  const [copiedPromptSuccess, setCopiedPromptSuccess] = useState(false);
  const [modalPromptTheme, setModalPromptTheme] = useState<'dark' | 'light'>('light');

  // Calculate Next Step Analysis dynamically from current milestones
  const analysis: NextStepAnalysis = useMemo(() => {
    return calculateNextStepAnalysis(milestones);
  }, [milestones]);

  // Filter milestones for the timeline rail
  const timelineMilestones = useMemo(() => {
    const list = selectedPhaseFilter === 'all'
      ? milestones
      : milestones.filter(m => m.phaseId === selectedPhaseFilter);
    return [...list].sort((a, b) => a.day - b.day);
  }, [milestones, selectedPhaseFilter]);

  // Selected Milestone Details
  const selectedMilestone = useMemo(() => {
    if (!selectedNodeId) return null;
    return milestones.find(m => m.id === selectedNodeId) || null;
  }, [milestones, selectedNodeId]);

  // Handle adopting a proposed next step directly into active state
  const handleAdoptStep = (milestoneId: string, title: string) => {
    const updated = adoptProposedNextStep(milestoneId, milestones);
    onMilestonesChange(updated);
    setAdoptedFeedback(`گام بعدی «${title}» با موفقیت فعال شد و به لیست مایلستون‌های در حال اجرای کدنویس اضافه گردید.`);
    setTimeout(() => setAdoptedFeedback(null), 4000);
  };

  // Referral to External Coding Agent:
  // Since we don't code directly inside Habino, this generates the production prompt,
  // marks the milestone as "in_progress" (فعال شده) immediately in the roadmap,
  // copies the engineered prompt to clipboard, and opens the prompt modal.
  const handleAutoReferToCodingAgent = (milestone: Milestone) => {
    // 1. Mark milestone as adopted and in_progress (فعال شده)
    const updated = adoptProposedNextStep(milestone.id, milestones);
    onMilestonesChange(updated);

    // 2. Build the engineered prompt
    const prompt = generateEngineeringCodePrompt(milestone);

    // 3. Copy automatically to clipboard for pasting in external IDE / Coding Agent
    try {
      navigator.clipboard.writeText(prompt);
      setCopiedPromptSuccess(true);
    } catch {
      // Fallback
    }

    // 4. Open modal directly for inspection, theme toggling, or file download
    setActivePromptMilestone(milestone);

    // 5. Notify founder with clear Persian status
    setAdoptedFeedback(`مایلستون «${milestone.title}» فعال شد و به عنوان تسک جاری کدنویس بیرونی ثبت گردید. پرامپت مهندسی نیز در کلیپ‌بورد کپی شد.`);
    setTimeout(() => setAdoptedFeedback(null), 5000);
  };

  // Open Engineering Prompt Modal (Ready to copy)
  const handleOpenPromptModal = (milestone: Milestone) => {
    setActivePromptMilestone(milestone);
    setCopiedPromptSuccess(false);
  };

  const handleCopyGeneratedPrompt = (promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptSuccess(true);
    setTimeout(() => setCopiedPromptSuccess(false), 2500);
  };

  // Download Markdown Prompt File for external repository or agent ingestion
  const handleDownloadPromptFile = (milestone: Milestone) => {
    const content = generateEngineeringCodePrompt(milestone);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Habino_Prompt_${milestone.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle quick milestone status change (in_progress, completed, planned)
  const handleUpdateStatus = (milestoneId: string, status: MilestoneStatus, progress?: number) => {
    const updated = updateMilestoneStatus(milestoneId, status, progress, milestones);
    onMilestonesChange(updated);
    setAdoptedFeedback(`وضعیت مایلستون با موفقیت به «${status === 'in_progress' ? 'فعال‌شده (در حال اجرا)' : status === 'completed' ? 'تکمیل‌شده ۱۰۰٪' : 'برنامه‌ریزی‌شده'}» تغییر یافت.`);
    setTimeout(() => setAdoptedFeedback(null), 3500);
  };

  // Handle quick progress toggle
  const handleQuickComplete = (milestoneId: string) => {
    handleUpdateStatus(milestoneId, 'completed', 100);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. EXECUTIVE JOURNEY HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Compass className="w-6 h-6 animate-spin-slow" />
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-bold">
                سیر زمانی تعاملی نقشه راه (Visual Roadmap Journey)
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {analysis.completedCount} از {analysis.totalCount} مایلستون تحقق‌یافته
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              مسیر پیشرفت کلان و قطب‌نمای گام‌های بعدی هابینو
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              نمای پیوسته سیر تکامل سیستم‌عامل مالی از پی‌ریزی هسته دوبل تا استقرار پرشتاب در کافه‌بازار؛ پایش زنده
              نقطه فعلی تیم، تعیین گام بحرانی بعدی و ارائه پیشنهادات هوشمند فنی جهت تصمیم‌گیری در جلسات بنیانگذار.
            </p>
          </div>

          {/* Odometer-style Progress Gauge */}
          <div className="bg-slate-900/90 border border-indigo-500/40 rounded-3xl p-5 shrink-0 flex flex-col items-center justify-center min-w-[240px] shadow-lg">
            <span className="text-[11px] font-bold text-indigo-300 mb-1">پیشرفت کلان کل چرخه حیات</span>
            <div className="text-4xl md:text-5xl font-black font-mono text-white flex items-baseline gap-1">
              <span>{analysis.overallProgressPercent}</span>
              <span className="text-xl text-indigo-400 font-sans">%</span>
            </div>
            
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-gradient-to-r from-indigo-500 via-blue-400 to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${analysis.overallProgressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between w-full text-[10px] text-slate-400 mt-2 font-mono">
              <span>شروع: فاز ۱</span>
              <span className="text-amber-400 font-bold">فاز جاری: کافه‌بازار</span>
              <span>افق: فاز ۶</span>
            </div>

            {onOpenHandbook && (
              <button
                type="button"
                onClick={onOpenHandbook}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-bold transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                <span>دفترچه راهنمای مهندسی (Playbook)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERT IF STEP ADOPTED */}
      {adoptedFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{adoptedFeedback}</span>
          </div>
          <button
            onClick={() => setAdoptedFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. IMMEDIATE NEXT STEP & PROPOSED NEXT STEPS ENGINE (CRITICAL FOR FOUNDER & DEV TEAM) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): The Immediate Determined Next Step */}
        <div className="lg:col-span-5 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border-2 border-amber-400/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>گام بعدی مشخص و اولویت صفر (P0)</span>
              </span>
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-lg font-mono">
                توصیه قطعی هوش سایرافلو
              </span>
            </div>

            {analysis.immediateNextStep ? (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-indigo-700">
                  {analysis.immediateNextStep.phaseTitle} • روز {analysis.immediateNextStep.day}
                </div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {analysis.immediateNextStep.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {analysis.immediateNextStep.description}
                </p>

                {/* Acceptance KPI Callout */}
                <div className="bg-white/80 p-3 rounded-2xl border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold">
                    <span>معیار پذیرش فنی (KPI):</span>
                    {analysis.immediateNextStep.adrRef && (
                      <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">
                        {analysis.immediateNextStep.adrRef}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-800">
                    {analysis.immediateNextStep.kpiMetric}
                  </p>
                </div>

                {/* Rationale Explanation */}
                <div className="p-2.5 bg-amber-100/50 rounded-xl text-[11px] text-amber-950 border border-amber-200/50 leading-relaxed">
                  💡 <strong>چرا این تسک گام بعدی است؟</strong> {analysis.immediateRationale}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold">کلیه گام‌های جاری به اتمام رسیده‌اند.</p>
              </div>
            )}
          </div>

          {analysis.immediateNextStep && (
            <div className="pt-3 border-t border-amber-200/70 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">وضعیت و پیشرفت گام:</span>
                <span className="font-mono font-bold text-slate-800">
                  {analysis.immediateNextStep.status === 'in_progress' ? '🟢 فعال‌شده' : 'برنامه‌ریزی‌شده'} ({analysis.immediateNextStep.progressPercent}%)
                </span>
              </div>

              {/* Action buttons with Auto-Refer to External Dev and Copy Prompt options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleAutoReferToCodingAgent(analysis.immediateNextStep!)}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="فعال‌سازی تسک و تولید پرامپت مهندسی برای کدنویس بیرونی"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارجاع به کدنویس (پرامپت)</span>
                </button>

                <button
                  onClick={() => handleOpenPromptModal(analysis.immediateNextStep!)}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="مشاهده و کپی پرامپت مهندسی برای کپی در ایجنت بیرونی یا IDE"
                >
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>پرامپت مهندسی‌شده (کپی)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleQuickComplete(analysis.immediateNextStep!.id)}
                  className="flex-1 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تکمیل ۱۰۰٪ و بستن گام</span>
                </button>
                {onOpenAgentChat && (
                  <button
                    onClick={() => onOpenAgentChat(`سلام به ایجنت‌ها؛ در خصوص مایلستون گام بعدی «${analysis.immediateNextStep?.title}»، نیازمند ارزیابی فنی و تحلیل نیازمندی‌ها هستیم.`)}
                    className="p-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="مشاوره با ۵ ایجنت در مورد این تسک"
                  >
                    <Cpu className="w-3.5 h-3.5 text-indigo-700" />
                    <span className="text-[10px]">اتاق ایجنت‌ها</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 Cols): Proposed Upcoming Steps for Dev Team Selection */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    گام‌های بعدی پیشنهادی جهت انتخاب و تصویب تیم توسعه
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    رتبه‌بندی هوشمند اولویت‌ها بر مبنای ضریب فوریت، بازدهی و تأثیرگذاری بر بازار
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl">
                {analysis.proposedNextSteps.length} گزینه پیشنهادی
              </span>
            </div>

            {/* Proposed List */}
            <div className="space-y-3">
              {analysis.proposedNextSteps.map((prop: ProposedNextStep, idx: number) => {
                const isSelected = selectedNodeId === prop.milestone.id;

                return (
                  <div
                    key={prop.milestone.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-500/10'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono">
                          پیشنهاد #{idx + 1}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono">
                          فوریت: {prop.urgencyScore}%
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {prop.milestone.phaseTitle}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 leading-snug">
                        {prop.milestone.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {prop.reasoning}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                        <span>اثر: <strong className="text-slate-700">{prop.impactArea}</strong></span>
                        <span>•</span>
                        <span>تخمین زمان: <strong className="text-slate-700">{prop.estimatedEffortDays} روز</strong></span>
                        <span>•</span>
                        <span>مسئول: <strong className="text-slate-700">{prop.milestone.assigneeRole}</strong></span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleAutoReferToCodingAgent(prop.milestone)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          title="فعال‌سازی فوری تسک و تولید پرامپت مهندسی برای ارجاع به کدنویس بیرونی"
                        >
                          <Send className="w-3 h-3" />
                          <span>ارجاع به کدنویس (پرامپت)</span>
                        </button>

                        <button
                          onClick={() => handleOpenPromptModal(prop.milestone)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          title="تولید پرامپت مهندسی‌شده آماده کپی"
                        >
                          <Terminal className="w-3 h-3 text-amber-400" />
                          <span>پرامپت</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAdoptStep(prop.milestone.id, prop.milestone.title)}
                          className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
                          title="فعال‌سازی تسک در بورد و نقشه راه بدون کپی پرامپت"
                        >
                          شروع و فعال‌سازی در بورد
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => setSelectedNodeId(prop.milestone.id)}
                          className="text-[11px] text-slate-500 hover:text-indigo-600 font-medium cursor-pointer"
                        >
                          جزئیات
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>💡 با کلیک روی «ارجاع به کدنویس»، تسک فوراً فعال شده و پرامپت مهندسی برای ابلاغ به کدنویس بیرونی آماده می‌شود.</span>
            {onNavigateToBazaar && (
              <button
                onClick={onNavigateToBazaar}
                className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>بررسی نیازمندی‌های کافه‌بازار</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2.5 ACTIVE IN-PROGRESS MILESTONES (ASSIGNED TO EXTERNAL DEVELOPER / AGENT) */}
      <div className="bg-white rounded-3xl p-6 border-2 border-indigo-200/90 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xs">
              <Code2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  گام‌های فعال‌شده و ارجاع‌شده به کدنویس بیرونی
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-bold font-mono">
                  {milestones.filter(m => m.status === 'in_progress').length} تسک فعال
                </span>
              </div>
              <p className="text-xs text-slate-500">
                این مایلستون‌ها فعال شده و پرامپت مهندسی آن‌ها جهت پیاده‌سازی به کدنویس بیرونی (توسعه‌دهنده یا ایجنت‌های هوش مصنوعی مانند Cursor/Claude) ابلاغ گردیده است.
              </p>
            </div>
          </div>
        </div>

        {milestones.filter(m => m.status === 'in_progress').length === 0 ? (
          <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold text-slate-600">در حال حاضر هیچ مایلستونی در وضعیت فعال‌شده توسط کدنویس نیست.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              از بین گزینه‌های بالا، با کلیک بر روی «ارجاع به کدنویس (پرامپت)»، تسک مورد نظر فعال و پرامپت مهندسی آن صادر می‌شود.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {milestones.filter(m => m.status === 'in_progress').map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-200 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      فعال‌شده (در حال اجرای کدنویس بیرونی)
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      روز {m.day} • {m.phaseTitle}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 leading-snug">
                    {m.title}
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {m.description}
                  </p>

                  {m.kpiMetric && (
                    <div className="p-2 bg-white/90 rounded-xl border border-indigo-100 text-[11px] text-slate-700">
                      <strong className="text-indigo-900">معیار پذیرش KPI:</strong> {m.kpiMetric}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 pt-2 border-t border-indigo-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">پیشرفت کدنویسی:</span>
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => handleUpdateStatus(m.id, pct === 100 ? 'completed' : 'in_progress', pct)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                            m.progressPercent === pct
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleAutoReferToCodingAgent(m)}
                      className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="مشاهده و کپی مجدد پرامپت مهندسی برای ابلاغ به کدنویس بیرونی"
                    >
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      <span>دریافت مجدد پرامپت</span>
                    </button>

                    <button
                      onClick={() => handleQuickComplete(m.id)}
                      className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="ثبت اتمام کدنویسی و تبدیل مایلستون به تکمیل‌شده ۱۰۰٪"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تکمیل ۱۰۰٪ تسک</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      onClick={() => handleUpdateStatus(m.id, 'planned', 0)}
                      className="text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                      title="بازگرداندن به حالت برنامه‌ریزی‌شده و لغو فعالیت کدنویس"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>لغو و بازگشت به برنامه‌ریزی</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPromptFile(m)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>دانلود فایل .md پرامپت</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. VISUAL GRAPHICAL TIMELINE RAIL (FROM DAY 1 TO MARKET & FUTURE) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>تایم‌لاین گرافیکی پیوسته مایلستون‌ها (Visual Progress Rail)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ترسیم پیوند گره‌های زمانی از نقطه شروع معماری تا فاز ضربتی بازار و چشم‌انداز آینده
            </p>
          </div>

          {/* Phase Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl flex-wrap">
            <button
              onClick={() => setSelectedPhaseFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPhaseFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              همه فازها ({milestones.length})
            </button>
            {ROADMAP_PHASES.map(ph => (
              <button
                key={ph.id}
                onClick={() => setSelectedPhaseFilter(ph.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPhaseFilter === ph.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ph.number}. {ph.badge}
              </button>
            ))}
          </div>
        </div>

        {/* The Graphic Interactive Timeline Stream */}
        <div className="relative py-4 overflow-x-auto">
          {/* Main Connecting Track Line */}
          <div className="relative min-w-[900px]">
            <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 via-amber-500 to-slate-200 -translate-y-1/2 z-0 rounded-full" />

            {/* Timeline Nodes Grid */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              {timelineMilestones.map((m, idx) => {
                const isCompleted = m.status === 'completed';
                const isInProgress = m.status === 'in_progress';
                const isSelected = selectedNodeId === m.id;
                const isImmediateNext = analysis.immediateNextStep?.id === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedNodeId(m.id)}
                    className="flex flex-col items-center group cursor-pointer shrink-0 max-w-[140px] text-center"
                  >
                    {/* Top Tag */}
                    <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-indigo-600 mb-2 transition-colors">
                      روز {m.day}
                    </span>

                    {/* Node Visual Bubble */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm relative ${
                        isCompleted
                          ? 'bg-emerald-600 text-white hover:scale-110 shadow-emerald-600/30'
                          : isInProgress
                          ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/40 hover:scale-110 animate-bounce-subtle'
                          : isImmediateNext
                          ? 'bg-blue-600 text-white ring-4 ring-blue-400/40 hover:scale-110'
                          : 'bg-white border-2 border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'
                      } ${isSelected ? 'ring-4 ring-indigo-600/50 scale-115' : ''}`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isInProgress ? (
                        <Clock className="w-5 h-5 animate-spin-slow" />
                      ) : (
                        <span className="text-xs font-bold font-mono">{idx + 1}</span>
                      )}

                      {/* Floating Marker Badge for In-Progress (You are here) */}
                      {isInProgress && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[8px] whitespace-nowrap shadow-xs">
                          اسپرینت
                        </span>
                      )}
                    </div>

                    {/* Node Title & Phase */}
                    <div className="mt-2.5 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                        {m.title}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-mono">
                        {m.progressPercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. DRAWER / DETAIL PANEL FOR SELECTED MILESTONE */}
        {selectedMilestone && (
          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800">
                    روز {selectedMilestone.day} • {selectedMilestone.targetQuarter}
                  </span>
                  <span className="text-xs font-bold text-indigo-700">{selectedMilestone.phaseTitle}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono">
                    {selectedMilestone.priority}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm md:text-base">{selectedMilestone.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{selectedMilestone.description}</p>
              </div>

              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">معیار پذیرش فنی (KPI):</span>
                <span className="text-slate-800 font-medium">{selectedMilestone.kpiMetric}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">پشته تکنولوژی:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedMilestone.techStack.map((t, idx) => (
                    <span key={idx} className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">مسئول فنی:</span>
                <span className="font-bold text-slate-800">{selectedMilestone.assigneeRole}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">وضعیت فعلی:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                  selectedMilestone.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedMilestone.status === 'in_progress'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {selectedMilestone.status === 'completed'
                    ? 'تکمیل‌شده ۱۰۰٪'
                    : selectedMilestone.status === 'in_progress'
                    ? 'فعال‌شده (در حال اجرای کدنویس)'
                    : 'برنامه‌ریزی‌شده'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAutoReferToCodingAgent(selectedMilestone)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                  title="فعال‌سازی تسک و تولید پرامپت برای کدنویس بیرونی"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارجاع به کدنویس (پرامپت)</span>
                </button>

                <button
                  onClick={() => handleOpenPromptModal(selectedMilestone)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>پرامپت مهندسی</span>
                </button>

                {selectedMilestone.status !== 'completed' ? (
                  <button
                    onClick={() => handleQuickComplete(selectedMilestone.id)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تکمیل ۱۰۰٪</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(selectedMilestone.id, 'in_progress', 50)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs cursor-pointer"
                  >
                    بازگشت به حالت در حال اجرا
                  </button>
                )}

                {selectedMilestone.status !== 'in_progress' && (
                  <button
                    onClick={() => handleAdoptStep(selectedMilestone.id, selectedMilestone.title)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer shadow-xs"
                  >
                    فعال‌سازی در بورد
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. ENGINEERED PROMPT MODAL (READY-TO-COPY & INSTANT DISPATCH) */}
      {activePromptMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Terminal className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">دستورکار مهندسی آماده ابلاغ به کدنویس بیرونی</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      {activePromptMilestone.id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      {activePromptMilestone.status === 'in_progress' ? 'فعال‌شده در بورد' : 'برنامه‌ریزی‌شده'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    مایلستون: <strong className="text-slate-200">{activePromptMilestone.title}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePromptMilestone(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Prompt Display */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3 font-mono text-xs">
              <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800 gap-2">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>متن پرامپت مهندسی (آماده پیست در ایجنت هوش مصنوعی، Cursor، Claude یا VSCode):</span>
                </span>
                
                {/* Theme toggle */}
                <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setModalPromptTheme('light')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      modalPromptTheme === 'light'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تم روشن
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalPromptTheme('dark')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      modalPromptTheme === 'dark'
                        ? 'bg-slate-800 text-amber-300 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تم تیره
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={14}
                  value={generateEngineeringCodePrompt(activePromptMilestone)}
                  style={{
                    color: modalPromptTheme === 'dark' ? '#f8fafc' : '#0f172a',
                    backgroundColor: modalPromptTheme === 'dark' ? '#020617' : '#ffffff',
                    WebkitTextFillColor: modalPromptTheme === 'dark' ? '#f8fafc' : '#0f172a',
                    borderColor: modalPromptTheme === 'dark' ? '#334155' : '#cbd5e1',
                    caretColor: '#f59e0b'
                  }}
                  className={`w-full border rounded-2xl p-4 text-xs font-mono leading-relaxed resize-none focus:outline-hidden transition-colors shadow-inner ${
                    modalPromptTheme === 'dark'
                      ? 'border-slate-800 text-slate-100 selection:bg-indigo-600 selection:text-white'
                      : 'border-slate-300 text-slate-900 selection:bg-amber-400 selection:text-slate-950'
                  }`}
                />
              </div>

              <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2.5 text-indigo-200 text-[11px] font-sans">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  <strong>راهنمای ارجاع به کدنویس:</strong> چون کدنویسی درون محیط هابینو انجام نمی‌شود، این پرامپت مهندسی خروجی نهایی است. کافیست آن را کپی کرده و به ایجنت کدنویس بیرونی خود (مثل Claude 3.7 Sonnet، Cursor، ChatGPT یا مهندس فول‌استک) تحویل دهید. پس از پیاده‌سازی کد، دکمه «ثبت تکمیل ۱۰۰٪» را بزنید.
                </p>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {copiedPromptSuccess && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl animate-in fade-in">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span>پرامپت با موفقیت در کلیپ‌بورد کپی شد!</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDownloadPromptFile(activePromptMilestone)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="دانلود فایل مارک‌داون پرامپت برای بایگانی یا ارسال در گیت‌هاب"
                >
                  <Download className="w-4 h-4 text-slate-300" />
                  <span>دانلود فایل MD</span>
                </button>

                <button
                  onClick={() => handleCopyGeneratedPrompt(generateEngineeringCodePrompt(activePromptMilestone))}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>کپی پرامپت برای کدنویس</span>
                </button>

                <button
                  onClick={() => {
                    handleQuickComplete(activePromptMilestone.id);
                    setActivePromptMilestone(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  title="علامت‌گذاری این تسک به عنوان انجام‌شده توسط کدنویس بیرونی"
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت اتمام کدنویسی (۱۰۰٪)</span>
                </button>

                <button
                  onClick={() => setActivePromptMilestone(null)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
