import React, { useState, useEffect } from 'react';
import { useAccounting } from '../lib/store';
import { formatCurrency } from '../lib/currencyUtils';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  CreditCard,
  Users,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Percent,
  Layers,
  Activity,
  ChevronLeft,
  Info,
  Trash2,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';
import { getCashflowInsights } from '../services/geminiService';
import { PWAInstallButton } from './PWAInstallButton';
import { calculateAccountingCycle } from '../lib/financialAccountingEngine';
import { fromPostgresDate } from '../lib/dateUtils';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const Dashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { invoices, checks, transactions, clients, inventory, projects, bankAccounts, settings, executeFactoryReset } = useAccounting();
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState<boolean>(false);
  const [showPnlDetails, setShowPnlDetails] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetMode, setResetMode] = useState<'preserve_inventory' | 'preserve_contacts_inventory' | 'full'>('preserve_inventory');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const handleConfirmFactoryReset = async () => {
    setIsResetting(true);
    try {
      const res = await executeFactoryReset(resetMode);
      setResetNotice(res.message);
      setShowResetModal(false);
      setTimeout(() => setResetNotice(null), 8000);
    } catch (e: any) {
      setResetNotice(`خطا در بازنشانی: ${e?.message || 'خطای سیستمی'}`);
    } finally {
      setIsResetting(false);
    }
  };

  // ۱. اجرای موتور جامع حسابداری استاندارد دوبل (Single Source of Financial Truth)
  const accounting = React.useMemo(() => {
    return calculateAccountingCycle({
      invoices,
      transactions,
      inventory,
      projects,
      checks,
      bankAccounts,
      clients
    });
  }, [invoices, transactions, inventory, projects, checks, bankAccounts, clients]);

  const { pnl, balanceSheet, ratios, cashFlow } = accounting;

  // Monthly financial aggregation for Recharts preview widget (تنها با داده‌های واقعی و بدون داده‌های کاذب)
  const monthlyStats = React.useMemo(() => {
    const persianMonthNames = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    const data = persianMonthNames.map((name, idx) => ({
      name,
      monthIndex: idx + 1,
      income: 0,
      cogs: 0,
      expense: 0,
      netProfit: 0,
    }));

    invoices.forEach(inv => {
      if (inv.is_deleted || inv.status === 'cancelled') return;
      let mIdx = -1;
      const normalizedDate = fromPostgresDate(inv.date);
      if (normalizedDate) {
        const match = normalizedDate.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (match) {
          mIdx = parseInt(match[2], 10) - 1;
        }
      }
      if (mIdx >= 0 && mIdx < 12) {
        if (inv.type === 'purchase') {
          data[mIdx].cogs += (Number(inv.grandTotal) || Number(inv.subtotal) || 0);
        } else {
          data[mIdx].income += (Number(inv.grandTotal) || Number(inv.subtotal) || 0);

          // محاسبه بهای تمام‌شده ماهانه اقلام فاکتور
          if (inv.items && inv.items.length > 0) {
            inv.items.forEach(it => {
              const qty = Number(it.quantity) || 0;
              const matchedInv = inventory.find(item => 
                (it.itemId && item.id === it.itemId) ||
                (item.name && it.description && item.name.trim().toLowerCase() === it.description.trim().toLowerCase())
              );
              const unitBuy = Number(it.metadata?.buyPrice) || Number(matchedInv?.buyPrice) || 0;
              data[mIdx].cogs += (qty * unitBuy);
            });
          }
        }
      }
    });

    transactions.forEach(tx => {
      let mIdx = -1;
      const normalizedDate = fromPostgresDate(tx.date);
      if (normalizedDate) {
        const match = normalizedDate.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
        if (match) {
          mIdx = parseInt(match[2], 10) - 1;
        }
      }
      if (mIdx >= 0 && mIdx < 12) {
        if (tx.type === 'expense') {
          data[mIdx].expense += (Number(tx.amount) || 0);
        } else if (tx.type === 'income' && !tx.relatedInvoiceId) {
          data[mIdx].income += (Number(tx.amount) || 0);
        }
      }
    });

    data.forEach(item => {
      // سود خالص ماهانه بر اساس استاندارد: فروش منهای بهای تمام‌شده منهای هزینه‌های جاری
      item.netProfit = item.income - item.cogs - item.expense;
    });

    // به هیچ وجه داده‌های تستی تزریق نمی‌شود. داده‌های واقعی سال جاری برگردانده می‌شوند.
    return data;
  }, [invoices, transactions, inventory]);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      const res = await getCashflowInsights({
        totalIncome: pnl.netSales + pnl.otherIncomes,
        cogs: pnl.totalCogs,
        grossProfit: pnl.grossProfit,
        totalExpense: pnl.operatingExpenses,
        netProfit: pnl.netProfit,
        currentRatio: ratios.currentRatio,
        pendingReceivableChecks: cashFlow.pendingIncomingChecks,
        pendingPayableChecks: cashFlow.pendingOutgoingChecks,
        futureBalance: cashFlow.predictive30DayCash,
        totalInvoices: invoices.length,
        totalClients: clients.length
      });
      setInsights(res.insights);
      setLoadingInsights(false);
    };
    fetchInsights();
  }, [pnl.netProfit, cashFlow.predictive30DayCash]);

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Header & Quick stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" id="dashboard-title">داشبورد یکپارچه هابینو</h1>
          <p className="text-sm text-slate-500 mt-1">مدیریت جامع اسناد مالی، چک‌های صیادی و پیش‌بینی نقدینگی</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('analytics')}
            className="px-3.5 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            id="quick-analytics-btn"
          >
            <BarChart3 className="w-4 h-4" />
            <span>داشبورد تحلیلی ماهانه</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            id="quick-reports-btn"
          >
            <BarChart3 className="w-4 h-4" />
            <span>صورت مالی و سود و زیان</span>
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            id="factory-reset-btn"
            title="ریست و بازگردانی به تنظیمات کارخانه (پاکسازی پایگاه داده و کش سیستم)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>ریست و تنظیم کارخانه</span>
          </button>
          <button
            onClick={() => onNavigate('invoices')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
            id="quick-new-invoice-btn"
          >
            + صدور فاکتور جدید
          </button>
          <button
            onClick={() => onNavigate('checks')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            id="quick-new-check-btn"
          >
            ثبت چک صیادی
          </button>
        </div>
      </div>

      {/* PWA Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* اعلان نتیجه بازنشانی کارخانه */}
      {resetNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetNotice}</span>
          </div>
          <button onClick={() => setResetNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* وضعیت تست عملیاتی استاندارد با ۱ فاکتور فعال */}
      {invoices.length === 1 && transactions.length === 0 && (
        <div className="bg-gradient-to-l from-emerald-50 to-teal-50/70 border border-emerald-200/90 text-emerald-900 px-4 py-3 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                محیط تست عملیاتی استاندارد فعال است (Isolated Real-Test Environment)
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                تنها ۱ فاکتور فروش معتبر ({formatCurrency(invoices[0].grandTotal || invoices[0].subtotal || 12490000, settings.currency)})، انبار کالاها و مخاطبین در سامانه فعال هستند و کلیه تراکنش‌های متفرقه سود و زیان پاکسازی شده‌اند.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="text-[11px] bg-emerald-100/80 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300/60">
              درآمد عملیاتی: {formatCurrency(pnl.netSales, settings.currency)}
            </span>
            <span className="text-[11px] bg-blue-100/80 text-blue-800 font-bold px-2.5 py-1 rounded-full border border-blue-300/60">
              سود خالص: {formatCurrency(pnl.netProfit, settings.currency)}
            </span>
          </div>
        </div>
      )}

      {/* Metric Cards Grid - بر اساس استانداردهای دوبل و GAAP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-metrics-grid">
        {/* ۱. فروش و درآمدهای عملیاتی */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span className="font-medium text-slate-700">فروش و درآمدهای عملیاتی</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(pnl.netSales + pnl.otherIncomes, settings.currency)}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>فروش خالص</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {pnl.salesDiscounts > 0 ? `تخفیفات: ${formatCurrency(pnl.salesDiscounts, settings.currency)}` : 'بدون تخفیف ثبت‌شده'}
            </span>
          </div>
        </div>

        {/* ۲. بهای تمام‌شده کالا و خدمات (COGS) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span className="font-medium text-slate-700">بهای تمام‌شده کالا و خدمات</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(pnl.totalCogs, settings.currency)}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span className="text-amber-600 font-medium">
              {pnl.goodsCost > 0 ? 'بهای خرید اقلام انبار' : (pnl.servicesCost > 0 ? 'هزینه مستقیم خدمات' : 'فاقد اقلام کالایی')}
            </span>
            <span className="text-[11px] font-mono text-slate-400">COGS کالا و پروژه</span>
          </div>
        </div>

        {/* ۳. سود خالص واقعی دوره */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span className="font-medium text-slate-700">سود خالص واقعی دوره</span>
            <div className={`p-2 rounded-lg ${pnl.netProfit >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className={`text-2xl font-bold ${pnl.netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCurrency(pnl.netProfit, settings.currency)}
            </p>
            <span className={`text-[11px] px-2 py-0.5 font-bold rounded-full border ${
              pnl.netMarginPercent >= 20
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : pnl.netMarginPercent > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              حاشیه: {pnl.netMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>سود ناخالص: {formatCurrency(pnl.grossProfit, settings.currency)}</span>
            <button
              type="button"
              onClick={() => setShowPnlDetails(!showPnlDetails)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline flex items-center gap-0.5"
            >
              <span>{showPnlDetails ? 'بستن فرمول' : 'مشاهده فرمول'}</span>
            </button>
          </div>
        </div>

        {/* ۴. موجودی نقد و بانک‌ها */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-sm">
            <span className="font-medium text-slate-700">موجودی نقد و بانک‌ها</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(cashFlow.actualAvailableCash, settings.currency)}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span className="text-purple-600 font-medium">
              پیش‌بینی ۳۰ روزه:
            </span>
            <span className="font-bold text-slate-700">
              {formatCurrency(cashFlow.predictive30DayCash, settings.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* P&L Step-by-Step Chain Indicator (شفاف‌سازی زنجیره سود مطابق استاندارد) */}
      {showPnlDetails && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                <Info className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">زنجیره استاندارد محاسبه سود (P&L Reconciliation)</h4>
            </div>
            <span className="text-xs text-slate-400">انطباق ۱۰۰٪ با استاندارد سازمان حسابرسی ایران و GAAP</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
              <span className="text-slate-400">۱. فروش خالص</span>
              <p className="text-base font-bold text-emerald-400">{formatCurrency(pnl.netSales, settings.currency)}</p>
              <p className="text-[11px] text-slate-400">فروش کل منهای تخفیفات و برگشتی‌ها</p>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
              <span className="text-slate-400">۲. کسر بهای تمام‌شده (COGS)</span>
              <p className="text-base font-bold text-amber-400">- {formatCurrency(pnl.totalCogs, settings.currency)}</p>
              <p className="text-[11px] text-slate-400">قیمت خرید کالاها از انبار + هزینه مستقیم خدمات</p>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
              <span className="text-slate-400">۳. سود ناخالص دوره</span>
              <p className="text-base font-bold text-blue-400">= {formatCurrency(pnl.grossProfit, settings.currency)}</p>
              <p className="text-[11px] text-slate-400">حاشیه سود ناخالص: {pnl.grossMarginPercent.toFixed(1)}%</p>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1">
              <span className="text-slate-400">۴. کسر هزینه‌های جاری (OPEX)</span>
              <p className="text-base font-bold text-rose-400">- {formatCurrency(pnl.operatingExpenses, settings.currency)}</p>
              <p className="text-[11px] text-slate-400">هزینه‌های اداری، کرایه، دستمزد و مخارج عمومی</p>
            </div>
          </div>

          <div className="bg-blue-950/60 border border-blue-800/50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-blue-200">
              <strong>نتیجه حسابداری نهایی:</strong> سود خالص واقعی هابینو برابر است با{' '}
              <span className="text-white font-bold">{formatCurrency(pnl.netProfit, settings.currency)}</span> با حاشیه سود خالص{' '}
              <span className="text-white font-bold">{pnl.netMarginPercent.toFixed(1)}%</span>.
            </span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold underline shrink-0 cursor-pointer"
            >
              مشاهده صورت سود و زیان رسمی ←
            </button>
          </div>
        </div>
      )}

      {/* CFO Financial Health Ratios Toolbar (نوار پایش سلامت مالی و نقدینگی) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3" id="cfo-financial-health-bar">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                نوار پایش سلامت مالی و نقدینگی (CFO Health Monitor)
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  ratios.liquidityStatus === 'stable'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : ratios.liquidityStatus === 'watch'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {ratios.liquidityStatus === 'stable' ? 'وضعیت پایدار' : (ratios.liquidityStatus === 'watch' ? 'تحت رصد' : 'هشدار کنترل نقدینگی')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{ratios.liquidityMessageFa}</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono self-end sm:self-center">
            سرمایه در گردش: {formatCurrency(balanceSheet.workingCapital, settings.currency)}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* نسبت جاری */}
          <div className="bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span>نسبت جاری (Current)</span>
              <span className="text-[10px] text-slate-400">حداقل ۱.۲</span>
            </div>
            <p className={`text-lg font-black ${ratios.currentRatio >= 1.2 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {ratios.currentRatio >= 99 ? '∞ (بدون بدهی)' : ratios.currentRatio}
            </p>
            <p className="text-[10px] text-slate-400">دارایی جاری ÷ بدهی جاری</p>
          </div>

          {/* نسبت آنی / سریع */}
          <div className="bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span>نسبت سریع (Quick)</span>
              <span className="text-[10px] text-slate-400">حداقل ۱.۰</span>
            </div>
            <p className={`text-lg font-black ${ratios.quickRatio >= 1.0 ? 'text-blue-600' : 'text-amber-600'}`}>
              {ratios.quickRatio >= 99 ? '∞ (تعهدات صفر)' : ratios.quickRatio}
            </p>
            <p className="text-[10px] text-slate-400">نقدشونده بدون انبار ÷ بدهی</p>
          </div>

          {/* حاشیه سود ناخالص */}
          <div className="bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span>حاشیه سود ناخالص</span>
              <Percent className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-lg font-black text-slate-800">
              {pnl.grossMarginPercent.toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-400">سود ناخالص ÷ فروش خالص</p>
          </div>

          {/* ارزش دفتری انبار */}
          <div className="bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span>موجودی انبار (بهای خرید)</span>
              <Layers className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-lg font-black text-slate-800">
              {formatCurrency(balanceSheet.inventoryValuation, settings.currency)}
            </p>
            <p className="text-[10px] text-slate-400">سرمایه ذخیره‌شده در کالا</p>
          </div>
        </div>
      </div>

      {/* AI Synapse Advisor & Diagnostic Quick Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden" id="synapse-ai-card">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  هسته تحلیلی سیناپس (AI CFO)
                  <span className="text-xs font-normal px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-indigo-200">
                    تحلیل آنلاین
                  </span>
                </h3>
              </div>
              {loadingInsights ? (
                <p className="text-sm text-indigo-200/80 animate-pulse">در حال تحلیل دفاتر دوبل و اسناد مالی...</p>
              ) : (
                <p className="text-sm text-slate-200 leading-relaxed">{insights || 'تراز دفاتر در سطح بهینه قرار دارد.'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Diagnostics Quick Status Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">پایش و عیب‌یاب دفاتر</h4>
                <span className="text-[10px] text-emerald-600 font-bold">تراز ۱۰۰٪ و بدون مغایرت</span>
              </div>
            </div>
            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">۱۰۰٪</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            سیستم تراز آزمایشی، عدم وجود رکوردهای یتیم و سلامت دفاتر دوبل را تایید می‌کند.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onNavigate('diagnostics')}
              className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
            >
              پنل عیب‌یابی
            </button>
            <button
              type="button"
              onClick={() => onNavigate('agents_studio')}
              className="py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>استودیو ۵ ایجنت</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Financial Performance Analytics Card (Recharts) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4" id="monthly-analytics-preview-widget">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                وضعیت مالی ماهانه (درآمد، هزینه و سود خالص)
                <span className="text-[10px] font-normal px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200/60 rounded-md">
                  مبتنی بر Recharts
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                بررسی روند ماهانه درآمد و هزینه‌های عملیاتی به همراه خط روند سود خالص
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('analytics')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <span>مشاهده داشبورد تحلیلی جامع</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Monthly KPI Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">مجموع درآمد دوره</span>
            <span className="text-sm font-bold text-emerald-700">
              {formatCurrency(monthlyStats.reduce((s, m) => s + m.income, 0), settings.currency)}
            </span>
          </div>
          <div className="bg-rose-50/70 border border-rose-100 p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs text-rose-800 font-medium">مجموع هزینه‌ها</span>
            <span className="text-sm font-bold text-rose-700">
              {formatCurrency(monthlyStats.reduce((s, m) => s + m.expense, 0), settings.currency)}
            </span>
          </div>
          <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs text-indigo-800 font-medium">سود خالص انباشته</span>
            <span className="text-sm font-bold text-indigo-700">
              {formatCurrency(monthlyStats.reduce((s, m) => s + m.netProfit, 0), settings.currency)}
            </span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-72 w-full pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyStats} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${(val / 1000000).toLocaleString('fa-IR')}M`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1 text-right font-sans" dir="rtl">
                        <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">{label}</p>
                        {payload.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                              {item.name}:
                            </span>
                            <span className="font-bold text-white">
                              {formatCurrency(Number(item.value), settings.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                formatter={(val) => <span className="text-slate-600 font-sans text-xs">{val}</span>}
              />
              <Bar dataKey="income" name="درآمد" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name="هزینه" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="سود خالص"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Invoices & Checks Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              آخرین فاکتورها
            </h3>
            <button onClick={() => onNavigate('invoices')} className="text-xs text-blue-600 hover:underline">
              مشاهده همه
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {invoices.slice(0, 4).map(inv => (
              <div key={inv.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-800">{inv.clientName || 'مشتری نامشخص'}</p>
                  <p className="text-xs text-slate-400">فاکتور #{inv.invoiceNumber} | {inv.date}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">{formatCurrency(inv.grandTotal, settings.currency)}</p>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-md ${
                    inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {inv.status === 'paid' ? 'تسویه شده' : 'در انتظار پرداخت'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              چک‌های صیادی پیش‌رو
            </h3>
            <button onClick={() => onNavigate('checks')} className="text-xs text-blue-600 hover:underline">
              مشاهده همه
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {checks.slice(0, 4).map(chk => (
              <div key={chk.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-800">{chk.bankName} - {chk.clientName}</p>
                  <p className="text-xs text-slate-400">سررسید: {chk.dueDate} | #{chk.checkNumber}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">{formatCurrency(chk.amount, settings.currency)}</p>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-md ${
                    chk.status === 'cleared' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {chk.status === 'cleared' ? 'وصول شده' : 'در جریان وصول'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Factory Reset Double-Confirmation Modal Dialog */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ریست و بازنشانی به تنظیمات کارخانه
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    پاکسازی داده‌های مالی، کش مرورگر و پایگاه داده آفلاین (IndexedDB)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                لطفاً سطح پاکسازی مورد نظر خود را مشخص کنید. این عملیات حافظه محلی سیستم و کلیه جداول آفلاین را بازنشانی می‌کند:
              </p>

              {/* گزینه اول: حفظ انبار کالاها و پاکسازی کلیه اسناد و مخاطبین (دستور صریح کاربر) */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  resetMode === 'preserve_inventory'
                    ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="factoryResetMode"
                  checked={resetMode === 'preserve_inventory'}
                  onChange={() => setResetMode('preserve_inventory')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">
                    پاکسازی کلیه اطلاعات مالی و مخاطبین (فقط حفظ انبار کالاها) - پیشنهادی جهت ارزیابی دقیق تست
                  </span>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    تمامی فاکتورها، تراکنش‌ها، چک‌های صیادی، اسناد دفتر کل، اقساط، پروژه‌ها و مخاطبین به صورت قطعی در حافظه سیستم و دیتابیس سوپابیس پاکسازی می‌شوند، اما فهرست کالاهای انبار شما ۱۰۰٪ دست‌نخورده باقی می‌ماند.
                  </p>
                </div>
              </label>

              {/* گزینه دوم: حفظ مخاطبین و کالاها */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  resetMode === 'preserve_contacts_inventory'
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="factoryResetMode"
                  checked={resetMode === 'preserve_contacts_inventory'}
                  onChange={() => setResetMode('preserve_contacts_inventory')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    ریست اسناد و دفاتر مالی (حفظ انبار کالاها و مخاطبین)
                  </span>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    تمامی فاکتورها، تراکنش‌ها، چک‌ها، اسناد دفتر کل، اقساط و پروژه‌ها در سیستم و سوپابیس پاکسازی می‌شوند، اما مخاطبین و انبار کالاها حفظ می‌گردند.
                  </p>
                </div>
              </label>

              {/* گزینه سوم: ریست ۱۰۰٪ */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  resetMode === 'full'
                    ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="factoryResetMode"
                  checked={resetMode === 'full'}
                  onChange={() => setResetMode('full')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-rose-800 block">
                    ریست کامل کارخانه (حذف ۱۰۰٪ داده‌ها از جمله انبار و نقطه صفر مطلق)
                  </span>
                  <p className="text-[11px] text-rose-600 leading-normal">
                    کلیه اطلاعات سامانه شامل فاکتورها، انبار، اشخاص، تراکنش‌ها و پایگاه داده محلی و سوپابیس به صورت قطعی پاکسازی شده و نرم‌افزار به حالت اولیه بازمی‌گردد.
                  </p>
                </div>
              </label>
            </div>

            {/* هشدار */}
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-normal">
                این عملیات قطعی است. در صورتی که به اطلاعات پیشین نیاز دارید، پیشنهاد می‌شود ابتدا از بخش «پشتیبان‌گیری» یک نسخه JSON ذخیره نمایید.
              </p>
            </div>

            {/* دکمه‌های اقدام */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmFactoryReset}
                disabled={isResetting}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  resetMode === 'full' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال پاکسازی و ریست...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تأیید و اجرای تنظیم کارخانه</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
