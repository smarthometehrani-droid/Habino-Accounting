import React, { useState } from 'react';
import { useAccounting } from '../lib/store';
import { SubscriptionPlanType, AddonItem } from '../types';
import { PLAN_LIMITS, HABINO_ADDONS } from '../lib/authEngine';
import { formatCurrency } from '../lib/currencyUtils';
import {
  Crown,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Zap,
  Lock,
  X,
  CreditCard,
  Key,
  Users,
  Building2,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  PackagePlus,
  Compass,
  Boxes,
  Bot,
  FileSearch,
  Truck,
  Network,
  Check,
  Rocket
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'plans' | 'addons';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, initialTab = 'plans' }) => {
  const {
    activeTenant,
    currentUser,
    upgradeTenantSubscription,
    activateAddon,
    hasAddon,
    license
  } = useAccounting();

  const [activeTab, setActiveTab] = useState<'plans' | 'addons'>(initialTab);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('professional');
  const [activationMethod, setActivationMethod] = useState<'online' | 'serial'>('online');
  const [serialInput, setSerialInput] = useState<string>('');
  const [addonSerialInputs, setAddonSerialInputs] = useState<Record<string, string>>({});
  const [activeAddonSerialId, setActiveAddonSerialId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [addonCategoryFilter, setAddonCategoryFilter] = useState<'all' | 'operational' | 'future_strategic'>('all');

  if (!isOpen) return null;

  const subscription = activeTenant?.subscription;
  const isTrial = subscription?.status === 'trial' || license.tier === 'trial';
  const remainingDays = subscription?.trialDaysRemaining ?? 30;
  const activeAddonsList = subscription?.activeAddons || [];

  const planOptions: {
    id: SubscriptionPlanType;
    title: string;
    badge: string;
    price: number;
    description: string;
    highlighted?: boolean;
    features: string[];
  }[] = [
    {
      id: 'starter',
      title: 'سطح ۱: پکیج پایه (Starter)',
      badge: 'دوره ۳۰ روز هدیه',
      price: 980000,
      description: 'مناسب برای فریلنسرها و دفاتر کوچک با حداکثر ۲ کاربر',
      features: [
        'صدور نامحدود فاکتورهای ۴ قالبه رسمی',
        'مدیریت اشخاص، دریافت و پرداخت نقدی',
        'پشتیبان‌گیری کامل محلی و همگام‌سازی ابری',
        'دسترسی ۳۰ روزه رایگان برای کاربران تازه ثبت‌نام‌شده'
      ]
    },
    {
      id: 'professional',
      title: 'سطح ۲: پکیج حرفه‌ای (Professional)',
      badge: 'پرفروش‌ترین دفاتر فنی و کارگاه‌ها',
      price: 1850000,
      highlighted: true,
      description: 'ویژه دفاتر مهندسی، کارگاه‌ها، پیمانکاران و خدمات صنف با چک و اقساط',
      features: [
        'کلیه امکانات پکیج پایه هابینو',
        'سامانه چک‌های صیادی ۱۶ رقمی و اقساط ماهانه',
        'حسابداری پروژه‌ها و بهای تمام‌شده برچسبی',
        'انبارداری و فرم‌ساز اختصاصی اصناف',
        'مدیریت دسترسی پرسنل تا ۱۰ کاربر همزمان',
        'پشتیبانی اولویت‌دار تیکتی و آنلاین'
      ]
    },
    {
      id: 'enterprise',
      title: 'سطح ۳: سازمانی نامحدود + سیناپس (Enterprise)',
      badge: 'کامل‌ترین نسخه با هوش صوتی',
      price: 3900000,
      description: 'دسترسی نامحدود به ارکستراتور، دفاتر دوبل، حقوق و دستمزد و هوش صوتی سیناپس',
      features: [
        'کلیه امکانات نسخه حرفه‌ای هابینو',
        'دستیار صوتی هوشمند بلادرنگ سیناپس (Gemini Live CFO)',
        'دفتر روزنامه دوبل، تراز آزمایشی و ترازنامه متوازن',
        'ماژول حقوق و دستمزد و دیسکت بیمه تأمین اجتماعی',
        'کاربران نامحدود با تفکیک نقش‌های ۵ گانه RBAC',
        'عیب‌یاب جامع تراز مالی و گزارش‌های سود و زیان دوره'
      ]
    }
  ];

  const handleUpgrade = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(true);

    try {
      let keyToUse: string | undefined = undefined;
      if (activationMethod === 'serial') {
        if (!serialInput.trim()) {
          setErrorMsg('لطفاً کد سریال فعال‌سازی را وارد کنید.');
          setIsProcessing(false);
          return;
        }
        keyToUse = serialInput.trim().toUpperCase();
      } else {
        // Online Mock Payment
        await new Promise(resolve => setTimeout(resolve, 800));
        keyToUse = `HABINO-${selectedPlan.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}-PAID`;
      }

      const res = await upgradeTenantSubscription(selectedPlan, keyToUse);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در ارتقای اشتراک.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActivateAddon = async (addon: AddonItem, method: 'instant' | 'serial') => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(true);

    try {
      let serialKey: string | undefined = undefined;
      if (method === 'serial') {
        const inputKey = addonSerialInputs[addon.id]?.trim();
        if (!inputKey) {
          setErrorMsg(`لطفاً کد سریال فعال‌سازی برای افزونه «${addon.title}» را وارد کنید.`);
          setIsProcessing(false);
          return;
        }
        serialKey = inputKey.toUpperCase();
      } else {
        await new Promise(resolve => setTimeout(resolve, 600));
        serialKey = `ADDON-${addon.id.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}-PAID`;
      }

      const res = await activateAddon(addon.id, serialKey);
      if (res.success) {
        setSuccessMsg(res.message);
        setActiveAddonSerialId(null);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در فعال‌سازی افزونه.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAddons = HABINO_ADDONS.filter(a => {
    if (addonCategoryFilter === 'all') return true;
    return a.category === addonCategoryFilter;
  });

  const getAddonIcon = (addonId: string) => {
    switch (addonId) {
      case 'addon_synapse':
        return <Bot className="w-5 h-5 text-amber-500" />;
      case 'addon_payroll':
        return <Building2 className="w-5 h-5 text-blue-500" />;
      case 'addon_barcode_scanner':
        return <Boxes className="w-5 h-5 text-emerald-500" />;
      case 'addon_extra_seats':
        return <Users className="w-5 h-5 text-indigo-500" />;
      case 'addon_smb_sales_agent':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'addon_invoice_ocr_parser':
        return <FileSearch className="w-5 h-5 text-teal-500" />;
      case 'addon_basket_logistics':
        return <Truck className="w-5 h-5 text-orange-500" />;
      case 'addon_multiagent_orchestrator':
        return <Network className="w-5 h-5 text-cyan-500" />;
      default:
        return <PackagePlus className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs" dir="rtl">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>مرکز ارتقای اشتراک و افزونه‌های ماژولار هابینو</span>
                {isTrial && (
                  <span className="text-[10px] bg-amber-500/20 border border-amber-400/40 text-amber-300 px-2 py-0.5 rounded-full font-normal">
                    دوره هدیه فعال
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                مستأجر: <strong className="text-white">{activeTenant?.name || 'سازمان شما'}</strong> | مالک:{' '}
                {currentUser?.fullName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('plans');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'plans'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-500" />
            <span>سطوح اشتراک سه‌گانه (Starter / Pro / Enterprise)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('addons');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'addons'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackagePlus className="w-4 h-4 text-indigo-500" />
            <span>فروشگاه افزونه‌های ماژولار (Modular Add-ons)</span>
            {activeAddonsList.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {activeAddonsList.length} فعال
              </span>
            )}
          </button>
        </div>

        {/* Trial Status Banner */}
        {isTrial && activeTab === 'plans' && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                شما در حال حاضر در <strong>دوره هدیه ۳۰ روزه هابینو</strong> هستید. در پایان این دوره جهت تداوم دسترسی، پلن خود را نهایی یا تمدید فرمایید.
              </span>
            </div>
            <span className="bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-md text-[11px] shrink-0">
              {remainingDays} روز باقی‌مانده
            </span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* TAB 1: 3-TIER PLANS */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-700 mb-3">۱. انتخاب پلن اشتراک متناسب با کسب‌وکار شما:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {planOptions.map((p) => {
                    const isSelected = selectedPlan === p.id;
                    const isCurrent = subscription?.plan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {p.highlighted && (
                          <span className="absolute -top-2.5 right-3 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            {p.badge}
                          </span>
                        )}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 mb-3">{p.description}</p>
                          <div className="mb-3 flex items-baseline gap-1">
                            <span className="text-base font-bold text-slate-900">
                              {formatCurrency(p.price, 'IRT')}
                            </span>
                            <span className="text-[10px] text-slate-400">/ سالانه</span>
                            {isCurrent && (
                              <span className="mr-auto text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                پلن فعلی
                              </span>
                            )}
                          </div>
                          <ul className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                            {p.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activation Method */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 mb-3">۲. روش پرداخت و فعال‌سازی اشتراک:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setActivationMethod('online')}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-right ${
                      activationMethod === 'online'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">پرداخت مستقیم و آنی</div>
                      <div className="text-[10px] text-slate-500">فعال‌سازی فوری با اتصال به درگاه امن شتاب</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivationMethod('serial')}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-right ${
                      activationMethod === 'serial'
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">کد سریال خریداری‌شده</div>
                      <div className="text-[10px] text-slate-500">ثبت لایسنس تهیه‌شده از بازار، کافه‌بازار یا پشتیبانی هابینو</div>
                    </div>
                  </button>
                </div>

                {activationMethod === 'serial' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in">
                    <label className="block text-xs font-medium text-slate-700">کد فعال‌سازی ۱۶ رقمی لایسنس:</label>
                    <input
                      type="text"
                      value={serialInput}
                      onChange={(e) => setSerialInput(e.target.value)}
                      placeholder="مثال: HAB-PRO-365-XXXX-YYYY"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-blue-600 text-xs font-mono text-left ltr bg-white"
                    />
                    <p className="text-[10px] text-slate-500">
                      کد اختصاصی لایسنس را در کادر بالا وارد نمایید تا تغییر سطح بلافاصله اعمال گردد.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MODULAR ADD-ONS */}
          {activeTab === 'addons' && (
            <div className="space-y-6">
              {/* Architecture Knowledge Base Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Boxes className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-blue-950 flex items-center gap-2">
                    <span>قانون طلایی هابینو: امکان خرید مجزای افزونه‌ها بدون جهش به سطح بالاتر</span>
                    <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-md font-normal">
                      Single Source of Truth
                    </span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    اگر در پکیج پایه (سطح ۱) یا حرفه‌ای (سطح ۲) قرار دارید، نیازی به پرداخت هزینه سنگین پکیج سازمانی ندارید.
                    می‌توانید دقیقاً ماژول مورد نیاز خود (مانند هوش صوتی سیناپس یا حقوق و دستمزد) را به شکل افزونه فعال کنید.
                  </p>
                </div>
              </div>

              {/* Addon Filters */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setAddonCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      addonCategoryFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    همه افزونه‌ها ({HABINO_ADDONS.length})
                  </button>
                  <button
                    onClick={() => setAddonCategoryFilter('operational')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      addonCategoryFilter === 'operational'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    افزونه‌های عملیاتی فعال (۴)
                  </button>
                  <button
                    onClick={() => setAddonCategoryFilter('future_strategic')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      addonCategoryFilter === 'future_strategic'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    افزونه‌های راهبردی آینده مصوب رودمپ (۴)
                  </button>
                </div>

                <span className="text-[11px] text-slate-400">
                  {activeAddonsList.length} افزونه برای این مستأجر فعال است
                </span>
              </div>

              {/* Addons Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAddons.map((addon) => {
                  const isActive = hasAddon(addon.id);
                  const isComingSoon = addon.status === 'coming_soon';
                  const isSerialInputOpen = activeAddonSerialId === addon.id;

                  return (
                    <div
                      key={addon.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isActive
                          ? 'border-emerald-300 bg-emerald-50/30 shadow-2xs'
                          : isComingSoon
                          ? 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                          : 'border-slate-200 hover:border-blue-300 bg-white hover:shadow-2xs'
                      }`}
                    >
                      <div>
                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              {getAddonIcon(addon.id)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">{addon.title}</h4>
                              <span className="text-[10px] text-slate-500">{addon.badge}</span>
                            </div>
                          </div>

                          {isActive ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3" /> فعال است
                            </span>
                          ) : isComingSoon ? (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                              <Rocket className="w-3 h-3" /> {addon.roadmapPhase}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-900 shrink-0">
                              {formatCurrency(addon.priceToman, 'IRT')}
                              <span className="text-[10px] text-slate-400 font-normal mr-1">
                                {addon.billingType === 'lifetime' ? '/ دائمی' : '/ سالانه'}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                          {addon.description}
                        </p>

                        {/* If coming soon: show Problem & Solution Box */}
                        {isComingSoon && (
                          <div className="space-y-1.5 p-2.5 bg-white border border-slate-200 rounded-lg text-[10px] mb-3">
                            <div>
                              <strong className="text-slate-800">صورت مسئله: </strong>
                              <span className="text-slate-500">{addon.problemFa}</span>
                            </div>
                            <div>
                              <strong className="text-indigo-900">راهکار هابینو: </strong>
                              <span className="text-slate-500">{addon.solutionFa}</span>
                            </div>
                            <div>
                              <strong className="text-emerald-900">مدل درآمدی: </strong>
                              <span className="text-slate-500">{addon.revenueModelFa}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Addon Actions */}
                      <div className="border-t border-slate-100 pt-3 mt-2">
                        {isActive ? (
                          <div className="flex items-center justify-between text-[11px] text-emerald-700">
                            <span>ماژول‌های متصل ({addon.unlocksModules.join('، ')}) در دسترس هستند.</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                        ) : isComingSoon ? (
                          <button
                            type="button"
                            onClick={() => setSuccessMsg(`علاقه‌مندی شما به افزونه «${addon.title}» ثبت شد. در زمان انتشار فاز به شما اطلاع داده خواهد شد.`)}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Compass className="w-3.5 h-3.5 text-indigo-500" />
                            <span>ثبت علاقه و اطلاع‌رسانی در انتشار فاز</span>
                          </button>
                        ) : (
                          <div className="space-y-2">
                            {isSerialInputOpen ? (
                              <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg animate-in fade-in">
                                <label className="block text-[11px] font-medium text-slate-700">
                                  کد سریال افزونه {addon.title}:
                                </label>
                                <input
                                  type="text"
                                  placeholder="مثال: ADDON-SYNAPSE-XXXX-YYYY"
                                  value={addonSerialInputs[addon.id] || ''}
                                  onChange={(e) =>
                                    setAddonSerialInputs({ ...addonSerialInputs, [addon.id]: e.target.value })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-mono text-left ltr bg-white"
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleActivateAddon(addon, 'serial')}
                                    disabled={isProcessing}
                                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    تایید و فعال‌سازی
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveAddonSerialId(null)}
                                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
                                  >
                                    انصراف
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleActivateAddon(addon, 'instant')}
                                  disabled={isProcessing}
                                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                                  <span>فعال‌سازی آنی ({formatCurrency(addon.priceToman, 'IRT')})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveAddonSerialId(addon.id)}
                                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                  title="فعال‌سازی با کد سریال"
                                >
                                  <Key className="w-3.5 h-3.5 text-slate-500" />
                                  <span>سریال</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            انصراف و بستن پنجره
          </button>

          {activeTab === 'plans' && (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isProcessing ? (
                <span>در حال اعمال ارتقا...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>
                    {activationMethod === 'online'
                      ? `تایید و پرداخت ${formatCurrency(
                          planOptions.find((p) => p.id === selectedPlan)?.price || 0,
                          'IRT'
                        )}`
                      : 'اعمال کد فعال‌سازی لایسنس'}
                  </span>
                </>
              )}
            </button>
          )}

          {activeTab === 'addons' && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>کلیه افزونه‌ها دارای گارانتی بازگشت وجه و فعال‌سازی فوری هستند.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
