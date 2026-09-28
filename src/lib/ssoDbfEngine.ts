import { SSODisketteConfig, PayrollPeriod, PayrollSlip } from '../types';

// ============================================================================
// Iranian Social Security Organization (SSO) DBF Generator
// موتور تولید فایل‌های دیسکت باینری استاندارد dBase III (.DBF)
// مطابق با استانداردهای درگاه ملی تأمین اجتماعی (eservices.tamin.ir) و نرم‌افزار ListDisk
// ============================================================================

export interface DbfFieldDescriptor {
  name: string;      // نام فیلد (حداکثر ۱۱ کاراکتر)
  type: 'C' | 'N' | 'D'; // C: کاراکتر, N: عددی, D: تاریخ
  length: number;    // طول فیلد به بایت
  decimals: number;  // تعداد ارقام اعشار (برای C و اعداد صحیح برابر 0)
}

/**
 * نگاشت کاراکترهای یونیکد فارسی به کدپیج Windows-1256 سازگار با FoxPro / dBase III
 */
const CP1256_TABLE: Record<number, number> = {
  // همزه و الف
  0x0621: 0xc1, // ء
  0x0622: 0xc2, // آ
  0x0623: 0xc3, // أ
  0x0624: 0xc4, // ؤ
  0x0625: 0xc5, // إ
  0x0626: 0xc6, // ئ
  0x0627: 0xc7, // ا
  // حروف صامت
  0x0628: 0xc8, // ب
  0x067e: 0x81, // پ (Peh in CP1256)
  0x0629: 0xc9, // ة
  0x062a: 0xca, // ت
  0x062b: 0xcb, // ث
  0x062c: 0xcc, // ج
  0x0686: 0x8d, // چ (Tcheh in CP1256)
  0x062d: 0xcd, // ح
  0x062e: 0xce, // خ
  0x062f: 0xcf, // د
  0x0630: 0xd0, // ذ
  0x0631: 0xd1, // ر
  0x0632: 0xd2, // ز
  0x0698: 0x8e, // ژ (Jeh in CP1256)
  0x0633: 0xd3, // س
  0x0634: 0xd4, // ش
  0x0635: 0xd5, // ص
  0x0636: 0xd6, // ض
  0x0637: 0xd7, // ط
  0x0638: 0xd8, // ظ
  0x0639: 0xd9, // ع
  0x063a: 0xda, // غ
  0x0641: 0xfa, // ف
  0x0642: 0xfb, // ق
  0x0643: 0xd9, // ك عربی
  0x06a9: 0x98, // ک فارسی
  0x06af: 0x90, // گ فارسی
  0x0644: 0xe1, // ل
  0x0645: 0xe3, // م
  0x0646: 0xe4, // ن
  0x0647: 0xe5, // ه
  0x0648: 0xe6, // و
  0x0649: 0xec, // ى
  0x064a: 0xed, // ي عربی
  0x06cc: 0xed, // ی فارسی
  // تبدیل اعداد فارسی به انگلیسی اسکی برای سازگاری دیتابیس
  0x06f0: 0x30, 0x06f1: 0x31, 0x06f2: 0x32, 0x06f3: 0x33, 0x06f4: 0x34,
  0x06f5: 0x35, 0x06f6: 0x36, 0x06f7: 0x37, 0x06f8: 0x38, 0x06f9: 0x39,
  // تبدیل اعداد عربی به انگلیسی اسکی
  0x0660: 0x30, 0x0661: 0x31, 0x0662: 0x32, 0x0663: 0x33, 0x0664: 0x34,
  0x0665: 0x35, 0x0666: 0x36, 0x0667: 0x37, 0x0668: 0x38, 0x0669: 0x39
};

/**
 * تبدیل رشته یونیکد به آرایه بایت‌های Windows-1256
 */
export function encodeToWindows1256(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 0x7f) {
      bytes[i] = code;
    } else if (CP1256_TABLE[code] !== undefined) {
      bytes[i] = CP1256_TABLE[code];
    } else {
      bytes[i] = 0x20; // جایگزینی کاراکتر ناشناخته با فاصله
    }
  }
  return bytes;
}

/**
 * ساخت فایل باینری استاندارد dBase III (.DBF)
 */
export function createDbfBinary(
  fields: DbfFieldDescriptor[],
  records: Record<string, string | number | boolean>[]
): Uint8Array {
  const recordCount = records.length;
  const fieldCount = fields.length;

  // محاسبه ابعاد ساختار فایل
  // Header: 32 bytes
  // Field Descriptors: fieldCount * 32 bytes
  // Header Terminator: 1 byte (0x0D)
  const headerLength = 32 + (fieldCount * 32) + 1;

  // Record Length: 1 deletion flag byte (0x20) + sum of field lengths
  let recordLength = 1;
  for (const f of fields) {
    recordLength += f.length;
  }

  // Total DBF File Size: headerLength + (recordCount * recordLength) + 1 (EOF: 0x1A)
  const totalFileSize = headerLength + (recordCount * recordLength) + 1;
  const buffer = new Uint8Array(totalFileSize);
  const view = new DataView(buffer.buffer);

  // ----------------------------------------------------
  // 1. Header (32 bytes)
  // ----------------------------------------------------
  const now = new Date();
  buffer[0] = 0x03; // dBASE III without memo
  buffer[1] = (now.getFullYear() - 1900) % 256; // Year
  buffer[2] = now.getMonth() + 1; // Month
  buffer[3] = now.getDate(); // Day

  // Number of records (Little Endian Uint32)
  view.setUint32(4, recordCount, true);

  // Length of header structure (Little Endian Uint16)
  view.setUint16(8, headerLength, true);

  // Length of each record (Little Endian Uint16)
  view.setUint16(10, recordLength, true);

  // Bytes 12-31 are reserved (zeros)

  // ----------------------------------------------------
  // 2. Field Descriptors (each 32 bytes)
  // ----------------------------------------------------
  let offset = 32;
  for (const field of fields) {
    // Field name (up to 10 chars + null terminator)
    const fieldNameAscii = field.name.toUpperCase().slice(0, 10);
    for (let i = 0; i < 11; i++) {
      buffer[offset + i] = i < fieldNameAscii.length ? fieldNameAscii.charCodeAt(i) : 0x00;
    }

    // Field type ('C', 'N', 'D')
    buffer[offset + 11] = field.type.charCodeAt(0);

    // Reserved (offset + 12 to 15) -> zeros

    // Field length
    buffer[offset + 16] = field.length & 0xff;

    // Decimal count
    buffer[offset + 17] = field.decimals & 0xff;

    // Reserved (offset + 18 to 31) -> zeros
    offset += 32;
  }

  // ----------------------------------------------------
  // 3. Header Terminator
  // ----------------------------------------------------
  buffer[offset] = 0x0d;
  offset += 1;

  // ----------------------------------------------------
  // 4. Records Data
  // ----------------------------------------------------
  for (const rec of records) {
    // Deletion flag (0x20 = active / not deleted)
    buffer[offset] = 0x20;
    offset += 1;

    for (const field of fields) {
      const rawVal = rec[field.name];
      const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';

      if (field.type === 'N') {
        // فیلد عددی: راست‌چین، پر شده از سمت چپ با کاراکتر فاصله (0x20)
        let numStr = valStr.trim();
        if (field.decimals > 0 && !numStr.includes('.')) {
          numStr = Number(numStr).toFixed(field.decimals);
        }
        if (numStr.length > field.length) {
          numStr = numStr.slice(-field.length);
        }
        const paddedNum = numStr.padStart(field.length, ' ');
        for (let i = 0; i < field.length; i++) {
          buffer[offset + i] = paddedNum.charCodeAt(i);
        }
      } else {
        // فیلد متنی: چپ‌چین، انکود شده با Windows-1256، پر شده از سمت راست با فاصله (0x20)
        const encodedBytes = encodeToWindows1256(valStr);
        for (let i = 0; i < field.length; i++) {
          if (i < encodedBytes.length) {
            buffer[offset + i] = encodedBytes[i];
          } else {
            buffer[offset + i] = 0x20; // Space padding
          }
        }
      }

      offset += field.length;
    }
  }

  // ----------------------------------------------------
  // 5. File Terminator (EOF)
  // ----------------------------------------------------
  buffer[offset] = 0x1a;

  return buffer;
}

// ============================================================================
// تعریف فیلدهای استاندارد سازمان تأمین اجتماعی ایران
// ============================================================================

/**
 * فیلدهای استاندارد جدول کارگاه DSKKAR00.DBF
 */
export const SSO_KAR_DBF_FIELDS: DbfFieldDescriptor[] = [
  { name: 'DSK_ID', type: 'C', length: 10, decimals: 0 },    // کد ۱۰ رقمی کارگاه
  { name: 'DSK_NAME', type: 'C', length: 100, decimals: 0 },  // نام کارگاه
  { name: 'DSK_FARM', type: 'C', length: 100, decimals: 0 },  // نام کارفرما
  { name: 'DSK_ADR', type: 'C', length: 100, decimals: 0 },   // آدرس کارگاه
  { name: 'DSK_KIND', type: 'N', length: 1, decimals: 0 },    // نوع کارگاه (0 یا 1)
  { name: 'DSK_YY', type: 'N', length: 2, decimals: 0 },      // سال عملکرد دو رقمی (03 یا 04)
  { name: 'DSK_MM', type: 'N', length: 2, decimals: 0 },      // ماه عملکرد (1 تا 12)
  { name: 'DSK_LISTNO', type: 'C', length: 12, decimals: 0 },// ردیف پیمان یا شماره لیست
  { name: 'DSK_DISC', type: 'C', length: 100, decimals: 0 },  // شرح لیست
  { name: 'DSK_NUM', type: 'N', length: 5, decimals: 0 },     // تعداد بیمه‌شدگان
  { name: 'DSK_TDD', type: 'N', length: 6, decimals: 0 },     // مجموع روزهای کارکرد
  { name: 'DSK_TROOZ', type: 'N', length: 12, decimals: 0 },  // مجموع دستمزد روزانه
  { name: 'DSK_TMAH', type: 'N', length: 12, decimals: 0 },   // مجموع دستمزد ماهانه
  { name: 'DSK_TMAZ', type: 'N', length: 12, decimals: 0 },   // مجموع مزایای ماهانه مشمول
  { name: 'DSK_TMASH', type: 'N', length: 12, decimals: 0 },  // مجموع دستمزد و مزایای مشمول کسر حق بیمه
  { name: 'DSK_TTOTL', type: 'N', length: 12, decimals: 0 },  // مجموع کل دستمزد و مزایا (ناخالص)
  { name: 'DSK_TBMO', type: 'N', length: 12, decimals: 0 },   // حق بیمه سهم بیمه شده (۷٪)
  { name: 'DSK_TKAR', type: 'N', length: 12, decimals: 0 },   // حق بیمه سهم کارفرما (۲۰٪)
  { name: 'DSK_TBIK', type: 'N', length: 12, decimals: 0 },   // حق بیمه بیکاری (۳٪)
  { name: 'DSK_RATE', type: 'N', length: 5, decimals: 0 },    // نرخ کل حق بیمه (30)
  { name: 'DSK_PRATE', type: 'N', length: 3, decimals: 0 },   // نرخ کارفرما و بیکاری (23)
  { name: 'DSK_BIMH', type: 'N', length: 12, decimals: 0 }    // مجموع کل حق بیمه قابل پرداخت (۳۰٪)
];

/**
 * فیلدهای استاندارد جدول پرسنل DSKVOR00.DBF
 */
export const SSO_VOR_DBF_FIELDS: DbfFieldDescriptor[] = [
  { name: 'DSK_ID', type: 'C', length: 10, decimals: 0 },    // کد ۱۰ رقمی کارگاه
  { name: 'DSK_NAME', type: 'C', length: 50, decimals: 0 },   // نام خانوادگی
  { name: 'DSK_FARM', type: 'C', length: 50, decimals: 0 },   // نام کارفرما
  { name: 'DSK_RADIF', type: 'N', length: 5, decimals: 0 },   // ردیف در لیست
  { name: 'DSK_BNO', type: 'C', length: 10, decimals: 0 },    // شماره بیمه ۱۰ رقمی
  { name: 'DSK_IDNO', type: 'C', length: 10, decimals: 0 },   // شماره شناسنامه
  { name: 'DSK_MELI', type: 'C', length: 10, decimals: 0 },   // کد ملی ۱۰ رقمی
  { name: 'DSK_NAME1', type: 'C', length: 50, decimals: 0 },  // نام کوچک
  { name: 'DSK_FNAME', type: 'C', length: 50, decimals: 0 },  // نام پدر
  { name: 'DSK_DOB', type: 'C', length: 8, decimals: 0 },     // تاریخ تولد (مثال: 13700101)
  { name: 'DSK_SHNO', type: 'C', length: 10, decimals: 0 },   // شماره شناسنامه / پروانه
  { name: 'DSK_SDATE', type: 'C', length: 8, decimals: 0 },   // تاریخ شروع به کار (مثال: 14030101)
  { name: 'DSK_EDATE', type: 'C', length: 8, decimals: 0 },   // تاریخ ترک کار
  { name: 'DSK_ROOZ', type: 'N', length: 2, decimals: 0 },    // روزهای کارکرد در این ماه
  { name: 'DSK_DROOZ', type: 'N', length: 12, decimals: 0 },  // دستمزد روزانه به ریال
  { name: 'DSK_DMAH', type: 'N', length: 12, decimals: 0 },   // دستمزد پایه ماهانه به ریال
  { name: 'DSK_DMAZ', type: 'N', length: 12, decimals: 0 },   // مزایای مشمول بیمه (بن، مسکن و ...)
  { name: 'DSK_DSOK', type: 'N', length: 12, decimals: 0 },   // مجموع دستمزد و مزایای مشمول کسر بیمه
  { name: 'DSK_DCOL', type: 'N', length: 12, decimals: 0 },   // مجموع کل ناخالص دریافتی
  { name: 'DSK_BMO', type: 'N', length: 12, decimals: 0 },    // بیمه سهم کارگر (۷٪)
  { name: 'DSK_KAR', type: 'N', length: 12, decimals: 0 },    // بیمه سهم کارفرما (۲۰٪)
  { name: 'DSK_BIK', type: 'N', length: 12, decimals: 0 },    // بیمه بیکاری (۳٪)
  { name: 'DSK_TOT', type: 'N', length: 12, decimals: 0 },    // کل بیمه ۳۰٪ این پرسنل
  { name: 'DSK_JOB', type: 'C', length: 50, decimals: 0 },    // عنوان شغل
  { name: 'DSK_SHOBE', type: 'C', length: 3, decimals: 0 }    // شعبه تأمین اجتماعی
];

// ============================================================================
// توابع اختصاصی تولید دیسکت‌های بیمه باینری DBF
// ============================================================================

/**
 * تولید فایل باینری DSKKAR00.DBF (کارگاه)
 */
export function generateSSOKarDbf(
  config: SSODisketteConfig,
  period: PayrollPeriod,
  slips: PayrollSlip[]
): Uint8Array {
  const formattedYear2Digits = period.year % 100;
  
  const totalDays = slips.reduce((sum, s) => sum + s.daysWorked, 0);
  const totalDailyWage = slips.reduce((sum, s) => sum + s.dailyWage, 0);
  const totalMonthlyBase = slips.reduce((sum, s) => sum + s.baseSalary, 0);
  const totalBenefits = slips.reduce((sum, s) => sum + (s.housingAllowance + s.groceryAllowance + s.positionAllowance), 0);
  const totalInsuredWage = slips.reduce((sum, s) => sum + s.insuredGrossSalary, 0);
  const totalGross = slips.reduce((sum, s) => sum + s.grossSalary, 0);
  const totalBMO7 = slips.reduce((sum, s) => sum + s.employeeInsurance7Percent, 0);
  const totalKAR20 = slips.reduce((sum, s) => sum + s.employerInsurance20Percent, 0);
  const totalBIK3 = slips.reduce((sum, s) => sum + s.unemploymentInsurance3Percent, 0);
  const totalBIMH30 = slips.reduce((sum, s) => sum + s.totalInsurance30Percent, 0);

  // محاسبه درصدهای نرخ حق بیمه کارگاه (متغیر بر اساس سال یا کارگاه)
  const empRate = typeof config.employeeRate === 'number' ? config.employeeRate : 7;
  const emplyrRate = typeof config.employerRate === 'number' ? config.employerRate : 20;
  const unempRate = typeof config.unemploymentRate === 'number' ? config.unemploymentRate : 3;
  const hardLaborRate = typeof config.extraHardLaborRate === 'number' ? config.extraHardLaborRate : 0;
  const totalEmployerRate = emplyrRate + unempRate + hardLaborRate;
  const totalRate = empRate + totalEmployerRate;

  const karRecord: Record<string, string | number> = {
    DSK_ID: config.workshopCode.padEnd(10, ' ').slice(0, 10),
    DSK_NAME: config.workshopName.slice(0, 100),
    DSK_FARM: config.employerName.slice(0, 100),
    DSK_ADR: 'تهران، بلوار اصلی پلتفرم هابینو'.slice(0, 100),
    DSK_KIND: 0,
    DSK_YY: formattedYear2Digits,
    DSK_MM: period.month,
    DSK_LISTNO: config.subContractCode ? config.subContractCode.slice(0, 12) : '00',
    DSK_DISC: `لیست حقوق و دستمزد ماهانه ${period.monthName} ${period.year} پلتفرم هابینو`,
    DSK_NUM: slips.length,
    DSK_TDD: totalDays,
    DSK_TROOZ: totalDailyWage,
    DSK_TMAH: totalMonthlyBase,
    DSK_TMAZ: totalBenefits,
    DSK_TMASH: totalInsuredWage,
    DSK_TTOTL: totalGross,
    DSK_TBMO: totalBMO7,
    DSK_TKAR: totalKAR20,
    DSK_TBIK: totalBIK3,
    DSK_RATE: totalRate,
    DSK_PRATE: totalEmployerRate,
    DSK_BIMH: totalBIMH30
  };

  return createDbfBinary(SSO_KAR_DBF_FIELDS, [karRecord]);
}

/**
 * تولید فایل باینری DSKVOR00.DBF (ریز پرسنل)
 */
export function generateSSOVorDbf(
  config: SSODisketteConfig,
  period: PayrollPeriod,
  slips: PayrollSlip[]
): Uint8Array {
  const records = slips.map((slip, index) => {
    // تفکیک نام و نام خانوادگی برای فیلدهای DSK_NAME و DSK_NAME1
    const nameParts = (slip.employeeName || '').trim().split(' ');
    const firstName = nameParts.length > 1 ? nameParts[0] : slip.employeeName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : slip.employeeName;

    // فرمت تاریخ بدون خط فاصله (14030101)
    const startDateFormatted = `${period.year}${String(period.month).padStart(2, '0')}01`;
    const benefitsAmount = slip.housingAllowance + slip.groceryAllowance + slip.positionAllowance;

    const row: Record<string, string | number> = {
      DSK_ID: config.workshopCode.padEnd(10, ' ').slice(0, 10),
      DSK_NAME: lastName.slice(0, 50),
      DSK_FARM: config.employerName.slice(0, 50),
      DSK_RADIF: index + 1,
      DSK_BNO: (slip.ssoInsuranceNumber || '').padEnd(10, ' ').slice(0, 10),
      DSK_IDNO: (slip.identityNumber || slip.nationalId || '').slice(0, 10),
      DSK_MELI: (slip.nationalId || '').padEnd(10, '0').slice(0, 10),
      DSK_NAME1: firstName.slice(0, 50),
      DSK_FNAME: (slip.fatherName || 'محمد').slice(0, 50),
      DSK_DOB: '13700101',
      DSK_SHNO: (slip.identityNumber || slip.nationalId || '').slice(0, 10),
      DSK_SDATE: startDateFormatted,
      DSK_EDATE: '',
      DSK_ROOZ: slip.daysWorked,
      DSK_DROOZ: slip.dailyWage,
      DSK_DMAH: slip.baseSalary,
      DSK_DMAZ: benefitsAmount,
      DSK_DSOK: slip.insuredGrossSalary,
      DSK_DCOL: slip.grossSalary,
      DSK_BMO: slip.employeeInsurance7Percent,
      DSK_KAR: slip.employerInsurance20Percent,
      DSK_BIK: slip.unemploymentInsurance3Percent,
      DSK_TOT: slip.totalInsurance30Percent,
      DSK_JOB: (slip.jobTitle || 'کارشناس').slice(0, 50),
      DSK_SHOBE: config.insuranceBranch ? config.insuranceBranch.replace(/\D/g, '').slice(0, 3) || '001' : '001'
    };

    return row;
  });

  return createDbfBinary(SSO_VOR_DBF_FIELDS, records);
}

/**
 * بسته کامل دیسکت تأمین اجتماعی با فرمت‌های باینری استاندارد DBF
 */
export function generateSSODbfPackage(
  config: SSODisketteConfig,
  period: PayrollPeriod,
  slips: PayrollSlip[]
) {
  const karDbf = generateSSOKarDbf(config, period, slips);
  const vorDbf = generateSSOVorDbf(config, period, slips);

  const formattedYear = String(period.year % 100).padStart(2, '0');
  const formattedMonth = String(period.month).padStart(2, '0');

  const karFileName = `DSKKAR00.DBF`;
  const vorFileName = `DSKVOR00.DBF`;

  return {
    karDbf,
    vorDbf,
    karFileName,
    vorFileName,
    karSizeBytes: karDbf.byteLength,
    vorSizeBytes: vorDbf.byteLength,
    periodLabel: `${formattedYear}${formattedMonth}`,
    recordCount: slips.length
  };
}

/**
 * تابع دانلود فایل باینری DBF در مرورگر
 */
export function downloadDbfFile(data: Uint8Array, fileName: string) {
  const blob = new Blob([data], { type: 'application/x-dbase;charset=windows-1256' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * دانلود فایل متنی استاندارد دیسکت با فرمت UTF-8 با BOM یا Windows-1256
 */
export function downloadTextFile(content: string, fileName: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * اعتبارسنجی الگوریتم ۱۰ رقمی کد ملی ایران (Checksum Algorithm)
 */
export function validateIranianNationalCode(code: string): boolean {
  const cleaned = (code || '').trim().replace(/\D/g, '');
  if (cleaned.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(cleaned)) return false; // ارقام یکسان مثل 1111111111 نامعتبر است

  const check = parseInt(cleaned.charAt(9), 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (10 - i);
  }
  const remainder = sum % 11;
  return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

export interface SSOValidationReport {
  isValid: boolean;
  canExport: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalPersonnel: number;
    totalGrossSalary: number;
    totalInsurance30Percent: number;
    totalEmployeeShare7: number;
    totalEmployerShare23: number;
    workshopCode: string;
    periodString: string;
  };
}

/**
 * بررسی انطباق ساختاری با قوانین سامانه خدمات غیرحضوری تأمین اجتماعی (eservices.tamin.ir)
 */
export function validateSSOPackage(
  config: SSODisketteConfig,
  period: PayrollPeriod,
  slips: PayrollSlip[]
): SSOValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ۱. اعتبارسنجی کارگاه
  const cleanWorkshop = (config.workshopCode || '').trim().replace(/\D/g, '');
  if (!cleanWorkshop) {
    errors.push('کد کارگاه ۱۰ رقمی تأمین اجتماعی وارد نشده است.');
  } else if (cleanWorkshop.length !== 10) {
    errors.push(`کد کارگاه باید دقیقاً ۱۰ رقم باشد (کد فعلی: ${cleanWorkshop.length} رقم).`);
  }

  if (!config.workshopName || config.workshopName.trim().length < 3) {
    errors.push('نام کارگاه باید حداقل ۳ کاراکتر باشد.');
  }

  if (!config.employerName || config.employerName.trim().length < 3) {
    warnings.push('نام کارفرما وارد نشده یا کوتاه است (به صورت پیش‌فرض درج خواهد شد).');
  }

  // ۲. بررسی پرسنل
  if (!slips || slips.length === 0) {
    errors.push('هیچ فیش حقوقی برای این دوره جهت صدور دیسکت وجود ندارد.');
  }

  const seenNationalIds = new Set<string>();
  const maxDaysInMonth = period.month <= 6 ? 31 : period.month <= 11 ? 30 : 29;

  slips.forEach((slip, idx) => {
    const rowNum = idx + 1;
    const name = slip.employeeName || `پرسنل ردیف ${rowNum}`;

    // کد ملی
    const nid = (slip.nationalId || '').trim();
    if (!nid) {
      errors.push(`ردیف ${rowNum} (${name}): کد ملی ثبت نشده است.`);
    } else if (!validateIranianNationalCode(nid)) {
      warnings.push(`ردیف ${rowNum} (${name}): رقم کنترلی کد ملی (${nid}) نامعتبر به نظر می‌رسد.`);
    }

    if (nid && seenNationalIds.has(nid)) {
      errors.push(`ردیف ${rowNum} (${name}): کد ملی تکراری (${nid}) در لیست وجود دارد.`);
    }
    if (nid) seenNationalIds.add(nid);

    // شماره بیمه
    const ssoNo = (slip.ssoInsuranceNumber || '').trim().replace(/\D/g, '');
    if (!ssoNo) {
      warnings.push(`ردیف ${rowNum} (${name}): شماره بیمه تأمین اجتماعی وارد نشده است.`);
    } else if (ssoNo.length < 8 || ssoNo.length > 10) {
      warnings.push(`ردیف ${rowNum} (${name}): شماره بیمه (${ssoNo}) باید بین ۸ تا ۱۰ رقم باشد.`);
    }

    // روزهای کارکرد
    if (slip.daysWorked > maxDaysInMonth) {
      errors.push(`ردیف ${rowNum} (${name}): روز کارکرد (${slip.daysWorked}) از تعداد روزهای ماه (${maxDaysInMonth} روز) بیشتر است.`);
    } else if (slip.daysWorked <= 0) {
      warnings.push(`ردیف ${rowNum} (${name}): کارکرد صفر یا منفی ثبت شده است.`);
    }

    // حداقل و سقف دستمزد روزانه (سال ۱۴۰۵)
    const minDailyWage = 2_388_728; // حداقل دستمزد روزانه سال
    if (slip.dailyWage > 0 && slip.dailyWage < minDailyWage) {
      warnings.push(`ردیف ${rowNum} (${name}): دستمزد روزانه (${slip.dailyWage.toLocaleString('fa-IR')}) کمتر از حداقل مصوب قانون کار است.`);
    }
  });

  const totalGross = slips.reduce((sum, s) => sum + (s.grossSalary || 0), 0);
  const totalBIMH30 = slips.reduce((sum, s) => sum + (s.totalInsurance30Percent || 0), 0);
  const totalBMO7 = slips.reduce((sum, s) => sum + (s.employeeInsurance7Percent || 0), 0);
  const totalKAR23 = slips.reduce((sum, s) => sum + (s.employerInsurance20Percent + s.unemploymentInsurance3Percent || 0), 0);

  return {
    isValid: errors.length === 0,
    canExport: errors.length === 0,
    errors,
    warnings,
    metrics: {
      totalPersonnel: slips.length,
      totalGrossSalary: totalGross,
      totalInsurance30Percent: totalBIMH30,
      totalEmployeeShare7: totalBMO7,
      totalEmployerShare23: totalKAR23,
      workshopCode: cleanWorkshop || config.workshopCode || 'نامشخص',
      periodString: `${period.year}/${String(period.month).padStart(2, '0')} (${period.monthName})`
    }
  };
}

/**
 * تولید فرمت متنی استاندارد DSKKAR.txt و DSKVOR.txt جهت آپلود در شعب یا پرتال eservices
 */
export function generateSSOTextFormat(
  config: SSODisketteConfig,
  period: PayrollPeriod,
  slips: PayrollSlip[]
): { karText: string; vorText: string; karTextName: string; vorTextName: string; manifestJson: string } {
  const formattedYear2 = String(period.year % 100).padStart(2, '0');
  const formattedMonth = String(period.month).padStart(2, '0');

  const totalDays = slips.reduce((sum, s) => sum + s.daysWorked, 0);
  const totalDailyWage = slips.reduce((sum, s) => sum + s.dailyWage, 0);
  const totalMonthlyBase = slips.reduce((sum, s) => sum + s.baseSalary, 0);
  const totalBenefits = slips.reduce((sum, s) => sum + (s.housingAllowance + s.groceryAllowance + s.positionAllowance), 0);
  const totalInsuredWage = slips.reduce((sum, s) => sum + s.insuredGrossSalary, 0);
  const totalGross = slips.reduce((sum, s) => sum + s.grossSalary, 0);
  const totalBMO7 = slips.reduce((sum, s) => sum + s.employeeInsurance7Percent, 0);
  const totalKAR20 = slips.reduce((sum, s) => sum + s.employerInsurance20Percent, 0);
  const totalBIK3 = slips.reduce((sum, s) => sum + s.unemploymentInsurance3Percent, 0);
  const totalBIMH30 = slips.reduce((sum, s) => sum + s.totalInsurance30Percent, 0);

  const empRate = typeof config.employeeRate === 'number' ? config.employeeRate : 7;
  const emplyrRate = typeof config.employerRate === 'number' ? config.employerRate : 20;
  const unempRate = typeof config.unemploymentRate === 'number' ? config.unemploymentRate : 3;
  const hardLaborRate = typeof config.extraHardLaborRate === 'number' ? config.extraHardLaborRate : 0;
  const totalEmployerRate = emplyrRate + unempRate + hardLaborRate;
  const totalRate = empRate + totalEmployerRate;

  // تولید هدر DSKKAR.txt (CSV / Pipe-Delimited استاندارد شعب)
  const karFields = [
    config.workshopCode.padEnd(10, '0').slice(0, 10),
    config.workshopName.replace(/[,|]/g, ' '),
    config.employerName.replace(/[,|]/g, ' '),
    'تهران هابینو',
    '0', // DSK_KIND
    formattedYear2,
    formattedMonth,
    config.subContractCode || '00',
    slips.length,
    totalDays,
    totalDailyWage,
    totalMonthlyBase,
    totalBenefits,
    totalInsuredWage,
    totalGross,
    totalBMO7,
    totalKAR20,
    totalBIK3,
    String(totalRate),
    String(totalEmployerRate),
    totalBIMH30
  ];
  const karText = karFields.join('|') + '\r\n';

  // تولید سطرهای DSKVOR.txt
  const vorLines = slips.map((slip, idx) => {
    const nameParts = (slip.employeeName || '').trim().split(' ');
    const firstName = nameParts.length > 1 ? nameParts[0] : slip.employeeName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : slip.employeeName;
    const benefits = slip.housingAllowance + slip.groceryAllowance + slip.positionAllowance;
    const startDate = `${period.year}${formattedMonth}01`;

    const row = [
      config.workshopCode.padEnd(10, '0').slice(0, 10),
      lastName.replace(/[,|]/g, ' '),
      config.employerName.replace(/[,|]/g, ' '),
      idx + 1,
      (slip.ssoInsuranceNumber || '').padEnd(10, '0').slice(0, 10),
      (slip.nationalId || '').padEnd(10, '0').slice(0, 10),
      (slip.nationalId || '').padEnd(10, '0').slice(0, 10),
      firstName.replace(/[,|]/g, ' '),
      (slip.fatherName || 'محمد').replace(/[,|]/g, ' '),
      '13700101',
      (slip.identityNumber || slip.nationalId || '').slice(0, 10),
      startDate,
      '',
      slip.daysWorked,
      slip.dailyWage,
      slip.baseSalary,
      benefits,
      slip.insuredGrossSalary,
      slip.grossSalary,
      slip.employeeInsurance7Percent,
      slip.employerInsurance20Percent,
      slip.unemploymentInsurance3Percent,
      slip.totalInsurance30Percent,
      (slip.jobTitle || 'کارشناس').replace(/[,|]/g, ' '),
      config.insuranceBranch ? config.insuranceBranch.replace(/\D/g, '').slice(0, 3) || '001' : '001'
    ];
    return row.join('|');
  });
  const vorText = vorLines.join('\r\n') + '\r\n';

  const manifestJson = JSON.stringify({
    generator: 'Habino Accounting SSO Engine v1405.1',
    portalCompatibility: 'eservices.tamin.ir',
    standard: 'ListDisk 1405 (DBF & TXT)',
    generatedAt: new Date().toISOString(),
    workshopCode: config.workshopCode,
    workshopName: config.workshopName,
    period: {
      year: period.year,
      month: period.month,
      monthName: period.monthName
    },
    summary: {
      personnelCount: slips.length,
      totalDays,
      totalInsuredSalary: totalInsuredWage,
      totalInsurance30Percent: totalBIMH30,
      totalEmployee7Percent: totalBMO7,
      totalEmployer23Percent: totalKAR20 + totalBIK3
    },
    files: [
      { name: 'DSKKAR00.DBF', format: 'dBase III binary CP1256' },
      { name: 'DSKVOR00.DBF', format: 'dBase III binary CP1256' },
      { name: 'DSKKAR.txt', format: 'Pipe-delimited UTF-8 / Windows-1256' },
      { name: 'DSKVOR.txt', format: 'Pipe-delimited UTF-8 / Windows-1256' }
    ]
  }, null, 2);

  return {
    karText,
    vorText,
    karTextName: `DSKKAR_${formattedYear2}${formattedMonth}.txt`,
    vorTextName: `DSKVOR_${formattedYear2}${formattedMonth}.txt`,
    manifestJson
  };
}
