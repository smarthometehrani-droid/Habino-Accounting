/**
 * Habino Atomic Financial Transaction Wrapper
 * لایه تراکنش‌های اتمیک و مکانیزم Rollback قطعی
 * انطباق ۱۰۰٪ با ۹ اصل پایه‌ای ثبت سند و دفتر کل هابینو
 * جهت به صفر رساندن ناترازی دیتابیس در شرایط خطا
 */

import { 
  Invoice, 
  AccountingEntry, 
  Client, 
  Transaction, 
  Installment, 
  Check, 
  Project,
  InventoryItem 
} from '../types';
import { HabinoAccountingKernel } from './accountingKernel';
import { HabinoDistributedLockManager, LockAcquisitionResult } from './distributedLockEngine';
import { HabinoJsonbSchemaValidator } from './jsonbSchemaValidator';

export interface FinancialStateSnapshot {
  invoices: Invoice[];
  accountingEntries: AccountingEntry[];
  clients: Client[];
  transactions: Transaction[];
  installments: Installment[];
  checks: Check[];
  projects: Project[];
  inventory?: InventoryItem[];
}

export interface AtomicOperationResult<T> {
  success: boolean;
  data?: T;
  errorMessage?: string;
  rollbackOccurred: boolean;
}

/**
 * مدیر قفل‌گذاری همزمانی رکوردها (Record Lock Manager)
 * جلوگیری از Race Condition در ویرایش‌ها و تراکنش‌های همزمان با پشتیبانی از قفل توزیع‌شده
 */
export interface BatchInvoiceSettlementItem {
  invoiceId: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'check';
  bankId?: string;
  referenceNumber?: string;
  checkDetails?: {
    checkNumber: string;
    sayadNumber?: string;
    dueDate: string;
    bankName: string;
  };
  notes?: string;
  date?: string;
}

export interface BatchSettlementResult {
  settledInvoices: Invoice[];
  createdTransactions: Transaction[];
  createdEntries: AccountingEntry[];
  createdChecks: Check[];
  totalAmountSettled: number;
}

export interface CloseFiscalYearParams {
  fiscalYear: number;
  closingDate?: string;
  retainedEarningsAccountCode?: string;
  retainedEarningsTitle?: string;
  closingDocumentNumber?: string;
  openingDocumentNumber?: string;
  counterpartyClientId: string;
}

export interface CloseFiscalYearResult {
  fiscalYear: number;
  closingDocumentNumber: string;
  openingDocumentNumber: string;
  totalRevenue: number;
  totalExpense: number;
  netProfitOrLoss: number;
  closingEntriesCount: number;
  openingEntriesCount: number;
}

export class HabinoRecordLockManager {
  private static locks = new Set<string>();

  public static tryLock(resourceKeys: string[]): (() => void) | null {
    if (resourceKeys.some(k => this.locks.has(k))) {
      return null;
    }
    resourceKeys.forEach(k => this.locks.add(k));
    return () => {
      resourceKeys.forEach(k => this.locks.delete(k));
    };
  }

  public static isLocked(resourceKey: string): boolean {
    return this.locks.has(resourceKey);
  }

  public static clearAll(): void {
    this.locks.clear();
  }

  /**
   * دریافت قفل توزیع‌شده چندکاربره به همراه ضربان قلب در سطح سرور و بین تب‌ها
   */
  public static async acquireDistributedLock(params: {
    tenantId: string;
    resourceType: 'invoice' | 'client' | 'check' | 'transaction' | 'installment' | 'project';
    resourceId: string;
    userId: string;
    userName: string;
    ttlSeconds?: number;
  }): Promise<LockAcquisitionResult> {
    return HabinoDistributedLockManager.acquireLock(params);
  }

  /**
   * آزادسازی قفل توزیع‌شده
   */
  public static async releaseDistributedLock(
    tenantId: string,
    resourceType: 'invoice' | 'client' | 'check' | 'transaction' | 'installment' | 'project',
    resourceId: string
  ): Promise<boolean> {
    return HabinoDistributedLockManager.releaseLock(tenantId, resourceType, resourceId);
  }
}

export class HabinoAtomicTransactionWrapper {
  /**
   * عکس‌برداری عمیق (Deep Snapshot) از وضعیت برای بازگشت‌پذیری قطعی
   */
  public static createSnapshot(state: FinancialStateSnapshot): FinancialStateSnapshot {
    return {
      invoices: JSON.parse(JSON.stringify(state.invoices)),
      accountingEntries: JSON.parse(JSON.stringify(state.accountingEntries)),
      clients: JSON.parse(JSON.stringify(state.clients)),
      transactions: JSON.parse(JSON.stringify(state.transactions)),
      installments: JSON.parse(JSON.stringify(state.installments)),
      checks: JSON.parse(JSON.stringify(state.checks)),
      projects: JSON.parse(JSON.stringify(state.projects)),
      inventory: state.inventory ? JSON.parse(JSON.stringify(state.inventory)) : undefined
    };
  }

  /**
   * 🧩 ۱ و ۲) اجرای اتمیک ثبت سند و ذخیره‌سازی در دفتر کل و حساب اشخاص
   * در صورت بروز هرگونه خطا، کل عملیات بلافاصله Rollback می‌شود.
   */
  public static atomicRegisterInvoice(
    currentState: FinancialStateSnapshot,
    invoiceData: Omit<Invoice, 'id'> & { id?: string },
    tenantId: string,
    explicitInvoiceId?: string
  ): { nextState: FinancialStateSnapshot; invoice: Invoice } {
    // تهیه نسخه پشتیبان برای رول‌بک
    const snapshot = this.createSnapshot(currentState);

    try {
      // 🧩 ۱) اصول پایه‌ای ثبت سند: بررسی حضور و صحت فرمت مخاطب (client_id)
      const isProforma = invoiceData.type === 'proforma_sale' || 
                         invoiceData.type === 'proforma_purchase' || 
                         invoiceData.type === 'proforma';

      let rawCId = invoiceData.clientId || invoiceData.client_id;
      if (!rawCId || String(rawCId).trim() === '') {
        if (isProforma) {
          // برای پیش‌فاکتور (سند خنثی برآورد قیمت)، در صورت عدم انتخاب طرف‌حساب، شناسه خنثی تخصیص داده می‌شود
          rawCId = 'client-inquiry-neutral';
          if (!invoiceData.clientName) {
            invoiceData.clientName = 'متقاضی استعلام (پیش‌فاکتور)';
          }
        } else {
          throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
        }
      }

      const cleanClientId = String(rawCId).trim();
      const forbiddenKeywords = ['null', 'undefined', 'nan', '[object object]', '0', 'none', 'false', '""', "''"];
      if (forbiddenKeywords.includes(cleanClientId.toLowerCase())) {
        if (isProforma) {
          rawCId = 'client-inquiry-neutral';
        } else {
          throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
        }
      }

      // اعتبارسنجی فرمت الفبانومریک استاندارد یا UUID
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      const standardIdentifierRegex = /^[a-zA-Z0-9_\-.:]{2,128}$/;
      if (!uuidRegex.test(cleanClientId) && !standardIdentifierRegex.test(cleanClientId)) {
        if (!isProforma) {
          throw new Error('فرمت شناسه طرف‌حساب نامعتبر است.');
        }
      }

      if (/[<>'";\\`]/.test(cleanClientId) || /\s/.test(cleanClientId)) {
        if (!isProforma) {
          throw new Error('شناسه مخاطب حاوی کاراکترهای غیرمجاز است.');
        }
      }

      // بررسی وجود و وضعیت مخاطب
      let clientIndex = snapshot.clients.findIndex(c => c.id === cleanClientId);
      
      // بازیابی تاب‌آور از کش محلی در صورت بروز تاخیر در همگامی رندر ری‌اکت
      if (clientIndex === -1 && typeof window !== 'undefined' && window.localStorage) {
        try {
          const cachedClientsRaw = localStorage.getItem('habino_clients');
          if (cachedClientsRaw) {
            const cachedClients: Client[] = JSON.parse(cachedClientsRaw);
            if (Array.isArray(cachedClients)) {
              const matchedFromCache = cachedClients.find(
                c => c.id === cleanClientId || (invoiceData.clientName && c.name === invoiceData.clientName)
              );
              if (matchedFromCache) {
                snapshot.clients.push(matchedFromCache);
                clientIndex = snapshot.clients.length - 1;
              }
            }
          }
        } catch (_) {
          // در صورت خطای پارس حافظه موقت، مسیر نرمال ادامه می‌یابد
        }
      }

      // جستجو بر اساس نام طرف‌حساب در صورت ارسال شناسه کلاینت با نام معتبر
      if (clientIndex === -1 && invoiceData.clientName) {
        const matchedByNameIndex = snapshot.clients.findIndex(c => c.name === invoiceData.clientName);
        if (matchedByNameIndex !== -1) {
          clientIndex = matchedByNameIndex;
        }
      }

      // در صورتی که شناسه معتبر ارسال شده اما به دلیل تاخیر در رندرینگ ری‌اکت هنوز در اسنپ‌شات ننشسته است
      if (clientIndex === -1) {
        const clientName = (invoiceData.clientName && String(invoiceData.clientName).trim() !== '')
          ? String(invoiceData.clientName).trim()
          : `مخاطب ${cleanClientId.slice(0, 8)}`;
        
        const autoRegisteredClient: Client = {
          id: cleanClientId,
          name: clientName,
          tenantId,
          balance: 0,
          type: 'corporate'
        };
        snapshot.clients.push(autoRegisteredClient);
        clientIndex = snapshot.clients.length - 1;

        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem('habino_clients', JSON.stringify(snapshot.clients));
          } catch (_) {}
        }
      }

      // اطمینان از مقداردهی هماهنگ هر دو فیلد clientId و client_id
      invoiceData.clientId = cleanClientId;
      invoiceData.client_id = cleanClientId;

      // بررسی مبالغ
      if (invoiceData.grandTotal <= 0 && (!invoiceData.items || invoiceData.items.length === 0)) {
        throw new Error('مبلغ سند نامعتبر است.');
      }

      // اعتبارسنجی و پالایش اقلام فاکتور و متادیتا بر اساس اسکیمای JSONB
      let sanitizedItems = invoiceData.items || [];
      if (sanitizedItems.length > 0) {
        const itemValidation = HabinoJsonbSchemaValidator.validateInvoiceItems(sanitizedItems);
        if (!itemValidation.isValid) {
          throw new Error(`خطای اسکیمای اقلام فاکتور: ${itemValidation.errors.join(' | ')}`);
        }
        sanitizedItems = itemValidation.sanitizedItems;
      }

      // پالایش و اعتبارسنجی متادیتای صنف سند
      let sanitizedMeta: Record<string, any> = {};
      if (invoiceData.metadata) {
        const guildType = invoiceData.metadata.guild_type || invoiceData.metadata.guildCategory;
        const metaVal = HabinoJsonbSchemaValidator.validateGuildMetadata(guildType, invoiceData.metadata);
        if (!metaVal.isValid) {
          throw new Error(`خطای اسکیمای متادیتا: ${metaVal.errors.join(' | ')}`);
        }
        sanitizedMeta = metaVal.sanitizedData;
      }

      // محاسبه و ثبت مانده حساب از قبل طرف‌حساب و جمع کل بدهی
      const targetClient = snapshot.clients[clientIndex];
      const previousBalance = invoiceData.previousBalance !== undefined
        ? invoiceData.previousBalance
        : (targetClient.balance || 0);

      let calculatedTotalDebt = invoiceData.totalDebt;
      if (calculatedTotalDebt === undefined) {
        if (invoiceData.type === 'sale' || invoiceData.type === 'service') {
          calculatedTotalDebt = previousBalance + invoiceData.remainingAmount;
        } else if (invoiceData.type === 'purchase') {
          calculatedTotalDebt = previousBalance - invoiceData.remainingAmount;
        } else if (invoiceData.type === 'sale_return') {
          calculatedTotalDebt = previousBalance - invoiceData.grandTotal;
        } else if (invoiceData.type === 'purchase_return') {
          calculatedTotalDebt = previousBalance + invoiceData.grandTotal;
        } else {
          calculatedTotalDebt = previousBalance + invoiceData.remainingAmount;
        }
      }

      // شناسه یکتا (UUID) - در صورت ارائه شناسه مشخص (مانند ویرایش سند با حفظ قطعی UUID)، از همان استفاده می‌شود
      const invoiceId = explicitInvoiceId || (invoiceData as any).id || HabinoAccountingKernel.generateUUID();
      const newInvoice: Invoice = {
        ...invoiceData,
        id: invoiceId,
        tenantId,
        items: sanitizedItems,
        metadata: sanitizedMeta,
        previousBalance,
        totalDebt: calculatedTotalDebt
      };

      // ۱. ذخیره سند در جدول سندها
      snapshot.invoices.unshift(newInvoice);

      // ۲. ایجاد ردیف‌های متناظر در دفتر کل (General Ledger)
      if (!isProforma) {
        const doubleEntries = HabinoAccountingKernel.createDoubleEntryForInvoice(newInvoice, tenantId);
        if (!doubleEntries || doubleEntries.length === 0) {
          throw new Error('خطا در محاسبه اسناد دوبل دفتر کل.');
        }
        snapshot.accountingEntries.push(...doubleEntries);

        // ۳. به‌روزرسانی مانده در حساب اشخاص (Client Account)
        const targetClient = snapshot.clients[clientIndex];
        const currentBalance = targetClient.balance || 0;

        let balanceDelta = 0;
        if (newInvoice.type === 'sale' || newInvoice.type === 'service') {
          // در فروش: مشتری به اندازه باقیمانده تسویه‌نشده بدهکار می‌شود (مثبت)
          balanceDelta = newInvoice.remainingAmount;
        } else if (newInvoice.type === 'purchase') {
          // در خرید: تأمین‌کننده بستانکار می‌شود (منفی)
          balanceDelta = -newInvoice.remainingAmount;
        } else if (newInvoice.type === 'sale_return') {
          // برگشت از فروش: بستانکاری مشتری
          balanceDelta = -newInvoice.grandTotal;
        } else if (newInvoice.type === 'purchase_return') {
          // برگشت از خرید: بدهکاری تأمین‌کننده
          balanceDelta = newInvoice.grandTotal;
        }

        snapshot.clients[clientIndex] = {
          ...targetClient,
          balance: currentBalance + balanceDelta
        };

        // ۴. ثبت تراکنش صندوق/بانک در صورت پرداخت نقدی فوری
        if (newInvoice.amountPaid > 0) {
          const isExpense = newInvoice.type === 'purchase' || newInvoice.type === 'sale_return';
          const categoryTitle = 
            newInvoice.type === 'purchase' ? 'خرید کالا و خدمات' :
            newInvoice.type === 'sale_return' ? 'مرجوعی از فروش' :
            newInvoice.type === 'purchase_return' ? 'استرداد خرید' :
            'درآمد فروش / خدمات';

          const newTx: Transaction = {
            id: HabinoAccountingKernel.generateUUID(),
            tenantId,
            date: newInvoice.date,
            type: isExpense ? 'expense' : 'income',
            category: categoryTitle,
            amount: newInvoice.amountPaid,
            description: `${isExpense ? 'پرداخت وجه' : 'دریافت وجه'} فاکتور شماره ${newInvoice.invoiceNumber}`,
            clientId: newInvoice.clientId,
            clientName: newInvoice.clientName,
            projectId: newInvoice.projectId, // فقط برچسب پروژه
            relatedInvoiceId: newInvoice.id
          };
          snapshot.transactions.unshift(newTx);
        }

        // ۵. به‌روزرسانی موجودی انبار کالاها (Inventory & Invoices Synergy)
        if (snapshot.inventory && newInvoice.items && newInvoice.items.length > 0) {
          for (const item of newInvoice.items) {
            const qty = Number(item.quantity) || 1;
            const invIndex = snapshot.inventory.findIndex(inv => 
              inv.id === item.id || 
              (item.description && inv.name && inv.name.trim().toLowerCase() === item.description.trim().toLowerCase()) ||
              (item.code && inv.code && inv.code.trim() === item.code.trim())
            );

            if (invIndex !== -1) {
              const currentStock = Number(snapshot.inventory[invIndex].stock) || 0;
              let stockDelta = 0;
              if (newInvoice.type === 'sale' || newInvoice.type === 'service') {
                stockDelta = -qty;
              } else if (newInvoice.type === 'purchase') {
                stockDelta = qty;
              } else if (newInvoice.type === 'sale_return') {
                stockDelta = qty;
              } else if (newInvoice.type === 'purchase_return') {
                stockDelta = -qty;
              }
              snapshot.inventory[invIndex] = {
                ...snapshot.inventory[invIndex],
                stock: Math.max(0, currentStock + stockDelta)
              };
            }
          }
        }
      }

      return { nextState: snapshot, invoice: newInvoice };
    } catch (error: any) {
      // Rollback قطعی: هیچ تغییری ذخیره نمی‌شود
      console.warn('[AtomicTransactionWrapper] Transaction aborted. Rolling back:', error?.message || error);
      const msg = error?.message?.includes('مخاطب') 
        ? 'ثبت سند بدون انتخاب مخاطب مجاز نیست.' 
        : error?.message?.includes('مبلغ')
        ? 'مبلغ سند نامعتبر است.'
        : 'خطا در ثبت سند. هیچ تغییری ذخیره نشد.';
      throw new Error(msg);
    }
  }

  /**
   * 🧩 ۳) اصول حذف سند با آبشار کامل، بازگشت مانده‌ها و پشتیبانی از Soft Delete
   */
  public static atomicDeleteInvoice(
    currentState: FinancialStateSnapshot,
    invoiceId: string,
    softDelete: boolean = false
  ): FinancialStateSnapshot {
    const snapshot = this.createSnapshot(currentState);

    try {
      const target = snapshot.invoices.find(inv => inv.id === invoiceId);
      if (!target) {
        throw new Error('سند موردنظر یافت نشد.');
      }

      // ۱. اصلاح و تعدیل حساب مخاطب (برگشت مانده)
      if (target.clientId) {
        const clientIndex = snapshot.clients.findIndex(c => c.id === target.clientId);
        if (clientIndex !== -1) {
          const targetClient = snapshot.clients[clientIndex];
          const curBal = Number(targetClient.balance) || 0;
          const remainingAmt = Number(target.remainingAmount) || 0;
          const grandTot = Number(target.grandTotal) || 0;

          let balanceReversion = 0;
          if (target.type === 'sale' || target.type === 'service') {
            balanceReversion = -remainingAmt;
          } else if (target.type === 'purchase') {
            balanceReversion = remainingAmt;
          } else if (target.type === 'sale_return') {
            balanceReversion = grandTot;
          } else if (target.type === 'purchase_return') {
            balanceReversion = -grandTot;
          }

          snapshot.clients[clientIndex] = {
            ...targetClient,
            balance: curBal + balanceReversion
          };
        }
      }

      // ۲. حذف یا نشانه‌گذاری در جدول سندها
      if (softDelete) {
        const nowIso = new Date().toISOString();
        snapshot.invoices = snapshot.invoices.map(inv => {
          if (inv.id === invoiceId) {
            return {
              ...inv,
              is_deleted: true,
              deleted_at: nowIso,
              metadata: {
                ...(inv.metadata || {}),
                is_deleted: true,
                deleted_at: nowIso
              }
            };
          }
          return inv;
        });
      } else {
        snapshot.invoices = snapshot.invoices.filter(inv => inv.id !== invoiceId);
      }

      // ۳. حذف تمام ردیف‌های دفتر کل مرتبط با شماره سند یا شناسه فاکتور
      const targetDocNum = String(target.invoiceNumber || '').trim();
      snapshot.accountingEntries = snapshot.accountingEntries.filter(
        entry => {
          if (!entry) return false;
          if (entry.referenceId && entry.referenceId === invoiceId) return false;
          if (targetDocNum && entry.documentNumber && String(entry.documentNumber).includes(targetDocNum)) return false;
          return true;
        }
      );

      // ۴. حذف تراکنش‌های نقد مرتبط و بازگردانی بودجه/درآمد پروژه‌ها
      const relatedTxs = snapshot.transactions.filter(
        tx => tx && (tx.relatedInvoiceId === invoiceId ||
              (targetDocNum && tx.description && String(tx.description).includes(`شماره ${targetDocNum}`)))
      );

      for (const tx of relatedTxs) {
        if (tx.projectId) {
          const prjIndex = snapshot.projects.findIndex(p => p.id === tx.projectId);
          if (prjIndex !== -1) {
            const prj = snapshot.projects[prjIndex];
            if (tx.type === 'income') {
              snapshot.projects[prjIndex] = {
                ...prj,
                totalIncome: Math.max(0, (prj.totalIncome || 0) - tx.amount)
              };
            } else {
              snapshot.projects[prjIndex] = {
                ...prj,
                totalExpense: Math.max(0, (prj.totalExpense || 0) - tx.amount)
              };
            }
          }
        }
      }

      snapshot.transactions = snapshot.transactions.filter(
        tx => tx && tx.relatedInvoiceId !== invoiceId &&
              !(targetDocNum && tx.description && String(tx.description).includes(`شماره ${targetDocNum}`))
      );

      // ۵. حذف اقساط مرتبط
      snapshot.installments = snapshot.installments.filter(
        inst => inst && inst.invoiceId !== invoiceId
      );

      // ۶. حذف یا خنثی‌سازی چک‌های متصل
      snapshot.checks = snapshot.checks.filter(
        chk => chk && chk.relatedInvoiceId !== invoiceId
      );

      // ۷. بازگردانی موجودی انبار کالاها (Inventory Stock Reversion)
      if (snapshot.inventory && target.items && target.items.length > 0) {
        for (const item of target.items) {
          if (!item) continue;
          const qty = Number(item.quantity) || 1;
          const invIndex = snapshot.inventory.findIndex(inv => 
            inv && (
              inv.id === item.id || 
              (item.itemId && inv.id === item.itemId) ||
              (item.description && inv.name && inv.name.trim().toLowerCase() === item.description.trim().toLowerCase()) ||
              (item.code && inv.code && inv.code.trim() === item.code.trim())
            )
          );

          if (invIndex !== -1) {
            const currentStock = Number(snapshot.inventory[invIndex].stock) || 0;
            let stockDelta = 0;
            if (target.type === 'sale' || target.type === 'service') {
              stockDelta = qty; // برگشت به انبار
            } else if (target.type === 'purchase') {
              stockDelta = -qty;
            } else if (target.type === 'sale_return') {
              stockDelta = -qty;
            } else if (target.type === 'purchase_return') {
              stockDelta = qty;
            }
            snapshot.inventory[invIndex] = {
              ...snapshot.inventory[invIndex],
              stock: Math.max(0, currentStock + stockDelta)
            };
          }
        }
      }

      return snapshot;
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Delete failed. Rolling back:', error?.message || error);
      if (error?.message === 'سند موردنظر یافت نشد.') {
        throw error;
      }
      throw new Error(error?.message || 'حذف سند ناموفق بود. هیچ تغییری اعمال نشد.');
    }
  }

  /**
   * 🧩 ۴) اصول ویرایش سند با بازسازی کامل و حفظ یکتایی UUID
   * - قفل‌گذاری همزمانی روی سند و طرف‌حساب‌های متأثر
   * - در صورت تغییر طرف‌حساب، تسویه کامل طرف‌حساب پیشین و اعمال دقیق روی طرف‌حساب جدید
   * - اعتبارسنجی سقف اعتبار برای طرف‌حساب جدید
   */
  public static atomicUpdateInvoice(
    currentState: FinancialStateSnapshot,
    invoiceId: string,
    updates: Partial<Invoice>,
    tenantId: string
  ): { nextState: FinancialStateSnapshot; invoice: Invoice } {
    // ۱. بررسی وجود سند
    const existing = currentState.invoices.find(inv => inv.id === invoiceId);
    if (!existing) {
      throw new Error('سند موردنظر یافت نشد.');
    }

    // بررسی قفل همزمانی روی رکوردها
    const lockKeys = [invoiceId, existing.clientId];
    if (updates.clientId && updates.clientId !== existing.clientId) {
      lockKeys.push(updates.clientId);
    }
    const releaseLocks = HabinoRecordLockManager.tryLock(lockKeys);

    try {
      // ۲. نسخه قبلی سند را کاملاً حذف کن (Rollback موقت اثرات نسخه قبلی در تمام دفاتر)
      const clearedState = this.atomicDeleteInvoice(currentState, invoiceId);

      // ۳. سناریوی تغییر طرف‌حساب (Client Change Handling)
      const isClientChanged = updates.clientId && updates.clientId !== existing.clientId;
      const isProforma = (existing.type === 'proforma' || updates.type === 'proforma' || 
                          existing.type === 'proforma_sale' || updates.type === 'proforma_sale' || 
                          existing.type === 'proforma_purchase' || updates.type === 'proforma_purchase');
      let newClientName = updates.clientName || existing.clientName;

      if (isClientChanged) {
        let newClient = clearedState.clients.find(c => c.id === updates.clientId);
        if (!newClient && updates.clientName) {
          newClient = clearedState.clients.find(c => c.name === updates.clientName);
        }
        if (!newClient) {
          if (isProforma || updates.clientId === 'client-inquiry-neutral' || !updates.clientId) {
            const fallbackClientId = updates.clientId || 'client-inquiry-neutral';
            newClient = {
              id: fallbackClientId,
              name: updates.clientName || existing.clientName || 'متقاضی استعلام (پیش‌فاکتور)',
              tenantId,
              balance: 0,
              type: 'individual'
            };
            clearedState.clients.push(newClient);
          } else {
            throw new Error('طرف‌حساب انتخابی جدید در سیستم یافت نشد.');
          }
        }
        newClientName = newClient.name;

        // اعتبارسنجی سقف اعتبار طرف‌حساب جدید (فقط برای فاکتورهای قطعی فروش و خدمات)
        if (!isProforma) {
          const projectedDebt = (updates.remainingAmount !== undefined ? updates.remainingAmount : existing.remainingAmount) || 0;
          const creditValidation = HabinoAccountingKernel.validateCreditLimit(newClient, projectedDebt);
          if (creditValidation.isExceeded) {
            console.warn(`[Habino Accounting] هشدار سقف اعتبار:`, creditValidation.messageFa);
          }
        }
      }

      // ۴. ترکیب اطلاعات جدید با حفظ دقیق همان UUID و داده‌های امضا و اشتراک
      const mergedInvoiceData: Omit<Invoice, 'id'> & { id?: string } = {
        ...existing,
        ...updates,
        id: invoiceId,
        clientName: newClientName,
        tenantId,
        signatureUrl: updates.signatureUrl !== undefined ? updates.signatureUrl : existing.signatureUrl,
        isSigned: updates.isSigned !== undefined ? updates.isSigned : existing.isSigned,
        signedAt: updates.signedAt !== undefined ? updates.signedAt : existing.signedAt,
        shareToken: updates.shareToken !== undefined ? updates.shareToken : existing.shareToken,
        signatureMetadata: updates.signatureMetadata !== undefined ? updates.signatureMetadata : existing.signatureMetadata,
        // در صورت تغییر طرف‌حساب، مانده پیشین و بدهی نهایی از حساب طرف‌حساب جدید بازسازی خواهد شد
        ...(isClientChanged ? { previousBalance: undefined, totalDebt: undefined } : {})
      };

      // ۵. بازسازی نسخه جدید سند در دفتر کل و حساب اشخاص با حفظ قطعی همان UUID
      const { nextState, invoice } = this.atomicRegisterInvoice(
        clearedState, 
        mergedInvoiceData, 
        tenantId,
        invoiceId
      );

      return { nextState, invoice };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Update failed. Rolling back to original state:', error?.message || error);
      if (error?.message === 'سند موردنظر یافت نشد.' || error?.message?.includes('طرف‌حساب')) {
        throw error;
      }
      throw new Error(error?.message || 'خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
    } finally {
      if (releaseLocks) {
        releaseLocks();
      }
    }
  }

  /**
   * 🧩 ۶) ثبت پیش‌پرداخت پروژه به صورت اتمیک
   */
  public static atomicRegisterProjectAdvance(
    currentState: FinancialStateSnapshot,
    params: {
      projectId: string;
      amount: number;
      date: string;
      description: string;
      tenantId: string;
    }
  ): FinancialStateSnapshot {
    const snapshot = this.createSnapshot(currentState);

    try {
      const project = snapshot.projects.find(p => p.id === params.projectId);
      if (!project) {
        throw new Error('پروژه موردنظر یافت نشد.');
      }

      if (!project.clientId) {
        throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
      }

      if (params.amount <= 0) {
        throw new Error('مبلغ سند نامعتبر است.');
      }

      // ایجاد رکوردهای دوبل دفتر کل
      const entries = HabinoAccountingKernel.createProjectAdvanceEntry({
        project,
        amount: params.amount,
        date: params.date,
        description: params.description,
        tenantId: params.tenantId
      });
      snapshot.accountingEntries.push(...entries);

      // ثبت در حساب کارفرما (کاهش بدهی کارفرما یا ایجاد بستانکاری)
      const clientIndex = snapshot.clients.findIndex(c => c.id === project.clientId);
      if (clientIndex !== -1) {
        const client = snapshot.clients[clientIndex];
        snapshot.clients[clientIndex] = {
          ...client,
          balance: (client.balance || 0) - params.amount
        };
      }

      // ثبت تراکنش دریافت نقدی
      snapshot.transactions.unshift({
        id: HabinoAccountingKernel.generateUUID(),
        tenantId: params.tenantId,
        date: params.date,
        type: 'income',
        category: 'پیش‌پرداخت پروژه',
        amount: params.amount,
        description: `پیش‌دریافت پروژه: ${project.title} - ${params.description}`,
        clientId: project.clientId,
        clientName: project.clientName,
        projectId: project.id // فقط برچسب پروژه
      });

      return snapshot;
    } catch (error) {
      console.warn('[AtomicTransactionWrapper] Project advance failed:', error);
      throw new Error('خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
    }
  }

  /**
   * 🧩 ۷) ثبت سود پروژه به صورت اتمیک
   */
  public static atomicCloseProjectProfit(
    currentState: FinancialStateSnapshot,
    params: {
      projectId: string;
      date: string;
      tenantId: string;
    }
  ): FinancialStateSnapshot {
    const snapshot = this.createSnapshot(currentState);

    try {
      const projectIndex = snapshot.projects.findIndex(p => p.id === params.projectId);
      if (projectIndex === -1) {
        throw new Error('پروژه موردنظر یافت نشد.');
      }

      const project = snapshot.projects[projectIndex];
      const netProfit = project.netProfit || ((project.totalIncome || 0) - (project.totalExpense || 0));

      if (netProfit === 0) {
        throw new Error('مبلغ سند نامعتبر است.');
      }

      // ایجاد رکوردهای دوبل سود در دفتر کل
      const entries = HabinoAccountingKernel.createProjectProfitEntry({
        project,
        netProfit,
        date: params.date,
        tenantId: params.tenantId
      });
      snapshot.accountingEntries.push(...entries);

      // علامت‌گذاری پروژه به عنوان تکمیل‌شده
      snapshot.projects[projectIndex] = {
        ...project,
        status: 'completed'
      };

      return snapshot;
    } catch (error) {
      console.warn('[AtomicTransactionWrapper] Close project profit failed:', error);
      throw new Error('خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
    }
  }

  /**
   * 🧩 ۲) ثبت اتمیک تراکنش مالی (درآمد / هزینه / صندوق و بانک)
   * با ایجاد ردیف‌های متناظر در دفتر کل و به‌روزرسانی مانده مخاطب
   */
  public static atomicRegisterTransaction(
    currentState: FinancialStateSnapshot,
    txData: Omit<Transaction, 'id'>,
    tenantId: string
  ): { nextState: FinancialStateSnapshot; transaction: Transaction } {
    const snapshot = this.createSnapshot(currentState);

    try {
      // 🧩 ۱) بررسی انتخاب مخاطب
      if (!txData.clientId || txData.clientId.trim() === '') {
        throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
      }

      // بررسی وجود مخاطب
      const clientIndex = snapshot.clients.findIndex(c => c.id === txData.clientId);
      if (clientIndex === -1) {
        throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
      }

      // بررسی مبلغ
      if (!txData.amount || txData.amount <= 0) {
        throw new Error('مبلغ سند نامعتبر است.');
      }

      const client = snapshot.clients[clientIndex];
      const txId = HabinoAccountingKernel.generateUUID();

      const newTx: Transaction = {
        ...txData,
        id: txId,
        tenantId,
        clientName: txData.clientName || client.name
      };

      // ۱. ذخیره در جدول تراکنش‌ها
      snapshot.transactions.unshift(newTx);

      // ۲. ایجاد رکوردهای متناظر در دفتر کل (General Ledger)
      const doubleEntries = HabinoAccountingKernel.createDoubleEntryForTransaction(newTx, tenantId);
      snapshot.accountingEntries.push(...doubleEntries);

      // ۳. به‌روزرسانی مانده در حساب اشخاص
      // اگر درآمد (وصول از مشتری) باشد: مانده بدهی مشتری کاهش می‌یابد (منفی)
      // اگر هزینه (پرداخت به تأمین‌کننده/شخص) باشد: مانده بستانکاری شخص کاهش می‌یابد (مثبت)
      const balanceDelta = newTx.type === 'income' ? -newTx.amount : newTx.amount;
      snapshot.clients[clientIndex] = {
        ...client,
        balance: (client.balance || 0) + balanceDelta
      };

      // ۴. اگر برچسب پروژه دارد، فقط برچسب ذخیره می‌شود و مجموع درآمدهای پروژه به‌روز می‌شود
      if (newTx.projectId) {
        const prjIndex = snapshot.projects.findIndex(p => p.id === newTx.projectId);
        if (prjIndex !== -1) {
          const prj = snapshot.projects[prjIndex];
          if (newTx.type === 'income') {
            snapshot.projects[prjIndex] = {
              ...prj,
              totalIncome: (prj.totalIncome || 0) + newTx.amount
            };
          } else {
            snapshot.projects[prjIndex] = {
              ...prj,
              totalExpense: (prj.totalExpense || 0) + newTx.amount
            };
          }
        }
      }

      return { nextState: snapshot, transaction: newTx };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Transaction creation failed. Rolling back:', error?.message || error);
      const msg = error?.message?.includes('مخاطب')
        ? 'ثبت سند بدون انتخاب مخاطب مجاز نیست.'
        : error?.message?.includes('مبلغ')
        ? 'مبلغ سند نامعتبر است.'
        : 'خطا در ثبت سند. هیچ تغییری ذخیره نشد.';
      throw new Error(msg);
    }
  }

  /**
   * 🧩 ۳) حذف اتمیک تراکنش مالی و بازگشت کامل مانده‌ها
   */
  public static atomicDeleteTransaction(
    currentState: FinancialStateSnapshot,
    transactionId: string
  ): FinancialStateSnapshot {
    const snapshot = this.createSnapshot(currentState);

    try {
      const target = snapshot.transactions.find(tx => tx.id === transactionId);
      if (!target) {
        throw new Error('سند موردنظر یافت نشد.');
      }

      // ۱. برگشت اثر مالی روی مانده حساب اشخاص
      if (target.clientId) {
        const clientIndex = snapshot.clients.findIndex(c => c.id === target.clientId);
        if (clientIndex !== -1) {
          const client = snapshot.clients[clientIndex];
          const balanceReversion = target.type === 'income' ? target.amount : -target.amount;
          snapshot.clients[clientIndex] = {
            ...client,
            balance: (client.balance || 0) + balanceReversion
          };
        }
      }

      // ۲. برگشت برچسب پروژه در صورت وجود
      if (target.projectId) {
        const prjIndex = snapshot.projects.findIndex(p => p.id === target.projectId);
        if (prjIndex !== -1) {
          const prj = snapshot.projects[prjIndex];
          if (target.type === 'income') {
            snapshot.projects[prjIndex] = {
              ...prj,
              totalIncome: Math.max(0, (prj.totalIncome || 0) - target.amount)
            };
          } else {
            snapshot.projects[prjIndex] = {
              ...prj,
              totalExpense: Math.max(0, (prj.totalExpense || 0) - target.amount)
            };
          }
        }
      }

      // ۳. حذف رکوردهای دفتر کل متناظر با این تراکنش
      const docPrefix = `DOC-TX-${target.id.slice(0, 8)}`;
      snapshot.accountingEntries = snapshot.accountingEntries.filter(
        e => !e.documentNumber.includes(docPrefix)
      );

      // ۴. حذف از جدول تراکنش‌ها
      snapshot.transactions = snapshot.transactions.filter(tx => tx.id !== transactionId);

      return snapshot;
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Transaction deletion failed. Rolling back:', error?.message || error);
      if (error?.message === 'سند موردنظر یافت نشد.') {
        throw error;
      }
      throw new Error('حذف سند ناموفق بود. هیچ تغییری اعمال نشد.');
    }
  }

  /**
   * 🧩 ۲) ثبت اتمیک سند چک (صیادی / عادی) در جریان وصول یا واگذاری
   */
  public static atomicRegisterCheck(
    currentState: FinancialStateSnapshot,
    checkData: Omit<Check, 'id'>,
    tenantId: string
  ): { nextState: FinancialStateSnapshot; check: Check } {
    const snapshot = this.createSnapshot(currentState);

    try {
      const rawCId = checkData.clientId;
      if (!rawCId || String(rawCId).trim() === '') {
        throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
      }

      const cleanClientId = String(rawCId).trim();
      const forbiddenKeywords = ['null', 'undefined', 'nan', '[object object]', '0', 'none', 'false', '""', "''"];
      if (forbiddenKeywords.includes(cleanClientId.toLowerCase())) {
        throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
      }

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      const standardIdentifierRegex = /^[a-zA-Z0-9_\-.:]{2,128}$/;
      if (!uuidRegex.test(cleanClientId) && !standardIdentifierRegex.test(cleanClientId)) {
        throw new Error('فرمت شناسه طرف‌حساب نامعتبر است.');
      }

      if (/[<>'";\\`]/.test(cleanClientId) || /\s/.test(cleanClientId)) {
        throw new Error('شناسه مخاطب حاوی کاراکترهای غیرمجاز است.');
      }

      let clientIndex = snapshot.clients.findIndex(c => c.id === cleanClientId);
      if (clientIndex === -1 && checkData.clientName) {
        const matchedByName = snapshot.clients.findIndex(c => c.name === checkData.clientName);
        if (matchedByName !== -1) clientIndex = matchedByName;
      }

      if (clientIndex === -1) {
        const autoClient: Client = {
          id: cleanClientId,
          name: checkData.clientName || `مخاطب ${cleanClientId.slice(0, 8)}`,
          tenantId,
          balance: 0,
          type: 'corporate'
        };
        snapshot.clients.push(autoClient);
        clientIndex = snapshot.clients.length - 1;
      }

      if (!checkData.amount || checkData.amount <= 0) {
        throw new Error('مبلغ سند نامعتبر است.');
      }

      const checkId = HabinoAccountingKernel.generateUUID();
      const newCheck: Check = {
        ...checkData,
        id: checkId,
        tenantId
      };

      // ۱. ذخیره در جدول چک‌ها
      snapshot.checks.unshift(newCheck);

      // ۲. ایجاد رکوردهای دوبل دفتر کل
      const entries = HabinoAccountingKernel.createDoubleEntryForCheck(newCheck, tenantId);
      snapshot.accountingEntries.push(...entries);

      // ۳. به‌روزرسانی مانده مخاطب (دریافت چک: کاهش بدهی خریدار؛ صدور چک: کاهش طلب فروشنده)
      const client = snapshot.clients[clientIndex];
      const delta = (newCheck.type === 'receivable' || (newCheck.type as any) === 'in') ? -newCheck.amount : newCheck.amount;
      snapshot.clients[clientIndex] = {
        ...client,
        balance: (client.balance || 0) + delta
      };

      return { nextState: snapshot, check: newCheck };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Check registration failed. Rolling back:', error?.message || error);
      const msg = error?.message?.includes('مخاطب')
        ? 'ثبت سند بدون انتخاب مخاطب مجاز نیست.'
        : error?.message?.includes('مبلغ')
        ? 'مبلغ سند نامعتبر است.'
        : 'خطا در ثبت سند. هیچ تغییری ذخیره نشد.';
      throw new Error(msg);
    }
  }

  /**
   * 🧩 ۳) حذف اتمیک سند چک با بازگشت کامل ردیف‌های دفتر کل و مانده‌ها
   */
  public static atomicDeleteCheck(
    currentState: FinancialStateSnapshot,
    checkId: string
  ): FinancialStateSnapshot {
    const snapshot = this.createSnapshot(currentState);

    try {
      const target = snapshot.checks.find(c => c.id === checkId);
      if (!target) {
        throw new Error('سند موردنظر یافت نشد.');
      }

      // ۱. برگشت مانده مخاطب
      if (target.clientId) {
        const clientIndex = snapshot.clients.findIndex(c => c.id === target.clientId);
        if (clientIndex !== -1) {
          const client = snapshot.clients[clientIndex];
          const rev = (target.type === 'receivable' || (target.type as any) === 'in') ? target.amount : -target.amount;
          snapshot.clients[clientIndex] = {
            ...client,
            balance: (client.balance || 0) + rev
          };
        }
      }

      // ۲. حذف ردیف‌های دفتر کل مرتبط با چک و پاس شدن آن
      const docPrefix = `DOC-CHK-${target.checkNumber || target.id.slice(0, 8)}`;
      const clrPrefix = `DOC-CHK-CLR-${target.checkNumber || target.id.slice(0, 8)}`;
      snapshot.accountingEntries = snapshot.accountingEntries.filter(
        e => !e.documentNumber.includes(docPrefix) && !e.documentNumber.includes(clrPrefix)
      );

      // ۳. حذف از جدول چک‌ها
      snapshot.checks = snapshot.checks.filter(c => c.id !== checkId);

      return snapshot;
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Check deletion failed. Rolling back:', error?.message || error);
      if (error?.message === 'سند موردنظر یافت نشد.') {
        throw error;
      }
      throw new Error('حذف سند ناموفق بود. هیچ تغییری اعمال نشد.');
    }
  }

  /**
   * 🧩 ۴) به‌روزرسانی اتمیک وضعیت چک (وصول، پاس‌شدن یا برگشت)
   * با اتصال خودکار به اقساط و ثبت اسناد بانک
   */
  public static atomicUpdateCheck(
    currentState: FinancialStateSnapshot,
    checkId: string,
    updates: Partial<Check>,
    tenantId: string
  ): { nextState: FinancialStateSnapshot; check: Check } {
    const snapshot = this.createSnapshot(currentState);

    try {
      const checkIndex = snapshot.checks.findIndex(c => c.id === checkId);
      if (checkIndex === -1) {
        throw new Error('سند موردنظر یافت نشد.');
      }

      const prevCheck = snapshot.checks[checkIndex];
      const mergedCheck: Check = {
        ...prevCheck,
        ...updates
      };

      // اگر وضعیت به پاس‌شده/وصول‌شده تغییر کرد
      if (updates.status === 'cleared' && prevCheck.status !== 'cleared') {
        const clearDate = new Date().toLocaleDateString('fa-IR');
        // ثبت در دفتر کل (بانک / اسناد دریافتنی)
        const clrEntries = HabinoAccountingKernel.createDoubleEntryForCheckClearing(
          mergedCheck,
          tenantId,
          clearDate
        );
        snapshot.accountingEntries.push(...clrEntries);

        // اگر به قسطی متصل باشد، قسط پرداخت‌شده علامت‌گذاری می‌شود
        if (mergedCheck.relatedInstallmentId) {
          const instIndex = snapshot.installments.findIndex(i => i.id === mergedCheck.relatedInstallmentId);
          if (instIndex !== -1) {
            snapshot.installments[instIndex] = {
              ...snapshot.installments[instIndex],
              status: 'paid',
              paidDate: clearDate
            };
          }
        }
      }

      snapshot.checks[checkIndex] = mergedCheck;
      return { nextState: snapshot, check: mergedCheck };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Check update failed. Rolling back:', error?.message || error);
      if (error?.message === 'سند موردنظر یافت نشد.') {
        throw error;
      }
      throw new Error('خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
    }
  }

  /**
   * 🧩 ۱ و ۲) ثبت اتمیک اسناد حسابداری دفتر کل (General Ledger Journal Entries)
   * با اعتبارسنجی تراز بودن مجموع بدهکار و بستانکار و به‌روزرسانی مانده اشخاص
   */
  public static atomicRegisterJournalEntries(
    currentState: FinancialStateSnapshot,
    entries: Omit<AccountingEntry, 'id'>[],
    tenantId: string
  ): { nextState: FinancialStateSnapshot; createdEntries: AccountingEntry[] } {
    const snapshot = this.createSnapshot(currentState);

    try {
      if (!entries || entries.length === 0) {
        throw new Error('اطلاعات واردشده ناقص است.');
      }

      let totalDebit = 0;
      let totalCredit = 0;

      for (const e of entries) {
        totalDebit += Number(e.debit) || 0;
        totalCredit += Number(e.credit) || 0;
      }

      if (totalDebit === 0 && totalCredit === 0) {
        throw new Error('مبلغ سند نامعتبر است.');
      }

      // بررسی تراز بودن سند دوبل
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`سند تراز نیست. مجموع بدهکار (${totalDebit.toLocaleString('fa-IR')}) با مجموع بستانکار (${totalCredit.toLocaleString('fa-IR')}) برابر نیست.`);
      }

      const createdEntries: AccountingEntry[] = [];

      for (const e of entries) {
        const newEntry: AccountingEntry = {
          ...e,
          id: HabinoAccountingKernel.generateUUID(),
          tenantId,
          debit: Number(e.debit) || 0,
          credit: Number(e.credit) || 0
        };

        createdEntries.push(newEntry);
        snapshot.accountingEntries.push(newEntry);

        // اگر طرف‌حساب انتخاب شده باشد و حساب مربوط به اشخاص باشد، مانده شخص تعدیل می‌شود
        if (newEntry.clientId) {
          const clientIndex = snapshot.clients.findIndex(c => c.id === newEntry.clientId);
          if (clientIndex !== -1) {
            const targetClient = snapshot.clients[clientIndex];
            const curBal = targetClient.balance || 0;
            // بدهکار شخص: بدهی شخص بیشتر می‌شود (+debit)
            // بستانکار شخص: طلب شخص یا تسویه (-credit)
            const delta = (Number(e.debit) || 0) - (Number(e.credit) || 0);
            snapshot.clients[clientIndex] = {
              ...targetClient,
              balance: curBal + delta
            };
          }
        }
      }

      return { nextState: snapshot, createdEntries };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Journal registration failed. Rolling back:', error?.message || error);
      throw error;
    }
  }

  /**
   * 🧩 ۳) حذف اتمیک سند دفتر کل بر اساس شماره سند
   */
  public static atomicDeleteJournalDocument(
    currentState: FinancialStateSnapshot,
    documentNumber: string
  ): FinancialStateSnapshot {
    const snapshot = this.createSnapshot(currentState);

    try {
      const targetEntries = snapshot.accountingEntries.filter(
        e => e.documentNumber === documentNumber
      );

      if (targetEntries.length === 0) {
        throw new Error('سند موردنظر یافت نشد.');
      }

      // خنثی‌سازی اثر بر حساب اشخاص
      for (const entry of targetEntries) {
        if (entry.clientId) {
          const clientIndex = snapshot.clients.findIndex(c => c.id === entry.clientId);
          if (clientIndex !== -1) {
            const targetClient = snapshot.clients[clientIndex];
            const curBal = targetClient.balance || 0;
            const delta = (Number(entry.debit) || 0) - (Number(entry.credit) || 0);
            snapshot.clients[clientIndex] = {
              ...targetClient,
              balance: curBal - delta
            };
          }
        }
      }

      // حذف ردیف‌ها
      snapshot.accountingEntries = snapshot.accountingEntries.filter(
        e => e.documentNumber !== documentNumber
      );

      return snapshot;
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Journal deletion failed. Rolling back:', error?.message || error);
      throw error;
    }
  }

  /**
   * 🧩 ثبت اتمیک طرف‌حساب جدید به همراه ثبت سند افتتاحیه در دفتر کل
   */
  public static atomicRegisterClient(
    currentState: FinancialStateSnapshot,
    clientData: Omit<Client, 'id'>,
    tenantId: string
  ): { nextState: FinancialStateSnapshot; client: Client } {
    const snapshot = this.createSnapshot(currentState);

    try {
      if (!clientData.name || clientData.name.trim() === '') {
        throw new Error('نام طرف‌حساب الزامی است.');
      }

      const clientId = HabinoAccountingKernel.generateUUID();
      const newClient: Client = {
        ...clientData,
        id: clientId,
        tenantId,
        balance: Number(clientData.balance) || 0
      };

      // ۱. ثبت در جدول اشخاص
      snapshot.clients.unshift(newClient);

      // ۲. در صورت وجود مانده اول دوره، ثبت سند دوبل در دفتر کل
      if (newClient.balance !== 0) {
        const openingEntries = HabinoAccountingKernel.createDoubleEntryForClientOpeningBalance(
          newClient,
          tenantId
        );
        snapshot.accountingEntries.push(...openingEntries);
      }

      return { nextState: snapshot, client: newClient };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Client registration failed. Rolling back:', error?.message || error);
      throw error;
    }
  }

  /**
   * 🧩 به‌روزرسانی اتمیک طرف‌حساب و هماهنگ‌سازی سند افتتاحیه دفتر کل
   */
  public static atomicUpdateClient(
    currentState: FinancialStateSnapshot,
    clientId: string,
    updated: Partial<Client>,
    tenantId: string
  ): { nextState: FinancialStateSnapshot; client: Client } {
    const snapshot = this.createSnapshot(currentState);

    try {
      const clientIndex = snapshot.clients.findIndex(c => c.id === clientId);
      if (clientIndex === -1) {
        throw new Error('طرف‌حساب موردنظر یافت نشد.');
      }

      const prevClient = snapshot.clients[clientIndex];
      const newBalance = updated.balance !== undefined ? (Number(updated.balance) || 0) : prevClient.balance;

      const mergedClient: Client = {
        ...prevClient,
        ...updated,
        balance: newBalance
      };

      snapshot.clients[clientIndex] = mergedClient;

      // در صورتی که مانده تغییر کرده باشد یا نام تغییر کرده باشد، اسناد افتتاحیه قبلی خنثی و به‌روز می‌شوند
      const balanceChanged = updated.balance !== undefined && updated.balance !== prevClient.balance;
      const nameChanged = updated.name !== undefined && updated.name !== prevClient.name;

      if (balanceChanged || (nameChanged && mergedClient.balance !== 0)) {
        // حذف اسناد افتتاحیه پیشین این شخص
        snapshot.accountingEntries = snapshot.accountingEntries.filter(
          e => !(e.referenceId === clientId && e.documentNumber && e.documentNumber.startsWith('DOC-OPN'))
        );

        // تولید سند افتتاحیه جدید با مانده به‌روزشده
        if (mergedClient.balance !== 0) {
          const openingEntries = HabinoAccountingKernel.createDoubleEntryForClientOpeningBalance(
            mergedClient,
            tenantId
          );
          snapshot.accountingEntries.push(...openingEntries);
        }
      }

      return { nextState: snapshot, client: mergedClient };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Client update failed. Rolling back:', error?.message || error);
      throw error;
    }
  }

  /**
   * 🧩 حذف اتمیک طرف‌حساب با پاکسازی اسناد افتتاحیه دفتر کل
   */
  public static atomicDeleteClient(
    currentState: FinancialStateSnapshot,
    clientId: string
  ): FinancialStateSnapshot {
    const snapshot = this.createSnapshot(currentState);

    try {
      const targetClient = snapshot.clients.find(c => c.id === clientId);
      if (!targetClient) {
        throw new Error('طرف‌حساب موردنظر یافت نشد.');
      }

      // اعتبارسنجی نبود فاکتورهای وابسته
      const hasActiveInvoices = snapshot.invoices.some(
        inv => inv.clientId === clientId && !inv.is_deleted
      );
      if (hasActiveInvoices) {
        throw new Error('امکان حذف طرف‌حساب دارای فاکتور فعال وجود ندارد.');
      }

      // اعتبارسنجی نبود چک‌های وابسته
      const hasChecks = snapshot.checks.some(chk => chk.clientId === clientId);
      if (hasChecks) {
        throw new Error('امکان حذف طرف‌حساب دارای چک ثبت‌شده وجود ندارد.');
      }

      // حذف اسناد افتتاحیه متناظر از دفتر کل
      snapshot.accountingEntries = snapshot.accountingEntries.filter(
        e => !(e.referenceId === clientId && e.documentNumber && e.documentNumber.startsWith('DOC-OPN'))
      );

      // حذف از جدول اشخاص
      snapshot.clients = snapshot.clients.filter(c => c.id !== clientId);

      return snapshot;
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Client deletion failed. Rolling back:', error?.message || error);
      throw error;
    }
  }

  /**
   * حذف اتمیک پروژه به همراه پاکسازی برچسب‌ها از دفتر کل و اسناد
   * بر اساس اصل ۳ و اصل ۹ حسابداری هابینو
   */
  public static atomicDeleteProject(
    currentState: FinancialStateSnapshot,
    projectId: string
  ): FinancialStateSnapshot {
    const snapshot = this.createSnapshot(currentState);

    try {
      const projectIndex = snapshot.projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) {
        throw new Error('سند موردنظر یافت نشد.');
      }

      // ۱. پاکسازی برچسب پروژه از تمام ردیف‌های مرتبط در دفتر کل (پروژه فقط برچسب است، حساب ندارد)
      snapshot.accountingEntries = snapshot.accountingEntries.map(entry => {
        if (entry.projectTag === projectId) {
          const { projectTag, ...rest } = entry;
          return rest as AccountingEntry;
        }
        return entry;
      });

      // ۲. پاکسازی برچسب پروژه از تمام تراکنش‌ها
      snapshot.transactions = snapshot.transactions.map(tx => {
        if (tx.projectId === projectId) {
          const { projectId: _, ...rest } = tx;
          return rest as Transaction;
        }
        return tx;
      });

      // ۳. پاکسازی برچسب پروژه از فاکتورها
      snapshot.invoices = snapshot.invoices.map(inv => {
        if (inv.projectId === projectId) {
          const { projectId: _, ...rest } = inv;
          return rest as Invoice;
        }
        return inv;
      });

      // ۴. حذف از جدول پروژه‌ها
      snapshot.projects = snapshot.projects.filter(p => p.id !== projectId);

      return snapshot;
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Project deletion failed. Rolling back:', error?.message || error);
      if (error?.message === 'سند موردنظر یافت نشد.') {
        throw error;
      }
      throw new Error('حذف سند ناموفق بود. هیچ تغییری اعمال نشد.');
    }
  }

  /**
   * 🧩 ۱۰) تسویه اتمیک دسته‌ای چند فاکتور هم‌زمان با چک، نقد یا حواله بانکی
   * مطابق با قوانین ۹‌گانه مالی، با تضمین Rollback ۱۰۰٪ و ثبت دوبل متوازن در دفتر کل
   */
  public static atomicBatchSettleInvoices(
    currentState: FinancialStateSnapshot,
    settlements: BatchInvoiceSettlementItem[],
    tenantId: string,
    operationDate?: string
  ): { nextState: FinancialStateSnapshot; result: BatchSettlementResult } {
    if (!settlements || settlements.length === 0) {
      throw new Error('اطلاعات واردشده ناقص است.');
    }

    const snapshot = this.createSnapshot(currentState);
    const dateStr = operationDate || new Date().toISOString().split('T')[0];

    // قفل‌گذاری روی کلیه فاکتورها و طرف‌حساب‌های درگیر
    const invoiceIds = settlements.map(s => s.invoiceId);
    const affectedInvoices = snapshot.invoices.filter(i => invoiceIds.includes(i.id));
    const affectedClientIds = Array.from(new Set(affectedInvoices.map(i => i.clientId).filter(Boolean)));
    const lockKeys = [...invoiceIds, ...affectedClientIds];
    const releaseLocks = HabinoRecordLockManager.tryLock(lockKeys);

    try {
      const settledInvoices: Invoice[] = [];
      const createdTransactions: Transaction[] = [];
      const createdEntries: AccountingEntry[] = [];
      const createdChecks: Check[] = [];
      let totalAmountSettled = 0;

      for (const item of settlements) {
        // ۱. بررسی وجود فاکتور
        const invIndex = snapshot.invoices.findIndex(i => i.id === item.invoiceId);
        if (invIndex === -1) {
          throw new Error('سند موردنظر یافت نشد.');
        }
        const invoice = snapshot.invoices[invIndex];

        // ۲. بررسی وجود و اعتبار طرف‌حساب (قانون ۱: مخاطب اجباری)
        const clientId = invoice.clientId || invoice.client_id;
        if (!clientId || String(clientId).trim() === '') {
          throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
        }
        const clientIndex = snapshot.clients.findIndex(c => c.id === clientId);
        if (clientIndex === -1) {
          throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
        }
        const client = snapshot.clients[clientIndex];

        // ۳. بررسی مبلغ تسویه
        const amount = Number(item.amount);
        if (!amount || isNaN(amount) || amount <= 0) {
          throw new Error('مبلغ سند نامعتبر است.');
        }

        const currentRemaining = invoice.remainingAmount !== undefined ? invoice.remainingAmount : invoice.grandTotal;
        const newPaidAmount = (invoice.amountPaid || 0) + amount;
        const newRemaining = Math.max(0, currentRemaining - amount);
        const newStatus = newRemaining === 0 ? 'paid' : 'pending';

        // ۴. به‌روزرسانی فاکتور
        const updatedInvoice: Invoice = {
          ...invoice,
          amountPaid: newPaidAmount,
          remainingAmount: newRemaining,
          status: newStatus as any
        };
        snapshot.invoices[invIndex] = updatedInvoice;
        settledInvoices.push(updatedInvoice);
        totalAmountSettled += amount;

        // ۵. تولید سند ثبت در دفتر کل (سند دوبل متوازن تسویه)
        // بدهکار: صندوق (10101)، بانک (10102)، یا چک دریافتی (10202)
        // بستانکار: حساب‌های دریافتنی مشتریان (10201)
        const settleDocNumber = `DOC-SETTLE-${invoice.invoiceNumber || invoice.id.slice(0, 8)}`;
        let debitAccountCode = '10101';
        let debitAccountTitle = 'صندوق ریالی و وجوه نقد';

        if (item.paymentMethod === 'bank') {
          debitAccountCode = '10102';
          debitAccountTitle = 'بانک‌ها و حساب‌های جاری ریالی';
        } else if (item.paymentMethod === 'check') {
          debitAccountCode = '10202';
          debitAccountTitle = 'اسناد دریافتنی نزد صندوق (چک‌های صیادی)';
        }

        const desc = `تسویه ${item.paymentMethod === 'check' ? 'چکی' : item.paymentMethod === 'bank' ? 'بانکی' : 'نقدی'} فاکتور #${invoice.invoiceNumber || invoice.id} - ${client.name} ${item.notes ? `(${item.notes})` : ''}`;

        const debitEntry: AccountingEntry = {
          id: HabinoAccountingKernel.generateUUID(),
          tenantId,
          documentNumber: settleDocNumber,
          date: dateStr,
          description: desc,
          accountCode: debitAccountCode,
          accountTitle: debitAccountTitle,
          groupCode: '1',
          kolCode: item.paymentMethod === 'check' ? '12' : '10',
          moeinCode: debitAccountCode,
          tafsiliCode: client.id,
          tafsiliTitle: client.name,
          tafsiliType: 'client',
          debit: amount,
          credit: 0,
          clientId: client.id,
          referenceId: invoice.id,
          created_at: new Date().toISOString()
        };

        const creditEntry: AccountingEntry = {
          id: HabinoAccountingKernel.generateUUID(),
          tenantId,
          documentNumber: settleDocNumber,
          date: dateStr,
          description: `کاهش مطالبات تجاری بابت تسویه فاکتور #${invoice.invoiceNumber || invoice.id} - ${client.name}`,
          accountCode: '10201',
          accountTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
          groupCode: '1',
          kolCode: '12',
          moeinCode: '10201',
          tafsiliCode: client.id,
          tafsiliTitle: client.name,
          tafsiliType: 'client',
          debit: 0,
          credit: amount,
          clientId: client.id,
          referenceId: invoice.id,
          created_at: new Date().toISOString()
        };

        snapshot.accountingEntries.push(debitEntry, creditEntry);
        createdEntries.push(debitEntry, creditEntry);

        // ۶. به‌روزرسانی مانده طرف‌حساب (کاهش بدهی مشتری)
        snapshot.clients[clientIndex] = {
          ...client,
          balance: (client.balance || 0) - amount
        };

        // ۷. ثبت تراکنش دریافت مالی (Income Transaction)
        const txId = HabinoAccountingKernel.generateUUID();
        const transaction: Transaction = {
          id: txId,
          tenantId,
          date: dateStr,
          type: 'income',
          category: 'تسویه فاکتور',
          amount,
          description: desc,
          clientId: client.id,
          clientName: client.name,
          relatedInvoiceId: invoice.id,
          fromAccount: client.name,
          toAccount: debitAccountTitle
        };
        snapshot.transactions.unshift(transaction);
        createdTransactions.push(transaction);

        // ۸. در صورت پرداخت چکی، ایجاد سند چک صیادی
        if (item.paymentMethod === 'check' && item.checkDetails) {
          const chkId = HabinoAccountingKernel.generateUUID();
          const checkRecord: Check = {
            id: chkId,
            tenantId,
            checkNumber: item.checkDetails.checkNumber,
            sayadNumber: item.checkDetails.sayadNumber,
            bankName: item.checkDetails.bankName,
            amount,
            issueDate: dateStr,
            dueDate: item.checkDetails.dueDate || dateStr,
            type: 'receivable',
            status: 'pending',
            clientId: client.id,
            clientName: client.name,
            description: `چک بابت تسویه فاکتور #${invoice.invoiceNumber || invoice.id}`,
            relatedInvoiceId: invoice.id
          };
          snapshot.checks.unshift(checkRecord);
          createdChecks.push(checkRecord);
        }
      }

      return {
        nextState: snapshot,
        result: {
          settledInvoices,
          createdTransactions,
          createdEntries,
          createdChecks,
          totalAmountSettled
        }
      };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Batch settlement failed. Rolling back entirely:', error?.message || error);
      if (
        error?.message === 'سند موردنظر یافت نشد.' ||
        error?.message === 'ثبت سند بدون انتخاب مخاطب مجاز نیست.' ||
        error?.message === 'مبلغ سند نامعتبر است.'
      ) {
        throw error;
      }
      throw new Error('خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
    } finally {
      if (releaseLocks) {
        releaseLocks();
      }
    }
  }

  /**
   * 🧩 ۱۱) بستن اتمیک حساب‌های پایان سال مالی (Fiscal Year-End Closing)
   * بستن حساب‌های موقت (درآمدها و هزینه‌ها) به سود/زیان انباشته و صدور سند افتتاحیه متوازن سال بعد
   */
  public static atomicCloseFiscalYear(
    currentState: FinancialStateSnapshot,
    params: CloseFiscalYearParams,
    tenantId: string
  ): { nextState: FinancialStateSnapshot; result: CloseFiscalYearResult } {
    // ۱. بررسی طرف‌حساب الزامی (قانون ۱: سند بدون مخاطب مجاز نیست)
    if (!params.counterpartyClientId || String(params.counterpartyClientId).trim() === '') {
      throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
    }

    const snapshot = this.createSnapshot(currentState);
    const client = snapshot.clients.find(c => c.id === params.counterpartyClientId);
    if (!client) {
      throw new Error('ثبت سند بدون انتخاب مخاطب مجاز نیست.');
    }

    const closingDocNumber = params.closingDocumentNumber || `DOC-CLS-${params.fiscalYear}`;
    const openingDocNumber = params.openingDocumentNumber || `DOC-OPN-${params.fiscalYear + 1}`;
    const closingDate = params.closingDate || `${params.fiscalYear}/12/29`;
    const retainedEarningsCode = params.retainedEarningsAccountCode || '30201';
    const retainedEarningsTitle = params.retainedEarningsTitle || 'سود (زیان) انباشته سیستم';

    try {
      // ۲. جمع‌آوری مانده حساب‌های درآمد (کدهای معین شروع با ۴۰ یا گروه ۶)
      // و حساب‌های بهای تمام‌شده و هزینه (کدهای معین شروع با ۵۰ و ۶۰ یا گروه ۷ و ۸)
      const revenueBalances: Record<string, { code: string; title: string; credit: number; debit: number }> = {};
      const expenseBalances: Record<string, { code: string; title: string; credit: number; debit: number }> = {};

      snapshot.accountingEntries.forEach(entry => {
        // نادیده گرفتن اسناد اختتامیه قبلی
        if (entry.documentNumber.startsWith('DOC-CLS')) return;

        const code = String(entry.accountCode || '');
        const group = String(entry.groupCode || '');

        // تشخیص حساب‌های درآمدی (گروه ۶ یا کدهای معین ۴۰xxx)
        const isRevenue = group === '6' || code.startsWith('40') || code.startsWith('60') && !code.startsWith('601');
        // تشخیص حساب‌های هزینه‌ای (گروه ۷ و ۸ یا کدهای معین ۵۰xxx و ۶۰xxx)
        const isExpense = group === '7' || group === '8' || code.startsWith('50') || code.startsWith('601') || code.startsWith('8');

        if (isRevenue) {
          if (!revenueBalances[code]) {
            revenueBalances[code] = { code, title: entry.accountTitle, credit: 0, debit: 0 };
          }
          revenueBalances[code].credit += entry.credit || 0;
          revenueBalances[code].debit += entry.debit || 0;
        } else if (isExpense) {
          if (!expenseBalances[code]) {
            expenseBalances[code] = { code, title: entry.accountTitle, credit: 0, debit: 0 };
          }
          expenseBalances[code].credit += entry.credit || 0;
          expenseBalances[code].debit += entry.debit || 0;
        }
      });

      let totalRevenue = 0;
      let totalExpense = 0;
      const closingEntries: AccountingEntry[] = [];

      // بستن درآمدهای با مانده خالص بستانکار: بدهکار کردن حساب‌های درآمد
      Object.values(revenueBalances).forEach(rev => {
        const netCredit = rev.credit - rev.debit;
        if (netCredit > 0) {
          totalRevenue += netCredit;
          closingEntries.push({
            id: HabinoAccountingKernel.generateUUID(),
            tenantId,
            documentNumber: closingDocNumber,
            date: closingDate,
            description: `بستن حساب درآمد ${rev.title} در پایان سال مالی ${params.fiscalYear}`,
            accountCode: rev.code,
            accountTitle: rev.title,
            groupCode: '6',
            debit: netCredit,
            credit: 0,
            clientId: client.id,
            created_at: new Date().toISOString()
          });
        }
      });

      // بستن هزینه‌های با مانده خالص بدهکار: بستانکار کردن حساب‌های هزینه
      Object.values(expenseBalances).forEach(exp => {
        const netDebit = exp.debit - exp.credit;
        if (netDebit > 0) {
          totalExpense += netDebit;
          closingEntries.push({
            id: HabinoAccountingKernel.generateUUID(),
            tenantId,
            documentNumber: closingDocNumber,
            date: closingDate,
            description: `بستن حساب هزینه ${exp.title} در پایان سال مالی ${params.fiscalYear}`,
            accountCode: exp.code,
            accountTitle: exp.title,
            groupCode: '8',
            debit: 0,
            credit: netDebit,
            clientId: client.id,
            created_at: new Date().toISOString()
          });
        }
      });

      const netProfitOrLoss = totalRevenue - totalExpense;

      // ثبت مابه‌التفاوت در سود (زیان) انباشته
      if (netProfitOrLoss > 0) {
        // سود خالص: بستانکار کردن سود انباشته
        closingEntries.push({
          id: HabinoAccountingKernel.generateUUID(),
          tenantId,
          documentNumber: closingDocNumber,
          date: closingDate,
          description: `انتقال سود خالص سال مالی ${params.fiscalYear} به سود انباشته`,
          accountCode: retainedEarningsCode,
          accountTitle: retainedEarningsTitle,
          groupCode: '5',
          kolCode: '53',
          moeinCode: retainedEarningsCode,
          debit: 0,
          credit: netProfitOrLoss,
          clientId: client.id,
          created_at: new Date().toISOString()
        });
      } else if (netProfitOrLoss < 0) {
        // زیان خالص: بدهکار کردن سود (زیان) انباشته
        const absLoss = Math.abs(netProfitOrLoss);
        closingEntries.push({
          id: HabinoAccountingKernel.generateUUID(),
          tenantId,
          documentNumber: closingDocNumber,
          date: closingDate,
          description: `انتقال زیان خالص سال مالی ${params.fiscalYear} به سود (زیان) انباشته`,
          accountCode: retainedEarningsCode,
          accountTitle: retainedEarningsTitle,
          groupCode: '5',
          kolCode: '53',
          moeinCode: retainedEarningsCode,
          debit: absLoss,
          credit: 0,
          clientId: client.id,
          created_at: new Date().toISOString()
        });
      }

      // اعتبارسنجی تراز بودن سند اختتامیه
      const sumDebits = closingEntries.reduce((s, e) => s + (e.debit || 0), 0);
      const sumCredits = closingEntries.reduce((s, e) => s + (e.credit || 0), 0);
      if (Math.abs(sumDebits - sumCredits) > 1) {
        throw new Error('خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
      }

      // ۳. افزودن رکوردهای اختتامیه به دفتر کل
      snapshot.accountingEntries.push(...closingEntries);

      // ۴. صدور سند افتتاحیه سال مالی جدید برای حساب‌های دائم (ترازنامه)
      const openingDate = `${params.fiscalYear + 1}/01/01`;
      const openingEntries: AccountingEntry[] = [];

      // محاسبه تراز مانده دائمی حساب‌های دارایی، بدهی و حقوق صاحبان سهام
      const permanentAccounts: Record<string, { code: string; title: string; group: string; netBalance: number }> = {};
      snapshot.accountingEntries.forEach(entry => {
        if (entry.documentNumber.startsWith('DOC-OPN')) return; // سندهای افتتاحیه قبلی تکرار نشوند
        const grp = String(entry.groupCode || '');
        // گروه‌های ۱ تا ۵ دائمی هستند
        if (['1', '2', '3', '4', '5'].includes(grp)) {
          const key = entry.accountCode;
          if (!permanentAccounts[key]) {
            permanentAccounts[key] = {
              code: key,
              title: entry.accountTitle,
              group: grp,
              netBalance: 0
            };
          }
          permanentAccounts[key].netBalance += (entry.debit || 0) - (entry.credit || 0);
        }
      });

      Object.values(permanentAccounts).forEach(acc => {
        if (acc.netBalance !== 0) {
          openingEntries.push({
            id: HabinoAccountingKernel.generateUUID(),
            tenantId,
            documentNumber: openingDocNumber,
            date: openingDate,
            description: `مانده افتتاحیه سال مالی ${params.fiscalYear + 1} - ${acc.title}`,
            accountCode: acc.code,
            accountTitle: acc.title,
            groupCode: acc.group,
            debit: acc.netBalance > 0 ? acc.netBalance : 0,
            credit: acc.netBalance < 0 ? Math.abs(acc.netBalance) : 0,
            clientId: client.id,
            created_at: new Date().toISOString()
          });
        }
      });

      if (openingEntries.length > 0) {
        const opnDebit = openingEntries.reduce((s, e) => s + (e.debit || 0), 0);
        const opnCredit = openingEntries.reduce((s, e) => s + (e.credit || 0), 0);
        if (Math.abs(opnDebit - opnCredit) <= 1) {
          snapshot.accountingEntries.push(...openingEntries);
        }
      }

      return {
        nextState: snapshot,
        result: {
          fiscalYear: params.fiscalYear,
          closingDocumentNumber: closingDocNumber,
          openingDocumentNumber: openingDocNumber,
          totalRevenue,
          totalExpense,
          netProfitOrLoss,
          closingEntriesCount: closingEntries.length,
          openingEntriesCount: openingEntries.length
        }
      };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Fiscal close failed. Rolling back:', error?.message || error);
      if (error?.message === 'ثبت سند بدون انتخاب مخاطب مجاز نیست.') {
        throw error;
      }
      throw new Error('خطا در ثبت سند. هیچ تغییری ذخیره نشد.');
    }
  }

  /**
   * اجرای اتمیک یک دسته از عملیات مالی با تضمین Rollback قطعی در صورت بروز هرگونه خطا
   */
  public static executeAtomicTransaction<T>(
    currentState: FinancialStateSnapshot,
    transactionFn: (state: FinancialStateSnapshot) => T
  ): { nextState: FinancialStateSnapshot; result: T } {
    const snapshot = this.createSnapshot(currentState);
    try {
      const result = transactionFn(snapshot);
      return { nextState: snapshot, result };
    } catch (error: any) {
      console.warn('[AtomicTransactionWrapper] Batch transaction rolled back:', error?.message || error);
      throw error;
    }
  }

  /**
   * اعتبارسنجی انطباق متن پیام‌های خطای استاندارد ۹‌گانه سامانه هابینو
   */
  public static validateStandardErrorMessage(message: string): boolean {
    const standardErrors = [
      'ثبت سند بدون انتخاب مخاطب مجاز نیست.',
      'مبلغ سند نامعتبر است.',
      'سند موردنظر یافت نشد.',
      'حذف سند ناموفق بود. هیچ تغییری اعمال نشد.',
      'خطا در ثبت سند. هیچ تغییری ذخیره نشد.',
      'اطلاعات واردشده ناقص است.'
    ];
    return standardErrors.includes(message.trim());
  }
}
