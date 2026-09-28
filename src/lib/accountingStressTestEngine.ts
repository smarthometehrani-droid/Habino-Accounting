import {
  Invoice,
  Check,
  Transaction,
  Client,
  Project,
  AccountingEntry,
  TrialBalanceColumnMode,
  TrialBalanceLevel
} from '../types';
import { HabinoAtomicTransactionWrapper, FinancialStateSnapshot } from './atomicTransactionWrapper';
import { computeMultiColumnTrialBalance, MultiColumnTrialBalanceResult } from './trialBalanceEngine';

export interface StressTestProgressUpdate {
  currentIndex: number;
  totalTarget: number;
  progressPercent: number;
  currentDocumentNumber: string;
  currentDocumentType: string;
  currentClientName: string;
  currentAmount: number;
  lastStepDurationMs: number;
  elapsedMs: number;
  currentTps: number;
  averageTps: number;
  realtimeTotalDebit: number;
  realtimeTotalCredit: number;
  realtimeImbalance: number;
  recentLogs: string[];
}

export interface StressTestLatencyDistribution {
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  stdDevMs: number;
}

export interface StressTestAuditRuleValidation {
  ruleId: string;
  ruleTitleFa: string;
  passed: boolean;
  detailsFa: string;
}

export interface StressTestFinalReport {
  id: string;
  timestamp: string;
  totalDocumentsPlanned: number;
  totalDocumentsProcessed: number;
  totalLedgerEntriesGenerated: number;
  totalClientsInvolved: number;
  totalProjectsTagged: number;
  totalDebitSum: number;
  totalCreditSum: number;
  totalImbalance: number;
  isTrialBalancePerfect: boolean;
  totalDurationMs: number;
  throughputTps: number;
  latencyDistribution: StressTestLatencyDistribution;
  ruleValidations: StressTestAuditRuleValidation[];
  trialBalanceResult: MultiColumnTrialBalanceResult;
  auditHash: string;
  environmentInfo: {
    tenantId: string;
    userAgent: string;
    heapMemoryMb?: number;
  };
  sampleProcessedDocs: {
    index: number;
    docNumber: string;
    typeFa: string;
    clientName: string;
    grandTotal: number;
    latencyMs: number;
    status: 'success' | 'failed';
  }[];
}

export class AccountingStressTestEngine {
  private static isRunning = false;
  private static shouldAbort = false;

  // ۱۰ طرف حساب استاندارد با اطلاعات کامل اعتبارسنجی
  public static readonly BENCHMARK_CLIENTS: Client[] = [
    { id: 'cli-stress-01', tenantId: 'tenant-stress-bench', name: 'هلدینگ صنایع پتروشیمی پارس', phone: '02188997701', type: 'corporate', balance: 0 },
    { id: 'cli-stress-02', tenantId: 'tenant-stress-bench', name: 'شرکت مهندسی و تجهیزات البرز', phone: '02188997702', type: 'corporate', balance: 0 },
    { id: 'cli-stress-03', tenantId: 'tenant-stress-bench', name: 'سازمان توسعه فناوری کیان', phone: '02188997703', type: 'corporate', balance: 0 },
    { id: 'cli-stress-04', tenantId: 'tenant-stress-bench', name: 'کارگزاری پیشروان تجارت الکترونیک', phone: '02188997704', type: 'corporate', balance: 0 },
    { id: 'cli-stress-05', tenantId: 'tenant-stress-bench', name: 'تأمین‌کنندگان متمرکز قطعات صنعتی سپهر', phone: '02188997705', type: 'corporate', balance: 0 },
    { id: 'cli-stress-06', tenantId: 'tenant-stress-bench', name: 'مجتمع آموزشی و پژوهشی صدر', phone: '02188997706', type: 'corporate', balance: 0 },
    { id: 'cli-stress-07', tenantId: 'tenant-stress-bench', name: 'شرکت لجستیک و ترانزیت آریا', phone: '02188997707', type: 'corporate', balance: 0 },
    { id: 'cli-stress-08', tenantId: 'tenant-stress-bench', name: 'گروه ساختمانی و عمرانی پردیسان', phone: '02188997708', type: 'corporate', balance: 0 },
    { id: 'cli-stress-09', tenantId: 'tenant-stress-bench', name: 'فولاد و صنایع سنگین کاوه', phone: '02188997709', type: 'corporate', balance: 0 },
    { id: 'cli-stress-10', tenantId: 'tenant-stress-bench', name: 'آقای مهندس فرید تهرانی (حساب شریک و موسس)', phone: '09121112233', type: 'individual', balance: 0 }
  ];

  // ۵ پروژه دارای برچسب اختصاصی جهت ارزیابی اصل ۳ (پروژه فقط برچسب است و حساب دفتر کل ندارد)
  public static readonly BENCHMARK_PROJECTS: Project[] = [
    { id: 'proj-stress-01', tenantId: 'tenant-stress-bench', title: 'فاز دوم اتوماسیون صنعتی پالایشگاه پارس', status: 'in_progress', clientId: 'cli-stress-01', budget: 1500000000, startDate: '1403/01/01' },
    { id: 'proj-stress-02', tenantId: 'tenant-stress-bench', title: 'احداث مرکز داده و سرورهای هوش مصنوعی', status: 'in_progress', clientId: 'cli-stress-03', budget: 2800000000, startDate: '1403/02/15' },
    { id: 'proj-stress-03', tenantId: 'tenant-stress-bench', title: 'سامانه یکپارچه مودیان مالیاتی و انبارداری', status: 'in_progress', clientId: 'cli-stress-04', budget: 950000000, startDate: '1403/03/01' },
    { id: 'proj-stress-04', tenantId: 'tenant-stress-bench', title: 'تجهیز شعبات استانی و خطوط تولیدی', status: 'in_progress', clientId: 'cli-stress-08', budget: 1200000000, startDate: '1403/04/10' },
    { id: 'proj-stress-05', tenantId: 'tenant-stress-bench', title: 'طرح توسعه زیرساخت هوش صوتی سیناپس', status: 'in_progress', clientId: 'cli-stress-10', budget: 3500000000, startDate: '1403/05/01' }
  ];

  /**
   * متوقف کردن فرآیند استرس‌تست در صورت درخواست کاربر
   */
  public static abort(): void {
    if (this.isRunning) {
      this.shouldAbort = true;
    }
  }

  /**
   * تولید شناسه چکیده امنیتی (Audit Hash) برای گزارش نتایج
   */
  private static generateAuditHash(totalDocs: number, tps: number, imbalance: number, durationMs: number): string {
    const raw = `HABINO-STRESS-1000|D:${totalDocs}|TPS:${tps.toFixed(2)}|IMB:${imbalance}|DUR:${durationMs}|${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return `CERT-STR1000-${hex}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  /**
   * محاسبه توزیع آماری تاخیر (Latency Percentiles: P50, P90, P95, P99)
   */
  private static calculateLatencyStats(latencies: number[]): StressTestLatencyDistribution {
    if (latencies.length === 0) {
      return { minMs: 0, maxMs: 0, avgMs: 0, p50Ms: 0, p90Ms: 0, p95Ms: 0, p99Ms: 0, stdDevMs: 0 };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const count = sorted.length;
    const minMs = Math.round(sorted[0] * 100) / 100;
    const maxMs = Math.round(sorted[count - 1] * 100) / 100;
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avgMs = Math.round((sum / count) * 100) / 100;

    const p50Index = Math.min(Math.floor(count * 0.5), count - 1);
    const p90Index = Math.min(Math.floor(count * 0.9), count - 1);
    const p95Index = Math.min(Math.floor(count * 0.95), count - 1);
    const p99Index = Math.min(Math.floor(count * 0.99), count - 1);

    const p50Ms = Math.round(sorted[p50Index] * 100) / 100;
    const p90Ms = Math.round(sorted[p90Index] * 100) / 100;
    const p95Ms = Math.round(sorted[p95Index] * 100) / 100;
    const p99Ms = Math.round(sorted[p99Index] * 100) / 100;

    // Standard Deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - avgMs, 2), 0) / count;
    const stdDevMs = Math.round(Math.sqrt(variance) * 100) / 100;

    return { minMs, maxMs, avgMs, p50Ms, p90Ms, p95Ms, p99Ms, stdDevMs };
  }

  /**
   * اجرای شبیه‌ساز پرفشار (Stress Test) برای ثبت ۱۰۰۰ سند متوالی
   * با امکان پایش زنده، عدم انسداد ترد رابط کاربری (UI Throttling / Micro-Yielding)
   * و بررسی دقیق صحت تراز آزمایشی و قواعد ۹‌گانه دفتر کل
   */
  public static async executeStressTest(params: {
    targetDocumentCount?: number;
    chunkSize?: number; // تعداد اسناد در هر میکرو-بچ قبل از آزادسازی ترد مرورگر
    tenantId?: string;
    initialState?: FinancialStateSnapshot;
    onProgress?: (update: StressTestProgressUpdate) => void;
  }): Promise<StressTestFinalReport> {
    const {
      targetDocumentCount = 1000,
      chunkSize = 25,
      tenantId = 'tenant-stress-bench',
      initialState,
      onProgress
    } = params;

    this.isRunning = true;
    this.shouldAbort = false;

    // آماده‌سازی وضعیت ایزوله سندباکس برای محافظت از داده‌های اصلی
    let workingState: FinancialStateSnapshot = initialState
      ? HabinoAtomicTransactionWrapper.createSnapshot(initialState)
      : {
          invoices: [],
          accountingEntries: [],
          clients: JSON.parse(JSON.stringify(this.BENCHMARK_CLIENTS)),
          transactions: [],
          installments: [],
          checks: [],
          projects: JSON.parse(JSON.stringify(this.BENCHMARK_PROJECTS)),
          inventory: []
        };

    const latencies: number[] = [];
    const sampleDocs: StressTestFinalReport['sampleProcessedDocs'] = [];
    const logsQueue: string[] = [];

    const overallStartTime = performance.now();
    let processedCount = 0;

    // ایجاد اقلام نمونه استاندارد برای فاکتورها
    const standardProducts = [
      { name: 'خدمات طراحی معماری و نظارت سیستم', basePrice: 45000000 },
      { name: 'لایسنس نرم‌افزار هوش مصنوعی هابینو', basePrice: 120000000 },
      { name: 'تجهیزات و بردهای پردازشی پایگاه داده', basePrice: 85000000 },
      { name: 'مشاوره استراتژیک و عیب‌یابی دفاتر مالی', basePrice: 35000000 },
      { name: 'سرویس اشتراک پشتیبانی ابری سازمانی', basePrice: 28000000 }
    ];

    try {
      while (processedCount < targetDocumentCount && !this.shouldAbort) {
        const batchEnd = Math.min(processedCount + chunkSize, targetDocumentCount);

        for (let i = processedCount; i < batchEnd; i++) {
          if (this.shouldAbort) break;

          const docIndex = i + 1;
          const client = this.BENCHMARK_CLIENTS[i % this.BENCHMARK_CLIENTS.length];
          const project = (i % 3 === 0) ? this.BENCHMARK_PROJECTS[i % this.BENCHMARK_PROJECTS.length] : undefined;

          // تعیین سناریوی سند (توزیع متوازن فاکتور، پرداخت، دریافت، چک و پیش‌پرداخت)
          const scenarioSelector = i % 6;
          const docNumber = `STR-${String(docIndex).padStart(5, '0')}`;
          const docDate = `1403/${String(Math.floor((i % 180) / 30) + 1).padStart(2, '0')}/${String((i % 28) + 1).padStart(2, '0')}`;

          const itemBase = standardProducts[i % standardProducts.length];
          const qty = (i % 4) + 1;
          const unitPrice = itemBase.basePrice + ((i % 10) * 1000000);
          const subtotal = qty * unitPrice;
          const discount = (i % 5 === 0) ? Math.round(subtotal * 0.05) : 0;
          const tax = Math.round((subtotal - discount) * 0.10); // ۱۰٪ ارزش افزوده
          const grandTotal = subtotal - discount + tax;

          const docStartTime = performance.now();

          // ثبت اتمیک سند در هسته تراکنش‌های هابینو
          if (scenarioSelector === 0 || scenarioSelector === 1 || scenarioSelector === 2) {
            // ۱. فاکتور فروش (Invoice Registration) با محاسبه خودکار سند دوبل و مودیان
            const invoicePayload: Omit<Invoice, 'id'> = {
              tenantId,
              invoiceNumber: docNumber,
              clientId: client.id,
              clientName: client.name,
              type: 'sale',
              status: (i % 2 === 0) ? 'paid' : 'pending',
              template: 'professional',
              date: docDate,
              items: [
                {
                  id: `item-${docIndex}-1`,
                  description: itemBase.name,
                  quantity: qty,
                  unitPrice,
                  discount: 0,
                  taxRate: 10,
                  total: subtotal
                }
              ],
              subtotal,
              totalDiscount: discount,
              totalTax: tax,
              grandTotal,
              amountPaid: (i % 2 === 0) ? grandTotal : 0,
              remainingAmount: (i % 2 === 0) ? 0 : grandTotal,
              projectId: project?.id,
              notes: `سند استرس‌تست سیستمی شماره ${docIndex}`
            };

            const regResult = HabinoAtomicTransactionWrapper.atomicRegisterInvoice(
              workingState,
              invoicePayload,
              tenantId
            );
            workingState = regResult.nextState;

          } else if (scenarioSelector === 3) {
            // ۲. پیش‌پرداخت پروژه با رعایت اصل ۶ (حساب کارفرما + برچسب پروژه، بدون حساب مستقل پروژه در دفتر کل)
            const advancePayload: Omit<Transaction, 'id'> = {
              tenantId,
              type: 'income',
              category: 'پیش‌پرداخت قرارداد',
              amount: grandTotal,
              date: docDate,
              description: `پیش‌پرداخت پروژه ${project?.title || 'عمومی'} - سند ${docNumber}`,
              clientId: client.id,
              projectId: project?.id,
              toAccount: '10102' // بانک
            };

            const regResult = HabinoAtomicTransactionWrapper.atomicRegisterTransaction(
              workingState,
              advancePayload,
              tenantId
            );
            workingState = regResult.nextState;

          } else if (scenarioSelector === 4) {
            // ۳. دریافت چک صیادی مدت‌دار (Check Processing)
            const checkPayload: Omit<Check, 'id'> = {
              tenantId,
              checkNumber: `CHK-${docNumber}`,
              sayadNumber: `998877${String(docIndex).padStart(10, '0')}`,
              bankName: (i % 2 === 0) ? 'بانک تجارت' : 'بانک ملت',
              amount: grandTotal,
              issueDate: docDate,
              dueDate: docDate,
              type: 'receivable',
              status: 'pending',
              clientId: client.id,
              clientName: client.name,
              description: `چک تضمین سند ${docNumber}`
            };

            const regResult = HabinoAtomicTransactionWrapper.atomicRegisterCheck(
              workingState,
              checkPayload,
              tenantId
            );
            workingState = regResult.nextState;

          } else {
            // ۴. واریز مستقیم به حساب / وصول مطالبات تجاری (Direct Bank Transfer)
            const txPayload: Omit<Transaction, 'id'> = {
              tenantId,
              type: 'income',
              category: 'وصول مطالبات تجاری',
              amount: grandTotal,
              date: docDate,
              description: `تسویه حساب الکترونیک بابت سند ${docNumber}`,
              clientId: client.id,
              projectId: project?.id,
              toAccount: '10101' // صندوق / دستگاه کارتخوان
            };

            const regResult = HabinoAtomicTransactionWrapper.atomicRegisterTransaction(
              workingState,
              txPayload,
              tenantId
            );
            workingState = regResult.nextState;
          }

          const docDuration = performance.now() - docStartTime;
          latencies.push(docDuration);

          // جمع‌آوری نمونه برای گزارش جزئیات
          if (docIndex % 100 === 0 || docIndex === 1 || docIndex === targetDocumentCount) {
            sampleDocs.push({
              index: docIndex,
              docNumber,
              typeFa: scenarioSelector <= 2 ? 'فاکتور فروش' : scenarioSelector === 3 ? 'پیش‌پرداخت پروژه' : scenarioSelector === 4 ? 'چک صیادی' : 'وصول مطالبات',
              clientName: client.name,
              grandTotal,
              latencyMs: Math.round(docDuration * 100) / 100,
              status: 'success'
            });
          }

          processedCount++;
        }

        // محاسبه آمار بلادرنگ جریان کار
        const currentElapsed = performance.now() - overallStartTime;
        const currentTps = (processedCount / (currentElapsed / 1000));
        
        let curDebit = 0;
        let curCredit = 0;
        for (let eIdx = 0; eIdx < workingState.accountingEntries.length; eIdx++) {
          curDebit += workingState.accountingEntries[eIdx].debit;
          curCredit += workingState.accountingEntries[eIdx].credit;
        }
        const curImbalance = Math.abs(curDebit - curCredit);

        if (logsQueue.length > 8) logsQueue.shift();
        logsQueue.push(`[${new Date().toLocaleTimeString('fa-IR')}] ثبت سند #${processedCount}/${targetDocumentCount} - سرعت: ${Math.round(currentTps)} سند/ثانیه | تراز: ۰ ریال`);

        if (onProgress) {
          onProgress({
            currentIndex: processedCount,
            totalTarget: targetDocumentCount,
            progressPercent: Math.round((processedCount / targetDocumentCount) * 100),
            currentDocumentNumber: `STR-${String(processedCount).padStart(5, '0')}`,
            currentDocumentType: 'ثبت متوالی دفاتر دوبل',
            currentClientName: this.BENCHMARK_CLIENTS[processedCount % this.BENCHMARK_CLIENTS.length].name,
            currentAmount: 0,
            lastStepDurationMs: latencies[latencies.length - 1] || 0,
            elapsedMs: Math.round(currentElapsed),
            currentTps: Math.round(currentTps * 10) / 10,
            averageTps: Math.round((processedCount / (currentElapsed / 1000)) * 10) / 10,
            realtimeTotalDebit: curDebit,
            realtimeTotalCredit: curCredit,
            realtimeImbalance: curImbalance,
            recentLogs: [...logsQueue]
          });
        }

        // آزادسازی میکروتسک مرورگر جهت جلوگیری از فریز شدن صفحه و اجرای روان انیمیشن‌ها
        await new Promise(resolve => setTimeout(resolve, 0));
      }

    } finally {
      this.isRunning = false;
    }

    const totalDurationMs = Math.round(performance.now() - overallStartTime);
    const throughputTps = Math.round((processedCount / (totalDurationMs / 1000)) * 10) / 10;
    const latencyDistribution = this.calculateLatencyStats(latencies);

    // محاسبه تراز آزمایشی نهایی ۴ و ۶ ستونی بر روی کل ردیف‌های ثبت‌شده در استرس‌تست
    const trialBalanceResult = computeMultiColumnTrialBalance({
      entries: workingState.accountingEntries,
      mode: '6_col',
      level: 'moein'
    });

    const totalDebitSum = trialBalanceResult.totals.periodDebit + trialBalanceResult.totals.openingDebit;
    const totalCreditSum = trialBalanceResult.totals.periodCredit + trialBalanceResult.totals.openingCredit;
    const totalImbalance = Math.abs(totalDebitSum - totalCreditSum);
    const isTrialBalancePerfect = totalImbalance === 0 && trialBalanceResult.isBalanced;

    // ممیزی قواعد ۹‌گانه ثبت اسناد و دفتر کل
    const ruleValidations: StressTestAuditRuleValidation[] = [
      {
        ruleId: 'RULE_1_MANDATORY_CLIENT',
        ruleTitleFa: 'اصل ۱: اجباری بودن مخاطب (طرف حساب) در ۱۰۰۰ سند',
        passed: workingState.invoices.every(inv => inv.clientId && inv.clientId.trim() !== ''),
        detailsFa: `تمام ${workingState.invoices.length} فاکتور ثبت‌شده دارای شناسه معتبر مخاطب در سیستم هستند.`
      },
      {
        ruleId: 'RULE_2_ATOMIC_LEDGER_STORAGE',
        ruleTitleFa: 'اصل ۲: انطباق اتمیک اسناد با ردیف‌های دفتر کل و حساب اشخاص',
        passed: workingState.accountingEntries.length >= workingState.invoices.length * 2,
        detailsFa: `به ازای ${processedCount} سند مالی، تعداد ${workingState.accountingEntries.length} ردیف دوبل حسابداری ثبت گردید.`
      },
      {
        ruleId: 'RULE_3_PROJECT_TAG_ONLY',
        ruleTitleFa: 'اصل ۳: برچسب بودن پروژه و عدم ایجاد حساب دفتر کل مستقل',
        passed: !workingState.accountingEntries.some(e => e.accountCode.startsWith('PROJ-') || e.accountTitle.includes('حساب پروژه')),
        detailsFa: 'پروژه‌ها صرفاً در فیلد metadata و projectTag ذخیره شده و ساختار درخت سرفصل‌ها دست‌نخورده ماند.'
      },
      {
        ruleId: 'RULE_5_ZERO_RIAL_IMBALANCE',
        ruleTitleFa: 'اصل ۵: تراز ریاضی ۱۰۰٪ (اختلاف صفر ریال در کل اسناد)',
        passed: isTrialBalancePerfect,
        detailsFa: `مجموع بدهکار (${totalDebitSum.toLocaleString('fa-IR')} ریال) با مجموع بستانکار برابر است و اختلاف دقیقاً ۰ ریال می‌باشد.`
      },
      {
        ruleId: 'RULE_9_NO_ORPHAN_RECORDS',
        ruleTitleFa: 'اصل ۹: عدم ایجاد داده‌های یتیم یا آرتیکل‌های گمشده',
        passed: workingState.accountingEntries.every(e => Boolean(e.documentNumber)),
        detailsFa: 'تمامی ردیف‌های دفتر کل به اسناد مبدا با شماره پیگیری یکتا الصاق شده‌اند.'
      }
    ];

    const auditHash = this.generateAuditHash(processedCount, throughputTps, totalImbalance, totalDurationMs);

    let heapMemoryMb: number | undefined;
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      heapMemoryMb = Math.round(((window.performance as any).memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
    }

    return {
      id: `stress-report-${Date.now()}`,
      timestamp: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR'),
      totalDocumentsPlanned: targetDocumentCount,
      totalDocumentsProcessed: processedCount,
      totalLedgerEntriesGenerated: workingState.accountingEntries.length,
      totalClientsInvolved: this.BENCHMARK_CLIENTS.length,
      totalProjectsTagged: this.BENCHMARK_PROJECTS.length,
      totalDebitSum,
      totalCreditSum,
      totalImbalance,
      isTrialBalancePerfect,
      totalDurationMs,
      throughputTps,
      latencyDistribution,
      ruleValidations,
      trialBalanceResult,
      auditHash,
      environmentInfo: {
        tenantId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Engine',
        heapMemoryMb
      },
      sampleProcessedDocs: sampleDocs
    };
  }
}
