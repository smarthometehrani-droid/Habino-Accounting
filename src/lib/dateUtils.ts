/**
 * Date Utility for Persian (Jalali) and Gregorian Conversion
 * Ensures 100% compatibility with PostgreSQL DATE and TIMESTAMPTZ columns in Supabase
 * while maintaining native Jalali RTL experience across Habino Accounting.
 */

/**
 * Strips Unicode Bidirectional formatting markers and converts Persian/Arabic digits to ASCII 0-9
 */
export function cleanDateStr(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/[\u200E\u200F\u061C\u202A-\u202E]/g, '')
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim();
}

/**
 * Converts Jalali year, month, day to Gregorian year, month, day
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let adjustedJy = jy;
  let gy: number;
  if (adjustedJy > 979) {
    gy = 1600;
    adjustedJy -= 979;
  } else {
    gy = 621;
  }

  let days = (365 * adjustedJy) + 
             (Math.floor(adjustedJy / 33) * 8) + 
             Math.floor(((adjustedJy % 33) + 3) / 4) + 
             78 + 
             jd + 
             ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);

  gy += 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  const gdDays = [
    0, 
    31, 
    ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 
    31, 
    30, 
    31, 
    30, 
    31, 
    31, 
    30, 
    31, 
    30, 
    31
  ];

  let gm = 0;
  for (gm = 1; gm <= 12; gm++) {
    if (days < gdDays[gm]) break;
    days -= gdDays[gm];
  }
  const gd = days + 1;

  return { gy, gm, gd };
}

/**
 * Converts Gregorian year, month, day to Jalali year, month, day
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const gdm = [
    0, 
    31, 
    ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 
    31, 
    30, 
    31, 
    30, 
    31, 
    31, 
    30, 
    31, 
    30, 
    31
  ];

  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + 
             (365 * gy) + 
             Math.floor((gy2 + 3) / 4) - 
             Math.floor((gy2 + 99) / 100) + 
             Math.floor((gy2 + 399) / 400) + 
             gd;

  for (let i = 1; i < gm; ++i) days += gdm[i];

  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;

  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return { jy, jm, jd };
}

/**
 * Converts any user or system date (Jalali, Persian numerals, ISO, etc.)
 * into a safe, valid PostgreSQL DATE string: "YYYY-MM-DD"
 */
export function toPostgresDate(input?: string | null): string | null {
  if (!input) return null;
  const clean = cleanDateStr(input);
  if (!clean) return null;

  // Handle ISO timestamp like 2026-09-14T...
  if (clean.includes('T')) {
    const isoDate = clean.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate;
    }
  }

  // Handle YYYY/MM/DD or YYYY-MM-DD
  const match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);

    // If Jalali year (e.g. 1300 to 1600)
    if (y >= 1200 && y <= 1600 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const g = jalaliToGregorian(y, m, d);
      const mm = String(g.gm).padStart(2, '0');
      const dd = String(g.gd).padStart(2, '0');
      return `${g.gy}-${mm}-${dd}`;
    }

    // If already Gregorian year (e.g. 2020-2030)
    if (y > 1800 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
  }

  // Fallback: Try native Date parser if it looks like a valid date
  try {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Converts a PostgreSQL DATE or TIMESTAMPTZ string ("YYYY-MM-DD" or ISO)
 * into a clean, normalized Jalali date string: "YYYY/MM/DD"
 * If input is already Jalali, normalizes it.
 */
export function fromPostgresDate(input?: string | null): string {
  if (!input) return '';
  const clean = cleanDateStr(input);
  if (!clean) return '';

  const match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);

    // If already Jalali
    if (y >= 1200 && y <= 1600 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}/${mm}/${dd}`;
    }

    // If Gregorian, convert to Jalali
    if (y > 1800 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const j = gregorianToJalali(y, m, d);
      const mm = String(j.jm).padStart(2, '0');
      const dd = String(j.jd).padStart(2, '0');
      return `${j.jy}/${mm}/${dd}`;
    }
  }

  return clean;
}

/**
 * Returns today's Jalali date in standard format "YYYY/MM/DD"
 */
export function getCurrentJalaliDate(): string {
  const now = new Date();
  const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const mm = String(j.jm).padStart(2, '0');
  const dd = String(j.jd).padStart(2, '0');
  return `${j.jy}/${mm}/${dd}`;
}

/**
 * Normalizes any Persian date string into standard "YYYY/MM/DD"
 */
export function normalizeJalaliDate(input?: string | null): string {
  if (!input) return getCurrentJalaliDate();
  const clean = cleanDateStr(input);
  const match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (y >= 1200 && y <= 1600) {
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}/${mm}/${dd}`;
    }
  }
  return fromPostgresDate(input) || getCurrentJalaliDate();
}
