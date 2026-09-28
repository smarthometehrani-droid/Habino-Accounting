#!/usr/bin/env tsx
/**
 * اسکریپت اجرای تست خودکار سناریوهای حسابداری، پروژه‌ها و حقوق و دستمزد هابینو
 * Habino Accounting Automated Scenario Test Runner (CLI)
 * 
 * نحوه اجرا:
 * npm run test:accounting
 * یا
 * npx tsx scripts/run-accounting-tests.ts
 */

import { AccountingAutomatedTestEngine } from '../src/lib/accountingAutomatedTestEngine';

// رنگ‌های خروجی کنسول ANSI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

console.log('\n' + colors.cyan + colors.bright + '========================================================================================' + colors.reset);
console.log(colors.cyan + colors.bright + '      موتور تست و ممیزی خودکار سناریوهای حسابداری، پروژه‌ها و حقوق دستمزد هابینو         ' + colors.reset);
console.log(colors.cyan + colors.bright + '========================================================================================' + colors.reset);
console.log(colors.dim + 'مرجع یکپارچه: قوانین ۹‌گانه مالی، قانون کار ایران ماده ۸۴، ماده ۳۸ تأمین اجتماعی و GAAP/IFRS\n' + colors.reset);

const startTime = Date.now();
const result = AccountingAutomatedTestEngine.runAllScenarios();
const totalTime = Date.now() - startTime;

console.log(colors.bright + 'فهرست نتایج اجرای سناریوهای تست خودکار:' + colors.reset);
console.log('----------------------------------------------------------------------------------------');

result.scenarios.forEach((sc, index) => {
  const statusIcon = sc.status === 'passed' ? `${colors.green}✔ قبول${colors.reset}` : `${colors.red}✖ مردود${colors.reset}`;
  const numStr = (index + 1).toString().padStart(2, ' ');
  const timeStr = `${sc.executionTimeMs}ms`.padStart(6, ' ');
  const categoryTag = `[${sc.categoryFa}]`.padEnd(25, ' ');
  
  console.log(`${colors.bright}${numStr}.${colors.reset} ${statusIcon} ${colors.yellow}${timeStr}${colors.reset} | ${colors.blue}${categoryTag}${colors.reset} | ${sc.title}`);
  
  if (sc.status === 'failed') {
    console.log(`   ${colors.red}خطا: ${sc.actualOutcome}${colors.reset}`);
  }
  
  if (sc.mathDetails && sc.mathDetails.formulaNotes.length > 0) {
    const firstNote = sc.mathDetails.formulaNotes[0];
    console.log(`   ${colors.dim}↳ ${firstNote}${colors.reset}`);
  }
});

console.log('----------------------------------------------------------------------------------------');
console.log('\n' + colors.bright + 'خلاصه شاخص‌های ریاضی و تراز آزمایشی:' + colors.reset);
console.log(` • کل سناریوهای ارزیابی‌شده: ${colors.cyan}${result.totalScenarios}${colors.reset}`);
console.log(` • سناریوهای موفق:          ${colors.green}${result.passedScenarios}${colors.reset}`);
console.log(` • سناریوهای ناموفق:        ${result.failedScenarios > 0 ? colors.red : colors.green}${result.failedScenarios}${colors.reset}`);
console.log(` • درصد قبولی (Pass Rate):   ${colors.green}${colors.bright}${result.passRatePercent}%${colors.reset}`);
console.log(` • تعداد کل آرتیکل‌های دوبل: ${colors.cyan}${result.totalEntriesEvaluated} ردیف سند${colors.reset}`);
console.log(` • مجموع گردش بدهکار:        ${colors.yellow}${result.totalDebitSum.toLocaleString('fa-IR')} ریال${colors.reset}`);
console.log(` • مجموع گردش بستانکار:      ${colors.yellow}${result.totalCreditSum.toLocaleString('fa-IR')} ریال${colors.reset}`);
console.log(` • اختلاف ریالی (تراز بودن): ${result.totalDiscrepancyRial === 0 ? colors.green + '۰ ریال (کاملاً متوازن)' : colors.red + result.totalDiscrepancyRial.toLocaleString('fa-IR') + ' ریال'}${colors.reset}`);
console.log(` • تراز آزمایشی ۶ ستونی:     ${result.allTrialBalancesBalanced ? colors.green + 'تایید ریاضی ۱۰۰٪ (Zero Discrepancy)' : colors.red + 'دارای ناترازی!'}${colors.reset}`);
console.log(` • شناسه گواهی ممیزی:        ${colors.magenta}${result.certificateHash}${colors.reset}`);
console.log(` • زمان کل پردازش:           ${colors.cyan}${result.totalExecutionTimeMs} میلی‌ثانیه${colors.reset}\n`);

if (result.failedScenarios > 0) {
  console.log(colors.bgRed + colors.bright + ' ✖ تست‌های خودکار با خطا مواجه شدند! لطفاً گزارش بالا را بررسی فرمایید. ' + colors.reset + '\n');
  process.exit(1);
} else {
  console.log(colors.bgGreen + colors.bright + ' ✔ تمامی ۲۴ سناریوی آزمون با موفقیت ۱۰۰٪ و تراز کامل سپری شدند. ' + colors.reset + '\n');
  process.exit(0);
}
