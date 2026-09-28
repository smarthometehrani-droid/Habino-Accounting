import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Monitor, Smartphone, Share, PlusSquare, X, CheckCircle2, Sparkles } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' | 'banner' }> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  if (variant === 'banner') {
    return (
      <>
        <div id="pwa-install-banner" className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-md border border-blue-400/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
                <Monitor className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">نصب برنامه مستقل هابینو (PWA)</h3>
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    آفلاین و پرسرعت
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-1 max-w-xl">
                  بدون نیاز به باز کردن مرورگر؛ هابینو را روی ویندوز، مک یا گوشی خود نصب کنید تا حتی در قطعی اینترنت به اسناد خود دسترسی داشته باشید.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-install-pwa-banner"
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-700 rounded-2xl font-bold text-xs shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>نصب فوری نسخه دسکتاپ/موبایل</span>
            </button>
          </div>
        </div>

        {/* Guide Modal */}
        {showGuideModal && <PWAInstallGuideModal onClose={() => setShowGuideModal(false)} isIOS={isIOS} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        id="btn-install-pwa-compact"
        onClick={handleInstallClick}
        title="نصب نسخه مستقل نرم‌افزار هابینو روی دستگاه"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">نصب اپلیکیشن</span>
        <span className="sm:hidden">نصب</span>
      </button>

      {showGuideModal && <PWAInstallGuideModal onClose={() => setShowGuideModal(false)} isIOS={isIOS} />}
    </>
  );
};

const PWAInstallGuideModal: React.FC<{ onClose: () => void; isIOS: boolean }> = ({ onClose, isIOS }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" id="pwa-install-modal">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 text-slate-800 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            {isIOS ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">راهنمای نصب نرم‌افزار هابینو</h3>
            <p className="text-xs text-slate-500">مراحل ساده نصب مستقیم روی سیستم یا موبایل</p>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-3.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ۱
              </div>
              <p>در مرورگر Safari دکمه <strong>Share</strong> (آیکون اشتراک‌گذاری مربع و فلش به بالا) را لمس کنید.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ۲
              </div>
              <p>گزینه <strong>Add to Home Screen (افزودن به صفحه اصلی)</strong> را انتخاب نمایید.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ۳
              </div>
              <p>دکمه <strong>Add</strong> را بزنید. آیکون هابینو مانند یک برنامه بومی در منوی آیفون قرار می‌گیرد.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ۱
              </div>
              <p>در نوار آدرس مرورگر کروم یا اج (بالا سمت راست)، روی آیکون <strong>Install (نصب هابینو)</strong> کلیک کنید.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ۲
              </div>
              <p>یا از منوی سه‌نقطه مرورگر گزینه <strong>Install Habino Accounting</strong> یا <strong>Cast, save, and share → Install page as app</strong> را بزنید.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ۳
              </div>
              <p>برنامه در پنجره‌ای مستقل و تمام‌صفحه بدون نوار مرورگر باز خواهد شد.</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
};
