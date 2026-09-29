import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AccountingProvider, useAccounting } from './lib/store';
import { SiraFlowProvider } from './lib/siraflowStore';
import { Dashboard } from './components/Dashboard';
import { Invoices } from './components/Invoices';
import { Checks } from './components/Checks';
import { Transactions } from './components/Transactions';
import { Clients } from './components/Clients';
import { Inventory } from './components/Inventory';
import { Installments } from './components/Installments';
import { Banks } from './components/Banks';
import { Projects } from './components/Projects';
import { Ledger } from './components/Ledger';
import { Settings } from './components/Settings';
import { SynapseVoiceChat } from './components/SynapseVoiceChat';
import { AppHub } from './components/AppHub';
import { LicenseManager } from './components/LicenseManager';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserManagementView } from './components/UserManagementView';
import { LoginModal } from './components/LoginModal';
import { UpgradeModal } from './components/UpgradeModal';
import { HabinoLandingPage } from './components/HabinoLandingPage';
import { BazaarOnboardingModal } from './components/BazaarOnboardingModal';
import { SecurityGate } from './components/common/SecurityGates';
import { ROLE_DETAILS_FA } from './lib/authEngine';

// Lazy-loaded heavy modules for optimized bundle splitting & faster first load
const DiagnosticModule = lazy(() => import('./components/DiagnosticModule').then(m => ({ default: m.DiagnosticModule })));
const RoadmapStudio = lazy(() => import('./components/RoadmapStudio').then(m => ({ default: m.RoadmapStudio })));
const HabinoDesktop = lazy(() => import('./components/HabinoDesktop').then(m => ({ default: m.HabinoDesktop })));
const BackupManager = lazy(() => import('./components/BackupManager').then(m => ({ default: m.BackupManager })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const DecentralizedIdStudio = lazy(() => import('./components/DecentralizedIdStudio').then(m => ({ default: m.DecentralizedIdStudio })));
const OpenCommerceStudio = lazy(() => import('./components/OpenCommerceStudio').then(m => ({ default: m.OpenCommerceStudio })));
const PayrollStudio = lazy(() => import('./components/PayrollStudio').then(m => ({ default: m.PayrollStudio })));
const BarcodeScannerStudio = lazy(() => import('./components/BarcodeScannerStudio').then(m => ({ default: m.BarcodeScannerStudio })));
const FinancialAnalyticsDashboard = lazy(() => import('./components/FinancialAnalyticsDashboard').then(m => ({ default: m.FinancialAnalyticsDashboard })));
const LiveAgentDiagnosticStudio = lazy(() => import('./components/LiveAgentDiagnosticStudio').then(m => ({ default: m.LiveAgentDiagnosticStudio })));
const PreLaunchAcceptanceStudio = lazy(() => import('./components/PreLaunchAcceptanceStudio').then(m => ({ default: m.PreLaunchAcceptanceStudio })));
const AccountingVerificationStudio = lazy(() => import('./components/AccountingVerificationStudio').then(m => ({ default: m.AccountingVerificationStudio })));
const StressTestEngineStudio = lazy(() => import('./components/StressTestEngineStudio').then(m => ({ default: m.StressTestEngineStudio })));
const TenantIsolationVerificationStudio = lazy(() => import('./components/TenantIsolationVerificationStudio').then(m => ({ default: m.TenantIsolationVerificationStudio })));
const PublicInvoiceView = lazy(() => import('./components/PublicInvoiceView').then(m => ({ default: m.PublicInvoiceView })));

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
  Menu,
  X,
  Monitor,
  LayoutGrid,
  ShieldCheck,
  Scale,
  Database,
  Key,
  Fingerprint,
  Globe,
  Compass,
  Calculator,
  ScanLine,
  Cpu,
  LogIn,
  Crown,
  AlertTriangle,
  ShieldAlert,
  Zap
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const [publicInvoiceToken, setPublicInvoiceToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invoice_token') || params.get('token') || params.get('share_token');
    if (token) return token;
    const match = window.location.pathname.match(/\/invoice\/view\/([^/?#]+)/);
    return match ? match[1] : null;
  });

  const [viewMode, setViewMode] = useState<'landing' | 'desktop' | 'classic'>(() => {
    return (localStorage.getItem('habino_view_mode') as 'landing' | 'desktop' | 'classic') || 'landing';
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState<boolean>(false);
  const [bazaarOnboardingOpen, setBazaarOnboardingOpen] = useState<boolean>(false);
  const { settings, isOnline, currentUser, activeTenant, license } = useAccounting();

  const isTrial = activeTenant?.subscription?.status === 'trial' || license.tier === 'trial';
  const trialDaysRemaining = activeTenant?.subscription?.trialDaysRemaining ?? 30;
  const isSuspended = activeTenant?.subscription?.isSuspended || (isTrial && trialDaysRemaining <= 0);

  const handleToggleViewMode = (mode: 'landing' | 'desktop' | 'classic') => {
    setViewMode(mode);
    localStorage.setItem('habino_view_mode', mode);
  };

  // If a public link token is present in the URL, render Public Invoice View directly (No login required)
  if (publicInvoiceToken) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">در حال بارگذاری صورت‌حساب آنلاین...</div>}>
        <PublicInvoiceView
          token={publicInvoiceToken}
          onBackToApp={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('invoice_token');
            url.searchParams.delete('token');
            url.searchParams.delete('share_token');
            window.history.pushState({}, '', url.pathname);
            setPublicInvoiceToken(null);
          }}
        />
      </Suspense>
    );
  }

  if (viewMode === 'landing') {
    return (
      <>
        <HabinoLandingPage
          onEnterAccounting={(module, targetMode = 'desktop') => {
            if (module) setActiveTab(module);
            handleToggleViewMode(targetMode);
          }}
          onOpenLogin={() => setLoginModalOpen(true)}
        />
        <LoginModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
        />
        <UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
      </>
    );
  }

  if (viewMode === 'desktop') {
    return (
      <Suspense fallback={<div className="h-screen bg-slate-900 flex items-center justify-center text-white text-sm">در حال بارگذاری میزکار دسکتاپ...</div>}>
        <HabinoDesktop
          onSwitchToClassicView={() => handleToggleViewMode('classic')}
          onSwitchToLandingView={() => handleToggleViewMode('landing')}
        />
        <UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} />
      </Suspense>
    );
  }

  const navigationItems = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'analytics', label: 'داشبورد تحلیلی ماهانه', icon: BarChart3 },
    { id: 'hub', label: 'مرکز افزونه‌ها', icon: Grid },
    { id: 'invoices', label: 'فاکتورها', icon: FileText },
    { id: 'checks', label: 'چک‌های صیادی', icon: CreditCard },
    { id: 'installments', label: 'اقساط', icon: Layers },
    { id: 'transactions', label: 'تراکنش‌ها', icon: ArrowLeftRight },
    { id: 'clients', label: 'طرف‌های حساب', icon: Users },
    { id: 'inventory', label: 'خدمات و کالا', icon: Wrench },
    { id: 'barcode_scanner', label: 'بارکدخوان کالا', icon: ScanLine },
    { id: 'banks', label: 'بانک‌ها', icon: Landmark },
    { id: 'projects', label: 'پروژه‌ها و مناقصات', icon: FolderKanban },
    { id: 'did_protocol', label: 'پروتکل هویت W3C DID', icon: Fingerprint },
    { id: 'open_commerce', label: 'وب‌سرویس و وب‌هوک‌ها (API)', icon: Globe },
    { id: 'payroll', label: 'حقوق و دستمزد و بیمه', icon: Calculator },
    { id: 'ledger', label: 'دفتر کل و روزنامه', icon: BookOpen },
    { id: 'reports', label: 'صورت‌های مالی و سود و زیان', icon: BarChart3 },
    { id: 'synapse', label: 'دستیار صوتی سایرافلو', icon: Bot },
    { id: 'diagnostics', label: 'عیب‌یاب و تست زنده سوپابیس', icon: Activity },
    { id: 'pre_launch_qa', label: 'آزمون آمادگی انتشار (QA & UAT)', icon: ShieldCheck },
    { id: 'accounting_verification', label: 'آزمون خودکار تراز و دفتر کل', icon: Scale },
    { id: 'stress_test', label: 'شبیه‌ساز بار سنگین (Stress Test ۱۰۰۰ سند)', icon: Zap },
    { id: 'agents_studio', label: 'استودیو ۵ ایجنت هابینو', icon: Cpu },
    { id: 'user_management', label: 'مدیریت اعضا، نقش‌ها و مستأجران (RBAC)', icon: ShieldCheck },
    { id: 'tenant_isolation', label: 'آزمون ایزولاسیون مستأجران (RLS Studio)', icon: ShieldAlert },
    { id: 'license', label: 'مدیریت لایسنس', icon: Key },
    { id: 'backup', label: 'پشتیبان‌گیری', icon: Database },
    { id: 'roadmap', label: 'رودمپ و تصمیمات مهندسی', icon: Sparkles },
    { id: 'settings', label: 'تنظیمات', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                هـ
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">هابینو حسابداری</h1>
                <p className="text-[10px] text-slate-400">Habino Accounting Platform</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Always-on Upgrade / Purchase Button */}
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
              title="خرید یا ارتقای اشتراک هابینو"
            >
              <Crown className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden sm:inline">خرید و ارتقای اشتراک</span>
              <span className="sm:hidden">ارتقا</span>
              {isTrial && (
                <span className="bg-amber-950/20 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-medium hidden md:inline">
                  {trialDaysRemaining} روز هدیه
                </span>
              )}
            </button>

            {/* PWA In-App Install Button */}
            <PWAInstallButton variant="compact" />

            {/* Supabase Live Connection Quick Badge/Button */}
            <button
              onClick={() => setActiveTab('diagnostics')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="تست زنده اتصال سوپابیس و دریافت داده‌های کلود"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">تست زنده سوپابیس</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            {/* Auth & RBAC Profile Button */}
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title={currentUser ? 'مشاهده حساب کاربری' : 'ورود یا ثبت‌نام در سامانه'}
            >
              {currentUser ? (
                <>
                  <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser.fullName[0]}
                  </div>
                  <div className="text-right hidden md:block">
                    <span className="block text-[11px] font-bold leading-none">{currentUser.fullName}</span>
                    <span className="text-[9px] text-blue-600/80 leading-none">
                      {activeTenant?.name || 'سازمان'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-blue-600" />
                  <span>ورود / ثبت‌نام</span>
                </>
              )}
            </button>

            {/* Switch to Landing Page */}
            <button
              onClick={() => handleToggleViewMode('landing')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="مشاهده صفحه فرود و پورتال اصلی هابینو"
            >
              <Globe className="w-4 h-4 text-cyan-600" />
              <span>صفحه فرود</span>
            </button>

            {/* Launch Bazaar Onboarding Tour */}
            <button
              onClick={() => setBazaarOnboardingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="تور هوشمند آنبوردینگ و راه‌اندازی سریع اولیه برای اصناف بازار"
            >
              <Compass className="w-4 h-4 text-amber-600" />
              <span>تور بازار</span>
            </button>

            {/* Switch to Desktop OS View */}
            <button
              onClick={() => handleToggleViewMode('desktop')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="ورود به میزکار دسکتاپ چند پنجره‌ای هابینو"
            >
              <Monitor className="w-4 h-4 text-blue-400" />
              <span>میزکار دسکتاپ</span>
            </button>

            <button
              onClick={() => setActiveTab('synapse')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="احضار دستیار صوتی سایرافلو با آواتار اختصاصی"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>دستیار صوتی سایرافلو</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700">
              <span className="font-semibold">{settings.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Account Suspension Banner (Post-Trial Expiration) */}
      {isSuspended && (
        <div className="bg-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs no-print">
          <div className="flex items-center gap-2 max-w-5xl">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>حساب کاربری شما در وضعیت پایان دوره هدیه (تعلیق موقت) قرار دارد.</strong> جهت ثبت اسناد جدید، صدور فاکتور و بهره‌مندی از امکانات، لطفاً نسبت به خرید یا تمدید اشتراک اقدام نمایید.
            </span>
          </div>
          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="px-3.5 py-1.5 bg-white text-rose-700 font-bold rounded-lg text-xs hover:bg-rose-50 shadow-xs cursor-pointer shrink-0 transition-colors mr-2"
          >
            خرید و فعال‌سازی فوری
          </button>
        </div>
      )}

      {/* Main Container with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex gap-6">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-64 bg-white border-l border-slate-200 p-4 transition-transform lg:static lg:block lg:w-56 lg:p-0 lg:bg-transparent lg:border-none lg:z-auto ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          } no-print`}
        >
          <div className="flex lg:hidden justify-between items-center mb-4 pb-2 border-b">
            <span className="font-bold text-sm text-slate-800">منوی ناوبری</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-3 px-1">
            <button
              onClick={() => handleToggleViewMode('desktop')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-xs font-semibold shadow-sm hover:from-slate-800 hover:to-indigo-900 transition-all group"
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>میزکار دسکتاپ هابینو</span>
              </div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30">
                OS
              </span>
            </button>
          </div>

          <nav className="space-y-1">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 w-full min-w-0">
          <SecurityGate
            moduleId={activeTab}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenLoginModal={() => setLoginModalOpen(true)}
            onOpenLicenseModal={() => setUpgradeModalOpen(true)}
          >
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-slate-500 gap-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">در حال بارگذاری ماژول تخصصی...</span>
              </div>
            }>
              {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'analytics' && <FinancialAnalyticsDashboard onNavigateToModule={(mod) => setActiveTab(mod)} />}
              {activeTab === 'hub' && <AppHub onSelectModule={(mod) => setActiveTab(mod)} />}
              {activeTab === 'invoices' && <Invoices />}
              {activeTab === 'checks' && <Checks />}
              {activeTab === 'installments' && <Installments />}
              {activeTab === 'transactions' && <Transactions />}
              {activeTab === 'clients' && <Clients />}
              {activeTab === 'inventory' && <Inventory />}
              {activeTab === 'barcode_scanner' && (
                <BarcodeScannerStudio
                  onNavigateToInvoice={() => setActiveTab('invoices')}
                  onNavigateToInventory={() => setActiveTab('inventory')}
                  onNavigateToChecks={(prefilledSayad) => {
                    if (prefilledSayad) {
                      localStorage.setItem('habino_pending_sayad_qr', JSON.stringify(prefilledSayad));
                    }
                    setActiveTab('checks');
                  }}
                />
              )}
              {activeTab === 'banks' && <Banks />}
              {activeTab === 'projects' && <Projects />}
              {activeTab === 'did_protocol' && <DecentralizedIdStudio />}
              {activeTab === 'open_commerce' && <OpenCommerceStudio />}
              {activeTab === 'payroll' && <PayrollStudio />}
              {activeTab === 'ledger' && <Ledger />}
              {activeTab === 'reports' && <Reports />}
              {activeTab === 'synapse' && <SynapseVoiceChat />}
              {activeTab === 'diagnostics' && <DiagnosticModule />}
              {activeTab === 'pre_launch_qa' && <PreLaunchAcceptanceStudio />}
              {activeTab === 'accounting_verification' && <AccountingVerificationStudio standalone={true} />}
              {activeTab === 'stress_test' && <StressTestEngineStudio standalone={true} />}
              {activeTab === 'agents_studio' && <LiveAgentDiagnosticStudio />}
              {activeTab === 'user_management' && <UserManagementView />}
              {activeTab === 'tenant_isolation' && <TenantIsolationVerificationStudio />}
              {activeTab === 'license' && <LicenseManager />}
              {activeTab === 'backup' && <BackupManager />}
              {activeTab === 'roadmap' && <RoadmapStudio />}
              {activeTab === 'settings' && <Settings onClose={() => setActiveTab('dashboard')} />}
            </Suspense>
          </SecurityGate>
        </main>
      </div>

      {/* Floating SiraFlow Voice Assistant Trigger (Visible when not on synapse tab) */}
      {activeTab !== 'synapse' && (
        <button
          onClick={() => setActiveTab('synapse')}
          className="fixed bottom-6 left-6 z-40 p-3 bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 hover:from-blue-600 hover:to-indigo-600 text-white rounded-full shadow-2xl border border-blue-400/40 hover:scale-110 active:scale-95 transition-all duration-200 group flex items-center gap-2.5 pr-4 pl-3"
          title="احضار دستیار صوتی سایرافلو (SiraFlow)"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute w-full h-full rounded-full bg-blue-400/40 animate-ping" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              س
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="block text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
              سایرافلو صوتی
            </span>
            <span className="block text-[9px] text-blue-200/80">نسخه بازار و رودمپ</span>
          </div>
        </button>
      )}

      <BazaarOnboardingModal
        isOpen={bazaarOnboardingOpen}
        onClose={() => setBazaarOnboardingOpen(false)}
        onOpenModule={(tabId) => setActiveTab(tabId)}
      />

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

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AccountingProvider>
        <SiraFlowProvider>
          <MainLayout />
        </SiraFlowProvider>
      </AccountingProvider>
    </ErrorBoundary>
  );
};

export default App;
