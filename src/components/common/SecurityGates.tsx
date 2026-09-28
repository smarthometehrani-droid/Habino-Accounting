import React from 'react';
import { useAccounting } from '../../lib/store';
import { ROLE_DETAILS_FA, PLAN_LIMITS, HABINO_ADDONS } from '../../lib/authEngine';
import { SubscriptionPlanType, SubscriptionPlan, UserPermission, TenantUserPermission } from '../../types';
import {
  ShieldAlert,
  Lock,
  Sparkles,
  ArrowRight,
  UserCheck,
  KeyRound,
  Crown,
  CheckCircle2,
  Shield,
  PackagePlus
} from 'lucide-react';

interface SecurityGateProps {
  moduleId: string;
  moduleTitleFa?: string;
  children: React.ReactNode;
  onNavigate?: (tab: string) => void;
  onOpenLicenseModal?: () => void;
  onOpenLoginModal?: () => void;
}

export const SecurityGate: React.FC<SecurityGateProps> = ({
  moduleId,
  moduleTitleFa,
  children,
  onNavigate,
  onOpenLicenseModal,
  onOpenLoginModal
}) => {
  const { currentUser, activeTenant, canAccessModule } = useAccounting();

  const access = canAccessModule(moduleId);

  if (access.allowed) {
    return <>{children}</>;
  }

  // If locked by Tenant Subscription Plan (Level 2)
  if (access.gateType === 'plan') {
    const currentPlan = activeTenant?.subscription?.plan || 'starter';
    const currentPlanInfo = PLAN_LIMITS[currentPlan];
    const requiredPlan: SubscriptionPlanType = access.requiredPlan || 'professional';
    const requiredPlanInfo = PLAN_LIMITS[requiredPlan];

    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 animate-fadeIn font-sans" dir="rtl">
        <div className="bg-white border-2 border-amber-200/80 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-amber-200/40 to-orange-200/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
                  سطح ۲: نیازمند ارتقای پکیج خریداری‌شده
                </span>
                <span className="text-xs font-medium text-slate-400">
                  مستأجر جاری: {activeTenant?.name}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                قابلیت {moduleTitleFa || moduleId} در پکیج شما فعال نیست
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {access.reasonFa}
              </p>
            </div>
          </div>

          {/* Plan Comparison Pills */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 block">سطح فعلی نرم‌افزار شما:</span>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-800">{currentPlanInfo.planNameFa}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${currentPlanInfo.badgeColor}`}>
                  فعال
                </span>
              </div>
              <p className="text-xs text-slate-500">{currentPlanInfo.description}</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-xl border-2 border-blue-300 space-y-2 shadow-xs">
              <span className="text-[11px] font-bold text-blue-600 block flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> سطح پیشنهادی جهت دسترسی:
              </span>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-blue-950">{requiredPlanInfo.planNameFa}</span>
                <span className="text-xs font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  {requiredPlanInfo.priceToman.toLocaleString('fa-IR')} تومان
                </span>
              </div>
              <p className="text-xs text-blue-900/80">{requiredPlanInfo.description}</p>
            </div>
          </div>

          {/* Modular Add-on Alternative (قانون هابینو: خرید مجزای افزونه‌ها بدون جهش به سطح بالاتر) */}
          {(() => {
            const matchingAddon = HABINO_ADDONS.find((a) => a.unlocksModules.includes(moduleId));
            if (!matchingAddon) return null;
            return (
              <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <PackagePlus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                      <span>راهکار جایگزین: خرید مجزای افزونه «{matchingAddon.title}»</span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md font-semibold">
                        بدون جهش به سطح بالاتر
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/90 mt-0.5">
                      {matchingAddon.status === 'available'
                        ? `می‌توانید بدون ارتقای کل پکیج، تنها با ${matchingAddon.priceToman.toLocaleString('fa-IR')} تومان این قابلیت را فوراً به حساب سازمان خود متصل کنید.`
                        : `این افزونه راهبردی در ${matchingAddon.roadmapPhase} منتشر خواهد شد و جزو رودمپ توسعه هابینو است.`}
                    </p>
                  </div>
                </div>
                {onOpenLicenseModal && (
                  <button
                    onClick={onOpenLicenseModal}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    مشاهده در فروشگاه افزونه‌ها
                  </button>
                )}
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3">
              {onOpenLicenseModal && (
                <button
                  onClick={onOpenLicenseModal}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>فعال‌سازی با کد لایسنس یا ارتقای پکیج</span>
                </button>
              )}
              {onNavigate && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>بازگشت به داشبورد</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>پشتیبانی ۱۰۰٪ از لایسنس آفلاین و سریال اختصاصی</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Locked by Tenant Staff Role (Level 3 or Level 1)
  const userRoleDetails = currentUser ? ROLE_DETAILS_FA[currentUser.role] : null;

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 animate-fadeIn font-sans" dir="rtl">
      <div className="bg-white border-2 border-rose-200/80 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-rose-200/40 to-pink-200/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-400/30 flex items-center justify-center text-rose-600 shrink-0 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-200">
                سطح ۳: تفکیک وظایف و کنترل دسترسی (RBAC)
              </span>
              <span className="text-xs font-medium text-slate-400">
                محدودیت امنیتی پرسنل
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              دسترسی به ماژول «{moduleTitleFa || moduleId}» مسدود است
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {access.reasonFa}
            </p>
          </div>
        </div>

        {/* User Status Card */}
        <div className="mt-8 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
              {currentUser ? currentUser.fullName[0] : '؟'}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {currentUser?.fullName || 'کاربر مهمان'}
              </span>
              <span className="text-[11px] text-slate-500">
                {currentUser?.email}
              </span>
            </div>
          </div>

          {userRoleDetails && (
            <span className={`text-xs px-3 py-1.5 rounded-xl font-bold border ${userRoleDetails.badgeColor}`}>
              {userRoleDetails.title}
            </span>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-xs text-slate-500 leading-relaxed bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <p className="font-semibold text-blue-900 mb-1">💡 راهنمای حل مشکل دسترسی:</p>
          <p>
            طبق اصول حاکمیت داده در حسابداری هابینو، کارفرما و ادمین مستأجر تعیین‌کننده دسترسی هر یک از اعضا است. اگر برای انجام وظایف کاری به این بخش نیاز دارید، از مدیر ارشد کسب‌وکار بخواهید تا از بخش <strong>«مدیریت اعضا و نقش‌ها»</strong> این مجوز را به شما اختصاص دهد.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>تغییر حساب کاربری / سوییچ نقش</span>
              </button>
            )}
            {onNavigate && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>بازگشت به داشبورد</span>
              </button>
            )}
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Tenant: {activeTenant?.slug}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: <PlanGate> (کنترل دسترسی بر اساس سطح لایسنس خریداری‌شده - سطح ۲)
// ============================================================================

export interface PlanGateProps {
  requiredPlan: SubscriptionPlan;
  featureName?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showInlineUpgradeBanner?: boolean;
  onUpgradeRequested?: () => void;
}

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3
};

export const PlanGate: React.FC<PlanGateProps> = ({
  requiredPlan,
  featureName,
  fallback,
  children,
  showInlineUpgradeBanner = true,
  onUpgradeRequested
}) => {
  const { currentUser, activeTenant } = useAccounting();

  // Super Admin bypasses plan restrictions
  if (currentUser?.role === 'super_admin') {
    return <>{children}</>;
  }

  const currentPlan: SubscriptionPlan = activeTenant?.subscription?.plan || 'starter';
  const currentPlanLevel = PLAN_HIERARCHY[currentPlan] || 1;
  const requiredPlanLevel = PLAN_HIERARCHY[requiredPlan] || 1;

  if (currentPlanLevel >= requiredPlanLevel) {
    return <>{children}</>;
  }

  // If explicit fallback provided, return it
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showInlineUpgradeBanner) {
    return null;
  }

  const targetPlanInfo = PLAN_LIMITS[requiredPlan];

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200/80 my-3 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                قابلیت {featureName ? `«${featureName}»` : 'انتخاب‌شده'} قفل است
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">
                نیازمند {targetPlanInfo?.planNameFa || requiredPlan}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              پکیج جاری شما ({PLAN_LIMITS[currentPlan]?.planNameFa || currentPlan}) فاقد این امکان است. با ارتقا، این ماژول آنی فعال می‌شود.
            </p>
          </div>
        </div>

        {onUpgradeRequested && (
          <button
            type="button"
            onClick={onUpgradeRequested}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Crown className="w-3.5 h-3.5 text-amber-200" />
            <span>ارتقای پکیج</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: <PermissionGate> (کنترل دسترسی دانه‌بندی‌شده پرسنل مستأجر - سطح ۳)
// ============================================================================

export interface PermissionGateProps {
  permission: TenantUserPermission;
  featureName?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  hideIfUnauthorized?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  featureName,
  fallback,
  children,
  hideIfUnauthorized = false
}) => {
  const { currentUser, hasPermission } = useAccounting();

  // Super Admin bypasses RBAC
  if (currentUser?.role === 'super_admin') {
    return <>{children}</>;
  }

  const isAllowed = hasPermission(permission);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (hideIfUnauthorized) {
    return null;
  }

  return (
    <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 my-2 text-right" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <span className="font-bold text-rose-900 block">
            دسترسی به {featureName ? `«${featureName}»` : 'این عملیات'} محدود است
          </span>
          <span className="text-rose-700 text-[11px] mt-0.5 block">
            نقش حساب کاربری شما فاقد مجوز امنیتی لازم است. لطفاً از کارفرما درخواست بررسی نمایید.
          </span>
        </div>
      </div>
    </div>
  );
};

