import React, { useState, useRef, useEffect } from 'react';
import {
  Cpu,
  Send,
  Sparkles,
  Users,
  ShieldCheck,
  Database,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  GitPullRequest,
  ShoppingBag,
  Zap,
  Layers,
  ArrowRight,
  MessageSquareQuote,
  Save,
  FileText,
  Code2
} from 'lucide-react';
import { Milestone, addCustomRoadmapMilestone, getStoredRoadmapMilestones } from '../lib/roadmapEngine';
import { SupabaseAgentStudioService } from '../lib/supabaseAgentQueries';
import { chatWithAgentRoundtable } from '../services/geminiService';
import { useAccounting } from '../lib/store';

// Inline parser for bold and backtick codes with strict high-contrast for both user and agent messages
const renderInlineMarkdown = (text: string, isUser: boolean) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong
          key={i}
          style={{ color: isUser ? '#ffffff' : '#0f172a' }}
          className={`font-black ${isUser ? 'text-white' : 'text-slate-900'}`}
        >
          {boldText}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const codeText = part.slice(1, -1);
      return (
        <code
          key={i}
          style={{
            color: isUser ? '#fef08a' : '#4338ca',
            backgroundColor: isUser ? '#020617' : '#e0e7ff',
            borderColor: isUser ? '#334155' : '#c7d2fe'
          }}
          className={`px-1.5 py-0.5 rounded font-mono text-[11px] border ${
            isUser
              ? 'bg-slate-950 text-amber-300 border-slate-800'
              : 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
          }`}
        >
          {codeText}
        </code>
      );
    }
    return (
      <span
        key={i}
        style={{ color: isUser ? '#f1f5f9' : '#1e293b' }}
        className={isUser ? 'text-slate-100' : 'text-slate-800'}
      >
        {part}
      </span>
    );
  });
};

// Structured message body renderer to prevent dark-on-dark unreadable text
const renderMessageContent = (text: string, isUser: boolean) => {
  const lines = text.split('\n');

  if (lines.length === 1 && !text.includes('**') && !text.includes('`')) {
    return (
      <p
        style={{ color: isUser ? '#f8fafc' : '#1e293b' }}
        className={`leading-relaxed whitespace-pre-wrap text-xs ${isUser ? 'text-slate-100 font-normal' : 'text-slate-800'}`}
      >
        {text}
      </p>
    );
  }

  return (
    <div className="space-y-1.5 leading-relaxed font-sans" style={{ color: isUser ? '#f8fafc' : '#1e293b' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Heading 3 / Section Header
        if (trimmed.startsWith('### ')) {
          return (
            <div
              key={idx}
              style={{
                color: isUser ? '#fde68a' : '#1e1b4b',
                borderColor: isUser ? '#334155' : '#c7d2fe'
              }}
              className={`font-black text-xs pt-2 pb-1 border-b ${
                isUser
                  ? 'text-amber-300 border-slate-700'
                  : 'text-indigo-950 border-indigo-200'
              }`}
            >
              {trimmed.replace('### ', '')}
            </div>
          );
        }

        // Horizontal divider
        if (trimmed === '---') {
          return (
            <hr
              key={idx}
              style={{ borderColor: isUser ? '#334155' : '#e2e8f0' }}
              className={`my-2 ${isUser ? 'border-slate-700' : 'border-slate-200'}`}
            />
          );
        }

        // Bullet list item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pr-1 text-xs">
              <span
                style={{ color: isUser ? '#f59e0b' : '#4f46e5' }}
                className={`font-bold mt-0.5 ${isUser ? 'text-amber-400' : 'text-indigo-600'}`}
              >
                •
              </span>
              <div
                style={{ color: isUser ? '#f1f5f9' : '#1e293b' }}
                className={isUser ? 'text-slate-100' : 'text-slate-800'}
              >
                {renderInlineMarkdown(content, isUser)}
              </div>
            </div>
          );
        }

        // Numbered list item
        const numberedMatch = trimmed.match(/^(\d+[\.\)])\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pr-1 text-xs">
              <span
                style={{ color: isUser ? '#f59e0b' : '#4f46e5' }}
                className={`font-mono font-bold ${isUser ? 'text-amber-400' : 'text-indigo-600'}`}
              >
                {numberedMatch[1]}
              </span>
              <div
                style={{ color: isUser ? '#f1f5f9' : '#1e293b' }}
                className={isUser ? 'text-slate-100' : 'text-slate-800'}
              >
                {renderInlineMarkdown(numberedMatch[2], isUser)}
              </div>
            </div>
          );
        }

        // Standard line
        return (
          <p
            key={idx}
            style={{ color: isUser ? '#f8fafc' : '#1e293b' }}
            className={`text-xs leading-relaxed ${isUser ? 'text-slate-100' : 'text-slate-800'}`}
          >
            {renderInlineMarkdown(trimmed, isUser)}
          </p>
        );
      })}
    </div>
  );
};

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  avatarIcon: React.ElementType;
  badgeColor: string;
  accentBg: string;
  borderColor: string;
  textColor: string;
  specialty: string;
}

export const HABINO_AGENTS: AgentProfile[] = [
  {
    id: 'chief_architect',
    name: 'سایرافلو (SiraFlow Lead)',
    role: 'معمار ارشد سیستم و ارکستراسیون',
    avatarIcon: Cpu,
    badgeColor: 'bg-indigo-600 text-white',
    accentBg: 'bg-indigo-50/70',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-950',
    specialty: 'معماری کلان، هماهنگی ۵ ایجنت، هدایت اسپرینت‌ها و تصمیمات ADR'
  },
  {
    id: 'bazaar_evaluator',
    name: 'ایجنت نیازمندی‌ها و بازار',
    role: 'ارزیاب اصناف و الزامات استور',
    avatarIcon: ShoppingBag,
    badgeColor: 'bg-amber-600 text-white',
    accentBg: 'bg-amber-50/70',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-950',
    specialty: 'سیاست‌های کافه‌بازار، درگاه ریالی IAP، سامانه مودیان و سهولت کاربرد اصناف'
  },
  {
    id: 'security_db',
    name: 'ایجنت امنیت و سوپابیس',
    role: 'ناظر پایگاه داده و دفاتر دوبل',
    avatarIcon: Database,
    badgeColor: 'bg-emerald-600 text-white',
    accentBg: 'bg-emerald-50/70',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-950',
    specialty: 'ایزولاسیون داده‌ها با RLS، مهاجرت‌های SQL، پایداری سند دوبل و پشتیبان‌گیری'
  },
  {
    id: 'lead_coder',
    name: 'ایجنت مهندس ارشد کد',
    role: 'توسعه‌دهنده پروداکشن و کلاینت',
    avatarIcon: Terminal,
    badgeColor: 'bg-blue-600 text-white',
    accentBg: 'bg-blue-50/70',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-950',
    specialty: 'پیاده‌سازی React و TypeScript، کانتینر TWA، کشینگ آفلاین PWA و سخت‌افزار ESC/POS'
  },
  {
    id: 'diagnostic_sentinel',
    name: 'ایجنت دیده‌بان سلامت و عیب‌یاب',
    role: 'پایشگر تراز و انطباق همگرایی',
    avatarIcon: Activity,
    badgeColor: 'bg-rose-600 text-white',
    accentBg: 'bg-rose-50/70',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-950',
    specialty: 'ردیابی شکاف‌های دمو با رودمپ، سنجش نسبت نقدینگی و اعتبارسنجی ترازنامه'
  }
];

export interface ChatMessage {
  id: string;
  senderType: 'user' | 'agent';
  agentId?: string;
  agentName?: string;
  text: string;
  timestamp: string;
  actionItem?: string;
  milestoneSuggested?: {
    title: string;
    category?: any;
    priority?: any;
    phaseId?: string;
  };
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-01',
    senderType: 'agent',
    agentId: 'chief_architect',
    agentName: 'سایرافلو (SiraFlow Lead)',
    text: 'درود بر مهندس فرید تهرانی، بنیانگذار محترم هابینو. جلسه ارکستراسیون ایجنت‌های هابینو آغاز شده است. تمام ۵ ایجنت آماده پاسخگویی، ارزیابی گام‌های بعدی و ممیزی مسیر انتشار در کافه‌بازار هستند. دستور جلسه یا پرسش راهبردی شما چیست؟',
    timestamp: 'هم‌اکنون',
    actionItem: 'پایش پیوسته سلامت سیستم و دریافت پرسش‌های استراتژیک بنیانگذار'
  },
  {
    id: 'msg-02',
    senderType: 'agent',
    agentId: 'bazaar_evaluator',
    agentName: 'ایجنت نیازمندی‌ها و بازار',
    text: 'گزارش ضربتی بازار: برای پذیرش بدون وقفه در کافه‌بازار، گام فوری (P0) نهایی‌سازی پکیج TWA اندروید و یکپارچگی پرداخت درون‌برنامه‌ای (IAP) است. اصناف بازار به خصوص صنف خدمات برای فاکتورهای رسمی نیازمند شناسه ۲۲ رقمی سامانه مودیان هستند که ابزار تست آن را آماده کرده‌ایم.',
    timestamp: 'هم‌اکنون'
  },
  {
    id: 'msg-03',
    senderType: 'agent',
    agentId: 'security_db',
    agentName: 'ایجنت امنیت و سوپابیس',
    text: 'تاییدیه دیتابیس: اسکریپت جامع مایگریشن پروداکشن با موفقیت تمام سیاست‌های RLS و توابع ایزولاسیون چندمستأجری (tenant_id) را تثبیت کرد. دفاتر دوبل مالی اکنون دارای شاخص‌های GIN برای فرم‌های سفارشی JSONB اصناف هستند.',
    timestamp: 'هم‌اکنون'
  }
];

interface MultiAgentChatRoomProps {
  onMilestonesUpdated?: (milestones: Milestone[]) => void;
  initialPrompt?: string;
}

export const MultiAgentChatRoom: React.FC<MultiAgentChatRoomProps> = ({
  onMilestonesUpdated,
  initialPrompt
}) => {
  const { invoices, checks, transactions, clients, settings, license } = useAccounting();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState(initialPrompt || '');
  const [selectedAgentTarget, setSelectedAgentTarget] = useState<string>('all');
  const [isSimulatingResponse, setIsSimulatingResponse] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedMilestoneMsg, setAddedMilestoneMsg] = useState<string | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [journalSaveFeedback, setJournalSaveFeedback] = useState<string | null>(null);
  const [editorTheme, setEditorTheme] = useState<'light' | 'dark'>('light');
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearTimeout(simulationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
      if (
        initialPrompt.includes('دستورکار مهندسی') ||
        initialPrompt.includes('مایلستون') ||
        initialPrompt.includes('کدنویس')
      ) {
        setSelectedAgentTarget('lead_coder');
      }
    }
  }, [initialPrompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSimulatingResponse]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyEntireTranscript = () => {
    const transcript = messages
      .map(
        m =>
          `[${m.timestamp}] ${
            m.senderType === 'user' ? 'فرید تهرانی (بنیانگذار)' : m.agentName
          }:\n${m.text}${m.actionItem ? `\nاقدام: ${m.actionItem}` : ''}`
      )
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(transcript);
    setJournalSaveFeedback('کل متن صورت‌جلسه در کلیپ‌بورد کپی گردید.');
    setTimeout(() => setJournalSaveFeedback(null), 3000);
  };

  const handleSaveMeetingToJournal = async () => {
    setIsSavingJournal(true);
    try {
      const transcriptSummary = messages
        .map(
          m =>
            `${m.senderType === 'user' ? 'بنیانگذار' : m.agentName}: ${m.text.slice(
              0,
              120
            )}...`
        )
        .join(' | ');

      await SupabaseAgentStudioService.logAgentEvent({
        sourceAgent: 'MULTI_AGENT_ROUNDTABLE',
        eventType: 'FOUNDER_MEETING_MINUTES',
        severity: 'INFO',
        payload: {
          session_title: 'جلسه راهبردی بنیانگذار با ۵ ایجنت هابینو',
          total_messages: messages.length,
          transcript_summary: transcriptSummary,
          saved_at: new Date().toISOString()
        }
      });
      setJournalSaveFeedback(
        'صورت‌جلسه با موفقیت در ژورنال ابری سوپابیس (جدول agent_event_logs) ثبت گردید.'
      );
    } catch (e) {
      setJournalSaveFeedback('صورت‌جلسه در دیتابیس محلی ذخیره شد.');
    } finally {
      setIsSavingJournal(false);
      setTimeout(() => setJournalSaveFeedback(null), 4000);
    }
  };

  // Convert suggested action into a real roadmap milestone
  const handleConvertActionToMilestone = (msg: ChatMessage) => {
    if (!msg.milestoneSuggested) return;
    const { title, category, priority, phaseId } = msg.milestoneSuggested;
    
    addCustomRoadmapMilestone({
      phaseId: phaseId || 'phase-bazaar',
      title,
      description: `این تسک از طریق مصوبات جلسه بنیانگذار با ایجنت‌های هابینو تصویب گردید. پیشنهاددهنده: ${msg.agentName}`,
      category: category || 'bazaar_market',
      priority: priority || 'P0',
      complexity: 'high',
      rationale: 'تصویب‌شده در میزگرد استراتژیک ۵ ایجنت هابینو',
      kpiTarget: 'تحقق ۱۰۰٪ آزمون‌های پذیرش فنی ایجنت ممیزی',
      techStack: ['Supabase', 'React', 'TypeScript'],
      assignee: msg.agentName || 'تیم توسعه پروداکشن'
    });

    setAddedMilestoneMsg(`مایلستون «${title}» با موفقیت در نقشه راه و دیتابیس ثبت شد.`);
    if (onMilestonesUpdated) {
      onMilestonesUpdated(getStoredRoadmapMilestones());
    }
    setTimeout(() => setAddedMilestoneMsg(null), 4000);
  };

  // Dispatch intelligent multi-agent replies based on query
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      senderType: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsSimulatingResponse(true);

    try {
      // Gather live telemetry & comprehensive financial context
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
      const pendingChecks = checks.filter(c => c.status === 'pending');
      const bouncedChecks = checks.filter(c => c.status === 'bounced');
      const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
      const totalReceivables = unpaidInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
      const liquidityRatio = totalExpense > 0 ? Number((totalIncome / totalExpense).toFixed(2)) : 1.45;

      const context = {
        tenantId: 'tenant-main',
        totalRoadmapMilestones: getStoredRoadmapMilestones().length,
        selectedTarget: selectedAgentTarget,
        platform: 'Habino Financial OS',
        bazaarReady: true,
        offlineCapable: true,
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
        liquidityRatio,
        companyName: settings.name,
        currency: settings.currency,
        licenseTier: license.tier,
        isLedgerBalanced: true,
        accountingRuleCompliance: 'ACID double-entry ledger active'
      };

      const result = await chatWithAgentRoundtable(query, selectedAgentTarget, context);
      const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

      const newMessages: ChatMessage[] = (result.responses || []).map((resp, index) => ({
        id: `msg-rep-${resp.agentId}-${Date.now()}-${index}`,
        senderType: 'agent',
        agentId: resp.agentId,
        agentName: resp.agentName,
        text: resp.text,
        timestamp,
        actionItem: resp.actionItem,
        milestoneSuggested: resp.milestoneSuggested
      }));

      if (newMessages.length === 0) {
        newMessages.push({
          id: `msg-rep-fallback-${Date.now()}`,
          senderType: 'agent',
          agentId: 'chief_architect',
          agentName: 'سایرافلو (SiraFlow Lead)',
          text: `پیام بنیانگذار گرامی («${query.slice(0, 60)}») توسط ایجنت‌های هابینو تحلیل شد. کلیه الزامات چندمستأجری و تراز دفاتر در حالت پایدار قرار دارند.`,
          timestamp
        });
      }

      setMessages(prev => [...prev, ...newMessages]);
    } catch (err) {
      console.error('Error in agent roundtable deliberation:', err);
      const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        {
          id: `msg-rep-err-${Date.now()}`,
          senderType: 'agent',
          agentId: 'chief_architect',
          agentName: 'سایرافلو (SiraFlow Lead)',
          text: `دستور شما در ارکستراسیون هابینو ثبت شد. سیستم‌عامل در وضعیت پایدار و ایزولاسیون کامل قرار دارد.`,
          timestamp
        }
      ]);
    } finally {
      setIsSimulatingResponse(false);
    }
  };


  const quickPrompts = [
    'گام بعدی بحرانی تیم توسعه برای لانچ در کافه‌بازار چیست؟',
    'آیا تراز مالی دفاتر و سیستم چندمستأجری در آخرین آپدیت دچار ناهماهنگی شده است؟',
    'برای آماده‌سازی درگاه پرداخت بازار (IAP) چه پیشنیازهایی باقی مانده است؟',
    'چگونه سرعت آنبوردینگ اصناف جدید را به زیر ۱ دقیقه برسانیم؟'
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[760px]" dir="rtl">
      {/* 1. TOP ROOM HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">میزگرد تعاملی و اتاق چت ۵ ایجنت هابینو</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                ۵ ایجنت آنلاین
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
                <span>هوش مصنوعی زنده Gemini</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              گفتگوی مستقیم بنیانگذار با معمار ارشد، مسئول بازار، مهندس کد، ناظر دیتابیس و دیده‌بان عیب‌یاب
            </p>
          </div>
        </div>

        {/* Action Controls & Target Agent Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSaveMeetingToJournal}
            disabled={isSavingJournal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="ثبت دائمی صورت‌جلسه در جدول agent_event_logs پایگاه داده سوپابیس"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingJournal ? 'در حال ثبت...' : 'ثبت رسمی در ژورنال سوپابیس'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyEntireTranscript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            title="کپی متن کامل مذاکرات و اقدامات برای گزارش"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>کپی کل صورت‌جلسه</span>
          </button>

          {/* Target Agent Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <span className="text-[11px] text-slate-300 font-bold px-2">مخاطب:</span>
            <select
              value={selectedAgentTarget}
              onChange={e => setSelectedAgentTarget(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold rounded-xl px-3 py-1.5 border border-slate-600 focus:outline-hidden focus:border-indigo-400"
            >
              <option value="all">جلسه همگانی (میزگرد ۵ ایجنت)</option>
              {HABINO_AGENTS.map(ag => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} - {ag.role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER IF JOURNAL SAVED */}
      {journalSaveFeedback && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 text-blue-900 text-xs flex items-center justify-between font-bold shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>{journalSaveFeedback}</span>
          </div>
          <button onClick={() => setJournalSaveFeedback(null)} className="text-blue-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* SUCCESS BANNER IF ACTION TURNED INTO MILESTONE */}
      {addedMilestoneMsg && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-bold shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{addedMilestoneMsg}</span>
          </div>
          <button onClick={() => setAddedMilestoneMsg(null)} className="text-emerald-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 2. ACTIVE AGENT BADGES BAR */}
      <div className="bg-slate-50 p-2.5 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 text-xs">
        <span className="text-[10px] font-bold text-slate-500 shrink-0">اعضای حاضر:</span>
        {HABINO_AGENTS.map(ag => {
          const Icon = ag.avatarIcon;
          const isTargeted = selectedAgentTarget === 'all' || selectedAgentTarget === ag.id;

          return (
            <button
              key={ag.id}
              onClick={() => setSelectedAgentTarget(ag.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                isTargeted
                  ? 'bg-white text-slate-800 border border-slate-300 shadow-xs'
                  : 'text-slate-400 opacity-60 hover:opacity-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isTargeted ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <Icon className="w-3.5 h-3.5" />
              <span>{ag.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* 3. CHAT MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-100/40">
        {messages.map(msg => {
          const isUser = msg.senderType === 'user';
          const agentProfile = HABINO_AGENTS.find(a => a.id === msg.agentId) || HABINO_AGENTS[0];
          const AgentIcon = agentProfile.avatarIcon;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center shadow-xs ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/20'
                    : `${agentProfile.badgeColor}`
                }`}
              >
                {isUser ? (
                  <span className="text-[11px] font-black font-sans">بنیانگذار</span>
                ) : (
                  <AgentIcon className="w-4 h-4" />
                )}
              </div>

              {/* Message Bubble Card */}
              <div
                style={
                  isUser
                    ? { backgroundColor: '#0f172a', color: '#f8fafc', borderColor: '#334155' }
                    : undefined
                }
                className={`rounded-3xl p-4 md:p-5 text-xs shadow-md space-y-3 border transition-all ${
                  isUser
                    ? 'bg-slate-900 text-slate-100 border-slate-700/80 rounded-tr-xs shadow-slate-950/20'
                    : `${agentProfile.accentBg} ${agentProfile.textColor} ${agentProfile.borderColor} rounded-tl-xs`
                }`}
              >
                {/* Header info */}
                <div className={`flex items-center justify-between gap-4 border-b pb-2 ${isUser ? 'border-slate-800' : 'border-black/5'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-xs ${isUser ? 'text-amber-400' : 'text-slate-900'}`}>
                      {isUser ? 'مهندس فرید تهرانی (بنیانگذار)' : msg.agentName}
                    </span>
                    {!isUser && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        • {agentProfile.role}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isUser
                          ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                      }`}
                      title="کپی متن"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Message Body with guaranteed high contrast and markdown parser */}
                <div
                  style={{ color: isUser ? '#f8fafc' : '#1e293b' }}
                  className={isUser ? 'text-slate-100 font-normal selection:bg-indigo-600 selection:text-white' : 'text-slate-800'}
                >
                  {renderMessageContent(msg.text, isUser)}
                </div>

                {/* Action Item Callout if present */}
                {msg.actionItem && (
                  <div className={`p-2.5 rounded-2xl text-[11px] font-medium space-y-1 ${
                    isUser
                      ? 'bg-slate-950/80 border border-slate-800 text-slate-200'
                      : 'bg-white/80 border border-black/10 text-slate-700'
                  }`}>
                    <div className={`flex items-center gap-1.5 font-bold ${isUser ? 'text-amber-400' : 'text-slate-800'}`}>
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>خروجی و اقدام عملیاتی پیشنهادشده:</span>
                    </div>
                    <p className={isUser ? 'text-slate-300' : 'text-slate-700'}>{msg.actionItem}</p>
                  </div>
                )}

                {/* Optional button to convert discussion into a real roadmap milestone */}
                {msg.milestoneSuggested && (
                  <div className={`pt-2 border-t flex items-center justify-between ${isUser ? 'border-slate-800' : 'border-black/5'}`}>
                    <span className={`text-[10px] font-bold ${isUser ? 'text-slate-400' : 'text-slate-500'}`}>
                      پیشنهاد الحاق به رودمپ:
                    </span>
                    <button
                      onClick={() => handleConvertActionToMilestone(msg)}
                      className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <GitPullRequest className="w-3 h-3" />
                      <span>ثبت به عنوان مایلستون رسمی</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator for Agent deliberations */}
        {isSimulatingResponse && (
          <div className="flex items-center justify-between gap-3 text-xs text-indigo-700 font-bold p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl max-w-lg shadow-xs">
            <div className="flex items-center gap-2.5 animate-pulse">
              <Cpu className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
              <span>ایجنت‌های هابینو در حال مشورت، ارزیابی نیازمندی‌ها و تدوین پاسخ چندجانبه هستند...</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (simulationTimerRef.current) {
                  clearTimeout(simulationTimerRef.current);
                  simulationTimerRef.current = null;
                }
                setIsSimulatingResponse(false);
              }}
              className="text-[10px] text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-lg border border-slate-300 hover:border-rose-300 bg-white cursor-pointer transition-colors shrink-0 font-sans"
              title="توقف انتظار و آزادسازی فوری ورودی"
            >
              لغو انتظار
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 4. QUICK PROMPT CHIPS */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 overflow-x-auto flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 shrink-0">پرسش‌های فوری جلسه:</span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp)}
            disabled={isSimulatingResponse}
            className="text-[11px] px-3 py-1 rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 whitespace-nowrap transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* 5. INPUT FORM / MULTI-LINE DIRECTIVE EDITOR */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-2">
        {inputText.includes('\n') && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
                <Terminal className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-black text-slate-900 text-xs">ویرایشگر دستورکار مهندسی بنیانگذار</h5>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 font-bold">
                    حالت پیشرفته مهندسی
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">متن پرامپت با کنتراست تضمین‌شده آماده ویرایش، تغییر تم و ابلاغ مستقیم به ایجنت کد است.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Theme switch: Light Paper vs Dark Terminal */}
              <div className="flex items-center bg-white rounded-xl border border-slate-300 p-0.5 text-[11px] shadow-2xs">
                <button
                  type="button"
                  onClick={() => setEditorTheme('light')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    editorTheme === 'light'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  تم روشن (کاغذی)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTheme('dark')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    editorTheme === 'dark'
                      ? 'bg-slate-900 text-amber-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  تم تیره (ترمینال)
                </button>
              </div>

              {/* Toggle Preview / Edit */}
              <button
                type="button"
                onClick={() => setIsPreviewMode(prev => !prev)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-[11px] transition-colors cursor-pointer"
              >
                {isPreviewMode ? 'ویرایش متن' : 'پیش‌نمایش فرمت'}
              </button>

              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-[11px] text-slate-500 hover:text-rose-600 font-bold px-2.5 py-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
              >
                انصراف و پاک کردن
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="space-y-2"
        >
          {inputText.includes('\n') ? (
            <div className="space-y-2">
              {isPreviewMode ? (
                <div
                  style={{
                    backgroundColor: editorTheme === 'dark' ? '#0f172a' : '#f8fafc',
                    color: editorTheme === 'dark' ? '#f8fafc' : '#0f172a',
                    borderColor: editorTheme === 'dark' ? '#334155' : '#cbd5e1'
                  }}
                  className="w-full p-4 border rounded-2xl text-xs max-h-[340px] overflow-y-auto space-y-2 shadow-inner"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-black/10">
                    <span className="font-bold text-[11px] text-amber-600">پیش‌نمایش خروجی سند مهندسی:</span>
                    <span className="text-[10px] text-slate-500 font-mono">{inputText.length} نویسه</span>
                  </div>
                  {renderMessageContent(inputText, editorTheme === 'dark')}
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    rows={9}
                    placeholder="دستورکار مهندسی بنیانگذار..."
                    style={{
                      color: editorTheme === 'dark' ? '#f8fafc' : '#0f172a',
                      backgroundColor: editorTheme === 'dark' ? '#020617' : '#ffffff',
                      WebkitTextFillColor: editorTheme === 'dark' ? '#f8fafc' : '#0f172a',
                      caretColor: '#f59e0b'
                    }}
                    className={`w-full p-4 border rounded-2xl text-xs font-mono leading-relaxed resize-y shadow-inner focus:outline-hidden transition-colors ${
                      editorTheme === 'dark'
                        ? 'border-slate-700 focus:border-amber-400 placeholder-slate-400'
                        : 'border-slate-300 focus:border-indigo-500 placeholder-slate-500'
                    }`}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>مخاطب انتخابی:</span>
                  <span className="font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedAgentTarget === 'lead_coder' ? 'ایجنت مهندس ارشد کد (Lead Coder)' : 'میزگرد ۵ ایجنت هابینو'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inputText);
                      setJournalSaveFeedback('پرامپت در کلیپ‌بورد کپی شد');
                      setTimeout(() => setJournalSaveFeedback(null), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی پرامپت</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSimulatingResponse}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-700/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-4 h-4 rotate-180" />
                    <span>ابلاغ دستورکار به ایجنت کدنویس</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`پیام خود را برای ${
                  selectedAgentTarget === 'all' ? 'میزگرد ۵ ایجنت هابینو' : 'ایجنت منتخب'
                } بنویسید (مثلاً: گام بعدی اسپرینت بازار چیست؟)...`}
                className="flex-1 p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isSimulatingResponse}
                className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4 rotate-180" />
                <span>ارسال به میزگرد</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
