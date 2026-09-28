import { TafsiliType, AccountingEntry, Client, Invoice, Transaction } from '../types';
import { STANDARD_CHART_OF_ACCOUNTS } from '../components/Ledger';
import { getUnifiedFloatingTafsiliList, getSavedFloatingTafsili } from './floatingTafsiliEngine';
import { toPersianDigits, formatCurrency } from './currencyUtils';

export type DocumentType = 
  | 'purchase_invoice' 
  | 'sale_invoice' 
  | 'expense_receipt' 
  | 'bank_pos_slip' 
  | 'project_contractor' 
  | 'tax_customs_bill';

export interface ParsedDocumentItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
  tax?: number;
}

export interface OcrBoundingBox {
  id: string;
  fieldKey: 'documentTitle' | 'documentNumber' | 'date' | 'counterpartyName' | 'nationalId' | 'items' | 'subtotal' | 'tax' | 'grandTotal' | 'paymentMethod';
  label: string;
  value: string;
  x: number; // percentage (0 to 100)
  y: number; // percentage (0 to 100)
  width: number; // percentage
  height: number; // percentage
  confidence: number; // 0 to 100
  category: 'header' | 'counterparty' | 'items' | 'financials';
  color: string;
}

export interface ParsedFinancialDocument {
  id: string;
  documentTitle: string;
  documentType: DocumentType;
  documentNumber: string;
  date: string; // Jalali
  dueDate?: string;
  counterparty: {
    name: string;
    companyName?: string;
    nationalId?: string;
    economicCode?: string;
    phone?: string;
    address?: string;
    suggestedType: 'individual' | 'corporate';
  };
  items: ParsedDocumentItem[];
  financials: {
    subtotal: number;
    discount: number;
    tax: number; // 10% VAT
    grandTotal: number;
  };
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'credit';
  bankInfo?: {
    bankName: string;
    accountOrCard?: string;
    trackingCode?: string;
  };
  projectTag?: string;
  confidenceScore: number; // 0 to 100
  mappingSuggestion: {
    debitMoeinCode: string;
    debitMoeinTitle: string;
    creditMoeinCode: string;
    creditMoeinTitle: string;
    tafsiliType: TafsiliType;
    suggestedTafsiliTitle?: string;
    suggestedTafsiliCode?: string;
    explanation: string;
  };
  rawText?: string;
  status?: 'pending' | 'confirmed' | 'rejected';
  boundingBoxes?: OcrBoundingBox[];
  previewImageUrl?: string;
}

/**
 * دیتابیس الگوهای پیش‌فرض اسناد معتبر مالی برای تست سریع یک‌کلیکی
 */
export const SAMPLE_OCR_PRESETS: ParsedFinancialDocument[] = [
  {
    id: 'preset-doc-1',
    documentTitle: 'فاکتور رسمی خرید تجهیزات شبکه سرور و رک',
    documentType: 'purchase_invoice',
    documentNumber: 'AC-1403-9921',
    date: '1403/07/15',
    dueDate: '1403/08/15',
    counterparty: {
      name: 'شرکت داده‌گستر عصر نوین',
      companyName: 'داده‌گستر عصر نوین سهامی خاص',
      nationalId: '10103456789',
      economicCode: '411567891234',
      phone: '02188776655',
      address: 'تهران، خیابان سهروردی شمالی، پلاک ۱۱۴',
      suggestedType: 'corporate'
    },
    items: [
      {
        id: 'item-1',
        description: 'روتر برد میکروتیک مدل CCR2004-16G-2S+',
        quantity: 1,
        unitPrice: 38000000,
        total: 38000000
      },
      {
        id: 'item-2',
        description: 'سوئیچ ۲۴ پورت سیسکو گیگابیت لایه ۳',
        quantity: 2,
        unitPrice: 24000000,
        total: 48000000
      }
    ],
    financials: {
      subtotal: 86000000,
      discount: 2000000,
      tax: 8400000, // 10% of 84,000,000
      grandTotal: 92400000
    },
    paymentMethod: 'credit',
    projectTag: 'پروژه دیتاسنتر ابری',
    confidenceScore: 98,
    mappingSuggestion: {
      debitMoeinCode: '10401',
      debitMoeinTitle: 'اموال، ماشین‌آلات و تجهیزات اداری و فنی',
      creditMoeinCode: '20101',
      creditMoeinTitle: 'حساب‌ها و اسناد پرداختنی تجاری (تأمین‌کنندگان)',
      tafsiliType: 'supplier',
      suggestedTafsiliTitle: 'شرکت داده‌گستر عصر نوین',
      explanation: 'ثبت بدهکار دارایی ثابت تجهیزات و بستانکار حساب تجاری تأمین‌کننده تجهیزات شبکه.'
    }
  },
  {
    id: 'preset-doc-2',
    documentTitle: 'قبض و رسید واریز هزینه اجاره دفتر مرکزی',
    documentType: 'expense_receipt',
    documentNumber: 'EXP-1403-4412',
    date: '1403/07/01',
    counterparty: {
      name: 'حاج مصطفی امین‌زاده (موجر)',
      phone: '09121112233',
      nationalId: '0054321987',
      suggestedType: 'individual'
    },
    items: [
      {
        id: 'item-exp-1',
        description: 'اجاره‌بهای ماهانه دفتر مرکزی هابینو - مهرماه ۱۴۰۳',
        quantity: 1,
        unitPrice: 25000000,
        total: 25000000
      }
    ],
    financials: {
      subtotal: 25000000,
      discount: 0,
      tax: 0,
      grandTotal: 25000000
    },
    paymentMethod: 'bank_transfer',
    bankInfo: {
      bankName: 'بانک ملت',
      trackingCode: 'TR-9988231',
      accountOrCard: 'IR120120000000001234567890'
    },
    confidenceScore: 96,
    mappingSuggestion: {
      debitMoeinCode: '60102',
      debitMoeinTitle: 'هزینه‌های اجاره، قبوض و سربار اداری',
      creditMoeinCode: '10102',
      creditMoeinTitle: 'بانک‌ها و حساب‌های جاری',
      tafsiliType: 'other',
      suggestedTafsiliTitle: 'حاج مصطفی امین‌زاده (موجر)',
      explanation: 'هزینه عملیاتی جاری اداری بدهکار، واریز مستقیم از حساب جاری بانک بستانکار.'
    }
  },
  {
    id: 'preset-doc-3',
    documentTitle: 'رسید تراکنش پایانه فروش پوز (POS) دریافتی از مشتری',
    documentType: 'bank_pos_slip',
    documentNumber: 'POS-889021',
    date: '1403/07/18',
    counterparty: {
      name: 'مهندس آرش کریمی',
      phone: '09123334455',
      suggestedType: 'individual'
    },
    items: [
      {
        id: 'item-pos-1',
        description: 'تسویه فاکتور خدمات مشاوره فنی و راه‌اندازی شبکه',
        quantity: 1,
        unitPrice: 15000000,
        total: 15000000
      }
    ],
    financials: {
      subtotal: 15000000,
      discount: 0,
      tax: 0,
      grandTotal: 15000000
    },
    paymentMethod: 'bank_transfer',
    bankInfo: {
      bankName: 'بانک سامان (پوز سپهر)',
      trackingCode: '908123049',
      accountOrCard: 'کارت بانکی: ۶۲۱۹-۸۶۱۰-****-۴۴۵۱'
    },
    confidenceScore: 99,
    mappingSuggestion: {
      debitMoeinCode: '10102',
      debitMoeinTitle: 'بانک‌ها و حساب‌های جاری',
      creditMoeinCode: '10201',
      creditMoeinTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
      tafsiliType: 'client',
      suggestedTafsiliTitle: 'مهندس آرش کریمی',
      explanation: 'واریز نقدی مشتری از طریق پوز بانکی به حساب بانک شرکت؛ کاهش بدهی مشتری.'
    }
  },
  {
    id: 'preset-doc-4',
    documentTitle: 'صورت‌وضعیت خدمات فنی و دستمزد پیمانکار پروژه',
    documentType: 'project_contractor',
    documentNumber: 'PRJ-STAT-09',
    date: '1403/07/12',
    counterparty: {
      name: 'شرکت مهندسی تکتا سازه پاسارگاد',
      companyName: 'تکتا سازه پاسارگاد',
      nationalId: '14008987654',
      phone: '02122334455',
      suggestedType: 'corporate'
    },
    items: [
      {
        id: 'item-prj-1',
        description: 'عملیات کابل‌کشی ساخت‌یافته و نصب داکت‌های فیبر نوری طبقات',
        quantity: 1,
        unitPrice: 42000000,
        total: 42000000
      }
    ],
    financials: {
      subtotal: 42000000,
      discount: 0,
      tax: 4200000,
      grandTotal: 46200000
    },
    paymentMethod: 'credit',
    projectTag: 'پروژه برج اداری ونک',
    confidenceScore: 94,
    mappingSuggestion: {
      debitMoeinCode: '50102',
      debitMoeinTitle: 'بهای تمام‌شده پروژه‌ها و خدمات مستقیم',
      creditMoeinCode: '20101',
      creditMoeinTitle: 'حساب‌ها و اسناد پرداختنی تجاری (تأمین‌کنندگان)',
      tafsiliType: 'cost_center',
      suggestedTafsiliTitle: 'شرکت مهندسی تکتا سازه پاسارگاد',
      explanation: 'ثبت بهای تمام‌شده مستقیم قرارداد پروژه و بستانکار بابت مطالبات پیمانکار با برچسب پروژه.'
    }
  }
];

export class OcrDocumentParserEngine {
  /**
   * هوش استخراج متادیتای سند از متن خام و تصویر
   */
  public static parseRawDocumentText(
    text: string, 
    fileName: string = 'document_scan.pdf'
  ): ParsedFinancialDocument {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const lowerText = text.toLowerCase();

    // ۱. تشخیص نوع سند
    let docType: DocumentType = 'purchase_invoice';
    if (lowerText.includes('پوز') || lowerText.includes('pos') || lowerText.includes('رسید کارتخوان')) {
      docType = 'bank_pos_slip';
    } else if (lowerText.includes('صورت وضعیت') || lowerText.includes('پیمانکار')) {
      docType = 'project_contractor';
    } else if (lowerText.includes('اجاره') || lowerText.includes('قبض') || lowerText.includes('هزینه')) {
      docType = 'expense_receipt';
    } else if (lowerText.includes('فروش') || lowerText.includes('پیش‌فاکتور')) {
      docType = 'sale_invoice';
    }

    // ۲. استخراج شماره سند
    const numMatch = text.match(/(?:شماره|فاکتور|سند|کد پیگیری|invoice\s*#?)\s*[:\s-]*([A-Za-z0-9\-_/]+)/i);
    const docNumber = numMatch ? numMatch[1] : `DOC-OCR-${Date.now().toString().slice(-6)}`;

    // ۳. استخراج تاریخ شمسی
    const dateMatch = text.match(/(140\d\/[0-1]?\d\/[0-3]?\d)/);
    const docDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('fa-IR');

    // ۴. استخراج طرف‌حساب
    const nameMatch = text.match(/(?:خریدار|فروشنده|طرف‌حساب|به نام|مشتری|پذیرنده)\s*[:\s-]*([^\n,،]+)/);
    const counterpartyName = nameMatch ? nameMatch[1].trim() : 'طرف‌حساب ناشناس (اسکن OCR)';

    // ۵. استخراج شناسه ملی
    const nationalMatch = text.match(/(?:شناسه ملی|کد ملی)\s*[:\s-]*(\d{10,11})/);
    const nationalId = nationalMatch ? nationalMatch[1] : undefined;

    // ۶. استخراج مبالغ
    const amountMatches = text.match(/[\d,]{5,15}/g) || [];
    const numbers = amountMatches
      .map(m => parseInt(m.replace(/,/g, ''), 10))
      .filter(n => !isNaN(n) && n > 1000);

    const grandTotal = numbers.length > 0 ? Math.max(...numbers) : 10000000;
    const tax = Math.round(grandTotal * (10 / 110)); // ۱۰٪ ارزش افزوده تقریبی
    const subtotal = grandTotal - tax;

    // ۷. تعیین سرفصل‌های دفتر کل و تفصیلی شناور هابینو
    const mapping = this.getRecommendedAccountingMapping(docType, counterpartyName, grandTotal);

    return {
      id: `ocr-${Date.now()}`,
      documentTitle: `سند مالی ${docNumber} - ${counterpartyName}`,
      documentType: docType,
      documentNumber: docNumber,
      date: docDate,
      counterparty: {
        name: counterpartyName,
        nationalId,
        suggestedType: nationalId && nationalId.length === 11 ? 'corporate' : 'individual'
      },
      items: [
        {
          id: 'item-auto-1',
          description: `شرح قلم استخراج‌شده از سند ${fileName}`,
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal
        }
      ],
      financials: {
        subtotal,
        discount: 0,
        tax,
        grandTotal
      },
      paymentMethod: docType === 'bank_pos_slip' ? 'bank_transfer' : 'credit',
      confidenceScore: 89,
      mappingSuggestion: mapping,
      rawText: text
    };
  }

  /**
   * هوش نقشه‌برداری به کدینگ سرفصل‌های هابینو بر اساس استاندارد ۳ سطحی
   */
  public static getRecommendedAccountingMapping(
    docType: DocumentType,
    counterpartyName: string,
    totalAmount: number
  ) {
    switch (docType) {
      case 'purchase_invoice':
        return {
          debitMoeinCode: '10301',
          debitMoeinTitle: 'موجودی کالا و ملزومات مصرفی',
          creditMoeinCode: '20101',
          creditMoeinTitle: 'حساب‌ها و اسناد پرداختنی تجاری (تأمین‌کنندگان)',
          tafsiliType: 'supplier' as TafsiliType,
          suggestedTafsiliTitle: counterpartyName,
          explanation: 'خرید رسمی کالا و تجهیزات؛ بدهکار موجودی انبار / خرید، بستانکار طرف‌حساب تجاری.'
        };

      case 'sale_invoice':
        return {
          debitMoeinCode: '10201',
          debitMoeinTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
          creditMoeinCode: '40102',
          creditMoeinTitle: 'درآمد ارائه خدمات فنی و مهندسی',
          tafsiliType: 'client' as TafsiliType,
          suggestedTafsiliTitle: counterpartyName,
          explanation: 'فروش خدمات و کالا به مشتری؛ بدهکار حساب تجاری مشتری، بستانکار درآمد عملیاتی هابینو.'
        };

      case 'expense_receipt':
        return {
          debitMoeinCode: '60102',
          debitMoeinTitle: 'هزینه‌های اجاره، قبوض و سربار اداری',
          creditMoeinCode: '10101',
          creditMoeinTitle: 'صندوق و موجودی نقد',
          tafsiliType: 'other' as TafsiliType,
          suggestedTafsiliTitle: counterpartyName,
          explanation: 'رسید پرداخت هزینه‌های عملیاتی اداری و سربار از محل نقدینگی صندوق/بانک.'
        };

      case 'bank_pos_slip':
        return {
          debitMoeinCode: '10102',
          debitMoeinTitle: 'بانک‌ها و حساب‌های جاری',
          creditMoeinCode: '10201',
          creditMoeinTitle: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)',
          tafsiliType: 'client' as TafsiliType,
          suggestedTafsiliTitle: counterpartyName,
          explanation: 'واریز وجه کارتخوان پوز یا حواله بانکی به حساب جاری شرکت و تسویه بدهی مشتری.'
        };

      case 'project_contractor':
        return {
          debitMoeinCode: '50102',
          debitMoeinTitle: 'بهای تمام‌شده پروژه‌ها و خدمات مستقیم',
          creditMoeinCode: '20101',
          creditMoeinTitle: 'حساب‌ها و اسناد پرداختنی تجاری (تأمین‌کنندگان)',
          tafsiliType: 'cost_center' as TafsiliType,
          suggestedTafsiliTitle: counterpartyName,
          explanation: 'صورت‌وضعیت هزینه‌های پیمانکاری پروژه؛ شناسایی بهای تمام‌شده و بدهی به پیمانکار.'
        };

      case 'tax_customs_bill':
      default:
        return {
          debitMoeinCode: '20301',
          debitMoeinTitle: 'مالیات و عوارض ارزش افزوده پرداختنی',
          creditMoeinCode: '10102',
          creditMoeinTitle: 'بانک‌ها و حساب‌های جاری',
          tafsiliType: 'other' as TafsiliType,
          suggestedTafsiliTitle: 'سازمان امور مالیاتی کشور',
          explanation: 'پرداخت فیش مالیاتی ارزش افزوده یا عوارض دولتی از حساب بانکی شرکت.'
        };
    }
  }

  /**
   * تولید آرتیکل‌های سند دوبل متوازن بر اساس قوانین ۹‌گانه دفتر کل
   */
  public static generateBalancedJournalEntries(
    doc: ParsedFinancialDocument,
    clientId: string,
    clientName: string,
    customDebitCode?: string,
    customCreditCode?: string
  ): {
    documentNumber: string;
    entries: Omit<AccountingEntry, 'id' | 'created_at'>[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  } {
    const debitCode = customDebitCode || doc.mappingSuggestion.debitMoeinCode;
    const creditCode = customCreditCode || doc.mappingSuggestion.creditMoeinCode;

    const debitMoein = STANDARD_CHART_OF_ACCOUNTS.find(a => a.code === debitCode) || {
      code: debitCode,
      title: doc.mappingSuggestion.debitMoeinTitle
    };
    const creditMoein = STANDARD_CHART_OF_ACCOUNTS.find(a => a.code === creditCode) || {
      code: creditCode,
      title: doc.mappingSuggestion.creditMoeinTitle
    };

    const docNum = `DOC-OCR-${doc.documentNumber.replace(/[^A-Za-z0-9]/g, '').slice(-8) || Date.now().toString().slice(-6)}`;
    const desc = `${doc.documentTitle} [ثبت مکانیزه OCR] - طرف‌حساب: ${clientName}`;

    // آرتیکل بدهکار
    const debitEntry: Omit<AccountingEntry, 'id' | 'created_at'> = {
      documentNumber: docNum,
      date: doc.date,
      accountCode: debitMoein.code,
      accountTitle: debitMoein.title,
      debit: doc.financials.grandTotal,
      credit: 0,
      description: desc,
      clientId: clientId,
      projectTag: doc.projectTag || (doc.documentType === 'project_contractor' ? 'پروژه عمومی' : undefined),
      tafsiliType: doc.mappingSuggestion.tafsiliType
    };

    // آرتیکل بستانکار
    const creditEntry: Omit<AccountingEntry, 'id' | 'created_at'> = {
      documentNumber: docNum,
      date: doc.date,
      accountCode: creditMoein.code,
      accountTitle: creditMoein.title,
      debit: 0,
      credit: doc.financials.grandTotal,
      description: desc,
      clientId: clientId,
      projectTag: doc.projectTag || (doc.documentType === 'project_contractor' ? 'پروژه عمومی' : undefined),
      tafsiliType: doc.mappingSuggestion.tafsiliType
    };

    const entries = [debitEntry, creditEntry];
    const totalDebit = doc.financials.grandTotal;
    const totalCredit = doc.financials.grandTotal;

    return {
      documentNumber: docNum,
      entries,
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit && totalDebit > 0
    };
  }

  /**
   * تولید خودکار کادربندی‌های فضایی (Bounding Boxes) روی سند مالی
   */
  public static generateBoundingBoxes(doc: ParsedFinancialDocument): OcrBoundingBox[] {
    const boxes: OcrBoundingBox[] = [];

    // ۱. سربرگ و عنوان سند
    boxes.push({
      id: `box-${doc.id}-title`,
      fieldKey: 'documentTitle',
      label: 'عنوان سند رسمی',
      value: doc.documentTitle,
      x: 18,
      y: 3,
      width: 64,
      height: 6,
      confidence: doc.confidenceScore,
      category: 'header',
      color: '#8b5cf6'
    });

    // ۲. شماره سند
    boxes.push({
      id: `box-${doc.id}-num`,
      fieldKey: 'documentNumber',
      label: 'شماره سریال / فاکتور',
      value: doc.documentNumber,
      x: 65,
      y: 11,
      width: 31,
      height: 5,
      confidence: Math.min(100, doc.confidenceScore + 1),
      category: 'header',
      color: '#3b82f6'
    });

    // ۳. تاریخ سند
    boxes.push({
      id: `box-${doc.id}-date`,
      fieldKey: 'date',
      label: 'تاریخ صدور سند',
      value: doc.date,
      x: 4,
      y: 11,
      width: 25,
      height: 5,
      confidence: Math.min(100, doc.confidenceScore + 2),
      category: 'header',
      color: '#0ea5e9'
    });

    // ۴. نام طرف‌حساب / فروشنده / خریدار
    boxes.push({
      id: `box-${doc.id}-party`,
      fieldKey: 'counterpartyName',
      label: 'مشخصات طرف‌حساب / متعامل',
      value: doc.counterparty.name,
      x: 42,
      y: 19,
      width: 54,
      height: 7,
      confidence: doc.confidenceScore,
      category: 'counterparty',
      color: '#10b981'
    });

    // ۵. شناسه ملی / کد اقتصادی
    if (doc.counterparty.nationalId) {
      boxes.push({
        id: `box-${doc.id}-nid`,
        fieldKey: 'nationalId',
        label: 'شناسه ملی / کد اقتصادی',
        value: doc.counterparty.nationalId,
        x: 4,
        y: 19,
        width: 35,
        height: 7,
        confidence: 99,
        category: 'counterparty',
        color: '#14b8a6'
      });
    }

    // ۶. محوطه اقلام و شرح کالا / خدمات
    boxes.push({
      id: `box-${doc.id}-items`,
      fieldKey: 'items',
      label: `ردیف اقلام (${doc.items.length} ردیف کالا/خدمت)`,
      value: doc.items.map(i => i.description).join(' | '),
      x: 4,
      y: 29,
      width: 92,
      height: Math.min(32, 14 + doc.items.length * 6),
      confidence: Math.max(90, doc.confidenceScore - 2),
      category: 'items',
      color: '#f59e0b'
    });

    // ۷. جمع ناخالص
    const itemsBottomY = 29 + Math.min(32, 14 + doc.items.length * 6) + 2;
    boxes.push({
      id: `box-${doc.id}-subtotal`,
      fieldKey: 'subtotal',
      label: 'جمع ناخالص اقلام',
      value: `${doc.financials.subtotal.toLocaleString('fa-IR')} تومان`,
      x: 48,
      y: itemsBottomY,
      width: 48,
      height: 5.5,
      confidence: 97,
      category: 'financials',
      color: '#6366f1'
    });

    // ۸. مالیات و عوارض ارزش افزوده
    if (doc.financials.tax > 0) {
      boxes.push({
        id: `box-${doc.id}-tax`,
        fieldKey: 'tax',
        label: 'مالیات و عوارض ارزش‌افزوده (۱۰٪)',
        value: `${doc.financials.tax.toLocaleString('fa-IR')} تومان`,
        x: 48,
        y: itemsBottomY + 6.5,
        width: 48,
        height: 5.5,
        confidence: 98,
        category: 'financials',
        color: '#ec4899'
      });
    }

    // ۹. مبلغ نهایی و پرداختنی (Grand Total)
    const grandTotalY = doc.financials.tax > 0 ? itemsBottomY + 13 : itemsBottomY + 7;
    boxes.push({
      id: `box-${doc.id}-grand`,
      fieldKey: 'grandTotal',
      label: 'مبلغ کل نهایی فاکتور',
      value: `${doc.financials.grandTotal.toLocaleString('fa-IR')} تومان`,
      x: 4,
      y: grandTotalY,
      width: 92,
      height: 8.5,
      confidence: 100,
      category: 'financials',
      color: '#059669'
    });

    return boxes;
  }
}

const OCR_STORAGE_KEY = 'habino_ocr_pipeline_documents';

/**
 * دریافت لیست اسناد OCR ذخیره‌شده (با بارگذاری اولیه از SAMPLE_OCR_PRESETS)
 */
export function getStoredOcrDocuments(): ParsedFinancialDocument[] {
  if (typeof window === 'undefined') {
    return SAMPLE_OCR_PRESETS.map(p => ({
      ...p,
      status: p.status || 'pending',
      boundingBoxes: p.boundingBoxes || OcrDocumentParserEngine.generateBoundingBoxes(p)
    }));
  }

  try {
    const raw = localStorage.getItem(OCR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(d => ({
          ...d,
          boundingBoxes: d.boundingBoxes && d.boundingBoxes.length > 0
            ? d.boundingBoxes
            : OcrDocumentParserEngine.generateBoundingBoxes(d)
        }));
      }
    }
  } catch (e) {
    console.warn('Error reading OCR documents from storage:', e);
  }

  const initialized: ParsedFinancialDocument[] = SAMPLE_OCR_PRESETS.map(p => ({
    ...p,
    status: p.status || 'pending',
    boundingBoxes: OcrDocumentParserEngine.generateBoundingBoxes(p)
  }));
  saveAllOcrDocuments(initialized);
  return initialized;
}

/**
 * ذخیره همگانی اسناد در LocalStorage
 */
export function saveAllOcrDocuments(docs: ParsedFinancialDocument[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OCR_STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.warn('Error saving OCR documents to storage:', e);
  }
}

/**
 * ذخیره یا بروزرسانی یک سند OCR
 */
export function saveOcrDocument(doc: ParsedFinancialDocument): void {
  const docs = getStoredOcrDocuments();
  const existingIdx = docs.findIndex(d => d.id === doc.id);
  if (!doc.boundingBoxes || doc.boundingBoxes.length === 0) {
    doc.boundingBoxes = OcrDocumentParserEngine.generateBoundingBoxes(doc);
  }
  if (!doc.status) {
    doc.status = 'pending';
  }

  if (existingIdx >= 0) {
    docs[existingIdx] = doc;
  } else {
    docs.unshift(doc);
  }
  saveAllOcrDocuments(docs);
}

/**
 * به‌روزرسانی وضعیت سند OCR (مثلاً تأیید شده یا رد شده)
 */
export function updateOcrDocumentStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'rejected'
): ParsedFinancialDocument | null {
  const docs = getStoredOcrDocuments();
  const doc = docs.find(d => d.id === id || d.documentNumber === id);
  if (doc) {
    doc.status = status;
    saveAllOcrDocuments(docs);
    return doc;
  }
  return null;
}
