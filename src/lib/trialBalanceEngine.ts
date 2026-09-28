import {
  AccountingEntry,
  TrialBalanceColumnMode,
  TrialBalanceLevel,
  TrialBalanceRow
} from '../types';
import {
  STANDARD_ACCOUNT_GROUPS,
  STANDARD_ACCOUNT_KOLS,
  getAllAccountMoeins,
  resolveAccountCoding
} from './chartOfAccountsData';

export interface MultiColumnTrialBalanceResult {
  mode: TrialBalanceColumnMode;
  level: TrialBalanceLevel;
  rows: TrialBalanceRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
  isBalanced: boolean;
  difference: number;
}

/**
 * محاسبه موتور تراز آزمایشی ۲، ۴ و ۶ ستونی هابینو در سطوح کل، معین و تفصیلی
 */
export function computeMultiColumnTrialBalance(params: {
  entries: AccountingEntry[];
  mode: TrialBalanceColumnMode;
  level: TrialBalanceLevel;
  startDate?: string;
  endDate?: string;
  tafsiliAccounts?: { code: string; title: string; entityId?: string }[];
}): MultiColumnTrialBalanceResult {
  const { entries, mode, level, startDate, endDate, tafsiliAccounts = [] } = params;
  const allMoeins = getAllAccountMoeins();

  // تفکیک آرتیکل‌ها به قبل از دوره (ابتدای دوره) و طی دوره
  const openingEntries: AccountingEntry[] = [];
  const periodEntries: AccountingEntry[] = [];

  entries.forEach(e => {
    const docDate = e.date || '';
    const isOpeningDoc = (e.documentNumber && e.documentNumber.startsWith('DOC-OPN-')) || e.description.includes('افتتاحیه');

    if (isOpeningDoc) {
      openingEntries.push(e);
      return;
    }

    if (startDate && docDate < startDate) {
      openingEntries.push(e);
    } else if (endDate && docDate > endDate) {
      // بعد از بازه انتخابی نادیده گرفته شود
    } else {
      periodEntries.push(e);
    }
  });

  // دیکشنری تجمیع داده‌ها بر مبنای کلید سطح انتخابی
  const map: Record<
    string,
    {
      code: string;
      title: string;
      parentCode?: string;
      openingDebit: number;
      openingCredit: number;
      periodDebit: number;
      periodCredit: number;
    }
  > = {};

  // ایجاد ردیف‌های پایه بر اساس سطح انتخابی جهت نمایش جامع
  if (level === 'group') {
    STANDARD_ACCOUNT_GROUPS.forEach(g => {
      map[g.code] = {
        code: g.code,
        title: g.title,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0
      };
    });
  } else if (level === 'kol') {
    STANDARD_ACCOUNT_KOLS.forEach(k => {
      map[k.code] = {
        code: k.code,
        title: k.title,
        parentCode: k.groupCode,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0
      };
    });
  } else if (level === 'moein') {
    allMoeins.forEach(m => {
      map[m.code] = {
        code: m.code,
        title: m.title,
        parentCode: m.kolCode,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0
      };
    });
  }

  // تابع کمکی برای استخراج کلید و عنوان برای یک آرتیکل بر اساس سطح
  function getEntryKey(e: AccountingEntry): { code: string; title: string; parentCode?: string } {
    const mCode = e.accountCode || '99999';
    const coding = resolveAccountCoding(mCode);

    if (level === 'group') {
      const g = coding.group || STANDARD_ACCOUNT_GROUPS[0];
      return { code: g?.code || '1', title: g?.title || 'دارایی‌ها' };
    }

    if (level === 'kol') {
      const k = coding.kol;
      if (k) return { code: k.code, title: k.title, parentCode: k.groupCode };
      // اگر حساب کل مستقیم نبود، از دو رقم اول معین استخراج شود
      const derivedKol = mCode.substring(0, 2);
      const foundKol = STANDARD_ACCOUNT_KOLS.find(item => item.code === derivedKol);
      return {
        code: derivedKol,
        title: foundKol?.title || `حساب کل ${derivedKol}`,
        parentCode: foundKol?.groupCode
      };
    }

    if (level === 'tafsili') {
      // تفصیلی شناور
      let tCode = e.tafsiliCode;
      let tTitle = e.tafsiliTitle;

      if (!tCode && e.clientId) {
        const found = tafsiliAccounts.find(t => t.entityId === e.clientId || t.code === e.clientId);
        if (found) {
          tCode = found.code;
          tTitle = found.title;
        } else {
          tCode = `CL-${e.clientId.substring(0, 4)}`;
          tTitle = e.description || 'طرف‌حساب تجاری';
        }
      }

      if (!tCode) {
        tCode = '4099';
        tTitle = 'تفصیلی شناور عمومی / متفرقه';
      }

      return { code: tCode, title: tTitle || `تفصیلی ${tCode}` };
    }

    // پیش‌فرض: سطح معین
    const m = coding.moein;
    return {
      code: mCode,
      title: m?.title || e.accountTitle || `معین ${mCode}`,
      parentCode: m?.kolCode || mCode.substring(0, 2)
    };
  }

  // تجمیع رکوردهای ابتدای دوره
  openingEntries.forEach(e => {
    const { code, title, parentCode } = getEntryKey(e);
    if (!map[code]) {
      map[code] = { code, title, parentCode, openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
    }
    map[code].openingDebit += Number(e.debit) || 0;
    map[code].openingCredit += Number(e.credit) || 0;
  });

  // تجمیع رکوردهای طی دوره
  periodEntries.forEach(e => {
    const { code, title, parentCode } = getEntryKey(e);
    if (!map[code]) {
      map[code] = { code, title, parentCode, openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
    }
    map[code].periodDebit += Number(e.debit) || 0;
    map[code].periodCredit += Number(e.credit) || 0;
  });

  // تبدیل نقشه به ردیف‌های نهایی تراز و محاسبه مانده پایان دوره
  const rows: TrialBalanceRow[] = [];
  const totals = {
    openingDebit: 0,
    openingCredit: 0,
    periodDebit: 0,
    periodCredit: 0,
    closingDebit: 0,
    closingCredit: 0
  };

  Object.values(map).forEach(item => {
    const totalD = item.openingDebit + item.periodDebit;
    const totalC = item.openingCredit + item.periodCredit;

    // اگر حسابی در هیچ دوره‌ای گردشی نداشته، در صورت فیلتر نادیده گرفته نشود یا فقط ردیف‌های دارای گردش بیایند
    const hasActivity = totalD > 0 || totalC > 0;
    if (!hasActivity && (level === 'tafsili' || level === 'moein')) {
      return;
    }

    let closingDebit = 0;
    let closingCredit = 0;
    const net = totalD - totalC;

    if (net > 0) {
      closingDebit = net;
    } else if (net < 0) {
      closingCredit = Math.abs(net);
    }

    rows.push({
      code: item.code,
      title: item.title,
      level,
      parentCode: item.parentCode,
      openingDebit: item.openingDebit,
      openingCredit: item.openingCredit,
      periodDebit: item.periodDebit,
      periodCredit: item.periodCredit,
      closingDebit,
      closingCredit
    });

    totals.openingDebit += item.openingDebit;
    totals.openingCredit += item.openingCredit;
    totals.periodDebit += item.periodDebit;
    totals.periodCredit += item.periodCredit;
    totals.closingDebit += closingDebit;
    totals.closingCredit += closingCredit;
  });

  // مرتب‌سازی ردیف‌ها بر اساس کد حساب
  rows.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const difference = Math.abs(totals.closingDebit - totals.closingCredit);
  const isBalanced = difference === 0;

  return {
    mode,
    level,
    rows,
    totals,
    isBalanced,
    difference
  };
}
