import React, { useState } from 'react';
import { useAccounting } from '../lib/store';
import { GuildType, SubscriptionPlanType } from '../types';
import { ROLE_DETAILS_FA, PLAN_LIMITS } from '../lib/authEngine';
import {
  Shield,
  Building2,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  LogIn,
  Eye,
  EyeOff,
  Phone,
  User,
  Key,
  LogOut,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  FileText,
  Sparkles,
  Clock,
  Zap,
  Crown,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Info,
  ShieldCheck
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register' | 'profile';
  onOpenUpgradeModal?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode,
  onOpenUpgradeModal
}) => {
  const {
    currentUser,
    activeTenant,
    login,
    logout,
    registerTenant,
    license
  } = useAccounting();

  // If user is already logged in, show 'profile' view by default, else 'login' or initialMode
  const [viewMode, setViewMode] = useState<'login' | 'register' | 'profile'>(() => {
    if (initialMode) return initialMode;
    return currentUser ? 'profile' : 'login';
  });

  // 4-Step Registration Stepper
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);

  // Login form state
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Register form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regBusinessName, setRegBusinessName] = useState<string>('');
  const [regGuildType, setRegGuildType] = useState<GuildType>('services');
  const [regGuildCategory, setRegGuildCategory] = useState<string>('خدمات تخصصی و مشاوره');

  if (!isOpen) return null;

  // Handle Standard Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('لطفاً ایمیل یا شماره همراه خود را وارد کنید.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('کلمه عبور الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await login(identifier.trim(), password);
      if (res.success) {
        setSuccessMsg(res.message);
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در ورود به سامانه.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1 Validation -> Go to Step 2 (Contract)
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim()) {
      setErrorMsg('نام و نام خانوادگی الزامی است.');
      return;
    }
    if (!regPhone.trim()) {
      setErrorMsg('شماره همراه برای ایجاد حساب و ثبت‌نام الزامی است.');
      return;
    }
    if (!regBusinessName.trim()) {
      setErrorMsg('نام شرکت یا کسب‌وکار الزامی است.');
      return;
    }
    if (!regPassword.trim() || regPassword.length < 4) {
      setErrorMsg('کلمه عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }
    setErrorMsg('');
    setRegStep(2);
  };

  // Step 2 Validation -> Go to Step 3 (Plan Guide)
  const handleStep2Next = () => {
    if (!acceptedTerms) {
      setErrorMsg('برای ادامه ثبت‌نام، مطالعه و تایید شرایط و قوانین هابینو الزامی است.');
      return;
    }
    setErrorMsg('');
    setRegStep(3);
  };

  // Step 3 Next -> Go to Step 4 (Activation)
  const handleStep3Next = () => {
    setErrorMsg('');
    setRegStep(4);
  };

  // Step 4 Final Activation (Instant 30-Day Free Trial)
  const handleFinalActivation = () => {
    if (!acceptedTerms) {
      setErrorMsg('تایید قوانین و شرایط هابینو الزامی است.');
      setRegStep(2);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = registerTenant({
        businessName: regBusinessName.trim(),
        ownerFullName: regFullName.trim(),
        email: regEmail.trim() || `${regPhone.trim()}@habino.local`,
        phone: regPhone.trim(),
        password: regPassword,
        guildType: regGuildType,
        guildCategory: regGuildCategory,
        plan: 'starter',
        isTrial: true,
        acceptedTerms: true
      });

      if (res.success) {
        setSuccessMsg('تبریک! ثبت‌نام انجام شد و هدیه ۳۰ روزه شما بدون پرداخت ریالی فعال گردید.');
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'خطا در فعال‌سازی آنی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      await logout();
      setViewMode('login');
      setSuccessMsg('با موفقیت از حساب کاربری خارج شدید.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              هـ
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">پرتال حسابداری هابینو</h2>
              <p className="text-[11px] text-slate-300">سامانه چندمستأجری و امنیت داده‌ها</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs (If not locked to profile) */}
        {viewMode !== 'profile' && (
          <div className="px-6 pt-4 pb-0 bg-slate-50 border-b border-slate-200">
            <div className="flex bg-slate-200/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ورود به حساب
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  viewMode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>ثبت‌نام جدید</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-normal">
                  ۳۰ روز هدیه
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {/* ============================================================ */}
          {/* MODE 1: STANDARD LOGIN                                       */}
          {/* ============================================================ */}
          {viewMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  ایمیل یا شماره همراه
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="example@mail.com یا ۰۹۱۲..."
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs text-left ltr"
                    required
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  کلمه عبور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="کلمه عبور حساب کاربری"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs text-left ltr"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>مرا به خاطر بسپار</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('برای بازیابی کلمه عبور با پشتیبانی سیستم تماس حاصل نمایید.');
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs hover:underline cursor-pointer"
                >
                  فراموشی رمز عبور؟
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ورود...' : 'ورود به سامانه'}</span>
              </button>

              <div className="text-center pt-3 border-t border-slate-100 text-xs text-slate-500">
                حساب کاربری ندارید؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('register');
                    setRegStep(1);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                >
                  شروع ۳۰ روز استفاده رایگان
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* MODE 2: 4-STEP REGISTRATION & TRIAL ACTIVATION               */}
          {/* ============================================================ */}
          {viewMode === 'register' && (
            <div className="space-y-4">
              {/* Stepper Progress Bar */}
              <div className="grid grid-cols-4 gap-1 sm:gap-2 pb-3 border-b border-slate-100 text-center">
                <div
                  onClick={() => setRegStep(1)}
                  className={`cursor-pointer pb-1 border-b-2 transition-all ${
                    regStep === 1
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : regStep > 1
                      ? 'border-emerald-500 text-emerald-700'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span className="text-[11px] block">۱. مشخصات</span>
                </div>
                <div
                  onClick={() => {
                    if (regFullName.trim() && regPhone.trim() && regBusinessName.trim()) setRegStep(2);
                  }}
                  className={`cursor-pointer pb-1 border-b-2 transition-all ${
                    regStep === 2
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : regStep > 2
                      ? 'border-emerald-500 text-emerald-700'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span className="text-[11px] block">۲. قرارداد</span>
                </div>
                <div
                  onClick={() => {
                    if (acceptedTerms) setRegStep(3);
                  }}
                  className={`cursor-pointer pb-1 border-b-2 transition-all ${
                    regStep === 3
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : regStep > 3
                      ? 'border-emerald-500 text-emerald-700'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span className="text-[11px] block">۳. راهنمای پنل‌ها</span>
                </div>
                <div
                  onClick={() => {
                    if (acceptedTerms) setRegStep(4);
                  }}
                  className={`cursor-pointer pb-1 border-b-2 transition-all ${
                    regStep === 4
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span className="text-[11px] block">۴. فعال‌سازی</span>
                </div>
              </div>

              {/* STEP 1: IDENTITY & BUSINESS FORM */}
              {regStep === 1 && (
                <form onSubmit={handleStep1Next} className="space-y-3.5 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      نام و نام خانوادگی مدیر یا مالک *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="مثال: علی محمدی"
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs"
                        required
                        autoFocus
                      />
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        شماره همراه (شناسه ورود) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="۰۹۱۲..."
                          className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs text-left ltr"
                          required
                        />
                        <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ایمیل (اختیاری)
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="mail@domain.com"
                          className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs text-left ltr"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      کلمه عبور امن *
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="حداقل ۴ کاراکتر"
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs text-left ltr"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      نام شرکت یا کسب‌وکار *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={regBusinessName}
                        onChange={(e) => setRegBusinessName(e.target.value)}
                        placeholder="مثال: شرکت فنی مهندسی آریا"
                        className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs"
                        required
                      />
                      <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      صنف فعالیت کسب‌وکار
                    </label>
                    <select
                      value={regGuildType}
                      onChange={(e) => setRegGuildType(e.target.value as GuildType)}
                      className="w-full py-2 px-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs bg-white"
                    >
                      <option value="services">خدماتی و مشاوره (اولویت اول هابینو)</option>
                      <option value="technology">فناوری، مهندسی و انفورماتیک</option>
                      <option value="contracting">پیمانکاری و پروژه‌ای</option>
                      <option value="commercial">بازرگانی، توزیع و فروشگاهی</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>مرحله بعد: مطالعه قرارداد و شرایط هابینو</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: CONTRACT & TERMS AGREEMENT */}
              {regStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>شرایط و ضوابط رسمی استفاده از خدمات ابری هابینو</span>
                  </div>

                  {/* Scrollable Terms Text Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2.5 max-h-56 overflow-y-auto leading-relaxed select-none">
                    <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                      قرارداد سطح خدمات و تعهدات متقابل (SLA هابینو):
                    </div>
                    <p>
                      <strong>ماده ۱ (ایزوله‌سازی و محرمانگی داده‌ها):</strong> کلیه اطلاعات مالی، فاکتورها، دفاتر و
                      اطلاعات اشخاص با شناسه یکتای مستأجر (Tenant ID) در پایگاه‌داده رمزنگاری‌شده ذخیره گردیده و هیچ شخص
                      ثالثی امکان دسترسی به داده‌های کسب‌وکار شما را ندارد.
                    </p>
                    <p>
                      <strong>ماده ۲ (دوره هدیه ۳۰ روزه و سیاست عدم دریافت ریالی):</strong> ثبت‌نام اولیه مشمول ۳۰ روز
                      استفاده رایگان در سطح پایه بدون نیاز به ارائه شماره کارت یا پرداخت هرگونه وجه است.
                    </p>
                    <p>
                      <strong>ماده ۳ (پایان دوره هدیه و تعلیق حساب):</strong> پس از اتمام ۳۰ روز، در صورت عدم نهایی‌سازی
                      خرید یا فعال‌سازی لایسنس، حساب کاربری به وضعیت فقط‌خواندنی (Read-Only Suspended) درمی‌آید تا داده‌های
                      ثبت‌شده شما هرگز مفقود نشوند.
                    </p>
                    <p>
                      <strong>ماده ۴ (صحت اطلاعات و تعهدات قانونی):</strong> مسئولیت ثبت صحیح مبالغ، شماره‌های چک صیادی
                      و اطلاعات مالیاتی طرف‌های حساب کاملاً بر عهده کاربر است.
                    </p>
                    <p>
                      <strong>ماده ۵ (پشتیبان‌گیری):</strong> هابینو امکان پشتیبان‌گیری محلی (JSON) و ابری خودکار روزانه
                      را برای تداوم دسترسی کاربر تضمین می‌نماید.
                    </p>
                  </div>

                  {/* Required Acceptance Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 rounded border-blue-400 text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                    />
                    <span className="text-xs text-slate-800 font-semibold leading-relaxed">
                      کلیه شرایط، تعهدات و قوانین استفاده از خدمات ابری هابینو را مطالعه نموده و می‌پذیرم. *
                    </span>
                  </label>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      بازگشت
                    </button>
                    <button
                      type="button"
                      onClick={handleStep2Next}
                      disabled={!acceptedTerms}
                      className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <span>مرحله بعد: راهنمای انتخاب پنل</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PLAN GUIDE (EDUCATIONAL SECTION AS MANDATED) */}
              {regStep === 3 && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  {/* Exact Mandated Title */}
                  <div className="p-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <h3 className="text-xs font-bold text-white">
                        آشنایی با پنل‌های هابینو؛ در این ۳۰ روز چه امکاناتی دارید و چه زمانی به پنل حرفه‌ای نیاز خواهید داشت؟
                      </h3>
                    </div>
                    <p className="text-[11px] text-blue-200">
                      راهنمای شفاف امکانات هدیه ۳۰ روزه و نقشه راه ارتقای کسب‌وکار شما در پلتفرم هابینو
                    </p>
                  </div>

                  {/* 2 Comparison Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Free Trial Features */}
                    <div className="p-3.5 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/40 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          امکانات هدیه ۳۰ روزه شما:
                        </span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                          سطح پایه (رایگان)
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-slate-700 text-[11px]">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>صدور فاکتور و پیش‌فاکتور با ۴ قالب اختصاصی</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>مدیریت طرف‌های حساب و دفتر اشخاص</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>ثبت دریافت‌ها، پرداخت‌ها و تراکنش‌های روزانه</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>انبارداری پایه و کاتالوگ خدمات و کالا</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>۱۰۰٪ رایگان بدون نیاز به پرداخت حتی ۱ ریال</span>
                        </li>
                      </ul>
                    </div>

                    {/* When you need Pro */}
                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-blue-600" />
                          چه زمانی به پنل حرفه‌ای نیاز دارید؟
                        </span>
                        <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                          حرفه‌ای و سازمانی
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-slate-700 text-[11px]">
                        <li className="flex items-start gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>بیش از ۲ کاربر با تفکیک نقش (حسابدار، انباردار، صندوقدار)</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>مدیریت چک‌های صیادی ۱۶ رقمی و تسویه خودکار اقساط</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>دفاتر دوبل حسابداری و ترازنامه متوازن قانونی</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>هوش مصنوعی صوتی سیناپس (دستیار ارشد مالی CFO)</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>اتصال رسمی به سامانه مودیان مالیاتی</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      بازگشت
                    </button>
                    <button
                      type="button"
                      onClick={handleStep3Next}
                      className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>مرحله بعد: فعال‌سازی آنی ۳۰ روزه</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: INSTANT 30-DAY TRIAL ACTIVATION */}
              {regStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>خلاصه مشخصات حساب هدیه شما:</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-emerald-200/60 pt-2.5">
                      <div>
                        <span className="text-slate-500 block text-[10px]">نام کسب‌وکار:</span>
                        <strong className="text-slate-900">{regBusinessName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">مالک و مدیر:</span>
                        <strong className="text-slate-900">{regFullName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">شناسه ورود (شماره همراه):</span>
                        <strong className="text-slate-900 font-mono" dir="ltr">
                          {regPhone}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">هزینه فعال‌سازی:</span>
                        <strong className="text-emerald-700 font-bold">۰ ریال (کاملاً رایگان)</strong>
                      </div>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        حساب شما بلافاصله با <strong>۳۰ روز اعتبار کامل</strong> فعال شده و مستقیماً وارد میزکار خواهید شد.
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      دکمه «خرید و ارتقای اشتراک» در نوار بالای نرم‌افزار همواره در دسترس شماست تا در هر زمان از این ۳۰
                      روز بتوانید پنل خود را نهایی یا ارتقا دهید.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(3)}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      بازگشت
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalActivation}
                      disabled={isSubmitting}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isSubmitting ? 'در حال فعال‌سازی...' : 'فعال‌سازی آنی و ورود به هابینو'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                قبلاً حساب دارید؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                >
                  ورود به حساب کاربری
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODE 3: LOGGED-IN PROFILE                                    */}
          {/* ============================================================ */}
          {viewMode === 'profile' && currentUser && (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
                    {currentUser.fullName ? currentUser.fullName[0] : 'هـ'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {currentUser.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5" dir="ltr">
                      {currentUser.email || currentUser.phone}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        {ROLE_DETAILS_FA[currentUser.role]?.title || currentUser.role}
                      </span>
                      {activeTenant && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700">
                          {activeTenant.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization & Subscription Summary */}
              {activeTenant && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      سازمان / مستأجر فعال:
                    </span>
                    <span className="font-bold text-slate-800">{activeTenant.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      سطح لایسنس:
                    </span>
                    <span className="font-semibold text-blue-700">
                      {activeTenant.subscription?.planNameFa || 'نسخه پایه'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      وضعیت دسترسی:
                    </span>
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      احراز هویت شده
                    </span>
                  </div>
                </div>
              )}

              {/* Upgrade Trigger Button */}
              {onOpenUpgradeModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUpgradeModal();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-slate-900" />
                  <span>خرید و ارتقای اشتراک هابینو</span>
                </button>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500" />
                  <span>ورود با حساب کاربری دیگر</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('register');
                    setRegStep(1);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                  <span>ثبت‌نام کسب‌وکار یا سازمان جدید</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج از حساب کاربری</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>هابینو حسابداری • امنیت داده‌ها</span>
          <span>نسخه استاندارد ابری</span>
        </div>
      </div>
    </div>
  );
};
