import React, { useState, useMemo } from 'react';
import { useAccounting } from '../lib/store';
import { AccountingEntry, Client } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import { validateDocumentEntries } from '../lib/accountingEngine';
import { exportContactsLedgerToCsv, buildClientBalanceReminderMessage } from '../lib/exportUtils';
import {
  Plus,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Scale,
  Search,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  Building2,
  Calendar,
  Printer,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Eye,
  UserCheck,
  ShieldAlert,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Phone,
  Building,
  Download,
  MessageSquare,
  Copy,
  Check,
  Share2,
  X,
  FolderTree,
  Receipt,
  ShieldCheck
} from 'lucide-react';
import { ClientStatementModal } from './ClientStatementModal';
import { ChartOfAccountsView } from './ChartOfAccountsView';
import { FloatingTafsiliView } from './FloatingTafsiliView';
import { MultiColumnTrialBalanceView } from './MultiColumnTrialBalanceView';
import { DocumentOcrStudio } from './DocumentOcrStudio';
import { getUnifiedFloatingTafsiliList } from '../lib/floatingTafsiliEngine';
import { AccountingVerificationStudio } from './AccountingVerificationStudio';

export const STANDARD_CHART_OF_ACCOUNTS = [
  { code: '10101', title: 'صندوق و موجودی نقد', category: 'دارایی‌های جاری', nature: 'debit' },
  { code: '10102', title: 'بانک‌ها و حساب‌های جاری', category: 'دارایی‌های جاری', nature: 'debit' },
  { code: '10201', title: 'حساب‌ها و اسناد دریافتنی تجاری (مشتریان)', category: 'دارایی‌های جاری', nature: 'debit' },
  { code: '10202', title: 'اسناد دریافتنی نزد صندوق (چک‌ها)', category: 'دارایی‌های جاری', nature: 'debit' },
  { code: '10301', title: 'موجودی کالا و ملزومات مصرفی', category: 'دارایی‌های جاری', nature: 'debit' },
  { code: '10401', title: 'پیش‌پرداخت پروژه‌ها و علی‌الحساب', category: 'دارایی‌های جاری', nature: 'debit' },
  { code: '20101', title: 'حساب‌ها و اسناد پرداختنی تجاری (تأمین‌کنندگان)', category: 'بدهی‌های جاری', nature: 'credit' },
  { code: '20102', title: 'اسناد پرداختنی صیادی (چک‌های صادره)', category: 'بدهی‌های جاری', nature: 'credit' },
  { code: '20201', title: 'پیش‌دریافت پروژه‌ها از کارفرمایان', category: 'بدهی‌های جاری', nature: 'credit' },
  { code: '20301', title: 'مالیات و عوارض بر ارزش افزوده پرداختنی', category: 'بدهی‌های جاری', nature: 'credit' },
  { code: '30101', title: 'سرمایه شرکا و حقوق صاحبان سهام', category: 'حقوق صاحبان سهام', nature: 'credit' },
  { code: '30201', title: 'سود (زیان) انباشته', category: 'حقوق صاحبان سهام', nature: 'credit' },
  { code: '40101', title: 'درآمد فروش کالا و تجهیزات', category: 'درآمدها', nature: 'credit' },
  { code: '40102', title: 'درآمد ارائه خدمات فنی و مهندسی', category: 'درآمدها', nature: 'credit' },
  { code: '50101', title: 'بهای تمام‌شده کالای فروش‌رفته و خدمات ارائه شده', category: 'بهای تمام‌شده', nature: 'debit' },
  { code: '60101', title: 'هزینه‌های حقوق و دستمزد پرسنلی', category: 'هزینه‌های عملیاتی', nature: 'debit' },
  { code: '60102', title: 'هزینه‌های اجاره، قبوض و سربار اداری', category: 'هزینه‌های عملیاتی', nature: 'debit' },
  { code: '60103', title: 'هزینه‌های بازاریابی، سفر و توسعه بازار', category: 'هزینه‌های عملیاتی', nature: 'debit' }
];

export interface LedgerProps {
  initialSubTab?: 'chart' | 'journal' | 'ledger' | 'tafsili' | 'trial' | 'contacts' | 'verification';
}

export const Ledger: React.FC<LedgerProps> = ({ initialSubTab }) => {
  const {
    accountingEntries,
    clients,
    invoices,
    checks,
    transactions,
    settings,
    addAccountingEntry
  } = useAccounting();

  // Mode: 'chart' (سرفصل‌های ۳ سطحی), 'journal' (دفتر روزنامه ترتیبی), 'ledger' (دفتر کل حساب‌ها), 'tafsili' (تفصیلی شناور), 'trial' (تراز آزمایشی ۲، ۴، ۶ ستونی), 'contacts' (مرور مخاطبین), 'ocr' (اتوماسیون و OCR اسناد), 'verification' (آزمون خودکار تراز و دفتر کل)
  const [activeTab, setActiveTabState] = useState<'chart' | 'journal' | 'ledger' | 'tafsili' | 'trial' | 'contacts' | 'ocr' | 'verification'>(() => {
    if (initialSubTab) return initialSubTab;
    const saved = localStorage.getItem('habino_ledger_subtab');
    if (saved && ['chart', 'journal', 'ledger', 'tafsili', 'trial', 'contacts', 'ocr', 'verification'].includes(saved)) {
      return saved as any;
    }
    return 'chart';
  });

  const setActiveTab = (tab: 'chart' | 'journal' | 'ledger' | 'tafsili' | 'trial' | 'contacts' | 'ocr' | 'verification') => {
    setActiveTabState(tab);
    localStorage.setItem('habino_ledger_subtab', tab);
  };
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);

  // State for Contacts Account Review (مرور حساب اشخاص و طرف‌حساب‌ها)
  const [contactSearchQuery, setContactSearchQuery] = useState<string>('');
  const [contactStatusFilter, setContactStatusFilter] = useState<'all' | 'debtor' | 'creditor' | 'settled'>('all');
  const [contactTypeFilter, setContactTypeFilter] = useState<'all' | 'individual' | 'corporate'>('all');
  const [contactSortBy, setContactSortBy] = useState<'highest_debt' | 'highest_credit' | 'highest_turnover' | 'name'>('highest_debt');
  const [statementClient, setStatementClient] = useState<Client | null>(null);

  // Pagination for contacts review
  const [contactCurrentPage, setContactCurrentPage] = useState<number>(1);
  const [contactPageSize, setContactPageSize] = useState<number>(10);

  // Quick SMS/WhatsApp Reminder Modal from contact row
  const [reminderTarget, setReminderTarget] = useState<{ client: Client; balance: number } | null>(null);
  const [copiedReminderText, setCopiedReminderText] = useState<boolean>(false);

  // Form State for new journal entry
  const [documentNumber, setDocumentNumber] = useState<string>(() => `${100 + accountingEntries.length + 1}`);
  const [date, setDate] = useState<string>(() => new Date().toLocaleDateString('fa-IR'));
  const [clientId, setClientId] = useState<string>('');
  const [rows, setRows] = useState<{ accountCode: string; accountTitle: string; debit: number; credit: number; description: string }[]>([
    { accountCode: '10102', accountTitle: 'بانک‌ها و حساب‌های جاری', debit: 0, credit: 0, description: '' },
    { accountCode: '40102', accountTitle: 'درآمد ارائه خدمات فنی و مهندسی', debit: 0, credit: 0, description: '' }
  ]);

  const validation = validateDocumentEntries(rows);

  // Distinct account list present in entries or standard chart
  const accountList = useMemo(() => {
    const map = new Map<string, { code: string; title: string }>();
    STANDARD_CHART_OF_ACCOUNTS.forEach(a => map.set(a.code, { code: a.code, title: a.title }));
    accountingEntries.forEach(e => {
      if (!map.has(e.accountCode)) {
        map.set(e.accountCode, { code: e.accountCode, title: e.accountTitle });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [accountingEntries]);

  // Ledger calculation with running balance
  const ledgerEntriesWithBalance = useMemo(() => {
    // Filter by selected account if not 'all'
    let list = accountingEntries;
    if (selectedAccountCode !== 'all') {
      list = list.filter(e => e.accountCode === selectedAccountCode);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.accountTitle.toLowerCase().includes(q) ||
        e.accountCode.includes(q) ||
        e.documentNumber.includes(q)
      );
    }

    // Sort chronologically
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));

    // Calculate running balance
    let balance = 0;
    return sorted.map(item => {
      balance += (item.debit - item.credit);
      return {
        ...item,
        runningBalance: Math.abs(balance),
        balanceType: balance > 0 ? ('بد' as const) : balance < 0 ? ('بس' as const) : ('—' as const)
      };
    });
  }, [accountingEntries, selectedAccountCode, searchQuery]);

  // Trial balance calculations (تراز آزمایشی سرفصل‌های دفتر کل)
  const trialBalance = useMemo(() => {
    const accMap = new Map<string, { code: string; title: string; totalDebit: number; totalCredit: number }>();

    accountingEntries.forEach(e => {
      const existing = accMap.get(e.accountCode) || {
        code: e.accountCode,
        title: e.accountTitle,
        totalDebit: 0,
        totalCredit: 0
      };
      existing.totalDebit += e.debit;
      existing.totalCredit += e.credit;
      accMap.set(e.accountCode, existing);
    });

    const rows = Array.from(accMap.values()).map(acc => {
      const diff = acc.totalDebit - acc.totalCredit;
      return {
        ...acc,
        balanceDebit: diff > 0 ? diff : 0,
        balanceCredit: diff < 0 ? Math.abs(diff) : 0
      };
    }).sort((a, b) => a.code.localeCompare(b.code));

    const grandDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
    const grandCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
    const grandBalDebit = rows.reduce((s, r) => s + r.balanceDebit, 0);
    const grandBalCredit = rows.reduce((s, r) => s + r.balanceCredit, 0);

    return { rows, grandDebit, grandCredit, grandBalDebit, grandBalCredit, isBalanced: grandDebit === grandCredit };
  }, [accountingEntries]);

  // Contacts Review Calculations (مرور حساب‌های معین و تفصیلی اشخاص)
  const contactReviews = useMemo(() => {
    return clients.map(client => {
      const clientEntries = accountingEntries.filter(e => e.clientId === client.id);
      let totalDebit = clientEntries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
      let totalCredit = clientEntries.reduce((s, e) => s + (Number(e.credit) || 0), 0);

      const clientInvoices = (invoices || []).filter(
        inv => inv.clientId === client.id && inv.type !== 'proforma' && inv.type !== 'proforma_sale' && inv.type !== 'proforma_purchase'
      );
      const clientChecks = (checks || []).filter(c => c.clientId === client.id);
      const clientTxns = (transactions || []).filter(t => t.clientId === client.id);

      // Current balance: either direct from client record or from debit - credit
      const currentBalance = client.balance !== undefined ? Number(client.balance) : (totalDebit - totalCredit);

      // If accounting entries were not generated for initial balance or prior records
      if (totalDebit === 0 && totalCredit === 0 && currentBalance !== 0) {
        if (currentBalance > 0) totalDebit = currentBalance;
        else totalCredit = Math.abs(currentBalance);
      }

      const totalTurnover = totalDebit + totalCredit;

      const diagnosis: 'بدهکار' | 'بستانکار' | 'تسویه' =
        currentBalance > 0 ? 'بدهکار' : currentBalance < 0 ? 'بستانکار' : 'تسویه';
      const diagnosisShort: 'بد' | 'بس' | '—' =
        currentBalance > 0 ? 'بد' : currentBalance < 0 ? 'بس' : '—';

      const creditLimit = client.creditLimit || 0;
      const creditUsagePercent = (creditLimit > 0 && currentBalance > 0)
        ? Math.min(100, Math.round((currentBalance / creditLimit) * 100))
        : 0;
      const isCreditExceeded = creditLimit > 0 && currentBalance > creditLimit;

      const allDates = [
        ...clientEntries.map(e => e.date),
        ...clientInvoices.map(i => i.date),
        ...clientTxns.map(t => t.date),
        ...clientChecks.map(c => c.issueDate)
      ].filter(Boolean);
      const lastActivityDate = allDates.sort().reverse()[0] || '—';

      return {
        client,
        clientEntries,
        totalDebit,
        totalCredit,
        totalTurnover,
        currentBalance,
        diagnosis,
        diagnosisShort,
        invoiceCount: clientInvoices.length,
        checkCount: clientChecks.length,
        txnCount: clientTxns.length,
        totalRecords: clientEntries.length + clientInvoices.length + clientChecks.length + clientTxns.length,
        creditLimit,
        creditUsagePercent,
        isCreditExceeded,
        lastActivityDate
      };
    });
  }, [clients, accountingEntries, invoices, checks, transactions]);

  // Filtered and sorted contacts
  const filteredContacts = useMemo(() => {
    let list = contactReviews;

    // Search
    if (contactSearchQuery.trim()) {
      const q = contactSearchQuery.trim().toLowerCase();
      list = list.filter(item => {
        const c = item.client;
        return (
          (c.name || '').toLowerCase().includes(q) ||
          (c.companyName || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.nationalCode || '').toLowerCase().includes(q) ||
          (c.economicCode || '').toLowerCase().includes(q) ||
          (c.id || '').toLowerCase().includes(q)
        );
      });
    }

    // Status filter
    if (contactStatusFilter === 'debtor') {
      list = list.filter(item => item.currentBalance > 0);
    } else if (contactStatusFilter === 'creditor') {
      list = list.filter(item => item.currentBalance < 0);
    } else if (contactStatusFilter === 'settled') {
      list = list.filter(item => item.currentBalance === 0);
    }

    // Type filter
    if (contactTypeFilter !== 'all') {
      list = list.filter(item => (item.client.type || 'individual') === contactTypeFilter);
    }

    // Sort
    return [...list].sort((a, b) => {
      if (contactSortBy === 'highest_debt') {
        return b.currentBalance - a.currentBalance;
      }
      if (contactSortBy === 'highest_credit') {
        return a.currentBalance - b.currentBalance;
      }
      if (contactSortBy === 'highest_turnover') {
        return b.totalTurnover - a.totalTurnover;
      }
      if (contactSortBy === 'name') {
        return (a.client.name || '').localeCompare(b.client.name || '', 'fa');
      }
      return 0;
    });
  }, [contactReviews, contactSearchQuery, contactStatusFilter, contactTypeFilter, contactSortBy]);

  // Paginated contacts slice
  const contactTotalPages = Math.max(1, Math.ceil(filteredContacts.length / contactPageSize));
  const effectiveContactPage = Math.min(contactCurrentPage, contactTotalPages);
  const paginatedContacts = useMemo(() => {
    const startIndex = (effectiveContactPage - 1) * contactPageSize;
    return filteredContacts.slice(startIndex, startIndex + contactPageSize);
  }, [filteredContacts, effectiveContactPage, contactPageSize]);

  // Overall Contact Ledger Stats
  const contactStats = useMemo(() => {
    const totalCount = clients.length;
    const debtorContacts = contactReviews.filter(r => r.currentBalance > 0);
    const creditorContacts = contactReviews.filter(r => r.currentBalance < 0);
    const settledContacts = contactReviews.filter(r => r.currentBalance === 0);

    const totalDebtorsBalance = debtorContacts.reduce((s, r) => s + r.currentBalance, 0);
    const totalCreditorsBalance = creditorContacts.reduce((s, r) => s + Math.abs(r.currentBalance), 0);
    const netBalance = totalDebtorsBalance - totalCreditorsBalance;
    const totalDebitTurnover = contactReviews.reduce((s, r) => s + r.totalDebit, 0);
    const totalCreditTurnover = contactReviews.reduce((s, r) => s + r.totalCredit, 0);

    return {
      totalCount,
      debtorsCount: debtorContacts.length,
      creditorsCount: creditorContacts.length,
      settledCount: settledContacts.length,
      totalDebtorsBalance,
      totalCreditorsBalance,
      netBalance,
      totalDebitTurnover,
      totalCreditTurnover
    };
  }, [clients, contactReviews]);

  const viewClientInLedger = (client: Client) => {
    setSelectedAccountCode('all');
    setSearchQuery(client.name);
    setActiveTab('ledger');
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'accountCode') {
      const standard = STANDARD_CHART_OF_ACCOUNTS.find(a => a.code === value);
      if (standard) {
        updated[index].accountTitle = standard.title;
      }
    }

    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([...rows, { accountCode: '10101', accountTitle: 'صندوق و موجودی نقد', debit: 0, credit: 0, description: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 2) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) {
      alert(`سند ناتراز است! اختلاف بدهکار و بستانکار: ${validation.discrepancy.toLocaleString('fa-IR')} ${settings.currency}`);
      return;
    }

    for (const r of rows) {
      if (r.debit > 0 || r.credit > 0) {
        await addAccountingEntry({
          documentNumber,
          date,
          description: r.description || `سند شماره ${documentNumber}`,
          accountCode: r.accountCode,
          accountTitle: r.accountTitle,
          debit: Number(r.debit) || 0,
          credit: Number(r.credit) || 0,
          clientId: clientId || undefined
        });
      }
    }

    setShowModal(false);
    setDocumentNumber(`${100 + accountingEntries.length + 2}`);
    setRows([
      { accountCode: '10102', accountTitle: 'بانک‌ها و حساب‌های جاری', debit: 0, credit: 0, description: '' },
      { accountCode: '40102', accountTitle: 'درآمد ارائه خدمات فنی و مهندسی', debit: 0, credit: 0, description: '' }
    ]);
  };

  return (
    <div className="space-y-6" id="ledger-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800" id="ledger-title">دفتر کل و دفتر روزنامه حسابداری</h2>
          <p className="text-sm text-slate-500">مشاهده کارت حساب‌های دفتر کل، مانده در گردش، دفتر روزنامه ترتیبی و تراز آزمایشی</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            چاپ گزارش
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            id="create-journal-entry-btn"
          >
            <Plus className="w-4 h-4" />
            ثبت سند حسابداری دستی
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {activeTab === 'contacts' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">کل طرف‌حساب‌های تجاری</span>
            <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{contactStats.totalCount} مخاطب</p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
              <span className="text-emerald-700 font-bold">{contactStats.debtorsCount} بد</span>
              <span>•</span>
              <span className="text-rose-700 font-bold">{contactStats.creditorsCount} بس</span>
              <span>•</span>
              <span className="text-slate-500">{contactStats.settledCount} تسویه</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">مجموع مطالبات (بدهکاران تجاری)</span>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {formatCurrency(contactStats.totalDebtorsBalance, settings.currency)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">طلب قطعی از مشتریان و خریداران</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">مجموع تعهدات (بستانکاران تجاری)</span>
            <p className="text-lg font-bold text-rose-700 mt-1">
              {formatCurrency(contactStats.totalCreditorsBalance, settings.currency)}
            </p>
            <span className="text-[11px] text-rose-600 font-medium">بدهی قطعی به تأمین‌کنندگان و طلبکاران</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">خالص موازنه طرف‌حساب‌ها</span>
            <p className={`text-lg font-bold mt-1 ${
              contactStats.netBalance > 0 ? 'text-emerald-700' :
              contactStats.netBalance < 0 ? 'text-rose-700' :
              'text-slate-800'
            }`}>
              {formatCurrency(Math.abs(contactStats.netBalance), settings.currency)}
            </p>
            <span className={`text-[11px] font-medium ${
              contactStats.netBalance > 0 ? 'text-emerald-600' :
              contactStats.netBalance < 0 ? 'text-rose-600' :
              'text-slate-500'
            }`}>
              {contactStats.netBalance > 0 ? 'مازاد مطالبات (بدهکار خالص)' :
               contactStats.netBalance < 0 ? 'مازاد تعهدات (بستانکار خالص)' :
               'تراز دقیق حساب‌های اشخاص'}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">تعداد رکوردهای ثبتی</span>
            <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{accountingEntries.length} آرتیکل</p>
            <span className="text-[11px] text-blue-600 font-medium">سند رسمی دوطرفه</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">گردش بدهکار کل</span>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              {formatCurrency(trialBalance.grandDebit, settings.currency)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">دفاتر مالی هابینو</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">گردش بستانکار کل</span>
            <p className="text-lg font-bold text-rose-700 mt-1">
              {formatCurrency(trialBalance.grandCredit, settings.currency)}
            </p>
            <span className="text-[11px] text-rose-600 font-medium">طرف بستانکار اسناد</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">وضعیت توازن دفاتر</span>
            <div className="flex items-center gap-1.5 mt-2">
              {trialBalance.isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">کاملاً متوازن (تراز)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-bold text-rose-700">دارای ناترازی اسناد</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">مبتنی بر منطق سه‌سطحی</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs between Chart / Journal / Ledger / Tafsili / Trial Balance / Contacts */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chart'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            id="ledger-tab-chart"
          >
            <FolderTree className="w-3.5 h-3.5" />
            سرفصل‌های ۳ سطحی (گروه، کل، معین)
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'journal'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            id="ledger-tab-journal"
          >
            <Layers className="w-3.5 h-3.5" />
            دفتر روزنامه ترتیبی (Journal)
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            id="ledger-tab-ledger"
          >
            <BookOpen className="w-3.5 h-3.5" />
            دفتر کل و معین حساب‌ها
          </button>
          <button
            onClick={() => setActiveTab('tafsili')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tafsili'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            id="ledger-tab-tafsili"
          >
            <Users className="w-3.5 h-3.5" />
            تفصیلی شناور (اشخاص و شرکا)
          </button>
          <button
            onClick={() => setActiveTab('trial')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'trial'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            id="ledger-tab-trial"
          >
            <Scale className="w-3.5 h-3.5" />
            تراز آزمایشی ۲، ۴ و ۶ ستونی
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'contacts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            id="ledger-tab-contacts"
          >
            <UserCheck className="w-3.5 h-3.5" />
            مرور مخاطبین و مشتریان
          </button>
          <button
            onClick={() => setActiveTab('ocr')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ocr'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
            }`}
            id="ledger-tab-ocr"
          >
            <Receipt className="w-3.5 h-3.5 text-indigo-500" />
            اتوماسیون و OCR اسناد
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'verification'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300/80'
            }`}
            id="ledger-tab-verification"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            آزمون خودکار تراز و دفتر کل
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'ledger' && (
            <div className="relative">
              <select
                value={selectedAccountCode}
                onChange={e => setSelectedAccountCode(e.target.value)}
                className="pl-3 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="all">همه حساب‌های کل و معین</option>
                {accountList.map(acc => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab !== 'contacts' && (
            <div className="relative w-48 sm:w-60">
              <input
                type="text"
                placeholder="جستجو در شرح یا حساب..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="relative w-52 sm:w-72">
              <input
                type="text"
                placeholder="جستجو در نام، کد ملی، شماره تماس..."
                value={contactSearchQuery}
                onChange={e => setContactSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          )}
        </div>
      </div>

      {/* VIEW: 3-Level Chart of Accounts (سرفصل‌های ۳ سطحی حسابداری) */}
      {activeTab === 'chart' && (
        <ChartOfAccountsView
          onSelectMoein={(moeinCode) => {
            setSelectedAccountCode(moeinCode);
            setActiveTab('ledger');
          }}
        />
      )}

      {/* VIEW: Floating Tafsili (تفصیلی شناور اشخاص و شرکا) */}
      {activeTab === 'tafsili' && (
        <FloatingTafsiliView
          clients={clients}
          accountingEntries={accountingEntries}
          currency={settings.currency}
          onNavigateToEntry={(docNum) => {
            setSearchQuery(docNum);
            setActiveTab('journal');
          }}
        />
      )}

      {/* VIEW: Intelligent Document OCR & Automation Studio (اتوماسیون و اسکن اسناد مالی) */}
      {activeTab === 'ocr' && (
        <DocumentOcrStudio
          onNavigateToLedger={() => setActiveTab('journal')}
        />
      )}

      {/* VIEW: Automated Accounting Verification & Trial Balance Studio (آزمون خودکار تراز و دفتر کل) */}
      {activeTab === 'verification' && (
        <AccountingVerificationStudio
          onBack={() => setActiveTab('ledger')}
        />
      )}

      {/* VIEW 1: General Ledger (دفتر کل با مانده در گردش) */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">
                {selectedAccountCode === 'all'
                  ? 'نمایش ترکیبی اقلام دفتر کل'
                  : `کارت دفتر کل حساب ${selectedAccountCode} - ${accountList.find(a => a.code === selectedAccountCode)?.title || ''}`}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {ledgerEntriesWithBalance.length} گردش
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3 w-16 text-center">ردیف</th>
                  <th className="p-3 w-28">شماره سند</th>
                  <th className="p-3 w-28">تاریخ</th>
                  <th className="p-3 w-48">کد و عنوان حساب</th>
                  <th className="p-3">شرح آرتیکل مالی</th>
                  <th className="p-3 text-left w-36">بدهکار</th>
                  <th className="p-3 text-left w-36">بستانکار</th>
                  <th className="p-3 text-left w-36 bg-slate-100/60">مانده در گردش</th>
                  <th className="p-3 text-center w-16 bg-slate-100/60">تشخیص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {ledgerEntriesWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-sans">
                      هیچ تراکنش یا سندی برای این حساب در بازه جاری یافت نشد.
                    </td>
                  </tr>
                ) : (
                  ledgerEntriesWithBalance.map((item, idx) => (
                    <tr key={`${item.id || 'ledger'}-${idx}`} className="hover:bg-slate-50/60 transition-colors font-mono">
                      <td className="p-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">#{item.documentNumber}</td>
                      <td className="p-3 text-slate-500">{item.date}</td>
                      <td className="p-3 font-sans text-slate-800">
                        <span className="font-mono text-blue-600 font-bold ml-1">{item.accountCode}</span>
                        <span>{item.accountTitle}</span>
                      </td>
                      <td className="p-3 font-sans text-slate-700">{item.description}</td>
                      <td className="p-3 text-left font-bold text-emerald-700">
                        {item.debit > 0 ? formatCurrency(item.debit, settings.currency) : '—'}
                      </td>
                      <td className="p-3 text-left font-bold text-rose-700">
                        {item.credit > 0 ? formatCurrency(item.credit, settings.currency) : '—'}
                      </td>
                      <td className="p-3 text-left font-bold text-slate-900 bg-slate-50/40">
                        {formatCurrency(item.runningBalance, settings.currency)}
                      </td>
                      <td className="p-3 text-center font-sans font-bold bg-slate-50/40">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.balanceType === 'بد' ? 'bg-emerald-100 text-emerald-800' :
                          item.balanceType === 'بس' ? 'bg-rose-100 text-rose-800' :
                          'text-slate-400'
                        }`}>
                          {item.balanceType}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: General Journal (دفتر روزنامه ترتیبی) */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-800">دفتر روزنامه ثبت تاریخی اسناد دوبل</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">{accountingEntries.length} ردیف سند</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3 w-28">شماره سند</th>
                  <th className="p-3 w-28">تاریخ</th>
                  <th className="p-3 w-44">کد و عنوان حساب</th>
                  <th className="p-3">شرح آرتیکل سند</th>
                  <th className="p-3 text-left w-36">بدهکار</th>
                  <th className="p-3 text-left w-36">بستانکار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {accountingEntries.map((e, idx) => (
                  <tr key={`${e.id || 'entry'}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-bold text-slate-800">#{e.documentNumber}</td>
                    <td className="p-3 text-slate-500">{e.date}</td>
                    <td className="p-3 font-sans text-slate-800">
                      <span className="text-blue-600 font-mono font-bold ml-1">{e.accountCode}</span> - {e.accountTitle}
                    </td>
                    <td className="p-3 font-sans text-slate-600">{e.description}</td>
                    <td className="p-3 text-left font-bold text-emerald-700">
                      {e.debit > 0 ? formatCurrency(e.debit, settings.currency) : '—'}
                    </td>
                    <td className="p-3 text-left font-bold text-rose-700">
                      {e.credit > 0 ? formatCurrency(e.credit, settings.currency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Multi-Column Trial Balance (تراز آزمایشی ۲، ۴ و ۶ ستونی) */}
      {activeTab === 'trial' && (
        <MultiColumnTrialBalanceView
          accountingEntries={accountingEntries}
          currency={settings.currency}
          tafsiliAccounts={getUnifiedFloatingTafsiliList(clients)}
        />
      )}

      {/* VIEW 4: Contacts Account Review (مرور حساب اشخاص و طرف‌حساب‌ها در دفتر کل) */}
      {activeTab === 'contacts' && (
        <div className="space-y-4" id="contacts-ledger-review">
          {/* Contacts Sub-Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Quick Status Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 ml-1">فیلتر وضعیت:</span>
              <button
                onClick={() => setContactStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  contactStatusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>همه طرف‌حساب‌ها</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">
                  {toPersianDigits(contactStats.totalCount)}
                </span>
              </button>

              <button
                onClick={() => setContactStatusFilter('debtor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  contactStatusFilter === 'debtor'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>بدهکاران تجاری (طلب شرکت)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                  {toPersianDigits(contactStats.debtorsCount)}
                </span>
              </button>

              <button
                onClick={() => setContactStatusFilter('creditor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  contactStatusFilter === 'creditor'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>بستانکاران تجاری (بدهی شرکت)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                  {toPersianDigits(contactStats.creditorsCount)}
                </span>
              </button>

              <button
                onClick={() => setContactStatusFilter('settled')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  contactStatusFilter === 'settled'
                    ? 'bg-slate-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span>حساب‌های تسویه‌شده</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                  {toPersianDigits(contactStats.settledCount)}
                </span>
              </button>
            </div>

            {/* Additional Type and Sorting controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <select
                  value={contactTypeFilter}
                  onChange={e => setContactTypeFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:bg-white cursor-pointer"
                >
                  <option value="all">تمام ماهیت‌ها (حقیقی و حقوقی)</option>
                  <option value="individual">اشخاص حقیقی</option>
                  <option value="corporate">اشخاص حقوقی و شرکت‌ها</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <select
                  value={contactSortBy}
                  onChange={e => setContactSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:bg-white cursor-pointer"
                >
                  <option value="highest_debt">بیشترین طلب (بدهکارترین)</option>
                  <option value="highest_credit">بیشترین تعهد (بستانکارترین)</option>
                  <option value="highest_turnover">بیشترین گردش مالی</option>
                  <option value="name">مرتب‌سازی الفبایی نام</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  جدول کارنامه و مرور مانده حساب‌های معین و تفصیلی اشخاص
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ارتباط مستقیم دفاتر کل، فاکتورهای فروش و خرید، اسناد دریافتنی/پرداختنی و ریز تراکنش‌ها
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => exportContactsLedgerToCsv(filteredContacts, settings.currency, settings.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="دانلود فایل اکسل (CSV) مرور حساب‌های تفصیلی طرف‌حساب‌ها"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>خروجی اکسل کارنامه</span>
                </button>
                <span className="px-2.5 py-1.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  نمایش {toPersianDigits(paginatedContacts.length)} از {toPersianDigits(filteredContacts.length)} طرف‌حساب
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs" id="contacts-ledger-table">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-3 w-12 text-center">ردیف</th>
                    <th className="p-3 min-w-[200px]">طرف‌حساب و مشخصات تجاری</th>
                    <th className="p-3 w-28 text-center font-mono">کد تفصیلی</th>
                    <th className="p-3 text-left font-mono">گردش بدهکار (بد)</th>
                    <th className="p-3 text-left font-mono">گردش بستانکار (بس)</th>
                    <th className="p-3 text-left font-mono">مانده حساب در دفاتر</th>
                    <th className="p-3 text-center w-24">تشخیص</th>
                    <th className="p-3 min-w-[140px]">سقف اعتبار و ریسک</th>
                    <th className="p-3 text-center w-24">پرونده مالی</th>
                    <th className="p-3 text-center w-24">آخرین گردش</th>
                    <th className="p-3 text-center w-40">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                        هیچ طرف‌حسابی با فیلترهای انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map((item, idx) => {
                      const c = item.client;
                      const globalRowIdx = (effectiveContactPage - 1) * contactPageSize + idx + 1;
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                          onClick={() => setStatementClient(c)}
                        >
                          {/* Row Number */}
                          <td className="p-3 text-center font-mono text-slate-400 text-[11px]">
                            {toPersianDigits(globalRowIdx)}
                          </td>

                          {/* Contact Info */}
                          <td className="p-3">
                            <div className="flex items-start gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                c.type === 'corporate'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              }`}>
                                {c.type === 'corporate' ? (
                                  <Building className="w-4 h-4" />
                                ) : (
                                  <Users className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                  <span>{c.name}</span>
                                  {c.type === 'corporate' && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 font-normal">
                                      حقوقی
                                    </span>
                                  )}
                                </div>
                                {c.companyName && c.companyName !== c.name && (
                                  <p className="text-[11px] text-slate-500 truncate">{c.companyName}</p>
                                )}
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                  {c.phone && (
                                    <span className="flex items-center gap-0.5 font-mono">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {toPersianDigits(c.phone)}
                                    </span>
                                  )}
                                  {c.nationalCode && (
                                    <span className="font-mono">
                                      ش.م: {toPersianDigits(c.nationalCode)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Detail / Account Code */}
                          <td className="p-3 text-center font-mono text-xs font-semibold text-slate-600">
                            {c.id.length > 8 ? `ACC-${c.id.substring(0, 6)}` : c.id}
                          </td>

                          {/* Debit Turnover */}
                          <td className="p-3 text-left font-mono font-medium text-slate-700 bg-slate-50/40">
                            {item.totalDebit > 0 ? formatCurrency(item.totalDebit, settings.currency) : '—'}
                          </td>

                          {/* Credit Turnover */}
                          <td className="p-3 text-left font-mono font-medium text-slate-700 bg-slate-50/40">
                            {item.totalCredit > 0 ? formatCurrency(item.totalCredit, settings.currency) : '—'}
                          </td>

                          {/* Current Balance */}
                          <td className="p-3 text-left font-mono font-bold">
                            <span className={
                              item.currentBalance > 0
                                ? 'text-emerald-700'
                                : item.currentBalance < 0
                                ? 'text-rose-700'
                                : 'text-slate-500'
                            }>
                              {formatCurrency(Math.abs(item.currentBalance), settings.currency)}
                            </span>
                          </td>

                          {/* Balance Diagnosis */}
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              item.diagnosis === 'بدهکار'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : item.diagnosis === 'بستانکار'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {item.diagnosis}
                              <span className="font-mono text-[10px]">[{item.diagnosisShort}]</span>
                            </span>
                          </td>

                          {/* Credit Limit & Risk */}
                          <td className="p-3">
                            {item.creditLimit > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                  <span>سقف: {formatCurrency(item.creditLimit, settings.currency)}</span>
                                  <span className={`font-bold ${item.isCreditExceeded ? 'text-rose-600' : 'text-slate-600'}`}>
                                    {toPersianDigits(item.creditUsagePercent)}٪
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      item.isCreditExceeded
                                        ? 'bg-rose-600'
                                        : item.creditUsagePercent > 80
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${Math.min(100, item.creditUsagePercent)}%` }}
                                  />
                                </div>
                                {item.isCreditExceeded && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                                    <ShieldAlert className="w-2.5 h-2.5" />
                                    تجاوز از سقف
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">نامحدود / تعریف‌نشده</span>
                            )}
                          </td>

                          {/* File records count */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100/70 px-2 py-0.5 rounded-lg font-mono">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span>{toPersianDigits(item.totalRecords)} سند</span>
                            </div>
                          </td>

                          {/* Last Activity */}
                          <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                            {toPersianDigits(item.lastActivityDate)}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setStatementClient(c)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="مشاهده کارت حساب، ریز گردش و چاپ صورتحساب"
                              >
                                <Eye className="w-3 h-3" />
                                <span>کارت حساب</span>
                              </button>
                              {/* Quick SMS / WhatsApp Reminder */}
                              <button
                                type="button"
                                onClick={() => setReminderTarget({ client: c, balance: item.currentBalance })}
                                className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="ارسال یادآور بدهی یا صورتحساب با پیامک/واتساپ"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => viewClientInLedger(c)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="مشاهده رکوردهای این شخص در دفتر کل"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Table Footer Totals */}
                <tfoot className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="p-3 text-center font-sans">
                      جمع کل مطالبات و تعهدات طرف‌حساب‌ها:
                    </td>
                    <td className="p-3 text-left font-mono bg-blue-100/40 text-slate-900">
                      {formatCurrency(contactStats.totalDebitTurnover, settings.currency)}
                    </td>
                    <td className="p-3 text-left font-mono bg-blue-100/40 text-slate-900">
                      {formatCurrency(contactStats.totalCreditTurnover, settings.currency)}
                    </td>
                    <td className="p-3 text-left font-mono bg-emerald-100/40 text-slate-900">
                      {formatCurrency(Math.abs(contactStats.netBalance), settings.currency)}
                    </td>
                    <td className="p-3 text-center font-sans text-[11px]">
                      {contactStats.netBalance > 0 ? (
                        <span className="text-emerald-700">طلبکار کل (بد)</span>
                      ) : contactStats.netBalance < 0 ? (
                        <span className="text-rose-700">بدهکار کل (بس)</span>
                      ) : (
                        <span className="text-slate-600">تسویه کامل</span>
                      )}
                    </td>
                    <td colSpan={4} className="p-3 text-left text-slate-500 font-normal font-sans text-[11px]">
                      مبتنی بر استانداردهای حسابداری دوطرفه و دفاتر تفصیلی هابینو
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredContacts.length > 0 && (
              <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span>تعداد در صفحه:</span>
                  <select
                    value={contactPageSize}
                    onChange={e => {
                      setContactPageSize(Number(e.target.value));
                      setContactCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs cursor-pointer focus:outline-hidden"
                  >
                    <option value={5}>۵</option>
                    <option value={10}>۱۰</option>
                    <option value={20}>۲۰</option>
                    <option value={50}>۵۰</option>
                  </select>
                  <span className="text-slate-400">|</span>
                  <span>
                    صفحه {toPersianDigits(effectiveContactPage)} از {toPersianDigits(contactTotalPages)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setContactCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={effectiveContactPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="صفحه قبلی"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: contactTotalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === contactTotalPages || Math.abs(p - effectiveContactPage) <= 1)
                      .map((p, i, arr) => {
                        const prevPage = arr[i - 1];
                        const showEllipsis = prevPage && p - prevPage > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setContactCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors ${
                                effectiveContactPage === p
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {toPersianDigits(p)}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setContactCurrentPage(prev => Math.min(contactTotalPages, prev + 1))}
                    disabled={effectiveContactPage >= contactTotalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="صفحه بعدی"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Journal Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                ثبت سند دوبل حسابداری (دفتر روزنامه و کل)
              </h3>
              <div className={`text-xs px-3 py-1 rounded-full font-medium ${
                validation.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {validation.message}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">شماره سند مالی</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={e => setDocumentNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">تاریخ ثبت</label>
                  <input
                    type="text"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">طرف‌حساب معین (اختیاری)</label>
                  <select
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  >
                    <option value="">انتخاب طرف‌حساب...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">ردیف‌های آرتیکل سند (بدهکار / بستانکار)</span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-blue-600 hover:underline cursor-pointer font-semibold"
                  >
                    + افزودن آرتیکل
                  </button>
                </div>

                {rows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="col-span-3">
                      <select
                        value={row.accountCode}
                        onChange={e => handleRowChange(idx, 'accountCode', e.target.value)}
                        className="w-full p-1.5 bg-white border rounded text-xs font-mono"
                      >
                        {STANDARD_CHART_OF_ACCOUNTS.map(a => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="شرح آرتیکل..."
                        value={row.description}
                        onChange={e => handleRowChange(idx, 'description', e.target.value)}
                        className="w-full p-1.5 bg-white border rounded text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="مبلغ بدهکار"
                        value={row.debit || ''}
                        onChange={e => handleRowChange(idx, 'debit', Number(e.target.value))}
                        className="w-full p-1.5 bg-white border rounded text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="مبلغ بستانکار"
                        value={row.credit || ''}
                        onChange={e => handleRowChange(idx, 'credit', Number(e.target.value))}
                        className="w-full p-1.5 bg-white border rounded text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-100 rounded-xl font-bold">
                <span>جمع بدهکار: {formatCurrency(validation.totalDebit, settings.currency)}</span>
                <span>جمع بستانکار: {formatCurrency(validation.totalCredit, settings.currency)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={!validation.isValid}
                  className={`px-5 py-2 rounded-xl text-white font-medium cursor-pointer ${
                    validation.isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed'
                  }`}
                >
                  ثبت قطعی در دفتر روزنامه و کل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Financial Statement & Account Card Modal (کارت حساب و ریز گردش تفصیلی مخاطب) */}
      {statementClient && (
        <ClientStatementModal
          client={statementClient}
          onClose={() => setStatementClient(null)}
          invoices={invoices}
          transactions={transactions}
          accountingEntries={accountingEntries}
          checks={checks}
          settings={settings}
        />
      )}

      {/* Quick SMS / WhatsApp Reminder Modal for Contact */}
      {reminderTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">ارسال یادآور بدهی یا اعلام مانده به مخاطب</h4>
                  <p className="text-[11px] text-slate-500">
                    {reminderTarget.client.name} | شماره تماس: {reminderTarget.client.phone || 'ثبت‌نشده'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReminderTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                متن پیش‌فرض جهت ارسال از طریق پیامک یا واتساپ:
              </label>
              <textarea
                readOnly
                rows={5}
                value={buildClientBalanceReminderMessage(
                  reminderTarget.client,
                  reminderTarget.balance,
                  settings.name || 'مجموعه اقتصادی',
                  settings.currency
                )}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-800 resize-none font-sans select-all focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
              <span>
                وضعیت فعلی: <strong className="text-slate-900 font-mono">{formatCurrency(Math.abs(reminderTarget.balance), settings.currency)}</strong> ({reminderTarget.balance > 0 ? 'بدهکار/طلب شرکت' : reminderTarget.balance < 0 ? 'بستانکار/طلب مشتری' : 'تسویه کامل'})
              </span>
              {copiedReminderText && (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> متن کپی شد
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = buildClientBalanceReminderMessage(
                      reminderTarget.client,
                      reminderTarget.balance,
                      settings.name || 'مجموعه اقتصادی',
                      settings.currency
                    );
                    await navigator.clipboard.writeText(text);
                    setCopiedReminderText(true);
                    setTimeout(() => setCopiedReminderText(false), 2500);
                  } catch {}
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>کپی متن پیام</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = buildClientBalanceReminderMessage(
                    reminderTarget.client,
                    reminderTarget.balance,
                    settings.name || 'مجموعه اقتصادی',
                    settings.currency
                  );
                  const rawPhone = (reminderTarget.client.phone || '').replace(/[^0-9+]/g, '');
                  let formattedPhone = rawPhone;
                  if (formattedPhone.startsWith('09')) {
                    formattedPhone = '98' + formattedPhone.substring(1);
                  } else if (formattedPhone.startsWith('+98')) {
                    formattedPhone = formattedPhone.substring(1);
                  }
                  const encoded = encodeURIComponent(text);
                  const url = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
                  window.open(url, '_blank');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>ارسال در واتساپ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
