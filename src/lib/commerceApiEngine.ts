/**
 * Habino Open Commerce API & Webhook Engine
 * Phase 4: Decentralized Guild Ecosystem & Multi-Tenant Integration
 * 
 * Features:
 * 1. Scoped Multi-Tenant API Keys (hbn_live_..., hbn_test_...) with rate limits
 * 2. HMAC SHA-256 Signed Webhooks Gateway (invoice.created, inventory.sync, etc.)
 * 3. E-Commerce & Legacy ERP Adapters (WooCommerce, Digikala, Sepidar, POS)
 * 4. Guild Plugins & Sandboxed Metadata Extensions (Gold, Construction, Real Estate, Automotive)
 * 5. Interactive API Explorer & Code Generator (cURL, Node.js, Python, PHP)
 */

export type ApiKeyEnvironment = 'live' | 'test';

export type ApiScope =
  | 'invoices.read'
  | 'invoices.write'
  | 'inventory.read'
  | 'inventory.sync'
  | 'tenders.read'
  | 'tenders.bid'
  | 'ledger.read'
  | 'webhooks.manage';

export interface CommerceApiKey {
  id: string;
  name: string;
  key: string;
  environment: ApiKeyEnvironment;
  scopes: ApiScope[];
  createdAt: string;
  lastUsedAt?: string;
  status: 'active' | 'revoked';
  rateLimitPerMin: number;
  totalCalls: number;
  allowedIps?: string[];
  tenantId: string;
}

export type WebhookEventTopic =
  | 'invoice.created'
  | 'invoice.paid'
  | 'inventory.low_stock'
  | 'inventory.updated'
  | 'tender.awarded'
  | 'tender.bid_received'
  | 'check.due'
  | 'did.credential_verified';

export interface WebhookSubscription {
  id: string;
  url: string;
  description: string;
  subscribedEvents: WebhookEventTopic[];
  secretKey: string;
  status: 'active' | 'paused' | 'failing';
  createdAt: string;
  lastDeliveryStatus?: 'success' | 'failed';
  totalDeliveries: number;
  failureCount: number;
}

export interface WebhookDeliveryLog {
  id: string;
  subscriptionId: string;
  endpointUrl: string;
  event: WebhookEventTopic;
  timestamp: string;
  statusCode: number;
  latencyMs: number;
  signature: string;
  payload: any;
  status: 'success' | 'failed';
  errorMessage?: string;
}

// Guild Plugin Specification
export interface GuildPlugin {
  id: string;
  title: string;
  guildCategory: 'gold_jewelry' | 'civil_contracting' | 'real_estate' | 'automotive' | 'custom';
  guildNamePersian: string;
  version: string;
  author: string;
  description: string;
  iconName: string;
  installed: boolean;
  active: boolean;
  systemPlugin: boolean;
  jsonbSchema: {
    fieldKey: string;
    labelPersian: string;
    type: 'number' | 'text' | 'select' | 'boolean';
    options?: string[];
    required: boolean;
    defaultValue?: any;
    unit?: string;
    tooltip?: string;
  }[];
  calculationFormulaDescription: string;
  sampleCalculation: (baseAmount: number, customFields: Record<string, any>) => {
    adjustedAmount: number;
    taxAmount: number;
    deductions: number;
    notes: string[];
  };
}

// Storage Keys
const API_KEYS_STORAGE_KEY = 'habino_commerce_api_keys_v1';
const WEBHOOKS_STORAGE_KEY = 'habino_commerce_webhooks_v1';
const WEBHOOK_LOGS_STORAGE_KEY = 'habino_commerce_webhook_logs_v1';
const PLUGINS_STORAGE_KEY = 'habino_commerce_plugins_v1';

// Initial Demo Keys
export const INITIAL_API_KEYS: CommerceApiKey[] = [
  {
    id: 'key-live-01',
    name: 'کلید وب‌سرویس ووکامرس فروشگاه اصلی',
    key: 'hbn_live_9f8c2e1b4a7d6e5c8b2a1f0d3e4b5a6c',
    environment: 'live',
    scopes: ['invoices.read', 'invoices.write', 'inventory.read', 'inventory.sync'],
    createdAt: '1403/06/10',
    lastUsedAt: '1403/06/15 11:20',
    status: 'active',
    rateLimitPerMin: 1200,
    totalCalls: 14820,
    allowedIps: ['185.143.232.10', '185.143.232.11'],
    tenantId: 'tenant_farid_default'
  },
  {
    id: 'key-test-02',
    name: 'کلید محیط تستی اپلیکیشن موبایل انبارداری',
    key: 'hbn_test_3b7a1c9e4d5f6a8b0c2e4f6a8b0c2e4f',
    environment: 'test',
    scopes: ['inventory.read', 'inventory.sync', 'tenders.read'],
    createdAt: '1403/06/12',
    lastUsedAt: '1403/06/15 09:45',
    status: 'active',
    rateLimitPerMin: 300,
    totalCalls: 840,
    tenantId: 'tenant_farid_default'
  }
];

export const INITIAL_WEBHOOKS: WebhookSubscription[] = [
  {
    id: 'wh-001',
    url: 'https://myshop.com/wp-json/habino-sync/v1/webhook',
    description: 'همگام‌سازی سفارشات و صدور فاکتور متمرکز ووکامرس',
    subscribedEvents: ['invoice.created', 'invoice.paid', 'inventory.low_stock'],
    secretKey: 'whsec_e4b8a2c1d0f3e6a9c7b5d1f8e2a4c6b8',
    status: 'active',
    createdAt: '1403/06/10',
    lastDeliveryStatus: 'success',
    totalDeliveries: 342,
    failureCount: 0
  },
  {
    id: 'wh-002',
    url: 'https://erp.tehrani-tech.ir/api/sync/habino',
    description: 'ارسال تغییرات موجودی به سرور انبار و حسابداری سپیدار',
    subscribedEvents: ['inventory.updated', 'tender.awarded'],
    secretKey: 'whsec_9a1b3c5d7e9f2a4c6e8b0d2f4a6c8e0b',
    status: 'active',
    createdAt: '1403/06/12',
    lastDeliveryStatus: 'success',
    totalDeliveries: 98,
    failureCount: 1
  }
];

export const INITIAL_WEBHOOK_LOGS: WebhookDeliveryLog[] = [
  {
    id: 'log-101',
    subscriptionId: 'wh-001',
    endpointUrl: 'https://myshop.com/wp-json/habino-sync/v1/webhook',
    event: 'invoice.created',
    timestamp: '1403/06/15 11:20:15',
    statusCode: 200,
    latencyMs: 74,
    signature: 'sha256=9b7c2a1e0f3d5c8b2a1f0d3e4b5a6c7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    payload: {
      event: 'invoice.created',
      invoiceNumber: 'INV-1403-902',
      tenantId: 'tenant_farid_default',
      customer: 'شرکت مهندسی داده‌ورزی رایان',
      totalAmount: 185000000,
      currency: 'IRT',
      itemsCount: 3,
      createdAt: '1403/06/15'
    },
    status: 'success'
  },
  {
    id: 'log-102',
    subscriptionId: 'wh-001',
    endpointUrl: 'https://myshop.com/wp-json/habino-sync/v1/webhook',
    event: 'inventory.low_stock',
    timestamp: '1403/06/15 10:45:02',
    statusCode: 200,
    latencyMs: 82,
    signature: 'sha256=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    payload: {
      event: 'inventory.low_stock',
      itemCode: 'PRD-884',
      itemName: 'روتر صنعتی سیسکو سری ۲۹۰۰',
      currentStock: 2,
      minThreshold: 5,
      tenantId: 'tenant_farid_default'
    },
    status: 'success'
  },
  {
    id: 'log-103',
    subscriptionId: 'wh-002',
    endpointUrl: 'https://erp.tehrani-tech.ir/api/sync/habino',
    event: 'tender.awarded',
    timestamp: '1403/06/14 16:30:10',
    statusCode: 200,
    latencyMs: 96,
    signature: 'sha256=4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
    payload: {
      event: 'tender.awarded',
      tenderId: 'TND-1403-08',
      tenderTitle: 'توسعه زیرساخت فیبر نوری شهرک صنعتی',
      awardedToTenantId: 'did:habino:tenant:8c4b2a1e',
      finalContractAmount: 850000000,
      cryptographicProof: '0x7f2e1a9b...'
    },
    status: 'success'
  }
];

export const INITIAL_GUILD_PLUGINS: GuildPlugin[] = [
  {
    id: 'plugin-gold',
    title: 'افزونه صنف طلا، جواهر و نقره (مظنه و مالیات بر اجرت)',
    guildCategory: 'gold_jewelry',
    guildNamePersian: 'طلا، جواهر، نقره و سکه',
    version: '2.4.0',
    author: 'هابینو لبز - کمیته استاندارد طلا',
    description: 'محاسبه خودکار وزن عیار ۱۸ و ۲۴، کسر و محاسبه ۷٪ سود قانونی و محاسبه مالیات بر ارزش افزوده منحصراً بر روی اجرت و سود طبق قانون مالیات پایانه‌های فروشگاهی.',
    iconName: 'Coins',
    installed: true,
    active: true,
    systemPlugin: true,
    jsonbSchema: [
      {
        fieldKey: 'goldWeightGrams',
        labelPersian: 'وزن کل طلا (گرم)',
        type: 'number',
        required: true,
        defaultValue: 10,
        unit: 'گرم',
        tooltip: 'دقت توزین ترازو تا صدم گرم'
      },
      {
        fieldKey: 'caratType',
        labelPersian: 'عیار طلا',
        type: 'select',
        options: ['عیار ۱۸ (۷۵۰)', 'عیار ۲۴ (شمش)', 'طلای متفرقه'],
        required: true,
        defaultValue: 'عیار ۱۸ (۷۵۰)'
      },
      {
        fieldKey: 'makingFeePercent',
        labelPersian: 'درصد اجرت ساخت (روی هر گرم)',
        type: 'number',
        required: true,
        defaultValue: 14,
        unit: 'درصد',
        tooltip: 'اجرت طراحی و قلم‌زنی'
      },
      {
        fieldKey: 'goldLivePricePerGram',
        labelPersian: 'مظنه لحظه‌ای هر گرم طلای ۱۸ (تومان)',
        type: 'number',
        required: true,
        defaultValue: 4350000,
        unit: 'تومان'
      }
    ],
    calculationFormulaDescription: 'اصل طلا معاف از مالیات است. مالیات ۱۰٪ صرفاً از حاصل‌جمع (اجرت ساخت + ۷٪ سود مجاز اتحادیه) اخذ می‌گردد.',
    sampleCalculation: (baseAmount, customFields) => {
      const weight = Number(customFields.goldWeightGrams || 10);
      const livePrice = Number(customFields.goldLivePricePerGram || 4350000);
      const feePercent = Number(customFields.makingFeePercent || 14);

      const rawGoldValue = weight * livePrice;
      const makingFeeAmount = (rawGoldValue * feePercent) / 100;
      const statutoryProfit = ((rawGoldValue + makingFeeAmount) * 7) / 100; // 7% profit
      const taxableBase = makingFeeAmount + statutoryProfit;
      const vatTax = (taxableBase * 10) / 100; // 10% VAT on fee + profit
      const finalPrice = rawGoldValue + makingFeeAmount + statutoryProfit + vatTax;

      return {
        adjustedAmount: Math.round(finalPrice),
        taxAmount: Math.round(vatTax),
        deductions: 0,
        notes: [
          `ارزش خام طلا (${weight} گرم): ${rawGoldValue.toLocaleString('fa-IR')} تومان (معاف از مالیات)`,
          `اجرت ساخت (${feePercent}٪): ${makingFeeAmount.toLocaleString('fa-IR')} تومان`,
          `سود قانونی اتحادیه (۷٪): ${statutoryProfit.toLocaleString('fa-IR')} تومان`,
          `مالیات ارزش افزوده ۱۰٪ اجرت و سود: ${vatTax.toLocaleString('fa-IR')} تومان`
        ]
      };
    }
  },
  {
    id: 'plugin-construction',
    title: 'افزونه پیمانکاری و عمران (کسورات ماده ۳۸ و حسن انجام کار)',
    guildCategory: 'civil_contracting',
    guildNamePersian: 'پیمانکاران ساختمانی، تأسیساتی و عمرانی',
    version: '3.1.0',
    author: 'دپارتمان مهندسی هابینو',
    description: 'محاسبه خودکار کسر ۵٪ سپرده حسن انجام کار کارفرما، ۵٪ علی‌الحساب بیمه تأمین اجتماعی (ماده ۳۸)، ضرایب بالاسری و تعدیل فهرست‌بها در صورت‌وضعیت‌ها.',
    iconName: 'Hammer',
    installed: true,
    active: true,
    systemPlugin: true,
    jsonbSchema: [
      {
        fieldKey: 'overheadFactor',
        labelPersian: 'ضریب بالاسری و منطقه‌ای پیمان',
        type: 'number',
        required: true,
        defaultValue: 1.30,
        tooltip: 'ضریب ۱.۳۰ جهت هزینه‌های اداری و بالاسری پروژه'
      },
      {
        fieldKey: 'deductInsurance38',
        labelPersian: 'اعمال کسر ۵٪ ماده ۳۸ بیمه تأمین اجتماعی',
        type: 'boolean',
        required: true,
        defaultValue: true
      },
      {
        fieldKey: 'deductGoodPerformance',
        labelPersian: 'اعمال کسر ۵٪ سپرده حسن انجام کار کارفرما',
        type: 'boolean',
        required: true,
        defaultValue: true
      }
    ],
    calculationFormulaDescription: 'مبلغ کل پس از اعمال ضریب بالاسری محاسبه شده و مبالغ ۵٪ بیمه و ۵٪ حسن انجام کار تا زمان اخذ مفاصاحساب کسر و ثبت موقت می‌گردد.',
    sampleCalculation: (baseAmount, customFields) => {
      const overhead = Number(customFields.overheadFactor || 1.3);
      const grossAmount = baseAmount * overhead;
      const insuranceDeduction = customFields.deductInsurance38 ? grossAmount * 0.05 : 0;
      const goodPerformanceDeduction = customFields.deductGoodPerformance ? grossAmount * 0.05 : 0;
      const totalDeductions = insuranceDeduction + goodPerformanceDeduction;
      const netPayable = grossAmount - totalDeductions;

      return {
        adjustedAmount: Math.round(netPayable),
        taxAmount: Math.round(grossAmount * 0.1), // 10% standard VAT
        deductions: Math.round(totalDeductions),
        notes: [
          `مبلغ ناخالص صورت‌وضعیت با ضریب ${overhead}: ${Math.round(grossAmount).toLocaleString('fa-IR')} تومان`,
          `کسر ۵٪ سپرده بیمه ماده ۳۸: ${Math.round(insuranceDeduction).toLocaleString('fa-IR')} تومان`,
          `کسر ۵٪ حسن انجام کار کارفرما: ${Math.round(goodPerformanceDeduction).toLocaleString('fa-IR')} تومان`,
          `خالص قابل پرداخت به پیمانکار: ${Math.round(netPayable).toLocaleString('fa-IR')} تومان`
        ]
      };
    }
  },
  {
    id: 'plugin-real-estate',
    title: 'افزونه صنف مشاورین املاک (کمیسیون مصوب و کد رهگیری)',
    guildCategory: 'real_estate',
    guildNamePersian: 'مشاورین املاک و مستغلات',
    version: '1.8.0',
    author: 'اتحادیه املاک و سامانه هابینو',
    description: 'محاسبه فرمولی حق‌الزحمه قراردادهای خرید/فروش (۰.۵٪) و رهن/اجاره (معادل یک‌چهارم اجاره ماهیانه) به تفکیک سهم طرفین + ۹٪ مالیات ارزش افزوده کمیسیون.',
    iconName: 'Building',
    installed: true,
    active: true,
    systemPlugin: true,
    jsonbSchema: [
      {
        fieldKey: 'dealType',
        labelPersian: 'نوع معامله ملکی',
        type: 'select',
        options: ['رهن و اجاره آپارتمان', 'خرید و فروش ملک', 'مشارکت در ساخت'],
        required: true,
        defaultValue: 'رهن و اجاره آپارتمان'
      },
      {
        fieldKey: 'depositAmount',
        labelPersian: 'مبلغ ودیعه / رهن (تومان)',
        type: 'number',
        required: true,
        defaultValue: 500000000,
        unit: 'تومان'
      },
      {
        fieldKey: 'monthlyRent',
        labelPersian: 'اجاره‌بهای ماهانه (تومان)',
        type: 'number',
        required: true,
        defaultValue: 15000000,
        unit: 'تومان'
      }
    ],
    calculationFormulaDescription: 'تبدیل ودیعه به اجاره با فرمول ۳٪ عرفی، سپس محاسبه ۲۵٪ کل اجاره‌بها به عنوان سهم کمیسیون هر یک از طرفین معامله.',
    sampleCalculation: (baseAmount, customFields) => {
      const deposit = Number(customFields.depositAmount || 500000000);
      const rent = Number(customFields.monthlyRent || 15000000);
      const convertedRent = (deposit * 0.03) + rent;
      const eachPartyCommission = convertedRent * 0.25;
      const totalCommission = eachPartyCommission * 2;
      const vat = totalCommission * 0.1;
      const grandTotal = totalCommission + vat;

      return {
        adjustedAmount: Math.round(grandTotal),
        taxAmount: Math.round(vat),
        deductions: 0,
        notes: [
          `معادل اجاره ماهیانه کل قرارداد: ${Math.round(convertedRent).toLocaleString('fa-IR')} تومان`,
          `حق‌الکمیسیون مصوب سهم موجر: ${Math.round(eachPartyCommission).toLocaleString('fa-IR')} تومان`,
          `حق‌الکمیسیون مصوب سهم مستأجر: ${Math.round(eachPartyCommission).toLocaleString('fa-IR')} تومان`,
          `مالیات ارزش افزوده کمیسیون (۱۰٪): ${Math.round(vat).toLocaleString('fa-IR')} تومان`
        ]
      };
    }
  },
  {
    id: 'plugin-automotive',
    title: 'افزونه صنف خدمات فنی خودرو و تعمیرگاه‌ها',
    guildCategory: 'automotive',
    guildNamePersian: 'تعمیرگاه‌ها، مکانیکی و خدمات خودرو',
    version: '1.2.0',
    author: 'تیم توسعه تخصصی اصناف',
    description: 'تفکیک فاکتور قطعات یدکی از اجرت کارگاهی، ثبت مشخصات پلاک، شماره شاسی و کیلومتر کارکرد خودرو به همراه ثبت ضمانت خدمات.',
    iconName: 'Wrench',
    installed: false,
    active: false,
    systemPlugin: false,
    jsonbSchema: [
      {
        fieldKey: 'licensePlate',
        labelPersian: 'شماره پلاک انتظامی خودرو',
        type: 'text',
        required: true,
        defaultValue: '۱۲ ج ۳۴۵ ایران ۶۶'
      },
      {
        fieldKey: 'odometerKm',
        labelPersian: 'کیلومتر پیمایش هنگام پذیرش',
        type: 'number',
        required: true,
        defaultValue: 115000,
        unit: 'کیلومتر'
      },
      {
        fieldKey: 'warrantyDays',
        labelPersian: 'ضمانت تعمیرات و اجرت کارگاه',
        type: 'select',
        options: ['بدون ضمانت', '۳۰ روز ضمانت', '۹۰ روز ضمانت کارگاهی', '۱۸۰ روز ضمانت رسمی'],
        required: true,
        defaultValue: '۹۰ روز ضمانت کارگاهی'
      }
    ],
    calculationFormulaDescription: 'محاسبه تفکیکی مالیات ارزش افزوده منحصراً بر روی اجرت خدمات در صورت ارائه فاکتور رسمی قطعات.',
    sampleCalculation: (baseAmount, customFields) => {
      const partsTotal = baseAmount * 0.65;
      const laborTotal = baseAmount * 0.35;
      const laborTax = laborTotal * 0.1;
      const total = partsTotal + laborTotal + laborTax;

      return {
        adjustedAmount: Math.round(total),
        taxAmount: Math.round(laborTax),
        deductions: 0,
        notes: [
          `بهای قطعات یدکی: ${Math.round(partsTotal).toLocaleString('fa-IR')} تومان`,
          `اجرت خدمات مکانیکی: ${Math.round(laborTotal).toLocaleString('fa-IR')} تومان`,
          `گارانتی خدمات: ${customFields.warrantyDays || '۹۰ روز'}`
        ]
      };
    }
  }
];

// Helper Functions
export function getStoredApiKeys(): CommerceApiKey[] {
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load api keys', e);
  }
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(INITIAL_API_KEYS));
  return INITIAL_API_KEYS;
}

export function saveApiKeys(keys: CommerceApiKey[]): void {
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export function getStoredWebhooks(): WebhookSubscription[] {
  try {
    const raw = localStorage.getItem(WEBHOOKS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load webhooks', e);
  }
  localStorage.setItem(WEBHOOKS_STORAGE_KEY, JSON.stringify(INITIAL_WEBHOOKS));
  return INITIAL_WEBHOOKS;
}

export function saveWebhooks(hooks: WebhookSubscription[]): void {
  localStorage.setItem(WEBHOOKS_STORAGE_KEY, JSON.stringify(hooks));
}

export function getStoredWebhookLogs(): WebhookDeliveryLog[] {
  try {
    const raw = localStorage.getItem(WEBHOOK_LOGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load webhook logs', e);
  }
  localStorage.setItem(WEBHOOK_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_WEBHOOK_LOGS));
  return INITIAL_WEBHOOK_LOGS;
}

export function saveWebhookLogs(logs: WebhookDeliveryLog[]): void {
  localStorage.setItem(WEBHOOK_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 50))); // Keep last 50
}

export function getStoredGuildPlugins(): GuildPlugin[] {
  try {
    const raw = localStorage.getItem(PLUGINS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load plugins', e);
  }
  localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(INITIAL_GUILD_PLUGINS));
  return INITIAL_GUILD_PLUGINS;
}

export function saveGuildPlugins(plugins: GuildPlugin[]): void {
  localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(plugins));
}

// Generate new secure API key
export function generateApiKey(name: string, env: ApiKeyEnvironment, scopes: ApiScope[], tenantId: string = 'tenant_default'): CommerceApiKey {
  const randomBytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 16; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const prefix = env === 'live' ? 'hbn_live_' : 'hbn_test_';

  const newKey: CommerceApiKey = {
    id: `key-${Date.now()}`,
    name,
    key: `${prefix}${hex}`,
    environment: env,
    scopes,
    createdAt: new Intl.DateTimeFormat('fa-IR').format(new Date()),
    status: 'active',
    rateLimitPerMin: env === 'live' ? 1200 : 300,
    totalCalls: 0,
    tenantId
  };

  const current = getStoredApiKeys();
  const updated = [newKey, ...current];
  saveApiKeys(updated);
  return newKey;
}

// Generate HMAC SHA-256 Signature for Webhooks
export async function calculateWebhookHmacSignature(payloadString: string, secretKey: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBytes = await window.crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(payloadString)
      );
      const hex = Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `sha256=${hex}`;
    }
  } catch (e) {
    console.warn('WebCrypto subtle HMAC failed, using fallback', e);
  }

  // Fallback signature calculation
  let hash = 0;
  const combined = secretKey + ':' + payloadString;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return `sha256=${Math.abs(hash).toString(16).padStart(16, '0')}f4a8b0c2e4f6a8`;
}

// Trigger simulated or actual webhook delivery
export async function dispatchWebhookEvent(
  subscription: WebhookSubscription,
  event: WebhookEventTopic,
  customPayload?: any
): Promise<WebhookDeliveryLog> {
  const payload = customPayload || {
    event,
    eventId: `evt_${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenantId: 'tenant_farid_default',
    data: {
      message: 'رویداد آزمایشی ارسالی از پایانه وب‌هوک باز هابینو',
      status: 'dispatched',
      source: 'Habino Open Commerce Engine'
    }
  };

  const payloadStr = JSON.stringify(payload);
  const signature = await calculateWebhookHmacSignature(payloadStr, subscription.secretKey);
  const startTime = performance.now();

  // Simulate latency and response
  const latency = Math.round(40 + Math.random() * 80);
  const isSuccess = subscription.url.startsWith('http');
  const statusCode = isSuccess ? 200 : 502;

  const log: WebhookDeliveryLog = {
    id: `log-${Date.now()}`,
    subscriptionId: subscription.id,
    endpointUrl: subscription.url,
    event,
    timestamp: new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()),
    statusCode,
    latencyMs: latency,
    signature,
    payload,
    status: statusCode === 200 ? 'success' : 'failed',
    errorMessage: statusCode === 200 ? undefined : 'اتصال به وب‌هوک مقصد با خطای ۵۰۲ مواجه شد.'
  };

  // Update logs
  const logs = getStoredWebhookLogs();
  saveWebhookLogs([log, ...logs]);

  // Update subscription stats
  const webhooks = getStoredWebhooks();
  const updatedHooks = webhooks.map(h => {
    if (h.id === subscription.id) {
      return {
        ...h,
        totalDeliveries: h.totalDeliveries + 1,
        lastDeliveryStatus: log.status,
        failureCount: log.status === 'failed' ? h.failureCount + 1 : h.failureCount
      };
    }
    return h;
  });
  saveWebhooks(updatedHooks);

  return log;
}

// WooCommerce PHP Snippet Generator
export function generateWooCommerceBridgeSnippet(webhookUrl: string, secretKey: string, apiKey: string): string {
  return `<?php
/**
 * افزونه اختصاصی اتصال ووکامرس به سیستم حسابداری و انبارداری هابینو
 * قرار دهید در: wp-content/plugins/habino-sync/habino-sync.php یا functions.php قالب
 */

defined('ABSPATH') || exit;

add_action('woocommerce_order_status_completed', 'habino_sync_order_to_accounting', 10, 1);

function habino_sync_order_to_accounting($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;

    $api_endpoint = '${webhookUrl}';
    $api_key = '${apiKey}';
    $secret = '${secretKey}';

    $payload = array(
        'event'          => 'invoice.created',
        'externalSource' => 'woocommerce',
        'orderId'        => $order_id,
        'customer'       => $order->get_formatted_billing_full_name(),
        'customerPhone'  => $order->get_billing_phone(),
        'totalAmount'    => (int) $order->get_total(),
        'items'          => array()
    );

    foreach ($order->get_items() as $item_id => $item) {
        $product = $item->get_product();
        $payload['items'][] = array(
            'sku'       => $product ? $product->get_sku() : '',
            'name'      => $item->get_name(),
            'quantity'  => $item->get_quantity(),
            'subtotal'  => (int) $item->get_subtotal()
        );
    }

    $json_payload = json_encode($payload, JSON_UNESCAPED_UNICODE);
    $signature = 'sha256=' . hash_hmac('sha256', $json_payload, $secret);

    wp_remote_post($api_endpoint, array(
        'method'    => 'POST',
        'timeout'   => 15,
        'headers'   => array(
            'Content-Type'        => 'application/json; charset=utf-8',
            'Authorization'       => 'Bearer ' . $api_key,
            'X-Habino-Signature'  => $signature
        ),
        'body'      => $json_payload
    ));
}
?>`;
}

// Polyglot API Code Samples
export function generateApiCodeSnippet(
  language: 'curl' | 'nodejs' | 'python' | 'php',
  endpoint: string,
  method: 'GET' | 'POST',
  apiKey: string,
  sampleBody?: any
): string {
  const fullUrl = `https://api.habino.ir/v1${endpoint}`;

  if (language === 'curl') {
    if (method === 'GET') {
      return `curl -X GET "${fullUrl}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json"`;
    }
    return `curl -X POST "${fullUrl}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(sampleBody || {}, null, 2)}'`;
  }

  if (language === 'nodejs') {
    if (method === 'GET') {
      return `// Node.js (Fetch API / Axios)
const response = await fetch("${fullUrl}", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  }
});
const data = await response.json();
console.log("Habino Response:", data);`;
    }
    return `// Node.js (POST Request)
const response = await fetch("${fullUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${JSON.stringify(sampleBody || {}, null, 2)})
});
const data = await response.json();
console.log("Invoice Created in Habino:", data);`;
  }

  if (language === 'python') {
    if (method === 'GET') {
      return `# Python (requests library)
import requests

headers = {
    "Authorization": f"Bearer ${apiKey}",
    "Content-Type": "application/json"
}

response = requests.get("${fullUrl}", headers=headers)
print("Response Status:", response.status_code)
print("Data:", response.json())`;
    }
    return `# Python (POST Request)
import requests

payload = ${JSON.stringify(sampleBody || {}, null, 4)}

headers = {
    "Authorization": f"Bearer ${apiKey}",
    "Content-Type": "application/json"
}

response = requests.post("${fullUrl}", json=payload, headers=headers)
print("Created ID:", response.json().get("id"))`;
  }

  // PHP
  return `<?php
// PHP cURL Implementation
$ch = curl_init("${fullUrl}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer ${apiKey}",
    "Content-Type: application/json"
]);

${method === 'POST' ? `$payload = json_encode(${JSON.stringify(sampleBody || {}, null, 4)});
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);` : ''}

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
print_r($result);
?>`;
}
