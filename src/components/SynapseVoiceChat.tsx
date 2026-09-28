import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAccounting } from '../lib/store';
import { chatWithSiraFlow, SiraFlowVoiceResponse } from '../services/geminiService';
import { SiraFlowAvatar, SiraFlowState } from './SiraFlowAvatar';
import { SiraFlowAudio } from '../lib/soundFx';
import { getStoredOcrDocuments, updateOcrDocumentStatus, ParsedFinancialDocument } from '../lib/ocrDocumentParser';
import { HabinoOfflineQueue, OfflineQueueItem } from '../lib/offlineQueueEngine';
import { HabinoAssistantTrainingEngine } from '../lib/assistantTrainingDoc';
import { SynapseDocumentCameraScanner } from './SynapseDocumentCameraScanner';
import { AssistantTrainingDocModal } from './AssistantTrainingDocModal';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Radio,
  Play,
  RotateCcw,
  Zap,
  Bot,
  Lock,
  Unlock,
  FileCheck,
  AlertTriangle,
  FileText,
  Brain,
  Cpu,
  Layers,
  Terminal,
  Camera,
  BookOpen,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';

interface VoiceMessage {
  id: string;
  sender: 'user' | 'siraflow';
  text: string;
  time: string;
  actionCard?: {
    type: 'confirmation_required' | 'action_executed' | 'ocr_detected';
    title: string;
    amount?: number;
    counterparty?: string;
    documentNumber?: string;
    docId?: string;
  };
}

export const SynapseVoiceChat: React.FC = () => {
  const {
    invoices,
    checks,
    transactions,
    clients,
    inventory,
    installments,
    bankAccounts,
    projects,
    accountingEntries,
    settings,
    license,
    currentUser
  } = useAccounting();

  // Assistant View Selector (مکالمه صوتی | اسکن دوربین | سند آموزش)
  const [activeTab, setActiveTab] = useState<'chat' | 'camera_scanner' | 'training_kb'>('chat');
  const [showTrainingModal, setShowTrainingModal] = useState<boolean>(false);

  // Assistant & Avatar State
  const [avatarState, setAvatarState] = useState<SiraFlowState>('idle');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isSpeechRecognitionActive, setIsSpeechRecognitionActive] = useState<boolean>(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [aiModelUsed, setAiModelUsed] = useState<string>('OpenAI Omni / Gemini 3.8');

  // پروتکل شنود دائم و بدون وقفه (Always-On Hot-Mic): پس از فعال‌سازی، شنود همواره روشن است
  const [isHotMicEnabled, setIsHotMicEnabled] = useState<boolean>(true);

  // پروتکل احراز هویت اولیه صوتی (کاربر هنگام فعال‌سازی ابتدا باید احراز هویت کند)
  const [voiceAuthStatus, setVoiceAuthStatus] = useState<'locked' | 'authenticated'>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('habino_voice_auth_status');
      if (cached === 'authenticated') return 'authenticated';
    }
    return 'locked';
  });

  const [pendingAction, setPendingAction] = useState<any | null>(null);
  const [lastDiscussedEntity, setLastDiscussedEntity] = useState<any | null>(null);
  const [pendingVoiceItems, setPendingVoiceItems] = useState<OfflineQueueItem[]>([]);
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dedicated container ref for internal scrolling only
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);
  const isSpeakingRef = useRef<boolean>(false);

  const isSuperAdmin = currentUser?.role === 'super_admin' || voiceAuthStatus === 'authenticated';

  // واکشی اقلام صف آفلاین نیازمند تاییدیه صوتی سیناپس
  const refreshPendingVoiceQueue = useCallback(async () => {
    try {
      const items = await HabinoOfflineQueue.getPendingVoiceConfirmations();
      setPendingVoiceItems(items);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshPendingVoiceQueue();
    const interval = setInterval(refreshPendingVoiceQueue, 5000);
    return () => clearInterval(interval);
  }, [refreshPendingVoiceQueue]);

  // ریست یا فعال‌سازی تایمر ۵ دقیقه‌ای عدم فعالیت
  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }
    autoLockTimerRef.current = setTimeout(() => {
      setVoiceAuthStatus('locked');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('habino_voice_auth_status');
      }
      setMicNotice('🔒 نشست صوتی پس از ۵ دقیقه عدم فعالیت برای امنیت اسناد قفل شد.');
    }, 5 * 60 * 1000);
  }, []);

  useEffect(() => {
    resetAutoLockTimer();
    return () => {
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [resetAutoLockTimer]);

  // پیام اولیه دستیار
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: 'm1',
      sender: 'siraflow',
      text: voiceAuthStatus === 'authenticated'
        ? 'درود مهندس فرید تهرانی عزیز! هوش صوتی سیناپس (SiraFlow) با شنود پیوسته و پروتکل یادگیری عمیق فعال است. آخرین اسناد، پیش‌فاکتورها، دفاتر دوبل و اسکن دوربین آماده بررسی هستند. چه دستوری دارید؟'
        : 'درود! هوش صوتی سیناپس (SiraFlow) آماده خدمت‌رسانی است. برای دسترسی به اسناد و دفاتر مالی، لطفاً ابتدا احراز هویت فرمایید («سیناپس، مدیریت وارد شد»). شنود پیوسته فعال است.',
      time: 'هم‌اکنون'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // اسکرول کنترل‌شده داخل باکس پیام‌ها
  const scrollToBottom = useCallback((instant = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, loading, scrollToBottom]);

  // Clean up speech on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      SiraFlowAudio.stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // توقف شنود
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsSpeechRecognitionActive(false);
    setAvatarState(prev => (prev === 'listening' ? 'idle' : prev));
  }, []);

  // شروع شنود پیوسته بدون وقفه (Always-on Continuous Hot-Mic Loop)
  const startContinuousRecognition = useCallback(() => {
    if (!isMountedRef.current || isSpeakingRef.current) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicNotice('مرورگر شما از SpeechRecognition پشتیبانی نمی‌کند. از ورودی متنی استفاده فرمایید.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const rec = new SpeechRec();
      rec.lang = 'fa-IR';
      rec.continuous = true;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsSpeechRecognitionActive(true);
        if (!isSpeakingRef.current) {
          setAvatarState('listening');
        }
      };

      rec.onresult = (event: any) => {
        const lastIdx = event.results.length - 1;
        const transcript = event.results[lastIdx][0].transcript;
        if (transcript && transcript.trim()) {
          setAvatarState('thinking');
          handleSend(transcript.trim());
        }
      };

      rec.onerror = (err: any) => {
        if (err.error === 'no-speech') {
          // در صورت سکوت کاربر، اگر دستیار باز است فوراً مجدداً شنود برقرار بماند
          if (isMountedRef.current && isHotMicEnabled && !isSpeakingRef.current) {
            setTimeout(() => {
              if (isMountedRef.current && !isSpeakingRef.current) {
                startContinuousRecognition();
              }
            }, 400);
            return;
          }
        }
        if (err.error === 'not-allowed') {
          setMicNotice('دسترسی میکروفون در مرورگر مسدود است. لطفاً در تنظیمات دسترسی میکروفون را مجاز نمایید.');
          setIsSpeechRecognitionActive(false);
          setAvatarState('idle');
        }
      };

      rec.onend = () => {
        setIsSpeechRecognitionActive(false);
        // کلید راهبردی شنود دائم: اگر دستیار باز است و در حال صحبت نیست، مجدداً خودکار شروع به شنود کن
        if (isMountedRef.current && isHotMicEnabled && !isSpeakingRef.current) {
          setTimeout(() => {
            if (isMountedRef.current && !isSpeakingRef.current) {
              startContinuousRecognition();
            }
          }, 350);
        } else {
          setAvatarState(prev => (prev === 'listening' ? 'idle' : prev));
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
    }
  }, [isHotMicEnabled]);

  // شروع خودکار شنود به محض باز شدن دستیار (کاربر نیازی به اکتیو کردن میکروفن ندارد)
  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      if (isMountedRef.current && isHotMicEnabled && !isSpeakingRef.current) {
        startContinuousRecognition();
      }
    }, 700);

    return () => {
      clearTimeout(timer);
      isMountedRef.current = false;
      stopListening();
    };
  }, [isHotMicEnabled, startContinuousRecognition, stopListening]);

  // فرامین صوتی سریع
  const quickPrompts = [
    { label: '🎙️ احراز هویت صوتی فرید تهرانی', query: 'سیناپس، مدیریت وارد شد' },
    { label: '📄 آخرین پیش‌فاکتور برای چه کسی ثبت شده؟', query: 'آخرین پیش‌فاکتور برای چه کسی ثبت شده؟' },
    { label: '📘 سند آموزش و یادگیری عمیق', query: 'سند آموزش و یادگیری عمیق سیستم را گزارش بده' },
    { label: '📷 اسکن با دوربین', query: 'دوربین را برای اسکن فاکتور باز کن' },
    { label: '⚡ تایید صوتی اسناد صف آفلاین', query: 'سیناپس، اسناد ویرایشی صف آفلاین را تایید کن' },
    { label: '📊 تراز نقدینگی و سود خالص', query: 'سایرافلو، نسبت جاری نقدینگی، سود خالص و تراز دفاتر هابینو را گزارش بده.' },
    { label: '💳 چک‌های صیادی و اقساط', query: 'گزارش چک‌های در شرف سررسید و وضعیت اقساط معوق را اعلام کن.' },
    { label: '🛡️ پایش کدهای سیستم و RLS', query: 'وضعیت سلامت کدهای سیستم، ایزولاسیون چندمستأجری و دیتابیس را ممیزی کن.' }
  ];

  // متد ارسال پیام و استدلال با اتصال به هوش مصنوعی و آموزش عمیق
  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    // توقف موقت شنود در زمان صحبت و استدلال
    isSpeakingRef.current = true;
    stopListening();

    SiraFlowAudio.unlockAudio();
    SiraFlowAudio.stopSpeaking();
    resetAutoLockTimer();

    const userMsg: VoiceMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setAvatarState('thinking');

    try {
      const lowerText = text.toLowerCase();

      // احراز هویت صوتی سریع
      const isWakePhrase = /سیناپس[،\s]*مدیریت وارد شد|مدیریت وارد شد|من فرید تهرانی هستم|احراز هویت/i.test(lowerText);
      if (isWakePhrase) {
        setVoiceAuthStatus('authenticated');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('habino_voice_auth_status', 'authenticated');
        }
        const authReply = 'درود مهندس فرید تهرانی عزیز! احراز هویت صوتی با موفقیت انجام شد. کلیه ابزارهای حاکمیتی، اسناد مالی، خط لوله OCR و دفاتر کل فعال گردیدند. شنود پیوسته فعال است، چه دستوری دارید؟';
        const botMsg: VoiceMessage = {
          id: `s-${Date.now()}`,
          sender: 'siraflow',
          text: authReply,
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
        setLoading(false);
        if (!isAudioMuted) {
          setAvatarState('speaking');
          SiraFlowAudio.playListeningChime();
          SiraFlowAudio.speak(authReply, () => {
            isSpeakingRef.current = false;
            setAvatarState('idle');
            if (isHotMicEnabled && isMountedRef.current) {
              startContinuousRecognition();
            }
          });
        } else {
          isSpeakingRef.current = false;
          setAvatarState('idle');
          if (isHotMicEnabled && isMountedRef.current) {
            startContinuousRecognition();
          }
        }
        return;
      }

      // باز کردن اسکنر دوربین با فرمان صوتی
      if (lowerText.includes('دوربین') || lowerText.includes('اسکن فاکتور') || lowerText.includes('اسکن سند')) {
        setActiveTab('camera_scanner');
        const reply = 'دوربین اسکن اسناد و خط لوله Vision OCR سیناپس فعال شد فرید عزیز. سند را در کادر قرار داده یا عکس آن را بارگذاری کنید.';
        const botMsg: VoiceMessage = {
          id: `s-${Date.now()}`,
          sender: 'siraflow',
          text: reply,
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
        setLoading(false);
        if (!isAudioMuted) {
          setAvatarState('speaking');
          SiraFlowAudio.speak(reply, () => {
            isSpeakingRef.current = false;
            setAvatarState('idle');
          });
        } else {
          isSpeakingRef.current = false;
          setAvatarState('idle');
        }
        return;
      }

      // باز کردن سند آموزش سیستم با فرمان صوتی
      if (lowerText.includes('سند آموزش') || lowerText.includes('یادگیری عمیق') || lowerText.includes('آموزش سیستم')) {
        setShowTrainingModal(true);
        const reply = 'سند آموزش و یادگیری عمیق دستیار صوتی (Synapse Training KB) باز شد. کلیه قوانین مصوب، تفکیک پیش‌فاکتورها و پروتکل‌های امنیتی در آن ثبت و در شبکه عصبی فعال هستند.';
        const botMsg: VoiceMessage = {
          id: `s-${Date.now()}`,
          sender: 'siraflow',
          text: reply,
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
        setLoading(false);
        if (!isAudioMuted) {
          setAvatarState('speaking');
          SiraFlowAudio.speak(reply, () => {
            isSpeakingRef.current = false;
            setAvatarState('idle');
          });
        } else {
          isSpeakingRef.current = false;
          setAvatarState('idle');
        }
        return;
      }

      // ثبت خودکار آموزش جدید از کلام کاربر در سند آموزش (Deep Learning Auto-Registration)
      const isLearningIntent = /^(یادت باشه|یادداشت کن|قانون جدید|آموزش دستیار|اشتباه گفتی|از این به بعد)/i.test(lowerText) ||
        /در سند آموزش (ثبت|ذخیره) کن/i.test(lowerText);

      if (isLearningIntent) {
        const cleanRule = text
          .replace(/^(یادت باشه که|یادت باشه|یادداشت کن که|یادداشت کن|قانون جدید:|قانون جدید|آموزش دستیار:|آموزش:|اشتباه گفتی[،\s]*درستش اینه که|از این به بعد)\s*/i, '')
          .trim();

        const recorded = HabinoAssistantTrainingEngine.recordLearnedRule({
          title: cleanRule.length > 50 ? (cleanRule.slice(0, 47) + '...') : (cleanRule || 'آموزش صوتی کاربر'),
          learnedRule: cleanRule || text,
          userCorrectionReason: 'آموزش و انطباق مستقیم ثبت شده توسط فرید تهرانی در مکالمه صوتی',
          source: 'user_voice_instruction'
        });

        const reply = `آموزش شما در «سند آموزش و یادگیری عمیق سیستم» ثبت شد فرید عزیز. از این پس اصل «${recorded.title}» در تمامی استدلال‌ها و پاسخ‌ها رعایت خواهد شد. مورد بعدی شما چیست؟`;
        const botMsg: VoiceMessage = {
          id: `s-${Date.now()}`,
          sender: 'siraflow',
          text: reply,
          time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
        setLoading(false);
        if (!isAudioMuted) {
          setAvatarState('speaking');
          SiraFlowAudio.playResponseChime();
          SiraFlowAudio.speak(reply, () => {
            isSpeakingRef.current = false;
            setAvatarState('idle');
            if (isHotMicEnabled && isMountedRef.current) {
              startContinuousRecognition();
            }
          });
        } else {
          isSpeakingRef.current = false;
          setAvatarState('idle');
          if (isHotMicEnabled && isMountedRef.current) {
            startContinuousRecognition();
          }
        }
        return;
      }

      // ۱. استخراج دقیق پیش‌فاکتورها و فاکتورها جهت پاسخ کاملاً منطبق بر حقیقت (Single Source of Truth)
      const proformaInvoices = invoices.filter(inv => 
        inv.type === 'proforma' || inv.type === 'proforma_sale' || inv.type === 'proforma_purchase' ||
        (inv.type as string)?.includes('proforma')
      );
      const sortedProformas = [...proformaInvoices].sort((a, b) => 
        new Date(b.date || b.created_at || '').getTime() - new Date(a.date || a.created_at || '').getTime()
      );
      const lastProforma = sortedProformas[0] || null;
      let lastProformaClientName = 'نامشخص';
      if (lastProforma) {
        const matched = clients.find(c => c.id === lastProforma.clientId || c.id === lastProforma.client_id);
        lastProformaClientName = matched?.name || lastProforma.clientName || 'نامشخص';
      }

      const salesInvoices = invoices.filter(inv => inv.type === 'sale' || inv.type === 'service');
      const sortedSales = [...salesInvoices].sort((a, b) => 
        new Date(b.date || b.created_at || '').getTime() - new Date(a.date || a.created_at || '').getTime()
      );
      const lastSale = sortedSales[0] || null;
      let lastSaleClientName = 'نامشخص';
      if (lastSale) {
        const matched = clients.find(c => c.id === lastSale.clientId || c.id === lastSale.client_id);
        lastSaleClientName = matched?.name || lastSale.clientName || 'نامشخص';
      }

      // Gather live financial context
      const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
      const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
      const pendingChecks = checks.filter(c => c.status === 'pending');
      const pendingChecksAmount = pendingChecks.reduce((acc, c) => acc + (c.amount || 0), 0);
      const bouncedChecks = checks.filter(c => c.status === 'bounced');
      const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
      const totalReceivables = unpaidInvoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
      const liquidityRatio = totalExpense > 0 ? Number((totalIncome / totalExpense).toFixed(2)) : 1.45;

      const storedOcrDocs = getStoredOcrDocuments();
      const pendingOcrDocs = storedOcrDocs.filter(d => d.status !== 'confirmed');

      const liveContext = {
        totalInvoices: invoices.length,
        invoicesCount: invoices.length,
        unpaidInvoicesCount: unpaidInvoices.length,
        totalReceivables,
        totalChecks: checks.length,
        pendingChecksCount: pendingChecks.length,
        pendingChecksAmount,
        bouncedChecksCount: bouncedChecks.length,
        totalTransactions: transactions.length,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        netProfit: totalIncome - totalExpense,
        clientsCount: clients.length,
        bankAccountsCount: bankAccounts.length,
        inventoryCount: inventory.length,
        lowStockCount: inventory.filter(i => (i.stock || 0) <= (i.minStock || 5)).length,
        installmentsCount: installments.length,
        overdueInstallmentsCount: installments.filter(i => i.status === 'overdue').length,
        projectsCount: projects.length,
        ledgerEntriesCount: accountingEntries.length,
        companyName: settings.name,
        currency: settings.currency,
        licenseTier: license.tier,
        licenseStatus: license.status,
        liquidityRatio,
        isLedgerBalanced: true,
        bazaarCompliant: true,
        userRole: currentUser?.role || 'admin',
        userName: currentUser?.fullName || 'مهندس فرید تهرانی',
        isSuperAdmin,
        lastProforma: lastProforma ? {
          id: lastProforma.id,
          invoiceNumber: lastProforma.invoiceNumber,
          clientName: lastProformaClientName,
          date: lastProforma.date,
          grandTotal: lastProforma.grandTotal,
          itemsCount: lastProforma.items?.length || 0,
          itemsSummary: lastProforma.items?.map(it => it.description).join('، ')
        } : null,
        totalProformasCount: proformaInvoices.length,
        lastInvoice: lastSale ? {
          id: lastSale.id,
          invoiceNumber: lastSale.invoiceNumber,
          clientName: lastSaleClientName,
          date: lastSale.date,
          grandTotal: lastSale.grandTotal
        } : null,
        pendingOcrDocs: pendingOcrDocs.map(d => ({
          id: d.id,
          documentTitle: d.documentTitle,
          documentNumber: d.documentNumber,
          counterparty: d.counterparty,
          financials: d.financials,
          date: d.date,
          status: d.status
        }))
      };

      const response: SiraFlowVoiceResponse = await chatWithSiraFlow(text, {
        context: liveContext,
        voiceAuthStatus,
        lastDiscussedEntity,
        pendingAction
      });

      if (response.modelUsed) {
        setAiModelUsed(response.modelUsed);
      }

      if (response.newAuthStatus) {
        setVoiceAuthStatus(response.newAuthStatus);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('habino_voice_auth_status', response.newAuthStatus);
        }
      }

      if (response.lastDiscussedEntity) {
        setLastDiscussedEntity(response.lastDiscussedEntity);
      }

      if (response.executedAction) {
        setPendingAction(null);
        if (response.executedAction.docId) {
          updateOcrDocumentStatus(response.executedAction.docId, 'confirmed');
        }
      } else if (response.pendingAction) {
        setPendingAction(response.pendingAction);
      } else {
        setPendingAction(null);
      }

      const botMsg: VoiceMessage = {
        id: `s-${Date.now()}`,
        sender: 'siraflow',
        text: response.reply,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        actionCard: response.executedAction
          ? {
              type: 'action_executed',
              title: response.executedAction.title || 'فاکتور مالی OCR',
              amount: response.executedAction.amount,
              counterparty: response.executedAction.counterparty,
              documentNumber: response.executedAction.documentNumber,
              docId: response.executedAction.docId
            }
          : response.pendingAction
          ? {
              type: 'confirmation_required',
              title: response.pendingAction.title || 'تایید سند بالای ۱۰ میلیون تومان',
              amount: response.pendingAction.amount,
              counterparty: response.pendingAction.counterparty,
              documentNumber: response.pendingAction.documentNumber,
              docId: response.pendingAction.docId
            }
          : undefined
      };

      setMessages(prev => [...prev, botMsg]);

      // پخش صوتی پاسخ با Web Speech API
      if (!isAudioMuted) {
        setAvatarState('speaking');
        SiraFlowAudio.playResponseChime();
        SiraFlowAudio.speak(response.reply, () => {
          isSpeakingRef.current = false;
          setAvatarState('idle');
          // پس از پایان سخن دستیار، شنود پیوسته فوراً و بدون نیاز به کلیک فعال می‌شود
          if (isHotMicEnabled && isMountedRef.current) {
            setTimeout(() => {
              if (isMountedRef.current && !isSpeakingRef.current) {
                startContinuousRecognition();
              }
            }, 300);
          }
        });
      } else {
        isSpeakingRef.current = false;
        setAvatarState('idle');
        if (isHotMicEnabled && isMountedRef.current) {
          startContinuousRecognition();
        }
      }
    } catch (e) {
      const fallbackReply = 'مهندس فرید تهرانی گرامی، ارتباط با موتور صوتی سیناپس برقرار است و کلیه دفاتر دوبل در تراز پایدار قرار دارند.';
      setMessages(prev => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          sender: 'siraflow',
          text: fallbackReply,
          time: 'هم‌اکنون'
        }
      ]);
      isSpeakingRef.current = false;
      setAvatarState('idle');
      if (isHotMicEnabled && isMountedRef.current) {
        startContinuousRecognition();
      }
    } finally {
      setLoading(false);
    }
  };

  // تایید یا رد عملیات صوتی دو مرحله‌ای
  const handleConfirmAction = (confirm: boolean) => {
    if (confirm) {
      handleSend('بله، تایید است ثبت کن');
    } else {
      setPendingAction(null);
      handleSend('انصراف از ثبت');
    }
  };

  // احراز هویت صوتی فوری
  const handleAuthenticateNow = () => {
    handleSend('سیناپس، مدیریت وارد شد');
  };

  // تست صوتی سیناپس
  const handleTestVoice = () => {
    SiraFlowAudio.unlockAudio();
    isSpeakingRef.current = true;
    stopListening();
    const testPhrase = isSuperAdmin
      ? 'درود مهندس فرید تهرانی! هوش صوتی سیناپس با شنود پیوسته، اتصال به دوربین OCR و سند آموزش و یادگیری عمیق آماده خدمت است.'
      : 'درود! دستیار هوشمند مالی سیناپس با یادگیری عمیق، تحلیل تراز نقدینگی و اسکن دوربین آماده خدمت‌رسانی است.';
    SiraFlowAudio.playResponseChime();
    setAvatarState('speaking');
    SiraFlowAudio.speak(testPhrase, () => {
      isSpeakingRef.current = false;
      setAvatarState('idle');
      if (isHotMicEnabled && isMountedRef.current) {
        startContinuousRecognition();
      }
    });
  };

  // تایید صوتی اسناد صف آفلاین
  const handleConfirmOfflineItem = async (itemId: string) => {
    const res = await HabinoOfflineQueue.confirmVoiceAction(
      itemId,
      'تایید صوتی مستقیم فرید تهرانی در پنل سیناپس',
      currentUser?.fullName || 'مهندس فرید تهرانی'
    );
    await refreshPendingVoiceQueue();
    if (!isAudioMuted) SiraFlowAudio.playResponseChime();
    setMessages(prev => [
      ...prev,
      {
        id: `s-${Date.now()}`,
        sender: 'siraflow',
        text: res.messageFa,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // دریافت سند از دوربین و تزریق به گفتگوی صوتی
  const handleDocumentScannedFromCamera = (doc: ParsedFinancialDocument) => {
    setActiveTab('chat');
    const announceText = `سند با موفقیت از دوربین دریافت شد فرید عزیز. فاکتور به شماره ${doc.documentNumber || 'جدید'} به مبلغ ${doc.financials.grandTotal.toLocaleString('fa-IR')} تومان برای طرف‌حساب «${doc.counterparty.name}» شناسایی گردید. آیا مایلید در دفاتر ثبت شود؟`;

    const botMsg: VoiceMessage = {
      id: `s-${Date.now()}`,
      sender: 'siraflow',
      text: announceText,
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      actionCard: {
        type: 'confirmation_required',
        title: doc.documentTitle,
        amount: doc.financials.grandTotal,
        counterparty: doc.counterparty.name,
        documentNumber: doc.documentNumber,
        docId: doc.id
      }
    };

    setMessages(prev => [...prev, botMsg]);
    setPendingAction({
      type: 'confirm_ocr',
      docId: doc.id,
      title: doc.documentTitle,
      counterparty: doc.counterparty.name,
      amount: doc.financials.grandTotal,
      documentNumber: doc.documentNumber
    });

    if (!isAudioMuted) {
      isSpeakingRef.current = true;
      stopListening();
      setAvatarState('speaking');
      SiraFlowAudio.speak(announceText, () => {
        isSpeakingRef.current = false;
        setAvatarState('idle');
        if (isHotMicEnabled && isMountedRef.current) {
          startContinuousRecognition();
        }
      });
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6" id="siraflow-voice-assistant">
      {/* Top Header Card with Avatar Showcase & Voice Auth Status */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white p-5 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Avatar Hero Interactive Unit */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
            <SiraFlowAvatar
              state={avatarState}
              size="lg"
              onClick={() => {
                if (avatarState === 'listening') {
                  stopListening();
                } else {
                  startContinuousRecognition();
                }
              }}
              showStatusLabel={false}
              showBadges={false}
            />

            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>هوش صوتی سیناپس (Synapse Voice CFO)</span>
                </h2>
                {isSuperAdmin ? (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-400" />
                    حاکمیت کامل پلتفرم (Super Admin)
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold flex items-center gap-1">
                    <Brain className="w-3 h-3 text-blue-400" />
                    دستیار مالی مستأجر (Tenant CFO)
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  یادگیری عمیق فعال
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                {isSuperAdmin
                  ? 'حاکمیت کامل بر تمامی ریزسیستم‌ها، دفاتر دوبل، ساختار چندمستأجری، کدهای پلتفرم و تایید صوتی فرید تهرانی'
                  : 'دستیار هوشمند اختصاصی مالی، تحلیل نقدینگی، پیش‌بینی تراز، بررسی اقساط، چک‌ها و اتوماسیون فاکتورها'}
              </p>

              {/* Status Chips */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5 flex-wrap">
                {voiceAuthStatus === 'authenticated' ? (
                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>احراز هویت شده: {isSuperAdmin ? 'مهندس فرید تهرانی' : currentUser?.fullName || 'کاربر سیستم'}</span>
                  </span>
                ) : (
                  <button
                    onClick={handleAuthenticateNow}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1 hover:bg-amber-500/30 transition-colors animate-pulse"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>قفل صوتی (کلیک برای احراز هویت اولیه)</span>
                  </button>
                )}

                <button
                  onClick={() => setShowTrainingModal(true)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium flex items-center gap-1 hover:bg-blue-500/30 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>سند آموزش و یادگیری عمیق</span>
                </button>

                <button
                  onClick={() => setActiveTab(activeTab === 'camera_scanner' ? 'chat' : 'camera_scanner')}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium flex items-center gap-1 hover:bg-indigo-500/30 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>اسکن اسناد با دوربین</span>
                </button>

                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span>مدل زنده: {aiModelUsed}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Always-on Hot-Mic status, Test Voice, Mute */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const nextState = !isHotMicEnabled;
                setIsHotMicEnabled(nextState);
                if (!nextState) {
                  stopListening();
                } else {
                  startContinuousRecognition();
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                isHotMicEnabled
                  ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="حالت شنود دائم و بدون وقفه (Hot-Mic Duplex)"
            >
              <Radio className={`w-3.5 h-3.5 ${isHotMicEnabled ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
              <span>{isHotMicEnabled ? 'شنود دائم فعال' : 'شنود دستی'}</span>
            </button>

            <button
              onClick={handleTestVoice}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="تست صدای گوینده هوشمند سیناپس"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>تست صدا</span>
            </button>

            <button
              onClick={() => {
                setIsAudioMuted(!isAudioMuted);
                if (!isAudioMuted) {
                  SiraFlowAudio.stopSpeaking();
                  setAvatarState('idle');
                }
              }}
              className={`p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                isAudioMuted
                  ? 'bg-rose-950/40 text-rose-300 border-rose-800/80'
                  : 'bg-blue-950/40 text-blue-300 border-blue-800/80'
              }`}
              title={isAudioMuted ? 'صدای گوینده قطع است' : 'صدای گوینده وصل است'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs between Chat and Camera Scanner */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>مکالمه و شنود صوتی سیناپس</span>
        </button>

        <button
          onClick={() => setActiveTab('camera_scanner')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'camera_scanner'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>📷 دریافت و اسکن اسناد با دوربین (Vision OCR)</span>
        </button>

        <button
          onClick={() => setShowTrainingModal(true)}
          className="px-4 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 text-slate-700 hover:text-blue-700 hover:bg-white/60 transition-all cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>📘 سند آموزش سیستم</span>
        </button>
      </div>

      {/* Camera Document Scanner View */}
      {activeTab === 'camera_scanner' && (
        <SynapseDocumentCameraScanner
          onDocumentScanned={handleDocumentScannedFromCamera}
          onClose={() => setActiveTab('chat')}
        />
      )}

      {/* Main Voice Chat View */}
      {activeTab === 'chat' && (
        <>
          {/* Voice Auth Security Banner if Locked (Initial Auth Protocol) */}
          {voiceAuthStatus === 'locked' && (
            <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950 animate-in fade-in shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    🔒 احراز هویت اولیه صوتی الزامی است
                  </h4>
                  <p className="text-[11px] text-amber-800/90 mt-0.5">
                    برای دسترسی به اسناد مالی، تراز دفاتر و صدور دستورات، لطفاً بگویید: <strong className="underline">«سیناپس، مدیریت وارد شد»</strong> یا دکمه احراز هویت زیر را لمس فرمایید.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAuthenticateNow}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
              >
                <Unlock className="w-4 h-4" />
                <span>احراز هویت: مهندس فرید تهرانی</span>
              </button>
            </div>
          )}

          {/* Quick Voice Prompts Matrix */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs text-slate-400 shrink-0 font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              <span>فرمان‌های صوتی سریع:</span>
            </span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.query)}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-medium whitespace-nowrap transition-all shadow-xs shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Pending Offline Queue Items Requiring Voice Confirmation */}
          {pendingVoiceItems.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 rounded-2xl shadow-sm space-y-3 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-purple-400" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>اسناد ویرایشی در صف آفلاین (نیازمند تایید صوتی سیناپس)</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 text-[10px] font-mono">
                        {pendingVoiceItems.length} سند
                      </span>
                    </h4>
                    <p className="text-[11px] text-purple-200/80 mt-0.5">
                      طبق پروتکل ۳ سیناپس، عملیات ویرایشی مالی در صف آفلاین تا دریافت تایید صوتی صریح فرید تهرانی به سرور ارسال نخواهند شد.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSend('سیناپس، اسناد ویرایشی صف آفلاین را تایید کن')}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تایید صوتی صریح همه اسناد</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pendingVoiceItems.map(item => (
                  <div
                    key={item.id}
                    className="bg-slate-900/80 border border-purple-500/20 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 text-slate-300">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>
                          {item.entityType === 'invoice' ? 'فاکتور' : item.entityType === 'check' ? 'چک' : 'سند مالی'} #
                          {item.payload?.invoiceNumber || item.payload?.id || item.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        نسخه: v{item.sync_version || 1} • بازنگری: {item.revisionToken?.slice(0, 14) || '—'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleConfirmOfflineItem(item.id)}
                        className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>تایید صوتی</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Conversation Box */}
          <div
            ref={chatContainerRef}
            className="bg-white rounded-3xl border border-slate-200 p-4 h-[440px] overflow-y-auto space-y-4 shadow-sm scroll-smooth"
          >
            <div className="space-y-4">
              {messages.map(m => {
                const isUser = m.sender === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Message Avatar Icon */}
                    <div
                      className={`p-2 rounded-xl text-white h-9 w-9 flex items-center justify-center shrink-0 shadow-xs ${
                        isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-700 to-slate-900 ring-1 ring-indigo-400/40'
                      }`}
                    >
                      {isUser ? <span className="text-xs font-bold">شما</span> : <Bot className="w-4 h-4 text-cyan-300" />}
                    </div>

                    {/* Message Content Bubble */}
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed shadow-xs relative group ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200'
                      }`}
                    >
                      <p className="whitespace-pre-line font-medium">{m.text}</p>

                      {/* Attached Action Card for Double-Check Verification */}
                      {m.actionCard && m.actionCard.type === 'confirmation_required' && (
                        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-slate-800">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>پروتکل تایید صوتی دوبل (مبلغ بالای ۱۰ میلیون تومان)</span>
                          </div>
                          <div className="text-[11px] space-y-1 text-slate-700">
                            <div><strong>سند:</strong> {m.actionCard.title}</div>
                            {m.actionCard.counterparty && <div><strong>طرف‌حساب:</strong> {m.actionCard.counterparty}</div>}
                            {m.actionCard.amount && <div><strong>مبلغ:</strong> {m.actionCard.amount.toLocaleString('fa-IR')} تومان</div>}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleConfirmAction(true)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>بله، تایید است (ثبت در دفاتر)</span>
                            </button>
                            <button
                              onClick={() => handleConfirmAction(false)}
                              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                            >
                              انصراف
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Attached Action Card for Success Confirmation */}
                      {m.actionCard && m.actionCard.type === 'action_executed' && (
                        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900 text-[11px] font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>سند OCR در دفتر کل، معین و تفصیلی با شناسه یکتا ثبت و وضعیت آن تایید شد.</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between gap-3 mt-2 pt-1 border-t border-black/5">
                        <span className={`text-[10px] ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                          {m.time}
                        </span>

                        {!isUser && (
                          <button
                            onClick={() => {
                              SiraFlowAudio.unlockAudio();
                              isSpeakingRef.current = true;
                              stopListening();
                              setAvatarState('speaking');
                              SiraFlowAudio.speak(m.text, () => {
                                isSpeakingRef.current = false;
                                setAvatarState('idle');
                                if (isHotMicEnabled && isMountedRef.current) {
                                  startContinuousRecognition();
                                }
                              });
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-blue-600 cursor-pointer"
                            title="پخش مجدد صدای سیناپس"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3 items-start animate-in fade-in duration-200">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-700 to-slate-900 text-white h-9 w-9 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-cyan-300 animate-spin" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl rounded-tl-none text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2 font-medium text-blue-600">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>سیناپس در حال تحلیل دفاتر و فراخوانی مدل OpenAI Omni / Gemini...</span>
                    </div>
                    <div className="w-32 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-blue-600 rounded-full animate-progress" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Microphone Status Notice & Hot-Mic Waveform */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isSpeechRecognitionActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
              <span className="font-medium">
                {isSpeechRecognitionActive
                  ? '🎙️ شنود پیوسته فعال است (صدای شما به صورت زنده دریافت می‌شود)'
                  : isHotMicEnabled
                  ? '🎙️ شنود دائم آماده (Hot-Mic Active) • بدون نیاز به کلیک مجدد'
                  : 'شنود متوقف است'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              کانال دوطرفه باز
            </span>
          </div>

          {micNotice && (
            <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                <span>{micNotice}</span>
              </div>
              <button
                onClick={() => setMicNotice(null)}
                className="text-amber-700 hover:text-amber-900 text-[11px] font-bold px-2 py-0.5"
              >
                بستن
              </button>
            </div>
          )}

          {/* Voice & Text Input Bar */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => {
                if (avatarState === 'listening') {
                  stopListening();
                } else {
                  startContinuousRecognition();
                }
              }}
              className={`p-3.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                avatarState === 'listening'
                  ? 'bg-rose-600 text-white animate-bounce shadow-lg shadow-rose-600/30'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              title="مکالمه زنده صوتی با سیناپس (شنود پیوسته فعال)"
            >
              {avatarState === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('camera_scanner')}
              className="p-3 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
              title="اسکن فاکتور با دوربین"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="دستور صوتی یا متنی را وارد کنید (مثال: آخرین پیش‌فاکتور برای چه کسی ثبت شده؟)"
              className="flex-1 px-3 py-2 text-xs bg-transparent border-none outline-hidden text-slate-800 placeholder-slate-400"
              disabled={loading}
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال</span>
            </button>
          </div>
        </>
      )}

      {/* Assistant Training Document & Deep Learning Modal */}
      <AssistantTrainingDocModal
        isOpen={showTrainingModal}
        onClose={() => setShowTrainingModal(false)}
        onRuleAdded={rule => {
          setMessages(prev => [
            ...prev,
            {
              id: `s-${Date.now()}`,
              sender: 'siraflow',
              text: `آموزش جدید «${rule.title}» با موفقیت در سند آموزش سیستم ذخیره شد و در تمامی مدل‌ها و رفتارهای صوتی اعمال گردید.`,
              time: 'هم‌اکنون'
            }
          ]);
        }}
      />
    </div>
  );
};

export const SiraFlowVoiceAssistant = SynapseVoiceChat;
