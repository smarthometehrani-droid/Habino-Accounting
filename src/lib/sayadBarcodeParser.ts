/**
 * Habino Sayad Check 2D Barcode & QR Parser
 * Optimized for Iranian Central Bank (CBI) 16-Digit Sayad Checks
 * 
 * Supports:
 * - 16-Digit Sayad Identification Number Extraction
 * - Central Bank & Banking App QR Code formats (Melli, Mellat, Tejarat, Pasargad, Saman, etc.)
 * - Auto-extraction of IBAN (شماره شبا), Amount (مبلغ), Due Date (تاریخ سررسید), Serial
 * - Detection of Issuing Bank Name from IBAN or Sayad structure
 * - Persian/Arabic numeral normalization (۰-۹ to 0-9)
 */

export interface SayadCheckQrData {
  rawText: string;
  sayadId: string; // 16 digits normalized
  formattedSayadId: string; // e.g. "7928-1234-5678-9012"
  isValidSayadId: boolean;
  bankName?: string;
  iban?: string; // IR... (26 characters)
  amount?: number; // Rial or Toman
  dueDate?: string; // e.g. "1403/08/15"
  serialNumber?: string;
  serial?: string; // Alias for serialNumber
  seriesNumber?: string;
  nationalId?: string; // National ID of issuer
  detectedFormat: 'raw_16_digits' | 'cbi_url' | 'cbi_delimited' | 'json' | 'unknown_with_sayad';
  error?: string;
}

// Iranian Bank Codes mapped to Bank Name
const IRANIAN_BANK_CODES: Record<string, string> = {
  '010': 'بانک مرکزی جمهوری اسلامی ایران',
  '011': 'بانک صنعت و معدن',
  '012': 'بانک ملت',
  '013': 'بانک رفاه کارگران',
  '014': 'بانک مسکن',
  '015': 'بانک سپه',
  '016': 'بانک کشاورزی',
  '017': 'بانک ملی ایران',
  '018': 'بانک تجارت',
  '019': 'بانک صادرات ایران',
  '020': 'بانک توسعه صادرات ایران',
  '021': 'پست بانک ایران',
  '022': 'بانک توسعه تعاون',
  '051': 'موسسه اعتباری توسعه',
  '053': 'بانک کارآفرین',
  '054': 'بانک پارسیان',
  '055': 'بانک اقتصاد نوین',
  '056': 'بانک سامان',
  '057': 'بانک پاسارگاد',
  '058': 'بانک سرمایه',
  '059': 'بانک سینا',
  '060': 'بانک قرض‌الحسنه مهر ایران',
  '061': 'بانک شهر',
  '062': 'بانک آینده',
  '063': 'بانک انصار',
  '064': 'بانک گردشگری',
  '066': 'بانک دی',
  '069': 'بانک ایران زمین',
  '070': 'بانک قرض‌الحسنه رسالت',
  '078': 'بانک خاورمیانه',
  '079': 'بانک ایران و ونزوئلا',
  '080': 'موسسه اعتباری ملل',
  '081': 'موسسه اعتباری نور'
};

/**
 * Normalizes Persian and Arabic numerals to English ASCII digits
 */
export function normalizePersianDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
}

/**
 * Formats a 16-digit Sayad ID into 4-digit groups (e.g. "1234 - 5678 - 9012 - 3456")
 */
export function formatSayadId(sayadId: string): string {
  const clean = normalizePersianDigits(sayadId).replace(/\D/g, '');
  if (clean.length !== 16) return sayadId;
  return `${clean.slice(0, 4)} - ${clean.slice(4, 8)} - ${clean.slice(8, 12)} - ${clean.slice(12, 16)}`;
}

/**
 * Validates basic structural criteria of an Iranian 16-digit Sayad ID
 */
export function validateSayadIdStructure(sayadId: string): boolean {
  const clean = normalizePersianDigits(sayadId).replace(/\D/g, '');
  if (clean.length !== 16) return false;

  // Reject all repeated digits (e.g. 0000000000000000, 1111111111111111)
  if (/^(\d)\1{15}$/.test(clean)) return false;

  // Sayad IDs do not start with 000
  if (clean.startsWith('000')) return false;

  return true;
}

/**
 * Identifies bank name from Iranian IBAN (IR...)
 */
export function detectBankFromIban(iban: string): string | undefined {
  const cleanIban = normalizePersianDigits(iban).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanIban.startsWith('IR') || cleanIban.length < 7) return undefined;

  const bankCode = cleanIban.substring(4, 7);
  return IRANIAN_BANK_CODES[bankCode];
}

/**
 * Primary Parser: Extracts Sayad Check details from raw QR/Barcode string
 */
export function parseSayadQrCode(rawInput: string): SayadCheckQrData | null {
  if (!rawInput || typeof rawInput !== 'string') return null;

  const raw = rawInput.trim();
  const normalized = normalizePersianDigits(raw);

  // Pattern 1: Pure 16-digit Sayad Number (with or without spaces/dashes)
  const pureDigits = normalized.replace(/[\s-]/g, '');
  if (/^\d{16}$/.test(pureDigits)) {
    const isValid = validateSayadIdStructure(pureDigits);
    return {
      rawText: raw,
      sayadId: pureDigits,
      formattedSayadId: formatSayadId(pureDigits),
      isValidSayadId: isValid,
      detectedFormat: 'raw_16_digits'
    };
  }

  // Pattern 2: JSON format (Used by some modern Iranian fintechs and banking apps)
  if (normalized.startsWith('{') && normalized.endsWith('}')) {
    try {
      const parsed = JSON.parse(normalized);
      const sayadField = parsed.sayadId || parsed.sayad_id || parsed.sayad || parsed.id || parsed.sayadNumber;
      if (sayadField) {
        const cleanSayad = String(sayadField).replace(/\D/g, '');
        if (cleanSayad.length === 16) {
          const iban = parsed.iban || parsed.sheba || parsed.shaba;
          const bankName = iban ? detectBankFromIban(iban) : parsed.bank || parsed.bankName;
          
          return {
            rawText: raw,
            sayadId: cleanSayad,
            formattedSayadId: formatSayadId(cleanSayad),
            isValidSayadId: validateSayadIdStructure(cleanSayad),
            bankName,
            iban: iban ? String(iban).toUpperCase() : undefined,
            amount: parsed.amount ? Number(parsed.amount) : undefined,
            dueDate: parsed.dueDate || parsed.date || parsed.maturityDate,
            serialNumber: parsed.serial || parsed.serialNumber,
            serial: parsed.serial || parsed.serialNumber,
            seriesNumber: parsed.series,
            nationalId: parsed.nationalId || parsed.issuerNationalId,
            detectedFormat: 'json'
          };
        }
      }
    } catch {
      // Continue to regex fallback
    }
  }

  // Pattern 3: URL / URI from Central Bank of Iran or Bank portal
  // e.g. https://cbi.ir/sayad?id=1234567890123456
  // sayad://check?id=1234567890123456
  if (normalized.includes('http://') || normalized.includes('https://') || normalized.includes('sayad://')) {
    const urlMatch = normalized.match(/(?:id|sayad|check)=?(\d{16})/i) || normalized.match(/\/(\d{16})(?:[/?#]|$)/);
    if (urlMatch && urlMatch[1]) {
      const sayad = urlMatch[1];
      return {
        rawText: raw,
        sayadId: sayad,
        formattedSayadId: formatSayadId(sayad),
        isValidSayadId: validateSayadIdStructure(sayad),
        detectedFormat: 'cbi_url'
      };
    }
  }

  // Pattern 4: Delimited Key-Value strings (Semicolon, Pipe, Comma, Line Break)
  // e.g. "SAYAD:7928123456789012;IBAN:IR120170000000123456789012;AMOUNT:50000000;DATE:1403/09/20"
  let sayadIdFound = '';
  let ibanFound = '';
  let amountFound: number | undefined = undefined;
  let dueDateFound = '';
  let serialFound = '';

  // Look for 16-digit sequence preceded or followed by sayad keywords or standalone 16 digits
  const sayadKeyMatch = normalized.match(/(?:sayad|sayad_id|صیاد)[\s:=_-]*(\d{16})/i);
  if (sayadKeyMatch && sayadKeyMatch[1]) {
    sayadIdFound = sayadKeyMatch[1];
  } else {
    // Extract any standalone 16-digit block
    const blockMatch = normalized.match(/\b(\d{16})\b/);
    if (blockMatch && blockMatch[1]) {
      sayadIdFound = blockMatch[1];
    }
  }

  // Look for IBAN (IR followed by 24 digits)
  const ibanMatch = normalized.match(/\b(IR\d{24})\b/i);
  if (ibanMatch && ibanMatch[1]) {
    ibanFound = ibanMatch[1].toUpperCase();
  }

  // Look for Amount
  const amountMatch = normalized.match(/(?:amount|مبلغ|mablagh)[\s:=_-]*(\d+)/i);
  if (amountMatch && amountMatch[1]) {
    amountFound = Number(amountMatch[1]);
  }

  // Look for Jalali Date (e.g. 1403/08/15 or 1403-08-15 or 14030815)
  const dateMatch = normalized.match(/\b(14\d{2})[/.-]?(0[1-9]|1[0-2])[/.-]?(0[1-9]|[12]\d|3[01])\b/);
  if (dateMatch) {
    dueDateFound = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
  }

  // Look for Serial Number
  const serialMatch = normalized.match(/(?:serial|سریال)[\s:=_-]*([0-9a-zA-Z\-/]+)/i);
  if (serialMatch && serialMatch[1]) {
    serialFound = serialMatch[1];
  }

  if (sayadIdFound && sayadIdFound.length === 16) {
    const bank = ibanFound ? detectBankFromIban(ibanFound) : undefined;
    return {
      rawText: raw,
      sayadId: sayadIdFound,
      formattedSayadId: formatSayadId(sayadIdFound),
      isValidSayadId: validateSayadIdStructure(sayadIdFound),
      bankName: bank,
      iban: ibanFound || undefined,
      amount: amountFound,
      dueDate: dueDateFound || undefined,
      serialNumber: serialFound || undefined,
      serial: serialFound || undefined,
      detectedFormat: (ibanFound || amountFound || dueDateFound) ? 'cbi_delimited' : 'unknown_with_sayad'
    };
  }

  return null;
}
