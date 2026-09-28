import { CurrencyType } from '../types';

/**
 * واحد پول استاندارد پایه در دیتابیس و هسته محاسباتی هابینو: ریال ایران (IRR)
 * تمامی داده‌های مالی و اسناد افتتاحیه به صورت استاندارد در مبنای ریال نگهداری می‌شوند
 * تا از خطای ۱۰ برابری محاسبات هنگام سوئیچ کاربر میان تومان و ریال جلوگیری گردد.
 */
export const BASE_FINANCIAL_CURRENCY: CurrencyType = 'IRR';
export const IRT_TO_IRR_MULTIPLIER = 10;
export const USD_TO_IRR_MULTIPLIER = 600000; // مبنای پیش‌فرض تسعیر ارز دلار

export function getExchangeRateToBase(currency: CurrencyType = 'IRT'): number {
  switch (currency) {
    case 'IRT':
      return IRT_TO_IRR_MULTIPLIER;
    case 'IRR':
      return 1;
    case 'USD':
      return USD_TO_IRR_MULTIPLIER;
    default:
      return IRT_TO_IRR_MULTIPLIER;
  }
}

/**
 * تبدیل هر واحد پولی به واحد پایه مالی سیستم (ریال)
 */
export function toBaseCurrency(amount: number | undefined | null, fromCurrency: CurrencyType = 'IRT'): number {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  const rate = getExchangeRateToBase(fromCurrency);
  return Math.round(amount * rate);
}

/**
 * تبدیل از واحد پایه سیستم (ریال) به واحد انتخابی کاربر جهت نمایش در UI
 */
export function fromBaseCurrency(baseAmount: number | undefined | null, toCurrency: CurrencyType = 'IRT'): number {
  if (baseAmount === undefined || baseAmount === null || isNaN(baseAmount)) return 0;
  const rate = getExchangeRateToBase(toCurrency);
  return rate === 0 ? 0 : Math.round(baseAmount / rate);
}

/**
 * تبدیل مستقیم بین دو واحد ارزی مختلف
 */
export function convertCurrency(
  amount: number | undefined | null,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): number {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;
  const inBase = toBaseCurrency(amount, fromCurrency);
  return fromBaseCurrency(inBase, toCurrency);
}

export function formatCurrency(amount: number | undefined | null, currency: CurrencyType = 'IRT'): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '۰ تومان';
  
  const formattedNumber = Math.round(amount).toLocaleString('fa-IR');
  
  switch (currency) {
    case 'IRT':
      return `${formattedNumber} تومان`;
    case 'IRR':
      return `${formattedNumber} ریال`;
    case 'USD':
      return `$${amount.toLocaleString('en-US')}`;
    default:
      return `${formattedNumber} تومان`;
  }
}

/**
 * فرمت مبلغ ذخیره شده در مبنای ریال برای نمایش در واحد جاری کاربر
 */
export function formatBaseCurrency(baseAmount: number | undefined | null, targetCurrency: CurrencyType = 'IRT'): string {
  const converted = fromBaseCurrency(baseAmount, targetCurrency);
  return formatCurrency(converted, targetCurrency);
}

export function toPersianDigits(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}
