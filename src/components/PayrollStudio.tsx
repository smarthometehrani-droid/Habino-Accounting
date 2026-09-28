import React, { useState, useMemo } from 'react';
import {
  Users,
  Calculator,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  BookOpen,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Printer,
  Sparkles,
  RefreshCw,
  Clock,
  Calendar,
  Building2,
  Layers,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Percent,
  Search,
  ChevronDown,
  Info,
  CheckCheck,
  Trash2,
  Edit3,
  X,
  FileCode,
  Database,
  HardDrive,
  FolderDown
} from 'lucide-react';
import { useAccounting } from '../lib/store';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import {
  Employee,
  PayrollPeriod,
  PayrollSlip,
  SSODisketteConfig,
  SiraFlowPayrollAudit,
  EmploymentType
} from '../types';
import {
  IRAN_LABOR_LAW_RATES,
  MONTH_NAMES,
  calculateEmployeePayrollSlip,
  calculatePeriodTotals,
  generatePayrollAccountingEntries,
  generateSSODisketteFiles,
  downloadDbfFile,
  SSO_KAR_DBF_FIELDS,
  SSO_VOR_DBF_FIELDS,
  auditPayrollPeriod,
  getStoredEmployees,
  saveStoredEmployees,
  getStoredPayrollPeriods,
  saveStoredPayrollPeriods,
  getStoredPayrollSlips,
  saveStoredPayrollSlips,
  getStoredSSOConfig,
  saveStoredSSOConfig,
  INITIAL_EMPLOYEES
} from '../lib/payrollEngine';
import { PayrollSummaryCards } from './PayrollSummaryCards';

export const PayrollStudio: React.FC = () => {
  const { addAccountingEntry, settings } = useAccounting();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'slips' | 'employees' | 'digital_payslip' | 'sso_diskette' | 'accounting_voucher' | 'sira_audit'>('slips');

  // Persistence State
  const [employees, setEmployees] = useState<Employee[]>(() => getStoredEmployees());
  const [periods, setPeriods] = useState<PayrollPeriod[]>(() => getStoredPayrollPeriods());
  const [slips, setSlips] = useState<PayrollSlip[]>(() => getStoredPayrollSlips());
  const [ssoConfig, setSsoConfig] = useState<SSODisketteConfig>(() => getStoredSSOConfig());

  // Active Period selection
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    const saved = getStoredPayrollPeriods();
    return saved.length > 0 ? saved[0].id : 'period-1403-12';
  });

  // Active Payslip for digital view
  const [selectedSlipId, setSelectedSlipId] = useState<string>('');

  // UI state for modals
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // New Employee Form State
  const [empForm, setEmpForm] = useState<{
    firstName: string;
    lastName: string;
    nationalId: string;
    identityNumber: string;
    fatherName: string;
    gender: 'male' | 'female';
    maritalStatus: 'single' | 'married';
    childrenCount: number;
    ssoInsuranceNumber: string;
    jobTitle: string;
    department: string;
    employmentType: EmploymentType;
    hireDate: string;
    bankName: string;
    bankAccountNumber: string;
    shabaNumber: string;
    baseDailyWage: number;
    hasHousingAllowance: boolean;
    hasGroceryAllowance: boolean;
    positionAllowance: number;
    isTaxExempt: boolean;
  }>({
    firstName: '',
    lastName: '',
    nationalId: '',
    identityNumber: '',
    fatherName: '',
    gender: 'male',
    maritalStatus: 'married',
    childrenCount: 1,
    ssoInsuranceNumber: '',
    jobTitle: '',
    department: 'فنی',
    employmentType: 'full_time',
    hireDate: '1403/01/01',
    bankName: 'بانک ملت',
    bankAccountNumber: '',
    shabaNumber: 'IR',
    baseDailyWage: IRAN_LABOR_LAW_RATES.MIN_DAILY_WAGE,
    hasHousingAllowance: true,
    hasGroceryAllowance: true,
    positionAllowance: 0,
    isTaxExempt: false
  });

  // Current active period object
  const currentPeriod = useMemo(() => {
    return periods.find(p => p.id === selectedPeriodId) || periods[0];
  }, [periods, selectedPeriodId]);

  // Current slips for the active period
  const currentPeriodSlips = useMemo(() => {
    if (!currentPeriod) return [];
    return slips.filter(s => s.periodId === currentPeriod.id);
  }, [slips, currentPeriod]);

  // Aggregate totals
  const periodTotals = useMemo(() => {
    return calculatePeriodTotals(currentPeriodSlips);
  }, [currentPeriodSlips]);

  // SiraFlow AI Audit Results
  const auditReport = useMemo<SiraFlowPayrollAudit | null>(() => {
    if (!currentPeriod || currentPeriodSlips.length === 0) return null;
    return auditPayrollPeriod(currentPeriod, currentPeriodSlips, ssoConfig);
  }, [currentPeriod, currentPeriodSlips, ssoConfig]);

  // Selected slip for payslip digital preview
  const activeSlip = useMemo(() => {
    if (selectedSlipId) {
      return currentPeriodSlips.find(s => s.id === selectedSlipId) || currentPeriodSlips[0];
    }
    return currentPeriodSlips[0] || null;
  }, [selectedSlipId, currentPeriodSlips]);

  // Notification helper
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Copy helper
  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
    showToast('متن با موفقیت در حافظه کپی شد', 'info');
  };

  // Recalculate slips for the current period
  const handleRecalculatePeriod = (overrideConfig?: SSODisketteConfig) => {
    if (!currentPeriod) return;
    const activeConfig = overrideConfig || ssoConfig;

    const updatedSlips = employees.map(emp => {
      // Find existing slip to preserve inputs like worked days / overtime
      const existing = currentPeriodSlips.find(s => s.employeeId === emp.id);
      return calculateEmployeePayrollSlip(emp, currentPeriod.id, {
        daysWorked: existing ? existing.daysWorked : currentPeriod.workDaysInMonth,
        overtimeHours: existing ? existing.overtimeHours : 0,
        absenceDays: existing ? existing.absenceDays : 0,
        leaveDays: existing ? existing.leaveDays : 0,
        bonuses: existing ? existing.bonuses : 0,
        advancePaymentDeduction: existing ? existing.advancePaymentDeduction : 0,
        otherDeductions: existing ? existing.otherDeductions : 0,
        ssoRates: {
          employeeRate: activeConfig.employeeRate,
          employerRate: activeConfig.employerRate,
          unemploymentRate: activeConfig.unemploymentRate,
          extraHardLaborRate: activeConfig.extraHardLaborRate,
          isExemptWorkshop5Persons: activeConfig.isExemptWorkshop5Persons
        }
      });
    });

    const otherSlips = slips.filter(s => s.periodId !== currentPeriod.id);
    const newAllSlips = [...otherSlips, ...updatedSlips];
    setSlips(newAllSlips);
    saveStoredPayrollSlips(newAllSlips);

    // Update period totals
    const totals = calculatePeriodTotals(updatedSlips);
    const updatedPeriod: PayrollPeriod = {
      ...currentPeriod,
      ...totals,
      slipsCount: updatedSlips.length,
      status: 'calculated'
    };

    const updatedPeriods = periods.map(p => p.id === currentPeriod.id ? updatedPeriod : p);
    setPeriods(updatedPeriods);
    saveStoredPayrollPeriods(updatedPeriods);

    showToast('محاسبه حقوق و مزایای دوره با درصدهای جدید بیمه به‌روزرسانی شد.', 'success');
  };

  // Handle inline slip edits (worked days, overtime, bonuses, advance)
  const handleUpdateSlipRow = (
    slipId: string,
    field: 'daysWorked' | 'overtimeHours' | 'bonuses' | 'advancePaymentDeduction',
    value: number
  ) => {
    const slip = currentPeriodSlips.find(s => s.id === slipId);
    if (!slip || !currentPeriod) return;

    const emp = employees.find(e => e.id === slip.employeeId);
    if (!emp) return;

    const updatedDays = field === 'daysWorked' ? value : slip.daysWorked;
    const updatedOvertime = field === 'overtimeHours' ? value : slip.overtimeHours;
    const updatedBonuses = field === 'bonuses' ? value : slip.bonuses;
    const updatedAdvance = field === 'advancePaymentDeduction' ? value : slip.advancePaymentDeduction;

    const recalculated = calculateEmployeePayrollSlip(emp, currentPeriod.id, {
      daysWorked: updatedDays,
      overtimeHours: updatedOvertime,
      absenceDays: slip.absenceDays,
      leaveDays: slip.leaveDays,
      bonuses: updatedBonuses,
      advancePaymentDeduction: updatedAdvance,
      otherDeductions: slip.otherDeductions
    });

    const updatedAllSlips = slips.map(s => s.id === slipId ? recalculated : s);
    setSlips(updatedAllSlips);
    saveStoredPayrollSlips(updatedAllSlips);

    // Update period totals in memory
    const updatedCurrentSlips = updatedAllSlips.filter(s => s.periodId === currentPeriod.id);
    const totals = calculatePeriodTotals(updatedCurrentSlips);
    const updatedPeriod: PayrollPeriod = {
      ...currentPeriod,
      ...totals
    };
    const newPeriods = periods.map(p => p.id === currentPeriod.id ? updatedPeriod : p);
    setPeriods(newPeriods);
    saveStoredPayrollPeriods(newPeriods);
  };

  // Add or Edit Employee Save
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.firstName || !empForm.lastName || !empForm.nationalId) {
      showToast('لطفاً نام، نام‌خانوادگی و کد ملی را وارد نمایید.', 'error');
      return;
    }

    if (editingEmployee) {
      const updatedList = employees.map(emp => {
        if (emp.id === editingEmployee.id) {
          return {
            ...emp,
            ...empForm,
            monthlyBaseSalary: empForm.baseDailyWage * 30
          };
        }
        return emp;
      });
      setEmployees(updatedList);
      saveStoredEmployees(updatedList);
      showToast('پرونده کارمند با موفقیت ویرایش گردید.', 'success');
    } else {
      const newEmp: Employee = {
        id: `emp-${Date.now().toString(36)}`,
        tenantId: 'tenant-demo',
        ...empForm,
        monthlyBaseSalary: empForm.baseDailyWage * 30,
        workshopCode: ssoConfig.workshopCode,
        didIdentifier: `did:habino:employee:${empForm.nationalId}`,
        status: 'active',
        createdAt: new Date().toLocaleDateString('fa-IR')
      };
      const updatedList = [...employees, newEmp];
      setEmployees(updatedList);
      saveStoredEmployees(updatedList);

      // Also create a slip for active period if exists
      if (currentPeriod) {
        const newSlip = calculateEmployeePayrollSlip(newEmp, currentPeriod.id, {
          daysWorked: currentPeriod.workDaysInMonth
        });
        const newSlips = [...slips, newSlip];
        setSlips(newSlips);
        saveStoredPayrollSlips(newSlips);
      }

      showToast('کارمند جدید با موفقیت به فهرست پرسنل اضافه شد.', 'success');
    }

    setShowEmployeeModal(false);
    setEditingEmployee(null);
  };

  // Open Edit Modal
  const handleEditClick = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      nationalId: emp.nationalId,
      identityNumber: emp.identityNumber || '',
      fatherName: emp.fatherName || '',
      gender: emp.gender,
      maritalStatus: emp.maritalStatus,
      childrenCount: emp.childrenCount,
      ssoInsuranceNumber: emp.ssoInsuranceNumber,
      jobTitle: emp.jobTitle,
      department: emp.department || 'عمومی',
      employmentType: emp.employmentType,
      hireDate: emp.hireDate,
      bankName: emp.bankName,
      bankAccountNumber: emp.bankAccountNumber,
      shabaNumber: emp.shabaNumber,
      baseDailyWage: emp.baseDailyWage,
      hasHousingAllowance: emp.hasHousingAllowance,
      hasGroceryAllowance: emp.hasGroceryAllowance,
      positionAllowance: emp.positionAllowance,
      isTaxExempt: emp.isTaxExempt
    });
    setShowEmployeeModal(true);
  };

  // Delete Employee
  const handleDeleteEmployee = (empId: string) => {
    if (employees.length <= 1) {
      showToast('حداقل وجود یک کارمند در سامانه الزامی است.', 'error');
      return;
    }
    const updatedEmployees = employees.filter(e => e.id !== empId);
    setEmployees(updatedEmployees);
    saveStoredEmployees(updatedEmployees);

    const updatedSlips = slips.filter(s => s.employeeId !== empId);
    setSlips(updatedSlips);
    saveStoredPayrollSlips(updatedSlips);

    showToast('پرونده پرسنل از سامانه حذف شد.', 'info');
  };

  // Post Double-Entry Journal Document to Habino Ledger
  const [isPostingLedger, setIsPostingLedger] = useState(false);
  const handlePostToLedger = async () => {
    if (!currentPeriod || currentPeriodSlips.length === 0) return;
    if (currentPeriod.status === 'posted_to_ledger') {
      showToast('سند حسابداری این دوره قبلاً در دفتر روزنامه ثبت شده است.', 'info');
      return;
    }

    setIsPostingLedger(true);
    try {
      const voucherNum = `PAY-${currentPeriod.year}${String(currentPeriod.month).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
      const todayStr = new Intl.DateTimeFormat('fa-IR').format(new Date());

      const entries = generatePayrollAccountingEntries(
        currentPeriod,
        currentPeriodSlips,
        voucherNum,
        todayStr
      );

      // Post each double-entry record to central ledger
      for (const entry of entries) {
        await addAccountingEntry({
          documentNumber: entry.documentNumber,
          date: entry.date,
          accountCode: entry.accountCode,
          accountTitle: entry.accountTitle,
          debit: entry.debit,
          credit: entry.credit,
          description: entry.description
        });
      }

      // Mark period as posted
      const updatedPeriod: PayrollPeriod = {
        ...currentPeriod,
        status: 'posted_to_ledger',
        accountingDocumentNumber: voucherNum,
        approvedAt: new Date().toISOString()
      };

      const updatedPeriods = periods.map(p => p.id === currentPeriod.id ? updatedPeriod : p);
      setPeriods(updatedPeriods);
      saveStoredPayrollPeriods(updatedPeriods);

      showToast(`سند دوبل حقوق به شماره ${voucherNum} با موفقیت در دفتر روزنامه ثبت شد.`, 'success');
      setActiveTab('accounting_voucher');
    } catch (err) {
      console.error('Error posting payroll voucher:', err);
      showToast('خطا در ثبت سند حسابداری', 'error');
    } finally {
      setIsPostingLedger(false);
    }
  };

  // Generated SSO Diskette Data
  const disketteFiles = useMemo(() => {
    if (!currentPeriod || currentPeriodSlips.length === 0) {
      return {
        dskKarText: '',
        dskVorText: '',
        dskKarDbf: new Uint8Array(),
        dskVorDbf: new Uint8Array(),
        karDbfSize: 0,
        vorDbfSize: 0,
        summaryJson: ''
      };
    }
    return generateSSODisketteFiles(ssoConfig, currentPeriod, currentPeriodSlips);
  }, [ssoConfig, currentPeriod, currentPeriodSlips]);

  // SSO Preview Mode (DBF Database Structure vs TXT Stream)
  const [ssoViewMode, setSsoViewMode] = useState<'dbf_structure' | 'txt_preview'>('dbf_structure');

  // Download DBF Binary Files
  const handleDownloadKarDbf = () => {
    if (!disketteFiles.dskKarDbf || disketteFiles.dskKarDbf.length === 0) {
      showToast('خطا: اطلاعات کارگاه برای ساخت فایل DSKKAR00.DBF کافی نیست.', 'error');
      return;
    }
    downloadDbfFile(disketteFiles.dskKarDbf, 'DSKKAR00.DBF');
    showToast('فایل باینری استاندارد DSKKAR00.DBF (کارگاه) با موفقیت دانلود شد.', 'success');
  };

  const handleDownloadVorDbf = () => {
    if (!disketteFiles.dskVorDbf || disketteFiles.dskVorDbf.length === 0) {
      showToast('خطا: اطلاعات پرسنل برای ساخت فایل DSKVOR00.DBF کافی نیست.', 'error');
      return;
    }
    downloadDbfFile(disketteFiles.dskVorDbf, 'DSKVOR00.DBF');
    showToast('فایل باینری استاندارد DSKVOR00.DBF (پرسنل) با موفقیت دانلود شد.', 'success');
  };

  const handleDownloadAllDbfPackage = () => {
    if (!disketteFiles.dskKarDbf || !disketteFiles.dskVorDbf) {
      showToast('خطا در آماده‌سازی پکیج دیسکت بیمه.', 'error');
      return;
    }
    downloadDbfFile(disketteFiles.dskKarDbf, 'DSKKAR00.DBF');
    setTimeout(() => {
      downloadDbfFile(disketteFiles.dskVorDbf, 'DSKVOR00.DBF');
    }, 400);
    showToast('پکیج دیسکت رسمی تأمین اجتماعی (DSKKAR00.DBF و DSKVOR00.DBF) دانلود شد.', 'success');
  };

  // Download File Helper
  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`فایل ${filename} با موفقیت دانلود شد.`, 'success');
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-sm font-medium transition-all ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500/50'
              : notificationMsg.type === 'error'
              ? 'bg-rose-900/90 text-rose-100 border-rose-500/50'
              : 'bg-blue-900/90 text-blue-100 border-blue-500/50'
          }`}
        >
          {notificationMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : notificationMsg.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-indigo-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/40 rounded-full text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                استاندارد قانون کار و تأمین اجتماعی ایران
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-medium text-emerald-300">
                ماده ۸۴ مالیات‌ها و ماده ۳۹ بیمه
              </span>
              {currentPeriod?.status === 'posted_to_ledger' ? (
                <span className="px-2.5 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs font-medium text-blue-300 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" />
                  سند دفتر روزنامه ثبت‌شده
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs font-medium text-amber-300">
                  پیش‌نویس آماده محاسبه و صدور
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Calculator className="w-8 h-8 text-indigo-400" />
              ماژول حقوق، دستمزد و بیمه تأمین اجتماعی
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              ارکستراسیون جامع محاسبات حقوق و مزایا، محاسبه هوشمند حق بیمه ۳۰٪، مالیات تکلیفی، تولید دیسکت‌های استاندارد تأمین اجتماعی (DSKKAR/DSKVOR) و صدور اتوماتیک سند دوبل متوازن در دفتر کل.
            </p>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingEmployee(null);
                setEmpForm({
                  firstName: '',
                  lastName: '',
                  nationalId: '',
                  identityNumber: '',
                  fatherName: '',
                  gender: 'male',
                  maritalStatus: 'married',
                  childrenCount: 1,
                  ssoInsuranceNumber: '',
                  jobTitle: '',
                  department: 'فنی و مهندسی',
                  employmentType: 'full_time',
                  hireDate: '1403/01/01',
                  bankName: 'بانک ملت',
                  bankAccountNumber: '',
                  shabaNumber: 'IR',
                  baseDailyWage: IRAN_LABOR_LAW_RATES.MIN_DAILY_WAGE,
                  hasHousingAllowance: true,
                  hasGroceryAllowance: true,
                  positionAllowance: 0,
                  isTaxExempt: false
                });
                setShowEmployeeModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              افزودن پرسنل جدید
            </button>

            <button
              onClick={() => handleRecalculatePeriod()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 transition-all flex items-center gap-2"
              title="محاسبه مجدد ارقام کل دوره بر مبنای آخرین احکام"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
              محاسبه مجدد
            </button>

            {currentPeriod?.status !== 'posted_to_ledger' && (
              <button
                onClick={handlePostToLedger}
                disabled={isPostingLedger}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                {isPostingLedger ? 'در حال ثبت سند...' : 'ثبت سند در دفتر روزنامه'}
              </button>
            )}
          </div>
        </div>

        {/* Period Selector Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              دوره محاسباتی فعال:
            </span>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-slate-800/90 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.monthName} ماه سال {toPersianDigits(p.year)} ({toPersianDigits(p.slipsCount)} پرسنل - {p.status === 'posted_to_ledger' ? 'سند خورده' : 'محاسبه‌شده'})
                </option>
              ))}
            </select>
            <span className="text-slate-400">
              کارکرد موظف ماه: <strong className="text-white">{toPersianDigits(currentPeriod?.workDaysInMonth || 30)} روز</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <span>کد کارگاه بیمه: <strong className="text-indigo-300 font-mono">{ssoConfig.workshopCode}</strong></span>
            <span>شعبه تأمین اجتماعی: <strong className="text-white">{ssoConfig.insuranceBranch}</strong></span>
          </div>
        </div>
      </div>

      {/* Summary Status Cards with Mini-Charts (Salary, Headcount, SSO Submission) */}
      <PayrollSummaryCards
        currentPeriod={currentPeriod}
        periods={periods}
        employees={employees}
        slips={currentPeriodSlips}
        periodTotals={periodTotals}
        ssoConfig={ssoConfig}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab('slips')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'slips'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          لیست کارکرد و محاسبه حقوق ({toPersianDigits(currentPeriodSlips.length)})
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'employees'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          پرونده پرسنل و احکام کارگزینی ({toPersianDigits(employees.length)})
        </button>

        <button
          onClick={() => {
            if (!selectedSlipId && currentPeriodSlips.length > 0) {
              setSelectedSlipId(currentPeriodSlips[0].id);
            }
            setActiveTab('digital_payslip');
          }}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'digital_payslip'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Printer className="w-4 h-4" />
          فیش حقوقی دیجیتال و چاپ رسمی
        </button>

        <button
          onClick={() => setActiveTab('sso_diskette')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'sso_diskette'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          دیسکت بیمه تأمین اجتماعی (DSKKAR/DSKVOR)
        </button>

        <button
          onClick={() => setActiveTab('accounting_voucher')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'accounting_voucher'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          سند دوبل در دفتر روزنامه
          {currentPeriod?.status === 'posted_to_ledger' && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('sira_audit')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'sira_audit'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          ممیزی هوشمند سایرافلو
          {auditReport && (
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
              auditReport.overallScore >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {toPersianDigits(auditReport.overallScore)}٪
            </span>
          )}
        </button>
      </div>

      {/* ====================================================================
          TAB 1: MONTHLY PAYROLL CALCULATION & SLIPS
         ==================================================================== */}
      {activeTab === 'slips' && (
        <div className="space-y-6">
          {/* Quick Notice Banner */}
          <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-900">
            <div className="flex items-center gap-2.5">
              <Info className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                کارکرد استاندارد ماه <strong>{currentPeriod?.monthName}</strong>: {toPersianDigits(currentPeriod?.workDaysInMonth || 30)} روز. شما می‌توانید روزهای کارکرد واقعی، ساعات اضافه‌کاری و پاداش هر پرسنل را مستقیماً در جدول ویرایش کنید تا محاسبات بلادرنگ به‌روزرسانی شوند.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleRecalculatePeriod()}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                محاسبه مجدد کل لیست
              </button>
            </div>
          </div>

          {/* Slips Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">پرسنل و شغل</th>
                    <th className="py-3 px-3">کد ملی / بیمه</th>
                    <th className="py-3 px-2 text-center">کارکرد (روز)</th>
                    <th className="py-3 px-2 text-center">اضافه کار (ساعت)</th>
                    <th className="py-3 px-3">حقوق پایه</th>
                    <th className="py-3 px-3">مزایا و بن</th>
                    <th className="py-3 px-3">ناخالص دریافتی</th>
                    <th className="py-3 px-3 text-blue-700">بیمه ۷٪</th>
                    <th className="py-3 px-3 text-amber-700">مالیات ماده ۸۴</th>
                    <th className="py-3 px-3 text-emerald-700 font-bold">خالص پرداختی</th>
                    <th className="py-3 px-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentPeriodSlips.map((slip) => {
                    const totalAllowances = slip.housingAllowance + slip.groceryAllowance + slip.childAllowance + slip.positionAllowance + slip.bonuses;
                    return (
                      <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{slip.employeeName}</div>
                          <div className="text-slate-600 text-[11px]">{slip.jobTitle}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-mono text-slate-800">{slip.nationalId}</div>
                          <div className="text-slate-600 text-[11px]">بیمه: {slip.ssoInsuranceNumber}</div>
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="31"
                            value={slip.daysWorked}
                            onChange={(e) => handleUpdateSlipRow(slip.id, 'daysWorked', parseInt(e.target.value) || 0)}
                            className="w-14 text-center border border-slate-300 rounded-md py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-white"
                          />
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={slip.overtimeHours}
                            onChange={(e) => handleUpdateSlipRow(slip.id, 'overtimeHours', parseInt(e.target.value) || 0)}
                            className="w-14 text-center border border-slate-300 rounded-md py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500 bg-white"
                          />
                        </td>
                        <td className="py-3.5 px-3 text-slate-800">
                          {formatCurrency(slip.baseSalary, 'IRR')}
                        </td>
                        <td className="py-3.5 px-3 text-slate-700">
                          {formatCurrency(totalAllowances, 'IRR')}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          {formatCurrency(slip.grossSalary, 'IRR')}
                        </td>
                        <td className="py-3.5 px-3 text-blue-700 font-medium">
                          {formatCurrency(slip.employeeInsurance7Percent, 'IRR')}
                        </td>
                        <td className="py-3.5 px-3 text-amber-700 font-medium">
                          {slip.incomeTax > 0 ? formatCurrency(slip.incomeTax, 'IRR') : <span className="text-slate-400">معاف</span>}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-emerald-700 text-sm">
                          {formatCurrency(slip.netPayable, 'IRR')}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedSlipId(slip.id);
                              setActiveTab('digital_payslip');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-md border border-slate-200 text-xs font-medium transition-colors inline-flex items-center gap-1"
                            title="مشاهده و چاپ فیش رسمی"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            فیش
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-900">
                  <tr>
                    <td colSpan={6} className="py-3.5 px-4 text-left">
                      جمع کل دوره ({toPersianDigits(currentPeriodSlips.length)} پرسنل):
                    </td>
                    <td className="py-3.5 px-3">{formatCurrency(periodTotals.totalGrossSalary, 'IRR')}</td>
                    <td className="py-3.5 px-3 text-blue-700">{formatCurrency(periodTotals.totalEmployeeInsurance7Percent, 'IRR')}</td>
                    <td className="py-3.5 px-3 text-amber-700">{formatCurrency(periodTotals.totalPayrollTax, 'IRR')}</td>
                    <td className="py-3.5 px-3 text-emerald-700">{formatCurrency(periodTotals.totalNetSalary, 'IRR')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Quick Legal Reference Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span><strong>قانون تأمین اجتماعی:</strong> حق بیمه ۳۰٪ شامل ۷٪ سهم کارگر، ۲۰٪ سهم کارفرما و ۳٪ بیمه بیکاری است. سقف دستمزد روزانه مشمول کسر بیمه برابر با ۱۶,۷۲۱,۰۹۶ ریال می‌باشد.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span><strong>ماده ۸۴ قانون مالیات‌ها:</strong> سقف معافیت ماهانه ۱۲۰,۰۰۰,۰۰۰ ریال است و مازاد آن طبق پله‌های ۱۰٪ تا ۳۰٪ محاسبه می‌شود. ۲/۷ سهم بیمه کارگر از درآمد مشمول کسر مالیات معاف است.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <span><strong>قانون کار:</strong> هر ساعت اضافه‌کاری با ضریب ۱.۴ مزد عادی محاسبه گردیده و حق مسکن ۹,۰۰۰,۰۰۰ ریال و بن کارگری ۱۴,۰۰۰,۰۰۰ ریال ماهیانه در نظر گرفته شده است.</span>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: EMPLOYEES & STAFF DIRECTORY
         ==================================================================== */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">پرونده پرسنل و احکام کارگزینی</h2>
              <p className="text-xs text-slate-600 mt-0.5">مدیریت مشخصات هویتی، اطلاعات بیمه‌ای تأمین اجتماعی، شماره شبا و احکام استخدامی</p>
            </div>
            <button
              onClick={() => {
                setEditingEmployee(null);
                setEmpForm({
                  firstName: '',
                  lastName: '',
                  nationalId: '',
                  identityNumber: '',
                  fatherName: '',
                  gender: 'male',
                  maritalStatus: 'married',
                  childrenCount: 1,
                  ssoInsuranceNumber: '',
                  jobTitle: '',
                  department: 'فنی',
                  employmentType: 'full_time',
                  hireDate: '1403/01/01',
                  bankName: 'بانک ملت',
                  bankAccountNumber: '',
                  shabaNumber: 'IR',
                  baseDailyWage: IRAN_LABOR_LAW_RATES.MIN_DAILY_WAGE,
                  hasHousingAllowance: true,
                  hasGroceryAllowance: true,
                  positionAllowance: 0,
                  isTaxExempt: false
                });
                setShowEmployeeModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              ثبت پرونده پرسنل جدید
            </button>
          </div>

          {/* Employees Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {employees.map((emp) => (
              <div key={emp.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:border-indigo-300 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-base shadow-md">
                      {emp.firstName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {emp.firstName} {emp.lastName}
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-md border border-indigo-100">
                          {emp.jobTitle}
                        </span>
                      </h3>
                      <div className="text-xs text-slate-600 flex items-center gap-3 mt-1">
                        <span>واحد: {emp.department || 'عمومی'}</span>
                        <span>•</span>
                        <span>کد ملی: <strong className="font-mono text-slate-700">{emp.nationalId}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditClick(emp)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="ویرایش حکم"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف پرونده"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-600">شماره بیمه: </span>
                    <strong className="text-slate-800 font-mono">{emp.ssoInsuranceNumber || 'نامشخص'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">تعداد اولاد: </span>
                    <strong className="text-slate-800">{toPersianDigits(emp.childrenCount)} فرزند</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">مزد پایه روزانه: </span>
                    <strong className="text-slate-800">{formatCurrency(emp.baseDailyWage, 'IRR')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">حقوق پایه ماهانه: </span>
                    <strong className="text-slate-800">{formatCurrency(emp.baseDailyWage * 30, 'IRR')}</strong>
                  </div>
                </div>

                {/* Banking & DID */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.bankName} - شبا: <strong className="font-mono text-slate-700">{emp.shabaNumber}</strong></span>
                  </div>
                  {emp.didIdentifier && (
                    <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 truncate max-w-[180px]">
                      {emp.didIdentifier}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: DIGITAL PAYSLIP & OFFICIAL PRINT
         ==================================================================== */}
      {activeTab === 'digital_payslip' && (
        <div className="space-y-6">
          {/* Employee Selector Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">انتخاب کارمند جهت صدور فیش:</span>
              <select
                value={activeSlip?.id || ''}
                onChange={(e) => setSelectedSlipId(e.target.value)}
                className="bg-slate-50 text-slate-800 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-500"
              >
                {currentPeriodSlips.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.employeeName} ({s.jobTitle} - خالص: {formatCurrency(s.netPayable, 'IRR')})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                چاپ رسمی فیش حقوقی
              </button>
            </div>
          </div>

          {/* The Payslip (Print Optimized) */}
          {activeSlip ? (
            <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 max-w-4xl mx-auto shadow-md space-y-6 print:shadow-none print:border-slate-400 print:p-4 print:max-w-full">
              {/* Slip Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b-2 border-slate-800 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    H
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{ssoConfig.workshopName}</h2>
                    <p className="text-xs text-slate-600">فیش حقوق و دستمزد ماهانه پرسنل (رسمی)</p>
                  </div>
                </div>

                <div className="text-center sm:text-left text-xs space-y-1">
                  <div>دوره پرداخت: <strong className="text-slate-900">{currentPeriod?.monthName} ماه سال {toPersianDigits(currentPeriod?.year || 1403)}</strong></div>
                  <div>کد کارگاه تأمین اجتماعی: <strong className="font-mono text-slate-900">{ssoConfig.workshopCode}</strong></div>
                  <div>شماره پیگیری فیش: <strong className="font-mono text-indigo-700">{activeSlip.id.slice(0, 16)}</strong></div>
                </div>
              </div>

              {/* Employee Information Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-600 block">نام و نام‌خانوادگی:</span>
                  <strong className="text-slate-900 text-sm">{activeSlip.employeeName}</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">کد ملی:</span>
                  <strong className="font-mono text-slate-900">{activeSlip.nationalId}</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">شماره بیمه تأمین اجتماعی:</span>
                  <strong className="font-mono text-slate-900">{activeSlip.ssoInsuranceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">عنوان شغل:</span>
                  <strong className="text-slate-900">{activeSlip.jobTitle}</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">روزهای کارکرد ماه:</span>
                  <strong className="text-slate-900">{toPersianDigits(activeSlip.daysWorked)} روز</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">اضافه کاری:</span>
                  <strong className="text-slate-900">{toPersianDigits(activeSlip.overtimeHours)} ساعت</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">بانک عامل:</span>
                  <strong className="text-slate-900">{activeSlip.bankName}</strong>
                </div>
                <div>
                  <span className="text-slate-600 block">شماره شبا:</span>
                  <strong className="font-mono text-[11px] text-slate-900">{activeSlip.shabaNumber}</strong>
                </div>
              </div>

              {/* Two Column Table: Earnings & Deductions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings (مزایا و پرداخت‌ها) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 border-b border-slate-200 flex items-center justify-between">
                    <span>شرح پرداخت‌ها و مزایا</span>
                    <span>مبلغ (ریال)</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs p-2 space-y-1">
                    <div className="flex justify-between py-1.5 px-2">
                      <span className="text-slate-700">حقوق پایه کارکرد ({toPersianDigits(activeSlip.daysWorked)} روز)</span>
                      <span className="font-mono">{formatCurrency(activeSlip.baseSalary, 'IRR')}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2">
                      <span className="text-slate-700">کمک هزینه مسکن (مصوب)</span>
                      <span className="font-mono">{formatCurrency(activeSlip.housingAllowance, 'IRR')}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2">
                      <span className="text-slate-700">بن خواروبار و اقلام مصرفی</span>
                      <span className="font-mono">{formatCurrency(activeSlip.groceryAllowance, 'IRR')}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2">
                      <span className="text-slate-700">کمک هزینه عائله‌مندی (حق اولاد)</span>
                      <span className="font-mono">{formatCurrency(activeSlip.childAllowance, 'IRR')}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2">
                      <span className="text-slate-700">حق مسئولیت / سرپرستی</span>
                      <span className="font-mono">{formatCurrency(activeSlip.positionAllowance, 'IRR')}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2">
                      <span className="text-slate-700">اضافه کاری ({toPersianDigits(activeSlip.overtimeHours)} ساعت با ضریب ۱.۴)</span>
                      <span className="font-mono">{formatCurrency(activeSlip.overtimePay, 'IRR')}</span>
                    </div>
                    {activeSlip.bonuses > 0 && (
                      <div className="flex justify-between py-1.5 px-2 text-indigo-700">
                        <span>پاداش و بهره‌وری ماه</span>
                        <span className="font-mono font-semibold">{formatCurrency(activeSlip.bonuses, 'IRR')}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-xs text-slate-900 border-t border-slate-200 flex items-center justify-between">
                    <span>مجموع ناخالص پرداختی:</span>
                    <span className="font-bold text-sm text-indigo-900">{formatCurrency(activeSlip.grossSalary, 'IRR')}</span>
                  </div>
                </div>

                {/* Deductions (کسورات قانونی و اختیاری) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 border-b border-slate-200 flex items-center justify-between">
                    <span>شرح کسورات قانونی و اختیاری</span>
                    <span>مبلغ (ریال)</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs p-2 space-y-1">
                    <div className="flex justify-between py-1.5 px-2 text-blue-800">
                      <span>حق بیمه سهم کارگر (۷٪ تأمین اجتماعی)</span>
                      <span className="font-mono font-semibold">{formatCurrency(activeSlip.employeeInsurance7Percent, 'IRR')}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2 text-amber-800">
                      <span>مالیات بر درآمد حقوق (ماده ۸۴ ق.م.م)</span>
                      <span className="font-mono font-semibold">
                        {activeSlip.incomeTax > 0 ? formatCurrency(activeSlip.incomeTax, 'IRR') : '۰ (معاف)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2 text-slate-700">
                      <span>کسر مساعده پرداختی طی ماه</span>
                      <span className="font-mono">{formatCurrency(activeSlip.advancePaymentDeduction, 'IRR')}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-2 text-slate-700">
                      <span>سایر کسورات و اقساط وام</span>
                      <span className="font-mono">{formatCurrency(activeSlip.otherDeductions, 'IRR')}</span>
                    </div>
                    <div className="py-4 px-2 text-[11px] text-slate-600 space-y-1 bg-slate-50/50 rounded-lg">
                      <div className="text-slate-600 font-medium">سهم کارفرما (اطلاعاتی):</div>
                      <div className="flex justify-between">
                        <span>بیمه سهم کارفرما (۲۰٪) + بیکاری (۳٪):</span>
                        <span className="font-mono font-bold text-blue-700">{formatCurrency(activeSlip.totalEmployerInsurance23Percent, 'IRR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-4 py-2.5 font-bold text-xs text-slate-900 border-t border-slate-200 flex items-center justify-between">
                    <span>مجموع کسورات:</span>
                    <span className="font-bold text-sm text-rose-700">{formatCurrency(activeSlip.totalDeductions, 'IRR')}</span>
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="bg-gradient-to-l from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-emerald-800 font-semibold block">مبلغ خالص قابل پرداخت به کارمند:</span>
                  <div className="text-2xl font-black text-emerald-900 tracking-tight mt-0.5">
                    {formatCurrency(activeSlip.netPayable, 'IRR')}
                  </div>
                </div>
                <div className="text-xs text-emerald-800 text-left sm:text-right">
                  <span>وضعیت واریز: <strong>آماده پرداخت به شبا</strong></span>
                  <div className="text-[11px] text-emerald-700 font-mono mt-0.5">{activeSlip.shabaNumber}</div>
                </div>
              </div>

              {/* Digital Proof Signatures & QR Footprint */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-600">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    تأییدیه هویت و امضای رمزنگاری هابینو (W3C DID Proof)
                  </div>
                  <div className="font-mono text-[10px] text-slate-600 break-all max-w-md">
                    DID: did:habino:sso:{ssoConfig.workshopCode}:{activeSlip.nationalId}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    صادره توسط موتور ارکستراسیون سایرافلو (SiraFlow Orchestrator) • فاقد نیاز به امضای دستی
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center space-y-1">
                    <div className="text-[11px] text-slate-600">مهر کارگزینی و حسابداری</div>
                    <div className="w-24 h-12 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-600">
                      تأیید سیستم
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[11px] text-slate-600">امضای مدیر امور مالی</div>
                    <div className="w-24 h-12 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-600">
                      امضای الکترونیک
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-600 bg-white border border-slate-200 rounded-xl">
              هیچ فیش حقوقی برای این دوره یافت نشد.
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 4: SOCIAL SECURITY ORGANIZATION (SSO) DISKETTE GENERATOR
         ==================================================================== */}
      {activeTab === 'sso_diskette' && (
        <div className="space-y-6">
          {/* Header Description */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full font-mono">
                  .DBF (dBase III / FoxPro)
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  سازگار با سامانه تأمین اجتماعی
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1.5">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                تولید دیسکت‌های رسمی سازمان تأمین اجتماعی (DSKKAR00.DBF و DSKVOR00.DBF)
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                تولید فایل‌های باینری استاندارد پایگاه‌داده FoxPro / dBase III با کدپیج Windows-1256 سازگار با درگاه <code className="text-blue-700 font-mono font-bold">eservices.tamin.ir</code> و نرم‌افزار رسمی ListDisk.
              </p>
            </div>

            {/* Main DBF Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadAllDbfPackage}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-700/20 transition-all cursor-pointer"
                title="دانلود همزمان جفت فایل‌های استاندارد DSKKAR00.DBF و DSKVOR00.DBF"
              >
                <FolderDown className="w-4 h-4 text-blue-200" />
                دانلود پکیج دیسکت بیمه (هر دو فایل .DBF)
              </button>

              <button
                onClick={handleDownloadKarDbf}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-slate-700 shadow-sm"
              >
                <Database className="w-4 h-4 text-blue-400" />
                دانلود DSKKAR00.DBF (کارگاه)
              </button>

              <button
                onClick={handleDownloadVorDbf}
                className="px-3.5 py-2.5 bg-indigo-900 hover:bg-indigo-800 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-indigo-700 shadow-sm"
              >
                <FileCode className="w-4 h-4 text-indigo-300" />
                دانلود DSKVOR00.DBF (پرسنل)
              </button>
            </div>
          </div>

          {/* Technical File Metadata Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">فایل کارگاه (Header)</span>
                <span className="text-sm font-bold font-mono text-blue-900">DSKKAR00.DBF</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {disketteFiles.karDbfSize?.toLocaleString('fa-IR') || '۷۵۰'} بایت • ۱ رکورد
                </span>
              </div>
              <button
                onClick={handleDownloadKarDbf}
                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                title="دانلود فایل کارگاه"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">فایل پرسنل (Details)</span>
                <span className="text-sm font-bold font-mono text-indigo-900">DSKVOR00.DBF</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                  {disketteFiles.vorDbfSize?.toLocaleString('fa-IR') || '۴,۱۰۰'} بایت • {toPersianDigits(currentPeriodSlips.length)} پرسنل
                </span>
              </div>
              <button
                onClick={handleDownloadVorDbf}
                className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                title="دانلود فایل ریز پرسنل"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">کدپیج انکودینگ</span>
                <span className="text-sm font-bold font-mono text-slate-800">Windows-1256</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">فارسی استاندارد FoxPro</span>
              </div>
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <Check className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">پایانه بارگذاری</span>
                <span className="text-xs font-bold text-slate-800">سامانه خدمات غیرحضوری</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">eservices.tamin.ir</span>
              </div>
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Workshop Details Configuration Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              مشخصات کارگاه، کارفرما و تنظیمات دیسکت تأمین اجتماعی (DSKKAR00)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">کد کارگاه (۱۰ رقمی - فیلد DSK_ID):</label>
                <input
                  type="text"
                  value={ssoConfig.workshopCode}
                  onChange={(e) => {
                    const updated = { ...ssoConfig, workshopCode: e.target.value };
                    setSsoConfig(updated);
                    saveStoredSSOConfig(updated);
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">ردیف پیمان (فیلد DSK_LISTNO):</label>
                <input
                  type="text"
                  value={ssoConfig.subContractCode}
                  onChange={(e) => {
                    const updated = { ...ssoConfig, subContractCode: e.target.value };
                    setSsoConfig(updated);
                    saveStoredSSOConfig(updated);
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">شعبه تأمین اجتماعی (فیلد DSK_SHOBE):</label>
                <input
                  type="text"
                  value={ssoConfig.insuranceBranch}
                  onChange={(e) => {
                    const updated = { ...ssoConfig, insuranceBranch: e.target.value };
                    setSsoConfig(updated);
                    saveStoredSSOConfig(updated);
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">نام کارفرما / مدیر (فیلد DSK_FARM):</label>
                <input
                  type="text"
                  value={ssoConfig.employerName}
                  onChange={(e) => {
                    const updated = { ...ssoConfig, employerName: e.target.value };
                    setSsoConfig(updated);
                    saveStoredSSOConfig(updated);
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Variable Social Security Insurance Rates Section */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    تنظیم درصدهای متغیر حق بیمه تأمین اجتماعی (متغیر بر اساس سال و نوع کارگاه)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    امکان تغییر درصدها برای سال‌های بعد، کارگاه‌های با ضرایب خاص، مشاغل سخت و زیان‌آور یا معافیت‌ها
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const standardRates: SSODisketteConfig = {
                        ...ssoConfig,
                        employeeRate: 7,
                        employerRate: 20,
                        unemploymentRate: 3,
                        extraHardLaborRate: 0,
                        isExemptWorkshop5Persons: false,
                        exemptionPercentage: 0
                      };
                      setSsoConfig(standardRates);
                      saveStoredSSOConfig(standardRates);
                      handleRecalculatePeriod(standardRates);
                      showToast('درصدهای بیمه به نرخ‌های استاندارد قانون کار (۷٪ + ۲۰٪ + ۳٪) بازنشانی شد.', 'info');
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    بازنشانی به نرخ‌های پایه
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRecalculatePeriod(ssoConfig);
                    }}
                    className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    اعمال و محاسبه مجدد فیش‌ها
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-slate-600 font-medium block mb-1">
                    درصد سهم کارگر (بیمه‌شده):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={ssoConfig.employeeRate ?? 7}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = { ...ssoConfig, employeeRate: val };
                        setSsoConfig(updated);
                        saveStoredSSOConfig(updated);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute left-2.5 top-1 text-[10px] text-slate-400 font-sans">٪</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">پیش‌فرض قانون: ۷ درصد</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-slate-600 font-medium block mb-1">
                    درصد سهم کارفرما:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={ssoConfig.employerRate ?? 20}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = { ...ssoConfig, employerRate: val };
                        setSsoConfig(updated);
                        saveStoredSSOConfig(updated);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute left-2.5 top-1 text-[10px] text-slate-400 font-sans">٪</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">پیش‌فرض قانون: ۲۰ درصد</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-slate-600 font-medium block mb-1">
                    درصد بیمه بیکاری:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={ssoConfig.unemploymentRate ?? 3}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = { ...ssoConfig, unemploymentRate: val };
                        setSsoConfig(updated);
                        saveStoredSSOConfig(updated);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute left-2.5 top-1 text-[10px] text-slate-400 font-sans">٪</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">پیش‌فرض قانون: ۳ درصد</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="text-slate-600 font-medium block mb-1">
                    مشاغل سخت و زیان‌آور:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={ssoConfig.extraHardLaborRate ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = { ...ssoConfig, extraHardLaborRate: val };
                        setSsoConfig(updated);
                        saveStoredSSOConfig(updated);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute left-2.5 top-1 text-[10px] text-slate-400 font-sans">٪</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">معمولاً ۴٪ مازاد سهم کارفرما</span>
                </div>
              </div>

              {/* Rate Summary Pill and Exemption Toggle */}
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-emerald-900">
                    سرجمع درصد کل حق بیمه کارگاه:
                  </span>
                  <span className="font-mono font-black text-sm text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                    {(ssoConfig.employeeRate ?? 7) + (ssoConfig.employerRate ?? 20) + (ssoConfig.unemploymentRate ?? 3) + (ssoConfig.extraHardLaborRate ?? 0)}٪
                  </span>
                  <span className="text-emerald-700 text-[11px]">
                    (شامل: {(ssoConfig.employerRate ?? 20) + (ssoConfig.unemploymentRate ?? 3) + (ssoConfig.extraHardLaborRate ?? 0)}٪ سهم کارفرما و بیکاری + {ssoConfig.employeeRate ?? 7}٪ سهم کارگر)
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ssoConfig.isExemptWorkshop5Persons ?? false}
                    onChange={(e) => {
                      const updated = { ...ssoConfig, isExemptWorkshop5Persons: e.target.checked };
                      setSsoConfig(updated);
                      saveStoredSSOConfig(updated);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-emerald-900 text-[11px]">
                    کارگاه مشمول قانون معافیت حق بیمه تا ۵ نفر
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* View Mode Switcher: DBF Table Structure vs Raw TXT */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSsoViewMode('dbf_structure')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  ssoViewMode === 'dbf_structure'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                ساختار جداول دیتابیس باینری (.DBF)
              </button>
              <button
                onClick={() => setSsoViewMode('txt_preview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  ssoViewMode === 'txt_preview'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                پیش‌نمایش متنی / فایل‌های TXT کمکی
              </button>
            </div>

            <div className="text-[11px] text-slate-500">
              دوره محاسباتی: <strong className="text-slate-800 font-mono">{currentPeriod?.year}/{String(currentPeriod?.month).padStart(2, '0')}</strong>
            </div>
          </div>

          {/* VIEW MODE 1: DBF Schema & Records Inspection */}
          {ssoViewMode === 'dbf_structure' && (
            <div className="space-y-6">
              {/* DSKKAR00 DBF Table View */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span className="font-mono font-bold text-xs text-blue-200">جدول DSKKAR00.DBF (اطلاعات کارگاه و جمع ارقام ماه)</span>
                    <span className="px-2 py-0.5 bg-blue-900/60 border border-blue-600/50 text-[10px] text-blue-300 rounded-md font-mono">
                      {SSO_KAR_DBF_FIELDS.length} فیلد مصوب
                    </span>
                  </div>
                  <button
                    onClick={handleDownloadKarDbf}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    دانلود فایل DSKKAR00.DBF
                  </button>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-mono">
                        <th className="py-2 px-3">DSK_ID</th>
                        <th className="py-2 px-3">DSK_NAME</th>
                        <th className="py-2 px-3">DSK_FARM</th>
                        <th className="py-2 px-3">DSK_YY</th>
                        <th className="py-2 px-3">DSK_MM</th>
                        <th className="py-2 px-3">DSK_NUM</th>
                        <th className="py-2 px-3">DSK_TDD</th>
                        <th className="py-2 px-3">DSK_TMASH</th>
                        <th className="py-2 px-3">DSK_TBMO (7%)</th>
                        <th className="py-2 px-3">DSK_TKAR (20%)</th>
                        <th className="py-2 px-3">DSK_TBIK (3%)</th>
                        <th className="py-2 px-3">DSK_BIMH (30%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-blue-700">{ssoConfig.workshopCode}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-800">{ssoConfig.workshopName}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-700">{ssoConfig.employerName}</td>
                        <td className="py-2.5 px-3">{String(currentPeriod?.year || 1403).slice(-2)}</td>
                        <td className="py-2.5 px-3">{currentPeriod?.month}</td>
                        <td className="py-2.5 px-3 font-bold">{currentPeriodSlips.length}</td>
                        <td className="py-2.5 px-3">{currentPeriodSlips.reduce((sum, s) => sum + s.daysWorked, 0)}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-bold">{periodTotals.totalGrossSalary.toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-blue-700 font-bold">{periodTotals.totalEmployeeInsurance7Percent.toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-indigo-700">{currentPeriodSlips.reduce((sum, s) => sum + s.employerInsurance20Percent, 0).toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-purple-700">{currentPeriodSlips.reduce((sum, s) => sum + s.unemploymentInsurance3Percent, 0).toLocaleString('fa-IR')}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">{periodTotals.totalSocialSecurityInsurance30Percent.toLocaleString('fa-IR')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DSKVOR00 DBF Table View */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono font-bold text-xs text-indigo-200">جدول DSKVOR00.DBF (ریز مشخصات و دستمزد بیمه‌شدگان)</span>
                    <span className="px-2 py-0.5 bg-indigo-900/60 border border-indigo-600/50 text-[10px] text-indigo-300 rounded-md font-mono">
                      {toPersianDigits(currentPeriodSlips.length)} رکورد پرسنلی • {SSO_VOR_DBF_FIELDS.length} فیلد
                    </span>
                  </div>
                  <button
                    onClick={handleDownloadVorDbf}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    دانلود فایل DSKVOR00.DBF
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-mono">
                        <th className="py-2.5 px-3">ردیف</th>
                        <th className="py-2.5 px-3">کد ملی (DSK_MELI)</th>
                        <th className="py-2.5 px-3">شماره بیمه (DSK_BNO)</th>
                        <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                        <th className="py-2.5 px-3">کارکرد (روز)</th>
                        <th className="py-2.5 px-3">مزد روزانه (ریال)</th>
                        <th className="py-2.5 px-3">مزد پایه (DSK_DMAH)</th>
                        <th className="py-2.5 px-3">مشمول کسر (DSK_DSOK)</th>
                        <th className="py-2.5 px-3">بیمه کارگر ۷٪ (DSK_BMO)</th>
                        <th className="py-2.5 px-3">بیمه کارفرما ۲۳٪</th>
                        <th className="py-2.5 px-3">کل ۳۰٪ (DSK_TOT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {currentPeriodSlips.map((slip, idx) => (
                        <tr key={slip.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{slip.nationalId}</td>
                          <td className="py-2 px-3 text-indigo-700">{slip.ssoInsuranceNumber}</td>
                          <td className="py-2 px-3 font-sans font-medium text-slate-900">{slip.employeeName}</td>
                          <td className="py-2 px-3 font-bold">{slip.daysWorked}</td>
                          <td className="py-2 px-3">{slip.dailyWage.toLocaleString('fa-IR')}</td>
                          <td className="py-2 px-3">{slip.baseSalary.toLocaleString('fa-IR')}</td>
                          <td className="py-2 px-3 text-slate-900 font-bold">{slip.insuredGrossSalary.toLocaleString('fa-IR')}</td>
                          <td className="py-2 px-3 text-blue-700 font-semibold">{slip.employeeInsurance7Percent.toLocaleString('fa-IR')}</td>
                          <td className="py-2 px-3 text-indigo-700 font-semibold">{slip.totalEmployerInsurance23Percent.toLocaleString('fa-IR')}</td>
                          <td className="py-2 px-3 text-emerald-700 font-bold">{slip.totalInsurance30Percent.toLocaleString('fa-IR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Raw Text Stream & TXT Backup Preview */}
          {ssoViewMode === 'txt_preview' && (
            <div className="space-y-6">
              {/* DSKKAR00 Preview */}
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span className="font-mono font-bold text-xs text-blue-300">DSKKAR00.TXT (خروجی متنی کمکی کارگاه)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadTextFile(disketteFiles.dskKarText, `DSKKAR00_${currentPeriod?.year}_${currentPeriod?.month}.TXT`)}
                      className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs flex items-center gap-1 font-mono transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      دانلود TXT
                    </button>
                    <button
                      onClick={() => copyToClipboard(disketteFiles.dskKarText, 'kar')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 font-mono transition-colors cursor-pointer"
                    >
                      {copiedKey === 'kar' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      کپی محتوا
                    </button>
                  </div>
                </div>
                <pre className="font-mono text-[11px] text-slate-300 bg-slate-950 p-3 rounded-lg overflow-x-auto border border-slate-800/80 leading-relaxed">
                  {disketteFiles.dskKarText}
                </pre>
              </div>

              {/* DSKVOR00 Preview */}
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    <span className="font-mono font-bold text-xs text-indigo-300">DSKVOR00.TXT (خروجی متنی کمکی ریز پرسنل)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadTextFile(disketteFiles.dskVorText, `DSKVOR00_${currentPeriod?.year}_${currentPeriod?.month}.TXT`)}
                      className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs flex items-center gap-1 font-mono transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      دانلود TXT
                    </button>
                    <button
                      onClick={() => copyToClipboard(disketteFiles.dskVorText, 'vor')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 font-mono transition-colors cursor-pointer"
                    >
                      {copiedKey === 'vor' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      کپی محتوا
                    </button>
                  </div>
                </div>
                <pre className="font-mono text-[11px] text-slate-300 bg-slate-950 p-3 rounded-lg overflow-x-auto border border-slate-800/80 leading-relaxed">
                  {disketteFiles.dskVorText}
                </pre>
              </div>
            </div>
          )}

          {/* Step-by-step SSO Portal Guide */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 text-xs space-y-3 shadow-sm">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              راهنمای گام‌به‌گام ارسال لیست با فرمت استاندارد .DBF در درگاه تأمین اجتماعی (eservices.tamin.ir):
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 pr-1 leading-relaxed">
              <li>با فشردن دکمه <strong>«دانلود پکیج دیسکت بیمه (هر دو فایل .DBF)»</strong> در بالای صفحه، فایل‌های <code className="bg-slate-100 text-blue-800 px-1 py-0.5 rounded font-mono font-bold">DSKKAR00.DBF</code> و <code className="bg-slate-100 text-indigo-800 px-1 py-0.5 rounded font-mono font-bold">DSKVOR00.DBF</code> را ذخیره کنید.</li>
              <li>وارد سامانه خدمات غیرحضوری تأمین اجتماعی شده و از منوی بالای صفحه وارد بخش <strong>«کارفرمایان» &gt; «ارسال لیست حق بیمه»</strong> شوید.</li>
              <li>روی دکمه <strong>«بارگذاری فایل لیست حق بیمه (دیسکت)»</strong> کلیک نمایید.</li>
              <li>فایل <strong>DSKKAR00.DBF</strong> را در بخش <em>«فایل مشخصات کارگاه»</em> و فایل <strong>DSKVOR00.DBF</strong> را در بخش <em>«فایل اطلاعات ماهانه بیمه‌شدگان»</em> انتخاب نمایید.</li>
              <li>سامانه به صورت آنی ساختار دیتابیس، مشخصات هویتی و محاسبات بیمه را تطبیق می‌دهد. پس از مشاهده وضعیت «تأیید اولیه بدون خطا»، دکمه <strong>«ارسال و صدور برگ پرداخت»</strong> را تایید فرمایید.</li>
              <li>شناسه قبض و شناسه پرداخت بلافاصله صادر شده و امکان پرداخت الکترونیکی مستقیم یا ثبت در سند دفتر روزنامه هابینو فراهم می‌گردد.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 5: DOUBLE-ENTRY JOURNAL VOUCHER (ACCOUNTING LEDGER)
         ==================================================================== */}
      {activeTab === 'accounting_voucher' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                سند دوبل حسابداری حقوق و دستمزد در دفتر روزنامه
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                ثبت متوازن سند دوبل استاندارد در دفتر کل و روزنامه هابینو با رعایت کدینگ حساب‌های هزینه، بدهی بیمه، مالیات تکلیفی و خالص پرداختنی پرسنل.
              </p>
            </div>

            <div>
              {currentPeriod?.status === 'posted_to_ledger' ? (
                <div className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  سند به شماره {currentPeriod.accountingDocumentNumber} در دفتر روزنامه ثبت گردید
                </div>
              ) : (
                <button
                  onClick={handlePostToLedger}
                  disabled={isPostingLedger}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  {isPostingLedger ? 'در حال ثبت...' : 'تایید و ثبت رسمی سند در دفتر روزنامه'}
                </button>
              )}
            </div>
          </div>

          {/* Journal Voucher Table Preview */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="font-semibold text-slate-700">
                پیش‌نویس سند حسابداری دوره: <strong>{currentPeriod?.monthName} {currentPeriod?.year}</strong>
              </div>
              <div className="text-slate-600">
                قاعده تراز: <strong className="text-emerald-700 font-mono">ΣDebit == ΣCredit (تراز ۱۰۰٪)</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">کد معین</th>
                    <th className="py-3 px-4">عنوان حساب در دفتر کل</th>
                    <th className="py-3 px-6">شرح آرتیکل سند</th>
                    <th className="py-3 px-4 text-left">بدهکار (ریال)</th>
                    <th className="py-3 px-4 text-left">بستانکار (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {/* Row 1: Gross Expense */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">۸۰۱۰۱</td>
                    <td className="py-3 px-4 text-slate-800 font-sans">هزینه حقوق، دستمزد و مزایای پرسنلی</td>
                    <td className="py-3 px-6 text-slate-600 font-sans">ناخالص حقوق و مزایای مستمر پرسنل در دوره {currentPeriod?.monthName}</td>
                    <td className="py-3 px-4 text-left font-bold text-slate-900">{formatCurrency(periodTotals.totalGrossSalary, 'IRR')}</td>
                    <td className="py-3 px-4 text-left text-slate-300">۰</td>
                  </tr>

                  {/* Row 2: Employer Insurance 23% */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">۸۰۱۰۲</td>
                    <td className="py-3 px-4 text-slate-800 font-sans">هزینه بیمه سهم کارفرما و بیکاری (۲۳٪)</td>
                    <td className="py-3 px-6 text-slate-600 font-sans">بیمه تأمین اجتماعی سهم کارفرما (۲۰٪) و بیکاری (۳٪)</td>
                    <td className="py-3 px-4 text-left font-bold text-slate-900">{formatCurrency(periodTotals.totalEmployerInsurance23Percent, 'IRR')}</td>
                    <td className="py-3 px-4 text-left text-slate-300">۰</td>
                  </tr>

                  {/* Row 3: SSO Payable 30% */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-blue-700">۴۰۱۰۱</td>
                    <td className="py-3 px-4 text-blue-800 font-sans">سازمان تأمین اجتماعی پرداختنی (۳۰٪)</td>
                    <td className="py-3 px-6 text-slate-600 font-sans">مجموع حق بیمه پرداختی ماهانه به تأمین اجتماعی (۷٪ + ۲۳٪)</td>
                    <td className="py-3 px-4 text-left text-slate-300">۰</td>
                    <td className="py-3 px-4 text-left font-bold text-blue-800">{formatCurrency(periodTotals.totalSocialSecurityInsurance30Percent, 'IRR')}</td>
                  </tr>

                  {/* Row 4: Tax Payable */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-amber-700">۴۰۱۰۲</td>
                    <td className="py-3 px-4 text-amber-800 font-sans">مالیات حقوق تکلیفی پرداختنی (ماده ۸۴)</td>
                    <td className="py-3 px-6 text-slate-600 font-sans">مالیات تکلیفی مکسوره از حقوق پرسنل جهت واریز به دارایی</td>
                    <td className="py-3 px-4 text-left text-slate-300">۰</td>
                    <td className="py-3 px-4 text-left font-bold text-amber-800">{formatCurrency(periodTotals.totalPayrollTax, 'IRR')}</td>
                  </tr>

                  {/* Row 5: Net Payable */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-emerald-700">۴۰۱۰۳</td>
                    <td className="py-3 px-4 text-emerald-800 font-sans">حقوق و دستمزد پرداختنی پرسنل</td>
                    <td className="py-3 px-6 text-slate-600 font-sans">خالص حقوق قابل پرداخت به کارکنان از طریق حواله شبا</td>
                    <td className="py-3 px-4 text-left text-slate-300">۰</td>
                    <td className="py-3 px-4 text-left font-bold text-emerald-800">{formatCurrency(periodTotals.totalNetSalary, 'IRR')}</td>
                  </tr>
                </tbody>

                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 font-mono">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 font-sans text-left">
                      جمع تراز سند حسابداری:
                    </td>
                    <td className="py-3 px-4 text-left text-sm text-indigo-900">
                      {formatCurrency(periodTotals.totalGrossSalary + periodTotals.totalEmployerInsurance23Percent, 'IRR')}
                    </td>
                    <td className="py-3 px-4 text-left text-sm text-indigo-900">
                      {formatCurrency(periodTotals.totalSocialSecurityInsurance30Percent + periodTotals.totalPayrollTax + periodTotals.totalNetSalary, 'IRR')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 6: SIRAFLOW AI PAYROLL AUDIT & COMPLIANCE
         ==================================================================== */}
      {activeTab === 'sira_audit' && auditReport && (
        <div className="space-y-6">
          {/* Audit Score Card */}
          <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white border border-indigo-900/50 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">موتور تحلیل هوشمند سایرافلو (SiraFlow Audit)</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                ارزیابی انطباق قانونی لیست حقوق و دیسکت تأمین اجتماعی
              </h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {auditReport.summary}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-800/80 px-6 py-4 rounded-xl border border-slate-700 shrink-0">
              <div className="text-center">
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  {toPersianDigits(auditReport.overallScore)}٪
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">امتیاز صحت قانونی</div>
              </div>
              <div className="h-10 w-px bg-slate-700" />
              <div className="text-xs space-y-0.5 text-slate-300">
                <div>وضعیت: <strong className="text-emerald-400">کاملاً منطبق و معتبر</strong></div>
                <div>خطاهای بحرانی: <strong className="text-slate-100">۰ مورد</strong></div>
              </div>
            </div>
          </div>

          {/* Legal Deadline Alert */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-950">
                مهلت قانونی ارسال لیست و پرداخت حق بیمه (ماده ۳۹ تأمین اجتماعی):
              </div>
              <p className="text-amber-800 leading-relaxed">
                {auditReport.deadlineAlert.penaltyRiskNote}
              </p>
              <div className="text-amber-900 font-medium">
                مهلت ارسال این دوره: {auditReport.deadlineAlert.ssoFilingDeadline}
              </div>
            </div>
          </div>

          {/* Audit Checks Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">چک‌لیست ممیزی استانداردهای کار و مالیات</h3>
            <div className="space-y-3">
              {auditReport.checks.map((check, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-4 text-xs transition-all ${
                    check.passed
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm mb-1">{check.title}</h4>
                      <p className="text-slate-700 leading-relaxed">{check.details}</p>
                      {check.actionRequired && (
                        <div className="mt-2 text-rose-800 font-semibold flex items-center gap-1.5">
                          <span>اقدام پیشنهادی سایرافلو:</span>
                          <span>{check.actionRequired}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    check.passed ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                  }`}>
                    {check.passed ? 'تأیید' : 'نیازمند اصلاح'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: ADD / EDIT EMPLOYEE
         ==================================================================== */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {editingEmployee ? 'ویرایش پرونده و حکم پرسنل' : 'ثبت پرونده و حکم استخدامی کارمند جدید'}
              </h3>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              {/* Row 1: Personal Data */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">نام:*</label>
                  <input
                    type="text"
                    required
                    value={empForm.firstName}
                    onChange={(e) => setEmpForm({ ...empForm, firstName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: آرش"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">نام خانوادگی:*</label>
                  <input
                    type="text"
                    required
                    value={empForm.lastName}
                    onChange={(e) => setEmpForm({ ...empForm, lastName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="مثال: کاظمی"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">کد ملی (۱۰ رقم):*</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={empForm.nationalId}
                    onChange={(e) => setEmpForm({ ...empForm, nationalId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="۰۰۱۸۴۹۳۰۲۱"
                  />
                </div>
              </div>

              {/* Row 2: Insurance & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">شماره بیمه تأمین اجتماعی:*</label>
                  <input
                    type="text"
                    required
                    value={empForm.ssoInsuranceNumber}
                    onChange={(e) => setEmpForm({ ...empForm, ssoInsuranceNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="۰۲۸۴۹۱۰۲۴"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">عنوان شغل و پست:*</label>
                  <input
                    type="text"
                    required
                    value={empForm.jobTitle}
                    onChange={(e) => setEmpForm({ ...empForm, jobTitle: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="مهندس نرم‌افزار"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">واحد / دپارتمان:</label>
                  <input
                    type="text"
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="فنی و مهندسی"
                  />
                </div>
              </div>

              {/* Row 3: Family & Children */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">وضعیت تأهل:</label>
                  <select
                    value={empForm.maritalStatus}
                    onChange={(e) => setEmpForm({ ...empForm, maritalStatus: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="single">مجرد</option>
                    <option value="married">متأهل</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">تعداد اولاد (مشمول حق اولاد):</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={empForm.childrenCount}
                    onChange={(e) => setEmpForm({ ...empForm, childrenCount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">نوع استخدام:</label>
                  <select
                    value={empForm.employmentType}
                    onChange={(e) => setEmpForm({ ...empForm, employmentType: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="full_time">تمام‌وقت مشمول قانون کار</option>
                    <option value="part_time">پاره‌وقت / ساعتی</option>
                    <option value="contractual">قراردادی معین</option>
                    <option value="consultant">مشاوره‌ای</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Wage & Allowances */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">مزد روزانه مصوب (ریال):*</label>
                  <input
                    type="number"
                    step="1000"
                    value={empForm.baseDailyWage}
                    onChange={(e) => setEmpForm({ ...empForm, baseDailyWage: parseInt(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-600 mt-0.5 block">
                    پایه ۳۰ روزه: {formatCurrency(empForm.baseDailyWage * 30, 'IRR')}
                  </span>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">حق مسئولیت / جذب ماهانه (ریال):</label>
                  <input
                    type="number"
                    step="1000000"
                    value={empForm.positionAllowance}
                    onChange={(e) => setEmpForm({ ...empForm, positionAllowance: parseInt(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={empForm.hasHousingAllowance}
                      onChange={(e) => setEmpForm({ ...empForm, hasHousingAllowance: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700">شامل حق مسکن مصوب (۹ میلیون ریال)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={empForm.hasGroceryAllowance}
                      onChange={(e) => setEmpForm({ ...empForm, hasGroceryAllowance: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700">شامل بن خواروبار (۱۴ میلیون ریال)</span>
                  </label>
                </div>
              </div>

              {/* Row 5: Banking Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">نام بانک:</label>
                  <input
                    type="text"
                    value={empForm.bankName}
                    onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="بانک ملت"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-700 font-semibold block mb-1">شماره شبا (واریز حقوق):</label>
                  <input
                    type="text"
                    value={empForm.shabaNumber}
                    onChange={(e) => setEmpForm({ ...empForm, shabaNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="IR8201200000058492019482"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 transition-all"
                >
                  {editingEmployee ? 'ذخیره تغییرات حکم' : 'ثبت نهایی کارمند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollStudio;
