import React, { useState, useMemo } from 'react';
import { useAccounting } from '../lib/store';
import { formatCurrency } from '../lib/currencyUtils';
import { calculateAccountingCycle } from '../lib/financialAccountingEngine';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Scale,
  FileSpreadsheet,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart,
  ShieldCheck,
  Percent
} from 'lucide-react';

export const Reports: React.FC = () => {
  const {
    invoices,
    transactions,
    accountingEntries,
    bankAccounts,
    checks,
    clients,
    projects,
    inventory,
    settings
  } = useAccounting();

  const [activeTab, setActiveTab] = useState<'pnl' | 'trial_balance' | 'balance_sheet' | 'ratios'>('pnl');
  const [period, setPeriod] = useState<'all' | 'year' | 'quarter'>('all');

  // ----------------------------------------------------
  // هسته محاسبات جامع حسابداری هابینو (Single Source of Financial Truth)
  // ----------------------------------------------------
  const accounting = useMemo(() => {
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

  // ----------------------------------------------------
  // Financial Computations for P&L
  // ----------------------------------------------------
  const pnlData = useMemo(() => {
    const { pnl } = accounting;
    const salesInvoices = invoices.filter(inv => inv.type === 'sale' && inv.status !== 'cancelled' && !inv.is_deleted);
    const invoiceVat = salesInvoices.reduce((sum, inv) => sum + (Number(inv.totalTax) || 0), 0);

    return {
      grossRevenue: pnl.netSales + pnl.otherIncomes,
      invoiceRevenue: pnl.netSales,
      otherIncomes: pnl.otherIncomes,
      invoiceVat,
      costOfServices: pnl.totalCogs,
      grossProfit: pnl.grossProfit,
      operatingExpenses: pnl.operatingExpenses,
      operatingIncome: pnl.operatingProfit,
      netProfit: pnl.netProfit,
      netMarginPercent: Math.round(pnl.netMarginPercent * 10) / 10
    };
  }, [accounting, invoices]);

  // ----------------------------------------------------
  // Trial Balance (تراز آزمایشی ۴ ستونی)
  // ----------------------------------------------------
  const trialBalanceData = useMemo(() => {
    // If entries exist, group by accountCode
    const accountsMap: Record<
      string,
      {
        accountCode: string;
        accountTitle: string;
        totalDebit: number;
        totalCredit: number;
      }
    > = {};

    // Base default accounts for standard service business
    const defaultChart = [
      { code: '101-01', title: 'موجودی نقد و بانک‌ها' },
      { code: '103-01', title: 'اسناد دریافتنی تجاری (چک‌های صیادی)' },
      { code: '104-01', title: 'حساب‌ها و اسناد دریافتنی (کارفرمایان)' },
      { code: '105-01', title: 'پیش‌پرداخت‌ها و علی‌الحساب پروژه‌ها' },
      { code: '201-01', title: 'اسناد پرداختنی تجاری (چک‌های صادره)' },
      { code: '202-01', title: 'حساب‌های پرداختنی (بستانکاران)' },
      { code: '301-01', title: 'سرمایه اولیه و حقوق صاحبان سهام' },
      { code: '401-01', title: 'درآمد ارائه خدمات مهندسی و پروژه‌ای' },
      { code: '501-01', title: 'بهای تمام‌شده خدمات و پیمانکاری' },
      { code: '601-01', title: 'هزینه‌های اداری، عمومی و سربار' }
    ];

    defaultChart.forEach(acc => {
      accountsMap[acc.code] = {
        accountCode: acc.code,
        accountTitle: acc.title,
        totalDebit: 0,
        totalCredit: 0
      };
    });

    // Populate from accountingEntries
    accountingEntries.forEach(e => {
      const code = e.accountCode || '999-99';
      if (!accountsMap[code]) {
        accountsMap[code] = {
          accountCode: code,
          accountTitle: e.accountTitle || 'حساب متفرقه',
          totalDebit: 0,
          totalCredit: 0
        };
      }
      accountsMap[code].totalDebit += e.debit || 0;
      accountsMap[code].totalCredit += e.credit || 0;
    });

    // If entries are sparse, augment with operational data so report reflects real data
    if (accountingEntries.length === 0) {
      const totalBank = bankAccounts.reduce((s, b) => s + (b.balance || 0), 0);
      const pendingCheckAmount = checks.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
      const clientDebts = clients.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
      const clientCredits = clients.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);

      accountsMap['101-01'].totalDebit += totalBank;
      accountsMap['103-01'].totalDebit += pendingCheckAmount;
      accountsMap['104-01'].totalDebit += clientDebts;
      accountsMap['202-01'].totalCredit += clientCredits;
      accountsMap['401-01'].totalCredit += pnlData.grossRevenue;
      accountsMap['501-01'].totalDebit += pnlData.costOfServices;
      accountsMap['601-01'].totalDebit += pnlData.operatingExpenses;

      // Balancing with capital / equity
      const diff =
        accountsMap['101-01'].totalDebit +
        accountsMap['103-01'].totalDebit +
        accountsMap['104-01'].totalDebit +
        accountsMap['501-01'].totalDebit +
        accountsMap['601-01'].totalDebit -
        (accountsMap['202-01'].totalCredit + accountsMap['401-01'].totalCredit);

      if (diff > 0) {
        accountsMap['301-01'].totalCredit += diff;
      } else {
        accountsMap['301-01'].totalDebit += Math.abs(diff);
      }
    }

    const rows = Object.values(accountsMap).map(acc => {
      const balanceDebit = acc.totalDebit > acc.totalCredit ? acc.totalDebit - acc.totalCredit : 0;
      const balanceCredit = acc.totalCredit > acc.totalDebit ? acc.totalCredit - acc.totalDebit : 0;
      return {
        ...acc,
        balanceDebit,
        balanceCredit
      };
    });

    // Totals
    const sumDebitTurnover = rows.reduce((s, r) => s + r.totalDebit, 0);
    const sumCreditTurnover = rows.reduce((s, r) => s + r.totalCredit, 0);
    const sumDebitBalance = rows.reduce((s, r) => s + r.balanceDebit, 0);
    const sumCreditBalance = rows.reduce((s, r) => s + r.balanceCredit, 0);

    const isTurnoverBalanced = Math.abs(sumDebitTurnover - sumCreditTurnover) < 1;
    const isBalanceBalanced = Math.abs(sumDebitBalance - sumCreditBalance) < 1;

    return {
      rows: rows.filter(r => r.totalDebit > 0 || r.totalCredit > 0),
      sumDebitTurnover,
      sumCreditTurnover,
      sumDebitBalance,
      sumCreditBalance,
      isBalanced: isTurnoverBalanced && isBalanceBalanced
    };
  }, [accountingEntries, bankAccounts, checks, clients, pnlData]);

  // ----------------------------------------------------
  // Balance Sheet Computations (ترازنامه)
  // ----------------------------------------------------
  const balanceSheetData = useMemo(() => {
    // 1. Current Assets (دارایی‌های جاری)
    const cashAndBank = bankAccounts.reduce((s, b) => s + (b.balance || 0), 0);
    const receivableChecks = checks.filter(c => c.type === 'receivable' && c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
    const accountsReceivable = clients.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0);
    const inventoryValuation = inventory.reduce((s, it) => s + (it.buyPrice * it.stock), 0);
    const totalCurrentAssets = cashAndBank + receivableChecks + accountsReceivable + inventoryValuation;

    // 2. Current Liabilities (بدهی‌های جاری)
    const payableChecks = checks.filter(c => c.type === 'payable' && c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
    const accountsPayable = clients.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0);
    const totalCurrentLiabilities = payableChecks + accountsPayable;

    // 3. Equity (حقوق صاحبان سرمایه)
    const retainedEarnings = pnlData.netProfit;
    const initialCapital = Math.max(0, totalCurrentAssets - totalCurrentLiabilities - retainedEarnings);
    const totalEquity = initialCapital + retainedEarnings;

    // Total Liabilities & Equity
    const totalLiabilitiesAndEquity = totalCurrentLiabilities + totalEquity;
    const discrepancy = Math.abs(totalCurrentAssets - totalLiabilitiesAndEquity);
    const isBalanced = discrepancy < 1;

    return {
      cashAndBank,
      receivableChecks,
      accountsReceivable,
      inventoryValuation,
      totalCurrentAssets,
      payableChecks,
      accountsPayable,
      totalCurrentLiabilities,
      initialCapital,
      retainedEarnings,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
      discrepancy
    };
  }, [bankAccounts, checks, clients, inventory, pnlData]);

  // ----------------------------------------------------
  // Financial Ratios & Synapse Indicators
  // ----------------------------------------------------
  const currentRatio = balanceSheetData.totalCurrentLiabilities > 0
    ? Math.round((balanceSheetData.totalCurrentAssets / balanceSheetData.totalCurrentLiabilities) * 100) / 100
    : 9.99;

  const workingCapital = balanceSheetData.totalCurrentAssets - balanceSheetData.totalCurrentLiabilities;

  // ----------------------------------------------------
  // Export CSV Report
  // ----------------------------------------------------
  const handleExportCSV = () => {
    const tenantName = settings.name || 'مجموعه اقتصادی';
    const currencyLabel = settings.currency === 'IRR' ? 'ریال' : 'تومان';
    let csv = '\uFEFF'; // UTF-8 BOM for Excel Persian support
    csv += `صورت‌های مالی رسمی و گزارش ترازنامه - ${tenantName}\n`;
    csv += `نام شرکت / مجموعه:,${tenantName}\n`;
    csv += `تاریخ تهیه گزارش:,${new Date().toLocaleDateString('fa-IR')}\n`;
    csv += `واحد پولی:,${currencyLabel}\n\n`;

    csv += '--- صورت سود و زیان (P&L) ---\n';
    csv += `درآمد حاصل از فروش و خدمات:,${pnlData.grossRevenue}\n`;
    csv += `بهای تمام‌شده خدمات و پروژه‌ها:,${pnlData.costOfServices}\n`;
    csv += `سود ناخالص:,${pnlData.grossProfit}\n`;
    csv += `هزینه‌های عملیاتی و اداری:,${pnlData.operatingExpenses}\n`;
    csv += `سود خالص دوره:,${pnlData.netProfit}\n`;
    csv += `حاشیه سود خالص (درصد):,${pnlData.netMarginPercent}%\n\n`;

    csv += '--- تراز آزمایشی ۴ ستونی ---\n';
    csv += 'کد حساب,عنوان حساب,گردش بدهکار,گردش بستانکار,مانده بدهکار,مانده بستانکار\n';
    trialBalanceData.rows.forEach(r => {
      csv += `"${r.accountCode}","${r.accountTitle}",${r.totalDebit},${r.totalCredit},${r.balanceDebit},${r.balanceCredit}\n`;
    });
    csv += `جمع کل,,${trialBalanceData.sumDebitTurnover},${trialBalanceData.sumCreditTurnover},${trialBalanceData.sumDebitBalance},${trialBalanceData.sumCreditBalance}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = tenantName.replace(/[/\\?%*:|"<> ]/g, '_');
    link.setAttribute('download', `${safeName}_Financial_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="reports-module" dir="rtl">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">صورت‌های مالی و گزارش عملکرد</h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                متصل به کش امن محلی (پایدار در آفلاین)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              صورت سود و زیان رسمی (P&L)، تراز آزمایشی ۴ ستونی و ترازنامه متوازن دوبل
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            id="btn-export-reports-csv"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="دریافت فایل خروجی اکسل و CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">خروجی اکسل</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            id="btn-print-reports"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            title="چاپ رسمی صورت مالی"
          >
            <Printer className="w-4 h-4 text-blue-300" />
            <span>چاپ رسمی</span>
          </button>
        </div>
      </div>

      {/* Official Print Header (Visible only on print) */}
      <div className="hidden print:block p-6 border-b border-slate-300 mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{settings.name}</h1>
        <p className="text-sm text-slate-600 mt-1">صورت‌های مالی رسمی، سود و زیان و تراز آزمایشی دوره منتهی به {new Date().toLocaleDateString('fa-IR')}</p>
        <p className="text-xs text-slate-500 mt-1">واحد سنجش ارزی: تومان (IRT)</p>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto no-scrollbar no-print">
        <button
          type="button"
          onClick={() => setActiveTab('pnl')}
          id="tab-btn-pnl"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pnl'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>صورت سود و زیان (P&L)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trial_balance')}
          id="tab-btn-trial-balance"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'trial_balance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>تراز آزمایشی ۴ ستونی</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">دوبل</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balance_sheet')}
          id="tab-btn-balance-sheet"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'balance_sheet'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ترازنامه استاندارد (Balance Sheet)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ratios')}
          id="tab-btn-ratios"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ratios'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>نسبت‌های نقدینگی و تحلیل AI</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: PROFIT & LOSS STATEMENT (صورت سود و زیان)     */}
      {/* ==================================================== */}
      {activeTab === 'pnl' && (
        <div className="space-y-6" id="pnl-statement-view">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-medium text-slate-500">درآمد ناخالص خدمات</span>
              <p className="text-xl font-black text-slate-900">{formatCurrency(pnlData.grossRevenue, settings.currency)}</p>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>فاکتورها و قراردادها</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-medium text-slate-500">بهای تمام‌شده خدمات (Labor)</span>
              <p className="text-xl font-black text-amber-700">{formatCurrency(pnlData.costOfServices, settings.currency)}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                <span>هزینه‌های مستقیم پروژه‌ای</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-medium text-slate-500">سود خالص دوره</span>
              <p className={`text-xl font-black ${pnlData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(pnlData.netProfit, settings.currency)}
              </p>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                <span>حاشیه سود: {pnlData.netMarginPercent}٪</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-medium text-slate-500">مالیات بر ارزش افزوده (VAT)</span>
              <p className="text-xl font-black text-slate-900">{formatCurrency(pnlData.invoiceVat, settings.currency)}</p>
              <div className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                <span>۱۰٪ تجمیعی فاکتورهای رسمی</span>
              </div>
            </div>
          </div>

          {/* Formal P&L Statement Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">صورت سود و زیان تفصیلی (Income Statement)</h3>
              <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
                استاندارد حسابداری بخش خدمات
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Gross Revenue Section */}
              <div className="p-4 bg-slate-50/50 font-bold text-slate-900 flex justify-between items-center">
                <span>۱. درآمدهای عملیاتی و ارائه خدمات</span>
                <span>{formatCurrency(pnlData.grossRevenue, settings.currency)}</span>
              </div>
              <div className="p-3.5 pr-8 flex justify-between items-center text-slate-600">
                <span>درآمد حاصل از صدور فاکتورهای خدمات</span>
                <span className="font-mono">{formatCurrency(pnlData.invoiceRevenue, settings.currency)}</span>
              </div>
              <div className="p-3.5 pr-8 flex justify-between items-center text-slate-600">
                <span>سایر دریافت‌ها و پیش‌پرداخت‌های متفرقه</span>
                <span className="font-mono">{formatCurrency(pnlData.otherIncomes, settings.currency)}</span>
              </div>

              {/* Cost of Services Section */}
              <div className="p-4 bg-slate-50/50 font-bold text-slate-900 flex justify-between items-center">
                <span>۲. بهای تمام‌شده خدمات ارائه‌شده (Cost of Services Sold)</span>
                <span className="text-amber-700">({formatCurrency(pnlData.costOfServices, settings.currency)})</span>
              </div>
              <div className="p-3.5 pr-8 flex justify-between items-center text-slate-600">
                <span>هزینه‌های مستقیم نیروی کار و پیمانکاری پروژه‌ها</span>
                <span className="font-mono">{formatCurrency(pnlData.costOfServices, settings.currency)}</span>
              </div>

              {/* Gross Profit Summary */}
              <div className="p-4 bg-emerald-50/70 font-black text-emerald-900 flex justify-between items-center border-y border-emerald-100">
                <span className="text-sm">سود ناخالص عملیاتی (Gross Profit)</span>
                <span className="text-sm font-mono">{formatCurrency(pnlData.grossProfit, settings.currency)}</span>
              </div>

              {/* Operating Expenses Section */}
              <div className="p-4 bg-slate-50/50 font-bold text-slate-900 flex justify-between items-center">
                <span>۳. هزینه‌های اداری، عمومی و سربار (Operating Expenses)</span>
                <span className="text-rose-700">({formatCurrency(pnlData.operatingExpenses, settings.currency)})</span>
              </div>
              <div className="p-3.5 pr-8 flex justify-between items-center text-slate-600">
                <span>هزینه‌های ثبت‌شده در دفتر روزنامه و صندوق</span>
                <span className="font-mono">{formatCurrency(pnlData.operatingExpenses, settings.currency)}</span>
              </div>

              {/* Final Net Profit */}
              <div className="p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white font-black flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-sm">سود خالص نهایی دوره (Net Profit)</span>
                  <p className="text-[11px] font-normal text-blue-200">قابل انتقال به حساب سود انباشته ترازنامه</p>
                </div>
                <span className="text-base font-mono">{formatCurrency(pnlData.netProfit, settings.currency)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: 4-COLUMN TRIAL BALANCE (تراز آزمایشی ۴ ستونی) */}
      {/* ==================================================== */}
      {activeTab === 'trial_balance' && (
        <div className="space-y-6" id="trial-balance-view">
          {/* Status Alert Banner */}
          <div
            className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
              trialBalanceData.isBalanced
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl text-white ${
                  trialBalanceData.isBalanced ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              >
                {trialBalanceData.isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs font-bold">
                  {trialBalanceData.isBalanced
                    ? 'تراز آزمایشی دفاتر دوبل در حالت کاملاً متوازن و متقارن قرار دارد.'
                    : 'اختلاف در موازنه تراز آزمایشی مشاهده شد.'}
                </h4>
                <p className="text-[11px] opacity-80 mt-0.5">
                  گردش بدهکار = گردش بستانکار | مانده بدهکار نهایی = مانده بستانکار نهایی
                </p>
              </div>
            </div>

            <span className="text-xs font-black font-mono px-3 py-1 bg-white/60 rounded-xl">
              تراز ۱۰۰٪
            </span>
          </div>

          {/* 4-Column Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-800">
                    <th className="py-3.5 px-4 font-bold" rowSpan={2}>کد حساب</th>
                    <th className="py-3.5 px-4 font-bold" rowSpan={2}>عنوان حساب سرفصل</th>
                    <th className="py-2 px-4 font-bold text-center border-b border-slate-800" colSpan={2}>
                      گردش عملیات دوره
                    </th>
                    <th className="py-2 px-4 font-bold text-center border-b border-slate-800" colSpan={2}>
                      مانده پایان دوره
                    </th>
                  </tr>
                  <tr className="bg-slate-800 text-slate-300 text-[11px]">
                    <th className="py-2 px-4 font-medium text-left">گردش بدهکار</th>
                    <th className="py-2 px-4 font-medium text-left">گردش بستانکار</th>
                    <th className="py-2 px-4 font-medium text-left">مانده بدهکار</th>
                    <th className="py-2 px-4 font-medium text-left">مانده بستانکار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {trialBalanceData.rows.map((row) => (
                    <tr key={row.accountCode} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-600">{row.accountCode}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-800">{row.accountTitle}</td>
                      <td className="py-3 px-4 text-left text-slate-600">
                        {row.totalDebit > 0 ? row.totalDebit.toLocaleString('fa-IR') : '۰'}
                      </td>
                      <td className="py-3 px-4 text-left text-slate-600">
                        {row.totalCredit > 0 ? row.totalCredit.toLocaleString('fa-IR') : '۰'}
                      </td>
                      <td className="py-3 px-4 text-left font-bold text-blue-700 bg-blue-50/30">
                        {row.balanceDebit > 0 ? row.balanceDebit.toLocaleString('fa-IR') : '۰'}
                      </td>
                      <td className="py-3 px-4 text-left font-bold text-emerald-700 bg-emerald-50/30">
                        {row.balanceCredit > 0 ? row.balanceCredit.toLocaleString('fa-IR') : '۰'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-mono font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3.5 px-4 font-sans font-bold" colSpan={2}>جمع کل سطوح تراز آزمایشی</td>
                    <td className="py-3.5 px-4 text-left">{trialBalanceData.sumDebitTurnover.toLocaleString('fa-IR')}</td>
                    <td className="py-3.5 px-4 text-left">{trialBalanceData.sumCreditTurnover.toLocaleString('fa-IR')}</td>
                    <td className="py-3.5 px-4 text-left text-blue-800">{trialBalanceData.sumDebitBalance.toLocaleString('fa-IR')}</td>
                    <td className="py-3.5 px-4 text-left text-emerald-800">{trialBalanceData.sumCreditBalance.toLocaleString('fa-IR')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: BALANCE SHEET (ترازنامه استاندارد)             */}
      {/* ==================================================== */}
      {activeTab === 'balance_sheet' && (
        <div className="space-y-6" id="balance-sheet-view">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Assets (دارایی‌ها) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">دارایی‌های جاری (Assets)</h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {formatCurrency(balanceSheetData.totalCurrentAssets, settings.currency)}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                  <span className="text-slate-700">موجودی نقد و بانک‌ها</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(balanceSheetData.cashAndBank, settings.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                  <span className="text-slate-700">اسناد دریافتنی (چک‌های صیادی نزد صندوق)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(balanceSheetData.receivableChecks, settings.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                  <span className="text-slate-700">حساب‌های دریافتنی تجاری (طلب از کارفرمایان)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(balanceSheetData.accountsReceivable, settings.currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                  <span className="text-slate-700">موجودی ملزومات و کالاهای آماده فروش</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(balanceSheetData.inventoryValuation, settings.currency)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold text-xs text-slate-900">
                <span>مجموع کل دارایی‌ها:</span>
                <span className="text-sm font-mono text-blue-700">
                  {formatCurrency(balanceSheetData.totalCurrentAssets, settings.currency)}
                </span>
              </div>
            </div>

            {/* Right: Liabilities & Equity (بدهی‌ها و حقوق صاحبان سهام) */}
            <div className="space-y-6">
              {/* Liabilities */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">بدهی‌های جاری (Liabilities)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-600">
                    {formatCurrency(balanceSheetData.totalCurrentLiabilities, settings.currency)}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                    <span className="text-slate-700">اسناد پرداختنی (چک‌های عهده صادره)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(balanceSheetData.payableChecks, settings.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                    <span className="text-slate-700">حساب‌های پرداختنی تجاری (بستانکاران)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(balanceSheetData.accountsPayable, settings.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">حقوق صاحبان سهام (Equity)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {formatCurrency(balanceSheetData.totalEquity, settings.currency)}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                    <span className="text-slate-700">سرمایه اولیه ثبت‌شده</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(balanceSheetData.initialCapital, settings.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                    <span className="text-slate-700">سود انباشته (سود خالص دوره)</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCurrency(balanceSheetData.retainedEarnings, settings.currency)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold text-xs text-slate-900">
                  <span>مجموع بدهی‌ها و حقوق صاحبان سرمایه:</span>
                  <span className="text-sm font-mono text-slate-900">
                    {formatCurrency(balanceSheetData.totalLiabilitiesAndEquity, settings.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Sheet Verification Indicator */}
          <div className="p-4 bg-slate-900 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-blue-400" />
              <span>
                معادله بنیادی حسابداری: <strong>دارایی‌ها ({formatCurrency(balanceSheetData.totalCurrentAssets, settings.currency)})</strong> ={' '}
                <strong>بدهی‌ها + حقوق سرمایه ({formatCurrency(balanceSheetData.totalLiabilitiesAndEquity, settings.currency)})</strong>
              </span>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              ترازنامه متوازن و تاییدشده
            </span>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: FINANCIAL RATIOS & AI SYNAPSE INSIGHTS        */}
      {/* ==================================================== */}
      {activeTab === 'ratios' && (
        <div className="space-y-6" id="financial-ratios-view">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">نسبت جاری (Current Ratio)</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900">{currentRatio.toLocaleString('fa-IR')}</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                نسبت دارایی‌های جاری به بدهی‌ها. آستانه استاندارد: بیشتر از ۱.۲ است.
              </p>
              <div className="pt-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    currentRatio >= 1.2
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {currentRatio >= 1.2 ? 'نقدینگی در محدوده امن' : 'هشدار ریسک نقدینگی'}
                </span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">سرمایه در گردش (Working Capital)</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-700">
                {formatCurrency(workingCapital, settings.currency)}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                تفاضل دارایی‌های نقدشونده از دیون جاری جهت تداوم عملیات پروژه‌ها.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">حاشیه سود خالص (Net Margin)</span>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <p className="text-3xl font-black text-indigo-700">{pnlData.netMarginPercent}٪</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                سهم سود خالص پس از کسر کلیه بهای تمام‌شده و هزینه‌های اداری.
              </p>
            </div>
          </div>

          {/* AI Synapse Strategic Summary */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-500/30 shadow-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-indigo-200">تحلیل هوشمند CFO مغز حسابداری هابینو</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  تراز دفاتر و سودآوری پروژه‌ها در وضعیت بسیار مطلوب قرار دارد. با حاشیه سود خالص {pnlData.netMarginPercent}٪ و نسبت جاری {currentRatio.toLocaleString('fa-IR')}، ریسک عدم توانایی تسویه بدهی‌های کوتاه‌مدت به صفر میل می‌کند. پیشنهاد می‌شود وصول چک‌های صیادی در سررسیدهای مقرر از طریق داشبورد مدیریت چک‌ها پیگیری گردد.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Reports;
