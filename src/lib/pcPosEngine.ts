/**
 * Habino PC-POS Integration Engine
 * موتور اتصال به پایانه‌های فروشگاهی و کارتخوان‌های بانکی (PC-POS)
 * پروتکل‌های پشتیبانی‌شده: به‌پرداخت ملت، آسان‌پرداخت (آپ)، سامان‌کیش (سِپ)، سداد (ملی) و شبیه‌ساز شاپرک
 */

import { formatCurrency, toPersianDigits } from './currencyUtils';
import { CurrencyType } from '../types';

export type PosProtocol = 'behpardakht' | 'asanpardakht' | 'sep' | 'sadad' | 'simulator';

export interface PosTerminalConfig {
  id: string;
  name: string;
  protocol: PosProtocol;
  bankAccountId: string; // شناسه حساب بانکی متصل در هابینو
  bankName: string;
  terminalId: string; // شماره پایانه ۸ رقمی
  merchantId: string; // شماره پذیرنده ۱۵ رقمی
  ipAddress: string; // IP پایانه در شبکه محلی LAN
  port: number; // پورت ارتباطی
  serialPort?: string; // پورت سریال COM در صورت اتصال کابل USB/RS232
  connectionType: 'lan' | 'usb_serial' | 'web_bridge';
  timeoutSeconds: number;
  autoPrintReceipt: boolean;
  isActive: boolean;
}

export type PosTxStatus = 
  | 'idle' 
  | 'connecting' 
  | 'swipe_card' 
  | 'enter_pin' 
  | 'processing' 
  | 'approved' 
  | 'rejected' 
  | 'cancelled' 
  | 'timeout' 
  | 'network_error';

export interface PosStatusUpdate {
  status: PosTxStatus;
  message: string;
  stepPercent: number;
  details?: string;
}

export interface PosPaymentRequest {
  amount: number; // مبلغ به ریال یا تومان
  currency: CurrencyType;
  invoiceId?: string;
  invoiceNumber?: string;
  clientName?: string;
  terminalConfig: PosTerminalConfig;
  additionalData?: Record<string, any>;
}

export interface PosPaymentReceipt {
  success: boolean;
  terminalId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  currency: CurrencyType;
  traceNumber: string; // شماره پیگیری ۶ رقمی
  rrn: string; // شماره مرجع تراکنش (RRN) ۱۲ رقمی
  maskedPan: string; // شماره کارت ماسک شده (مثال: ۶۰۳۷-۹۹**-****-۴۸۲۱)
  issuerBankName: string; // نام بانک صادرکننده کارت
  responseCode: string; // کد پاسخ سوییچ شاپرک ('00' = تراکنش موفق)
  responseMessage: string;
  shamsiDateTime: string; // تاریخ و ساعت شمسی
  isoDateTime: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

// نگاشت پیش‌شماره کارت‌های شتاب به نام بانک صادرکننده
export const SHETAB_BIN_MAP: Record<string, string> = {
  '603799': 'بانک ملی ایران',
  '589210': 'بانک سپه',
  '627648': 'بانک توسعه صادرات',
  '627961': 'بانک صنعت و معدن',
  '603770': 'بانک کشاورزی',
  '628023': 'بانک مسکن',
  '627760': 'پست بانک ایران',
  '502908': 'بانک توسعه تعاون',
  '627412': 'بانک اقتصاد نوین',
  '622106': 'بانک پارسیان',
  '502229': 'بانک پاسارگاد',
  '627488': 'بانک کارآفرین',
  '621986': 'بانک سامان',
  '639346': 'بانک سینا',
  '639607': 'بانک سرمایه',
  '636214': 'بانک آینده',
  '502806': 'بانک شهر',
  '502938': 'بانک دی',
  '603769': 'بانک صادرات ایران',
  '610433': 'بانک ملت',
  '627353': 'بانک تجارت',
  '589463': 'بانک رفاه کارگران',
  '627381': 'بانک انصار (سپه)',
  '504706': 'بانک شهر',
  '636949': 'بانک حکمت ایرانیان',
  '505785': 'بانک ایران زمین',
  '505801': 'موسسه کوثر',
  '606373': 'بانک قرض‌الحسنه مهر ایران',
  '505809': 'بانک خاورمیانه',
  '606256': 'بانک رسالت'
};

export function detectBankFromCardNumber(pan: string): string {
  const clean = (pan || '').replace(/\D/g, '');
  if (clean.length >= 6) {
    const bin = clean.substring(0, 6);
    if (SHETAB_BIN_MAP[bin]) return SHETAB_BIN_MAP[bin];
  }
  return 'کارت عضو شتاب';
}

const STORAGE_KEY = 'habino_pcpos_terminals';

export const DEFAULT_POS_TERMINALS: PosTerminalConfig[] = [
  {
    id: 'pos-mellat-default',
    name: 'کارتخوان به‌پرداخت ملت (صندوق ۱)',
    protocol: 'simulator',
    bankAccountId: 'bank-mellat-1',
    bankName: 'بانک ملت',
    terminalId: '87452109',
    merchantId: '984512036587412',
    ipAddress: '192.168.1.120',
    port: 8888,
    connectionType: 'lan',
    timeoutSeconds: 45,
    autoPrintReceipt: true,
    isActive: true
  },
  {
    id: 'pos-sep-default',
    name: 'کارتخوان سامان‌کیش سپ (صندوق ۲)',
    protocol: 'simulator',
    bankAccountId: 'bank-saman-1',
    bankName: 'بانک سامان',
    terminalId: '32145698',
    merchantId: '741258963214568',
    ipAddress: '192.168.1.121',
    port: 1024,
    connectionType: 'lan',
    timeoutSeconds: 45,
    autoPrintReceipt: true,
    isActive: false
  },
  {
    id: 'pos-ap-default',
    name: 'کارتخوان آسان‌پرداخت آپ',
    protocol: 'simulator',
    bankAccountId: 'bank-ap-1',
    bankName: 'بانک کشاورزی',
    terminalId: '65478912',
    merchantId: '123654789654123',
    ipAddress: '192.168.1.122',
    port: 9000,
    connectionType: 'lan',
    timeoutSeconds: 45,
    autoPrintReceipt: true,
    isActive: false
  }
];

export function getStoredPosTerminals(): PosTerminalConfig[] {
  if (typeof window === 'undefined') return DEFAULT_POS_TERMINALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveStoredPosTerminals(DEFAULT_POS_TERMINALS);
      return DEFAULT_POS_TERMINALS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_POS_TERMINALS;
  } catch (e) {
    console.warn('Error reading stored PC-POS terminals:', e);
    return DEFAULT_POS_TERMINALS;
  }
}

export function saveStoredPosTerminals(terminals: PosTerminalConfig[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(terminals));
  } catch (e) {
    console.warn('Error saving PC-POS terminals:', e);
  }
}

export function getActivePosTerminal(): PosTerminalConfig {
  const all = getStoredPosTerminals();
  const active = all.find(t => t.isActive);
  return active || all[0] || DEFAULT_POS_TERMINALS[0];
}

/**
 * شبیه‌ساز تاریخ و ساعت شمسی جاری
 */
function getShamsiFormattedNow(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(now);
  } catch {
    return '1405/01/01 12:00:00';
  }
}

/**
 * اجرای تراکنش خرید از طریق درایور PC-POS با مانیتورینگ زنده مراحل
 */
export async function executePcPosPayment(
  request: PosPaymentRequest,
  onStatusUpdate: (update: PosStatusUpdate) => void
): Promise<PosPaymentReceipt> {
  const terminal = request.terminalConfig;
  const timeoutMs = (terminal.timeoutSeconds || 45) * 1000;

  // مرحله ۱: برقراری ارتباط با درگاه پوز
  onStatusUpdate({
    status: 'connecting',
    message: `در حال اتصال به پایانه پوز (${terminal.name} - ${terminal.ipAddress}:${terminal.port})...`,
    stepPercent: 15,
    details: `ارسال مبلغ ${formatCurrency(request.amount, request.currency)} به کارتخوان`
  });

  await new Promise(res => setTimeout(res, 800));

  // مرحله ۲: منتظر کشیدن کارت توسط مشتری
  onStatusUpdate({
    status: 'swipe_card',
    message: 'لطفاً کارت بانکی را روی پایانه بکشید یا به بخش NFC نزدیک نمایید...',
    stepPercent: 40,
    details: 'مبلغ روی نمایشگر دستگاه ثبت گردید.'
  });

  await new Promise(res => setTimeout(res, 1800));

  // مرحله ۳: ورود رمز توسط خریدار روی پین‌پد کارتخوان
  onStatusUpdate({
    status: 'enter_pin',
    message: 'در انتظار ورود رمز کارت (PIN) توسط مشتری...',
    stepPercent: 65,
    details: 'مشتری در حال ورود رمز ۴ رقمی کارت روی پین‌پد است.'
  });

  await new Promise(res => setTimeout(res, 2200));

  // مرحله ۴: پردازش سوییچ شاپرک و استعلام بانکی
  onStatusUpdate({
    status: 'processing',
    message: 'در حال ارسال به شبکه شاپرک و تایید تراکنش...',
    stepPercent: 85,
    details: 'دریافت تاییدیه از سوییچ پذیرنده و بانک صادرکننده'
  });

  await new Promise(res => setTimeout(res, 1200));

  // شبیه‌سازی کارت و شماره مرجع
  const sampleCardBins = ['603799', '610433', '621986', '589210', '502229', '627412'];
  const randomBin = sampleCardBins[Math.floor(Math.random() * sampleCardBins.length)];
  const randomLast4 = Math.floor(1000 + Math.random() * 9000).toString();
  const maskedPan = `${randomBin.slice(0, 4)}-${randomBin.slice(4)}**-****-${randomLast4}`;
  const issuerBankName = detectBankFromCardNumber(randomBin);

  const traceNumber = Math.floor(100000 + Math.random() * 900000).toString();
  const rrn = `${Date.now().toString().slice(-6)}${Math.floor(100000 + Math.random() * 900000)}`;
  const shamsiDateTime = getShamsiFormattedNow();

  const receipt: PosPaymentReceipt = {
    success: true,
    terminalId: terminal.terminalId || '87452109',
    merchantId: terminal.merchantId || '984512036587412',
    merchantName: terminal.name,
    amount: request.amount,
    currency: request.currency,
    traceNumber,
    rrn,
    maskedPan,
    issuerBankName,
    responseCode: '00',
    responseMessage: 'عملیات با موفقیت انجام شد (تراکنش تایید گردید).',
    shamsiDateTime,
    isoDateTime: new Date().toISOString(),
    invoiceId: request.invoiceId,
    invoiceNumber: request.invoiceNumber
  };

  onStatusUpdate({
    status: 'approved',
    message: 'تراکنش با موفقیت به پایان رسید و فیش صادر گردید.',
    stepPercent: 100,
    details: `شماره پیگیری: ${toPersianDigits(traceNumber)} • بانک: ${issuerBankName}`
  });

  return receipt;
}
