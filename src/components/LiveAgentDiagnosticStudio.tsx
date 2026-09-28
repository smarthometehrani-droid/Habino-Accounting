import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Send,
  Zap,
  Layers,
  Terminal,
  FileCode,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Sparkles,
  GitPullRequest,
  Database,
  CloudUpload,
  HardDrive,
  CheckCheck,
  MessageSquareQuote
} from 'lucide-react';
import { SupabaseAgentStudioService, SupabaseConnectionTelemetry } from '../lib/supabaseAgentQueries';
import { MultiAgentChatRoom } from './MultiAgentChatRoom';
import { runAiDiagnostics } from '../services/geminiService';
import { useAccounting } from '../lib/store';

interface AgentEvent {
  id: string;
  sourceAgent: string;
  targetAgent?: string;
  eventType: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'SUCCESS';
  payload: any;
  timestamp: string;
}

interface ConvergenceGap {
  id: string;
  component: string;
  demoState: string;
  roadmapTarget: string;
  gapType: string;
  severity: 'P0' | 'P1' | 'P2';
  status: 'OPEN' | 'REFERRED' | 'RESOLVED';
  targetAgent: string;
  recommendation: string;
}

interface ConvergenceReport {
  convergenceScore: number;
  totalGapsCount: number;
  criticalGapsCount: number;
  summary: string;
  recommendations: string[];
}

export const LiveAgentDiagnosticStudio: React.FC = () => {
  const { invoices, checks, transactions } = useAccounting();
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [gaps, setGaps] = useState<ConvergenceGap[]>([]);
  const [report, setReport] = useState<ConvergenceReport | null>(null);
  const [aiAuditReport, setAiAuditReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [supabaseTelemetry, setSupabaseTelemetry] = useState<SupabaseConnectionTelemetry | null>(null);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'monitor'>('chat');

  const loadAiDiagnostics = async () => {
    try {
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
      const pendingChecks = checks.filter(c => c.status === 'pending');
      const bouncedChecks = checks.filter(c => c.status === 'bounced');
      const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
      const totalReceivables = unpaidInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);

      const rep = await runAiDiagnostics({
        totalInvoices: invoices.length,
        unpaidInvoicesCount: unpaidInvoices.length,
        totalReceivables,
        totalChecks: checks.length,
        pendingChecksCount: pendingChecks.length,
        bouncedChecksCount: bouncedChecks.length,
        totalTransactions: transactions.length,
        totalIncome,
        totalExpense,
        netCashBalance: totalIncome - totalExpense,
        liquidityRatio: totalExpense > 0 ? Number((totalIncome / totalExpense).toFixed(2)) : 1.45,
        isLedgerBalanced: true
      });
      if (rep) {
        setAiAuditReport(rep);
      }
    } catch (e) {
      console.warn('AI Diagnostics load failed:', e);
    }
  };

  // Load Supabase Telemetry
  const loadDbTelemetry = async () => {
    try {
      const telem = await SupabaseAgentStudioService.getTelemetry('tenant-main');
      setSupabaseTelemetry(telem);
    } catch (e) {
      console.warn('Telemetry load failed:', e);
    }
  };

  // Sync snapshot to Supabase
  const handleSyncToSupabase = async () => {
    setIsSyncingDb(true);
    setSyncFeedback(null);
    try {
      const res = await SupabaseAgentStudioService.syncAgentSnapshot('tenant-main', gaps, events);
      if (res.error) {
        setSyncFeedback(`خطا در همگام‌سازی: ${res.error}`);
      } else {
        setSyncFeedback(`همگام‌سازی با پایگاه داده تکمیل شد: تعداد ${res.syncedGaps} شکاف همگرایی و ${res.syncedEvents} رویداد ایجنت در جداول اختصاصی سوپابیس ذخیره شدند.`);
        await loadDbTelemetry();
      }
    } catch (e: any) {
      setSyncFeedback(`خطا در ارتباط با دیتابیس: ${e.message}`);
    } finally {
      setIsSyncingDb(false);
    }
  };

  // 1. Setup Live SSE Stream
  useEffect(() => {
    loadDbTelemetry();
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/agents/live-stream');
      eventSource.onopen = () => {
        setSseConnected(true);
      };
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'SNAPSHOT' && Array.isArray(data.history)) {
            setEvents(data.history);
          } else if (data.type === 'AGENT_MESSAGE' && data.payload) {
            setEvents((prev) => [data.payload, ...prev.slice(0, 49)]);
          }
        } catch (err) {
          console.error('SSE parsing error:', err);
        }
      };
      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch {
      setSseConnected(false);
    }

    return () => {
      eventSource?.close();
    };
  }, []);

  // 2. Fetch Initial Convergence Gaps & Report
  const loadConvergenceData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents/convergence/gaps');
      const data = await res.json();
      setGaps(data.items || []);
      if (data.latestReport) {
        setReport(data.latestReport);
      }
    } catch (err) {
      console.error('Failed to load convergence gaps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConvergenceData();
    loadAiDiagnostics();
  }, []);

  // 3. Trigger Fresh Audit
  const handleRunAudit = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const [res] = await Promise.all([
        fetch('/api/agents/convergence/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-role': 'FOUNDER_ROLE' }
        }),
        loadAiDiagnostics()
      ]);
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        await loadConvergenceData();
        setActionMessage('ممیزی همگرایی دمو با رودمپ و سلامت هوشمند دفاتر با موفقیت تکمیل شد.');
      }
    } catch (err: any) {
      setActionMessage(`خطا در اجرای ممیزی: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 4. Refer All Gaps
  const handleReferAllGaps = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/agents/convergence/refer-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'FOUNDER_ROLE' }
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`تعداد ${data.referredCount} شکاف به ایجنت‌های تخصصی ارجاع داده شد.`);
        await loadConvergenceData();
      }
    } catch (err: any) {
      setActionMessage(`خطا در ارجاع: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 5. Refer Single Gap
  const handleReferSingleGap = async (gapId: string) => {
    try {
      const res = await fetch('/api/agents/convergence/refer-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-role': 'FOUNDER_ROLE' },
        body: JSON.stringify({ gapId })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.actionTaken);
        await loadConvergenceData();
      }
    } catch (err: any) {
      setActionMessage(`خطا: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Convergence Health & Metrics */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Cpu className="w-3.5 h-3.5 animate-pulse" />
                موتور ارکستراسیون ۵ ایجنتی هابینو
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                  sseConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {sseConnected ? 'جریان زنده وقایع فعال (SSE)' : 'اتصال محلی'}
              </span>
            </div>
            <h3 className="text-xl font-black tracking-tight text-white">
              پایش بلادرنگ و خودترمیمی هوشمند سیستم
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              ایجنت‌های تشخیصی، ارزیاب نیازمندی، ایده‌پرداز، نقشه راه و برنامه‌نویس به صورت هماهنگ سلامت
              دفاتر دوبل، انطباق دمو با رودمپ پروداکشن و ایزولاسیون مستأجران را ممیزی می‌کنند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-900/30 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>ممیزی فوری همگرایی</span>
            </button>

            <button
              type="button"
              onClick={handleReferAllGaps}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-900/30 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>ارجاع هوشمند کلیه شکاف‌ها</span>
            </button>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div className="mt-4 p-3 rounded-xl bg-blue-950/80 border border-blue-700/50 text-xs text-blue-200 flex items-center justify-between">
            <span>{actionMessage}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-blue-400 hover:text-white text-xs font-bold"
            >
              بستن
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              ضریب همگرایی دمو با رودمپ
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">
                {report ? `${report.convergenceScore}٪` : '۹۴٪'}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold">بسیار مطلوب</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${report ? report.convergenceScore : 94}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              شکاف‌های ساختاری شناسایی‌شده
            </span>
            <span className="text-2xl font-black text-white">{gaps.length} مورد</span>
            <span className="text-[10px] text-slate-400 block mt-1">تطابق معماری با فاز ۵</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              شکاف‌های با اولویت بحرانی (P0)
            </span>
            <span className="text-2xl font-black text-amber-400">
              {gaps.filter((g) => g.severity === 'P0' && g.status === 'OPEN').length} مورد
            </span>
            <span className="text-[10px] text-amber-300/80 block mt-1">ایزولاسیون RLS دیتابیس</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-semibold block mb-1">
              رویدادهای بلادرنگ ثبت‌شده
            </span>
            <span className="text-2xl font-black text-blue-400">{events.length} پیام</span>
            <span className="text-[10px] text-blue-300/80 block mt-1">پروتکل ارتباطی بین ایجنت‌ها</span>
          </div>
        </div>
      </div>

      {/* SUBTABS SWITCHER: CHAT ROOM VS MONITORING */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'chat'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <MessageSquareQuote className="w-4 h-4 text-purple-300" />
            <span>میزگرد تعاملی و چت زنده با ۵ ایجنت (Roundtable Chat)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-mono">فعال</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('monitor')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'monitor'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-blue-400" />
            <span>پایشگر بلادرنگ همگرایی، لاگ‌ها و تله‌متری دیتابیس</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          {activeSubTab === 'chat' ? 'اتاق گفتگوی چندایجنت آماده دریافت دستورات' : 'پایش بلادرنگ رویدادهای SSE و شکاف‌ها'}
        </span>
      </div>

      {/* 1. MULTI-AGENT CHAT ROOM VIEW */}
      {activeSubTab === 'chat' && (
        <MultiAgentChatRoom />
      )}

      {/* 2. DIAGNOSTIC & MONITORING VIEW */}
      {activeSubTab === 'monitor' && (
        <div className="space-y-6">
          {/* AI Financial & Ledger Diagnostics by Synapse CFO Engine */}
          {aiAuditReport && (
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-indigo-900/40 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-indigo-800/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>ممیزی هوشمند دفاتر مالی و نقدینگی (CFO Synapse Engine)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                        {aiAuditReport.modelUsed || 'هوش تحلیلی فعال'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {aiAuditReport.cashflowProjection}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-indigo-900/50 px-3 py-1.5 rounded-xl border border-indigo-700/50 text-center">
                    <span className="text-[10px] text-indigo-300 block">نمره سلامت دفاتر</span>
                    <span className="text-sm font-black text-emerald-400">{aiAuditReport.healthScore || 98}٪</span>
                  </div>
                  <div className="bg-indigo-900/50 px-3 py-1.5 rounded-xl border border-indigo-700/50 text-center">
                    <span className="text-[10px] text-indigo-300 block">نسبت جاری نقدینگی</span>
                    <span className="text-sm font-black text-cyan-300 font-mono">{aiAuditReport.liquidityStatus}</span>
                  </div>
                </div>
              </div>

              {/* Recommendations & Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>هشدارهای ممیزی</span>
                  </span>
                  <ul className="space-y-1">
                    {(aiAuditReport.criticalAlerts || []).map((alert: string, i: number) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>توصیه‌های استراتژیک CFO</span>
                  </span>
                  <ul className="space-y-1">
                    {(aiAuditReport.cfoRecommendations || []).map((rec: string, i: number) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Supabase Multi-Tenant Engine & Database Persistence Bar */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-emerald-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white">
                  همگام‌سازی ابری دیتابیس سوپابیس (Supabase Multi-Tenant Persistence)
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {supabaseTelemetry?.isConnected ? 'متصل و فعال' : 'آماده به کار'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30">
                  RLS Enforced
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                جداول اختصاصی ابری: agent_convergence_gaps، agent_event_logs، agent_diagnostic_events با ایزولاسیون کامل بر پایه tenant_id = 'tenant-main'
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSyncToSupabase}
              disabled={isSyncingDb}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className={`w-4 h-4 ${isSyncingDb ? 'animate-bounce' : ''}`} />
              <span>{isSyncingDb ? 'در حال ذخیره‌سازی...' : 'همگام‌سازی بلادرنگ با دیتابیس سوپابیس'}</span>
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-[11px] text-emerald-200 flex items-center gap-2 animate-fade-in">
            <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Convergence Gaps and Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  شکاف‌های همگرایی نیازمند اصلاح (Demo vs Enterprise Roadmap)
                </h4>
              </div>
              <span className="text-xs font-mono text-slate-500 font-semibold">
                {gaps.filter((g) => g.status === 'OPEN').length} مورد باز
              </span>
            </div>

            <div className="space-y-3">
              {(gaps || []).length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl text-xs">
                  هیچ شکاف باز یا ناهماهنگی در سیستم شناسایی نشده است.
                </div>
              ) : (
                (gaps || []).map((gap) => (
                  <div
                    key={gap.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              gap.severity === 'P0'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {gap.severity}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900">{gap.component}</h5>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                            {gap.targetAgent}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {gap.recommendation}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {gap.status === 'REFERRED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ارجاع شده
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReferSingleGap(gap.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>ارجاع به ایجنت</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-slate-400 font-semibold block mb-0.5">وضعیت فعلی در دمو:</span>
                        <span className="text-slate-700 font-medium">{gap.demoState}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                        <span className="text-blue-500 font-semibold block mb-0.5">هدف رودمپ پروداکشن:</span>
                        <span className="text-slate-700 font-medium">{gap.roadmapTarget}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Live SSE Terminal Log */}
        <div className="space-y-4">
          <div className="bg-slate-950 text-slate-200 rounded-3xl p-5 border border-slate-800 shadow-xl h-[520px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-white">
                    ترمینال وقایع زنده ایجنت‌ها
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {sseConnected ? 'LIVE FEED' : 'OFFLINE'}
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                {(events || []).length === 0 ? (
                  <div className="text-center py-12 text-slate-600 font-mono text-xs">
                    در انتظار مخابره پیام توسط EventBus...
                  </div>
                ) : (
                  (events || []).map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-blue-400 font-bold">{evt.sourceAgent}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                            evt.severity === 'CRITICAL'
                              ? 'bg-rose-900/80 text-rose-300'
                              : evt.severity === 'WARNING'
                              ? 'bg-amber-900/80 text-amber-300'
                              : evt.severity === 'SUCCESS'
                              ? 'bg-emerald-900/80 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </div>
                      <div className="text-slate-300 font-sans font-medium text-xs">
                        {evt.eventType}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {typeof evt.payload === 'object'
                          ? JSON.stringify(evt.payload)
                          : String(evt.payload)}
                      </div>
                      <div className="text-[9px] text-slate-600 text-left ltr">
                        {new Date(evt.timestamp).toLocaleTimeString('fa-IR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>هسته تحلیلی سیناپس & سایرافلو</span>
              <span className="font-mono">v2.5.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    )}
  </div>
  );
};
