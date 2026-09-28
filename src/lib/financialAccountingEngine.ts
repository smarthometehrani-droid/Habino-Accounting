/**
 * Habino Financial Accounting Engine (Unified Financial Kernel)
 * هسته محاسبات استاندارد مالی و حسابداری دوبل هابینو
 * 
 * پیاده‌سازی منطبق بر استانداردهای سازمان حسابرسی و اصول پذیرفته‌شده حسابداری (GAAP / IFRS):
 * ۱. معادله اساسی حسابداری: دارایی‌ها = بدهی‌ها + حقوق صاحبان سهام
 * ۲. اصل تطابق هزینه‌ها و درآمدها (Matching Principle)
 * ۳. بهای تمام‌شده کالای فروش‌رفته (COGS) و تفکیک سود ناخالص از سود خالص
 * ۴. تفکیک جریان نقدینگی (Cash Flow) از سود و زیان تعهدی (Accrual P&L)
 * ۵. نسبت‌های استاندارد سلامت مالی (نسبت جاری، نسبت سریع، حاشیه سود)
 */

import { Invoice, Transaction, Check, InventoryItem, Project, BankAccount, Client } from '../types';

export interface IncomeStatementBreakdown {
  // ۱. فروش و درآمدهای عملیاتی
  grossSales: number;           // فروش ناخالص
  salesDiscounts: number;       // تخفیفات فروش
  salesReturns: number;         // برگشت از فروش
  netSales: number;             // فروش خالص

  // ۲. بهای تمام‌شده (COGS)
  goodsCost: number;            // بهای تمام‌شده کالاهای فروخته‌شده
  servicesCost: number;         // بهای تمام‌شده خدمات مستقیم و پروژه‌ها
  totalCogs: number;            // کل بهای تمام‌شده کالای فروش‌رفته (COGS)

  // ۳. سود ناخالص (Gross Profit)
  grossProfit: number;          // سود (زیان) ناخالص
  grossMarginPercent: number;   // حاشیه سود ناخالص (درصد)

  // ۴. هزینه‌های عملیاتی (OPEX)
  operatingExpenses: number;    // هزینه‌های اداری، عمومی، توزیع و فروش
  operatingProfit: number;      // سود (زیان) عملیاتی

  // ۵. اقلام غیرعملیاتی و مالیات
  otherIncomes: number;         // سایر درآمدهای غیرعملیاتی (سود بانکی، متفرقه)
  otherExpenses: number;        // سایر هزینه‌های غیرعملیاتی
  taxes: number;                // مالیات‌ها
  
  // ۶. سود خالص نهایی (Net Profit)
  netProfit: number;            // سود (زیان) خالص دوره
  netMarginPercent: number;     // حاشیه سود خالص (درصد)
}

export interface BalanceSheetSummary {
  cashAndBanks: number;         // نقد و بانک‌ها
  receivableChecks: number;     // اسناد دریافتنی نزد صندوق (چک‌های در جریان وصول)
  accountsReceivable: number;   // حساب‌ها و اسناد دریافتنی تجاری (طلب از مشتریان)
  inventoryValuation: number;   // موجودی کالای انبار به بهای تمام‌شده
  currentAssets: number;        // کل دارایی‌های جاری
  
  accountsPayable: number;      // حساب‌های پرداختنی تجاری (بدهی به بستانکاران)
  payableChecks: number;        // اسناد پرداختنی (چک‌های سررسیدنشده)
  currentLiabilities: number;   // کل بدهی‌های جاری

  workingCapital: number;       // سرمایه در گردش (دارایی جاری - بدهی جاری)
  netEquity: number;            // حقوق صاحبان سهام / خالص دارایی‌ها
}

export interface FinancialHealthRatios {
  currentRatio: number;         // نسبت جاری: دارایی جاری / بدهی جاری (ایمن >= ۱.۲)
  quickRatio: number;           // نسبت سریع (آنی): (دارایی جاری - موجودی کالا) / بدهی جاری (ایمن >= ۱.۰)
  debtRatio: number;            // نسبت بدهی: بدهی کل / دارایی کل
  liquidityStatus: 'stable' | 'watch' | 'warning' | 'critical';
  liquidityMessageFa: string;
}

export interface CashFlowSummary {
  actualAvailableCash: number;  // نقدینگی فعال و در دسترس در بانک‌ها و صندوق
  pendingIncomingChecks: number;// چک‌های ورودی در انتظار سررسید
  pendingOutgoingChecks: number;// چک‌های خروجی در انتظار پاس شدن
  predictive30DayCash: number;  // پیش‌بینی نقدینگی ۳۰ روزه (نقد + ورودی - خروجی)
}

export interface AccountingCycleResult {
  pnl: IncomeStatementBreakdown;
  balanceSheet: BalanceSheetSummary;
  ratios: FinancialHealthRatios;
  cashFlow: CashFlowSummary;
}

export interface CalculateAccountingCycleParams {
  invoices: Invoice[];
  transactions: Transaction[];
  inventory: InventoryItem[];
  projects?: Project[];
  checks?: Check[];
  bankAccounts?: BankAccount[];
  clients?: Client[];
}

/**
 * تابع جامع محاسبه چرخه کامل حسابداری بر اساس استانداردهای دوبل و GAAP
 */
export function calculateAccountingCycle({
  invoices = [],
  transactions = [],
  inventory = [],
  projects = [],
  checks = [],
  bankAccounts = [],
  clients = []
}: CalculateAccountingCycleParams): AccountingCycleResult {

  // ۱. فیلتر کردن فاکتورهای معتبر و فعال (نادیده گرفتن فاکتورهای حذف شده یا باطل شده)
  const activeInvoices = invoices.filter(inv => !inv.is_deleted && inv.status !== 'cancelled');

  // ۲. فاکتورهای فروش و برگشت از فروش
  const salesInvoices = activeInvoices.filter(inv => 
    inv.type === 'sale' || inv.type === 'service' || inv.type === 'proforma_sale'
  );
  const returnInvoices = activeInvoices.filter(inv => inv.type === 'sale_return');

  // ۲.۱. محاسبه فروش ناخالص، تخفیفات و برگشت از فروش
  let grossSales = 0;
  let salesDiscounts = 0;

  salesInvoices.forEach(inv => {
    let invoiceItemsGross = 0;
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach(it => {
        const lineGross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
        const lineDiscount = Number(it.discount) || 0;
        invoiceItemsGross += lineGross;
        salesDiscounts += lineDiscount;
      });
    } else {
      invoiceItemsGross = (Number(inv.subtotal) || 0) + (Number(inv.totalDiscount) || 0);
      salesDiscounts += Number(inv.totalDiscount) || 0;
    }
    grossSales += invoiceItemsGross;
  });

  const salesReturns = returnInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || Number(inv.subtotal) || 0), 0);
  const netSales = Math.max(0, grossSales - salesDiscounts - salesReturns);

  // ۲.۲. محاسبه بهای تمام‌شده کالای فروش‌رفته (Cost of Goods Sold - COGS)
  // برای هر قلم فاکتور فروش، بهای خرید واقعی کالا از کاردکس انبار یا متادیتای خرید استخراج می‌شود
  let goodsCost = 0;

  salesInvoices.forEach(inv => {
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach(it => {
        const qty = Number(it.quantity) || 0;
        if (qty <= 0) return;

        // پیدا کردن بهای خرید واحد:
        // ۱. متادیتای اختصاصی قلم (در صورت وجود)
        // ۲. کاردکس کالای متناظر در انبار بر اساس ID یا نام کالا
        let unitBuyPrice = 0;
        if (it.metadata && typeof it.metadata.buyPrice === 'number' && it.metadata.buyPrice > 0) {
          unitBuyPrice = it.metadata.buyPrice;
        } else {
          const matchedInv = inventory.find(item => 
            (it.itemId && item.id === it.itemId) ||
            (it.code && item.code && item.code === it.code) ||
            (item.name && it.description && item.name.trim().toLowerCase() === it.description.trim().toLowerCase())
          );
          if (matchedInv && Number(matchedInv.buyPrice) > 0) {
            unitBuyPrice = Number(matchedInv.buyPrice);
          }
        }

        goodsCost += (qty * unitBuyPrice);
      });
    }
  });

  // کسر بهای تمام‌شده اقلام برگشت داده شده
  returnInvoices.forEach(inv => {
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach(it => {
        const qty = Number(it.quantity) || 0;
        const matchedInv = inventory.find(item => 
          (it.itemId && item.id === it.itemId) ||
          (item.name && it.description && item.name.trim().toLowerCase() === it.description.trim().toLowerCase())
        );
        if (matchedInv && Number(matchedInv.buyPrice) > 0) {
          goodsCost = Math.max(0, goodsCost - (qty * Number(matchedInv.buyPrice)));
        }
      });
    }
  });

  // ۲.۳. بهای تمام‌شده خدمات مستقیم و نیروی کار پروژه‌ها
  const directProjectCosts = projects.reduce((sum, p) => sum + (Number(p.totalExpense) || 0), 0);
  const servicesCost = directProjectCosts;
  const totalCogs = goodsCost + servicesCost;

  // ۳. محاسبه سود ناخالص و حاشیه سود ناخالص
  const grossProfit = netSales - totalCogs;
  const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // ۴. تفکیک هزینه‌های جاری و عملیاتی (OPEX)
  // طبق اصل تعهدی، تراکنش‌های خرید دارایی/انبار نباید مجدداً در هزینه‌های جاری جمع شوند
  const nonOperatingExpenseKeywords = ['خرید کالا', 'موجودی کالا', 'سرمایه‌گذاری', 'برداشت مالک', 'انتقال'];
  
  let operatingExpenses = 0;
  let otherExpenses = 0;

  transactions.filter(t => t.type === 'expense').forEach(t => {
    const desc = (t.description || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    const isAssetPurchase = nonOperatingExpenseKeywords.some(kw => desc.includes(kw) || cat.includes(kw));

    if (isAssetPurchase) {
      // خرید دارایی یا کالا است و قبلاً در COGS/موجودی لحاظ می‌شود
      otherExpenses += Number(t.amount) || 0;
    } else {
      operatingExpenses += Number(t.amount) || 0;
    }
  });

  const operatingProfit = grossProfit - operatingExpenses;

  // ۵. درآمدهای متفرقه و غیرعملیاتی (سود بانکی، درآمدهای نقدی بدون فاکتور)
  const otherIncomes = transactions
    .filter(t => t.type === 'income' && !t.relatedInvoiceId)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const taxes = 0; // مالیات عملکرد در پایان دوره بسته می‌شود

  // ۶. سود خالص دوره مالی (Net Profit)
  const netProfit = operatingProfit + otherIncomes - taxes;
  const totalRevenueForMargin = netSales + otherIncomes;
  const netMarginPercent = totalRevenueForMargin > 0 ? (netProfit / totalRevenueForMargin) * 100 : 0;

  // ۷. ترازنامه و دارایی‌های جاری
  const bankAccountsTotal = bankAccounts.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);
  
  // اگر حساب بانکی ثبت نشده، موجودی نقد از گردش خالص تراکنش‌ها به دست می‌آید
  const transactionCashFlow = transactions.reduce((acc, t) => {
    if (t.type === 'income') return acc + (Number(t.amount) || 0);
    if (t.type === 'expense') return acc - (Number(t.amount) || 0);
    return acc;
  }, 0);

  const cashAndBanks = bankAccountsTotal > 0 ? bankAccountsTotal : Math.max(0, transactionCashFlow);

  // چک‌های اسناد دریافتنی و پرداختنی
  const pendingReceivableChecks = checks
    .filter(c => c.type === 'receivable' && c.status === 'pending')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const pendingPayableChecks = checks
    .filter(c => c.type === 'payable' && c.status === 'pending')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  // ارزش دفتری موجودی کالا در انبار (بر اساس بهای تمام‌شده خرید)
  const inventoryValuation = inventory.reduce((sum, item) => {
    const stock = Math.max(0, Number(item.stock) || 0);
    const buyPrice = Number(item.buyPrice) || 0;
    return sum + (stock * buyPrice);
  }, 0);

  // مطالبات تجاری (حساب‌های دریافتنی از مشتریان)
  const accountsReceivable = clients
    .filter(c => (Number(c.balance) || 0) > 0)
    .reduce((sum, c) => sum + Number(c.balance), 0);

  // بدهی‌های تجاری (حساب‌های پرداختنی به تأمین‌کنندگان / بستانکاران)
  const accountsPayable = clients
    .filter(c => (Number(c.balance) || 0) < 0)
    .reduce((sum, c) => sum + Math.abs(Number(c.balance)), 0);

  const currentAssets = cashAndBanks + pendingReceivableChecks + accountsReceivable + inventoryValuation;
  const currentLiabilities = accountsPayable + pendingPayableChecks;
  const workingCapital = currentAssets - currentLiabilities;
  const netEquity = currentAssets - currentLiabilities;

  // ۸. نسبت‌های استاندارد سلامت مالی
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : (currentAssets > 0 ? 99 : 1);
  const quickAssets = Math.max(0, currentAssets - inventoryValuation);
  const quickRatio = currentLiabilities > 0 ? quickAssets / currentLiabilities : (quickAssets > 0 ? 99 : 1);
  const debtRatio = currentAssets > 0 ? (currentLiabilities / currentAssets) * 100 : 0;

  let liquidityStatus: 'stable' | 'watch' | 'warning' | 'critical' = 'stable';
  let liquidityMessageFa = 'وضعیت تراز نقدینگی و توان ایفای تعهدات پایدار است.';

  if (currentRatio < 1.0) {
    liquidityStatus = 'critical';
    liquidityMessageFa = 'هشدار بحران نقدینگی: تعهدات جاری بیش از دارایی‌های نقد و نقدشونده است.';
  } else if (currentRatio < 1.2) {
    liquidityStatus = 'warning';
    liquidityMessageFa = 'شاخص نسبت جاری زیر مرز مطمئن ۱.۲ است؛ جریان نقدینگی نیازمند کنترل است.';
  } else if (quickRatio < 1.0 && currentRatio >= 1.2) {
    liquidityStatus = 'watch';
    liquidityMessageFa = 'بخش عمده دارایی‌ها در انبار قفل شده است (نسبت سریع کمتر از ۱.۰).';
  }

  // ۹. پیش‌بینی نقدینگی ۳۰ روزه
  const predictive30DayCash = cashAndBanks + pendingReceivableChecks - pendingPayableChecks;

  return {
    pnl: {
      grossSales,
      salesDiscounts,
      salesReturns,
      netSales,
      goodsCost,
      servicesCost,
      totalCogs,
      grossProfit,
      grossMarginPercent,
      operatingExpenses,
      operatingProfit,
      otherIncomes,
      otherExpenses,
      taxes,
      netProfit,
      netMarginPercent
    },
    balanceSheet: {
      cashAndBanks,
      receivableChecks: pendingReceivableChecks,
      accountsReceivable,
      inventoryValuation,
      currentAssets,
      accountsPayable,
      payableChecks: pendingPayableChecks,
      currentLiabilities,
      workingCapital,
      netEquity
    },
    ratios: {
      currentRatio: Number(currentRatio.toFixed(2)),
      quickRatio: Number(quickRatio.toFixed(2)),
      debtRatio: Number(debtRatio.toFixed(1)),
      liquidityStatus,
      liquidityMessageFa
    },
    cashFlow: {
      actualAvailableCash: cashAndBanks,
      pendingIncomingChecks: pendingReceivableChecks,
      pendingOutgoingChecks: pendingPayableChecks,
      predictive30DayCash
    }
  };
}
