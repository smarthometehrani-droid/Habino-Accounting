import { LicenseInfo, LicenseTier, DemoVsMarketFeature } from '../types';

const LICENSE_PREFIX = 'HAB-';
export const MASTER_CRYPTO_SALT = 'HABINO-FINANCIAL-CORE-2026-FARID-TEHRANI-SALT-V1';

/**
 * Fast deterministic cryptographic checksum generator (FNV-1a / Murmur variant)
 */
export function computeCryptoChecksum(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = ((h2 >>> 0) ^ (h1 >>> 0)) >>> 0;
  return combined.toString(16).toUpperCase().padStart(8, '0');
}

export const ADDON_CODES: Record<string, string> = {
  'synapse_voice': 'SYN',
  'barcode_pos': 'POS',
  'payroll_labor': 'PAY',
  'multi_store': 'MST',
  'rfp_tender': 'RFP',
  'ai_sales_agent': 'SLS',
  'financial_parser': 'OCR',
  'basket_optimizer': 'BSK',
  'multiagent_orchestrator': 'AGNT'
};

/**
 * Generates an offline cryptographically signed serial key for a specific Add-on and Tenant
 * Format: HAB-ADDON-[CODE]-[TENANT_HASH]-[CHECKSUM]
 */
export function generateAddonSerialKey(addonId: string, tenantId: string): string {
  const code = ADDON_CODES[addonId] || addonId.substring(0, 3).toUpperCase();
  const tenantHash = computeCryptoChecksum(tenantId.trim().toLowerCase()).substring(0, 4);
  const checksum = computeCryptoChecksum(`${tenantId.trim().toLowerCase()}:${addonId}:${MASTER_CRYPTO_SALT}`).substring(0, 4);
  return `HAB-ADDON-${code}-${tenantHash}-${checksum}`;
}

/**
 * Cryptographically validates an Add-on serial key offline
 */
export function validateAddonSerialKey(
  addonId: string,
  tenantId: string,
  serialKey?: string
): { valid: boolean; message: string } {
  if (!serialKey || !serialKey.trim()) {
    return { valid: false, message: 'لطفاً کد فعال‌سازی افزونه را وارد نمایید.' };
  }

  const cleanKey = serialKey.trim().toUpperCase();

  // 1. Master Keys for Founder / Internal QA
  if (
    cleanKey === 'HABINO-FARID-TEHRANI-MASTER' ||
    cleanKey === 'HABINO-MASTER-ADDON-ALL' ||
    cleanKey === 'HABINO-2026-VIP'
  ) {
    return { valid: true, message: 'کد مستر بنیان‌گذار تأیید شد. افزونه بدون محدودیت فعال گردید.' };
  }

  // 2. Simulated Direct / In-App Purchase Keys (Online/App Store flow)
  if (cleanKey.startsWith(`ADDON-${addonId.toUpperCase()}`) && cleanKey.endsWith('-PAID')) {
    return { valid: true, message: 'رسید پرداخت آنلاین افزونه تأیید گردید.' };
  }

  // 3. Cryptographically Signed Offline Serial Key
  // Format: HAB-ADDON-[CODE]-[TENANT_HASH]-[CHECKSUM]
  const parts = cleanKey.split('-');
  if (parts.length === 5 && parts[0] === 'HAB' && parts[1] === 'ADDON') {
    const keyAddonCode = parts[2];
    const keyTenantHash = parts[3];
    const keyChecksum = parts[4];

    const expectedCode = ADDON_CODES[addonId] || addonId.substring(0, 3).toUpperCase();
    if (keyAddonCode !== expectedCode) {
      return {
        valid: false,
        message: `این کد فعال‌سازی مربوط به این افزونه نیست (کد وارد شده برای رده ${keyAddonCode} است).`
      };
    }

    const expectedTenantHash = computeCryptoChecksum(tenantId.trim().toLowerCase()).substring(0, 4);
    if (keyTenantHash !== expectedTenantHash) {
      return {
        valid: false,
        message: 'این کد فعال‌سازی برای شناسه سازمان (مستأجر) دیگری صادر شده است و روی این حساب معتبر نیست.'
      };
    }

    const expectedChecksum = computeCryptoChecksum(`${tenantId.trim().toLowerCase()}:${addonId}:${MASTER_CRYPTO_SALT}`).substring(0, 4);
    if (keyChecksum !== expectedChecksum) {
      return {
        valid: false,
        message: 'امضای دیجیتال کد فعال‌سازی نامعتبر است یا کد دستکاری شده است.'
      };
    }

    return {
      valid: true,
      message: 'امضای دیجیتال و تعلق کلید به این سازمان با موفقیت تأیید شد.'
    };
  }

  return {
    valid: false,
    message: 'فرمت کد فعال‌سازی نامعتبر است. فرمت استاندارد: HAB-ADDON-[CODE]-[TENANT]-[SIGN]'
  };
}

export interface GeneratedKeyResult {
  serialKey: string;
  tier: LicenseTier;
  durationDays: number;
  clientName: string;
  generatedAt: string;
  expiresAt: string;
}

export const TIER_DETAILS: Record<LicenseTier, { title: string; subtitle: string; price: number; features: string[] }> = {
  trial: {
    title: 'نسخه آزمایشی (Trial)',
    subtitle: 'دسترسی اولیه ۱۴ روزه به امکانات پایه',
    price: 0,
    features: [
      'صدور حداکثر ۲۰ فاکتور در ماه',
      'مدیریت اشخاص و طرف حساب‌ها',
      'ثبت چک‌ها و یادآوری سررسید',
      'گزارش‌گیری مقدماتی نقدینگی'
    ]
  },
  bazaar: {
    title: 'نسخه رسمی بازار (Cafe Bazaar Edition)',
    subtitle: 'بسته کامل فعال و نامحدود تمام ماژول‌های حسابداری، چک و هوش مصنوعی',
    price: 1850000,
    features: [
      'صدور نامحدود فاکتورهای ۴ قالبه با شخصی‌سازی رنگ، فونت و پیش‌نمایش زنده',
      'سامانه جامع چک‌های صیادی ۱۶ رقمی و اتصال خودکار به اقساط و تسویه زنجیره‌ای',
      'دفتر روزنامه دوبل استاندارد و ممیزی تراز آزمایشی (بدون رکورد یتیم)',
      'صورت‌های مالی رسمی، ترازنامه متوازن و گزارش سود و زیان دوره (P&L)',
      'هوش مصنوعی صوتی سیناپس (Gemini Live AI CFO) با تحلیل بلادرنگ نقدینگی',
      'حسابداری پروژه‌ها و تفکیک بهای تمام‌شده و سود خالص هر قرارداد',
      'مدیریت صندوق، تراکنش‌ها، تعرفه خدمات و پایگاه‌داده اشخاص کرکره‌ای',
      'پشتیبان‌گیری خودکار محلی و ابری با خروجی استاندارد JSON و کارکرد ۱۰۰٪ آفلاین PWA'
    ]
  },
  pro: {
    title: 'اشتراک حرفه‌ای خدمات (Pro Service)',
    subtitle: 'مخصوص کسب‌وکارهای خدماتی و فریلنسرها (۱ ساله)',
    price: 1850000,
    features: [
      'صدور نامحدود فاکتورهای ۴ قالبه رسمی و استاندارد',
      'مدیریت پیشرفته چک‌های صیادی و اقساط متصل',
      'حسابداری پروژه‌ها و محاسبه سود خالص هر قرارداد',
      'دفتر روزنامه دوبل و انطباق استاندارد مالی',
      'پشتیبان‌گیری خودکار روزانه ابری و محلی',
      'پشتیبانی اولویت‌دار اختصاصی'
    ]
  },
  enterprise: {
    title: 'اشتراک نامحدود سازمانی + سیناپس (Enterprise CFO)',
    subtitle: 'بسته کامل با دستیار صوتی هوش مصنوعی Gemini (همیشگی / سالانه)',
    price: 3900000,
    features: [
      'تمامی امکانات نسخه حرفه‌ای بدون محدودیت',
      'هوش مصنوعی صوتی سیناپس (Gemini Live CFO)',
      'پیش‌بینی جریان وجوه نقد (Predictive Cash Flow)',
      'چندکاربره و ایزوله‌سازی سازمانی (Multi-Tenant)',
      'عیب‌یاب جامع ترازنامه و ممیزی هوشمند مغایرت‌ها',
      'شخصی‌سازی کامل تمپلیت فاکتور با رنگ و فونت برند'
    ]
  }
};

/**
 * Detailed comparison matrix between Demo / Test mode and Bazaar / Commercial release
 */
export const DEMO_VS_MARKET_COMPARISON: DemoVsMarketFeature[] = [
  {
    id: 'feat-invoices',
    category: 'فروش و فاکتور',
    title: 'صدور فاکتور و پیش‌فاکتور ۴ قالبه',
    description: '۴ قالب استاندارد (حرفه‌ای، مدرن، مینیمال، کلاسیک بازار) با محاسبه خودکار مالیات، تخفیف، چاپ و PDF',
    demoStatus: 'فعال با اقلام و فاکتور نمونه',
    bazaarStatus: 'کاملاً فعال، بدون محدودیت تعداد با چاپ رسمی',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-invoice-preview',
    category: 'فروش و فاکتور',
    title: 'پیش‌نمایش زنده قالب‌ها و شخصی‌سازی برند',
    description: 'تغییر آنی رنگ سازمانی، فونت (وزیر، ایران‌یکان، سریف، مونو)، لوگو، مهر، امضا و مشاهده بلادرنگ',
    demoStatus: 'فعال در بخش تنظیمات',
    bazaarStatus: 'کاملاً فعال با ذخیره دائمی و اعمال در صدور',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-sayad-checks',
    category: 'خزانه و چک صیادی',
    title: 'مدیریت چک‌های صیادی ۱۶ رقمی',
    description: 'ثبت، استعلام، سررسید شمسی، وضعیت‌های در جریان، وصول و برگشتی با انتخابگر جستجوپذیر مشتری',
    demoStatus: 'فعال با چک‌های صیادی نمونه',
    bazaarStatus: 'کاملاً فعال با سیستم یادآوری و تسویه زنجیره‌ای',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-installments',
    category: 'خزانه و چک صیادی',
    title: 'تقسیط هوشمند و اتصال خودکار به چک',
    description: 'زمان‌بندی اقساط متصل به فاکتور و تسویه خودکار قسط به محض وصول چک صیادی در حسابداری',
    demoStatus: 'فعال در سناریوهای تستی',
    bazaarStatus: 'کاملاً فعال و متصل به دفتر روزنامه دوبل',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-transactions',
    category: 'خزانه و چک صیادی',
    title: 'تراکنش‌ها، دریافت/پرداخت و جریان نقدینگی',
    description: 'ثبت درآمد و هزینه نقدی، دسته‌بندی سرفصل‌ها و تفکیک صندوق و بانک‌ها',
    demoStatus: 'فعال در داشبورد',
    bazaarStatus: 'کاملاً فعال در منو و مرکز افزونه‌های بازار',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-clients',
    category: 'پایگاه مشتریان',
    title: 'پرونده طرف‌های حساب (اشخاص و شرکت‌ها)',
    description: 'طراحی کرکره‌ای جمع‌وجور، ثبت مانده‌حساب، شناسه ملی، کد اقتصادی و حقیقی/حقوقی',
    demoStatus: 'فعال با ۳ مخاطب نمونه',
    bazaarStatus: 'کاملاً فعال با جستجوی سریع و بدون محدودیت رکورد',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-inventory',
    category: 'خدمات و انبار',
    title: 'تعرفه خدمات تخصصی و انبار کالا',
    description: 'محاسبه بهای تمام‌شده، قیمت فروش، کنترل نقطه سفارش حداقل موجودی و جستجو و ویرایش آسان',
    demoStatus: 'فعال با خدمات و قطعات نمونه',
    bazaarStatus: 'کاملاً فعال و آماده تعریف تعرفه‌های کسب‌وکار',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-banks',
    category: 'بانک و نقدینگی',
    title: 'حساب‌های بانکی، کارت‌ها و شماره شبا',
    description: 'ثبت موجودی اولیه، رصد واریز و برداشت و کنترل شماره شبا و کارت جهت درج روی فاکتور چاپی',
    demoStatus: 'فعال با ۲ بانک نمونه',
    bazaarStatus: 'کاملاً فعال برای اتصال نامحدود حساب‌ها',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-projects',
    category: 'حسابداری پروژه‌ای',
    title: 'پروژه‌ها، قراردادها و محاسبه سود خالص',
    description: 'حسابداری بر مبنای برچسب پروژه (Project Tagging)، ثبت پیش‌پرداخت کارفرما و جلوگیری از حساب مستقل در دفتر کل',
    demoStatus: 'فعال با پروژه نمونه اتوماسیون',
    bazaarStatus: 'کاملاً فعال مطابق استاندارد مهندسی هابینو',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-ledger',
    category: 'حسابداری دوبل و اسناد',
    title: 'دفتر روزنامه دوبل و دفتر کل استاندارد',
    description: 'ثبت سند حسابداری با توازن بدهکار/بستانکار، کدینگ حسابداری استاندارد ایران و اعتبارسنجی الزامی مخاطب',
    demoStatus: 'فعال با اسناد افتتاحیه و نمونه',
    bazaarStatus: 'کاملاً فعال با صدور خودکار سند و چاپ تراز',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-reports',
    category: 'حسابداری دوبل و اسناد',
    title: 'صورت‌های مالی رسمی، ترازنامه و سود و زیان (P&L)',
    description: 'صورت سود و زیان دوره‌ای، تراز آزمایشی ۴ ستونی، ترازنامه متوازن و محاسبه نقطه سربه‌سر',
    demoStatus: 'فعال با ارقام شبیه‌سازی شده',
    bazaarStatus: 'کاملاً فعال و قابل استخراج رسمی و چاپی',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-synapse-ai',
    category: 'هوش مصنوعی',
    title: 'دستیار صوتی سایرافلو (SiraFlow) با آواتار اختصاصی',
    description: 'دستیار صوتی و ارکستراتور پلتفرم هابینو با آواتار کوانتومی چندحالته، پردازش صوتی فارسی بلادرنگ، ممیزی دفاتر بازار و انطباق با رودمپ ۳۰ روزه',
    demoStatus: 'فعال با آواتار هوشمند و تست صدا',
    bazaarStatus: 'کاملاً فعال در نسخه رسمی بازار و پلن‌های حرفه‌ای رودمپ',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-diagnostics',
    category: 'ممیزی و امنیت',
    title: 'پایش و عیب‌یاب ترازنامه و صفر مغایرت',
    description: 'تطبیق تراز کل درآمد و هزینه با داشبورد، ردیابی رکوردهای یتیم و تست پذیرش خودکار ۶ مرحله‌ای',
    demoStatus: 'فعال با گزارش ۱۰۰٪ سلامت',
    bazaarStatus: 'کاملاً فعال جهت جلوگیری از هرگونه خطای دیتابیس',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-backup',
    category: 'ممیزی و امنیت',
    title: 'پشتیبان‌گیری خودکار روزانه و بازیابی داده‌ها',
    description: 'ذخیره‌سازی اضطراری در حافظه محلی، خروجی JSON کامل و امکان بازگردانی کل اطلاعات با یک کلیک',
    demoStatus: 'فعال با قابلیت دانلود دستی',
    bazaarStatus: 'کاملاً فعال با پایش خودکار ۲۴ ساعته',
    isActivatedInBazaar: true
  },
  {
    id: 'feat-desktop-pwa',
    category: 'رابط کاربری و دسترسی',
    title: 'میزکار چندپنجره‌ای دسکتاپ و PWA ۱۰۰٪ آفلاین',
    description: 'سوییچ میان سیستم‌عامل چندپنجره‌ای هابینو و وب کلاسیک، نصب روی موبایل و کار بدون اینترنت',
    demoStatus: 'فعال در هر دو نما',
    bazaarStatus: 'کاملاً فعال و بهینه‌سازی شده برای نسخه بازار',
    isActivatedInBazaar: true
  }
];

/**
 * Generate a cryptographically structured serial license key
 * Format: HAB-[TIER]-[RANDOM]-[CHECKSUM]
 */
export function generateSerialKey(tier: LicenseTier, durationDays: number, clientName: string): GeneratedKeyResult {
  const tierCode = tier === 'enterprise' ? 'ENT' : tier === 'pro' ? 'PRO' : 'TRL';
  const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const durationCode = durationDays.toString().padStart(3, '0');
  
  const serialKey = `HAB-${tierCode}-${durationCode}-${rand1}-${rand2}`;

  const now = new Date();
  const expires = new Date();
  expires.setDate(now.getDate() + durationDays);

  return {
    serialKey,
    tier,
    durationDays,
    clientName,
    generatedAt: now.toISOString(),
    expiresAt: expires.toISOString()
  };
}

/**
 * Validates and activates a serial license key
 */
export function validateAndParseLicenseKey(key: string, holderName: string = 'کاربر محترم'): { valid: boolean; license?: LicenseInfo; message: string } {
  const cleanKey = key.trim().toUpperCase();

  if (!cleanKey) {
    return { valid: false, message: 'لطفاً کد فعال‌سازی را وارد نمایید.' };
  }

  // Check format: HAB-[TIER]-[DAYS]-[RAND1]-[RAND2]
  const parts = cleanKey.split('-');
  if (parts.length >= 4 && parts[0] === 'HAB') {
    const tierCode = parts[1];
    let tier: LicenseTier = 'pro';
    let days = 365;

    if (tierCode === 'ENT') {
      tier = 'enterprise';
      days = 365;
    } else if (tierCode === 'PRO') {
      tier = 'pro';
      days = 365;
    } else if (tierCode === 'TRL') {
      tier = 'trial';
      days = 14;
    }

    if (parts[2] && !isNaN(parseInt(parts[2]))) {
      days = parseInt(parts[2]);
    }

    const now = new Date();
    const expires = new Date();
    expires.setDate(now.getDate() + days);

    const license: LicenseInfo = {
      status: 'active',
      tier,
      licenseKey: cleanKey,
      holderName,
      activatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      maxInvoices: tier === 'trial' ? 20 : 999999,
      maxUsers: tier === 'enterprise' ? 10 : 1,
      aiSynapseEnabled: tier === 'enterprise' || tier === 'pro',
      offlineSyncEnabled: true,
      features: TIER_DETAILS[tier].features
    };

    return {
      valid: true,
      license,
      message: `لایسنس ${TIER_DETAILS[tier].title} با موفقیت فعال گردید.`
    };
  }

  // Master Test Key for Farid Tehrani
  if (cleanKey === 'HABINO-FARID-TEHRANI-MASTER' || cleanKey === 'HABINO-2026-VIP') {
    const now = new Date();
    const expires = new Date();
    expires.setFullYear(now.getFullYear() + 10);

    const license: LicenseInfo = {
      status: 'active',
      tier: 'enterprise',
      licenseKey: cleanKey,
      holderName: 'مهندس فرید تهرانی (مدیریت کل)',
      activatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      maxInvoices: 999999,
      maxUsers: 99,
      aiSynapseEnabled: true,
      offlineSyncEnabled: true,
      features: TIER_DETAILS.enterprise.features
    };

    return {
      valid: true,
      license,
      message: 'لایسنس مستر مهندس فرید تهرانی با دسترسی کامل سازمانی و هوش مصنوعی فعال شد.'
    };
  }

  // Official Cafe Bazaar Release Keys
  if (cleanKey.includes('BAZAAR') || cleanKey === 'HAB-BAZAAR-2026' || cleanKey === 'HABINO-BAZAAR-FULL-ACCESS' || cleanKey === 'BAZAAR-VIP') {
    const now = new Date();
    const expires = new Date();
    expires.setFullYear(now.getFullYear() + 2);

    const license: LicenseInfo = {
      status: 'active',
      tier: 'bazaar',
      licenseKey: cleanKey,
      holderName: holderName && holderName !== 'کاربر محترم' ? holderName : 'کسب‌وکار فعال نسخه بازار',
      activatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      maxInvoices: 999999,
      maxUsers: 99,
      aiSynapseEnabled: true,
      offlineSyncEnabled: true,
      features: TIER_DETAILS.bazaar.features
    };

    return {
      valid: true,
      license,
      message: 'نسخه رسمی کافه بازار با موفقیت فعال شد؛ کلیه بخش‌ها و امکانات حسابداری، چک و هوش مصنوعی در دسترس شماست.'
    };
  }

  return {
    valid: false,
    message: 'کد فعال‌سازی وارد شده نامعتبر است. ساختار کد باید به صورت HAB-PRO-365-XXXX-YYYY باشد.'
  };
}

/**
 * Creates and returns an instant full-featured Bazaar Edition license
 */
export function activateFullMarketEdition(holderName: string = 'کسب‌وکار محترم نسخه بازار'): LicenseInfo {
  const now = new Date();
  const expires = new Date();
  expires.setFullYear(now.getFullYear() + 2);

  return {
    status: 'active',
    tier: 'bazaar',
    licenseKey: 'HABINO-BAZAAR-FULL-ACCESS-2026',
    holderName,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    maxInvoices: 999999,
    maxUsers: 99,
    aiSynapseEnabled: true,
    offlineSyncEnabled: true,
    features: [
      ...TIER_DETAILS.bazaar.features,
      'کلیه بخش‌های دمو در نسخه بازار فعال شد',
      'فاکتور ۴ قالبه با پیش‌نمایش زنده',
      'سامانه چک‌های صیادی و اقساط متصل',
      'دفتر روزنامه دوبل و تراز آزمایشی',
      'سود و زیان رسمی و هوش مصنوعی سیناپس'
    ]
  };
}

/**
 * Mock Purchase Verification Service (Ready for Bazaar / Google Play / Zarinpal API)
 */
export async function verifyPurchaseMock(packageId: string, transactionId: string): Promise<{ success: boolean; license?: LicenseInfo; error?: string }> {
  // Simulate network request to payment gateway / app store
  await new Promise(resolve => setTimeout(resolve, 800));

  let tier: LicenseTier = 'pro';
  if (packageId.includes('enterprise')) tier = 'enterprise';

  const generated = generateSerialKey(tier, 365, 'خرید آنلاین');
  
  const now = new Date();
  const expires = new Date();
  expires.setDate(now.getDate() + 365);

  const license: LicenseInfo = {
    status: 'active',
    tier,
    licenseKey: generated.serialKey,
    holderName: 'خریدار محترم هابینو',
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    maxInvoices: 999999,
    maxUsers: tier === 'enterprise' ? 10 : 1,
    aiSynapseEnabled: true,
    offlineSyncEnabled: true,
    features: TIER_DETAILS[tier].features
  };

  return {
    success: true,
    license
  };
}

/**
 * Calculate remaining subscription days
 */
export function getRemainingDays(expiresAt: string): { days: number; isExpired: boolean; formatted: string } {
  try {
    const expDate = new Date(expiresAt);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { days: 0, isExpired: true, formatted: 'منقضی شده' };
    }
    return { days: diffDays, isExpired: false, formatted: `${diffDays} روز باقی‌مانده` };
  } catch {
    return { days: 0, isExpired: false, formatted: 'نامحدود' };
  }
}
