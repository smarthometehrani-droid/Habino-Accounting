import { FloatingTafsiliAccount, TafsiliType, Client, AccountingEntry } from '../types';

const LOCAL_STORAGE_TAFSILI_KEY = 'habino_floating_tafsili_accounts_v1';

/**
 * حساب‌های تفصیلی شناور پیش‌فرض (شرکا، مراکز هزینه و حساب‌های تنخواه)
 */
export const DEFAULT_FLOATING_TAFSILI: FloatingTafsiliAccount[] = [
  {
    id: 'tf-partner-farid',
    code: '4001',
    title: 'فرید تهرانی (مدیر ارشد و شریک)',
    type: 'partner',
    phone: '09121112233',
    nationalCode: '0012345678',
    notes: 'حساب جاری شریک اصلی و مدیریت عامل',
    isActive: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'tf-cost-center-hq',
    code: '4002',
    title: 'دفتر مرکزی و مدیریت (مرکز هزینه)',
    type: 'cost_center',
    notes: 'تخصیص هزینه‌های عمومی، اداری و دپارتمان مرکزی',
    isActive: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'tf-cost-center-tech',
    code: '4003',
    title: 'دپارتمان فنی، مهندسی و نرم‌افزار',
    type: 'cost_center',
    notes: 'هزینه‌ها و پروژه‌های تحقیق و توسعه و زیرساخت سرور',
    isActive: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'tf-fund-central',
    code: '4004',
    title: 'تنخواه‌گردان مرکزی شعبه اصلی',
    type: 'bank_fund',
    notes: 'صندوق نقدی و پرداخت‌های جاری خرد',
    isActive: true,
    created_at: new Date().toISOString()
  }
];

export const TAFSILI_TYPE_LABELS: Record<TafsiliType, { label: string; badgeColor: string; iconBg: string }> = {
  client: { label: 'مشتری / کارفرما', badgeColor: 'text-blue-700 bg-blue-50 border-blue-200', iconBg: 'bg-blue-500' },
  supplier: { label: 'تأمین‌کننده / فروشنده', badgeColor: 'text-amber-700 bg-amber-50 border-amber-200', iconBg: 'bg-amber-500' },
  partner: { label: 'شریک / سهامدار', badgeColor: 'text-purple-700 bg-purple-50 border-purple-200', iconBg: 'bg-purple-500' },
  personnel: { label: 'پرسنل و کارمند', badgeColor: 'text-teal-700 bg-teal-50 border-teal-200', iconBg: 'bg-teal-500' },
  cost_center: { label: 'مرکز هزینه / پروژه', badgeColor: 'text-rose-700 bg-rose-50 border-rose-200', iconBg: 'bg-rose-500' },
  bank_fund: { label: 'صندوق / تنخواه', badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-500' },
  other: { label: 'متفرقه و سایر', badgeColor: 'text-slate-700 bg-slate-50 border-slate-200', iconBg: 'bg-slate-500' },
};

/**
 * دریافت لیست تفصیلی‌های شناور مستقل ذخیره‌شده
 */
export function getSavedFloatingTafsili(): FloatingTafsiliAccount[] {
  if (typeof window === 'undefined') return DEFAULT_FLOATING_TAFSILI;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TAFSILI_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_TAFSILI_KEY, JSON.stringify(DEFAULT_FLOATING_TAFSILI));
      return DEFAULT_FLOATING_TAFSILI;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FLOATING_TAFSILI;
  } catch (err) {
    console.error('Error reading floating tafsili accounts:', err);
    return DEFAULT_FLOATING_TAFSILI;
  }
}

/**
 * تولید خودکار لیست تجمیعی تفصیلی‌های شناور
 * (شامل تفصیلی‌های اختصاصی + تبدیل خودکار مشتریان/تأمین‌کنندگان به تفصیلی سطح ۴ با کد اختصاصی)
 */
export function getUnifiedFloatingTafsiliList(clients: Client[] = []): FloatingTafsiliAccount[] {
  const saved = getSavedFloatingTafsili();
  const result: FloatingTafsiliAccount[] = [...saved];

  // کد شروع برای مشتریان: از ۴۱۰۰ به بعد
  let nextClientCode = 4100;

  clients.forEach((client, idx) => {
    // اگر قبلاً با شناسه clientId ثبت شده باشد، اضافه نشود
    const existingIndex = result.findIndex(t => t.entityId === client.id || t.id === `client-${client.id}`);
    if (existingIndex === -1) {
      const assignedCode = (nextClientCode + idx).toString();
      result.push({
        id: `client-${client.id}`,
        code: assignedCode,
        title: client.name || 'طرف‌حساب بدون نام',
        type: client.type === 'corporate' ? 'client' : 'client',
        entityId: client.id,
        phone: client.phone,
        nationalCode: client.nationalCode,
        economicCode: client.economicCode,
        address: client.address,
        notes: client.notes,
        isActive: true,
        created_at: client.created_at || new Date().toISOString()
      });
    }
  });

  return result;
}

/**
 * ذخیره تفصیلی شناور جدید (مثلاً شریک، سهامدار، مرکز هزینه)
 */
export function saveFloatingTafsili(account: Omit<FloatingTafsiliAccount, 'id' | 'created_at'>): {
  success: boolean;
  message: string;
  account?: FloatingTafsiliAccount;
} {
  if (!account.code || !account.title || !account.type) {
    return { success: false, message: 'کد تفصیلی، عنوان و نوع حساب الزامی است.' };
  }

  const existing = getSavedFloatingTafsili();
  if (existing.some(t => t.code === account.code)) {
    return { success: false, message: `کد تفصیلی ${account.code} قبلاً اختصاص داده شده است.` };
  }

  const newAccount: FloatingTafsiliAccount = {
    ...account,
    id: 'tf-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
    isActive: true,
    created_at: new Date().toISOString()
  };

  try {
    const updated = [newAccount, ...existing];
    localStorage.setItem(LOCAL_STORAGE_TAFSILI_KEY, JSON.stringify(updated));
    return {
      success: true,
      message: `حساب تفصیلی «${account.title}» با کد ${account.code} با موفقیت ایجاد شد.`,
      account: newAccount
    };
  } catch (err) {
    return { success: false, message: 'خطا در ذخیره‌سازی حساب تفصیلی.' };
  }
}

/**
 * تولید کد تفصیلی پیشنهادی جدید
 */
export function generateNextTafsiliCode(type: TafsiliType): string {
  const existing = getSavedFloatingTafsili();
  const numericCodes = existing.map(t => parseInt(t.code, 10)).filter(n => !isNaN(n) && n >= 4000);
  
  if (numericCodes.length === 0) {
    return '4010';
  }
  return (Math.max(...numericCodes) + 1).toString();
}

export interface TafsiliMoeinTurnover {
  moeinCode: string;
  moeinTitle: string;
  debit: number;
  credit: number;
  balance: number; // مثبت = بدهکار، منفی = بستانکار
  nature: 'debit' | 'credit';
  entriesCount: number;
}

export interface FloatingTafsiliStatement {
  tafsili: FloatingTafsiliAccount;
  totalDebit: number;
  totalCredit: number;
  netBalance: number; // مثبت = بدهکار کل، منفی = بستانکار کل
  status: 'debtor' | 'creditor' | 'settled';
  moeinBreakdown: TafsiliMoeinTurnover[];
  entries: (AccountingEntry & { runningBalance: number })[];
}

/**
 * استخراج کاردکس و تراز تفصیلی شناور در تمامی معین‌ها
 */
export function calculateFloatingTafsiliStatement(
  tafsili: FloatingTafsiliAccount,
  entries: AccountingEntry[]
): FloatingTafsiliStatement {
  // فیلتر کردن رکوردهای سند مرتبط با این تفصیلی شناور
  const matchedEntries = entries.filter(e => {
    if (e.tafsiliCode && e.tafsiliCode === tafsili.code) return true;
    if (tafsili.entityId && e.clientId === tafsili.entityId) return true;
    if (e.clientId === tafsili.id || e.referenceId === tafsili.id) return true;
    return false;
  });

  // مرتب‌سازی بر اساس تاریخ و شناسه
  matchedEntries.sort((a, b) => (a.date > b.date ? 1 : -1));

  let running = 0;
  const entriesWithRunning: (AccountingEntry & { runningBalance: number })[] = [];
  const moeinMap: Record<string, { moeinCode: string; moeinTitle: string; debit: number; credit: number; count: number }> = {};

  let totalDebit = 0;
  let totalCredit = 0;

  matchedEntries.forEach(entry => {
    const debit = Number(entry.debit) || 0;
    const credit = Number(entry.credit) || 0;
    totalDebit += debit;
    totalCredit += credit;

    running += (debit - credit);
    entriesWithRunning.push({
      ...entry,
      runningBalance: running
    });

    const mCode = entry.accountCode || '99999';
    const mTitle = entry.accountTitle || 'معین متفرقه';

    if (!moeinMap[mCode]) {
      moeinMap[mCode] = {
        moeinCode: mCode,
        moeinTitle: mTitle,
        debit: 0,
        credit: 0,
        count: 0
      };
    }
    moeinMap[mCode].debit += debit;
    moeinMap[mCode].credit += credit;
    moeinMap[mCode].count += 1;
  });

  const moeinBreakdown: TafsiliMoeinTurnover[] = Object.values(moeinMap).map(m => {
    const bal = m.debit - m.credit;
    return {
      moeinCode: m.moeinCode,
      moeinTitle: m.moeinTitle,
      debit: m.debit,
      credit: m.credit,
      balance: bal,
      nature: bal >= 0 ? 'debit' : 'credit',
      entriesCount: m.count
    };
  });

  const netBalance = totalDebit - totalCredit;
  let status: 'debtor' | 'creditor' | 'settled' = 'settled';
  if (netBalance > 0) status = 'debtor';
  else if (netBalance < 0) status = 'creditor';

  return {
    tafsili,
    totalDebit,
    totalCredit,
    netBalance,
    status,
    moeinBreakdown,
    entries: entriesWithRunning
  };
}
