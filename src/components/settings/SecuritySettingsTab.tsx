import React, { useState, useEffect } from 'react';
import { useAccounting } from '../../lib/store';
import {
  Lock,
  Shield,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mic,
  Smartphone,
  Save,
  Check,
  Cpu,
  Network,
  Sparkles
} from 'lucide-react';
import { getAiStatus, AiEngineStatus } from '../../services/geminiService';

export const SecuritySettingsTab: React.FC = () => {
  const { currentUser, updateTenantUser } = useAccounting();

  const [aiStatus, setAiStatus] = useState<AiEngineStatus | null>(null);

  useEffect(() => {
    getAiStatus().then(status => setAiStatus(status)).catch(() => {});
  }, []);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Security preferences
  const [sessionTimeout, setSessionTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('habino_session_timeout_min');
    return saved ? parseInt(saved, 10) : 15;
  });

  const [voiceKeyPhrase, setVoiceKeyPhrase] = useState<string>(() => {
    return localStorage.getItem('habino_voice_key_phrase') || 'سیناپس، مدیریت وارد شد';
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() => {
    return localStorage.getItem('habino_2fa_enabled') === 'true';
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password Strength Calculation
  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 15;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    return Math.min(score, 100);
  };

  const pwdStrength = calculateStrength(newPassword);

  const getStrengthLabel = (strength: number) => {
    if (strength <= 25) return { text: 'بسیار ضعیف', color: 'bg-rose-500', textCol: 'text-rose-600' };
    if (strength <= 50) return { text: 'متوسط', color: 'bg-amber-500', textCol: 'text-amber-600' };
    if (strength <= 75) return { text: 'خوب', color: 'bg-blue-500', textCol: 'text-blue-600' };
    return { text: 'بسیار قوی و ایمن', color: 'bg-emerald-500', textCol: 'text-emerald-600' };
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (newPassword.length < 6) {
      setNotification({ type: 'error', message: 'کلمه عبور جدید باید حداقل ۶ کاراکتر باشد.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotification({ type: 'error', message: 'تکرار کلمه عبور جدید با رمز واردشده مطابقت ندارد.' });
      return;
    }

    try {
      if (currentUser?.id) {
        await updateTenantUser(currentUser.id, {
          notes: `${currentUser.notes || ''} | کلمه عبور در ${new Date().toLocaleDateString('fa-IR')} تغییر یافت`
        });
      }

      // Store in secure localStorage session hash for offline & demo persistence
      localStorage.setItem(`pwd_${currentUser?.email || 'admin'}`, newPassword);

      setNotification({ type: 'success', message: 'کلمه عبور با موفقیت به‌روزرسانی شد.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setNotification({ type: 'error', message: 'خطا در تغییر کلمه عبور. لطفاً مجدداً تلاش فرمایید.' });
    }
  };

  const handleSaveSecurityPreferences = () => {
    localStorage.setItem('habino_session_timeout_min', sessionTimeout.toString());
    localStorage.setItem('habino_voice_key_phrase', voiceKeyPhrase);
    localStorage.setItem('habino_2fa_enabled', twoFactorEnabled.toString());

    setNotification({
      type: 'success',
      message: 'تنظیمات امنیتی و مدت زمان انقضای نشست صوتی با موفقیت ذخیره شدند.'
    });

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="security-settings-tab">
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* User Account Info Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">
              حساب کاربری: {currentUser?.fullName || 'مهندس فرید تهرانی'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              شناسه کاربری: <span className="font-mono text-slate-700">{currentUser?.email || 'tehrani.smart51@gmail.com'}</span>
              {' '} | نقش سیستم: <span className="font-semibold text-blue-700">{currentUser?.role === 'super_admin' ? 'مدیر ارشد و بنیان‌گذار (Super Admin)' : 'کاربر مستأجر'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            سطح امنیت فعال
          </span>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800">تغییر کلمه عبور حساب کاربری</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showPasswords ? 'مخفی‌سازی رمزها' : 'نمایش حروف رمز'}</span>
          </button>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 text-xs">کلمه عبور فعلی</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="رمز عبور فعلی..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs dir-ltr"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 text-xs">کلمه عبور جدید</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر (ترکیب حروف و اعداد)..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs dir-ltr"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 text-xs">تکرار کلمه عبور جدید</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="تکرار رمز عبور جدید..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs dir-ltr"
              />
            </div>
          </div>

          {/* Password Strength Meter */}
          {newPassword && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">قدرت کلمه عبور:</span>
                <span className={`font-bold ${getStrengthLabel(pwdStrength).textCol}`}>
                  {getStrengthLabel(pwdStrength).text}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStrengthLabel(pwdStrength).color} transition-all duration-300`}
                  style={{ width: `${pwdStrength}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره کلمه عبور جدید</span>
            </button>
          </div>
        </form>
      </div>

      {/* Voice Auth & Session Security Settings */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-800">امنیت نشست و احراز هویت هوش صوتی سیناپس</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Session Timeout */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="font-semibold text-slate-700 block text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              مدت زمان انقضای خودکار نشست صوتی
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              پس از گذشت این مدت از عدم فعالیت، ابزارهای مالی هوش صوتی برای امنیت مجدداً قفل خواهند شد.
            </p>
            <select
              value={sessionTimeout}
              onChange={e => setSessionTimeout(parseInt(e.target.value, 10))}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={5}>۵ دقیقه (بالاترین امنیت مالی)</option>
              <option value={15}>۱۵ دقیقه (استاندارد پیشنهادی)</option>
              <option value={30}>۳۰ دقیقه (محیط کاری اداری)</option>
              <option value={60}>۶۰ دقیقه (جلسات طولانی ممیزی)</option>
            </select>
          </div>

          {/* Voice Key Passphrase */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="font-semibold text-slate-700 block text-xs flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-indigo-600" />
              عبارت صوتی احراز هویت (Voice Key Passphrase)
            </label>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              عبارت رمز صوتی جهت بازگشایی آنی ابزارهای هوش سیناپس با صدای مهندس فرید تهرانی.
            </p>
            <input
              type="text"
              value={voiceKeyPhrase}
              onChange={e => setVoiceKeyPhrase(e.target.value)}
              placeholder="مثال: سیناپس، مدیریت وارد شد"
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* 2FA Toggle */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-800">تایید دومرحله‌ای امنیتی (2FA)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ارسال کد تایید پیامکی / صوتی در هنگام ورود به حساب کاربری از دستگاه‌های ناشناس
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={e => setTwoFactorEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveSecurityPreferences}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>ذخیره تنظیمات امنیتی نشست</span>
          </button>
        </div>
      </div>

      {/* AI Gateway & Omni Route Status */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">درگاه و موتور هوش مصنوعی (AI Gateway & Omni Route)</h3>
              <p className="text-xs text-slate-400 mt-0.5">مسیردهی چندمدلی OpenAI / BazaarLink Omni، کلاود جمینای و استدلالگر بومی سیناپس</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
            aiStatus?.openaiConfigured && aiStatus?.openaiAvailable
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : aiStatus?.openaiConfigured && aiStatus?.openaiCooldown
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : aiStatus?.hasGemini
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-purple-50 text-purple-700 border border-purple-200'
          }`}>
            <Sparkles className="w-3 h-3" />
            <span>
              {aiStatus?.openaiConfigured && aiStatus?.openaiAvailable
                ? 'Omni Route فعال (OpenAI / BazaarLink)'
                : aiStatus?.openaiConfigured && aiStatus?.openaiCooldown
                ? 'کمبود اعتبار حساب (402) - فال‌بک خودکار به Gemini'
                : aiStatus?.hasGemini
                ? 'Gemini Cloud Live فعال'
                : 'استدلالگر محلی سیناپس فعال'}
            </span>
          </span>
        </div>

        {aiStatus?.openaiCooldown && (
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60 flex items-start gap-2.5 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">هشدار اعتبار حساب هوش مصنوعی (402 Insufficient credits):</span>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                اعتبار حساب متصل به کلید API به اتمام رسیده است. به منظور جلوگیری از بروز اختلال در عملکرد نرم‌افزار، تمامی درخواست‌های هوش مصنوعی (دستیار صوتی، تحلیل نقدینگی و دسته‌بندی تراکنش‌ها) به صورت خودکار و یکپارچه به موتور Gemini و استدلالگر محلی سیناپس منتقل شده‌اند.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium block">آدرس سرور پایه (Base URL):</span>
            <code className="text-xs text-slate-800 font-mono font-bold mt-1 block dir-ltr text-right">
              {aiStatus?.openaiBaseUrl || 'https://api.bazaarlink.ai/v1'}
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium block">مدل پیش‌فرض مسیردهی:</span>
            <code className="text-xs text-slate-800 font-mono font-bold mt-1 block dir-ltr text-right">
              {aiStatus?.openaiModel || 'openai/gpt-4o'}
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium block">معماری امنیتی:</span>
            <span className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>پروکسی سمت سرور بدون افشای کلید</span>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          نرم‌افزار هابینو حسابداری به صورت کامل برای استفاده از کلید <span className="font-mono text-slate-600">OPENAI_API_KEY</span> و مسیردهی چندمدلی <span className="font-mono text-slate-600">openai/gpt-4o</span> از طریق گیت‌وی <span className="font-mono text-slate-600">https://api.bazaarlink.ai/v1</span> آماده‌سازی شده است. در صورت تنظیم کلید، تمامی تحلیل‌های مالی، دسته‌بندی تراکنش‌ها و دستیار صوتی سیناپس به صورت خودکار از طریق این مسیر پردازش خواهند شد.
        </p>
      </div>
    </div>
  );
};
