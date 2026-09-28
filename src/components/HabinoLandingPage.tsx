import React, { useState, useEffect } from 'react';
import { useAccounting } from '../lib/store';
import { ROLE_DETAILS_FA } from '../lib/authEngine';
import {
  Sparkles,
  ShoppingBag,
  FileText,
  CreditCard,
  Layers,
  ArrowRight,
  Search,
  CheckCircle2,
  Shield,
  Zap,
  Users,
  Building2,
  Wrench,
  Bot,
  ExternalLink,
  ChevronRight,
  Lock,
  Wallet,
  Globe,
  Grid,
  Monitor,
  LayoutDashboard,
  ShieldCheck,
  Award,
  BarChart3,
  PhoneCall,
  Flame,
  ArrowUpRight,
  Sun,
  Moon,
  LogIn
} from 'lucide-react';

interface HabinoLandingPageProps {
  onEnterAccounting: (module?: string, viewMode?: 'desktop' | 'classic') => void;
  onOpenLogin: () => void;
}

export const HabinoLandingPage: React.FC<HabinoLandingPageProps> = ({
  onEnterAccounting,
  onOpenLogin,
}) => {
  const { currentUser, activeTenant, invoices, checks, bankAccounts } = useAccounting();

  const [landingTheme, setLandingTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('habino_landing_theme') as 'light' | 'dark') || 'light';
  });
  const [activeMarketTab, setActiveMarketTab] = useState<'products' | 'services'>('products');
  const [activeFilterChip, setActiveFilterChip] = useState<string>('همه');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [navScrolled, setNavScrolled] = useState<boolean>(false);

  // Toggle light/dark mode for landing page
  const toggleTheme = () => {
    const nextTheme = landingTheme === 'light' ? 'dark' : 'light';
    setLandingTheme(nextTheme);
    localStorage.setItem('habino_landing_theme', nextTheme);
  };

  // Dynamic metrics from actual store
  const totalBalance = bankAccounts.reduce((sum, b) => sum + (b.balance || 0), 0);
  const pendingChecksCount = checks.filter(c => c.status === 'pending').length;
  const invoiceCount = invoices.length;

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const industries = [
    { icon: '🏠', title: 'لوازم خانگی', type: 'فروشگاهی', guild: 'retail' },
    { icon: '💄', title: 'آرایشی بهداشتی', type: 'فروشگاهی', guild: 'retail' },
    { icon: '💊', title: 'داروخانه و سلامت', type: 'فروشگاهی', guild: 'retail' },
    { icon: '📱', title: 'اینفلوئنسرها و رسانه', type: 'خدماتی', guild: 'service' },
    { icon: '🍽️', title: 'رستوران و کافه', type: 'خدماتی', guild: 'service' },
    { icon: '💇', title: 'سالن زیبایی و سلامت', type: 'خدماتی', guild: 'service' },
    { icon: '🏥', title: 'پزشکی و کلینیک', type: 'خدماتی', guild: 'medical' },
    { icon: '🎓', title: 'آموزشگاه و مدرسان', type: 'خدماتی', guild: 'service' },
    { icon: '🏗️', title: 'املاک و پیمانکاری', type: 'پروژه‌ای', guild: 'engineering' },
    { icon: '📹', title: 'دوربین و امنیت', type: 'پروژه‌ای', guild: 'engineering' },
    { icon: '🌐', title: 'زیرساخت و شبکه', type: 'پروژه‌ای', guild: 'engineering' },
    { icon: '⚖️', title: 'وکالت و مشاوره', type: 'خدماتی', guild: 'service' },
  ];

  const isDark = landingTheme === 'dark';

  return (
    <div
      className={`min-h-screen font-sans overflow-x-hidden transition-colors duration-200 ${
        isDark
          ? 'dark bg-[#0b0f19] text-slate-100 selection:bg-cyan-500 selection:text-black'
          : 'bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white'
      }`}
      dir="rtl"
    >
      {/* Background Subtle Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="grid-pattern"></div>
      </div>

      {/* Main Navbar */}
      <nav
        className={`fixed w-full top-0 z-50 transition-all duration-200 ${
          navScrolled
            ? isDark
              ? 'bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-slate-800 py-3'
              : 'bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200 py-3'
            : isDark
            ? 'bg-[#0b0f19]/80 backdrop-blur-sm border-b border-slate-800/80 py-4'
            : 'bg-slate-50/90 backdrop-blur-sm border-b border-slate-200/80 py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
              <div className="w-10 h-10 ai-gradient rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20">
                <span className="text-white font-black text-xl">ه</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>هابینو</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      isDark
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-700/60'
                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                    }`}
                  >
                    اکوسیستم جامع
                  </span>
                </div>
                <div className={`text-[10px] -mt-1 font-mono font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Habino Business Ecosystem
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-5 text-sm">
              <button
                onClick={() => scrollToSection('accounting-highlight')}
                className={`transition flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg border ${
                  isDark
                    ? 'text-cyan-300 bg-cyan-950/60 border-cyan-800/60 hover:bg-cyan-900/60'
                    : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>حسابداری آماده بازار</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                    isDark ? 'bg-cyan-400 text-slate-950' : 'bg-blue-600 text-white'
                  }`}
                >
                  فعال
                </span>
              </button>

              <button
                onClick={() => scrollToSection('marketplace')}
                className={`transition font-semibold ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-blue-600'
                }`}
              >
                🛍️ بازارچه و امانت‌فروشی
              </button>

              <button
                onClick={() => scrollToSection('tenders')}
                className={`transition font-semibold ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-blue-600'
                }`}
              >
                📋 مناقصات پروژه‌ها
              </button>

              <button
                onClick={() => scrollToSection('cyraflow')}
                className={`transition font-semibold ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-blue-600'
                }`}
              >
                ⚡ دستیار هوش مصنوعی
              </button>

              <button
                onClick={() => scrollToSection('roles-gateway')}
                className={`transition font-semibold ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-blue-600'
                }`}
              >
                🎯 جایگاه‌های اکوسیستم
              </button>
            </div>

            {/* Top Right Controls & CTAs */}
            <div className="flex items-center gap-2.5">
              {/* Theme Toggle (Light / Dark) */}
              <button
                onClick={toggleTheme}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-xs ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden sm:inline">حالت روشن</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-700" />
                    <span className="hidden sm:inline">حالت تیره</span>
                  </>
                )}
              </button>

              {/* Standard Login / Register or Profile Button */}
              <button
                onClick={onOpenLogin}
                className={`border text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
                title={currentUser ? 'مشاهده حساب کاربری' : 'ورود یا ثبت‌نام در سامانه'}
              >
                {currentUser ? (
                  <>
                    <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-[10px]">
                      {currentUser.fullName[0]}
                    </div>
                    <span>{currentUser.fullName}</span>
                  </>
                ) : (
                  <>
                    <LogIn className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                    <span>ورود / ثبت‌نام</span>
                  </>
                )}
              </button>

              {/* Launch Accounting Main Button */}
              <button
                onClick={() => onEnterAccounting()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>ورود به حسابداری</span>
              </button>

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden w-9 h-9 flex items-center justify-center rounded-xl border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
                aria-label="منوی موبایل"
              >
                <Grid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl lg:hidden p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 ai-gradient rounded-lg flex items-center justify-center font-bold text-white">هـ</div>
              <span className="font-black text-white text-lg">هابینو</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                {isDark ? <Sun className="w-3 h-3 text-amber-300" /> : <Moon className="w-3 h-3 text-slate-300" />}
                <span>{isDark ? 'روشن' : 'تیره'}</span>
              </button>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="bg-slate-800 text-white border border-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold"
              >
                بستن
              </button>
            </div>
          </div>

          <div className="space-y-3.5 my-auto">
            <button
              onClick={() => {
                onEnterAccounting();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3.5 text-center font-bold bg-blue-600 rounded-xl text-white shadow-lg"
            >
              🚀 ورود مستقیم به حسابداری هابینو
            </button>
            <button
              onClick={() => {
                onOpenLogin();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 text-center font-bold bg-slate-800 border border-slate-700 rounded-xl text-white"
            >
              🔐 ورود / ثبت‌نام در سامانه
            </button>
            <button
              onClick={() => {
                onEnterAccounting(undefined, 'desktop');
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 text-center font-semibold bg-slate-900 border border-slate-700 rounded-xl text-cyan-300"
            >
              🖥️ ورود به میزکار دسکتاپ (OS)
            </button>
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3 text-sm text-slate-200">
              <button onClick={() => scrollToSection('accounting-highlight')} className="text-right py-1 hover:text-white">
                📊 معرفی ماژول حسابداری بازار
              </button>
              <button onClick={() => scrollToSection('marketplace')} className="text-right py-1 hover:text-white">
                🛍️ بازارچه محصولات و امانت‌فروشی
              </button>
              <button onClick={() => scrollToSection('tenders')} className="text-right py-1 hover:text-white">
                📋 مناقصات و پروژه‌ها
              </button>
              <button onClick={() => scrollToSection('cyraflow')} className="text-right py-1 hover:text-white">
                ⚡ دستیار هوش مصنوعی سایرافلو
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-800">
            نسخه بازار و پروداکشن هابینو ۱۴۰۳
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section id="hero" className="relative min-h-[90vh] flex items-center pt-28 pb-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center max-w-4xl mx-auto">
            {/* Top Roadmap Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 border shadow-xs ${
                isDark
                  ? 'bg-blue-950/80 text-blue-200 border-blue-800/80'
                  : 'bg-blue-100/90 text-blue-950 border-blue-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-cyan-400' : 'bg-blue-600'}`}></span>
              <span>🚀 اکوسیستم هوشمند کسب‌وکار ایران</span>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>|</span>
              <span className={isDark ? 'text-amber-300 font-bold' : 'text-amber-900 font-black'}>
                آماده انتشار در کافه‌بازار (P0)
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
              <span className="gradient-text">هابینو</span>
              <br />
              <span className={`text-2xl sm:text-4xl md:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                از فروشگاه تا مناقصه، همه در یک اکوسیستم
              </span>
            </h1>

            {/* Sub-headline with clear, high-contrast typography */}
            <p
              className={`text-base sm:text-lg md:text-xl mb-8 leading-relaxed max-w-3xl mx-auto font-medium ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              بازارچه‌ای برای{' '}
              <span className={`font-black ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>محصولات فروشگاهی</span>، ویترینی برای{' '}
              <span className={`font-black ${isDark ? 'text-cyan-300' : 'text-blue-800'}`}>تبلیغات مشاغل خدماتی</span>، و سیستم{' '}
              <span className={`font-black ${isDark ? 'text-pink-300' : 'text-purple-800'}`}>مناقصه هوشمند سایرافلو</span> برای پروژه‌ها — همراه با{' '}
              <span className={`font-black ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>سیستم‌عامل جامع حسابداری چندمستأجری</span> هابینو.
            </p>

            {/* Quick Search Bar */}
            <div className="max-w-3xl mx-auto mb-8">
              <div
                className={`rounded-2xl p-2 flex items-center gap-2 border shadow-lg ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 focus-within:border-cyan-400'
                    : 'bg-white border-slate-300 focus-within:border-blue-600'
                }`}
              >
                <div className="flex-1 flex items-center gap-3 px-3">
                  <Search className={`w-5 h-5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="محصول، خدمات، صنف یا ماژول حسابداری مورد نظرتان را جستجو کنید..."
                    className={`w-full bg-transparent py-2.5 focus:outline-none text-xs sm:text-sm font-medium ${
                      isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
                <button
                  onClick={() => onEnterAccounting()}
                  className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-bold whitespace-nowrap text-xs sm:text-sm text-white transition shadow-sm"
                >
                  جستجوی هوشمند ✨
                </button>
              </div>

              {/* Popular keywords */}
              <div
                className={`flex flex-wrap gap-2 mt-3 justify-center text-xs ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>دسترسی مستقیم:</span>
                <button
                  onClick={() => onEnterAccounting('invoices')}
                  className={`font-bold underline underline-offset-4 ${
                    isDark ? 'text-cyan-300 hover:text-white' : 'text-blue-800 hover:text-blue-950'
                  }`}
                >
                  صدور فاکتور رسمی
                </button>
                <span>•</span>
                <button
                  onClick={() => onEnterAccounting('checks')}
                  className={`font-bold underline underline-offset-4 ${
                    isDark ? 'text-cyan-300 hover:text-white' : 'text-blue-800 hover:text-blue-950'
                  }`}
                >
                  چک‌های صیادی
                </button>
                <span>•</span>
                <button
                  onClick={() => onEnterAccounting('installments')}
                  className={`font-bold underline underline-offset-4 ${
                    isDark ? 'text-cyan-300 hover:text-white' : 'text-blue-800 hover:text-blue-950'
                  }`}
                >
                  اقساط و وصول مطالبات
                </button>
                <span>•</span>
                <button
                  onClick={() => onEnterAccounting('synapse')}
                  className={`font-bold underline underline-offset-4 ${
                    isDark ? 'text-cyan-300 hover:text-white' : 'text-blue-800 hover:text-blue-950'
                  }`}
                >
                  دستیار صوتی سایرافلو
                </button>
                <span>•</span>
                <button
                  onClick={() => onEnterAccounting('reports')}
                  className={`font-bold underline underline-offset-4 ${
                    isDark ? 'text-cyan-300 hover:text-white' : 'text-blue-800 hover:text-blue-950'
                  }`}
                >
                  سود و زیان و ترازنامه
                </button>
              </div>
            </div>

            {/* CTA Gateways */}
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center mb-12">
              <button
                onClick={() => onEnterAccounting(undefined, 'desktop')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-7 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg text-sm transition"
              >
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>ورود به میزکار دسکتاپ هابینو</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>

              <button
                onClick={() => onEnterAccounting(undefined, 'classic')}
                className={`px-6 py-3.5 rounded-xl font-bold border transition flex items-center justify-center gap-2 text-sm shadow-xs ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                <span>ورود به پنل وب حسابداری</span>
              </button>

              <button
                onClick={onOpenLogin}
                className={`px-6 py-3.5 rounded-xl font-bold border transition flex items-center justify-center gap-2 text-sm shadow-xs ${
                  isDark
                    ? 'bg-purple-950/50 hover:bg-purple-900/60 text-purple-200 border-purple-800/60'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${isDark ? 'text-purple-300' : 'text-purple-700'}`} />
                <span>ورود مستأجران / انتخاب نقش</span>
              </button>
            </div>

            {/* Three Pillars Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
              <div
                onClick={() => scrollToSection('marketplace')}
                className={`rounded-2xl p-5 border-r-4 border-amber-500 border transition cursor-pointer group shadow-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-amber-400'
                    : 'bg-white border-slate-200 hover:border-amber-500 hover:shadow-md'
                }`}
              >
                <div className="text-3xl mb-2">🛒</div>
                <div
                  className={`font-bold text-base mb-1 transition ${
                    isDark ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-amber-800'
                  }`}
                >
                  محصولات فروشگاهی
                </div>
                <div className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  امانت‌فروشی کالاهای خانگی، آرایشی، داروخانه با تضمین کیفیت و تسویه هابینو
                </div>
              </div>

              <div
                onClick={() => scrollToSection('marketplace')}
                className={`rounded-2xl p-5 border-r-4 border-blue-500 border transition cursor-pointer group shadow-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-cyan-400'
                    : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md'
                }`}
              >
                <div className="text-3xl mb-2">🎯</div>
                <div
                  className={`font-bold text-base mb-1 transition ${
                    isDark ? 'text-white group-hover:text-cyan-300' : 'text-slate-900 group-hover:text-blue-800'
                  }`}
                >
                  تبلیغات خدماتی
                </div>
                <div className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  ویترین مشاغل خدماتی، نصاب‌ها، مشاوران و اینفلوئنسرها با ثبت مستقیم سفارش
                </div>
              </div>

              <div
                onClick={() => scrollToSection('tenders')}
                className={`rounded-2xl p-5 border-r-4 border-purple-500 border transition cursor-pointer group shadow-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-purple-400'
                    : 'bg-white border-slate-200 hover:border-purple-500 hover:shadow-md'
                }`}
              >
                <div className="text-3xl mb-2">📋</div>
                <div
                  className={`font-bold text-base mb-1 transition ${
                    isDark ? 'text-white group-hover:text-pink-300' : 'text-slate-900 group-hover:text-purple-800'
                  }`}
                >
                  مناقصه پروژه‌ها
                </div>
                <div className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  دوربین مداربسته، شبکه، برق و ساختمان با تبدیل خودکار پروژه به مناقصه توسط سایرافلو
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPECIAL ACTIVE ROADMAP SHOWCASE: HABINO ACCOUNTING */}
      <section id="accounting-highlight" className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-xl border ${
              isDark
                ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-[#0c0d24] border-cyan-500/30'
                : 'bg-gradient-to-b from-blue-50/60 via-indigo-50/30 to-white border-blue-200/90'
            }`}
          >
            <div className="relative z-10">
              <div
                className={`flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-8 border-b ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <div>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 border ${
                      isDark
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                    <span>ماژول رسمی فعال: سیستم‌عامل جامع حسابداری هابینو (نسخه بازار)</span>
                  </div>
                  <h2 className={`text-2xl sm:text-4xl font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    هسته یکپارچه حسابداری خدماتی و پروژه‌ای هابینو
                  </h2>
                  <p className={`text-sm sm:text-base mt-2 max-w-2xl leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
                    مستأجر فعال کنونی:{' '}
                    <span className={`font-black ${isDark ? 'text-cyan-300' : 'text-blue-900'}`}>
                      {activeTenant?.name || 'شرکت فنی مهندسی هابینو'}
                    </span>{' '}
                    | نقش جاری:{' '}
                    <span className={`font-black ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                      {currentUser ? ROLE_DETAILS_FA[currentUser.role]?.title : 'کاربر پیش‌فرض (مالک مستأجر)'}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => onEnterAccounting()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md transition"
                  >
                    <span>اجرای نرم‌افزار حسابداری</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onOpenLogin}
                    className={`px-5 py-3 rounded-xl font-bold text-sm border transition shadow-xs ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    تغییر نقش سازمانی (RBAC)
                  </button>
                </div>
              </div>

              {/* Real-time stats grid from actual system state */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
                <div
                  className={`rounded-2xl p-4 border text-center shadow-xs ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className={`text-xs block mb-1 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    فاکتورهای ثبت‌شده
                  </span>
                  <span className="text-2xl sm:text-3xl font-black gradient-text">{invoiceCount}</span>
                  <span className={`text-[10px] block mt-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    با قالب‌های رسمی و مدرن
                  </span>
                </div>

                <div
                  className={`rounded-2xl p-4 border text-center shadow-xs ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className={`text-xs block mb-1 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    چک‌های صیادی در گردش
                  </span>
                  <span className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                    {pendingChecksCount}
                  </span>
                  <span className={`text-[10px] block mt-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    رهگیری سررسید و برگشتی
                  </span>
                </div>

                <div
                  className={`rounded-2xl p-4 border text-center shadow-xs ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className={`text-xs block mb-1 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    موجودی نقد حساب‌ها
                  </span>
                  <span className={`text-xl sm:text-2xl font-black ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
                    {totalBalance.toLocaleString('fa-IR')} <span className="text-[10px]">تومان</span>
                  </span>
                  <span className={`text-[10px] block mt-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    تراز دفتر کل همگام
                  </span>
                </div>

                <div
                  className={`rounded-2xl p-4 border text-center shadow-xs ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className={`text-xs block mb-1 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    ایجنت‌های هوش مالی
                  </span>
                  <span className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
                    ۵ ایجنت
                  </span>
                  <span className={`text-[10px] block mt-1 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    سیناپس، سایرافلو و ممیز
                  </span>
                </div>
              </div>

              {/* Interactive Quick Launch Cards to specific modules */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => onEnterAccounting('invoices')}
                  className={`p-3.5 rounded-xl border text-right transition group shadow-xs ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  <FileText className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>صدور فاکتور</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>چاپ رسمی ۴ قالبه</div>
                </button>

                <button
                  onClick={() => onEnterAccounting('checks')}
                  className={`p-3.5 rounded-xl border text-right transition group shadow-xs ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-purple-400'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>چک‌های صیادی</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ثبت و هشدارهای تقویمی</div>
                </button>

                <button
                  onClick={() => onEnterAccounting('installments')}
                  className={`p-3.5 rounded-xl border text-right transition group shadow-xs ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-amber-400'
                  }`}
                >
                  <Layers className="w-5 h-5 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>مدیریت اقساط</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>جدول وصولی دوره‌ای</div>
                </button>

                <button
                  onClick={() => onEnterAccounting('synapse')}
                  className={`p-3.5 rounded-xl border text-right transition group shadow-xs ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-cyan-400'
                  }`}
                >
                  <Bot className="w-5 h-5 text-cyan-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>سایرافلو صوتی</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>دستیار گفتگوی صوتی</div>
                </button>

                <button
                  onClick={() => onEnterAccounting('user_management')}
                  className={`p-3.5 rounded-xl border text-right transition group shadow-xs ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>مدیریت اعضا (RBAC)</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>تفکیک ۵ نقش سازمان</div>
                </button>

                <button
                  onClick={() => onEnterAccounting('reports')}
                  className={`p-3.5 rounded-xl border text-right transition group shadow-xs ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-rose-400'
                  }`}
                >
                  <BarChart3 className="w-5 h-5 text-rose-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>سود و زیان (P&L)</div>
                  <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ترازنامه استاندارد</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INDUSTRIES SECTION - WHO CAN BE A TENANT */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div
              className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-3 border ${
                isDark ? 'bg-blue-950/80 text-blue-200 border-blue-800/70' : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              🏪 هر صنفی می‌تواند مستأجر هابینو باشد
            </div>
            <h2 className={`text-3xl sm:text-5xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              از <span className="gradient-text">فروشگاه</span> تا <span className="gradient-text">خدمات و مهندسی</span>
            </h2>
            <p className={`text-sm sm:text-base max-w-2xl mx-auto font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              هسته حسابداری و استراتژی صنفی هابینو، کدینگ حساب‌ها و دفاتر کل را متناسب با صنف شما تنظیم می‌کند
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {industries.map((ind, i) => (
              <div
                key={i}
                onClick={() => onEnterAccounting()}
                className={`rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition border shadow-xs ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="text-3xl sm:text-4xl mb-2">{ind.icon}</div>
                <div className={`font-bold text-xs sm:text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {ind.title}
                </div>
                <div className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ind.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKETPLACE SECTION - PRODUCTS & ADVERTISING */}
      <section id="marketplace" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div
              className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-3 border ${
                isDark ? 'bg-blue-950/80 text-blue-200 border-blue-800/70' : 'bg-blue-100 text-blue-900 border-blue-300'
              }`}
            >
              🛍️ دروازه ورود و عرضه بازارچه هابینو
            </div>
            <h2 className={`text-3xl sm:text-5xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="gradient-text">بازارچه هابینو</span>
            </h2>
            <p className={`text-sm sm:text-base max-w-2xl mx-auto font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              هر کاربری از این نقطه با سطح دسترسی خود به داشبورد اختصاصی‌اش یا محصولات بازارچه وارد می‌شود
            </p>
          </div>

          {/* Marketplace Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <button
              onClick={() => setActiveMarketTab('products')}
              className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition border ${
                activeMarketTab === 'products'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              🛒 محصولات فروشگاهی
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isDark ? 'bg-amber-950 text-amber-300 border border-amber-700/50' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                امانت‌فروشی
              </span>
            </button>
            <button
              onClick={() => setActiveMarketTab('services')}
              className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition border ${
                activeMarketTab === 'services'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              🎯 ویترین تبلیغات خدماتی
            </button>
          </div>

          {/* PRODUCTS TAB (CONSIGNMENT SYSTEM) */}
          {activeMarketTab === 'products' && (
            <div className="space-y-8">
              <div
                className={`rounded-2xl p-6 border-r-4 border-amber-500 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 product-gradient rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-2xl text-white">🤝</span>
                  </div>
                  <div>
                    <h3 className={`text-lg font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      سیستم امانت‌فروشی هابینو
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      محصولات مستأجران فروشگاهی به صورت امانت در بازارچه عرضه می‌شود. هابینو امنیت مالی و کیفیت کالا را تضمین می‌کند.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      isDark
                        ? 'bg-amber-950/60 text-amber-300 border-amber-600/50'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    🛡️ تضمین اصالت
                  </span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      isDark
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    💰 پرداخت امن امانی
                  </span>
                </div>
              </div>

              {/* Product Category Filter Chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {['همه', 'لوازم خانگی', 'آرایشی بهداشتی', 'داروخانه', 'موبایل و دیجیتال', 'پوشاک'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setActiveFilterChip(chip)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition border ${
                      activeFilterChip === chip
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-sm'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {chip === 'همه' ? '🔥 همه' : chip}
                  </button>
                ))}
              </div>

              {/* Products Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Product 1 */}
                <div
                  className={`rounded-2xl overflow-hidden border transition shadow-sm hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`relative h-44 flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <span className="text-5xl">🏠</span>
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                      🤝 امانت
                    </div>
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                      ✓ تضمین هابینو
                    </div>
                  </div>
                  <div className="p-4">
                    <div className={`flex items-center gap-2 mb-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        خ
                      </span>
                      <span>خانگی‌مارکت</span>
                      <span className="text-amber-500 mr-auto font-bold">★ ۴.۹</span>
                    </div>
                    <h4 className={`font-bold text-sm mb-2 line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      جاروبرقی صنعتی پارس‌خزر
                    </h4>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <div className={`text-[11px] line-through font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>۸,۵۰۰,۰۰۰</div>
                        <div className={`font-black text-sm ${isDark ? 'text-cyan-300' : 'text-blue-900'}`}>۷,۲۰۰,۰۰۰ تومان</div>
                      </div>
                      <button
                        onClick={() => onEnterAccounting('invoices')}
                        className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-xs transition"
                        title="ثبت در فاکتور فروش هابینو"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product 2 */}
                <div
                  className={`rounded-2xl overflow-hidden border transition shadow-sm hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`relative h-44 flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <span className="text-5xl">💄</span>
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                      🤝 امانت
                    </div>
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                      ✓ تضمین هابینو
                    </div>
                  </div>
                  <div className="p-4">
                    <div className={`flex items-center gap-2 mb-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className="w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        آ
                      </span>
                      <span>آرایشی رویال</span>
                      <span className="text-amber-500 mr-auto font-bold">★ ۴.۸</span>
                    </div>
                    <h4 className={`font-bold text-sm mb-2 line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      ست کامل مراقبت پوست اورآل
                    </h4>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <div className={`font-black text-sm ${isDark ? 'text-cyan-300' : 'text-blue-900'}`}>۱,۸۵۰,۰۰۰ تومان</div>
                      </div>
                      <button
                        onClick={() => onEnterAccounting('invoices')}
                        className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-xs transition"
                        title="ثبت در فاکتور فروش هابینو"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product 3 */}
                <div
                  className={`rounded-2xl overflow-hidden border transition shadow-sm hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`relative h-44 flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <span className="text-5xl">💊</span>
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                      🤝 امانت
                    </div>
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                      ✓ تضمین هابینو
                    </div>
                  </div>
                  <div className="p-4">
                    <div className={`flex items-center gap-2 mb-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        د
                      </span>
                      <span>داروخانه دکتر احمدی</span>
                      <span className="text-amber-500 mr-auto font-bold">★ ۵.۰</span>
                    </div>
                    <h4 className={`font-bold text-sm mb-2 line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      مکمل‌های تقویت پوست و مو
                    </h4>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <div className={`font-black text-sm ${isDark ? 'text-cyan-300' : 'text-blue-900'}`}>۴۸۰,۰۰۰ تومان</div>
                      </div>
                      <button
                        onClick={() => onEnterAccounting('invoices')}
                        className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-xs transition"
                        title="ثبت در فاکتور فروش هابینو"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product 4 */}
                <div
                  className={`rounded-2xl overflow-hidden border transition shadow-sm hover:shadow-md ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`relative h-44 flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <span className="text-5xl">📱</span>
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                      🤝 امانت
                    </div>
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
                      ✓ تضمین هابینو
                    </div>
                  </div>
                  <div className="p-4">
                    <div className={`flex items-center gap-2 mb-2 text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span className="w-5 h-5 bg-cyan-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        م
                      </span>
                      <span>موبایل‌سیتی</span>
                      <span className="text-amber-500 mr-auto font-bold">★ ۴.۷</span>
                    </div>
                    <h4 className={`font-bold text-sm mb-2 line-clamp-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      گوشی سامسونگ گلکسی S24
                    </h4>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <div className={`text-[11px] line-through font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>۴۵,۰۰۰,۰۰۰</div>
                        <div className={`font-black text-sm ${isDark ? 'text-cyan-300' : 'text-blue-900'}`}>۴۲,۵۰۰,۰۰۰ تومان</div>
                      </div>
                      <button
                        onClick={() => onEnterAccounting('invoices')}
                        className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-xs transition"
                        title="ثبت در فاکتور فروش هابینو"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SERVICES TAB (ADVERTISING) */}
          {activeMarketTab === 'services' && (
            <div className="space-y-8">
              <div
                className={`rounded-2xl p-6 border-r-4 border-blue-500 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-100'
                    : 'bg-blue-50/80 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 service-gradient rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-2xl text-white">📢</span>
                  </div>
                  <div>
                    <h3 className={`text-lg font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      ویترین تبلیغات مشاغل خدماتی هابینو
                    </h3>
                    <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      نصاب‌ها، اینفلوئنسرها، مشاوران، کلینیک‌ها و ارائه‌دهندگان خدمات، خدمات خود را مستقیم معرفی می‌کنند.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onEnterAccounting('projects')}
                  className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-sm whitespace-nowrap transition"
                >
                  ثبت آگهی و مناقصه خدماتی
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  className={`rounded-2xl p-5 border-r-4 border-blue-500 border shadow-xs ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 service-gradient rounded-xl flex items-center justify-center shrink-0 text-xl text-white">
                      🔧
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        استاد محمدی - نصاب کابینت
                      </h4>
                      <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        ۱۵ سال سابقه • ۳۲۰ پروژه موفق
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs mb-4 leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    نصب و اجرای کابینت، کمد دیواری و دکوراسیون داخلی با متریال باکیفیت و ثبت قرارداد رسمی در هابینو.
                  </p>
                  <button
                    onClick={() => onEnterAccounting('projects')}
                    className="w-full text-xs bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-bold text-white transition shadow-xs"
                  >
                    درخواست استعلام قیمت و قرارداد
                  </button>
                </div>

                <div
                  className={`rounded-2xl p-5 border-r-4 border-purple-500 border shadow-xs ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 project-gradient rounded-xl flex items-center justify-center shrink-0 text-xl text-white">
                      📱
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        سارا کریمی - اینفلوئنسر تکنولوژی
                      </h4>
                      <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        ۱۲۰K دنبال‌کننده • ۸۵ همکاری
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs mb-4 leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    تبلیغات هدفمند و نقد و بررسی محصولات دیجیتال و گجت‌ها با تسویه حساب امن و رسمی در هابینو.
                  </p>
                  <button
                    onClick={() => onEnterAccounting('projects')}
                    className="w-full text-xs bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-bold text-white transition shadow-xs"
                  >
                    درخواست همکاری رسانه‌ای
                  </button>
                </div>

                <div
                  className={`rounded-2xl p-5 border-r-4 border-emerald-500 border shadow-xs ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0 text-xl text-white">
                      🏥
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        کلینیک دندانپزشکی نوین
                      </h4>
                      <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        ۸ متخصص • ۱۲ سال سابقه
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs mb-4 leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    خدمات تخصصی ایمپلنت و ارتودنسی با شرایط اقساطی متصل به ماژول اقساط هابینو حسابداری.
                  </p>
                  <button
                    onClick={() => onEnterAccounting('installments')}
                    className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 py-2 rounded-lg font-bold text-white transition shadow-xs"
                  >
                    مشاهده پلن‌های اقساط و نوبت
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TENDERS SECTION - SMART CYRAFLOW TENDER */}
      <section id="tenders" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div
              className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-3 border ${
                isDark ? 'bg-blue-950/80 text-blue-200 border-blue-800/70' : 'bg-blue-100 text-blue-900 border-blue-300'
              }`}
            >
              📋 مناقصات هوشمند سایرافلو
            </div>
            <h2 className={`text-3xl sm:text-5xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              پروژه دارید؟ <span className="gradient-text">سایرافلو</span> آن را به مناقصه تبدیل می‌کند
            </h2>
            <p className={`text-sm sm:text-base max-w-3xl mx-auto font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              برای مشاغل پروژه‌ای نظیر{' '}
              <span className={`font-bold ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>نصب دوربین مداربسته</span>،{' '}
              <span className={`font-bold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>شبکه‌های کامپیوتری</span> و ساختمانی، سایرافلو نیازمندی‌ها را به RFP و مناقصه استاندارد تبدیل می‌کند
            </p>
          </div>

          {/* Process 4 Steps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div
              className={`rounded-2xl p-5 text-center border shadow-xs ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">
                ۱
              </div>
              <div className={`font-bold text-xs sm:text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ثبت پروژه
              </div>
              <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>کارفرما نیاز را شرح می‌دهد</div>
            </div>

            <div
              className={`rounded-2xl p-5 text-center border shadow-xs ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">
                ۲
              </div>
              <div className={`font-bold text-xs sm:text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                تنظیم مناقصه
              </div>
              <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>سایرافلو هوشمندانه RFP می‌سازد</div>
            </div>

            <div
              className={`rounded-2xl p-5 text-center border shadow-xs ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">
                ۳
              </div>
              <div className={`font-bold text-xs sm:text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ارسال به مجریان
              </div>
              <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>پیشنهادات فنی و مالی جمع‌آوری می‌شود</div>
            </div>

            <div
              className={`rounded-2xl p-5 text-center border shadow-xs ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">
                ۴
              </div>
              <div className={`font-bold text-xs sm:text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                اتصال به حسابداری
              </div>
              <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>پیش‌پرداخت و فاکتور سند می‌خورد</div>
            </div>
          </div>

          {/* Active Tenders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div
              className={`rounded-2xl p-6 border shadow-sm ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 project-gradient rounded-xl flex items-center justify-center text-xl text-white">
                    📹
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      نصب دوربین مداربسته ساختمان اداری
                    </h4>
                    <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>۳۲ دوربین • کابل‌کشی و سوئیچ</div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    isDark ? 'bg-rose-950/80 text-rose-300 border-rose-700/60' : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}
                >
                  ⚡ فوری
                </span>
              </div>

              <div
                className={`grid grid-cols-3 gap-2 text-center p-3 rounded-xl mb-4 text-xs border ${
                  isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <span className={`text-[10px] block font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>بودجه</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>۱۸۰ - ۲۵۰ م</span>
                </div>
                <div>
                  <span className={`text-[10px] block font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>پیشنهادها</span>
                  <span className="font-bold gradient-text">۱۲ شرکت</span>
                </div>
                <div>
                  <span className={`text-[10px] block font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>مهلت</span>
                  <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>۳ روز</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>تهران • مستأجر پروژه‌محور</span>
                <button
                  onClick={() => onEnterAccounting('projects')}
                  className="text-xs bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold text-white transition shadow-xs"
                >
                  ارسال پیشنهاد قیمت
                </button>
              </div>
            </div>

            <div
              className={`rounded-2xl p-6 border shadow-sm ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 service-gradient rounded-xl flex items-center justify-center text-xl text-white">
                    🌐
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      راه‌اندازی زیرساخت شبکه شرکت ۵۰ نفره
                    </h4>
                    <div className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>سرور • فایروال • اکتیو دایرکتوری</div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    isDark
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}
                >
                  🟢 فعال
                </span>
              </div>

              <div
                className={`grid grid-cols-3 gap-2 text-center p-3 rounded-xl mb-4 text-xs border ${
                  isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <span className={`text-[10px] block font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>بودجه</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>۳۵۰ - ۵۰۰ م</span>
                </div>
                <div>
                  <span className={`text-[10px] block font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>پیشنهادها</span>
                  <span className="font-bold gradient-text">۸ شرکت</span>
                </div>
                <div>
                  <span className={`text-[10px] block font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>مهلت</span>
                  <span className={`font-bold ${isDark ? 'text-cyan-300' : 'text-blue-800'}`}>۷ روز</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>اصفهان • زیرساخت شبکه</span>
                <button
                  onClick={() => onEnterAccounting('projects')}
                  className="text-xs bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold text-white transition shadow-xs"
                >
                  ارسال پیشنهاد قیمت
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CYRAFLOW AI SECTION */}
      <section id="cyraflow" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div
                className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-4 border ${
                  isDark ? 'bg-blue-950/80 text-blue-200 border-blue-800/70' : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                ⚡ موتور هوش مصنوعی هابینو
              </div>
              <h2 className={`text-3xl sm:text-5xl font-black mb-4 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="gradient-text">سایرافلو (SiraFlow)</span>
                <br />
                <span className="text-2xl sm:text-3xl">سایت‌ساز، دستیار صوتی و مغز متفکر کسب‌وکار</span>
              </h2>
              <p className={`text-sm sm:text-base mb-6 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                سایرافلو به هسته حسابداری و CMS متصل است: با صوت و فرمان شما فاکتور صادر می‌کند، ترازنامه را می‌خواند، مناقصه تنظیم می‌کند و با مشتریان شما گفتگو می‌کند.
              </p>

              <div className="space-y-4 mb-8">
                <div
                  className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-xs ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm">
                    🎙️
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      دستیار گفتگوی صوتی ۲۴/۷
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      فرمان صوتی برای صدور فاکتور و گزارش مالی بدون نیاز به تایپ
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-xs ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm">
                    🌐
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      سایت‌ساز خودکار صنفی
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      تولید سریع پرتال اختصاصی متصل به انبار، حسابداری و درگاه پرداخت
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-xs ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm">
                    🧠
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      هماهنگ با ۵ ایجنت خودمختار
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      تیم ممیزی، پیش‌بینی نقدینگی، ثبت خودکار سند و تحلیل تراز
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onEnterAccounting('synapse')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition"
              >
                <Bot className="w-4 h-4" />
                <span>شروع مکالمه با سایرافلو در حسابداری ✨</span>
              </button>
            </div>

            {/* AI Interactive Chat Mockup with crisp contrast */}
            <div
              className={`rounded-3xl p-6 border shadow-xl ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className={`flex items-center justify-between pb-4 border-b mb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-xs">
                    س
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      سایرافلو صوتی (SiraFlow AI)
                    </div>
                    <div className={`text-[10px] flex items-center gap-1 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      متصل به دیتابیس حسابداری هابینو
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onEnterAccounting('synapse')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  احضار صوتی
                </button>
              </div>

              <div className="space-y-3.5 text-xs leading-relaxed">
                <div
                  className={`p-3.5 rounded-2xl rounded-tr-none border ${
                    isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  سلام مهندس فرید! هسته حسابداری هابینو آماده است. آخرین فاکتور صادره مربوط به پروژه دوربین مداربسته بود. دستور بعدی شما چیست؟
                </div>

                <div className="bg-blue-600 p-3.5 rounded-2xl rounded-tl-none text-white mr-8 shadow-xs font-medium">
                  وضعیت چک‌های سررسید هفته آینده و مانده نقدینگی ترازنامه رو بگو
                </div>

                <div
                  className={`p-3.5 rounded-2xl rounded-tr-none border ${
                    isDark
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-blue-50/80 text-slate-800 border-blue-200'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 font-bold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تحلیل نقدینگی هوشمند سیناپس:</span>
                  </div>
                  موجودی نقد شما{' '}
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {totalBalance.toLocaleString('fa-IR')} تومان
                  </span>{' '}
                  است. تعداد{' '}
                  <span className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                    {pendingChecksCount} فقره چک
                  </span>{' '}
                  در جریان سررسید است که نسبت نقدینگی در محدوده امن ۱.۶ قرار دارد.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE ROLES & ACCESS GATEWAY */}
      <section id="roles-gateway" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div
              className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-3 border ${
                isDark ? 'bg-blue-950/80 text-blue-200 border-blue-800/70' : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              🎯 سه جایگاه در اکوسیستم هابینو
            </div>
            <h2 className={`text-3xl sm:text-5xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              جایگاه خود را در <span className="gradient-text">هابینو</span> انتخاب کنید
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Buyer */}
            <div
              className={`rounded-2xl p-6 border flex flex-col justify-between shadow-sm hover:shadow-md transition ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="w-12 h-12 product-gradient rounded-xl flex items-center justify-center text-2xl mb-4 text-white">
                  🛍️
                </div>
                <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  خریدار و کارفرما
                </h3>
                <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  خرید محصولات امانتی از بازارچه و ثبت رایگان پروژه جهت تبدیل خودکار به مناقصه.
                </p>
                <ul className={`space-y-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-2">✓ ثبت‌نام رایگان در اکوسیستم</li>
                  <li className="flex items-center gap-2">✓ تضمین بازگشت وجه ۷ روزه</li>
                  <li className="flex items-center gap-2">✓ ثبت درخواست استعلام قیمت</li>
                </ul>
              </div>
              <button
                onClick={() => scrollToSection('marketplace')}
                className={`mt-6 w-full py-2.5 rounded-xl font-bold transition text-xs border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                ورود به بازارچه به عنوان خریدار
              </button>
            </div>

            {/* Tenant */}
            <div
              className={`rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden border-2 shadow-md ${
                isDark
                  ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-cyan-500/60'
                  : 'bg-gradient-to-b from-blue-50/70 via-white to-white border-blue-500'
              }`}
            >
              <div className="absolute top-3 left-3 bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                نسخه فعال بازار
              </div>
              <div>
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl mb-4 text-white shadow-xs">
                  🏪
                </div>
                <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  مستأجر و صاحب کسب‌وکار
                </h3>
                <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  راه‌اندازی کامل حسابداری، صدور فاکتور، چک صیادی، اقساط و عرضه خدمات در بازارچه.
                </p>
                <ul className={`space-y-2 text-xs ${isDark ? 'text-slate-200' : 'text-slate-800 font-medium'}`}>
                  <li className="flex items-center gap-2">✓ سیستم‌عامل حسابداری متناسب با صنف</li>
                  <li className="flex items-center gap-2">✓ ۵ سطح دسترسی مجزا برای پرسنل (RBAC)</li>
                  <li className="flex items-center gap-2">✓ دریافت درآمد در کیف پول و کارتخوان</li>
                </ul>
              </div>
              <button
                onClick={() => onEnterAccounting()}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition"
              >
                ورود مستقیم به حسابداری هابینو
              </button>
            </div>

            {/* Developer */}
            <div
              className={`rounded-2xl p-6 border flex flex-col justify-between shadow-sm hover:shadow-md transition ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="w-12 h-12 project-gradient rounded-xl flex items-center justify-center text-2xl mb-4 text-white">
                  👨‍💻
                </div>
                <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  توسعه‌دهنده و مهندس
                </h3>
                <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  ساخت افزونه، قالب و وب‌سرویس و فروش در استور افزونه‌های هابینو با تسویه خودکار.
                </p>
                <ul className={`space-y-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-2">✓ وب‌سرویس Open Commerce و Webhooks</li>
                  <li className="flex items-center gap-2">✓ ساخت اکستنشن برای صنف‌های خاص</li>
                  <li className="flex items-center gap-2">✓ پروتکل غیرمتمرکز هویت W3C DID</li>
                </ul>
              </div>
              <button
                onClick={() => onEnterAccounting('open_commerce')}
                className={`mt-6 w-full py-2.5 rounded-xl font-bold transition text-xs border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                استودیو وب‌سرویس و توسعه‌دهندگان
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-20 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
            className={`rounded-3xl p-8 sm:p-14 border relative overflow-hidden shadow-2xl ${
              isDark
                ? 'bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-cyan-500/30 text-white'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white border-blue-400'
            }`}
          >
            <div className="w-16 h-16 mx-auto bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg mb-6 border border-white/20">
              <span className="text-3xl">🚀</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
              از حسابداری هابینو شروع کنید
            </h2>
            <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto mb-8 leading-relaxed font-medium">
              چه به عنوان خریدار، چه صاحب کسب‌وکار خدماتی یا فروشگاهی، هابینو ابزار همه‌کاره بهره‌وری شماست.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onEnterAccounting(undefined, 'desktop')}
                className="bg-white hover:bg-slate-100 text-slate-900 px-8 py-3.5 rounded-xl font-black text-sm shadow-lg transition"
              >
                ورود به میزکار دسکتاپ هابینو
              </button>
              <button
                onClick={onOpenLogin}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-7 py-3.5 rounded-xl font-bold text-sm transition"
              >
                ورود و تست نقش‌های سازمانی (RBAC)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-16 pb-8 border-t relative z-10 bg-slate-950 text-slate-400 border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 ai-gradient rounded-xl flex items-center justify-center font-bold text-white text-lg">
                  هـ
                </div>
                <span className="text-2xl font-black text-white">هابینو</span>
              </div>
              <p className="text-xs text-slate-300 max-w-sm leading-relaxed mb-4">
                اکوسیستم هوشمند کسب‌وکار ایران. سیستم‌عامل جامع حسابداری چندمستأجری، بازارچه امانت‌فروشی، مناقصات هوشمند سایرافلو و کیف پول یکپارچه.
              </p>
              <div className="text-xs text-cyan-300 font-mono">
                نسخه نقشه راه: m-baz-01 | چارک ۱۴۰۳-Q3
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs text-white mb-3">حسابداری هابینو</h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>
                  <button onClick={() => onEnterAccounting('invoices')} className="hover:text-white transition">
                    فاکتور رسمی
                  </button>
                </li>
                <li>
                  <button onClick={() => onEnterAccounting('checks')} className="hover:text-white transition">
                    چک‌های صیادی
                  </button>
                </li>
                <li>
                  <button onClick={() => onEnterAccounting('installments')} className="hover:text-white transition">
                    اقساط و وصولی
                  </button>
                </li>
                <li>
                  <button onClick={() => onEnterAccounting('reports')} className="hover:text-white transition">
                    سود و زیان و تراز
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs text-white mb-3">هوش مصنوعی</h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>
                  <button onClick={() => onEnterAccounting('synapse')} className="hover:text-white transition">
                    دستیار صوتی سایرافلو
                  </button>
                </li>
                <li>
                  <button onClick={() => onEnterAccounting('agents_studio')} className="hover:text-white transition">
                    استودیو ۵ ایجنت
                  </button>
                </li>
                <li>
                  <button onClick={() => onEnterAccounting('diagnostics')} className="hover:text-white transition">
                    عیب‌یاب و تراز
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs text-white mb-3">بازارچه و پروژه‌ها</h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>
                  <button onClick={() => scrollToSection('marketplace')} className="hover:text-white transition">
                    محصولات امانت‌فروشی
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('tenders')} className="hover:text-white transition">
                    مناقصات فعال
                  </button>
                </li>
                <li>
                  <button onClick={() => onEnterAccounting('open_commerce')} className="hover:text-white transition">
                    وب‌سرویس و API
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-xs text-white mb-3">ورود و امنیت</h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li>
                  <button onClick={onOpenLogin} className="hover:text-white transition">
                    ورود مستأجران
                  </button>
                </li>
                <li>
                  <button onClick={() => onEnterAccounting('user_management')} className="hover:text-white transition">
                    ماتریس RBAC
                  </button>
                </li>
                <li>
                  <button onClick={() => onEnterAccounting('backup')} className="hover:text-white transition">
                    پشتیبان‌گیری آفلاین
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="h-px bg-slate-800 mb-6" />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <div>© ۱۴۰۳ - ۲۰۲۶ هابینو. تمام حقوق برای اکوسیستم هوشمند کسب‌وکار هابینو محفوظ است.</div>
            <div className="flex gap-4">
              <span className="text-emerald-400 font-semibold">تضمین امنیت هابینو</span>
              <span>•</span>
              <span className="text-cyan-300 font-semibold">PWA & کافه‌بازار TWA آماده</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
