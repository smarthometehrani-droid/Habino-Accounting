import { Client, Invoice, Transaction, AccountingEntry, Check, CompanySettings } from '../types';
import { formatCurrency, toPersianDigits } from './currencyUtils';
export { ReportGenerationService, TenantReportSecurityException } from './reportGenerationService';

/**
 * Helper to trigger browser download of CSV file with UTF-8 BOM
 * ensuring Excel in Windows/Mac displays Persian/Farsi texts correctly without mojibake.
 */
export function downloadCsvWithBom(filename: string, csvContent: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes CSV field value handling quotes, commas and newlines
 */
function escapeCsv(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and downloads Excel-compatible CSV for the Contacts Ledger Review table
 */
export function exportContactsLedgerToCsv(
  items: Array<{
    client: Client;
    totalDebit: number;
    totalCredit: number;
    currentBalance: number;
    diagnosis: string;
    creditLimit: number;
    totalRecords: number;
    lastActivityDate: string;
  }>,
  currency: any,
  companyName: string = 'مجموعه اقتصادی'
) {
  const metaLines = [
    `"دفتر معین اشخاص و کارنامه مالی طرف‌های حساب - ${companyName}"`,
    `"نام مجموعه صادرکننده:","${companyName}","تاریخ استخراج گزارش:","${new Date().toLocaleDateString('fa-IR')}","تعداد کل مخاطبان:","${items.length}"`,
    ''
  ];

  const headers = [
    'ردیف',
    'نام طرف‌حساب',
    'نوع شخص',
    'نام شرکت / مجموعه',
    'کد تفصیلی حسابداری',
    'شماره تماس',
    'کد ملی / شناسه اقتصادی',
    'گردش بدهکار (ریال/تومان)',
    'گردش بستانکار (ریال/تومان)',
    'مانده نهایی حساب',
    'تشخیص ماهیت',
    'سقف اعتبار',
    'تعداد اسناد و مدارک',
    'تاریخ آخرین گردش'
  ];

  const rows = items.map((item, index) => {
    const c = item.client;
    return [
      escapeCsv(index + 1),
      escapeCsv(c.name || ''),
      escapeCsv(c.type === 'corporate' ? 'حقوقی' : 'حقیقی'),
      escapeCsv(c.companyName || ''),
      escapeCsv(c.id.length > 8 ? `ACC-${c.id.substring(0, 6)}` : c.id),
      escapeCsv(c.phone || ''),
      escapeCsv(c.nationalCode || c.economicCode || ''),
      escapeCsv(Math.round(item.totalDebit)),
      escapeCsv(Math.round(item.totalCredit)),
      escapeCsv(Math.round(Math.abs(item.currentBalance))),
      escapeCsv(item.diagnosis),
      escapeCsv(item.creditLimit > 0 ? Math.round(item.creditLimit) : 'نامحدود'),
      escapeCsv(item.totalRecords),
      escapeCsv(item.lastActivityDate || '—')
    ].join(',');
  });

  const totalDebit = items.reduce((s, i) => s + i.totalDebit, 0);
  const totalCredit = items.reduce((s, i) => s + i.totalCredit, 0);
  const totalBalance = items.reduce((s, i) => s + i.currentBalance, 0);

  const footerRow = [
    escapeCsv('جمع کل'),
    escapeCsv(`تعداد: ${items.length} طرف‌حساب`),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(Math.round(totalDebit)),
    escapeCsv(Math.round(totalCredit)),
    escapeCsv(Math.round(Math.abs(totalBalance))),
    escapeCsv(totalBalance > 0 ? 'بدهکار کل' : totalBalance < 0 ? 'بستانکار کل' : 'تراز'),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv('')
  ].join(',');

  const csvContent = [...metaLines, headers.join(','), ...rows, footerRow].join('\r\n');
  const now = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
  const safeCompany = (companyName || 'Contacts').replace(/[/\\?%*:|"<> ]/g, '-');
  downloadCsvWithBom(`${safeCompany}-Contacts-Ledger-${now}.csv`, csvContent);
}

/**
 * Generates and downloads full Statement / Card of Account for a single client
 */
export function exportClientStatementToCsv(
  client: Client,
  rows: Array<{
    date: string;
    typeFa: string;
    referenceNumber: string;
    description: string;
    debit: number;
    credit: number;
    runningBalance: number;
    diagnosis: string;
  }>,
  companyName: string
) {
  const tenantCompany = companyName || 'مجموعه اقتصادی';
  const metaLines = [
    `"صورتحساب تفصیلی و گردش اسناد مالی - ${tenantCompany}"`,
    `"نام طرف‌حساب:","${client.name}","نوع:","${client.type === 'corporate' ? 'شخصیت حقوقی' : 'شخصیت حقیقی'}"`,
    `"شرکت صادرکننده:","${tenantCompany}","شماره تماس مخاطب:","${client.phone || '-'}"`,
    `"تاریخ استخراج:","${new Date().toLocaleDateString('fa-IR')}","کد تفصیلی:","ACC-${client.id.slice(0, 6)}"`
  ];

  const headers = [
    'ردیف',
    'تاریخ',
    'نوع سند',
    'شماره عطف / فاکتور / چک',
    'شرح آرتیکل مالی',
    'بدهکار (افزایش طلب)',
    'بستانکار (کاهش طلب / پرداخت)',
    'مانده پس از سند',
    'تشخیص'
  ];

  const dataRows = rows.map((r, idx) => [
    escapeCsv(idx + 1),
    escapeCsv(r.date),
    escapeCsv(r.typeFa),
    escapeCsv(r.referenceNumber),
    escapeCsv(r.description),
    escapeCsv(Math.round(r.debit)),
    escapeCsv(Math.round(r.credit)),
    escapeCsv(Math.round(r.runningBalance)),
    escapeCsv(r.diagnosis)
  ].join(','));

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const finalBal = totalDebit - totalCredit;

  const summaryRow = [
    escapeCsv('جمع کل گردش'),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(Math.round(totalDebit)),
    escapeCsv(Math.round(totalCredit)),
    escapeCsv(Math.round(Math.abs(finalBal))),
    escapeCsv(finalBal > 0 ? 'بدهکار' : finalBal < 0 ? 'بستانکار' : 'تسویه')
  ].join(',');

  const csvContent = [...metaLines, '', headers.join(','), ...dataRows, summaryRow].join('\r\n');
  const safeName = (client.name || 'client').replace(/[/\\?%*:|"<>]/g, '-');
  const safeCompany = tenantCompany.replace(/[/\\?%*:|"<> ]/g, '-');
  downloadCsvWithBom(`${safeCompany}-Statement-${safeName}.csv`, csvContent);
}

/**
 * Creates friendly SMS or WhatsApp text notification for client balance reminder
 */
export function buildClientBalanceReminderMessage(
  client: Client,
  balance: number,
  companyName: string,
  currency: any
): string {
  const absBal = Math.abs(balance);
  const formattedBal = formatCurrency(absBal, currency);
  const dateStr = new Date().toLocaleDateString('fa-IR');

  if (balance > 0) {
    // Client is Debtor (Must Pay)
    return `مخاطب گرامی جناب آقای/سرکار خانم ${client.name}،
با سلام و احترام؛
پیرو بررسی دفاتر مالی و حسابداری ${companyName} در تاریخ ${toPersianDigits(dateStr)}، مانده بدهی حساب تجاری شما مبلغ ${formattedBal} می‌باشد.
خواهشمند است جهت هماهنگی و تسویه حساب یا دریافت صورتحساب تفصیلی اقدام فرمایید.
با تشکر، امور مالی ${companyName}`;
  } else if (balance < 0) {
    // Client is Creditor
    return `همکار گرامی جناب آقای/سرکار خانم ${client.name}،
با سلام؛
طبق دفاتر حسابداری ${companyName} در تاریخ ${toPersianDigits(dateStr)}، بستانکاری شما نزد این مجموعه مبلغ ${formattedBal} ثبت گردیده است.
امور مالی ${companyName}`;
  } else {
    return `مخاطب گرامی ${client.name}،
با سلام؛
حساب تجاری شما در دفاتر مالی ${companyName} تا تاریخ ${toPersianDigits(dateStr)} کاملاً تسویه و دارای تراز صفر می‌باشد.
از همکاری صمیمانه شما سپاسگزاریم.
امور مالی ${companyName}`;
  }
}

/**
 * خروجی اکسل/CSV سند مالی و فاکتور به همراه تفکیک اقلام، مبالغ و آرتیکل‌های دفتر کل
 */
export function exportSingleInvoiceToCsv(
  invoice: Invoice,
  settings: CompanySettings,
  doubleEntries?: AccountingEntry[]
) {
  const currencyLabel = settings.currency === 'IRR' ? 'ریال' : 'تومان';
  const typeMap: Record<string, string> = {
    sale: 'فاکتور فروش کالا و خدمات',
    purchase: 'فاکتور خرید کالا و خدمات',
    service: 'فاکتور خدمات مهندسی',
    proforma_sale: 'پیش‌فاکتور فروش',
    proforma_purchase: 'پیش‌فاکتور خرید',
    proforma: 'پیش‌فاکتور',
    sale_return: 'برگشت از فروش',
    purchase_return: 'برگشت از خرید'
  };

  const tenantName = settings.name || 'مجموعه اقتصادی';
  const metaLines = [
    `"خروجی رسمی سند مالی و فاکتور - ${tenantName}"`,
    `"نام مجموعه صادرکننده:","${tenantName}","شناسه اقتصادی:","${settings.economicCode || '—'}"`,
    `"نوع سند:","${typeMap[invoice.type] || invoice.type}","شماره سند / فاکتور:","${invoice.invoiceNumber}"`,
    `"طرف‌حساب (مخاطب):","${invoice.clientName || 'نامشخص'}","شناسه مخاطب:","${invoice.clientId}"`,
    `"تاریخ صدور:","${invoice.date}","تاریخ سررسید:","${invoice.dueDate || 'نقدی'}"`,
    `"واحد پولی:","${currencyLabel}","وضعیت تسویه:","${invoice.status === 'paid' ? 'تسویه‌شده' : 'در انتظار پرداخت'}"`
  ];

  // جدول تفکیکی اقلام کالا و خدمات
  const itemHeaders = [
    'ردیف',
    'کد کالا/خدمت',
    'شرح کالا یا خدمات',
    'تعداد / مقدار',
    'واحد سنجش',
    'فی واحد (نرخ)',
    'تخفیف ردیف',
    'درصد مالیات',
    'مبلغ مالیات ردیف',
    'مبلغ کل ردیف'
  ];

  const itemRows = (invoice.items || []).map((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;
    const baseTotal = qty * price;
    const discountedTotal = Math.max(0, baseTotal - discount);
    const taxAmount = (discountedTotal * taxRate) / 100;
    const itemTotal = Number(item.total) || (discountedTotal + taxAmount);

    return [
      escapeCsv(idx + 1),
      escapeCsv(item.code || item.id || `ITEM-${idx + 1}`),
      escapeCsv(item.description || (item as any).name || 'خدمت / کالا'),
      escapeCsv(qty),
      escapeCsv((item as any).unit || 'عدد'),
      escapeCsv(Math.round(price)),
      escapeCsv(Math.round(discount)),
      escapeCsv(`${taxRate}%`),
      escapeCsv(Math.round(taxAmount)),
      escapeCsv(Math.round(itemTotal))
    ].join(',');
  });

  // جدول خلاصه مالی فاکتور
  const summaryLines = [
    '',
    `"--- خلاصه ارقام مالی فاکتور ---"`,
    `"جمع ناخالص کل:","${Math.round(invoice.subtotal || 0)}"`,
    `"مجموع تخفیفات:","${Math.round(invoice.totalDiscount || 0)}"`,
    `"مالیات بر ارزش افزوده:","${Math.round(invoice.totalTax || 0)}"`,
    `"مبلغ نهایی قابل پرداخت:","${Math.round(invoice.grandTotal || 0)}"`,
    `"مبلغ پرداختی (نقدی/پوز/بیعانه):","${Math.round(invoice.amountPaid || 0)}"`,
    `"مانده حساب تسویه‌نشده این سند:","${Math.round(invoice.remainingAmount || 0)}"`,
    `"تراز پیشین طرف‌حساب:","${Math.round(invoice.previousBalance || 0)}"`,
    `"تراز نهایی کل بدهی مخاطب:","${Math.round(invoice.totalDebt || 0)}"`
  ];

  // در صورت وجود آرتیکل‌های سند دوبل دفتر کل
  const entrySection: string[] = [];
  if (doubleEntries && doubleEntries.length > 0) {
    entrySection.push('', `"--- آرتیکل‌های ثبتی دفتر کل دوبل (${tenantName}) ---"`);
    entrySection.push(['ردیف', 'کد حساب معین', 'عنوان حساب معین', 'شرح آرتیکل سند', 'بدهکار', 'بستانکار'].join(','));
    doubleEntries.forEach((entry, idx) => {
      entrySection.push([
        escapeCsv(idx + 1),
        escapeCsv(entry.accountCode || '—'),
        escapeCsv(entry.accountTitle || '—'),
        escapeCsv(entry.description || '—'),
        escapeCsv(Math.round(entry.debit || 0)),
        escapeCsv(Math.round(entry.credit || 0))
      ].join(','));
    });
  }

  const csvContent = [
    ...metaLines,
    '',
    itemHeaders.join(','),
    ...itemRows,
    ...summaryLines,
    ...entrySection
  ].join('\r\n');

  const safeClient = (invoice.clientName || 'client').replace(/[/\\?%*:|"<>]/g, '-');
  const safeCompany = tenantName.replace(/[/\\?%*:|"<> ]/g, '-');
  downloadCsvWithBom(`${safeCompany}-Invoice-${invoice.invoiceNumber}-${safeClient}.csv`, csvContent);
}

/**
 * خروجی اکسل/CSV جدول اسناد و فاکتورها جهت گزارش‌های مدیریتی و ممیزی
 */
export function exportInvoicesListToCsv(
  invoices: Invoice[],
  settings: CompanySettings
) {
  const currencyLabel = settings.currency === 'IRR' ? 'ریال' : 'تومان';
  const typeMap: Record<string, string> = {
    sale: 'فروش',
    purchase: 'خرید',
    service: 'خدمات',
    proforma_sale: 'پیش‌فاکتور فروش',
    proforma_purchase: 'پیش‌فاکتور خرید',
    proforma: 'پیش‌فاکتور',
    sale_return: 'برگشت از فروش',
    purchase_return: 'برگشت از خرید'
  };

  const statusMap: Record<string, string> = {
    paid: 'تسویه‌شده',
    pending: 'در انتظار پرداخت',
    overdue: 'سررسید گذشته',
    cancelled: 'لغوشده',
    draft: 'پیش‌نویس'
  };

  const tenantName = settings.name || 'مجموعه اقتصادی';
  const metaLines = [
    `"گزارش جامع اسناد مالی و فاکتورها - ${tenantName}"`,
    `"مجموعه:","${tenantName}","تاریخ تهیه:","${new Date().toLocaleDateString('fa-IR')}","تعداد کل اسناد:","${invoices.length}"`,
    `"واحد پولی:","${currencyLabel}"`
  ];

  const headers = [
    'ردیف',
    'شماره سند',
    'نوع سند',
    'تاریخ صدور',
    'تاریخ سررسید',
    'نام طرف‌حساب',
    'جمع ناخالص',
    'تخفیف',
    'مالیات',
    'مبلغ کل نهایی',
    'پرداختی نقدی',
    'مانده تسویه‌نشده',
    'وضعیت سند',
    'تعداد اقلام'
  ];

  const rows = invoices.map((inv, idx) => [
    escapeCsv(idx + 1),
    escapeCsv(inv.invoiceNumber),
    escapeCsv(typeMap[inv.type] || inv.type),
    escapeCsv(inv.date),
    escapeCsv(inv.dueDate || 'نقدی'),
    escapeCsv(inv.clientName || 'نامشخص'),
    escapeCsv(Math.round(inv.subtotal || 0)),
    escapeCsv(Math.round(inv.totalDiscount || 0)),
    escapeCsv(Math.round(inv.totalTax || 0)),
    escapeCsv(Math.round(inv.grandTotal || 0)),
    escapeCsv(Math.round(inv.amountPaid || 0)),
    escapeCsv(Math.round(inv.remainingAmount || 0)),
    escapeCsv(statusMap[inv.status] || inv.status),
    escapeCsv(inv.items?.length || 0)
  ].join(','));

  const sumGrandTotal = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
  const sumPaid = invoices.reduce((s, i) => s + (i.amountPaid || 0), 0);
  const sumRemaining = invoices.reduce((s, i) => s + (i.remainingAmount || 0), 0);

  const footerRow = [
    escapeCsv('جمع کل ارقام'),
    escapeCsv(`تعداد: ${invoices.length} سند`),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(Math.round(sumGrandTotal)),
    escapeCsv(Math.round(sumPaid)),
    escapeCsv(Math.round(sumRemaining)),
    escapeCsv(''),
    escapeCsv('')
  ].join(',');

  const csvContent = [...metaLines, '', headers.join(','), ...rows, footerRow].join('\r\n');
  const now = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
  const safeCompany = tenantName.replace(/[/\\?%*:|"<> ]/g, '-');
  downloadCsvWithBom(`${safeCompany}-Invoices-Report-${now}.csv`, csvContent);
}
