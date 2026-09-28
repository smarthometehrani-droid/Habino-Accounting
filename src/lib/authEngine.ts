/**
 * Habino Multi-Tenant & RBAC Engine
 * Architecture: Multi-Tenant with Tenant Isolation, 5-Tier User Roles,
 * Strategy Pattern for Business Guilds, and Composite Pattern for Metadata.
 */

import {
  AppUser,
  Tenant,
  UserRole,
  UserPermission,
  GuildType,
  GuildBusinessStrategy,
  UserAuditLog,
  FormFieldComponent,
  SubscriptionPlanType,
  TenantSubscription,
  AddonItem
} from '../types';

// ============================================================================
// 1. SUBSCRIPTION PLANS & ENTITLEMENT LIMITS (سطح ۲: پکیج خریداری‌شده)
// ============================================================================

export interface PlanEntitlementInfo {
  plan: SubscriptionPlanType;
  planNameFa: string;
  badgeColor: string;
  maxUsers: number;
  priceToman: number;
  description: string;
  allowedModules: string[];
  restrictedReasonFa: string;
}

export const PLAN_LIMITS: Record<SubscriptionPlanType, PlanEntitlementInfo> = {
  starter: {
    plan: 'starter',
    planNameFa: 'پکیج پایه (اصناف خرد)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    maxUsers: 1,
    priceToman: 990000,
    description: 'مناسب فروشگاه‌ها و خدمات خرد تک‌کاربره. صدور فاکتور، مشتریان و ثبت نقدی.',
    allowedModules: [
      'dashboard',
      'invoices',
      'transactions',
      'clients',
      'banks',
      'settings',
      'user_management',
      'backup'
    ],
    restrictedReasonFa: 'این قابلیت نیازمند ارتقا به پکیج حرفه‌ای یا سازمانی هابینو است.'
  },
  professional: {
    plan: 'professional',
    planNameFa: 'پکیج حرفه‌ای (در حال رشد)',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    maxUsers: 5,
    priceToman: 2490000,
    description: 'مدیریت چک‌های صیادی، اقساط، انبارداری با فرم‌ساز اصناف، بارکدخوان و دستیار صوتی.',
    allowedModules: [
      'dashboard',
      'analytics',
      'invoices',
      'checks',
      'installments',
      'transactions',
      'clients',
      'inventory',
      'barcode_scanner',
      'banks',
      'projects',
      'synapse',
      'settings',
      'user_management',
      'license',
      'backup'
    ],
    restrictedReasonFa: 'ماژول دفاتر دوبل، استودیوی ۵ ایجنت و ممیزی پیشرفته منحصراً در پکیج سازمانی فعال است.'
  },
  enterprise: {
    plan: 'enterprise',
    planNameFa: 'پکیج کامل سازمانی (نامحدود)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    maxUsers: 999,
    priceToman: 5900000,
    description: 'دسترسی کامل به دفاتر کل دوبل، ترازنامه، استودیو ۵ ایجنت، عیب‌یاب هوشمند و کاربران نامحدود.',
    allowedModules: [
      'dashboard',
      'analytics',
      'hub',
      'invoices',
      'checks',
      'installments',
      'transactions',
      'clients',
      'inventory',
      'barcode_scanner',
      'banks',
      'projects',
      'did_protocol',
      'open_commerce',
      'payroll',
      'ledger',
      'reports',
      'synapse',
      'diagnostics',
      'agents_studio',
      'user_management',
      'license',
      'backup',
      'roadmap',
      'settings'
    ],
    restrictedReasonFa: ''
  }
};

// ============================================================================
// 1.1 MODULAR ADD-ONS (افزونه‌های ماژولار هابینو - مصوب کتابخانه دانش)
// ============================================================================

export const HABINO_ADDONS: AddonItem[] = [
  {
    id: 'addon_synapse',
    title: 'هوش صوتی سیناپس (Gemini Live AI CFO)',
    category: 'operational',
    priceToman: 990000,
    billingType: 'yearly',
    badge: 'هوش صوتی بلادرنگ',
    description: 'فعال‌سازی دستیار صوتی هوشمند CFO، تحلیل نقدینگی و پاسخگویی کلامی با پروتکل صدای فرید تهرانی برای سطوح ۱ و ۲.',
    unlocksModules: ['synapse'],
    status: 'available',
    roadmapPhase: 'فاز ۵',
    problemFa: 'نیاز مدیران به آگاهی سریع از وضعیت جریان وجوه نقد بدون نیاز به باز کردن گزارش‌های پیچیده.',
    solutionFa: 'موتور صوتی دوطرفه و مشاور هوشمند بر بستر مدل Gemini Live متصل به دیتابیس هابینو.',
    revenueModelFa: 'اشتراک سالانه ۹۹۰,۰۰۰ تومان به عنوان افزونه ماژولار.'
  },
  {
    id: 'addon_payroll',
    title: 'حقوق، دستمزد و لیست بیمه تأمین اجتماعی',
    category: 'operational',
    priceToman: 750000,
    billingType: 'yearly',
    badge: 'قوانین کار و بیمه',
    description: 'محاسبه دقیق حق بیمه (۷٪، ۲۰٪، ۳٪ بیکاری)، مالیات حقوق، تولید دیسکت بیمه و فایل شتاب بانک.',
    unlocksModules: ['payroll'],
    status: 'available',
    roadmapPhase: 'فاز ۲',
    problemFa: 'پیچیدگی محاسبات کسورات بیمه و مالیات حقوق پرسنل در پایان هر ماه.',
    solutionFa: 'موتور محاسباتی خودکار با سرفصل‌های ۳ سطحی و تولید خروجی استاندارد بانک و تأمین اجتماعی.',
    revenueModelFa: 'اشتراک سالانه ۷۵۰,۰۰۰ تومان.'
  },
  {
    id: 'addon_barcode_scanner',
    title: 'استودیو بارکدخوان و اتصال پایانه‌های POS',
    category: 'operational',
    priceToman: 450000,
    billingType: 'lifetime',
    badge: 'سخت‌افزار و تسویه',
    description: 'اسکن بارکدهای خطی و دوبعدی با دوربین/تفنگی و اتصال به دستگاه‌های کارتخوان PC-POS بانکی.',
    unlocksModules: ['barcode_scanner'],
    status: 'available',
    roadmapPhase: 'فاز ۱',
    problemFa: 'ورود دستی کد کالاها و تسویه حساب کند مشتریان در صندوق.',
    solutionFa: 'وب‌اسکنر محلی وب‌کم و پشتیبانی از پورت‌های سریال پوز بانکی.',
    revenueModelFa: 'لایسنس مادام‌العمر ۴۵۰,۰۰۰ تومان.'
  },
  {
    id: 'addon_extra_seats',
    title: 'صندلی کاربر سازمانی اضافی (Extra Seats)',
    category: 'operational',
    priceToman: 350000,
    billingType: 'yearly',
    badge: 'توسعه تیم',
    description: 'افزودن کاربر همزمان اضافی با نقش‌های تفکیک‌شده (انباردار، صندوق‌دار، حسابدار) به پکیج‌های پایه و حرفه‌ای.',
    unlocksModules: ['user_management'],
    status: 'available',
    roadmapPhase: 'فاز ۴',
    problemFa: 'محدودیت تعداد کاربر در پلن‌های پایه بدون نیاز به خرید پلن‌های سازمانی گران‌تر.',
    solutionFa: 'تخصیص سهمیه کاربر اضافی با کنترل دسترسی RBAC.',
    revenueModelFa: 'هر صندلی سالانه ۳۵۰,۰۰۰ تومان.'
  },
  // --- افزونه‌های استراتژیک آینده (مصوب رودمپ) ---
  {
    id: 'addon_smb_sales_agent',
    title: 'دستیار هوشمند پشتیبانی و فروش برای کسب‌وکارهای محلی (AI Sales & Support Agent)',
    category: 'future_strategic',
    priceToman: 1200000,
    billingType: 'monthly',
    badge: 'به‌زودی در فاز ۵',
    description: 'اتصال بدون کدنویسی به اینستاگرام، واتساپ و وب‌سایت؛ آموزش‌دیده روی کاتالوگ هابینو جهت پاسخگویی، نوبت‌دهی و ثبت فاکتور خودکار.',
    unlocksModules: ['open_commerce'],
    status: 'coming_soon',
    roadmapPhase: 'فاز ۵ (هوش تحلیلی و ارتباطات)',
    problemFa: 'کسب‌وکارهای کوچک و متوسط توان استخدام تیم پشتیبانی ۲۴ ساعته را ندارند و لیدهای شبکه‌های اجتماعی را از دست می‌دهند.',
    solutionFa: 'ابزار نوکد متصل به واتساپ/اینستاگرام با قابلیت صدور فاکتور و رزرو نوبت مستقیم در هابینو.',
    revenueModelFa: 'اشتراک ماهیانه SaaS بر اساس تعداد مکالمات + کارمزد روی تراکنش‌های موفق.'
  },
  {
    id: 'addon_invoice_ocr_parser',
    title: 'پلتفرم اتوماسیون اسناد و صورتحساب‌های مالی (Automated Financial & Invoice Parser)',
    category: 'future_strategic',
    priceToman: 1500000,
    billingType: 'pay_per_use',
    badge: 'به‌زودی در فاز ۶',
    description: 'موتور بینایی ماشین و هوش مصنوعی برای تبدیل عکس و PDF فاکتورها، رسیدها و صورتحساب‌های بانکی به اسناد دوبل حسابداری.',
    unlocksModules: ['ledger'],
    status: 'coming_soon',
    roadmapPhase: 'فاز ۶ (اتوماسیون مالی و اسناد)',
    problemFa: 'اتلاف صدها ساعت زمان تیم‌های حسابداری در ورود دستی فاکتورها و صورتحساب‌ها با خطای انسانی بالا.',
    solutionFa: 'OCR تخصصی اسناد فارسی/انگلیسی و تزریق آنی آرتیکل‌های بدهکار/بستانکار به دفتر روزنامه.',
    revenueModelFa: 'پرداخت به ازای هر سند (Pay-per-document) یا اشتراک پلکانی ماهیانه.'
  },
  {
    id: 'addon_basket_logistics',
    title: 'ابزار بهینه‌سازی و شخصی‌سازی سبد خرید و لوجستیک خرد (Basket Optimization & Logistics)',
    category: 'future_strategic',
    priceToman: 2800000,
    billingType: 'monthly',
    badge: 'به‌زودی در فاز ۷',
    description: 'موتور تحلیل سبدهای خرید چندتأمینی جهت حداقل‌سازی هزینه ارسال خریدار و هزینه تأمین فروشنده.',
    unlocksModules: ['open_commerce'],
    status: 'coming_soon',
    roadmapPhase: 'فاز ۷ (لوجستیک و ارکستراسیون)',
    problemFa: 'چالش پیچیدگی محاسبه هزینه‌های ارسال و چندپارگی سبد خرید در فروشگاه‌های چندتأمین‌کننده‌ای.',
    solutionFa: 'موتور الگوریتمی ترکیب بهینه سفارشات انبارش و توزیع.',
    revenueModelFa: 'مدل سازمانی B2B با دریافت حق لایسنس یا سهمی از صرفه‌جویی مالی اثبات‌شده.'
  },
  {
    id: 'addon_multiagent_orchestrator',
    title: 'ارکستریتور و مدیریت جریان‌کاری عوامل هوش مصنوعی (Multi-Agent Workflow Orchestrator)',
    category: 'future_strategic',
    priceToman: 3500000,
    billingType: 'monthly',
    badge: 'به‌زودی در فاز ۷',
    description: 'محیط بصری Drag-and-Drop برای تعریف، نظارت و اتصال ایجنت‌های مستقل تخصصی هابینو به پایگاه داده و مدیریت پایپ‌لاین تعاملی.',
    unlocksModules: ['agents_studio'],
    status: 'coming_soon',
    roadmapPhase: 'فاز ۷ (لوجستیک و ارکستراسیون)',
    problemFa: 'فقدان بستر بصری برای مانیتورینگ و مدیریت ارتباطات متقابل ایجنت‌های هوش مصنوعی مستقل در شرکت‌ها.',
    solutionFa: 'داشبورد گرافیکی اتصال ایجنت‌ها با مانیتورینگ بلادرنگ جریان پیام‌ها و تصمیمات.',
    revenueModelFa: 'اشتراک ماهیانه سازمانی بر اساس تعداد ایجنت و حجم وظایف پردازش‌شده.'
  }
];

// ============================================================================
// 2. DEFAULT PREDEFINED TENANTS (ایزولاسیون کامل چند مستأجری با لایسنس)
// ============================================================================

export const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'tenant-main',
    name: 'شرکت فناوری اطلاعات و مهندسی هابینو',
    slug: 'habino-tech',
    guildType: 'technology',
    ownerEmail: 'tehrani.smart51@gmail.com',
    ownerName: 'مهندس فرید تهرانی',
    status: 'active',
    createdAt: '1402/01/15',
    subscription: {
      plan: 'enterprise',
      planNameFa: 'پکیج کامل سازمانی (نامحدود)',
      status: 'active',
      maxUsers: 999,
      expiresAt: '1405/01/01',
      isLifetime: true,
      serialKey: 'HABINO-ENT-2026-TEHRANI-MASTER'
    },
    metadata: {
      economicCode: '411543219876',
      nationalId: '14008954321',
      registrationNumber: '543210',
      guildCategory: 'فناوری اطلاعات و نرم‌افزارهای یکپارچه ابری',
      themeColor: '#2563eb',
      mowadianClientId: 'HABINO-MOWADIAN-CLIENT-001',
      autoDoubleEntryEnabled: true,
      customFields: {
        slaLevel: 'Tier-4 Gold Enterprise',
        backupFrequency: 'Daily-Automated'
      }
    },
    stats: {
      usersCount: 1,
      invoicesCount: 0,
      balance: 0
    }
  },
  {
    id: 'tenant-alborz',
    name: 'شرکت تجارت و بازرگانی نوین البرز',
    slug: 'alborz-tech',
    guildType: 'commercial',
    ownerEmail: 'moradi@alborz-trade.ir',
    ownerName: 'مهندس علیرضا مرادی',
    status: 'active',
    createdAt: '1402/08/20',
    subscription: {
      plan: 'professional',
      planNameFa: 'پکیج حرفه‌ای (در حال رشد)',
      status: 'active',
      maxUsers: 5,
      expiresAt: '1403/12/29',
      isLifetime: false,
      serialKey: 'HABINO-PRO-1403-ALBORZ-TRADE'
    },
    metadata: {
      economicCode: '411876543210',
      nationalId: '14009876543',
      registrationNumber: '432198',
      guildCategory: 'تجهیزات شبکه و خدمات پشتیبانی سازمانی',
      themeColor: '#059669',
      mowadianClientId: 'ALBORZ-MOWADIAN-CLIENT-002',
      autoDoubleEntryEnabled: true,
      customFields: {
        warehouseCount: 2,
        posTerminalId: 'POS-88991122'
      }
    },
    stats: {
      usersCount: 1,
      invoicesCount: 0,
      balance: 0
    }
  },
  {
    id: 'tenant-sepahan',
    name: 'شرکت مهندسی و پیمانکاری سپاهان طرح',
    slug: 'sepahan-contracting',
    guildType: 'services',
    ownerEmail: 'info@sepahan-contracting.ir',
    ownerName: 'مهندس محمدرضا شفیعی',
    ownerPhone: '۰۳۱-۳۳۳۳۴۴۵۵',
    status: 'active',
    createdAt: '1403/02/10',
    subscription: {
      plan: 'starter',
      planNameFa: 'پکیج پایه (اصناف و پیمانکاری)',
      status: 'active',
      maxUsers: 5,
      expiresAt: '1404/02/10',
      isLifetime: false,
      serialKey: 'HABINO-START-1403-SEPAHAN-BASIC'
    },
    metadata: {
      economicCode: '411223344556',
      nationalId: '14007788990',
      registrationNumber: '654321',
      guildCategory: 'پیمانکاری عمرانی و تأسیسات',
      address: 'اصفهان، شهرک صنعتی محمودآباد، بلوار کارگر، پلاک ۱۱۰',
      themeColor: '#d97706',
      mowadianClientId: 'SEPAHAN-MOWADIAN-CLIENT-003',
      autoDoubleEntryEnabled: false,
      customFields: {
        activeContractCount: 1,
        tenderEscrowSupported: false
      }
    },
    stats: {
      usersCount: 1,
      invoicesCount: 0,
      balance: 0
    }
  }
];

// ============================================================================
// 3. ROLE PERMISSION MATRIX (سطح ۳: سطوح دسترسی کاربران مستأجر)
// ============================================================================

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  super_admin: [
    'platform:manage_tenants',
    'platform:view_all_data',
    'tenant:manage_users',
    'tenant:manage_settings',
    'tenant:manage_license',
    'accounting:access_ledger',
    'accounting:manage_invoices',
    'accounting:manage_checks',
    'accounting:manage_payroll',
    'accounting:view_reports',
    'accounting:view_profit',
    'accounting:delete_records',
    'inventory:manage_stock',
    'tax:submit_mowadian',
    'ai:use_synapse_cfo'
  ],
  hubino_support: [
    'platform:view_all_data',
    'accounting:view_reports'
  ],
  tenant_owner: [
    'tenant:manage_users',
    'tenant:manage_settings',
    'tenant:manage_license',
    'accounting:access_ledger',
    'accounting:manage_invoices',
    'accounting:manage_checks',
    'accounting:manage_payroll',
    'accounting:view_reports',
    'accounting:view_profit',
    'accounting:delete_records',
    'inventory:manage_stock',
    'tax:submit_mowadian',
    'ai:use_synapse_cfo'
  ],
  tenant_accountant: [
    'accounting:access_ledger',
    'accounting:manage_invoices',
    'accounting:manage_checks',
    'accounting:manage_payroll',
    'accounting:view_reports',
    'accounting:view_profit',
    'inventory:manage_stock',
    'tax:submit_mowadian',
    'ai:use_synapse_cfo'
  ],
  tenant_cashier: [
    'accounting:manage_invoices',
    'accounting:manage_checks',
    'inventory:manage_stock'
  ],
  tenant_inventory: [
    'inventory:manage_stock',
    'accounting:manage_invoices'
  ],
  tenant_auditor: [
    'accounting:view_reports'
  ]
};

export const ROLE_DETAILS_FA: Record<UserRole, { title: string; badgeColor: string; description: string; tierLevel: 'platform' | 'tenant_admin' | 'tenant_staff' }> = {
  super_admin: {
    title: 'ادمین ارشد هابینو (Super Admin)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'سطح ۱ پلتفرم: دسترسی فراگیر به کل سیستم، جابجایی نامحدود بین تمام مستأجران و مدیریت لایسنس‌ها.',
    tierLevel: 'platform'
  },
  hubino_support: {
    title: 'پشتیبان فنی هابینو (Hubino Support)',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'سطح ۱ پلتفرم: عیب‌یابی سیستم، بررسی لاگ‌های خطا و وضعیت سرور بدون دسترسی به ارقام محرمانه مالی مشتریان.',
    tierLevel: 'platform'
  },
  tenant_owner: {
    title: 'کارفرما و مالک کسب‌وکار (Tenant Owner)',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'سطح ۳ مستأجر: مدیر ارشد شرکت، مدیریت پرسنل، تخصیص دسترسی‌ها، تغییر تنظیمات و فعال‌سازی لایسنس.',
    tierLevel: 'tenant_admin'
  },
  tenant_accountant: {
    title: 'حسابدار ارشد (Senior Accountant)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'سطح ۳ مستأجر: ثبت اسناد دوبل، دفاتر کل و روزنامه، سود و زیان، ترازنامه، ثبت چک‌ها و بستن حساب‌ها.',
    tierLevel: 'tenant_staff'
  },
  tenant_cashier: {
    title: 'صندوق‌دار و متصدی فروش (Cashier)',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'سطح ۳ مستأجر: صدور سریع فاکتور، اسکن بارکد، دریافت وجه نقد و چک. محرمانه بودن سود خالص و دفاتر کل.',
    tierLevel: 'tenant_staff'
  },
  tenant_inventory: {
    title: 'انباردار و مجری خدمات (Inventory Clerk)',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    description: 'سطح ۳ مستأجر: مدیریت موجودی کالا، ثبت ورود/خروج کارگاه و فرم‌های فنی اصناف بدون دسترسی به ارقام مالی.',
    tierLevel: 'tenant_staff'
  },
  tenant_auditor: {
    title: 'حسابرس و ناظر مالی (External Auditor)',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'سطح ۳ مستأجر: دسترسی کاملاً فقط‌خواندنی (Read-Only) به ترازها و دفاتر جهت ممیزی بدون حق ویرایش یا حذف.',
    tierLevel: 'tenant_staff'
  }
};

// ============================================================================
// 4. PRE-SEEDED DEMO USERS (جهت آزمایش و اعتبارسنجی فوری بنیان‌گذار)
// ============================================================================

export const DEFAULT_USERS: AppUser[] = [
  {
    id: 'u-farid-superadmin',
    tenantId: 'tenant-main',
    email: 'tehrani.smart51@gmail.com',
    phone: '09120000000',
    fullName: 'Farid Tehrani',
    role: 'super_admin',
    permissions: ROLE_DEFAULT_PERMISSIONS.super_admin,
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    lastLoginAt: 'هم اکنون (آنلاین)',
    createdAt: '1402/01/01',
    notes: 'بنیان‌گذار و معمار ارشد پلتفرم هابینو حسابداری'
  },
  {
    id: 'u-support-habino',
    tenantId: 'tenant-main',
    email: 'support@habino.ir',
    phone: '09121111111',
    fullName: 'تیم پشتیبانی فنی هابینو',
    role: 'hubino_support',
    permissions: ROLE_DEFAULT_PERMISSIONS.hubino_support,
    status: 'active',
    lastLoginAt: 'امروز ۱۰:۳۰',
    createdAt: '1402/05/10',
    notes: 'پشتیبان مرکزی پلتفرم جهت عیب‌یابی لاگ‌ها و پایش سلامت دیتابیس'
  },
  {
    id: 'u-sara-accountant',
    tenantId: 'tenant-main',
    email: 'accountant@habino.ir',
    phone: '09122222222',
    fullName: 'سارا افشار (حسابدار ارشد)',
    role: 'tenant_accountant',
    permissions: ROLE_DEFAULT_PERMISSIONS.tenant_accountant,
    status: 'active',
    lastLoginAt: 'دیروز ۱۶:۴۵',
    createdAt: '1402/02/15',
    notes: 'مسئول دفاتر کل دوبل، ثبت اسناد و ارسال به سامانه مودیان'
  },
  {
    id: 'u-kamran-cashier',
    tenantId: 'tenant-main',
    email: 'cashier@habino.ir',
    phone: '09123333333',
    fullName: 'کامران رستمی (صندوق‌دار)',
    role: 'tenant_cashier',
    permissions: ROLE_DEFAULT_PERMISSIONS.tenant_cashier,
    status: 'active',
    lastLoginAt: 'امروز ۰۸:۱۵',
    createdAt: '1402/06/01',
    notes: 'اپراتور فروش، بارکدخوان و وصول دریافتی‌ها'
  },
  {
    id: 'u-behnam-inventory',
    tenantId: 'tenant-main',
    email: 'inventory@habino.ir',
    phone: '09124444444',
    fullName: 'بهنام ناصری (انباردار)',
    role: 'tenant_inventory',
    permissions: ROLE_DEFAULT_PERMISSIONS.tenant_inventory,
    status: 'active',
    lastLoginAt: 'امروز ۰۹:۰۰',
    createdAt: '1402/07/20',
    notes: 'مدیریت موجودی انبار و فرم‌های اصناف کارگاهی'
  },
  {
    id: 'u-dr-mahdavi-auditor',
    tenantId: 'tenant-main',
    email: 'auditor@habino.ir',
    phone: '09125555555',
    fullName: 'دکتر مهدوی (حسابرس مستقل)',
    role: 'tenant_auditor',
    permissions: ROLE_DEFAULT_PERMISSIONS.tenant_auditor,
    status: 'active',
    lastLoginAt: 'هفته گذشته',
    createdAt: '1403/01/10',
    notes: 'ممیزی صورت‌های مالی و ترازنامه فصلی بدون دسترسی به ویرایش'
  }
];

// ============================================================================
// 4. STRATEGY PATTERN FOR BUSINESS GUILDS (اصناف مختلف)
// ============================================================================

export const GUILD_STRATEGIES: Record<GuildType, GuildBusinessStrategy> = {
  services: {
    guildType: 'services',
    nameFa: 'صنف خدمات فنی و مهندسی',
    description: 'تمرکز بر محاسبه بهای تمام‌شده نفر-ساعت، صورت‌حساب‌های دوره‌ای و قراردادهای پشتیبانی.',
    defaultTaxRate: 10,
    requiresInventoryStock: false,
    requiresProjectContract: true,
    recommendedInvoiceTemplate: 'professional',
    customLedgerAccounts: [
      { code: '8101', title: 'بهای تمام‌شده ساعات کارشناسی', type: 'expense' },
      { code: '6102', title: 'درآمد خدمات پشتیبانی فنی', type: 'revenue' }
    ]
  },
  technology: {
    guildType: 'technology',
    nameFa: 'صنف فناوری اطلاعات، نرم‌افزار و ابری',
    description: 'تمرکز بر درآمدهای دوره‌ای اشتراک (SaaS MRR)، لایسنس‌ها، و پروژه‌های توسعه اجایل.',
    defaultTaxRate: 10,
    requiresInventoryStock: false,
    requiresProjectContract: true,
    recommendedInvoiceTemplate: 'modern',
    customLedgerAccounts: [
      { code: '6105', title: 'درآمد اشتراک نرم‌افزار و پلتفرم (MRR)', type: 'revenue' },
      { code: '8203', title: 'هزینه‌های سرور ابری و نگهداری زیرساخت', type: 'expense' }
    ]
  },
  contracting: {
    guildType: 'contracting',
    nameFa: 'صنف پیمانکاری، عمرانی و پروژه‌ای',
    description: 'ثبت صورت‌وضعیت‌ها، کسر ۱۰٪ حسن انجام کار و ۵٪ بیمه ماده ۳۸ قانون تامین اجتماعی.',
    defaultTaxRate: 10,
    requiresInventoryStock: true,
    requiresProjectContract: true,
    recommendedInvoiceTemplate: 'classic',
    customLedgerAccounts: [
      { code: '1108', title: 'سپرده حسن انجام کار نزد کارفرما', type: 'asset' },
      { code: '2105', title: 'سپرده بیمه ماده ۳۸ نزد کارفرما', type: 'asset' },
      { code: '6110', title: 'درآمد صورت‌وضعیت‌های کارکرد تایید شده', type: 'revenue' }
    ]
  },
  commercial: {
    guildType: 'commercial',
    nameFa: 'صنف بازرگانی، فروشگاهی و تأمین تجهیزات',
    description: 'مدیریت نقطه سفارش، انبار چندگانه، بهای تمام‌شده کالای فروش‌رفته (COGS) و مالیات ارزش افزوده.',
    defaultTaxRate: 10,
    requiresInventoryStock: true,
    requiresProjectContract: false,
    recommendedInvoiceTemplate: 'minimal',
    customLedgerAccounts: [
      { code: '1105', title: 'موجودی انبار کالای تجاری', type: 'asset' },
      { code: '8105', title: 'بهای تمام‌شده کالای فروش‌رفته (COGS)', type: 'expense' },
      { code: '6101', title: 'فروش ناخالص کالای تجاری', type: 'revenue' }
    ]
  }
};

// ============================================================================
// 5. COMPOSITE PATTERN FOR DYNAMIC FORMS & METADATA
// ============================================================================

export class FormCompositeNode {
  constructor(public config: FormFieldComponent) {}

  public getIdentifier(): string {
    return this.config.id;
  }

  public validate(value: any): { valid: boolean; errorFa?: string } {
    if (this.config.required && (value === undefined || value === null || value === '')) {
      return { valid: false, errorFa: `تکمیل فیلد «${this.config.label}» الزامی است.` };
    }
    return { valid: true };
  }

  public getChildren(): FormFieldComponent[] {
    return this.config.children || [];
  }
}

// ============================================================================
// 6. RBAC PERMISSION EVALUATOR & SECURITY CHECKS
// ============================================================================

export class HabinoAuthEngine {
  /**
   * Check if a user has a specific permission (Level 3)
   */
  public static hasPermission(user: AppUser | null, permission: UserPermission): boolean {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions.includes(permission);
  }

  /**
   * Check if a module is entitled based on the tenant's subscription plan (Level 2: Feature Entitlement)
   */
  public static isFeatureAllowedByPlan(
    plan: SubscriptionPlanType | undefined,
    moduleId: string
  ): { allowed: boolean; reasonFa?: string; requiredPlan?: SubscriptionPlanType } {
    const effectivePlan: SubscriptionPlanType = plan || 'starter';
    const planInfo = PLAN_LIMITS[effectivePlan];

    if (planInfo.allowedModules.includes(moduleId)) {
      return { allowed: true };
    }

    let requiredPlan: SubscriptionPlanType = 'enterprise';
    if (PLAN_LIMITS.professional.allowedModules.includes(moduleId)) {
      requiredPlan = 'professional';
    }

    return {
      allowed: false,
      reasonFa: `دسترسی به بخش «${moduleId}» در ${planInfo.planNameFa} قفل است. لطفاً نرم‌افزار را به ${PLAN_LIMITS[requiredPlan].planNameFa} ارتقا دهید.`,
      requiredPlan
    };
  }

  /**
   * Evaluate whether a user can access a specific UI module considering both Plan and Role (3-Tier Security)
   */
  public static canAccessModule(
    user: AppUser | null,
    moduleId: string,
    tenant?: Tenant
  ): { allowed: boolean; reasonFa?: string; gateType?: 'plan' | 'role'; requiredPlan?: SubscriptionPlanType } {
    if (!user) {
      return { allowed: false, reasonFa: 'جهت دسترسی به این بخش ابتدا وارد حساب کاربری خود شوید.', gateType: 'role' };
    }

    // LEVEL 1: Super Admin has unrestricted access everywhere
    if (user.role === 'super_admin') {
      return { allowed: true };
    }

    // LEVEL 1: Platform Support has technical/diagnostic access only
    if (user.role === 'hubino_support') {
      const allowedForSupport = [
        'dashboard',
        'analytics',
        'diagnostics',
        'backup',
        'user_management',
        'settings',
        'license'
      ];
      if (!allowedForSupport.includes(moduleId)) {
        return {
          allowed: false,
          reasonFa: 'پشتیبان فنی هابینو به دفاتر خصوصی مالی یا صدور فاکتور مشتریان دسترسی ندارد (اصل حریم داده‌ها).',
          gateType: 'role'
        };
      }
      return { allowed: true };
    }

    // LEVEL 2: Check Tenant Subscription Plan Entitlement & Modular Add-ons (Feature Gates)
    if (tenant && tenant.subscription) {
      // Check if an active add-on unlocks this module directly
      const activeAddons = tenant.subscription.activeAddons || [];
      const isUnlockedByAddon = activeAddons.some((addonId) => {
        const addon = HABINO_ADDONS.find((a) => a.id === addonId);
        return addon?.unlocksModules.includes(moduleId);
      });

      if (!isUnlockedByAddon) {
        const planCheck = HabinoAuthEngine.isFeatureAllowedByPlan(tenant.subscription.plan, moduleId);
        if (!planCheck.allowed) {
          return {
            allowed: false,
            reasonFa: planCheck.reasonFa,
            gateType: 'plan',
            requiredPlan: planCheck.requiredPlan
          };
        }
      }
    }

    // LEVEL 3: Check Tenant Internal User Role
    // Tenant Owner has access to all modules allowed by their subscription plan
    if (user.role === 'tenant_owner') {
      return { allowed: true };
    }

    // Tenant Accountant restrictions
    if (user.role === 'tenant_accountant') {
      if (moduleId === 'settings' || moduleId === 'license' || moduleId === 'user_management') {
        return {
          allowed: false,
          reasonFa: 'تنظیمات ساختاری شرکت، لایسنس و مدیریت پرسنل منحصراً در اختیار کارفرما (ادمین مستأجر) است.',
          gateType: 'role'
        };
      }
      return { allowed: true };
    }

    // Tenant Cashier restrictions
    if (user.role === 'tenant_cashier') {
      const allowedForCashier = [
        'dashboard',
        'invoices',
        'checks',
        'clients',
        'inventory',
        'barcode_scanner',
        'banks'
      ];
      if (!allowedForCashier.includes(moduleId)) {
        return {
          allowed: false,
          reasonFa: 'نقش صندوق‌دار صرفاً مجاز به صدور فاکتور، اسکن بارکد، ثبت چک و وصول نقد/کارتخوان است.',
          gateType: 'role'
        };
      }
      return { allowed: true };
    }

    // Tenant Inventory restrictions
    if (user.role === 'tenant_inventory') {
      const allowedForInventory = [
        'dashboard',
        'inventory',
        'barcode_scanner',
        'invoices'
      ];
      if (!allowedForInventory.includes(moduleId)) {
        return {
          allowed: false,
          reasonFa: 'نقش انباردار صرفاً به ماژول انبارداری، بارکدخوان و تحویل کالای فاکتورها دسترسی دارد.',
          gateType: 'role'
        };
      }
      return { allowed: true };
    }

    // Tenant Auditor (Read-Only)
    if (user.role === 'tenant_auditor') {
      const restrictedForAuditor = ['settings', 'license', 'backup', 'user_management', 'barcode_scanner'];
      if (restrictedForAuditor.includes(moduleId)) {
        return {
          allowed: false,
          reasonFa: 'حسابرس مستقل صرفاً به دفاتر مالی، ترازها، فاکتورها و گزارشات تحلیلی دسترسی دارد.',
          gateType: 'role'
        };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * Check if user can perform write/delete actions (Level 3 RBAC Mutation Security)
   */
  public static canMutateData(
    user: AppUser | null,
    action: 'create' | 'update' | 'delete'
  ): { allowed: boolean; reasonFa?: string } {
    if (!user) return { allowed: false, reasonFa: 'کاربر ناشناس' };
    
    if (user.role === 'super_admin' || user.role === 'tenant_owner') {
      return { allowed: true };
    }

    if (user.role === 'hubino_support') {
      return {
        allowed: false,
        reasonFa: 'نقش پشتیبان فنی هابینو مجاز به تغییر، حذف یا ثبت اسناد مالی در دیتابیس مشتری نیست.'
      };
    }

    if (user.role === 'tenant_auditor') {
      return {
        allowed: false,
        reasonFa: 'دسترسی حسابرس رسمی به صورت کاملاً فقط‌خواندنی (Read-Only) پیکربندی شده است.'
      };
    }

    if (action === 'delete') {
      if (user.role === 'tenant_cashier' || user.role === 'tenant_inventory') {
        return {
          allowed: false,
          reasonFa: 'پرسنل اجرایی (صندوق‌دار یا انباردار) مجاز به حذف دائمی اسناد مالی یا فاکتورها نیستند.'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Local Storage Loaders & Persistence
   */
  public static getRegisteredTenants(): Tenant[] {
    return this.loadTenants();
  }

  public static getTenantById(tenantId: string): Tenant | undefined {
    return this.loadTenants().find(t => t.id === tenantId);
  }

  public static loadTenants(): Tenant[] {
    if (typeof window === 'undefined') return DEFAULT_TENANTS;
    try {
      const saved = localStorage.getItem('habino_tenants');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading tenants:', e);
    }
    return DEFAULT_TENANTS;
  }

  public static saveTenants(tenants: Tenant[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('habino_tenants', JSON.stringify(tenants));
  }

  public static loadUsers(): AppUser[] {
    if (typeof window === 'undefined') return DEFAULT_USERS;
    try {
      const saved = localStorage.getItem('habino_users');
      if (saved) {
        const parsed: AppUser[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out obsolete demo mock accounts
          const cleanUsers = parsed.filter(
            u => u.email !== 'farid@habino.ir' &&
                 u.email !== 'moradi@alborz-tech.ir' &&
                 u.email !== 'sara.accountant@habino.ir' &&
                 u.email !== 'kamran.sales@alborz-tech.ir' &&
                 u.email !== 'auditor.rostagar@audit-iran.ir'
          );
          const hasFarid = cleanUsers.some(u => u.email === 'tehrani.smart51@gmail.com');
          if (!hasFarid) {
            cleanUsers.unshift(DEFAULT_USERS[0]);
          }
          HabinoAuthEngine.saveUsers(cleanUsers);
          return cleanUsers;
        }
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
    HabinoAuthEngine.saveUsers(DEFAULT_USERS);
    return DEFAULT_USERS;
  }

  public static saveUsers(users: AppUser[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('habino_users', JSON.stringify(users));
  }

  public static loadCurrentUser(): AppUser {
    if (typeof window === 'undefined') return DEFAULT_USERS[0];
    try {
      const saved = localStorage.getItem('habino_current_user');
      if (saved) {
        const parsed: AppUser = JSON.parse(saved);
        if (parsed && (parsed.email === 'tehrani.smart51@gmail.com' || (parsed.role !== 'super_admin' && parsed.email !== 'farid@habino.ir'))) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading current user:', e);
    }
    HabinoAuthEngine.saveCurrentUser(DEFAULT_USERS[0]);
    return DEFAULT_USERS[0]; // Default: Farid Tehrani (Super Admin)
  }

  public static saveCurrentUser(user: AppUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('habino_current_user', JSON.stringify(user));
  }

  public static loadAuditLogs(): UserAuditLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('habino_user_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading audit logs:', e);
    }
    return [
      {
        id: 'log-001',
        timestamp: '1403/06/15 - ۱۰:۴۵:۰۰',
        userId: 'u-farid-superadmin',
        userFullName: 'Farid Tehrani',
        tenantId: 'tenant-main',
        action: 'SUPER_ADMIN_AUTH',
        resource: 'Platform Kernel',
        details: 'احراز هویت سخت‌گیرانه و ورود امن سوپر ادمین ارشد (tehrani.smart51@gmail.com)'
      }
    ];
  }

  public static registerNewTenant(input: RegisterTenantInput): { tenant: Tenant; ownerUser: AppUser } {
    const planInfo = PLAN_LIMITS[input.plan || 'starter'];
    const tenantId = `tenant-${Date.now().toString(36)}`;
    const slug = input.businessName.trim().toLowerCase().replace(/[\s\W-]+/g, '-');

    const now = new Date();
    const trialExpireDate = new Date();
    trialExpireDate.setDate(now.getDate() + 30);
    const expiresAtShamsi = trialExpireDate.toLocaleDateString('fa-IR');

    const isTrialMode = input.isTrial !== false;

    const newTenant: Tenant = {
      id: tenantId,
      name: input.businessName,
      slug: slug || `biz-${Date.now().toString().slice(-4)}`,
      guildType: input.guildType,
      ownerEmail: input.email,
      ownerName: input.ownerFullName,
      status: 'active',
      createdAt: new Date().toLocaleDateString('fa-IR'),
      subscription: {
        plan: input.plan || 'starter',
        planNameFa: isTrialMode ? 'هدیه ۳۰ روزه هابینو (سطح پایه)' : planInfo.planNameFa,
        status: isTrialMode ? 'trial' : 'active',
        maxUsers: planInfo.maxUsers,
        expiresAt: isTrialMode ? expiresAtShamsi : '1405/12/29',
        trialEndsAt: trialExpireDate.toISOString(),
        trialDaysRemaining: 30,
        isLifetime: !isTrialMode && input.plan === 'enterprise',
        serialKey: input.serialKey || (isTrialMode ? `HABINO-TRIAL-30D-${Math.floor(1000 + Math.random() * 9000)}` : `HABINO-${input.plan.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}-VERIFIED`)
      },
      metadata: {
        economicCode: input.economicCode || '',
        nationalId: input.nationalId || '',
        registrationNumber: '',
        guildCategory: input.guildCategory,
        themeColor: input.plan === 'enterprise' ? '#7c3aed' : input.plan === 'professional' ? '#059669' : '#2563eb',
        autoDoubleEntryEnabled: input.plan === 'enterprise'
      },
      stats: {
        usersCount: 1,
        invoicesCount: 0,
        balance: 0
      }
    };

    const ownerUser: AppUser = {
      id: `u-owner-${Date.now()}`,
      tenantId: tenantId,
      email: input.email,
      phone: input.phone,
      fullName: input.ownerFullName,
      role: 'tenant_owner',
      permissions: ROLE_DEFAULT_PERMISSIONS.tenant_owner,
      status: 'active',
      createdAt: new Date().toLocaleDateString('fa-IR'),
      notes: `کارفرما و مالک کسب‌وکار (خریدار نسخه ${planInfo.planNameFa})`
    };

    return { tenant: newTenant, ownerUser };
  }

  public static addAuditLog(log: Omit<UserAuditLog, 'id' | 'timestamp'>): void {
    if (typeof window === 'undefined') return;
    try {
      const logs = HabinoAuthEngine.loadAuditLogs();
      const newLog: UserAuditLog = {
        ...log,
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleDateString('fa-IR') + ' - ' + new Date().toLocaleTimeString('fa-IR')
      };
      const updated = [newLog, ...logs.slice(0, 49)];
      localStorage.setItem('habino_user_audit_logs', JSON.stringify(updated));
    } catch (e) {
      console.error('Error adding audit log:', e);
    }
  }
}

export interface RegisterTenantInput {
  businessName: string;
  ownerFullName: string;
  email: string;
  phone: string;
  password?: string;
  guildType: GuildType;
  guildCategory: string;
  plan: SubscriptionPlanType;
  economicCode?: string;
  nationalId?: string;
  serialKey?: string;
  isTrial?: boolean;
  acceptedTerms?: boolean;
}

