import { AccountGroup, AccountKol, AccountMoein, AccountNature } from '../types';

/**
 * سرفصل‌های استاندارد ۳ سطحی حسابداری ایران (گروه، کل، معین)
 * مصوب استانداردهای حسابداری رسمی و مناسب برای تمامی اصناف و شرکت‌ها
 */

export const STANDARD_ACCOUNT_GROUPS: AccountGroup[] = [
  { code: '1', title: 'دارایی‌های جاری', nature: 'debit', description: 'وجوه نقد، بانک‌ها، مطالبات و موجودی کالا که در چرخه عملیاتی در گردش است' },
  { code: '2', title: 'دارایی‌های غیرجاری', nature: 'debit', description: 'دارایی‌های ثابت مشهود، ماشین‌آلات، تجهیزات، نرم‌افزار و سپرده‌های بلندمدت' },
  { code: '3', title: 'بدهی‌های جاری', nature: 'credit', description: 'تعهدات کوتاه‌مدت تجاری، چک‌های صادره، مالیات، بیمه و پیش‌دریافت‌ها' },
  { code: '4', title: 'بدهی‌های بلندمدت', nature: 'credit', description: 'تسهیلات مالی دریافتی بلندمدت بانکی و ذخیره سنوات پایان خدمت کارکنان' },
  { code: '5', title: 'حقوق صاحبان سهام و سرمایه', nature: 'credit', description: 'سرمایه اولیه، اندوخته‌ها، جاری شرکا و سهامداران و سود (زیان) انباشته' },
  { code: '6', title: 'درآمدها', nature: 'credit', description: 'درآمدهای حاصل از فروش کالا، ارائه خدمات تخصصی، پیمانکاری و سایر درآمدها' },
  { code: '7', title: 'بهای تمام‌شده', nature: 'debit', description: 'بهای تمام‌شده کالای فروش‌رفته، خرید مستقیم و هزینه‌های مستقیم پروژه‌ها' },
  { code: '8', title: 'هزینه‌های عملیاتی و اداری', nature: 'debit', description: 'حقوق و دستمزد اداری، اجاره، آب و برق، بازاریابی و استهلاک' },
  { code: '9', title: 'حساب‌های انتظامی و آماری', nature: 'both', description: 'حساب‌های انتظامی، تضامین، چک‌های امانی و تعهدات قراردادی' },
];

export const STANDARD_ACCOUNT_KOLS: AccountKol[] = [
  // گروه ۱: دارایی‌های جاری
  { code: '10', groupCode: '1', title: 'موجودی نقد و بانک‌ها', nature: 'debit', description: 'صندوق‌ها، بانک‌ها و تنخواه‌گردان‌ها' },
  { code: '11', groupCode: '1', title: 'سرمایه‌گذاری‌های کوتاه‌مدت', nature: 'debit', description: 'سپرده‌های کوتاه‌مدت و اوراق بهادار' },
  { code: '12', groupCode: '1', title: 'حساب‌ها و اسناد دریافتنی تجاری', nature: 'debit', description: 'مطالبات از مشتریان و چک‌های صیادی نزد صندوق' },
  { code: '13', groupCode: '1', title: 'سایر حساب‌ها و اسناد دریافتنی', nature: 'debit', description: 'مساعده پرسنل، وام کارکنان و مطالبات غیرتجاری' },
  { code: '14', groupCode: '1', title: 'موجودی مواد و کالا', nature: 'debit', description: 'کالای بازرگانی، ملزومات مصرفی و قطعات' },
  { code: '15', groupCode: '1', title: 'پیش‌پرداخت‌ها و سفارشات', nature: 'debit', description: 'پیش‌پرداخت خرید، قراردادها و بیمه' },

  // گروه ۲: دارایی‌های غیرجاری
  { code: '20', groupCode: '2', title: 'دارایی‌های ثابت مشهود', nature: 'debit', description: 'زمین، ساختمان، اثاثه، ابزارآلات و وسایط نقلیه' },
  { code: '21', groupCode: '2', title: 'استهلاک انباشته دارایی‌های ثابت', nature: 'credit', description: 'کاهنده ارزش دارایی‌های مشهود' },
  { code: '22', groupCode: '2', title: 'دارایی‌های نامشهود', nature: 'debit', description: 'حق‌الامتیازها، نرم‌افزارها و برند' },

  // گروه ۳: بدهی‌های جاری
  { code: '30', groupCode: '3', title: 'حساب‌ها و اسناد پرداختنی تجاری', nature: 'credit', description: 'بستانکاران تجاری، تأمین‌کنندگان و چک‌های صادره' },
  { code: '31', groupCode: '3', title: 'سایر حساب‌ها و اسناد پرداختنی', nature: 'credit', description: 'تعهدات جاری غیرتجاری و مالیات‌های تکلیفی' },
  { code: '32', groupCode: '3', title: 'پیش‌دریافت از مشتریان و کارفرمایان', nature: 'credit', description: 'وجوه دریافتی بابت خدمات یا کالای آتی' },
  { code: '33', groupCode: '3', title: 'ذخایر و تعهدات مالیاتی و بیمه', nature: 'credit', description: 'مالیات بر ارزش افزوده و حق بیمه تأمین اجتماعی پرداختنی' },
  { code: '34', groupCode: '3', title: 'حقوق و دستمزد پرداختنی', nature: 'credit', description: 'خالص حقوق پرسنل در انتظار پرداخت' },

  // گروه ۴: بدهی‌های بلندمدت
  { code: '40', groupCode: '4', title: 'تسهیلات مالی دریافتی بلندمدت', nature: 'credit', description: 'وام‌های بانکی با سررسید بیش از یک سال' },
  { code: '41', groupCode: '4', title: 'ذخیره مزایای پایان خدمت کارکنان', nature: 'credit', description: 'ذخیره حق سنوات و پاداش خدمت پرسنل' },

  // گروه ۵: حقوق صاحبان سهام
  { code: '50', groupCode: '5', title: 'سرمایه اولیه شرکا و سهامداران', nature: 'credit', description: 'سرمایه ثبتی یا آورده اولیه موسسان' },
  { code: '51', groupCode: '5', title: 'جاری شرکا و سهامداران', nature: 'both', description: 'برداشت و واریز شخصی شرکا به حساب کسب‌وکار' },
  { code: '52', groupCode: '5', title: 'اندوخته‌ها', nature: 'credit', description: 'اندوخته قانونی و احتیاطی' },
  { code: '53', groupCode: '5', title: 'سود (زیان) انباشته', nature: 'credit', description: 'سود یا زیان تجمیعی دوره‌های قبل' },

  // گروه ۶: درآمدها
  { code: '60', groupCode: '6', title: 'درآمد فروش کالا و تجهیزات', nature: 'credit', description: 'فروش قطعی کالا به مشتریان' },
  { code: '61', groupCode: '6', title: 'درآمد ارائه خدمات و پیمانکاری', nature: 'credit', description: 'صورت‌وضعیت‌ها و فاکتورهای خدمات مهندسی' },
  { code: '62', groupCode: '6', title: 'سایر درآمدها و سود غیرعملیاتی', nature: 'credit', description: 'سود سپرده بانکی و سایر درآمدهای متفرقه' },

  // گروه ۷: بهای تمام‌شده
  { code: '70', groupCode: '7', title: 'بهای تمام‌شده کالای فروش‌رفته', nature: 'debit', description: 'قیمت خرید و هزینه‌های مستقیم کالای فروخته شده' },
  { code: '71', groupCode: '7', title: 'بهای تمام‌شده پروژه‌ها و خدمات', nature: 'debit', description: 'دستمزد مستقیم و مواد مصرفی در پروژه‌ها' },

  // گروه ۸: هزینه‌های عملیاتی و اداری
  { code: '80', groupCode: '8', title: 'هزینه‌های حقوق و دستمزد پرسنل', nature: 'debit', description: 'حقوق پایه، مزایا، پاداش و بیمه سهم کارفرما' },
  { code: '81', groupCode: '8', title: 'هزینه‌های اجاره، قبوض و نگهداری', nature: 'debit', description: 'اجاره دفتر، انبار، شارژ، اینترنت و برق' },
  { code: '82', groupCode: '8', title: 'هزینه‌های بازاریابی و فروش', nature: 'debit', description: 'تبلیغات، پورسانت و برندینگ' },
  { code: '83', groupCode: '8', title: 'هزینه‌های مالی و کارمزد بانکی', nature: 'debit', description: 'کارمزد انتقال وجه، بهره وام و خدمات مالی' },
  { code: '84', groupCode: '8', title: 'هزینه‌های متفرقه و استهلاک', nature: 'debit', description: 'استهلاک ماهانه اموال و ملزومات جزئی' },

  // گروه ۹: حساب‌های انتظامی
  { code: '90', groupCode: '9', title: 'حساب‌های انتظامی به نفع شرکت', nature: 'debit', description: 'چک‌ها و ضمانت‌نامه‌های دریافتی امانی' },
  { code: '91', groupCode: '9', title: 'طرف حساب‌های انتظامی', nature: 'credit', description: 'طرف تعهدات و اسناد تضمینی' },
];

export const STANDARD_ACCOUNT_MOEINS: AccountMoein[] = [
  // معین‌های کل ۱۰: موجودی نقد و بانک‌ها
  { code: '10101', kolCode: '10', groupCode: '1', title: 'صندوق ریالی و وجوه نقد', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'صندوق تنخواه و پول نقد شعبه' },
  { code: '10102', kolCode: '10', groupCode: '1', title: 'بانک‌ها و حساب‌های جاری ریالی', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'حساب‌های بانکی متصل به پوز و کارت‌خوان' },
  { code: '10103', kolCode: '10', groupCode: '1', title: 'تنخواه‌گردان کارگاه و شرکت', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'وجوه در اختیار کارپردازان و مسئولین خرید' },
  { code: '10104', kolCode: '10', groupCode: '1', title: 'وجوه در راه و حواله‌های انتقالی', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'حواله‌های بین‌بانکی در حال تسویه' },

  // معین‌های کل ۱۲: حساب‌ها و اسناد دریافتنی تجاری
  { code: '10201', kolCode: '12', groupCode: '1', title: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'مطالبات قطعی از خریداران و طرف‌حساب‌ها' },
  { code: '10202', kolCode: '12', groupCode: '1', title: 'اسناد دریافتنی نزد صندوق (چک‌های صیادی)', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'چک‌های صیادی دریافتنی قبل از ارسال به بانک' },
  { code: '10203', kolCode: '12', groupCode: '1', title: 'اسناد دریافتنی در جریان وصول', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'چک‌های تحویل‌شده به بانک جهت وصول' },
  { code: '10204', kolCode: '12', groupCode: '1', title: 'اسناد دریافتنی واخواست‌شده و برگشتی', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'چک‌های برگشت‌خورده مشتریان' },

  // معین‌های کل ۱۴: موجودی مواد و کالا
  { code: '10301', kolCode: '14', groupCode: '1', title: 'موجودی کالا و ملزومات مصرفی', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'انبار مرکزی، اجناس فروشی و قطعات یدکی' },
  { code: '10302', kolCode: '14', groupCode: '1', title: 'کالای در راه و سفارشات خرید', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'کالاهای خریداری شده در مسیر حمل' },

  // معین‌های کل ۱۵: پیش‌پرداخت‌ها
  { code: '10401', kolCode: '15', groupCode: '1', title: 'پیش‌پرداخت پروژه‌ها و قراردادها', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'پیش‌پرداخت‌های ارسالی به پیمانکاران و تأمین‌کنندگان' },
  { code: '10402', kolCode: '15', groupCode: '1', title: 'پیش‌پرداخت اجاره و بیمه', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'حق بیمه و اجاره‌بهای پرداخت‌شده قبل از موعد' },

  // معین‌های کل ۳۰: حساب‌ها و اسناد پرداختنی تجاری
  { code: '20101', kolCode: '30', groupCode: '3', title: 'حساب‌های پرداختنی تجاری (تأمین‌کنندگان)', nature: 'credit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'بدهی تجاری بابت خرید کالا و خدمات' },
  { code: '20102', kolCode: '30', groupCode: '3', title: 'اسناد پرداختنی صیادی (چک‌های صادره)', nature: 'credit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'چک‌های عهده بانک صادره به طرف‌حساب‌ها' },

  // معین‌های کل ۳۲: پیش‌دریافت از مشتریان
  { code: '20201', kolCode: '32', groupCode: '3', title: 'پیش‌دریافت پروژه‌ها از کارفرمایان', nature: 'credit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'وجوه نقد و چک‌های پیش‌دریافتی بابت پروژه‌ها' },

  // معین‌های کل ۳۳: ذخایر مالیات و بیمه
  { code: '20301', kolCode: '33', groupCode: '3', title: 'مالیات و عوارض ارزش افزوده پرداختنی', nature: 'credit', isFloatingTafsiliAllowed: false, isSystem: true, description: 'ارزش افزوده وصول‌شده فاکتورها متعلق به سازمان امور مالیاتی' },
  { code: '20302', kolCode: '33', groupCode: '3', title: 'بیمه پرداختنی تأمین اجتماعی (۳۰٪)', nature: 'credit', isFloatingTafsiliAllowed: false, isSystem: true, description: 'حق بیمه ۷٪ کارگر + ۲۳٪ کارفرما در انتظار تسویه با شعبه' },
  { code: '20303', kolCode: '33', groupCode: '3', title: 'مالیات بر حقوق پرداختنی (ماده ۸۴)', nature: 'credit', isFloatingTafsiliAllowed: false, isSystem: true, description: 'مالیات کسرشده از حقوق پرسنل جهت واریز به دارایی' },

  // معین‌های کل ۳۴: حقوق پرداختنی
  { code: '20401', kolCode: '34', groupCode: '3', title: 'حقوق و دستمزد پرداختنی پرسنل', nature: 'credit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'خالص قابل پرداخت به کارمندان در پایان ماه' },

  // معین‌های کل ۵۰ و ۵۱ و ۵۳: حقوق صاحبان سهام
  { code: '30101', kolCode: '50', groupCode: '5', title: 'سرمایه شرکا و حقوق صاحبان سهام', nature: 'credit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'سرمایه ثبتی شرکت و تراز افتتاحیه' },
  { code: '30102', kolCode: '51', groupCode: '5', title: 'جاری شرکا و سهامداران', nature: 'both', isFloatingTafsiliAllowed: true, isSystem: true, description: 'حساب فی‌مابین شرکا و کسب‌وکار' },
  { code: '30201', kolCode: '53', groupCode: '5', title: 'سود (زیان) انباشته سیستم', nature: 'credit', isFloatingTafsiliAllowed: false, isSystem: true, description: 'سود یا زیان تجمیعی سیستم در پایان ادوار' },

  // معین‌های کل ۶۰ و ۶۱: درآمدها
  { code: '40101', kolCode: '60', groupCode: '6', title: 'درآمد فروش کالا و تجهیزات', nature: 'credit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'فروش قطعی کالا در فاکتورهای فروش' },
  { code: '40102', kolCode: '61', groupCode: '6', title: 'درآمد ارائه خدمات فنی و مهندسی', nature: 'credit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'صورتحساب خدمات فنی، نصب، پشتیبانی و مشاوره' },
  { code: '40103', kolCode: '62', groupCode: '6', title: 'تخفیفات نقدی اعطایی فروش', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'کاهنده درآمد فروش' },

  // معین‌های کل ۷۰ و ۷۱: بهای تمام‌شده
  { code: '50101', kolCode: '70', groupCode: '7', title: 'بهای تمام‌شده کالای فروش‌رفته', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'قیمت خرید اقلام فروش‌رفته' },
  { code: '50102', kolCode: '71', groupCode: '7', title: 'بهای تمام‌شده پروژه‌ها و خدمات مستقیم', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'دستمزد مستقیم پروژه و مصالح مصرفی' },

  // معین‌های کل ۸۰ تا ۸۴: هزینه‌های عملیاتی
  { code: '60101', kolCode: '80', groupCode: '8', title: 'هزینه‌های حقوق و دستمزد پرسنلی', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'حقوق ناخالص و بن و مسکن پرسنل' },
  { code: '60102', kolCode: '81', groupCode: '8', title: 'هزینه‌های اجاره، قبوض و سربار اداری', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'اجاره دفتر، انبار، شارژ، برق، تلفن و ملزومات' },
  { code: '60103', kolCode: '82', groupCode: '8', title: 'هزینه‌های بازاریابی، سفر و توسعه بازار', nature: 'debit', isFloatingTafsiliAllowed: true, isSystem: true, description: 'تبلیغات آنلاین، چاپ بروشور و هزینه‌های ایاب و ذهاب' },
  { code: '60104', kolCode: '83', groupCode: '8', title: 'هزینه‌های مالی و کارمزد بانکی', nature: 'debit', isFloatingTafsiliAllowed: false, isSystem: true, description: 'کارمزد پوز، صدور چک و خدمات ساتنا/پایا' },
];

const LOCAL_STORAGE_CUSTOM_MOEINS_KEY = 'habino_custom_moeins_v1';

/**
 * دریافت لیست ترکیبی معین‌ها (استاندارد + سفارشی کاربر)
 */
export function getAllAccountMoeins(): AccountMoein[] {
  if (typeof window === 'undefined') return STANDARD_ACCOUNT_MOEINS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_MOEINS_KEY);
    if (!raw) return STANDARD_ACCOUNT_MOEINS;
    const custom: AccountMoein[] = JSON.parse(raw);
    return [...STANDARD_ACCOUNT_MOEINS, ...custom];
  } catch (err) {
    console.error('Error loading custom moeins:', err);
    return STANDARD_ACCOUNT_MOEINS;
  }
}

/**
 * افزودن حساب معین جدید کاربرساز
 */
export function addCustomAccountMoein(moein: AccountMoein): { success: boolean; message: string } {
  if (!moein.code || !moein.title || !moein.kolCode || !moein.groupCode) {
    return { success: false, message: 'اطلاعات واردشده ناقص است.' };
  }

  const all = getAllAccountMoeins();
  if (all.some(m => m.code === moein.code)) {
    return { success: false, message: `کد حساب معین ${moein.code} قبلاً تعریف شده است.` };
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_MOEINS_KEY);
    const existing: AccountMoein[] = raw ? JSON.parse(raw) : [];
    existing.push({ ...moein, isSystem: false });
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_MOEINS_KEY, JSON.stringify(existing));
    return { success: true, message: `حساب معین «${moein.title}» با کد ${moein.code} با موفقیت افزوده شد.` };
  } catch (err) {
    return { success: false, message: 'خطا در ذخیره‌سازی حساب معین در حافظه محلی.' };
  }
}

/**
 * یافتن اطلاعات حساب (گروه، کل، معین) از روی کد
 */
export function resolveAccountCoding(code: string): {
  group?: AccountGroup;
  kol?: AccountKol;
  moein?: AccountMoein;
} {
  const moeins = getAllAccountMoeins();
  const matchedMoein = moeins.find(m => m.code === code);
  
  if (matchedMoein) {
    const kol = STANDARD_ACCOUNT_KOLS.find(k => k.code === matchedMoein.kolCode);
    const group = STANDARD_ACCOUNT_GROUPS.find(g => g.code === matchedMoein.groupCode);
    return { moein: matchedMoein, kol, group };
  }

  // اگر کد ۲ رقمی بود (کل)
  const matchedKol = STANDARD_ACCOUNT_KOLS.find(k => k.code === code);
  if (matchedKol) {
    const group = STANDARD_ACCOUNT_GROUPS.find(g => g.code === matchedKol.groupCode);
    return { kol: matchedKol, group };
  }

  // اگر کد ۱ رقمی بود (گروه)
  const matchedGroup = STANDARD_ACCOUNT_GROUPS.find(g => g.code === code);
  if (matchedGroup) {
    return { group: matchedGroup };
  }

  return {};
}

/**
 * تولید خودکار کد معین بعدی برای یک حساب کل
 */
export function generateNextMoeinCode(kolCode: string): string {
  const allMoeins = getAllAccountMoeins().filter(m => m.kolCode === kolCode);
  if (allMoeins.length === 0) {
    return `${kolCode}01`;
  }
  const numericCodes = allMoeins
    .map(m => parseInt(m.code, 10))
    .filter(n => !isNaN(n));
  if (numericCodes.length === 0) {
    return `${kolCode}01`;
  }
  const max = Math.max(...numericCodes);
  return (max + 1).toString();
}
