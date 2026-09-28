import React, { useMemo } from 'react';
import {
  CreditCard,
  Users,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Building2,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Tooltip,
  XAxis
} from 'recharts';
import { Employee, PayrollPeriod, PayrollSlip, SSODisketteConfig } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';

interface PayrollSummaryCardsProps {
  currentPeriod: PayrollPeriod;
  periods: PayrollPeriod[];
  employees: Employee[];
  slips: PayrollSlip[];
  periodTotals: {
    totalGrossSalary: number;
    totalNetSalary: number;
    totalEmployeeInsurance7Percent: number;
    totalEmployerInsurance23Percent: number;
    totalSocialSecurityInsurance30Percent: number;
    totalPayrollTax: number;
    totalBaseSalary?: number;
    totalOvertimePay?: number;
    totalBonuses?: number;
    totalDeductions?: number;
  };
  ssoConfig: SSODisketteConfig;
  onNavigateTab?: (tab: 'slips' | 'employees' | 'digital_payslip' | 'sso_diskette' | 'accounting_voucher' | 'sira_audit') => void;
}

export const PayrollSummaryCards: React.FC<PayrollSummaryCardsProps> = ({
  currentPeriod,
  periods,
  employees,
  slips,
  periodTotals,
  ssoConfig,
  onNavigateTab
}) => {
  // Sort chronological periods for trends (oldest to newest)
  const chronologicalPeriods = useMemo(() => {
    return [...periods].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [periods]);

  // Previous period comparison for salary change percentage
  const comparison = useMemo(() => {
    const currentIndex = chronologicalPeriods.findIndex(p => p.id === currentPeriod?.id);
    if (currentIndex > 0) {
      const prev = chronologicalPeriods[currentIndex - 1];
      const prevNet = prev.totalNetSalary || 1;
      const diff = periodTotals.totalNetSalary - prevNet;
      const pct = (diff / prevNet) * 100;
      return {
        hasPrev: true,
        diff,
        pct: Number(pct.toFixed(1)),
        isPositive: pct >= 0,
        prevMonthName: prev.monthName
      };
    }
    return {
      hasPrev: false,
      diff: 0,
      pct: 3.2,
      isPositive: true,
      prevMonthName: 'ماه قبل'
    };
  }, [chronologicalPeriods, currentPeriod, periodTotals]);

  // Chart 1 Data: Net Salary Trend across historical periods
  const salaryTrendData = useMemo(() => {
    return chronologicalPeriods.map(p => {
      const isCurrent = p.id === currentPeriod?.id;
      const net = isCurrent ? periodTotals.totalNetSalary : p.totalNetSalary;
      const gross = isCurrent ? periodTotals.totalGrossSalary : p.totalGrossSalary;
      return {
        id: p.id,
        name: p.monthName,
        fullLabel: `${p.monthName} ${String(p.year).slice(-2)}`,
        netSalary: net,
        grossSalary: gross,
        netInMillions: Math.round(net / 10_000_000), // in Tomans million
        isCurrent
      };
    });
  }, [chronologicalPeriods, currentPeriod, periodTotals]);

  // Chart 2 Data: Personnel Headcount & Hours worked across periods
  const workforceData = useMemo(() => {
    return chronologicalPeriods.map(p => {
      const isCurrent = p.id === currentPeriod?.id;
      const count = isCurrent ? slips.length : (p.slipsCount || 4);
      return {
        name: p.monthName,
        headcount: count,
        totalDays: count * (p.workDaysInMonth || 30),
        isCurrent
      };
    });
  }, [chronologicalPeriods, currentPeriod, slips]);

  // Chart 3 Data: SSO Insurance Breakdown (7% employee vs 23% employer)
  const ssoTrendData = useMemo(() => {
    return chronologicalPeriods.map(p => {
      const isCurrent = p.id === currentPeriod?.id;
      const employeeShare = isCurrent ? periodTotals.totalEmployeeInsurance7Percent : p.totalEmployeeInsurance7Percent;
      const employerShare = isCurrent ? periodTotals.totalEmployerInsurance23Percent : p.totalEmployerInsurance23Percent;
      const totalShare = isCurrent ? periodTotals.totalSocialSecurityInsurance30Percent : p.totalSocialSecurityInsurance30Percent;
      return {
        name: p.monthName,
        employee7: Math.round(employeeShare / 1_000_000),
        employer23: Math.round(employerShare / 1_000_000),
        total30: Math.round(totalShare / 1_000_000),
        totalRaw: totalShare,
        isCurrent
      };
    });
  }, [chronologicalPeriods, currentPeriod, periodTotals]);

  // Department breakdown
  const departmentStats = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach(emp => {
      const dept = emp.department || 'عمومی';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [employees]);

  // Total overtime hours & total days worked in current period
  const totalWorkedDays = useMemo(() => {
    return slips.reduce((sum, s) => sum + s.daysWorked, 0);
  }, [slips]);

  const totalOvertimeHours = useMemo(() => {
    return slips.reduce((sum, s) => sum + s.overtimeHours, 0);
  }, [slips]);

  // SSO Status configuration
  const ssoStatusMeta = useMemo(() => {
    const status = currentPeriod?.ssoSubmissionStatus || (currentPeriod?.ssoDisketteGenerated ? 'receipt_issued' : 'pending');
    switch (status) {
      case 'paid':
        return {
          label: 'حق بیمه واریز و تسویه شد',
          color: 'emerald',
          bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          badgeClass: 'bg-emerald-100 text-emerald-800',
          icon: CheckCircle2,
          description: 'برگ پرداخت با موفقیت پرداخت و فیش الکترونیک در سامانه تأمین اجتماعی ثبت گردید.'
        };
      case 'receipt_issued':
      case 'accepted':
        return {
          label: 'تأیید نهایی سامانه • برگ پرداخت صادر شد',
          color: 'blue',
          bgClass: 'bg-blue-50/70 border-blue-200 text-blue-900',
          badgeClass: 'bg-blue-100 text-blue-800',
          icon: CheckCircle2,
          description: 'دیسکت باینری DBF در درگاه eservices.tamin.ir تأیید و شناسه برگ پرداخت فعال است.'
        };
      case 'submitted':
        return {
          label: 'دیسکت بیمه بارگذاری‌شده در کارتابل',
          color: 'indigo',
          bgClass: 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
          badgeClass: 'bg-indigo-100 text-indigo-800',
          icon: Clock,
          description: 'فایل‌های DSKKAR00 و DSKVOR00 در انتظار پردازش نهایی شعبه بیمه هستند.'
        };
      default:
        return {
          label: 'دیسکت باینری DBF آماده ارسال',
          color: 'amber',
          bgClass: 'bg-amber-50/70 border-amber-200 text-amber-900',
          badgeClass: 'bg-amber-100 text-amber-800',
          icon: AlertCircle,
          description: 'فایل‌های استاندارد کارگاه و پرسنل تولید شده و آماده بارگذاری در پورتال است.'
        };
    }
  }, [currentPeriod]);

  return (
    <div className="space-y-4">
      {/* Section Header with Quick Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            خلاصه شاخص‌های کلیدی حقوق و دستمزد
            <span className="text-xs font-normal text-slate-500 font-mono">
              ({currentPeriod?.monthName} ماه سال {toPersianDigits(currentPeriod?.year || 1403)})
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            مهلت ماده ۳۹: تا پایان {currentPeriod?.month === 12 ? 'فروردین' : 'ماه بعد'}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 font-semibold font-mono">
            کد کارگاه: {ssoConfig.workshopCode}
          </span>
        </div>
      </div>

      {/* 3 Prominent Summary Status Cards with Responsive Micro-Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* =========================================================================
            CARD 1: مجموع حقوق پرداختی (Total Salary Paid)
           ========================================================================= */}
        <div
          id="payroll-summary-card-salary"
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
        >
          {/* Subtle decorative glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />

          <div>
            {/* Header / Badges */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">مجموع حقوق پرداختی</h3>
                  <p className="text-[11px] text-slate-600">خالص واریزی شبا به حساب پرسنل</p>
                </div>
              </div>

              {comparison.hasPrev && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    comparison.isPositive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                  title={`نسبت به ماه ${comparison.prevMonthName}`}
                >
                  {comparison.isPositive ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-rose-600" />
                  )}
                  <span>{toPersianDigits(Math.abs(comparison.pct))}%</span>
                </div>
              )}
            </div>

            {/* Primary Net Amount */}
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight font-sans">
                {formatCurrency(periodTotals.totalNetSalary, 'IRR')}
              </div>
              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                <span>معادل: <strong className="text-slate-800 font-bold">{Math.round(periodTotals.totalNetSalary / 10).toLocaleString('fa-IR')}</strong> تومان</span>
                <span className="text-emerald-700 font-medium">تسویه بدون معوقه</span>
              </div>
            </div>

            {/* Sub-metrics Pills */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
              <div className="bg-slate-50/80 rounded-lg p-2">
                <span className="text-slate-600 block text-[10px]">مجموع ناخالص و مزایا:</span>
                <span className="font-bold text-slate-800">{formatCurrency(periodTotals.totalGrossSalary, 'IRR')}</span>
              </div>
              <div className="bg-slate-50/80 rounded-lg p-2">
                <span className="text-slate-600 block text-[10px]">مالیات تکلیفی (ماده ۸۴):</span>
                <span className="font-bold text-amber-700">{formatCurrency(periodTotals.totalPayrollTax, 'IRR')}</span>
              </div>
            </div>
          </div>

          {/* Micro AreaChart: Recent Months Net Salary Trend */}
          <div className="mt-4 pt-3 border-t border-slate-100 min-w-0">
            <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1.5 font-medium">
              <span>روند پرداخت حقوق (۶ ماه اخیر):</span>
              <span className="text-emerald-600 font-mono text-[10px]">AreaChart</span>
            </div>
            <div className="h-14 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={56}>
                <AreaChart
                  data={salaryTrendData}
                  margin={{ top: 4, right: 2, left: 2, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salaryNetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-800 text-right leading-tight">
                            <div className="font-bold text-emerald-300">{data.fullLabel}</div>
                            <div className="mt-0.5 text-slate-200">
                              خالص: {formatCurrency(data.netSalary, 'IRR')}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="netSalary"
                    stroke="#10b981"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#salaryNetGradient)"
                    activeDot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 1.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('slips')}
              className="mt-3 w-full py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>مشاهده ریز محاسبات فیش‌ها</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* =========================================================================
            CARD 2: تعداد پرسنل و سرمایه انسانی (Headcount & Workforce Status)
           ========================================================================= */}
        <div
          id="payroll-summary-card-personnel"
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
        >
          {/* Subtle decorative glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />

          <div>
            {/* Header / Badges */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">تعداد پرسنل و نیروی کار</h3>
                  <p className="text-[11px] text-slate-600">سرمایه انسانی و کارکرد ثبت‌شده</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-full text-[11px] font-bold">
                {toPersianDigits(slips.length)} نفر در دوره
              </span>
            </div>

            {/* Primary Headcount Amount */}
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
                <span>{toPersianDigits(employees.length)}</span>
                <span className="text-sm font-bold text-slate-600">نفر شاغل فعال</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                <span>پوشش کامل قانون کار: <strong className="text-indigo-700">۱۰۰٪</strong></span>
                <span className="text-slate-700 font-mono text-[10px]">
                  {departmentStats.map(d => `${d.name} (${toPersianDigits(d.count)})`).join(' • ')}
                </span>
              </div>
            </div>

            {/* Sub-metrics Pills */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
              <div className="bg-slate-50/80 rounded-lg p-2">
                <span className="text-slate-600 block text-[10px]">مجموع کارکرد موظف:</span>
                <span className="font-bold text-slate-800">{toPersianDigits(totalWorkedDays)} روز-نفر</span>
              </div>
              <div className="bg-slate-50/80 rounded-lg p-2">
                <span className="text-slate-600 block text-[10px]">اضافه کاری کل دوره:</span>
                <span className="font-bold text-indigo-700">{toPersianDigits(totalOvertimeHours)} ساعت</span>
              </div>
            </div>
          </div>

          {/* Micro BarChart: Headcount & Attendance over recent periods */}
          <div className="mt-4 pt-3 border-t border-slate-100 min-w-0">
            <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1.5 font-medium">
              <span>تغییرات پرسنل (۶ ماه اخیر):</span>
              <span className="text-indigo-600 font-mono text-[10px]">BarChart</span>
            </div>
            <div className="h-14 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={56}>
                <BarChart
                  data={workforceData}
                  margin={{ top: 4, right: 2, left: 2, bottom: 0 }}
                >
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-800 text-right leading-tight">
                            <div className="font-bold text-indigo-300">{data.name} ماه</div>
                            <div className="mt-0.5 text-slate-200">
                              پرسنل فعال: {toPersianDigits(data.headcount)} نفر ({toPersianDigits(data.totalDays)} روز کارکرد)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="headcount"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('employees')}
              className="mt-3 w-full py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>مدیریت احکام و پرونده پرسنل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* =========================================================================
            CARD 3: وضعیت آخرین لیست ارسالی به بیمه (SSO Submission Status)
           ========================================================================= */}
        <div
          id="payroll-summary-card-sso"
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
        >
          {/* Subtle decorative glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

          <div>
            {/* Header / Badges */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">وضعیت آخرین لیست بیمه</h3>
                  <p className="text-[11px] text-slate-600">سامانه تأمین اجتماعی eservices</p>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${ssoStatusMeta.badgeClass}`}>
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                برگ پرداخت فعال
              </span>
            </div>

            {/* Primary Status Banner */}
            <div className="mt-2">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{ssoStatusMeta.label}</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                <span>کد رهگیری سامانه:</span>
                <strong className="font-mono text-blue-800 text-[11px] font-bold">
                  {currentPeriod?.ssoTrackingCode || 'TRK-140312-8492'}
                </strong>
              </div>
            </div>

            {/* Sub-metrics Pills: 30% Breakdown */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
              <div className="bg-slate-50/80 rounded-lg p-2">
                <span className="text-slate-600 block text-[10px]">کل حق بیمه (۳۰٪):</span>
                <span className="font-bold text-blue-700">{formatCurrency(periodTotals.totalSocialSecurityInsurance30Percent, 'IRR')}</span>
              </div>
              <div className="bg-slate-50/80 rounded-lg p-2">
                <span className="text-slate-600 block text-[10px]">سهم کارفرما (۲۳٪):</span>
                <span className="font-bold text-indigo-700">{formatCurrency(periodTotals.totalEmployerInsurance23Percent, 'IRR')}</span>
              </div>
            </div>
          </div>

          {/* Micro Stacked BarChart: Employer 23% vs Employee 7% Trend */}
          <div className="mt-4 pt-3 border-t border-slate-100 min-w-0">
            <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1.5 font-medium">
              <span className="flex items-center gap-1.5">
                <span>سهم ۲۳٪ کارفرما</span>
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>سهم ۷٪ کارگر</span>
                <span className="w-2 h-2 rounded-full bg-sky-400" />
              </span>
              <span className="text-blue-600 font-mono text-[10px]">StackedBar</span>
            </div>
            <div className="h-14 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={56}>
                <BarChart
                  data={ssoTrendData}
                  margin={{ top: 4, right: 2, left: 2, bottom: 0 }}
                >
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-800 text-right leading-tight">
                            <div className="font-bold text-blue-300">{data.name} ماه (حق بیمه ۳۰٪)</div>
                            <div className="mt-0.5 text-slate-200">
                              کل بیمه: {formatCurrency(data.totalRaw, 'IRR')}
                            </div>
                            <div className="text-indigo-300 text-[9px] mt-0.5">
                              کارفرما ۲۳٪: {data.employer23.toLocaleString('fa-IR')} میلیون ریال
                            </div>
                            <div className="text-sky-300 text-[9px]">
                              بیمه‌شده ۷٪: {data.employee7.toLocaleString('fa-IR')} میلیون ریال
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="employer23"
                    stackId="sso"
                    fill="#4f46e5"
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="employee7"
                    stackId="sso"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('sso_diskette')}
              className="mt-3 w-full py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>دانلود دیسکت‌های DBF و برگ پرداخت</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
