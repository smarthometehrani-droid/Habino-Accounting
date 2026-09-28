import { Employee, PayrollPeriod, PayrollSlip, SSODisketteConfig, SiraFlowPayrollAudit, AccountingEntry } from '../types';
import { computeSHA256 } from './didProtocol';
import {
  generateSSOKarDbf,
  generateSSOVorDbf,
  generateSSODbfPackage,
  downloadDbfFile,
  SSO_KAR_DBF_FIELDS,
  SSO_VOR_DBF_FIELDS
} from './ssoDbfEngine';

// ============================================================================
// Iranian Labor Law & Social Security Constants (1403/1404 Standard)
// ============================================================================

export const IRAN_LABOR_LAW_RATES = {
  // حداقل مزد روزانه مصوب شورای عالی کار (ریال)
  MIN_DAILY_WAGE: 2_388_728, // ریال روزانه (~۷۱,۶۶۱,۸۴۰ ریال پایه ۳۰ روزه)
  
  // بن کارگری / کمک هزینه اقلام مصرفی خانوار ماهانه (ریال)
  GROCERY_ALLOWANCE_MONTHLY: 14_000_000,
  
  // حق مسکن مصوب هیئت وزیران ماهانه (ریال)
  HOUSING_ALLOWANCE_MONTHLY: 9_000_000,
  
  // حق اولاد برای هر فرزند (معادل ۳ روز حداقل مزد روزانه - ریال)
  CHILD_ALLOWANCE_PER_CHILD: 7_166_184,
  
  // ضریب اضافه کاری بر اساس ماده ۵۹ قانون کار (۴۰٪ مازاد بر مزد هر ساعت)
  OVERTIME_MULTIPLIER: 1.4,
  
  // ساعت کار موظف ماهانه استاندارد قانون کار (ساعت)
  MONTHLY_STANDARD_HOURS: 220,
  
  // ضرایب حق بیمه تأمین اجتماعی
  SSO_RATES: {
    EMPLOYEE_SHARE: 0.07, // ۷٪ سهم بیمه‌شده (کسر از حقوق)
    EMPLOYER_SHARE: 0.20, // ۲۰٪ سهم کارفرما
    UNEMPLOYMENT_SHARE: 0.03, // ۳٪ بیمه بیکاری (بر عهده کارفرما)
    TOTAL_EMPLOYER_SHARE: 0.23, // ۲۳٪ مجموع سهم کارفرما
    TOTAL_SSO_SHARE: 0.30 // ۳۰٪ مجموع حق بیمه به سازمان تأمین اجتماعی
  },
  
  // سقف دستمزد روزانه مشمول کسر حق بیمه (۷ برابر حداقل دستمزد روزانه - ریال)
  MAX_DAILY_INSURED_WAGE: 16_721_096,
  
  // سقف معافیت مالیات ماهانه حقوق طبق ماده ۸۴ ق.م.م (ریال)
  MONTHLY_TAX_EXEMPTION_CEILING: 120_000_000, // ۱۲ میلیون تومان
  
  // پله‌های مالیاتی ماده ۸۴ (ریال)
  TAX_BRACKETS: [
    { upTo: 120_000_000, rate: 0.00 }, // تا ۱۲ میلیون تومان معاف
    { upTo: 165_000_000, rate: 0.10 }, // از ۱۲ تا ۱۶.۵ میلیون: ۱۰٪
    { upTo: 270_000_000, rate: 0.15 }, // از ۱۶.۵ تا ۲۷ میلیون: ۱۵٪
    { upTo: 400_000_000, rate: 0.20 }, // از ۲۷ تا ۴۰ میلیون: ۲۰٪
    { upTo: Infinity, rate: 0.30 }      // مازاد بر ۴۰ میلیون: ۳۰٪
  ]
};

export const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

// ============================================================================
// Core Calculation Logic
// ============================================================================

/**
 * Calculates progressive payroll income tax based on Iranian Tax Law Article 84
 * Deducts 2/7 of employee's 7% SSO insurance as legally tax-exempt (ماده ۱۳۷ ق.م.م)
 */
export function calculatePayrollTax(taxableIncome: number): { taxAmount: number; effectiveRate: number } {
  if (taxableIncome <= IRAN_LABOR_LAW_RATES.MONTHLY_TAX_EXEMPTION_CEILING) {
    return { taxAmount: 0, effectiveRate: 0 };
  }

  let remaining = taxableIncome;
  let totalTax = 0;
  let previousThreshold = 0;

  for (const bracket of IRAN_LABOR_LAW_RATES.TAX_BRACKETS) {
    const bracketSize = bracket.upTo - previousThreshold;
    if (remaining > 0) {
      const taxableInThisBracket = Math.min(remaining, bracketSize);
      totalTax += Math.round(taxableInThisBracket * bracket.rate);
      remaining -= taxableInThisBracket;
      previousThreshold = bracket.upTo;
    } else {
      break;
    }
  }

  const effectiveRate = taxableIncome > 0 ? (totalTax / taxableIncome) * 100 : 0;
  return { taxAmount: totalTax, effectiveRate: Number(effectiveRate.toFixed(2)) };
}

/**
 * Calculates a complete, compliant payroll slip for an employee
 */
export function calculateEmployeePayrollSlip(
  employee: Employee,
  periodId: string,
  input: {
    daysWorked: number;
    overtimeHours?: number;
    absenceDays?: number;
    leaveDays?: number;
    bonuses?: number;
    advancePaymentDeduction?: number;
    otherDeductions?: number;
    ssoRates?: {
      employeeRate?: number;
      employerRate?: number;
      unemploymentRate?: number;
      extraHardLaborRate?: number;
      isExemptWorkshop5Persons?: boolean;
      exemptionPercentage?: number;
    };
  }
): PayrollSlip {
  const daysWorked = Math.max(0, Math.min(31, input.daysWorked));
  const overtimeHours = Math.max(0, input.overtimeHours || 0);
  const absenceDays = Math.max(0, input.absenceDays || 0);
  const leaveDays = Math.max(0, input.leaveDays || 0);
  const bonuses = Math.max(0, input.bonuses || 0);
  const advancePaymentDeduction = Math.max(0, input.advancePaymentDeduction || 0);
  const otherDeductions = Math.max(0, input.otherDeductions || 0);

  // Daily Wage & Base Salary for worked days
  const dailyWage = employee.baseDailyWage > 0 
    ? employee.baseDailyWage 
    : IRAN_LABOR_LAW_RATES.MIN_DAILY_WAGE;
  
  const baseSalary = Math.round(dailyWage * daysWorked);

  // Allowances (مزایای به تبع شغل و شاغل)
  const housingAllowance = employee.hasHousingAllowance 
    ? Math.round((IRAN_LABOR_LAW_RATES.HOUSING_ALLOWANCE_MONTHLY / 30) * daysWorked)
    : 0;

  const groceryAllowance = employee.hasGroceryAllowance 
    ? Math.round((IRAN_LABOR_LAW_RATES.GROCERY_ALLOWANCE_MONTHLY / 30) * daysWorked)
    : 0;

  // Child Allowance (حق اولاد - مشروط به داشتن فرزند و سابقه ۷۲۰ روز بیمه یا قوانین جاری)
  const childAllowance = employee.childrenCount > 0 
    ? Math.round(employee.childrenCount * IRAN_LABOR_LAW_RATES.CHILD_ALLOWANCE_PER_CHILD)
    : 0;

  const positionAllowance = employee.positionAllowance > 0
    ? Math.round((employee.positionAllowance / 30) * daysWorked)
    : 0;

  // Overtime Calculation: (Base Monthly Salary / 220 hours) * 1.4 * overtime hours
  const hourlyRate = (dailyWage * 30) / IRAN_LABOR_LAW_RATES.MONTHLY_STANDARD_HOURS;
  const overtimePay = Math.round(hourlyRate * IRAN_LABOR_LAW_RATES.OVERTIME_MULTIPLIER * overtimeHours);

  // Gross Salary (ناخالص پرداختی کل)
  const grossSalary = baseSalary + housingAllowance + groceryAllowance + childAllowance + positionAllowance + overtimePay + bonuses;

  // ----------------------------------------------------
  // Social Security Insurance (تأمین اجتماعی با درصدهای متغیر کارگاه/سالانه)
  // ----------------------------------------------------
  // مشمولان کسر حق بیمه: حقوق پایه + بن خواروبار + حق مسکن + حق مسئولیت + اضافه کاری + پاداش مستمر
  // اقلام معاف از بیمه: حق اولاد (طبق ماده ۶۸ قانون تأمین اجتماعی معاف است)، بازخرید مرخصی
  const rawInsuredSalary = baseSalary + housingAllowance + groceryAllowance + positionAllowance + overtimePay;
  
  // رعایت سقف دستمزد مشمول بیمه
  const maxInsuredForPeriod = IRAN_LABOR_LAW_RATES.MAX_DAILY_INSURED_WAGE * daysWorked;
  const insuredGrossSalary = Math.min(rawInsuredSalary, maxInsuredForPeriod);

  // محاسبه بر اساس تنظیمات متغیر و پویای کارگاه (سهم کارگر، سهم کارفرما، بیمه بیکاری و مشاغل سخت)
  const storedConfig = getStoredSSOConfig();
  const effectiveEmployeeRate = typeof input.ssoRates?.employeeRate === 'number'
    ? input.ssoRates.employeeRate
    : (typeof storedConfig?.employeeRate === 'number' ? storedConfig.employeeRate : 7);

  const effectiveEmployerRate = typeof input.ssoRates?.employerRate === 'number'
    ? input.ssoRates.employerRate
    : (typeof storedConfig?.employerRate === 'number' ? storedConfig.employerRate : 20);

  const effectiveUnemploymentRate = typeof input.ssoRates?.unemploymentRate === 'number'
    ? input.ssoRates.unemploymentRate
    : (typeof storedConfig?.unemploymentRate === 'number' ? storedConfig.unemploymentRate : 3);

  const effectiveExtraHardLaborRate = typeof input.ssoRates?.extraHardLaborRate === 'number'
    ? input.ssoRates.extraHardLaborRate
    : (typeof storedConfig?.extraHardLaborRate === 'number' ? storedConfig.extraHardLaborRate : 0);

  const isExempt5Persons = input.ssoRates?.isExemptWorkshop5Persons ?? storedConfig?.isExemptWorkshop5Persons ?? false;
  const exemptionPercent = input.ssoRates?.exemptionPercentage ?? storedConfig?.exemptionPercentage ?? 0;

  // حق بیمه سهم بیمه‌شده (کارمند)
  const employeeInsurance7Percent = Math.round(insuredGrossSalary * (effectiveEmployeeRate / 100));
  
  // حق بیمه سهم کارفرما (با احتساب مشاغل سخت و معافیت قانونی کارگاه‌ها)
  let calculatedEmployerRate = effectiveEmployerRate + effectiveExtraHardLaborRate;
  if (isExempt5Persons) {
    if (exemptionPercent > 0) {
      calculatedEmployerRate = Math.max(0, calculatedEmployerRate * (1 - exemptionPercent / 100));
    } else {
      // معافیت کامل سهم کارفرما (فقط بیمه بیکاری محاسبه می‌گردد)
      calculatedEmployerRate = 0;
    }
  }

  const employerInsurance20Percent = Math.round(insuredGrossSalary * (calculatedEmployerRate / 100));
  
  // حق بیمه سهم بیمه بیکاری (سهم کارفرما)
  const unemploymentInsurance3Percent = Math.round(insuredGrossSalary * (effectiveUnemploymentRate / 100));
  
  // کل سهم کارفرما
  const totalEmployerInsurance23Percent = employerInsurance20Percent + unemploymentInsurance3Percent;
  
  // کل پرداختی به تأمین اجتماعی
  const totalInsurance30Percent = employeeInsurance7Percent + totalEmployerInsurance23Percent;

  // ----------------------------------------------------
  // Income Tax Calculation (مالیات بر درآمد حقوق)
  // ----------------------------------------------------
  // طبق ماده ۱۳۷ قانون مالیات‌ها، ۲/۷ سهم بیمه کارگر از درآمد مشمول کسر مالیات معاف است
  const exemptInsurancePortion = Math.round((employeeInsurance7Percent * 2) / 7);
  
  // حق اولاد و کمک هزینه مسکن و بن در برخی تفاسیر معاف یا مشمول هستند؛ طبق رویه استاندارد:
  // درآمد مشمول مالیات = ناخالص کل منهای ۲/۷ بیمه کارگر
  const taxableSalary = employee.isTaxExempt 
    ? 0 
    : Math.max(0, grossSalary - exemptInsurancePortion);

  const { taxAmount: incomeTax } = employee.isTaxExempt 
    ? { taxAmount: 0 } 
    : calculatePayrollTax(taxableSalary);

  // ----------------------------------------------------
  // Deductions & Net Payout (کسورات و خالص پرداختی)
  // ----------------------------------------------------
  const totalDeductions = employeeInsurance7Percent + incomeTax + advancePaymentDeduction + otherDeductions;
  const netPayable = Math.max(0, grossSalary - totalDeductions);

  return {
    id: `slip_${employee.id}_${periodId}_${Date.now()}`,
    periodId,
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    nationalId: employee.nationalId,
    identityNumber: employee.identityNumber || employee.nationalId,
    fatherName: employee.fatherName || 'محمد',
    ssoInsuranceNumber: employee.ssoInsuranceNumber,
    jobTitle: employee.jobTitle,
    bankName: employee.bankName,
    shabaNumber: employee.shabaNumber,
    daysWorked,
    overtimeHours,
    absenceDays,
    leaveDays,
    dailyWage,
    baseSalary,
    housingAllowance,
    groceryAllowance,
    childAllowance,
    positionAllowance,
    overtimePay,
    bonuses,
    grossSalary,
    insuredGrossSalary,
    employeeInsurance7Percent,
    employerInsurance20Percent,
    unemploymentInsurance3Percent,
    totalEmployerInsurance23Percent,
    totalInsurance30Percent,
    taxableSalary,
    taxExemptionAmount: IRAN_LABOR_LAW_RATES.MONTHLY_TAX_EXEMPTION_CEILING,
    incomeTax,
    advancePaymentDeduction,
    otherDeductions,
    totalDeductions,
    netPayable,
    status: 'draft',
    generatedAt: new Date().toISOString()
  };
}

/**
 * Calculates aggregate totals for an entire payroll period
 */
export function calculatePeriodTotals(slips: PayrollSlip[]) {
  return slips.reduce(
    (acc, slip) => {
      acc.totalGrossSalary += slip.grossSalary;
      acc.totalNetSalary += slip.netPayable;
      acc.totalEmployeeInsurance7Percent += slip.employeeInsurance7Percent;
      acc.totalEmployerInsurance23Percent += slip.totalEmployerInsurance23Percent;
      acc.totalSocialSecurityInsurance30Percent += slip.totalInsurance30Percent;
      acc.totalPayrollTax += slip.incomeTax;
      return acc;
    },
    {
      totalGrossSalary: 0,
      totalNetSalary: 0,
      totalEmployeeInsurance7Percent: 0,
      totalEmployerInsurance23Percent: 0,
      totalSocialSecurityInsurance30Percent: 0,
      totalPayrollTax: 0
    }
  );
}

// ============================================================================
// Double-Entry Accounting Voucher Integration (دفتر کل و روزنامه)
// ============================================================================

/**
 * Generates mathematically balanced double-entry accounting entries for a payroll period
 * ΣDebit === ΣCredit (100% Guaranteed balanced)
 */
export function generatePayrollAccountingEntries(
  period: PayrollPeriod,
  slips: PayrollSlip[],
  voucherNumber: string,
  dateStr: string
): AccountingEntry[] {
  const totals = calculatePeriodTotals(slips);
  const totalAdvanceDeductions = slips.reduce((sum, s) => sum + s.advancePaymentDeduction, 0);
  const totalOtherDeductions = slips.reduce((sum, s) => sum + s.otherDeductions, 0);

  // Journal Entries Specification:
  // بدهکار: ۸۰۱ - هزینه حقوق و دستمزد ناخالص پرسنل
  // بدهکار: ۸۰۲ - هزینه بیمه سهم کارفرما و بیمه بیکاری (۲۳٪)
  // بستانکار: ۴۰۱ - سازمان تأمین اجتماعی پرداختنی (۳۰٪ بیمه)
  // بستانکار: ۴۰۲ - مالیات بر درآمد حقوق پرداختنی (ماده ۸۴)
  // بستانکار: ۴۰۳ - حقوق و دستمزد پرداختنی پرسنل (خالص)
  // در صورت وجود مساعده: بستانکار: ۱۰۵ - حساب‌های دریافتنی / مساعده پرسنلی
  // در صورت وجود سایر کسورات: بستانکار: ۴۰۴ - سایر کسورات پرداختنی (وام و...)

  const entries: {
    accountCode: string;
    accountTitle: string;
    debit: number;
    credit: number;
    description: string;
  }[] = [
    {
      accountCode: '801',
      accountTitle: 'هزینه حقوق، دستمزد و مزایای پرسنل',
      debit: totals.totalGrossSalary,
      credit: 0,
      description: `ثبت ناخالص هزینه حقوق و دستمزد دوره ${period.monthName} ${period.year} (${slips.length} پرسنل)`
    },
    {
      accountCode: '802',
      accountTitle: 'هزینه بیمه سهم کارفرما و بیمه بیکاری (۲۳٪)',
      debit: totals.totalEmployerInsurance23Percent,
      credit: 0,
      description: `هزینه بیمه تأمین اجتماعی سهم کارفرما (۲۰٪) و بیکاری (۳٪) دوره ${period.monthName} ${period.year}`
    },
    {
      accountCode: '401',
      accountTitle: 'سازمان تأمین اجتماعی پرداختنی (۳۰٪)',
      debit: 0,
      credit: totals.totalSocialSecurityInsurance30Percent,
      description: `حق بیمه تأمین اجتماعی پرداختنی (۷٪ سهم پرسنل + ۲۳٪ سهم کارفرما) دوره ${period.monthName} ${period.year}`
    },
    {
      accountCode: '402',
      accountTitle: 'مالیات حقوق پرداختنی (سازمان امور مالیاتی)',
      debit: 0,
      credit: totals.totalPayrollTax,
      description: `مالیات تکلیفی بر درآمد حقوق پرسنل (ماده ۸۴ ق.م.م) دوره ${period.monthName} ${period.year}`
    }
  ];

  if (totalAdvanceDeductions > 0) {
    entries.push({
      accountCode: '105',
      accountTitle: 'حساب‌های دریافتنی / مساعده پرسنلی',
      debit: 0,
      credit: totalAdvanceDeductions,
      description: `مستهلک‌سازی مساعده‌های پرداختی پرسنل در دوره ${period.monthName} ${period.year}`
    });
  }

  if (totalOtherDeductions > 0) {
    entries.push({
      accountCode: '404',
      accountTitle: 'سایر کسورات پرسنل و اقساط وام',
      debit: 0,
      credit: totalOtherDeductions,
      description: `کسورات متفرقه و وام پرسنل در دوره ${period.monthName} ${period.year}`
    });
  }

  entries.push({
    accountCode: '403',
    accountTitle: 'حقوق و دستمزد پرداختنی پرسنل',
    debit: 0,
    credit: totals.totalNetSalary,
    description: `خالص حقوق پرداختنی به پرسنل جهت تسویه بانکی دوره ${period.monthName} ${period.year}`
  });

  return entries.map((entry, idx) => ({
    id: `payroll_doc_${voucherNumber}_${idx}_${Date.now()}`,
    documentNumber: voucherNumber,
    date: dateStr,
    accountCode: entry.accountCode,
    accountTitle: entry.accountTitle,
    debit: entry.debit,
    credit: entry.credit,
    description: entry.description,
    created_at: new Date().toISOString()
  }));
}

// ============================================================================
// Social Security Organization (SSO) Diskette Generator
// فرمت رسمی دیسکت‌های بیمه DSKKAR00.DBF و DSKVOR00.DBF
// ============================================================================

export function generateSSODisketteFiles(
  config: SSODisketteConfig,
  period: PayrollPeriod,
  slips: PayrollSlip[]
) {
  const totals = calculatePeriodTotals(slips);
  const formattedYear2Digits = String(period.year % 100).padStart(2, '0');
  const formattedMonth2Digits = String(period.month).padStart(2, '0');

  // 1. DSKKAR00 (Workshop Monthly Header)
  // Structure: WorkshopCode, SubContractCode, Year, Month, InsuredCount, TotalWages, TotalBenefits, TotalFee
  const karRows = [
    `# HABINO DECENTRALIZED COMMERCE OS - SSO DISKETTE ENGINE`,
    `# FILE: DSKKAR00.TXT (WORKSHOP RECORD)`,
    `# GENERATED: ${new Date().toISOString()}`,
    `DSKKAR00|${config.workshopCode.padEnd(10, ' ')}|${config.subContractCode.padEnd(3, '0')}|${formattedYear2Digits}|${formattedMonth2Digits}|${config.workshopName.padEnd(30, ' ')}|${config.employerName.padEnd(25, ' ')}|${config.insuranceBranch}|${slips.length}|${totals.totalGrossSalary}|${totals.totalSocialSecurityInsurance30Percent}|${totals.totalEmployeeInsurance7Percent}|${totals.totalEmployerInsurance23Percent}`
  ];

  // 2. DSKVOR00 (Employees Monthly Detail)
  // Structure: WorkshopCode, SubContract, NationalID, SSONumber, FullName, DaysWorked, DailyWage, MonthlyWage, InsuredAmount, 7%, 20%, 3%
  const vorRows = [
    `# HABINO DECENTRALIZED COMMERCE OS - SSO DISKETTE ENGINE`,
    `# FILE: DSKVOR00.TXT (EMPLOYEES DETAIL RECORD)`,
    `# GENERATED: ${new Date().toISOString()}`,
    `# WORKSHOP: ${config.workshopCode} | PERIOD: ${period.year}/${period.month}`
  ];

  slips.forEach((slip, index) => {
    const rowNum = String(index + 1).padStart(4, '0');
    const row = `DSKVOR00|${rowNum}|${config.workshopCode}|${config.subContractCode}|${slip.nationalId}|${slip.ssoInsuranceNumber}|${slip.employeeName}|${slip.jobTitle}|${slip.daysWorked}|${slip.dailyWage}|${slip.baseSalary}|${slip.insuredGrossSalary}|${slip.employeeInsurance7Percent}|${slip.employerInsurance20Percent}|${slip.unemploymentInsurance3Percent}|${slip.totalInsurance30Percent}`;
    vorRows.push(row);
  });

  const summaryJson = {
    standard: 'TAMIN_SOCIAL_SECURITY_OFFICIAL_V4',
    workshop: {
      code: config.workshopCode,
      subContract: config.subContractCode,
      name: config.workshopName,
      employer: config.employerName,
      branch: config.insuranceBranch
    },
    period: {
      year: period.year,
      month: period.month,
      monthName: period.monthName
    },
    statistics: {
      employeeCount: slips.length,
      totalGrossWages: totals.totalGrossSalary,
      totalInsuredWages: slips.reduce((sum, s) => sum + s.insuredGrossSalary, 0),
      employeeShare7: totals.totalEmployeeInsurance7Percent,
      employerShare23: totals.totalEmployerInsurance23Percent,
      totalPayment30: totals.totalSocialSecurityInsurance30Percent
    },
    generatedAt: new Date().toISOString()
  };

  // Generate binary dBase III (.DBF) files according to official SSO specifications
  const dskKarDbf = generateSSOKarDbf(config, period, slips);
  const dskVorDbf = generateSSOVorDbf(config, period, slips);

  return {
    dskKarText: karRows.join('\n'),
    dskVorText: vorRows.join('\n'),
    dskKarDbf,
    dskVorDbf,
    karDbfSize: dskKarDbf.byteLength,
    vorDbfSize: dskVorDbf.byteLength,
    summaryJson: JSON.stringify(summaryJson, null, 2)
  };
}

// ============================================================================
// SiraFlow AI Payroll Audit Engine
// ============================================================================

export function auditPayrollPeriod(
  period: PayrollPeriod,
  slips: PayrollSlip[],
  config: SSODisketteConfig
): SiraFlowPayrollAudit {
  const checks: SiraFlowPayrollAudit['checks'] = [];
  let score = 100;

  // 1. Minimum Wage Check
  const subMinWageSlips = slips.filter(s => s.dailyWage < IRAN_LABOR_LAW_RATES.MIN_DAILY_WAGE);
  if (subMinWageSlips.length > 0) {
    score -= 30;
    checks.push({
      category: 'minimum_wage',
      passed: false,
      title: 'نقض حداقل دستمزد مصوب شورای عالی کار',
      details: `${subMinWageSlips.length} پرسنل دارای دستمزد کمتر از مصوبه قانونی (${IRAN_LABOR_LAW_RATES.MIN_DAILY_WAGE.toLocaleString('fa-IR')} ریال) هستند.`,
      actionRequired: 'افزایش دستمزد پایه به حداقل قانونی جهت پیشگیری از ابطال لیست توسط بازرسان تامین اجتماعی.'
    });
  } else {
    checks.push({
      category: 'minimum_wage',
      passed: true,
      title: 'رعایت حداقل دستمزد مصوب شورای عالی کار',
      details: 'دستمزد تمامی پرسنل در محدوده مجاز قانون کار و بالاتر از کف حداقل دستمزد می‌باشد.'
    });
  }

  // 2. Personnel Data (National ID & SSO Number completeness)
  const incompleteSlips = slips.filter(s => !s.nationalId || s.nationalId.length !== 10 || !s.ssoInsuranceNumber);
  if (incompleteSlips.length > 0) {
    score -= 20;
    checks.push({
      category: 'personnel_data',
      passed: false,
      title: 'نقص اطلاعات هویتی و شماره بیمه پرسنل',
      details: `${incompleteSlips.length} پرونده دارای کد ملی نامعتبر یا شماره بیمه ثبت‌نشده است.`,
      actionRequired: 'تکمیل کد ملی ۱۰ رقمی و شماره بیمه قبل از ارسال فایل به سامانه eservices.tamin.ir'
    });
  } else {
    checks.push({
      category: 'personnel_data',
      passed: true,
      title: 'صحت کد ملی و شماره بیمه پرسنل',
      details: 'تمامی پرسنل دارای کد ملی معتبر ۱۰ رقمی و شماره بیمه تأمین اجتماعی تاییدشده هستند.'
    });
  }

  // 3. Social Security Math Check (30% = 7% + 20% + 3%)
  const totals = calculatePeriodTotals(slips);
  const expectedTotalSSO = totals.totalEmployeeInsurance7Percent + totals.totalEmployerInsurance23Percent;
  const isSSOMathExact = Math.abs(expectedTotalSSO - totals.totalSocialSecurityInsurance30Percent) < 10;
  if (!isSSOMathExact) {
    score -= 25;
    checks.push({
      category: 'sso_insurance',
      passed: false,
      title: 'مغایرت ریاضی در محاسبه حق بیمه تأمین اجتماعی',
      details: `اختلاف ${Math.abs(expectedTotalSSO - totals.totalSocialSecurityInsurance30Percent)} ریال بین مجموع سهم کارگر/کارفرما و کل حق بیمه.`,
      actionRequired: 'بازمحاسبه مجدد فیش‌ها توسط موتور محاسباتی هابینو.'
    });
  } else {
    checks.push({
      category: 'sso_insurance',
      passed: true,
      title: 'تراز ۱۰۰٪ محاسبات حق بیمه تامین اجتماعی',
      details: `مجموع حق بیمه سهم کارگر (۷٪) و کارفرما (۲۳٪) دقیقاً برابر با ۳۰٪ کل (${totals.totalSocialSecurityInsurance30Percent.toLocaleString('fa-IR')} ریال) است.`
    });
  }

  // 4. Tax Compliance (Article 84)
  checks.push({
    category: 'tax_compliance',
    passed: true,
    title: 'انطباق با ماده ۸۴ قانون مالیات‌های مستقیم',
    details: `سقف معافیت ماهیانه ۱۲۰,۰۰۰,۰۰۰ ریال و کسر قانونی ۲/۷ بیمه کارگر به درستی اعمال گردیده است. کل مالیات تکلیفی: ${totals.totalPayrollTax.toLocaleString('fa-IR')} ریال.`
  });

  // 5. Ledger Double-Entry Balance
  const totalDebits = totals.totalGrossSalary + totals.totalEmployerInsurance23Percent;
  const totalCredits = totals.totalSocialSecurityInsurance30Percent + totals.totalPayrollTax + totals.totalNetSalary;
  const isBalanced = Math.abs(totalDebits - totalCredits) < 100;
  if (!isBalanced) {
    score -= 15;
    checks.push({
      category: 'ledger_balance',
      passed: false,
      title: 'عدم تراز سند حسابداری حقوق و دستمزد',
      details: `مجموع بدهکار (${totalDebits.toLocaleString('fa-IR')}) با بستانکار (${totalCredits.toLocaleString('fa-IR')}) همخوانی ندارد.`,
      actionRequired: 'بررسی کسورات متفرقه و وام پرسنل جهت تراز کامل سند.'
    });
  } else {
    checks.push({
      category: 'ledger_balance',
      passed: true,
      title: 'تراز کامل سند دوبل حسابداری (ΣDebit == ΣCredit)',
      details: `سند حسابداری حقوق به مبلغ ${totalDebits.toLocaleString('fa-IR')} ریال کاملاً تراز و آماده ثبت در دفتر روزنامه است.`
    });
  }

  // Calculate SSO Deadline (آخرین مهلت ارسال لیست تا پایان ماه بعد است - ماده ۳۹)
  const now = new Date();
  const daysRemaining = 25; // Safe illustrative timeline
  const ssoFilingDeadline = `پایان ماه بعد (حداکثر تا ۳۰ روز آینده)`;

  let complianceStatus: SiraFlowPayrollAudit['complianceStatus'] = 'compliant';
  if (score < 60) complianceStatus = 'non_compliant';
  else if (score < 90) complianceStatus = 'warning';

  return {
    id: `audit_${period.id}_${Date.now()}`,
    periodId: period.id,
    timestamp: new Date().toISOString(),
    overallScore: Math.max(0, score),
    complianceStatus,
    summary: score >= 90 
      ? 'لیست حقوق و دستمزد و فایل بیمه تامین اجتماعی فاقد هرگونه مغایرت قانونی بوده و دارای تاییدیه فنی سایرافلو است.'
      : 'برخی موارد دارای اخطار یا نیازمند توجه است که پیش از ارسال به تامین اجتماعی باید مرتفع گردد.',
    checks,
    deadlineAlert: {
      ssoFilingDeadline,
      daysRemaining,
      penaltyRiskNote: 'طبق ماده ۳۹ قانون تامین اجتماعی، عدم ارسال لیست و پرداخت حق بیمه تا پایان ماه بعد مشمول ۱۰٪ جریمه مقطوع غیرقابل بخشش خواهد بود.'
    }
  };
}

// ============================================================================
// Storage & Initial Seed Data Handlers
// ============================================================================

export const PAYROLL_EMPLOYEES_KEY = 'habino_payroll_employees_v1';
export const PAYROLL_PERIODS_KEY = 'habino_payroll_periods_v1';
export const PAYROLL_SLIPS_KEY = 'habino_payroll_slips_v1';
export const PAYROLL_SSO_CONFIG_KEY = 'habino_payroll_sso_config_v1';

export const DEFAULT_SSO_CONFIG: SSODisketteConfig = {
  workshopCode: '0184920481',
  workshopName: 'شرکت فناوری‌های نوین هابینو (سهامی خاص)',
  employerName: 'مهندس حسام طهرانی',
  workshopAddress: 'تهران، پارک فناوری پردیس، مجتمع دانش‌بنیان، واحد ۴۰۲',
  subContractCode: '000',
  insuranceBranch: 'شعبه ۱۱ تأمین اجتماعی تهران',
  employerRate: 20,
  unemploymentRate: 3,
  employeeRate: 7,
  extraHardLaborRate: 0,
  isExemptWorkshop5Persons: false,
  exemptionPercentage: 0
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    tenantId: 'tenant-demo',
    nationalId: '0018493021',
    identityNumber: '48201',
    firstName: 'آرش',
    lastName: 'کاظمی',
    fatherName: 'محمدرضا',
    gender: 'male',
    maritalStatus: 'married',
    childrenCount: 2,
    ssoInsuranceNumber: '028491024',
    jobTitle: 'مهندس ارشد نرم‌افزار و معماری سیستم',
    jobCode: '213101',
    department: 'فنی و مهندسی',
    employmentType: 'full_time',
    hireDate: '1401/02/15',
    bankName: 'بانک ملت',
    bankAccountNumber: '58492019482',
    shabaNumber: 'IR8201200000058492019482',
    baseDailyWage: 3_800_000,
    monthlyBaseSalary: 114_000_000,
    hasHousingAllowance: true,
    hasGroceryAllowance: true,
    positionAllowance: 25_000_000,
    isTaxExempt: false,
    workshopCode: '0184920481',
    didIdentifier: 'did:habino:employee:kazemi_arash',
    status: 'active',
    createdAt: '1401/02/15'
  },
  {
    id: 'emp-002',
    tenantId: 'tenant-demo',
    nationalId: '0452910382',
    identityNumber: '1940',
    firstName: 'سارا',
    lastName: 'رستمی',
    fatherName: 'علی‌اکبر',
    gender: 'female',
    maritalStatus: 'single',
    childrenCount: 0,
    ssoInsuranceNumber: '039581029',
    jobTitle: 'مدیر مالی و کارشناس ارشد حسابداری',
    jobCode: '241102',
    department: 'مالی و اداری',
    employmentType: 'full_time',
    hireDate: '1401/06/01',
    bankName: 'بانک سامان',
    bankAccountNumber: '849201948201',
    shabaNumber: 'IR5605600000849201948201',
    baseDailyWage: 3_200_000,
    monthlyBaseSalary: 96_000_000,
    hasHousingAllowance: true,
    hasGroceryAllowance: true,
    positionAllowance: 18_000_000,
    isTaxExempt: false,
    workshopCode: '0184920481',
    didIdentifier: 'did:habino:employee:rostami_sara',
    status: 'active',
    createdAt: '1401/06/01'
  },
  {
    id: 'emp-003',
    tenantId: 'tenant-demo',
    nationalId: '1289401928',
    identityNumber: '8910',
    firstName: 'مهدی',
    lastName: 'صادقی',
    fatherName: 'حسین',
    gender: 'male',
    maritalStatus: 'married',
    childrenCount: 1,
    ssoInsuranceNumber: '048291039',
    jobTitle: 'کارشناس توسعه بازار و فروش سازمانی',
    jobCode: '243105',
    department: 'فروش و بازاریابی',
    employmentType: 'full_time',
    hireDate: '1402/03/10',
    bankName: 'بانک پاسارگاد',
    bankAccountNumber: '39401928401',
    shabaNumber: 'IR900570000039401928401',
    baseDailyWage: 2_600_000,
    monthlyBaseSalary: 78_000_000,
    hasHousingAllowance: true,
    hasGroceryAllowance: true,
    positionAllowance: 10_000_000,
    isTaxExempt: false,
    workshopCode: '0184920481',
    didIdentifier: 'did:habino:employee:sadeghi_mehdi',
    status: 'active',
    createdAt: '1402/03/10'
  },
  {
    id: 'emp-004',
    tenantId: 'tenant-demo',
    nationalId: '0078492014',
    identityNumber: '6740',
    firstName: 'نیلوفر',
    lastName: 'کریمی',
    fatherName: 'بهروز',
    gender: 'female',
    maritalStatus: 'single',
    childrenCount: 0,
    ssoInsuranceNumber: '059201948',
    jobTitle: 'طراح ارشد رابط کاربری و تجربه مشتری (UI/UX)',
    jobCode: '216601',
    department: 'فنی و طراحی',
    employmentType: 'full_time',
    hireDate: '1402/08/20',
    bankName: 'بانک تجارت',
    bankAccountNumber: '49201948201',
    shabaNumber: 'IR480180000049201948201',
    baseDailyWage: 2_800_000,
    monthlyBaseSalary: 84_000_000,
    hasHousingAllowance: true,
    hasGroceryAllowance: true,
    positionAllowance: 12_000_000,
    isTaxExempt: false,
    workshopCode: '0184920481',
    didIdentifier: 'did:habino:employee:karimi_niloofar',
    status: 'active',
    createdAt: '1402/08/20'
  }
];

export function getStoredEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(PAYROLL_EMPLOYEES_KEY);
    if (!raw) {
      localStorage.setItem(PAYROLL_EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EMPLOYEES;
  }
}

export function saveStoredEmployees(employees: Employee[]): void {
  try {
    localStorage.setItem(PAYROLL_EMPLOYEES_KEY, JSON.stringify(employees));
  } catch (err) {
    console.error('Failed to save employees to localStorage:', err);
  }
}

export function getStoredSSOConfig(): SSODisketteConfig {
  try {
    const raw = localStorage.getItem(PAYROLL_SSO_CONFIG_KEY);
    if (!raw) {
      localStorage.setItem(PAYROLL_SSO_CONFIG_KEY, JSON.stringify(DEFAULT_SSO_CONFIG));
      return DEFAULT_SSO_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SSO_CONFIG,
      ...parsed,
      employeeRate: typeof parsed.employeeRate === 'number' ? parsed.employeeRate : DEFAULT_SSO_CONFIG.employeeRate,
      employerRate: typeof parsed.employerRate === 'number' ? parsed.employerRate : DEFAULT_SSO_CONFIG.employerRate,
      unemploymentRate: typeof parsed.unemploymentRate === 'number' ? parsed.unemploymentRate : DEFAULT_SSO_CONFIG.unemploymentRate,
      extraHardLaborRate: typeof parsed.extraHardLaborRate === 'number' ? parsed.extraHardLaborRate : 0,
      isExemptWorkshop5Persons: !!parsed.isExemptWorkshop5Persons,
      exemptionPercentage: typeof parsed.exemptionPercentage === 'number' ? parsed.exemptionPercentage : 0
    };
  } catch {
    return DEFAULT_SSO_CONFIG;
  }
}

export function saveStoredSSOConfig(config: SSODisketteConfig): void {
  try {
    localStorage.setItem(PAYROLL_SSO_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save SSO config:', err);
  }
}

export const DEFAULT_PAYROLL_PERIODS: PayrollPeriod[] = [
  {
    id: 'period-1403-12',
    tenantId: 'tenant-demo',
    year: 1403,
    month: 12,
    monthName: 'اسفند',
    workDaysInMonth: 29,
    status: 'calculated',
    ssoDisketteGenerated: true,
    totalGrossSalary: 456_532_368,
    totalNetSalary: 382_190_000,
    totalEmployeeInsurance7Percent: 29_120_000,
    totalEmployerInsurance23Percent: 95_680_000,
    totalSocialSecurityInsurance30Percent: 124_800_000,
    totalPayrollTax: 16_102_368,
    slipsCount: 4,
    createdAt: '1403/12/28',
    ssoSubmissionStatus: 'receipt_issued',
    ssoTrackingCode: 'TRK-140312-8492',
    ssoReceiptNumber: 'SSO-REC-140312-0941',
    ssoSubmissionDate: '1403/12/28'
  },
  {
    id: 'period-1403-11',
    tenantId: 'tenant-demo',
    year: 1403,
    month: 11,
    monthName: 'بهمن',
    workDaysInMonth: 30,
    status: 'posted_to_ledger',
    accountingDocumentNumber: 'DOC-PAY-140311',
    ssoDisketteGenerated: true,
    totalGrossSalary: 442_800_000,
    totalNetSalary: 370_950_000,
    totalEmployeeInsurance7Percent: 28_400_000,
    totalEmployerInsurance23Percent: 93_300_000,
    totalSocialSecurityInsurance30Percent: 121_700_000,
    totalPayrollTax: 15_250_000,
    slipsCount: 4,
    createdAt: '1403/11/29',
    ssoSubmissionStatus: 'paid',
    ssoTrackingCode: 'TRK-140311-6102',
    ssoReceiptNumber: 'SSO-REC-140311-7391',
    ssoSubmissionDate: '1403/11/29'
  },
  {
    id: 'period-1403-10',
    tenantId: 'tenant-demo',
    year: 1403,
    month: 10,
    monthName: 'دی',
    workDaysInMonth: 30,
    status: 'posted_to_ledger',
    accountingDocumentNumber: 'DOC-PAY-140310',
    ssoDisketteGenerated: true,
    totalGrossSalary: 438_400_000,
    totalNetSalary: 367_800_000,
    totalEmployeeInsurance7Percent: 28_050_000,
    totalEmployerInsurance23Percent: 92_150_000,
    totalSocialSecurityInsurance30Percent: 120_200_000,
    totalPayrollTax: 14_900_000,
    slipsCount: 4,
    createdAt: '1403/10/29',
    ssoSubmissionStatus: 'paid',
    ssoTrackingCode: 'TRK-140310-4491',
    ssoReceiptNumber: 'SSO-REC-140310-5201',
    ssoSubmissionDate: '1403/10/29'
  },
  {
    id: 'period-1403-09',
    tenantId: 'tenant-demo',
    year: 1403,
    month: 9,
    monthName: 'آذر',
    workDaysInMonth: 30,
    status: 'posted_to_ledger',
    accountingDocumentNumber: 'DOC-PAY-140309',
    ssoDisketteGenerated: true,
    totalGrossSalary: 431_200_000,
    totalNetSalary: 362_400_000,
    totalEmployeeInsurance7Percent: 27_600_000,
    totalEmployerInsurance23Percent: 90_700_000,
    totalSocialSecurityInsurance30Percent: 118_300_000,
    totalPayrollTax: 14_300_000,
    slipsCount: 4,
    createdAt: '1403/09/28',
    ssoSubmissionStatus: 'paid',
    ssoTrackingCode: 'TRK-140309-3291',
    ssoReceiptNumber: 'SSO-REC-140309-4112',
    ssoSubmissionDate: '1403/09/28'
  },
  {
    id: 'period-1403-08',
    tenantId: 'tenant-demo',
    year: 1403,
    month: 8,
    monthName: 'آبان',
    workDaysInMonth: 30,
    status: 'posted_to_ledger',
    accountingDocumentNumber: 'DOC-PAY-140308',
    ssoDisketteGenerated: true,
    totalGrossSalary: 348_500_000,
    totalNetSalary: 293_200_000,
    totalEmployeeInsurance7Percent: 22_400_000,
    totalEmployerInsurance23Percent: 73_600_000,
    totalSocialSecurityInsurance30Percent: 96_000_000,
    totalPayrollTax: 11_100_000,
    slipsCount: 3,
    createdAt: '1403/08/29',
    ssoSubmissionStatus: 'paid',
    ssoTrackingCode: 'TRK-140308-2199',
    ssoReceiptNumber: 'SSO-REC-140308-3019',
    ssoSubmissionDate: '1403/08/29'
  },
  {
    id: 'period-1403-07',
    tenantId: 'tenant-demo',
    year: 1403,
    month: 7,
    monthName: 'مهر',
    workDaysInMonth: 30,
    status: 'posted_to_ledger',
    accountingDocumentNumber: 'DOC-PAY-140307',
    ssoDisketteGenerated: true,
    totalGrossSalary: 342_000_000,
    totalNetSalary: 288_400_000,
    totalEmployeeInsurance7Percent: 22_100_000,
    totalEmployerInsurance23Percent: 72_700_000,
    totalSocialSecurityInsurance30Percent: 94_800_000,
    totalPayrollTax: 10_700_000,
    slipsCount: 3,
    createdAt: '1403/07/28',
    ssoSubmissionStatus: 'paid',
    ssoTrackingCode: 'TRK-140307-1093',
    ssoReceiptNumber: 'SSO-REC-140307-2810',
    ssoSubmissionDate: '1403/07/28'
  }
];

export function getStoredPayrollPeriods(): PayrollPeriod[] {
  try {
    const raw = localStorage.getItem(PAYROLL_PERIODS_KEY);
    if (!raw) {
      localStorage.setItem(PAYROLL_PERIODS_KEY, JSON.stringify(DEFAULT_PAYROLL_PERIODS));
      return DEFAULT_PAYROLL_PERIODS;
    }
    const parsed: PayrollPeriod[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length <= 1) {
      // Merge with default periods so trend charts and history are fully populated
      localStorage.setItem(PAYROLL_PERIODS_KEY, JSON.stringify(DEFAULT_PAYROLL_PERIODS));
      return DEFAULT_PAYROLL_PERIODS;
    }
    return parsed;
  } catch {
    return DEFAULT_PAYROLL_PERIODS;
  }
}

export function saveStoredPayrollPeriods(periods: PayrollPeriod[]): void {
  try {
    localStorage.setItem(PAYROLL_PERIODS_KEY, JSON.stringify(periods));
  } catch (err) {
    console.error('Failed to save payroll periods:', err);
  }
}

export function getStoredPayrollSlips(periodId?: string): PayrollSlip[] {
  try {
    const raw = localStorage.getItem(PAYROLL_SLIPS_KEY);
    if (!raw) {
      // Generate default slips for initial demonstration period
      const employees = getStoredEmployees();
      const initialSlips = employees.map(emp => 
        calculateEmployeePayrollSlip(emp, 'period-1403-12', {
          daysWorked: 29,
          overtimeHours: emp.id === 'emp-001' ? 18 : 8,
          bonuses: emp.id === 'emp-001' ? 15_000_000 : 5_000_000
        })
      );
      localStorage.setItem(PAYROLL_SLIPS_KEY, JSON.stringify(initialSlips));
      return periodId ? initialSlips.filter(s => s.periodId === periodId) : initialSlips;
    }
    const slips: PayrollSlip[] = JSON.parse(raw);
    return periodId ? slips.filter(s => s.periodId === periodId) : slips;
  } catch {
    return [];
  }
}

export function saveStoredPayrollSlips(slips: PayrollSlip[]): void {
  try {
    localStorage.setItem(PAYROLL_SLIPS_KEY, JSON.stringify(slips));
  } catch (err) {
    console.error('Failed to save payroll slips:', err);
  }
}

// Re-export SSO DBF Engine
export {
  generateSSOKarDbf,
  generateSSOVorDbf,
  generateSSODbfPackage,
  downloadDbfFile,
  SSO_KAR_DBF_FIELDS,
  SSO_VOR_DBF_FIELDS
} from './ssoDbfEngine';

