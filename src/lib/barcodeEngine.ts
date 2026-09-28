/**
 * Habino Barcode Engine
 * Comprehensive 1D/2D Barcode & QR Code Orchestration
 * Supports Web Audio beep, USB Hardware Gun listeners, SVG Barcode Generation, and Scan History
 */

import { BarcodeScanRecord } from '../types';

export const BARCODE_HISTORY_KEY = 'habino_barcode_history_v1';

// Web Audio API Sound Generator for Scan Feedback
let audioCtx: AudioContext | null = null;

export function playScanBeep(volume: number = 0.3): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Crisp two-tone affirmative high-tech chime
    osc.frequency.setValueAtTime(1760, now);
    osc.frequency.setValueAtTime(2640, now + 0.04);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch (err) {
    console.debug('Audio beep unavailable:', err);
  }
}

export function playErrorBeep(volume: number = 0.25): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(180, now + 0.08);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (err) {
    console.debug('Error audio beep unavailable:', err);
  }
}

/**
 * Detects barcode symbology and classification
 */
export function detectBarcodeFormat(code: string): {
  type: string;
  label: string;
  countryOrStandard: string;
  isIranStandard: boolean;
} {
  const clean = code.trim();

  // Iranian GS1 prefix is 626 (GTIN / EAN-13)
  if (/^626\d{10}$/.test(clean)) {
    return {
      type: 'EAN-13',
      label: 'ایران‌کد / بارکد ملی کالای ایران (GS1 IRAN)',
      countryOrStandard: 'ایران (پیش‌شماره ۶۲۶)',
      isIranStandard: true
    };
  }

  // 16-digit Iranian Ministry of Commerce National Code (ایران‌کد اصناف)
  if (/^\d{16}$/.test(clean)) {
    return {
      type: 'IRAN_CODE',
      label: 'کد ملی کالا و خدمات اصناف (ایران‌کد ۱۶ رقمی)',
      countryOrStandard: 'سامانه ایران‌کد وزارت صمت',
      isIranStandard: true
    };
  }

  // Standard EAN-13
  if (/^\d{13}$/.test(clean)) {
    return {
      type: 'EAN-13',
      label: 'بارکد بین‌المللی کالا (EAN-13)',
      countryOrStandard: 'استاندارد بین‌المللی GS1',
      isIranStandard: false
    };
  }

  // Standard EAN-8
  if (/^\d{8}$/.test(clean)) {
    return {
      type: 'EAN-8',
      label: 'بارکد فشرده کالا (EAN-8)',
      countryOrStandard: 'استاندارد بین‌المللی بسته کوچک',
      isIranStandard: false
    };
  }

  // Standard UPC-A (12 digits)
  if (/^\d{12}$/.test(clean)) {
    return {
      type: 'UPC-A',
      label: 'کد جهانی محصول (UPC-A)',
      countryOrStandard: 'استاندارد خرده‌فروشی',
      isIranStandard: false
    };
  }

  // QR Code detection heuristic (URL, JSON, Persian text, or length > 25)
  if (
    clean.startsWith('http://') ||
    clean.startsWith('https://') ||
    clean.startsWith('did:') ||
    clean.startsWith('{') ||
    clean.includes('\n') ||
    clean.length > 30
  ) {
    return {
      type: 'QR_CODE',
      label: 'بارکد دو بعدی پاسخ سریع (QR Code)',
      countryOrStandard: 'استاندارد ISO/IEC 18004',
      isIranStandard: false
    };
  }

  // Code 128 / Code 39 for internal SKUs and logistics
  return {
    type: 'CODE_128',
    label: 'بارکد خطی انبارداری و لجستیک (Code 128)',
    countryOrStandard: 'استاندارد سازمانی و انبار',
    isIranStandard: false
  };
}

/**
 * Standard Code 128 (Subset B) Encoding Table
 * Each character is mapped to 11 module pattern: 0/1 bars
 */
const CODE128_PATTERNS: Record<number, string> = {
  0: '212222', 1: '222122', 2: '222221', 3: '121223', 4: '121322',
  5: '131222', 6: '122213', 7: '122312', 8: '132212', 9: '221213',
  10: '221312', 11: '231212', 12: '112232', 13: '122132', 14: '122231',
  15: '113222', 16: '123122', 17: '123221', 18: '223211', 19: '221132',
  20: '221231', 21: '213212', 22: '223112', 23: '312131', 24: '311222',
  25: '321122', 26: '321221', 27: '312212', 28: '322112', 29: '322211',
  30: '212123', 31: '212321', 32: '232121', 33: '111323', 34: '131123',
  35: '131321', 36: '112313', 37: '132113', 38: '132311', 39: '211313',
  40: '231113', 41: '231311', 42: '112133', 43: '112331', 44: '132131',
  45: '113123', 46: '113321', 47: '133121', 48: '313121', 49: '211331',
  50: '231131', 51: '213113', 52: '213311', 53: '213131', 54: '311123',
  55: '311321', 56: '331121', 57: '312113', 58: '312311', 59: '332111',
  60: '314111', 61: '221411', 62: '431111', 63: '111224', 64: '111422',
  65: '121124', 66: '121421', 67: '141122', 68: '141221', 69: '112214',
  70: '112412', 71: '122114', 72: '122411', 73: '142112', 74: '142211',
  75: '241211', 76: '221114', 77: '413111', 78: '241112', 79: '134111',
  80: '111242', 81: '121142', 82: '121241', 83: '114212', 84: '124112',
  85: '124211', 86: '411212', 87: '421112', 88: '421211', 89: '212141',
  90: '214121', 91: '412121', 92: '111143', 93: '111341', 94: '131141',
  95: '114113', 96: '114311', 97: '411113', 98: '411311', 99: '113141',
  100: '114131', 101: '311141', 102: '411131',
  103: '211412', // Start Code A
  104: '211214', // Start Code B (most common ASCII)
  105: '211232', // Start Code C (numeric pairs)
  106: '2331112' // Stop pattern
};

/**
 * Generates an SVG string representation of a Code 128 barcode
 */
export function generateCode128Svg(
  text: string,
  width: number = 260,
  height: number = 80,
  showText: boolean = true
): string {
  const safeText = text.trim() || 'SKU-1001';
  
  // Start with Code 128B (index 104)
  const values: number[] = [104];
  let checkSum = 104;

  for (let i = 0; i < safeText.length; i++) {
    const code = safeText.charCodeAt(i);
    // Code 128B values are ASCII code - 32 for printable characters
    const val = Math.max(0, Math.min(102, code - 32));
    values.push(val);
    checkSum += val * (i + 1);
  }

  const checkDigit = checkSum % 103;
  values.push(checkDigit);
  values.push(106); // Stop code

  // Convert pattern digits to bar widths
  let patternString = '';
  for (const val of values) {
    const pattern = CODE128_PATTERNS[val] || '212222';
    patternString += pattern;
  }

  // Calculate total modules
  let totalModules = 0;
  for (let i = 0; i < patternString.length; i++) {
    totalModules += parseInt(patternString[i], 10);
  }

  const quietZone = 10;
  const totalWidth = totalModules + (quietZone * 2);
  const scale = width / totalWidth;
  const barHeight = showText ? height - 22 : height;

  let currentX = quietZone;
  let isBar = true;
  const rects: string[] = [];

  for (let i = 0; i < patternString.length; i++) {
    const moduleWidth = parseInt(patternString[i], 10);
    if (isBar) {
      rects.push(
        `<rect x="${(currentX * scale).toFixed(1)}" y="4" width="${(moduleWidth * scale).toFixed(1)}" height="${barHeight}" fill="#0f172a" />`
      );
    }
    currentX += moduleWidth;
    isBar = !isBar;
  }

  const textElement = showText
    ? `<text x="${(width / 2).toFixed(1)}" y="${height - 4}" font-family="monospace, sans-serif" font-size="12" font-weight="bold" fill="#334155" text-anchor="middle" letter-spacing="2">${safeText}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: transparent;">
    ${rects.join('')}
    ${textElement}
  </svg>`;
}

/**
 * Scan history persistence
 */
export function getStoredBarcodeScanHistory(): BarcodeScanRecord[] {
  try {
    const raw = localStorage.getItem(BARCODE_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredBarcodeScanHistory(records: BarcodeScanRecord[]): void {
  try {
    localStorage.setItem(BARCODE_HISTORY_KEY, JSON.stringify(records.slice(0, 100)));
  } catch (err) {
    console.error('Failed to save barcode scan history:', err);
  }
}

export function addBarcodeScanRecord(
  code: string,
  source: 'camera' | 'usb_gun' | 'image_upload' | 'manual',
  matchedItemId?: string,
  matchedItemName?: string,
  price?: number,
  stock?: number
): BarcodeScanRecord {
  const meta = detectBarcodeFormat(code);
  const newRecord: BarcodeScanRecord = {
    id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: code.trim(),
    format: meta.type,
    timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    source,
    matchedItemId,
    matchedItemName,
    price,
    stock
  };

  const existing = getStoredBarcodeScanHistory();
  const updated = [newRecord, ...existing];
  saveStoredBarcodeScanHistory(updated);
  return newRecord;
}
