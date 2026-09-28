import React, { useState } from 'react';
import { useAccounting } from '../lib/store';
import {
  TIER_DETAILS,
  getRemainingDays,
  generateSerialKey,
  generateAddonSerialKey,
  GeneratedKeyResult,
  verifyPurchaseMock,
  DEMO_VS_MARKET_COMPARISON
} from '../lib/licenseEngine';
import { LicenseTier } from '../types';
import { formatCurrency } from '../lib/currencyUtils';
import { UpgradeModal } from './UpgradeModal';
import {
  ShieldCheck,
  Key,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Award,
  Crown,
  Lock,
  ChevronLeft,
  Users,
  Bot,
  ShoppingBag,
  Zap,
  Database,
  Layers,
  ArrowLeftRight,
  PackagePlus
} from 'lucide-react';
import { HABINO_ADDONS } from '../lib/authEngine';

export const LicenseManager: React.FC = () => {
  const {
    license,
    activeTenant,
    hasAddon,
    activateAddon,
    activateLicense,
    activateMarketFullEdition,
    loadDemoData,
    switchToCleanMarketData,
    settings
  } = useAccounting();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'comparison' | 'plans' | 'environment' | 'master'>('comparison');
  const [modalInitialTab, setModalInitialTab] = useState<'plans' | 'addons'>('plans');

  // Activation Key Input
  const [inputKey, setInputKey] = useState<string>('');
  const [holderName, setHolderName] = useState<string>('');
  const [activationMsg, setActivationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isActivating, setIsActivating] = useState<boolean>(false);

  // Master Generator State (For Farid Tehrani)
  const [genTier, setGenTier] = useState<LicenseTier>('bazaar');
  const [genDuration, setGenDuration] = useState<number>(365);
  const [genClientName, setGenClientName] = useState<string>('');
  const [generatedKey, setGeneratedKey] = useState<GeneratedKeyResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Master Addon Serial Generator State
  const [genAddonId, setGenAddonId] = useState<string>('synapse_voice');
  const [genAddonTenantId, setGenAddonTenantId] = useState<string>(activeTenant?.id || 'tenant-main');
  const [generatedAddonKey, setGeneratedAddonKey] = useState<string | null>(null);
  const [copiedAddon, setCopiedAddon] = useState<boolean>(false);
  const [addonActivating, setAddonActivating] = useState<boolean>(false);
  const [addonDirectMsg, setAddonDirectMsg] = useState<string | null>(null);

  // Purchase Mock State
  const [purchasingTier, setPurchasingTier] = useState<LicenseTier | null>(null);
  const [envMsg, setEnvMsg] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState<boolean>(false);

  const remaining = getRemainingDays(license.expiresAt);
  const currentTierInfo = TIER_DETAILS[license.tier] || TIER_DETAILS.bazaar || TIER_DETAILS.pro;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setIsActivating(true);
    setActivationMsg(null);

    const res = await activateLicense(inputKey, holderName || 'کاربر گرامی');
    setIsActivating(false);

    if (res.success) {
      setActivationMsg({ type: 'success', text: res.message });
      setInputKey('');
    } else {
      setActivationMsg({ type: 'error', text: res.message });
    }
  };

  const handleInstantMarketActivation = async () => {
    setIsActivating(true);
    const res = await activateMarketFullEdition('کسب‌وکار فعال نسخه بازار');
    setIsActivating(false);
    setActivationMsg({ type: 'success', text: res.message });
  };

  const handleGenerateSerial = (e: React.FormEvent) => {
    e.preventDefault();
    const result = generateSerialKey(genTier, genDuration, genClientName || 'مشتری بازار');
    setGeneratedKey(result);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateAddonKey = (e: React.FormEvent) => {
    e.preventDefault();
    const tId = genAddonTenantId.trim() || activeTenant?.id || 'tenant-main';
    const key = generateAddonSerialKey(genAddonId, tId);
    setGeneratedAddonKey(key);
    setCopiedAddon(false);
    setAddonDirectMsg(null);
  };

  const handleCopyAddonKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedAddon(true);
    setTimeout(() => setCopiedAddon(false), 2500);
  };

  const handleInstantApplyAddon = async (key: string) => {
    setAddonActivating(true);
    setAddonDirectMsg(null);
    const res = await activateAddon(genAddonId, key);
    setAddonActivating(false);
    setAddonDirectMsg(res.message);
  };

  const handleMockPurchase = async (tier: LicenseTier) => {
    setPurchasingTier(tier);
    try {
      const res = await verifyPurchaseMock(tier, `tx-mock-${Date.now()}`);
      if (res.success && res.license) {
        await activateLicense(res.license.licenseKey, res.license.holderName);
        setActivationMsg({ type: 'success', text: `بسته ${TIER_DETAILS[tier].title} با موفقیت از طریق درگاه بازار فعال شد.` });
      }
    } finally {
      setPurchasingTier(null);
    }
  };

  const handleLoadDemo = () => {
    loadDemoData();
    setEnvMsg('داده‌های نمونه آموزشی و تستی نسخه دمو با موفقیت بارگذاری شدند.');
    setTimeout(() => setEnvMsg(null), 4000);
  };

  const handleCleanSlate = () => {
    switchToCleanMarketData();
    setEnvMsg('پایگاه‌داده با موفقیت برای شروع کار واقعی کسب‌وکار شما در نسخه بازار آماده و تمیز شد.');
    setTimeout(() => setEnvMsg(null), 4000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10" id="license-manager-module">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <span>مدیریت لایسنس و امکانات نسخه بازار هابینو</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            مقایسه جامع دمو با بازار، فعال‌سازی ۱۰۰٪ امکانات و خرید مستقیم درون‌برنامه‌ای کافه بازار
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setModalInitialTab('addons');
              setUpgradeModalOpen(true);
            }}
            className="text-xs px-3.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <PackagePlus className="w-4 h-4" />
            <span>فروشگاه افزونه‌ها (Add-ons)</span>
          </button>
          <button
            onClick={() => {
              setModalInitialTab('plans');
              setUpgradeModalOpen(true);
            }}
            className="text-xs px-3.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Crown className="w-4 h-4 text-slate-950" />
            <span>خرید و ارتقای اشتراک</span>
          </button>
          <span className="text-xs px-3 py-1.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-500" />
            {activeTenant?.subscription?.plan === 'enterprise' ? 'سطح ۳: سازمانی' : activeTenant?.subscription?.plan === 'professional' ? 'سطح ۲: کارگاه‌ها' : 'سطح ۱: پایه'}
          </span>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
            remaining.isExpired ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {remaining.formatted}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'comparison'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>مقایسه امکانات دمو و نسخه بازار (فعال‌سازی ۱۰۰٪)</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'plans'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>طرح‌های اشتراک و خرید بازار</span>
        </button>

        <button
          onClick={() => setActiveTab('environment')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'environment'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>محیط داده (سوئیچ دمو / کار واقعی)</span>
        </button>

        <button
          onClick={() => setActiveTab('master')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'master'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>پنل صدور سریال مستر (مدیریت کل)</span>
        </button>
      </div>

      {/* Active License Overview Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                وضعیت: {license.status === 'active' ? 'نسخه بازار فعال و معتبر' : 'منقضی شده'}
              </span>
              <span className="text-xs text-slate-300">مالک: {license.holderName}</span>
            </div>

            <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              {currentTierInfo.title}
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {currentTierInfo.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-400" />
                <span className="font-mono">{license.licenseKey}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>اعتبار تا: {new Date(license.expiresAt).toLocaleDateString('fa-IR')}</span>
              </div>
              {activeTenant?.subscription?.activeAddons && activeTenant.subscription.activeAddons.length > 0 && (
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-800/60">
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>{activeTenant.subscription.activeAddons.length} افزونه ماژولار فعال</span>
                </div>
              )}
              {license.aiSynapseEnabled && (
                <div className="flex items-center gap-1.5 text-violet-300 font-semibold bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800/60">
                  <Bot className="w-3.5 h-3.5" />
                  <span>دستیار هوشمند صوتی سیناپس فعال</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              onClick={() => {
                setModalInitialTab('addons');
                setUpgradeModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>فروشگاه افزونه‌ها</span>
            </button>
            <button
              onClick={() => {
                setModalInitialTab('plans');
                setUpgradeModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Crown className="w-4 h-4 text-slate-950" />
              <span>خرید و تمدید اشتراک</span>
            </button>
            <button
              onClick={handleInstantMarketActivation}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>فعال‌سازی آنی کلیه امکانات</span>
            </button>
            <button
              onClick={() => handleCopyKey(license.licenseKey)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-300" />}
              <span>{copied ? 'کپی شد!' : 'کپی کلید'}</span>
            </button>
          </div>
        </div>
      </div>

      {activationMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-2.5 ${
          activationMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {activationMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{activationMsg.text}</span>
        </div>
      )}

      {/* TAB 1: COMPARISON & FULL ACTIVATION */}
      {activeTab === 'comparison' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>تعداد کل قابلیت‌های در نظر گرفته شده</span>
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">۱۵ قابلیت کلیدی</div>
              <p className="text-[11px] text-slate-500">فاکتور ۴ قالبه، چک صیادی، اقساط، دوبل، ترازنامه، P&L، سیناپس و...</p>
            </div>

            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
                <span>وضعیت در نسخه بازار</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-800">۱۰۰٪ فعال و عملیاتی</div>
              <p className="text-[11px] text-emerald-700">تمام قابلیت‌ها بدون نیاز به افزونه جانبی فعال شده‌اند.</p>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
                <span>محدودیت یا بخش غیرفعال</span>
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-800">صفر (دسترسی نامحدود)</div>
              <p className="text-[11px] text-blue-700">امکان ثبت نامحدود سند، صدور فاکتور و گزارش‌گیری رسمی.</p>
            </div>
          </div>

          {/* Detailed Feature Comparison Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ماتریس مقایسه امکانات نسخه دمو با نسخه بازار هابینو
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تطبیق دقیق کلیه بخش‌های طراحی شده در نسخه آزمایشی با امکانات ارائه شده در نسخه بازار
                </p>
              </div>

              <button
                onClick={handleInstantMarketActivation}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Zap className="w-4 h-4" />
                <span>تایید و فعال‌سازی فوری همه قابلیت‌ها</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-100/60">
                    <th className="p-4">ردیف</th>
                    <th className="p-4">نام بخش و قابلیت</th>
                    <th className="p-4">دسته‌بندی</th>
                    <th className="p-4">وضعیت در نسخه دمو</th>
                    <th className="p-4">وضعیت در نسخه بازار</th>
                    <th className="p-4 text-center">وضعیت فعال‌سازی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEMO_VS_MARKET_COMPARISON.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{item.title}</div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-lg">{item.description}</div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 whitespace-nowrap">
                        <span>{item.demoStatus}</span>
                      </td>
                      <td className="p-4 text-emerald-700 font-bold whitespace-nowrap">
                        {item.bazaarStatus}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          فعال در بازار
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLANS & IN-APP PURCHASE */}
      {activeTab === 'plans' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Subscription Plans & Direct Purchase Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bazaar Edition Plan */}
            <div className={`rounded-3xl border p-6 flex flex-col justify-between relative shadow-lg transition-all ${
              license.tier === 'bazaar' ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/20' : 'border-emerald-200 bg-white'
            }`}>
              <span className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" />
                نسخه رسمی کافه بازار
              </span>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">بسته ویژه بازار</span>
                  {license.tier === 'bazaar' && <span className="text-[11px] font-bold text-emerald-600">طرح فعلی شما</span>}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">{TIER_DETAILS.bazaar.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{TIER_DETAILS.bazaar.subtitle}</p>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(TIER_DETAILS.bazaar.price, settings.currency)}
                  <span className="text-xs font-normal text-slate-500 mr-1.5">/ اشتراک کامل بازار</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                  {TIER_DETAILS.bazaar.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleMockPurchase('bazaar')}
                disabled={purchasingTier === 'bazaar'}
                className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {purchasingTier === 'bazaar' ? 'در حال اتصال به بازار...' : license.tier === 'bazaar' ? 'اشتراک بازار فعال است' : 'خرید مستقیم درون‌برنامه‌ای بازار'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className={`rounded-3xl border p-6 flex flex-col justify-between transition-all ${
              license.tier === 'pro' ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/20' : 'border-slate-200 bg-white'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">حرفه‌ای</span>
                  {license.tier === 'pro' && <span className="text-[11px] font-bold text-blue-600">طرح فعلی شما</span>}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">{TIER_DETAILS.pro.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{TIER_DETAILS.pro.subtitle}</p>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(TIER_DETAILS.pro.price, settings.currency)}
                  <span className="text-xs font-normal text-slate-500 mr-1.5">/ سالانه</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                  {TIER_DETAILS.pro.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleMockPurchase('pro')}
                disabled={purchasingTier === 'pro'}
                className="mt-6 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                {purchasingTier === 'pro' ? 'در حال فعال‌سازی...' : license.tier === 'pro' ? 'تمدید اشتراک حرفه‌ای' : 'انتخاب طرح حرفه‌ای'}
              </button>
            </div>

            {/* Enterprise CFO Plan */}
            <div className={`rounded-3xl border p-6 flex flex-col justify-between transition-all ${
              license.tier === 'enterprise' ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/20' : 'border-slate-200 bg-white'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    سازمانی + AI
                  </span>
                  {license.tier === 'enterprise' && <span className="text-[11px] font-bold text-purple-600">طرح فعلی شما</span>}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">{TIER_DETAILS.enterprise.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{TIER_DETAILS.enterprise.subtitle}</p>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(TIER_DETAILS.enterprise.price, settings.currency)}
                  <span className="text-xs font-normal text-slate-500 mr-1.5">/ سالانه</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                  {TIER_DETAILS.enterprise.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleMockPurchase('enterprise')}
                disabled={purchasingTier === 'enterprise'}
                className="mt-6 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {purchasingTier === 'enterprise' ? 'در حال فعال‌سازی...' : license.tier === 'enterprise' ? 'طرح سازمانی فعال است' : 'خرید پکیج سازمانی + سیناپس'}
              </button>
            </div>
          </div>

          {/* Manual Key Activation Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <span>ثبت و ارتقای لایسنس با کد فعال‌سازی (Serial Key)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                کد اختصاصی دریافتی از تیم پشتیبانی یا کافه بازار را وارد کرده و دکمه فعال‌سازی را بزنید.
              </p>
            </div>

            <form onSubmit={handleActivate} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <input
                  type="text"
                  placeholder="نام دارنده اشتراک / شرکت (اختیاری)"
                  value={holderName}
                  onChange={e => setHolderName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-blue-500"
                />
              </div>
              <div className="md:col-span-5">
                <input
                  type="text"
                  placeholder="کد فعال‌سازی (مثلاً: HABINO-BAZAAR-FULL-ACCESS)"
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 uppercase focus:outline-blue-500"
                />
              </div>
              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={isActivating}
                  className="w-full h-full min-h-[44px] flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isActivating ? 'در حال تایید...' : 'فعال‌سازی لایسنس'}</span>
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
              <span>کدهای میانبر:</span>
              <code
                onClick={() => setInputKey('HABINO-BAZAAR-FULL-ACCESS')}
                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-mono cursor-pointer border border-emerald-200 font-bold"
              >
                HABINO-BAZAAR-FULL-ACCESS
              </code>
              <code
                onClick={() => setInputKey('HABINO-FARID-TEHRANI-MASTER')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono cursor-pointer"
              >
                HABINO-FARID-TEHRANI-MASTER
              </code>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA ENVIRONMENT (DEMO VS LIVE) */}
      {activeTab === 'environment' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>مدیریت محیط داده: سوئیچ بین داده‌های آزمایشی دمو و کار واقعی بازار</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              کاربران نسخه بازار می‌توانند جهت آموزش پرسنل یا بررسی تمامی قابلیت‌ها، داده‌های نمونه دمو را بارگذاری کنند؛ یا با یک کلیک محیط را برای شروع ورود فاکتورها و چک‌های واقعی کسب‌وکار پاک‌سازی نمایند.
            </p>
          </div>

          {envMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{envMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>بارگذاری داده‌های نمونه دمو (تست و آموزش)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  فاکتورهای نمونه ۴ قالبه، چک‌های صیادی معلق و وصولی، اقساط‌بندی متصل، طرف‌های حساب و پروژه‌ها را به صورت نمونه وارد سیستم می‌کند تا کارکرد سیستم را ارزیابی کنید.
                </p>
              </div>
              <button
                onClick={handleLoadDemo}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری داده‌های دمو</span>
              </button>
            </div>

            <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>شروع کار واقعی در نسخه بازار (محیط تمیز)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  فاکتورها، چک‌ها و اسناد آزمایشی نمونه را پاک کرده و دفاتر مالی را با مانده صفر برای ثبت داده‌های تجاری و اسناد مالی واقعی شما آماده می‌سازد.
                </p>
              </div>
              <button
                onClick={handleCleanSlate}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>آماده‌سازی دیتابیس تمیز جهت کار واقعی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MASTER ADMIN GENERATOR */}
      {activeTab === 'master' && (
        <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">پنل مستر صدور لایسنس (مخصوص مهندس فرید تهرانی)</h3>
                <p className="text-xs text-slate-500 mt-0.5">تولید سریال‌های معتبر جهت فروش مستقیم به مشتریان و شرکت‌ها</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
              Master Key Generator
            </span>
          </div>

          <form onSubmit={handleGenerateSerial} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">نوع پلن اشتراک</label>
              <select
                value={genTier}
                onChange={e => setGenTier(e.target.value as LicenseTier)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
              >
                <option value="bazaar">نسخه رسمی بازار (Cafe Bazaar)</option>
                <option value="pro">حرفه‌ای (Pro Service)</option>
                <option value="enterprise">سازمانی (Enterprise + AI)</option>
                <option value="trial">آزمایشی (Trial 14 Days)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">مدت اعتبار (روز)</label>
              <select
                value={genDuration}
                onChange={e => setGenDuration(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
              >
                <option value={14}>۱۴ روز (تست)</option>
                <option value={90}>۹۰ روز (سه ماهه)</option>
                <option value={180}>۱۸۰ روز (شش ماهه)</option>
                <option value={365}>۳۶۵ روز (یک ساله)</option>
                <option value={730}>۷۳۰ روز (دو ساله)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">نام مشتری / کسب‌وکار خریدار</label>
              <input
                type="text"
                placeholder="مثلاً: شرکت مهندسی آریا"
                value={genClientName}
                onChange={e => setGenClientName(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>تولید سریال لایسنس</span>
              </button>
            </div>
          </form>

          {generatedKey && (
            <div className="p-4 rounded-2xl bg-white border border-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700">سریال تولید شده برای {generatedKey.clientName}:</span>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">مدت: {generatedKey.durationDays} روز</span>
                </div>
                <p className="font-mono text-base font-bold text-slate-800 tracking-wider">
                  {generatedKey.serialKey}
                </p>
              </div>

              <button
                onClick={() => handleCopyKey(generatedKey.serialKey)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                <span>{copied ? 'کپی شد' : 'کپی جهت ارسال به مشتری'}</span>
              </button>
            </div>
          )}

          {/* ADDON CRYPTOGRAPHIC GENERATOR */}
          <div className="pt-6 border-t border-indigo-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">تولید سریال رمزنگاری‌شده افزونه‌ها (Cryptographic Add-on Generator)</h4>
                  <p className="text-[11px] text-slate-500">امضای دیجیتال افزونه با سالت مستر هابینو بر مبنای شناسه اختصاصی هر سازمان</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                HMAC-SHA256 Signed
              </span>
            </div>

            <form onSubmit={handleGenerateAddonKey} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">انتخاب افزونه مورد نظر</label>
                <select
                  value={genAddonId}
                  onChange={e => setGenAddonId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                >
                  {HABINO_ADDONS.map(addon => (
                    <option key={addon.id} value={addon.id}>
                      {addon.title} ({addon.category}) {addon.status === 'coming_soon' ? '⏳ رودمپ' : '⚡ آماده'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">شناسه مستأجر خریدار (Tenant ID)</label>
                <input
                  type="text"
                  placeholder="مثلاً: tenant-main یا شناسه سازمان"
                  value={genAddonTenantId}
                  onChange={e => setGenAddonTenantId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Key className="w-4 h-4" />
                  <span>تولید کلید رمزنگاری‌شده افزونه</span>
                </button>
              </div>
            </form>

            {generatedAddonKey && (
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-800">کلید تولید شده:</span>
                    <span className="text-[10px] px-2 py-0.5 bg-white text-purple-700 rounded border border-purple-200 font-mono">
                      Tenant: {genAddonTenantId}
                    </span>
                  </div>
                  <p className="font-mono text-base font-bold text-slate-900 tracking-wider">
                    {generatedAddonKey}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyAddonKey(generatedAddonKey)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                  >
                    {copiedAddon ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-purple-600" />}
                    <span>{copiedAddon ? 'کپی شد' : 'کپی کلید'}</span>
                  </button>

                  <button
                    onClick={() => handleInstantApplyAddon(generatedAddonKey)}
                    disabled={addonActivating}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{addonActivating ? 'در حال فعال‌سازی...' : 'فعال‌سازی برای این سازمان'}</span>
                  </button>
                </div>
              </div>
            )}

            {addonDirectMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{addonDirectMsg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        initialTab={modalInitialTab}
      />
    </div>
  );
};
