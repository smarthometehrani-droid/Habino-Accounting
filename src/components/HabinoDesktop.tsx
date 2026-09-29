import React, { useState, useRef, useEffect } from 'react';
import { useAccounting } from '../lib/store';
import { formatCurrency } from '../lib/currencyUtils';
import { Invoices } from './Invoices';
import { Checks } from './Checks';
import { Installments } from './Installments';
import { Transactions } from './Transactions';
import { Clients } from './Clients';
import { Inventory } from './Inventory';
import { Banks } from './Banks';
import { Projects } from './Projects';
import { Ledger } from './Ledger';
import { Settings } from './Settings';
import { DiagnosticModule } from './DiagnosticModule';
import { SynapseVoiceChat } from './SynapseVoiceChat';
import { SiraFlowAvatar } from './SiraFlowAvatar';
import { AppHub } from './AppHub';
import { RoadmapStudio } from './RoadmapStudio';
import { LiveAgentDiagnosticStudio } from './LiveAgentDiagnosticStudio';
import { UserManagementView } from './UserManagementView';
import { LoginModal } from './LoginModal';
import { UpgradeModal } from './UpgradeModal';
import { ROLE_DETAILS_FA } from '../lib/authEngine';
import { Dashboard } from './Dashboard';
import { LicenseManager } from './LicenseManager';
import { BackupManager } from './BackupManager';
import { Reports } from './Reports';
import { DecentralizedIdStudio } from './DecentralizedIdStudio';
import { OpenCommerceStudio } from './OpenCommerceStudio';
import { PayrollStudio } from './PayrollStudio';
import { BarcodeScannerStudio } from './BarcodeScannerStudio';
import { FinancialAnalyticsDashboard } from './FinancialAnalyticsDashboard';
import { LiveSupabaseTester } from './LiveSupabaseTester';
import { PreLaunchAcceptanceStudio } from './PreLaunchAcceptanceStudio';
import { AccountingVerificationStudio } from './AccountingVerificationStudio';
import { PWAInstallButton } from './PWAInstallButton';
import { OutboxSyncBadge } from './OutboxSyncBadge';
import { OfflineIndicator } from './OfflineIndicator';
import { SecurityGate } from './common/SecurityGates';

import {
  LayoutDashboard,
  BarChart3,
  FileText,
  CreditCard,
  Layers,
  ArrowLeftRight,
  Users,
  Wrench,
  Landmark,
  FolderKanban,
  BookOpen,
  Settings as SettingsIcon,
  Activity,
  Bot,
  Grid,
  Sparkles,
  Minus,
  Square,
  X,
  Maximize2,
  Minimize2,
  Clock,
  Calendar,
  Wifi,
  Volume2,
  Search,
  Power,
  RefreshCw,
  Monitor,
  LayoutGrid,
  ShieldCheck,
  Scale,
  TrendingUp,
  AlertCircle,
  Database,
  Key,
  Smartphone,
  Move,
  Fingerprint,
  Globe,
  Calculator,
  ScanLine,
  Cpu,
  LogIn,
  Crown,
  AlertTriangle
} from 'lucide-react';

export interface OpenWindow {
  id: string;
  moduleId: string;
  title: string;
  icon: any;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface HabinoDesktopProps {
  onSwitchToClassicView?: () => void;
  onSwitchToLandingView?: () => void;
}

export const HabinoDesktop: React.FC<HabinoDesktopProps> = ({ onSwitchToClassicView, onSwitchToLandingView }) => {
  const { invoices, checks, transactions, bankAccounts, settings, isOnline, currentUser, activeTenant, license } = useAccounting();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState<boolean>(false);
  const isTrial = activeTenant?.subscription?.status === 'trial' || license.tier === 'trial';
  const trialDaysRemaining = activeTenant?.subscription?.trialDaysRemaining ?? 30;
  const isSuspended = activeTenant?.subscription?.isSuspended || (isTrial && trialDaysRemaining <= 0);

  // Screen size & Mobile viewport detection
  const [screenSize, setScreenSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  }));
  const isMobile = screenSize.width < 768;

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop State
  const [windows, setWindows] = useState<OpenWindow[]>(() => {
    const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const initialW = mobile ? Math.max(280, window.innerWidth - 12) : 920;
    const initialH = mobile ? Math.max(340, window.innerHeight - 95) : 600;
    return [
      {
        id: 'win-dashboard',
        moduleId: 'dashboard',
        title: 'داشبورد مالی هابینو',
        icon: LayoutDashboard,
        isMinimized: false,
        isMaximized: mobile,
        zIndex: 10,
        position: { x: mobile ? 6 : 40, y: mobile ? 40 : 30 },
        size: { width: initialW, height: initialH }
      }
    ];
  });

  const [activeWindowId, setActiveWindowId] = useState<string>('win-dashboard');
  const [nextZIndex, setNextZIndex] = useState<number>(11);
  const [startMenuOpen, setStartMenuOpen] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Clock interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Desktop Applications List
  const apps = [
    { id: 'dashboard', title: 'داشبورد اصلی', icon: LayoutDashboard, color: 'from-blue-500 to-indigo-600', category: 'مدیریت' },
    { id: 'analytics', title: 'داشبورد تحلیلی ماهانه', icon: BarChart3, color: 'from-violet-600 to-indigo-700', category: 'گزارش‌ها و هوش تجاری' },
    { id: 'invoices', title: 'فاکتورها و صدور', icon: FileText, color: 'from-sky-500 to-blue-600', category: 'فروش' },
    { id: 'checks', title: 'چک‌های صیادی', icon: CreditCard, color: 'from-purple-500 to-indigo-600', category: 'بانک و چک' },
    { id: 'installments', title: 'اقساط و وصولی', icon: Layers, color: 'from-violet-500 to-purple-700', category: 'مالی' },
    { id: 'transactions', title: 'درآمد و هزینه', icon: ArrowLeftRight, color: 'from-emerald-500 to-teal-600', category: 'مالی' },
    { id: 'clients', title: 'طرف‌های حساب', icon: Users, color: 'from-teal-500 to-cyan-600', category: 'پایگاه مشتریان' },
    { id: 'inventory', title: 'خدمات و انبار', icon: Wrench, color: 'from-amber-500 to-orange-600', category: 'محصولات' },
    { id: 'barcode_scanner', title: 'بارکدخوان و اسکنر کالا', icon: ScanLine, color: 'from-emerald-500 to-teal-700', category: 'محصولات و انبار' },
    { id: 'banks', title: 'بانک‌ها و صندوق', icon: Landmark, color: 'from-slate-700 to-slate-900', category: 'بانک و چک' },
    { id: 'projects', title: 'پروژه‌ها، RFP و مناقصات', icon: FolderKanban, color: 'from-indigo-600 to-blue-800', category: 'خدمات و مناقصات' },
    { id: 'did_protocol', title: 'پروتکل هویت W3C DID و VC', icon: Fingerprint, color: 'from-blue-600 via-indigo-700 to-slate-900', category: 'زیرساخت هویت و امنیت' },
    { id: 'open_commerce', title: 'وب‌سرویس و وب‌هوک‌ها (API)', icon: Globe, color: 'from-indigo-600 to-blue-700', category: 'توسعه‌دهندگان' },
    { id: 'payroll', title: 'حقوق، دستمزد و بیمه تأمین اجتماعی', icon: Calculator, color: 'from-blue-600 to-indigo-800', category: 'منابع انسانی و بیمه' },
    { id: 'ledger', title: 'دفتر کل و روزنامه', icon: BookOpen, color: 'from-gray-700 to-slate-800', category: 'اسناد استاندارد' },
    { id: 'reports', title: 'صورت‌های مالی و P&L', icon: BarChart3, color: 'from-emerald-600 to-green-700', category: 'گزارش‌ها' },
    { id: 'synapse', title: 'دستیار صوتی سایرافلو', icon: Bot, color: 'from-blue-600 via-indigo-600 to-purple-600', category: 'هوش مصنوعی' },
    { id: 'agents_studio', title: 'استودیو ۵ ایجنت هابینو', icon: Cpu, color: 'from-purple-600 via-indigo-600 to-pink-600', category: 'هوش مصنوعی و ایجنت‌ها' },
    { id: 'user_management', title: 'مدیریت اعضا، نقش‌ها و مستأجران (RBAC)', icon: ShieldCheck, color: 'from-blue-600 via-indigo-700 to-purple-800', category: 'امنیت و دسترسی' },
    { id: 'diagnostics', title: 'عیب‌یاب و ترازنامه', icon: Activity, color: 'from-rose-500 to-red-600', category: 'ممیزی' },
    { id: 'supabase_tester', title: 'تست زنده سوپابیس', icon: Database, color: 'from-emerald-600 to-teal-700', category: 'زیرساخت و اتصال' },
    { id: 'pre_launch_qa', title: 'آزمون جامع و آمادگی انتشار (QA & UAT)', icon: ShieldCheck, color: 'from-blue-600 via-indigo-600 to-emerald-600', category: 'مهندسی و ممیزی' },
    { id: 'accounting_verification', title: 'آزمون خودکار تراز و دفتر کل', icon: Scale, color: 'from-emerald-600 via-teal-600 to-cyan-700', category: 'مهندسی و ممیزی' },
    { id: 'landing_portal', title: 'صفحه فرود و پورتال هابینو', icon: Globe, color: 'from-cyan-500 to-blue-600', category: 'پورتال' },
    { id: 'roadmap', title: 'رودمپ و تصمیمات مهندسی', icon: Sparkles, color: 'from-amber-400 to-yellow-600', category: 'مهندسی و معماری' },
    { id: 'hub', title: 'مرکز افزونه‌ها', icon: Grid, color: 'from-blue-600 to-cyan-600', category: 'ابزارها' },
    { id: 'license', title: 'مدیریت لایسنس و خرید', icon: Key, color: 'from-blue-600 to-indigo-700', category: 'امنیت و اشتراک' },
    { id: 'backup', title: 'پشتیبان‌گیری و بازیابی', icon: Database, color: 'from-emerald-600 to-teal-700', category: 'امنیت و اشتراک' },
    { id: 'settings', title: 'تنظیمات هابینو', icon: SettingsIcon, color: 'from-slate-600 to-zinc-800', category: 'سیستم' },
  ];

  // Open / Focus Window
  const openApp = (appId: string) => {
    setStartMenuOpen(false);
    if (appId === 'landing_portal') {
      onSwitchToLandingView?.();
      return;
    }
    const existing = windows.find(w => w.moduleId === appId);

    if (existing) {
      if (existing.isMinimized) {
        setWindows(prev => prev.map(w => w.id === existing.id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w));
      } else {
        setWindows(prev => prev.map(w => w.id === existing.id ? { ...w, zIndex: nextZIndex } : w));
      }
      setActiveWindowId(existing.id);
      setNextZIndex(prev => prev + 1);
      return;
    }

    const appInfo = apps.find(a => a.id === appId);
    if (!appInfo) return;

    // Offset position for cascading windows
    const count = windows.length;
    const isMob = screenSize.width < 768;
    const winWidth = isMob ? Math.max(280, screenSize.width - 12) : 880;
    const winHeight = isMob ? Math.max(320, screenSize.height - 95) : 580;
    const xPos = isMob ? 6 : 40 + (count % 6) * 30;
    const yPos = isMob ? 40 : 30 + (count % 6) * 25;

    const newWindow: OpenWindow = {
      id: `win-${appId}-${Date.now()}`,
      moduleId: appId,
      title: appInfo.title,
      icon: appInfo.icon,
      isMinimized: false,
      isMaximized: isMob,
      zIndex: nextZIndex,
      position: { x: xPos, y: yPos },
      size: { width: winWidth, height: winHeight }
    };

    setWindows(prev => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
    setNextZIndex(prev => prev + 1);
  };

  // Window Actions
  const focusWindow = (id: string) => {
    setActiveWindowId(id);
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w));
    setNextZIndex(prev => prev + 1);
  };

  const minimizeWindow = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
    if (activeWindowId === id) {
      const remaining = windows.filter(w => w.id !== id && !w.isMinimized);
      if (remaining.length > 0) {
        const top = remaining.reduce((prev, curr) => prev.zIndex > curr.zIndex ? prev : curr);
        setActiveWindowId(top.id);
      } else {
        setActiveWindowId('');
      }
    }
  };

  const toggleMaximizeWindow = (id: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
    focusWindow(id);
  };

  const fitToMobileWindow = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setWindows(prev => prev.map(w => {
      if (w.id === id) {
        const mobW = Math.max(280, screenSize.width - 12);
        const mobH = Math.max(300, screenSize.height - 95);
        return {
          ...w,
          isMaximized: false,
          position: { x: 6, y: 40 },
          size: { width: mobW, height: mobH }
        };
      }
      return w;
    }));
    focusWindow(id);
  };

  const closeWindow = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setWindows(prev => prev.filter(w => w.id !== id));
    if (activeWindowId === id) {
      const remaining = windows.filter(w => w.id !== id && !w.isMinimized);
      if (remaining.length > 0) {
        const top = remaining.reduce((prev, curr) => prev.zIndex > curr.zIndex ? prev : curr);
        setActiveWindowId(top.id);
      } else {
        setActiveWindowId('');
      }
    }
  };

  // 1. Dragging support (Mouse & Touch)
  const [draggingWinId, setDraggingWinId] = useState<string | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; winX: number; winY: number }>({
    clientX: 0,
    clientY: 0,
    winX: 0,
    winY: 0
  });

  const handleStartDrag = (clientX: number, clientY: number, win: OpenWindow) => {
    if (win.isMaximized) return;
    focusWindow(win.id);
    setDraggingWinId(win.id);
    dragStartRef.current = {
      clientX,
      clientY,
      winX: win.position.x,
      winY: win.position.y
    };
  };

  const handleMouseDownHeader = (e: React.MouseEvent, win: OpenWindow) => {
    handleStartDrag(e.clientX, e.clientY, win);
  };

  const handleTouchStartHeader = (e: React.TouchEvent, win: OpenWindow) => {
    if (e.touches.length === 1) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY, win);
    }
  };

  // 2. Corner Resizing support (Mouse & Touch)
  const [resizingWinId, setResizingWinId] = useState<string | null>(null);
  const resizeStartRef = useRef<{ clientX: number; clientY: number; startW: number; startH: number }>({
    clientX: 0,
    clientY: 0,
    startW: 0,
    startH: 0
  });

  const handleStartResize = (clientX: number, clientY: number, win: OpenWindow) => {
    if (win.isMaximized) return;
    focusWindow(win.id);
    setResizingWinId(win.id);
    resizeStartRef.current = {
      clientX,
      clientY,
      startW: win.size.width,
      startH: win.size.height
    };
  };

  // 3. Two-Finger Pinch-to-Resize Gesture Support
  const [pinchingWinId, setPinchingWinId] = useState<string | null>(null);
  const [pinchFeedback, setPinchFeedback] = useState<{ width: number; height: number; title: string } | null>(null);
  const pinchStartRef = useRef<{
    initialDist: number;
    initialWidth: number;
    initialHeight: number;
    winId: string;
  }>({ initialDist: 0, initialWidth: 0, initialHeight: 0, winId: '' });

  const handleWindowTouchStart = (e: React.TouchEvent, win: OpenWindow) => {
    if (e.touches.length === 2) {
      focusWindow(win.id);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      const curWidth = win.isMaximized ? Math.min(screenSize.width - 12, win.size.width) : win.size.width;
      const curHeight = win.isMaximized ? Math.min(screenSize.height - 95, win.size.height) : win.size.height;

      pinchStartRef.current = {
        initialDist: dist,
        initialWidth: curWidth,
        initialHeight: curHeight,
        winId: win.id
      };
      setPinchingWinId(win.id);
      setPinchFeedback({ width: curWidth, height: curHeight, title: win.title });
    }
  };

  useEffect(() => {
    // Movement Handler for Mouse & Touch
    const onMove = (clientX: number, clientY: number) => {
      if (draggingWinId) {
        const dx = clientX - dragStartRef.current.clientX;
        const dy = clientY - dragStartRef.current.clientY;

        setWindows(prev => prev.map(w => {
          if (w.id === draggingWinId) {
            const maxX = Math.max(0, window.innerWidth - 60);
            const maxY = Math.max(0, window.innerHeight - 80);
            return {
              ...w,
              position: {
                x: Math.max(0, Math.min(maxX, dragStartRef.current.winX + dx)),
                y: Math.max(36, Math.min(maxY, dragStartRef.current.winY + dy))
              }
            };
          }
          return w;
        }));
      }

      if (resizingWinId) {
        const dx = clientX - resizeStartRef.current.clientX;
        const dy = clientY - resizeStartRef.current.clientY;

        setWindows(prev => prev.map(w => {
          if (w.id === resizingWinId) {
            const minW = Math.min(260, window.innerWidth - 20);
            const maxW = window.innerWidth - 8;
            const minH = 200;
            const maxH = window.innerHeight - 60;
            return {
              ...w,
              size: {
                width: Math.max(minW, Math.min(maxW, resizeStartRef.current.startW + dx)),
                height: Math.max(minH, Math.min(maxH, resizeStartRef.current.startH + dy))
              }
            };
          }
          return w;
        }));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      onMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setDraggingWinId(null);
      setResizingWinId(null);
    };

    // Touch Move for Dragging and Pinching
    const handleTouchMove = (e: TouchEvent) => {
      if (pinchingWinId && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ratio = dist / (pinchStartRef.current.initialDist || 1);

        const minW = Math.min(260, window.innerWidth - 20);
        const maxW = window.innerWidth - 8;
        const minH = 200;
        const maxH = window.innerHeight - 60;

        const newW = Math.max(minW, Math.min(maxW, Math.round(pinchStartRef.current.initialWidth * ratio)));
        const newH = Math.max(minH, Math.min(maxH, Math.round(pinchStartRef.current.initialHeight * ratio)));

        setWindows(prev => prev.map(w => {
          if (w.id === pinchingWinId) {
            return {
              ...w,
              isMaximized: false,
              size: { width: newW, height: newH }
            };
          }
          return w;
        }));

        setPinchFeedback(prev => prev ? { ...prev, width: newW, height: newH } : null);
      } else if (draggingWinId && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (resizingWinId && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && pinchingWinId) {
        setPinchingWinId(null);
        setTimeout(() => setPinchFeedback(null), 1200);
      }
      if (e.touches.length === 0) {
        setDraggingWinId(null);
        setResizingWinId(null);
      }
    };

    if (draggingWinId || resizingWinId || pinchingWinId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [draggingWinId, resizingWinId, pinchingWinId]);

  // کنترل سریع کلید Escape برای بستن منوی استارت یا خروج از تمام‌صفحه
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (startMenuOpen) {
          setStartMenuOpen(false);
          return;
        }
        if (activeWindowId) {
          const activeWin = windows.find(w => w.id === activeWindowId);
          if (activeWin) {
            if (activeWin.isMaximized) {
              setWindows(prev => prev.map(w => w.id === activeWindowId ? { ...w, isMaximized: false } : w));
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWindowId, startMenuOpen, windows]);

  // Render Component inside Window
  const renderModule = (moduleId: string, winId?: string) => {
    switch (moduleId) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => openApp(tab)} />;
      case 'analytics':
        return <FinancialAnalyticsDashboard onNavigateToModule={(mod) => openApp(mod)} />;
      case 'invoices':
        return <Invoices />;
      case 'checks':
        return <Checks />;
      case 'installments':
        return <Installments />;
      case 'transactions':
        return <Transactions />;
      case 'clients':
        return <Clients />;
      case 'inventory':
        return <Inventory />;
      case 'barcode_scanner':
        return (
          <BarcodeScannerStudio
            onNavigateToInvoice={() => openApp('invoices')}
            onNavigateToInventory={() => openApp('inventory')}
            onNavigateToChecks={(prefilledSayad) => {
              if (prefilledSayad) {
                localStorage.setItem('habino_pending_sayad_qr', JSON.stringify(prefilledSayad));
              }
              openApp('checks');
            }}
          />
        );
      case 'banks':
        return <Banks />;
      case 'projects':
        return <Projects />;
      case 'did_protocol':
        return <DecentralizedIdStudio />;
      case 'open_commerce':
        return <OpenCommerceStudio />;
      case 'payroll':
        return <PayrollStudio />;
      case 'ledger':
        return <Ledger />;
      case 'reports':
        return <Reports />;
      case 'synapse':
        return <SynapseVoiceChat />;
      case 'diagnostics':
        return <DiagnosticModule />;
      case 'supabase_tester':
        return <LiveSupabaseTester />;
      case 'pre_launch_qa':
        return <PreLaunchAcceptanceStudio />;
      case 'accounting_verification':
        return <AccountingVerificationStudio standalone={true} />;
      case 'agents_studio':
        return <LiveAgentDiagnosticStudio />;
      case 'user_management':
        return <UserManagementView />;
      case 'roadmap':
        return <RoadmapStudio />;
      case 'hub':
        return <AppHub onSelectModule={(m) => openApp(m)} />;
      case 'license':
        return <LicenseManager />;
      case 'backup':
        return <BackupManager />;
      case 'settings':
        return (
          <Settings
            onClose={() => {
              if (winId) {
                setWindows(prev => prev.filter(w => w.id !== winId));
              }
            }}
          />
        );
      default:
        return <div className="p-8 text-center text-slate-500">ماژول در حال بارگذاری است...</div>;
    }
  };

  // Financial Quick Stats for Desktop Widget
  const totalBalance = bankAccounts.reduce((sum, b) => sum + (b.balance || 0), 0);
  const pendingChecks = checks.filter(c => c.status === 'pending');
  const pendingChecksCount = pendingChecks.length;

  const filteredApps = apps.filter(a => a.title.includes(searchQuery) || a.category.includes(searchQuery));

  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none bg-radial from-slate-900 via-slate-950 to-black text-slate-100 font-sans"
      dir="rtl"
      id="habino-desktop-environment"
      onClick={() => {
        if (startMenuOpen) setStartMenuOpen(false);
      }}
    >
      {/* Dynamic Desktop Wallpaper & Grid Atmosphere */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Desktop Top Status & Brand Header Bar */}
      <div className="absolute top-0 inset-x-0 h-9 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-3 sm:px-4 z-30 text-xs">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white text-[11px]">هـ</div>
            <span className="hidden xs:inline">میزکار هابینو</span>
            <span className="text-[10px] text-blue-400 font-normal px-1.5 py-0.5 bg-blue-950/60 border border-blue-800/60 rounded">Hubino OS 2.5</span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-slate-400 border-r border-slate-700/60 pr-3">
            <span className="hover:text-slate-200 cursor-pointer" onClick={() => openApp('invoices')}>صدور سریع فاکتور</span>
            <span className="hover:text-slate-200 cursor-pointer" onClick={() => openApp('synapse')}>دستیار صوتی</span>
            <span className="hover:text-indigo-300 text-indigo-400 font-bold cursor-pointer" onClick={() => openApp('agents_studio')}>استودیو ۵ ایجنت</span>
            <span className="hover:text-emerald-300 text-slate-300 cursor-pointer flex items-center gap-1" onClick={() => openApp('user_management')}>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>کاربران و RBAC</span>
            </span>
            <span className="hover:text-slate-200 cursor-pointer" onClick={() => openApp('diagnostics')}>وضعیت تراز</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Always-on Upgrade Button */}
          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
            title="خرید و ارتقای اشتراک هابینو"
          >
            <Crown className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden xs:inline">خرید و ارتقای اشتراک</span>
            {isTrial && (
              <span className="bg-amber-950/20 text-slate-950 text-[10px] px-1 py-0.2 rounded-full font-medium hidden sm:inline">
                {trialDaysRemaining} روز هدیه
              </span>
            )}
          </button>

          {/* User Profile & Auth Pill */}
          <button
            onClick={() => setLoginModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-200 border border-blue-800/60 text-xs transition-colors cursor-pointer"
            title={currentUser ? 'مشاهده حساب کاربری' : 'ورود / ثبت‌نام در سامانه'}
          >
            {currentUser ? (
              <>
                <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                  {currentUser.fullName[0]}
                </div>
                <span className="font-semibold hidden xs:inline">{currentUser.fullName}</span>
                <span className="text-[10px] text-blue-300 px-1 py-0.5 bg-blue-900/50 rounded font-mono">
                  {activeTenant?.name || 'سازمان'}
                </span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold">ورود / ثبت‌نام</span>
              </>
            )}
          </button>

          {onSwitchToLandingView && (
            <button
              onClick={onSwitchToLandingView}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 text-[11px] transition-colors"
              title="مشاهده صفحه فرود و پورتال اصلی هابینو"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">صفحه فرود</span>
            </button>
          )}

          {onSwitchToClassicView && (
            <button
              onClick={onSwitchToClassicView}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] transition-colors"
              title="تغییر به نمای پنل سایدباری"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">نمای داشبورد وب</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400">
            <span className="font-mono text-slate-300 text-xs">{currentTime}</span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="hidden sm:inline">{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Desktop Suspension Warning Banner */}
      {isSuspended && (
        <div className="absolute top-9 inset-x-0 z-30 bg-rose-600 text-white px-4 py-2 flex items-center justify-between text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>حساب کاربری هابینو در وضعیت پایان دوره هدیه (تعلیق) قرار دارد.</strong> جهت ادامه کار و دسترسی به امکانات پیشرفته، نسبت به نهایی‌سازی خرید اقدام فرمایید.
            </span>
          </div>
          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="px-3 py-1 bg-white text-rose-700 font-bold rounded-lg text-xs hover:bg-rose-50 shadow-xs cursor-pointer shrink-0 transition-colors mr-2"
          >
            خرید و فعال‌سازی
          </button>
        </div>
      )}

      {/* Desktop Main Workspace Area */}
      <div className="relative w-full h-[calc(100vh-48px)] pt-11 px-4 pb-14 overflow-hidden">
        {/* Desktop Icons Grid (Adaptive for Mobile and Desktop) */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-flow-col md:grid-rows-6 gap-2 sm:gap-3 w-full max-w-md md:w-fit z-10 relative pointer-events-auto max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar pb-6">
          {apps.map(app => {
            const Icon = app.icon;
            const isOpen = windows.some(w => w.moduleId === app.id);
            return (
              <div
                key={app.id}
                onDoubleClick={() => openApp(app.id)}
                onClick={() => {
                  // In mobile single click opens the app
                  if (isMobile) {
                    openApp(app.id);
                  }
                }}
                className="group flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer border border-transparent hover:border-white/10 active:scale-95 text-center relative"
                title={app.title}
              >
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${app.color} p-2.5 shadow-lg flex items-center justify-center text-white mb-1 group-hover:scale-105 transition-transform relative`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  {isOpen && (
                    <span className="absolute -bottom-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
                  )}
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-200 group-hover:text-white font-medium drop-shadow-md leading-tight line-clamp-2 px-0.5">
                  {app.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Two-finger Pinch Resize Floating Toast Feedback */}
        {pinchFeedback && (
          <div className="fixed top-12 inset-x-0 mx-auto w-fit px-4 py-2 bg-blue-600/95 backdrop-blur-md border border-blue-400 text-white rounded-2xl shadow-2xl z-50 flex items-center gap-2 text-xs font-bold animate-pulse">
            <Smartphone className="w-4 h-4" />
            <span>تغییر اندازه دو انگشتی {pinchFeedback.title}: {pinchFeedback.width} × {pinchFeedback.height} پیکسل</span>
          </div>
        )}

        {/* Desktop Live Financial & Synapse Widget (Left Side in RTL) */}
        <div className="absolute top-14 left-6 hidden lg:flex flex-col gap-4 w-72 pointer-events-auto z-10">
          {/* Quick Balance Widget */}
          <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-emerald-400" />
                موجودی نقد هابینو
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-full font-bold">
                برخط
              </span>
            </div>
            <div>
              <p className="text-xl font-bold text-white tracking-tight">
                {formatCurrency(totalBalance, settings.currency)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">در سراسر حساب‌های بانکی متصل</p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">چک‌های در جریان وصول:</span>
              <span className="font-bold text-amber-400">{pendingChecksCount} فقره</span>
            </div>
          </div>

          {/* SiraFlow AI Voice & Orchestration Widget */}
          <div
            onClick={() => openApp('synapse')}
            className="bg-gradient-to-br from-indigo-950/80 via-slate-900/80 to-blue-950/80 backdrop-blur-xl border border-indigo-700/50 hover:border-blue-500 rounded-2xl p-4 shadow-2xl space-y-3 cursor-pointer group transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SiraFlowAvatar
                  state="idle"
                  size="sm"
                  showStatusLabel={false}
                  showBadges={false}
                />
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                    <span>دستیار صوتی سایرافلو</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-mono">Bazaar</span>
                  </h4>
                  <p className="text-[10px] text-slate-300">ارکستراتور هوشمند هابینو</p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">مکالمه صوتی و تحلیل:</span>
              <span className="text-emerald-400 font-medium">آماده دریافت فرمان</span>
            </div>
          </div>
        </div>

        {/* Active Multi-Windows Container */}
        {windows.map(win => {
          if (win.isMinimized) return null;
          const isMax = win.isMaximized;
          const isActive = activeWindowId === win.id;

          const adaptiveWidth = isMax ? '100%' : `${Math.min(screenSize.width - 12, win.size.width)}px`;
          const adaptiveHeight = isMax ? 'calc(100% - 2px)' : `${Math.min(screenSize.height - 95, win.size.height)}px`;
          const adaptiveLeft = isMax ? 0 : `${Math.min(Math.max(4, screenSize.width - 60), win.position.x)}px`;
          const adaptiveTop = isMax ? 0 : `${Math.max(38, Math.min(screenSize.height - 80, win.position.y))}px`;

          return (
            <div
              key={win.id}
              onClick={() => focusWindow(win.id)}
              onTouchStart={(e) => handleWindowTouchStart(e, win)}
              style={{
                zIndex: win.zIndex,
                top: adaptiveTop,
                left: adaptiveLeft,
                width: adaptiveWidth,
                height: adaptiveHeight,
                maxWidth: '100vw',
                maxHeight: 'calc(100vh - 48px)'
              }}
              className={`absolute rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-75 ${
                isMax ? 'rounded-none inset-0' : ''
              } ${
                isActive
                  ? 'border border-blue-500/50 shadow-blue-900/30 bg-white ring-1 ring-white/20'
                  : 'border border-slate-700 bg-white/95 opacity-95 shadow-black/50'
              }`}
            >
              {/* Window Header Titlebar (Draggable & Touch-Move Handle) */}
              <div
                onMouseDown={(e) => handleMouseDownHeader(e, win)}
                onTouchStart={(e) => handleTouchStartHeader(e, win)}
                onDoubleClick={(e) => toggleMaximizeWindow(win.id, e)}
                className={`h-11 px-3 sm:px-4 flex items-center justify-between cursor-move select-none border-b touch-none ${
                  isActive ? 'bg-slate-900 text-white border-slate-800' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs truncate max-w-[55%]">
                  <div className="p-1 rounded-md bg-blue-600/30 text-blue-400 shrink-0">
                    <win.icon className="w-4 h-4" />
                  </div>
                  <span className="truncate">{win.title}</span>
                </div>

                {/* Window Control Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Fit to Mobile Button */}
                  <button
                    onClick={(e) => fitToMobileWindow(win.id, e)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                    title="تطبیق سریع اندازه با موبایل"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => minimizeWindow(win.id, e)}
                    className="w-7 h-7 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="کوچک‌کردن پنجره (Minimize)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {isMax ? (
                    <button
                      onClick={(e) => toggleMaximizeWindow(win.id, e)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer"
                      title="خروج از تمام‌صفحه و بازیابی اندازه پنجره"
                    >
                      <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                      <span className="hidden sm:inline">کوچک‌کردن</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => toggleMaximizeWindow(win.id, e)}
                      className="w-7 h-7 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="بزرگ‌نمایی کامل (Maximize)"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={(e) => closeWindow(win.id, e)}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="بستن این صفحه و بازگشت به میزکار"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>بستن</span>
                  </button>
                </div>
              </div>

              {/* Floating Emergency Action Pill when Window is Maximized */}
              {isMax && (
                <div className="absolute top-12 left-4 z-40 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={(e) => toggleMaximizeWindow(win.id, e)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                    title="خروج از تمام‌صفحه (Restore)"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px]">کوچک‌کردن</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => closeWindow(win.id, e)}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-md transition-colors cursor-pointer"
                    title="بستن این پنجره و بازگشت به میزکار"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="text-[11px]">بستن صفحه</span>
                  </button>
                </div>
              )}

              {/* Window Internal Body */}
              <div className="flex-1 w-full h-full overflow-y-auto bg-slate-50 text-slate-800 p-3 sm:p-4 md:p-6 relative">
                <SecurityGate
                  moduleId={win.moduleId}
                  moduleTitleFa={win.title}
                  onNavigate={(tab) => openApp(tab)}
                  onOpenLoginModal={() => setLoginModalOpen(true)}
                >
                  {renderModule(win.moduleId, win.id)}
                </SecurityGate>
              </div>

              {/* Corner Manual Resize Grip Handle (for touch and mouse) */}
              {!isMax && (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleStartResize(e.clientX, e.clientY, win);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches.length === 1) {
                      handleStartResize(e.touches[0].clientX, e.touches[0].clientY, win);
                    }
                  }}
                  className="absolute bottom-0 left-0 w-8 h-8 flex items-end justify-start p-1.5 cursor-nesw-resize text-slate-400 hover:text-blue-500 bg-slate-200/60 hover:bg-blue-100 rounded-tr-xl touch-none z-30 transition-colors"
                  title="تغییر اندازه پنجره (کشیدن گوشه یا دو انگشتی)"
                >
                  <Move className="w-4 h-4 rotate-45" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Start Menu Popover */}
      {startMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-14 left-2 right-2 sm:left-auto sm:right-4 w-auto sm:w-96 max-h-[520px] bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl z-50 flex flex-col space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-150"
        >
          {/* User Profile in Start Menu */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-md">
                ف
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">مهندس فرید تهرانی</h3>
                <p className="text-[11px] text-slate-400">{settings.name}</p>
              </div>
            </div>
            <button
              onClick={() => openApp('settings')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی برنامه‌ها و اسناد هابینو..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-blue-500"
            />
          </div>

          {/* Apps List */}
          <div className="flex-1 overflow-y-auto max-h-64 space-y-1 pr-1">
            <p className="text-[10px] font-bold text-slate-400 px-2 mb-2">برنامه‌های نصب‌شده</p>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredApps.map(app => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    onClick={() => openApp(app.id)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 text-right transition-colors"
                  >
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${app.color} text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs text-slate-200 font-medium truncate">{app.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => openApp('synapse')}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <Bot className="w-4 h-4" />
              <span>دستیار صوتی سیناپس</span>
            </button>
            <span className="text-[10px] text-slate-500">نسخه ۱.۰.۰ ابری</span>
          </div>
        </div>
      )}

      {/* Desktop Bottom Taskbar / Dock */}
      <div className="absolute bottom-0 inset-x-0 h-12 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/80 flex items-center justify-between px-3 z-40">
        {/* Start Button & Running Windows Tabs */}
        <div className="flex items-center gap-2 max-w-[70%] overflow-x-auto no-scrollbar">
          {/* Start Menu Trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStartMenuOpen(!startMenuOpen);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md ${
              startMenuOpen ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-blue-600/90 hover:bg-blue-600 text-white'
            }`}
          >
            <div className="w-4 h-4 bg-white/20 rounded flex items-center justify-center text-[10px]">هـ</div>
            <span>هابینو</span>
          </button>

          {/* Window Tabs */}
          {windows.map(win => {
            const isActive = activeWindowId === win.id && !win.isMinimized;
            const Icon = win.icon;
            return (
              <div
                key={win.id}
                className={`group flex items-center gap-1 pl-1.5 pr-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm ring-1 ring-blue-500/40'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <button
                  onClick={() => {
                    if (win.isMinimized) {
                      focusWindow(win.id);
                    } else if (activeWindowId === win.id) {
                      setWindows(prev => prev.map(w => w.id === win.id ? { ...w, isMinimized: true } : w));
                    } else {
                      focusWindow(win.id);
                    }
                  }}
                  className="flex items-center gap-1.5 max-w-[130px] sm:max-w-[170px] truncate cursor-pointer text-right"
                  title={win.title}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="truncate">{win.title}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeWindow(win.id, e);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer shrink-0"
                  title={`بستن ${win.title}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* System Tray (Clock, Network, Show Desktop) */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {/* Quick Show Desktop Peek Button */}
          <button
            onClick={() => {
              const anyOpen = windows.some(w => !w.isMinimized);
              setWindows(prev => prev.map(w => ({ ...w, isMinimized: anyOpen })));
            }}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border border-slate-800 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="نمایش میزکار (کوچک‌کردن همه پنجره‌ها)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">میزکار</span>
          </button>
          {/* Always-on Upgrade Button in Taskbar */}
          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
            title="خرید و ارتقای اشتراک هابینو"
          >
            <Crown className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline">خرید و ارتقای اشتراک</span>
            {isTrial && (
              <span className="bg-amber-950/20 text-slate-950 text-[10px] px-1 py-0.2 rounded-full font-medium">
                {trialDaysRemaining} روز
              </span>
            )}
          </button>

          <PWAInstallButton variant="compact" />

          {/* Offline Outbox Queue Live Sync Badge */}
          <OutboxSyncBadge variant="taskbar" />

          <button
            onClick={() => openApp('synapse')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-indigo-400 hover:text-indigo-300"
            title="دستیار صوتی سیناپس"
          >
            <Bot className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800">
            <Wifi className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-[10px] hidden sm:inline">{isOnline ? 'آنلاین' : 'آفلاین'}</span>
          </div>

          <div className="flex flex-col items-end leading-tight px-1 font-mono">
            <span className="text-slate-200 font-bold text-xs">{currentTime}</span>
            <span className="text-[9px] text-slate-400">{currentDate}</span>
          </div>

          {/* Show Desktop (Minimize All) */}
          <div
            onClick={() => {
              setWindows(prev => prev.map(w => ({ ...w, isMinimized: true })));
            }}
            className="w-2.5 h-8 border-r-2 border-slate-700 hover:bg-blue-600/50 cursor-pointer rounded-xs transition-colors"
            title="نمایش دسکتاپ (کوچک کردن همه)"
          />
        </div>
      </div>
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
      />
      <UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
      <OfflineIndicator />
    </div>
  );
};
