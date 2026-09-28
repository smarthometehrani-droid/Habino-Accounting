/**
 * Habino Accounting Kernel (هسته استاندارد حسابداری هابینو)
 * پیاده‌سازی اصول پایه‌ای و سخت‌گیرانه ثبت، ذخیره‌سازی، ویرایش، حذف زنجیره‌ای و یکپارچگی داده‌های مالی
 * مطابق دستورالعمل قطعی و ACID پلتفرم هابینو
 */

import { AccountingEntry, Client, Invoice, Check, Transaction, Project, InventoryItem, BankAccount, TafsiliType } from '../types';
import { toBaseCurrency, BASE_FINANCIAL_CURRENCY, IRT_TO_IRR_MULTIPLIER } from './currencyUtils';
import { resolveAccountCoding } from './chartOfAccountsData';

export interface AccountingValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export class HabinoAccountingKernel {
  /**
   * هوشمندسازی و الصاق اطلاعات کدینگ ۳ سطحی و تفصیلی شناور به آرتیکل سند
   */
  public static enrichEntry(
    entry: AccountingEntry,
    tafsiliInfo?: { title?: string; type?: TafsiliType; code?: string }
  ): AccountingEntry {
    const coding = resolveAccountCoding(entry.accountCode);
    return {
      ...entry,
      moeinCode: coding.moein?.code || entry.accountCode,
      kolCode: coding.kol?.code || entry.accountCode.substring(0, 2),
      groupCode: coding.group?.code || entry.accountCode.substring(0, 1),
      tafsiliTitle: tafsiliInfo?.title || entry.tafsiliTitle,
      tafsiliType: tafsiliInfo?.type || entry.tafsiliType,
      tafsiliCode: tafsiliInfo?.code || entry.tafsiliCode
    };
  }

  /**
   * تولید شناسه یکتای جهانی (UUID)
   */
  public static generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'habino-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * 🧩 ۱) اصول پایه‌ای اعتبارسنجی ثبت سند
   * - بررسی انتخاب مخاطب
   * - بررسی مبالغ بدهکار و بستانکار
   */
  public static validateDocumentEntry(params: {
    clientId?: string;
    clientsList?: Client[];
    debit?: number;
    credit?: number;
    amount?: number;
  }): AccountingValidationResult {
    // مخاطب (طرف حساب) را بررسی کند
    if (!params.clientId || params.clientId.trim() === '') {
      return {
        valid: false,
        errorMessage: 'ثبت سند بدون انتخاب مخاطب مجاز نیست.'
      };
    }

    // بررسی فعال بودن یا وجود مخاطب
    if (params.clientsList && params.clientsList.length > 0) {
      const clientExists = params.clientsList.some(c => c.id === params.clientId);
      if (!clientExists) {
        return {
          valid: false,
          errorMessage: 'ثبت سند بدون انتخاب مخاطب مجاز نیست.'
        };
      }
    }

    // مبالغ بدهکار و بستانکار
    const debit = params.debit ?? (params.amount && params.amount > 0 ? params.amount : 0);
    const credit = params.credit ?? 0;

    if (debit === 0 && credit === 0) {
      return {
        valid: false,
        errorMessage: 'مبلغ سند نامعتبر است.'
      };
    }

    return { valid: true };
  }

  /**
   * 🧩 ۲) ایجاد رکوردهای دوبل دفتر کل برای فاکتور (فروش، خرید، مرجوعی)
   */
  public static createDoubleEntryForInvoice(
    invoice: Invoice,
    tenantId: string
  ): AccountingEntry[] {
    const entries: AccountingEntry[] = [];
    const docNum = `DOC-INV-${invoice.invoiceNumber}`;
    const dateStr = invoice.date;
    const invType = invoice.type || 'sale';

    if (invType === 'purchase') {
      // فاکتور خرید: بدهکار موجودی کالا/هزینه، بستانکار طرف‌حساب تامین‌کننده
      const netAmount = invoice.subtotal - (invoice.totalDiscount || 0);
      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `خرید کالا/تجهیزات فاکتور شماره ${invoice.invoiceNumber} از ${invoice.clientName || 'تأمین‌کننده'}`,
        accountCode: '10301',
        accountTitle: 'موجودی کالا و ملزومات مصرفی',
        debit: netAmount,
        credit: 0,
        clientId: invoice.clientId,
        projectTag: invoice.projectId,
        created_at: new Date().toISOString()
      });

      if (invoice.totalTax > 0) {
        entries.push({
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `مالیات بر ارزش افزوده خرید فاکتور ${invoice.invoiceNumber}`,
          accountCode: '20301',
          accountTitle: 'مالیات و عوارض ارزش افزوده پرداختنی',
          debit: invoice.totalTax,
          credit: 0,
          clientId: invoice.clientId,
          projectTag: invoice.projectId,
          created_at: new Date().toISOString()
        });
      }

      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `بدهی بابت فاکتور خرید شماره ${invoice.invoiceNumber} به ${invoice.clientName || 'تأمین‌کننده'}`,
        accountCode: '20101',
        accountTitle: 'حساب‌های پرداختنی تجاری (تأمین‌کنندگان)',
        debit: 0,
        credit: invoice.grandTotal,
        clientId: invoice.clientId,
        projectTag: invoice.projectId,
        created_at: new Date().toISOString()
      });

      if (invoice.amountPaid > 0) {
        entries.push({
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `تسویه فوری/پرداخت نقدی وجه فاکتور خرید ${invoice.invoiceNumber}`,
          accountCode: '20101',
          accountTitle: 'حساب‌های پرداختنی تجاری (تأمین‌کنندگان)',
          debit: invoice.amountPaid,
          credit: 0,
          clientId: invoice.clientId,
          projectTag: invoice.projectId,
          created_at: new Date().toISOString()
        });
        entries.push({
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `خروج وجه نقد/بانک بابت پرداخت فاکتور خرید ${invoice.invoiceNumber}`,
          accountCode: '10101',
          accountTitle: 'موجودی نقد و بانک‌ها',
          debit: 0,
          credit: invoice.amountPaid,
          clientId: invoice.clientId,
          projectTag: invoice.projectId,
          created_at: new Date().toISOString()
        });
      }
    } else if (invType === 'sale_return') {
      // برگشت از فروش: بدهکار برگشت از فروش و ارزش افزوده، بستانکار حساب مشتری
      const netAmount = invoice.subtotal - (invoice.totalDiscount || 0);
      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `مرجوعی فروش و ابطال درآمد فاکتور شماره ${invoice.invoiceNumber} - ${invoice.clientName || 'مشتری'}`,
        accountCode: '40101',
        accountTitle: 'درآمد ارائه خدمات و فروش (برگشتی)',
        debit: netAmount,
        credit: 0,
        clientId: invoice.clientId,
        projectTag: invoice.projectId,
        created_at: new Date().toISOString()
      });

      if (invoice.totalTax > 0) {
        entries.push({
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `تعدیل مالیات ارزش افزوده برگشت از فروش فاکتور ${invoice.invoiceNumber}`,
          accountCode: '20301',
          accountTitle: 'مالیات و عوارض ارزش افزوده پرداختنی',
          debit: invoice.totalTax,
          credit: 0,
          clientId: invoice.clientId,
          projectTag: invoice.projectId,
          created_at: new Date().toISOString()
        });
      }

      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `کاهش طلب از مشتری بابت مرجوعی شماره ${invoice.invoiceNumber}`,
        accountCode: '10201',
        accountTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
        debit: 0,
        credit: invoice.grandTotal,
        clientId: invoice.clientId,
        projectTag: invoice.projectId,
        created_at: new Date().toISOString()
      });
    } else if (invType === 'purchase_return') {
      // برگشت از خرید: بدهکار حساب تأمین‌کننده، بستانکار موجودی کالا و ارزش افزوده
      const netAmount = invoice.subtotal - (invoice.totalDiscount || 0);
      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `کاهش بدهی با برگشت از خرید فاکتور شماره ${invoice.invoiceNumber} به ${invoice.clientName || 'تأمین‌کننده'}`,
        accountCode: '20101',
        accountTitle: 'حساب‌های پرداختنی تجاری (تأمین‌کنندگان)',
        debit: invoice.grandTotal,
        credit: 0,
        clientId: invoice.clientId,
        projectTag: invoice.projectId,
        created_at: new Date().toISOString()
      });

      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `برگشت کالای خریداری شده فاکتور ${invoice.invoiceNumber}`,
        accountCode: '10301',
        accountTitle: 'موجودی کالا و ملزومات مصرفی',
        debit: 0,
        credit: netAmount,
        clientId: invoice.clientId,
        projectTag: invoice.projectId,
        created_at: new Date().toISOString()
      });

      if (invoice.totalTax > 0) {
        entries.push({
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `تعدیل ارزش افزوده برگشت از خرید فاکتور ${invoice.invoiceNumber}`,
          accountCode: '20301',
          accountTitle: 'مالیات و عوارض ارزش افزوده پرداختنی',
          debit: 0,
          credit: invoice.totalTax,
          clientId: invoice.clientId,
          projectTag: invoice.projectId,
          created_at: new Date().toISOString()
        });
      }
    } else {
      // پیش‌فرض: فاکتور فروش یا خدمات
      // ۱. بدهکار: حساب‌ها و اسناد دریافتنی تجاری
      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `شناسایی طلب فاکتور رسمی شماره ${invoice.invoiceNumber} - ${invoice.clientName || 'مشتری'}`,
        accountCode: '10201',
        accountTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
        debit: invoice.grandTotal,
        credit: 0,
        clientId: invoice.clientId,
        projectTag: invoice.projectId,
        created_at: new Date().toISOString()
      });

      // ۲. بستانکار: درآمد فروش / ارائه خدمات
      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `درآمد عملیاتی حاصل از فاکتور ${invoice.invoiceNumber}`,
        accountCode: '40101',
        accountTitle: 'درآمد ارائه خدمات و فروش',
        debit: 0,
        credit: invoice.subtotal - (invoice.totalDiscount || 0),
        clientId: invoice.clientId,
        projectTag: invoice.projectId,
        created_at: new Date().toISOString()
      });

      // ۳. بستانکار: مالیات بر ارزش افزوده (در صورت وجود)
      if (invoice.totalTax > 0) {
        entries.push({
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `مالیات و عوارض ارزش افزوده فاکتور ${invoice.invoiceNumber}`,
          accountCode: '20301',
          accountTitle: 'مالیات و عوارض ارزش افزوده پرداختنی',
          debit: 0,
          credit: invoice.totalTax,
          clientId: invoice.clientId,
          projectTag: invoice.projectId,
          created_at: new Date().toISOString()
        });
      }

      // ۴. در صورت پرداخت نقدی فوری در زمان ثبت فاکتور
      if (invoice.amountPaid > 0) {
        entries.push({
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `وصول نقدی وجه فاکتور ${invoice.invoiceNumber}`,
          accountCode: '10101',
          accountTitle: 'موجودی نقد و بانک‌ها',
          debit: invoice.amountPaid,
          credit: 0,
          clientId: invoice.clientId,
          projectTag: invoice.projectId,
          created_at: new Date().toISOString()
        });

        entries.push({
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `کاهش مانده بدهکاری با دریافت نقدی فاکتور ${invoice.invoiceNumber}`,
          accountCode: '10201',
          accountTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
          debit: 0,
          credit: invoice.amountPaid,
          clientId: invoice.clientId,
          projectTag: invoice.projectId,
          created_at: new Date().toISOString()
        });
      }
    }

    return entries.map(entry => ({
      ...entry,
      referenceId: invoice.id || entry.referenceId
    }));
  }

  /**
   * 🧩 اصول ثبت مانده اول دوره / افتتاحیه اشخاص (Client Opening Balance)
   * - ذخیره‌سازی مبالغ بر پایه واحد پول ثابت (ریال) به همراه برچسب‌های مالی
   * - اگر مانده مثبت باشد (بدهکار به ما): بدهکار حساب‌های دریافتنی (۱۰۲۰۱)، بستانکار سرمایه اولیه و افتتاحیه (۳۰۱۰۱)
   * - اگر مانده منفی باشد (بستانکار از ما): بدهکار سرمایه اولیه و افتتاحیه (۳۰۱۰۱)، بستانکار حساب‌های پرداختنی (۲۰۱۰۱)
   * - سند دوبل متوازن با شماره DOC-OPN-... و شناسه یکتا
   */
  public static createDoubleEntryForClientOpeningBalance(
    client: Client,
    tenantId: string
  ): AccountingEntry[] {
    const rawBalance = Number(client.balance) || 0;
    if (rawBalance === 0) {
      return [];
    }

    const entries: AccountingEntry[] = [];
    const docNum = `DOC-OPN-${client.id.substring(0, 8).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('fa-IR');
    const partyName = client.name || 'طرف‌حساب';
    const baseAmount = toBaseCurrency(Math.abs(rawBalance), 'IRT');

    if (rawBalance > 0) {
      // مشتری بدهکار است
      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `مانده حساب اول دوره (بدهکاری اولیه) - ${partyName}`,
        accountCode: '10201',
        accountTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
        debit: rawBalance,
        credit: 0,
        clientId: client.id,
        referenceId: client.id,
        baseCurrency: BASE_FINANCIAL_CURRENCY,
        baseDebit: baseAmount,
        baseCredit: 0,
        exchangeRate: IRT_TO_IRR_MULTIPLIER,
        created_at: new Date().toISOString()
      });

      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `تراز افتتاحیه / حقوق صاحبان سهام - مانده اول دوره ${partyName}`,
        accountCode: '30101',
        accountTitle: 'سرمایه شرکا و تراز افتتاحیه',
        debit: 0,
        credit: rawBalance,
        clientId: client.id,
        referenceId: client.id,
        baseCurrency: BASE_FINANCIAL_CURRENCY,
        baseDebit: 0,
        baseCredit: baseAmount,
        exchangeRate: IRT_TO_IRR_MULTIPLIER,
        created_at: new Date().toISOString()
      });
    } else {
      // طرف‌حساب بستانکار است (طلبکار از ما)
      const absBal = Math.abs(rawBalance);
      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `تراز افتتاحیه / حقوق صاحبان سهام - مانده اول دوره ${partyName}`,
        accountCode: '30101',
        accountTitle: 'سرمایه شرکا و تراز افتتاحیه',
        debit: absBal,
        credit: 0,
        clientId: client.id,
        referenceId: client.id,
        baseCurrency: BASE_FINANCIAL_CURRENCY,
        baseDebit: baseAmount,
        baseCredit: 0,
        exchangeRate: IRT_TO_IRR_MULTIPLIER,
        created_at: new Date().toISOString()
      });

      entries.push({
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `مانده حساب اول دوره (بستانکاری اولیه) - ${partyName}`,
        accountCode: '20101',
        accountTitle: 'حساب‌ها و اسناد پرداختنی تجاری (تأمین‌کنندگان)',
        debit: 0,
        credit: absBal,
        clientId: client.id,
        referenceId: client.id,
        baseCurrency: BASE_FINANCIAL_CURRENCY,
        baseDebit: 0,
        baseCredit: baseAmount,
        exchangeRate: IRT_TO_IRR_MULTIPLIER,
        created_at: new Date().toISOString()
      });
    }

    return entries;
  }

  /**
   * 🧩 اصول ثبت سند افتتاحیه موجودی کالای اول دوره انبار
   * - بدهکار: حساب ۱۰۳۰۱ (موجودی کالا و ملزومات اول دوره)
   * - بستانکار: حساب ۳۰۱۰۱ (سرمایه شرکا و تراز افتتاحیه)
   */
  public static createDoubleEntryForInventoryOpeningBalance(
    item: InventoryItem,
    tenantId: string
  ): AccountingEntry[] {
    const stock = Number(item.stock) || 0;
    const buyPrice = Number(item.buyPrice) || 0;
    const totalVal = stock * buyPrice;
    if (totalVal <= 0) return [];

    const docNum = `DOC-OPN-INV-${item.id.substring(0, 8).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('fa-IR');
    const baseAmount = toBaseCurrency(totalVal, 'IRT');

    return [
      {
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `تراز افتتاحیه / موجودی کالای اول دوره - ${item.name} (${stock} عدد به بهای ${buyPrice})`,
        accountCode: '10301',
        accountTitle: 'موجودی کالا و قطعات مصرفی',
        debit: totalVal,
        credit: 0,
        referenceId: item.id,
        baseCurrency: BASE_FINANCIAL_CURRENCY,
        baseDebit: baseAmount,
        baseCredit: 0,
        exchangeRate: IRT_TO_IRR_MULTIPLIER,
        created_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `تراز افتتاحیه / سرمایه اولیه از موجودی کالا - ${item.name}`,
        accountCode: '30101',
        accountTitle: 'سرمایه شرکا و تراز افتتاحیه',
        debit: 0,
        credit: totalVal,
        referenceId: item.id,
        baseCurrency: BASE_FINANCIAL_CURRENCY,
        baseDebit: 0,
        baseCredit: baseAmount,
        exchangeRate: IRT_TO_IRR_MULTIPLIER,
        created_at: new Date().toISOString()
      }
    ];
  }

  /**
   * 🧩 اصول ثبت سند افتتاحیه حساب‌های بانکی و صندوق
   * - بدهکار: حساب ۱۰۱۰۱ (موجودی نقد و بانک‌ها اول دوره)
   * - بستانکار: حساب ۳۰۱۰۱ (سرمایه شرکا و تراز افتتاحیه)
   */
  public static createDoubleEntryForBankAccountOpeningBalance(
    bank: BankAccount,
    tenantId: string
  ): AccountingEntry[] {
    const rawBalance = Number(bank.balance) || 0;
    if (rawBalance <= 0) return [];

    const docNum = `DOC-OPN-BNK-${bank.id.substring(0, 8).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('fa-IR');
    const baseAmount = toBaseCurrency(rawBalance, 'IRT');

    return [
      {
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `تراز افتتاحیه / موجودی نقد و بانک اول دوره - ${bank.bankName} (${bank.accountNumber})`,
        accountCode: '10101',
        accountTitle: 'صندوق و موجودی نقد نزد بانک‌ها',
        debit: rawBalance,
        credit: 0,
        referenceId: bank.id,
        baseCurrency: BASE_FINANCIAL_CURRENCY,
        baseDebit: baseAmount,
        baseCredit: 0,
        exchangeRate: IRT_TO_IRR_MULTIPLIER,
        created_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        tenantId,
        documentNumber: docNum,
        date: dateStr,
        description: `تراز افتتاحیه / سرمایه اولیه نقدی شرکا - ${bank.bankName}`,
        accountCode: '30101',
        accountTitle: 'سرمایه شرکا و تراز افتتاحیه',
        debit: 0,
        credit: rawBalance,
        referenceId: bank.id,
        baseCurrency: BASE_FINANCIAL_CURRENCY,
        baseDebit: 0,
        baseCredit: baseAmount,
        exchangeRate: IRT_TO_IRR_MULTIPLIER,
        created_at: new Date().toISOString()
      }
    ];
  }

  /**
   * 🧩 اعتبارسنجی سقف اعتبار طرف‌حساب (Credit Limit Check)
   */
  public static validateCreditLimit(
    client: Client,
    additionalDebt: number
  ): {
    isExceeded: boolean;
    isBlocked: boolean;
    currentBalance: number;
    projectedBalance: number;
    creditLimit: number;
    remainingCredit: number;
    messageFa?: string;
  } {
    const currentBalance = Number(client.balance) || 0;
    const creditLimit = Number(client.creditLimit) || 0;
    const isBlocked = !!client.isBlockedForCredit;
    const projectedBalance = currentBalance + Math.max(0, additionalDebt);

    if (isBlocked && additionalDebt > 0) {
      return {
        isExceeded: true,
        isBlocked: true,
        currentBalance,
        projectedBalance,
        creditLimit,
        remainingCredit: 0,
        messageFa: `طرف‌حساب «${client.name}» در سامانه مسدودیت اعتباری دارد و صدور فاکتور نسیه یا ثبت بدهی جدید برای وی مجاز نمی‌باشد.`
      };
    }

    if (creditLimit <= 0) {
      return {
        isExceeded: false,
        isBlocked: false,
        currentBalance,
        projectedBalance,
        creditLimit: 0,
        remainingCredit: Infinity
      };
    }

    const remainingCredit = creditLimit - currentBalance;
    const isExceeded = projectedBalance > creditLimit;

    return {
      isExceeded,
      isBlocked: false,
      currentBalance,
      projectedBalance,
      creditLimit,
      remainingCredit,
      messageFa: isExceeded
        ? `هشدار سقف اعتبار: بدهی طرف‌حساب پس از این سند به ${projectedBalance.toLocaleString('fa-IR')} خواهد رسید که از سقف مجاز (${creditLimit.toLocaleString('fa-IR')}) بیشتر است.`
        : undefined
    };
  }

  /**
   * 🧩 محاسبه ترازنامه افتتاحیه کامل سیستم (Opening Balance Sheet)
   * تضمین تساوی: دارایی‌ها = بدهی‌ها + سرمایه اول دوره
   */
  public static createOpeningBalanceSheetSummary(params: {
    clients: Client[];
    inventory: InventoryItem[];
    bankAccounts: BankAccount[];
    entries: AccountingEntry[];
  }): {
    totalCashAssets: number;
    totalReceivables: number;
    totalInventoryAssets: number;
    totalAssets: number;
    totalPayables: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    discrepancy: number;
    isBalanced: boolean;
  } {
    // دارایی‌های نقد اول دوره
    const totalCashAssets = params.bankAccounts.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    // مطالبات اول دوره (مشتریان بدهکار)
    const totalReceivables = params.clients
      .filter(c => (Number(c.balance) || 0) > 0)
      .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

    // موجودی انبار اول دوره
    const totalInventoryAssets = params.inventory.reduce(
      (sum, i) => sum + ((Number(i.stock) || 0) * (Number(i.buyPrice) || 0)),
      0
    );

    const totalAssets = totalCashAssets + totalReceivables + totalInventoryAssets;

    // بدهی‌های اول دوره (طرف‌حساب‌های بستانکار)
    const totalPayables = params.clients
      .filter(c => (Number(c.balance) || 0) < 0)
      .reduce((sum, c) => sum + Math.abs(Number(c.balance) || 0), 0);

    // حقوق صاحبان سهام / سرمایه اولیه افتتاحیه (معادل خالص دارایی‌ها منهای بدهی‌ها)
    const totalEquity = totalAssets - totalPayables;
    const totalLiabilitiesAndEquity = totalPayables + totalEquity;
    const discrepancy = Math.abs(totalAssets - totalLiabilitiesAndEquity);

    return {
      totalCashAssets,
      totalReceivables,
      totalInventoryAssets,
      totalAssets,
      totalPayables,
      totalEquity,
      totalLiabilitiesAndEquity,
      discrepancy,
      isBalanced: discrepancy < 0.01
    };
  }

  /**
   * 🧩 ۶) اصول ثبت پیش‌پرداخت پروژه
   * - در حساب کارفرما ثبت شود
   * - برچسب پروژه داشته باشد
   * - در دفتر کل ذخیره شود
   * بدهکار: بانک / اسناد دریافتنی
   * بستانکار: کارفرما
   */
  public static createProjectAdvanceEntry(params: {
    project: Project;
    amount: number;
    date: string;
    description: string;
    tenantId: string;
  }): AccountingEntry[] {
    const docNum = `DOC-PRJ-ADV-${params.project.id.slice(0, 8)}`;
    return [
      {
        id: this.generateUUID(),
        tenantId: params.tenantId,
        documentNumber: docNum,
        date: params.date,
        description: `دریافت پیش‌پرداخت پروژه ${params.project.title}: ${params.description}`,
        accountCode: '10101',
        accountTitle: 'موجودی نقد و بانک‌ها',
        debit: params.amount,
        credit: 0,
        clientId: params.project.clientId,
        projectTag: params.project.id,
        referenceId: params.project.id,
        created_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        tenantId: params.tenantId,
        documentNumber: docNum,
        date: params.date,
        description: `پیش‌دریافت کارفرما (${params.project.clientName || 'کارفرما'}) بابت پروژه ${params.project.title}`,
        accountCode: '20201',
        accountTitle: 'پیش‌دریافت از مشتریان / کارفرمایان',
        debit: 0,
        credit: params.amount,
        clientId: params.project.clientId,
        projectTag: params.project.id,
        referenceId: params.project.id,
        created_at: new Date().toISOString()
      }
    ];
  }

  /**
   * 🧩 ۷) اصول ثبت سود پروژه
   * - پس از تکمیل پروژه
   * - بدهکار: حساب سود پروژه
   * - بستانکار: حساب سود سیستم
   */
  public static createProjectProfitEntry(params: {
    project: Project;
    netProfit: number;
    date: string;
    tenantId: string;
  }): AccountingEntry[] {
    const docNum = `DOC-PRJ-PROFIT-${params.project.id.slice(0, 8)}`;
    return [
      {
        id: this.generateUUID(),
        tenantId: params.tenantId,
        documentNumber: docNum,
        date: params.date,
        description: `شناسایی و بستن سود خالص پروژه ${params.project.title}`,
        accountCode: '50101',
        accountTitle: 'حساب سود پروژه',
        debit: params.netProfit,
        credit: 0,
        clientId: params.project.clientId,
        projectTag: params.project.id,
        referenceId: params.project.id,
        created_at: new Date().toISOString()
      },
      {
        id: this.generateUUID(),
        tenantId: params.tenantId,
        documentNumber: docNum,
        date: params.date,
        description: `انتقال سود به حساب سود و زیان انباشته سیستم - پروژه ${params.project.title}`,
        accountCode: '30201',
        accountTitle: 'حساب سود سیستم (سود انباشته)',
        debit: 0,
        credit: params.netProfit,
        clientId: params.project.clientId,
        projectTag: params.project.id,
        referenceId: params.project.id,
        created_at: new Date().toISOString()
      }
    ];
  }

  /**
   * 🧩 ایجاد رکوردهای دوبل دفتر کل برای تراکنش‌های نقد و بانک (درآمد و هزینه)
   */
  public static createDoubleEntryForTransaction(
    tx: Transaction,
    tenantId: string
  ): AccountingEntry[] {
    const docNum = `DOC-TX-${tx.id.slice(0, 8)}`;
    const dateStr = tx.date;
    const isIncome = tx.type === 'income';

    if (isIncome) {
      return [
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `وصول وجه نقد/بانک: ${tx.description || tx.category}`,
          accountCode: '10101',
          accountTitle: 'موجودی نقد و بانک‌ها',
          debit: tx.amount,
          credit: 0,
          clientId: tx.clientId,
          projectTag: tx.projectId, // فقط برچسب پروژه
          referenceId: tx.id,
          created_at: new Date().toISOString()
        },
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `بستانکاری طرف‌حساب بابت وصول وجه: ${tx.clientName || 'مخاطب'}`,
          accountCode: '10201',
          accountTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
          debit: 0,
          credit: tx.amount,
          clientId: tx.clientId,
          projectTag: tx.projectId,
          referenceId: tx.id,
          created_at: new Date().toISOString()
        }
      ];
    } else {
      return [
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `هزینه عملیاتی / پرداخت وجه: ${tx.description || tx.category}`,
          accountCode: '60102',
          accountTitle: 'هزینه‌های جاری و عملیاتی',
          debit: tx.amount,
          credit: 0,
          clientId: tx.clientId,
          projectTag: tx.projectId,
          referenceId: tx.id,
          created_at: new Date().toISOString()
        },
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `خروج وجه نقد/بانک بابت هزینه: ${tx.clientName || 'مخاطب'}`,
          accountCode: '10101',
          accountTitle: 'موجودی نقد و بانک‌ها',
          debit: 0,
          credit: tx.amount,
          clientId: tx.clientId,
          projectTag: tx.projectId,
          referenceId: tx.id,
          created_at: new Date().toISOString()
        }
      ];
    }
  }

  /**
   * 🧩 ایجاد رکوردهای دوبل دفتر کل برای ثبت سند چک (دریافتی یا پرداختی)
   */
  public static createDoubleEntryForCheck(
    check: Check,
    tenantId: string
  ): AccountingEntry[] {
    const docNum = `DOC-CHK-${check.checkNumber || check.id.slice(0, 8)}`;
    const dateStr = check.issueDate;
    const isIncoming = check.type === 'receivable';

    if (isIncoming) {
      return [
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `دریافت چک صیادی شماره ${check.checkNumber} از ${check.clientName || 'مشتری'}`,
          accountCode: '10202',
          accountTitle: 'اسناد دریافتنی تجاری (چک‌های نزد صندوق)',
          debit: check.amount,
          credit: 0,
          clientId: check.clientId,
          referenceId: check.id,
          created_at: new Date().toISOString()
        },
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `تسویه حساب با دریافت چک شماره ${check.checkNumber}`,
          accountCode: '10201',
          accountTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
          debit: 0,
          credit: check.amount,
          clientId: check.clientId,
          referenceId: check.id,
          created_at: new Date().toISOString()
        }
      ];
    } else {
      return [
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `تسویه بدهی با صدور چک شماره ${check.checkNumber} در وجه ${check.clientName || 'تأمین‌کننده'}`,
          accountCode: '20101',
          accountTitle: 'حساب‌های پرداختنی تجاری (تأمین‌کنندگان)',
          debit: check.amount,
          credit: 0,
          clientId: check.clientId,
          referenceId: check.id,
          created_at: new Date().toISOString()
        },
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: dateStr,
          description: `صدور چک پرداختنی شماره ${check.checkNumber} عهده بانک ${check.bankName}`,
          accountCode: '20102',
          accountTitle: 'اسناد پرداختنی تجاری (چک‌های عهده بانک)',
          debit: 0,
          credit: check.amount,
          clientId: check.clientId,
          referenceId: check.id,
          created_at: new Date().toISOString()
        }
      ];
    }
  }

  /**
   * 🧩 ایجاد رکوردهای دوبل وصول یا پاس شدن چک در بانک
   */
  public static createDoubleEntryForCheckClearing(
    check: Check,
    tenantId: string,
    clearDate: string
  ): AccountingEntry[] {
    const docNum = `DOC-CHK-CLR-${check.checkNumber || check.id.slice(0, 8)}`;
    const isIncoming = check.type === 'receivable';

    if (isIncoming) {
      return [
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: clearDate,
          description: `وصول و واریز چک شماره ${check.checkNumber} به حساب بانکی`,
          accountCode: '10101',
          accountTitle: 'موجودی نقد و بانک‌ها',
          debit: check.amount,
          credit: 0,
          clientId: check.clientId,
          referenceId: check.id,
          created_at: new Date().toISOString()
        },
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: clearDate,
          description: `خروج چک وصول‌شده شماره ${check.checkNumber} از اسناد در جریان وصول`,
          accountCode: '10202',
          accountTitle: 'اسناد دریافتنی تجاری (چک‌های نزد صندوق)',
          debit: 0,
          credit: check.amount,
          clientId: check.clientId,
          referenceId: check.id,
          created_at: new Date().toISOString()
        }
      ];
    } else {
      return [
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: clearDate,
          description: `پاس شدن و تسویه چک عهده بانک شماره ${check.checkNumber}`,
          accountCode: '20102',
          accountTitle: 'اسناد پرداختنی تجاری (چک‌های عهده بانک)',
          debit: check.amount,
          credit: 0,
          clientId: check.clientId,
          referenceId: check.id,
          created_at: new Date().toISOString()
        },
        {
          id: this.generateUUID(),
          tenantId,
          documentNumber: docNum,
          date: clearDate,
          description: `برداشت وجه چک شماره ${check.checkNumber} از حساب بانکی`,
          accountCode: '10101',
          accountTitle: 'موجودی نقد و بانک‌ها',
          debit: 0,
          credit: check.amount,
          clientId: check.clientId,
          referenceId: check.id,
          created_at: new Date().toISOString()
        }
      ];
    }
  }
}
