import React, { useState, useMemo } from 'react';
import {
  FloatingTafsiliAccount,
  TafsiliType,
  Client,
  AccountingEntry,
  CurrencyType
} from '../types';
import {
  getUnifiedFloatingTafsiliList,
  saveFloatingTafsili,
  generateNextTafsiliCode,
  calculateFloatingTafsiliStatement,
  TAFSILI_TYPE_LABELS,
  FloatingTafsiliStatement
} from '../lib/floatingTafsiliEngine';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Building,
  Briefcase,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Wallet,
  Phone,
  Tag
} from 'lucide-react';

interface Props {
  clients: Client[];
  accountingEntries: AccountingEntry[];
  currency: CurrencyType;
  onNavigateToEntry?: (docNum: string) => void;
}

export const FloatingTafsiliView: React.FC<Props> = ({
  clients,
  accountingEntries,
  currency,
  onNavigateToEntry
}) => {
  const [tafsiliList, setTafsiliList] = useState<FloatingTafsiliAccount[]>(() =>
    getUnifiedFloatingTafsiliList(clients)
  );

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debtor' | 'creditor' | 'settled'>('all');

  // New Tafsili Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState<string>(() => generateNextTafsiliCode('partner'));
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<TafsiliType>('partner');
  const [newPhone, setNewPhone] = useState('');
  const [newNationalCode, setNewNationalCode] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [modalFeedback, setModalFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  // Statement / Cardex Modal for a selected Tafsili
  const [selectedStatement, setSelectedStatement] = useState<FloatingTafsiliStatement | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Re-sync with clients when clients list changes
  React.useEffect(() => {
    setTafsiliList(getUnifiedFloatingTafsiliList(clients));
  }, [clients]);

  // Compute calculated balance for each tafsili
  const tafsiliWithBalances = useMemo(() => {
    return tafsiliList.map(t => {
      const stmt = calculateFloatingTafsiliStatement(t, accountingEntries);
      return {
        ...t,
        statement: stmt
      };
    });
  }, [tafsiliList, accountingEntries]);

  // Filter and Sort
  const filteredTafsili = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tafsiliWithBalances.filter(item => {
      if (selectedTypeFilter !== 'all' && item.type !== selectedTypeFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'debtor' && item.statement.status !== 'debtor') return false;
        if (statusFilter === 'creditor' && item.statement.status !== 'creditor') return false;
        if (statusFilter === 'settled' && item.statement.status !== 'settled') return false;
      }

      if (!q) return true;

      return (
        item.code.includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.phone && item.phone.includes(q)) ||
        (item.nationalCode && item.nationalCode.includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q))
      );
    });
  }, [tafsiliWithBalances, searchQuery, selectedTypeFilter, statusFilter]);

  const handleOpenAddModal = (type: TafsiliType = 'partner') => {
    setNewType(type);
    setNewCode(generateNextTafsiliCode(type));
    setNewTitle('');
    setNewPhone('');
    setNewNationalCode('');
    setNewNotes('');
    setModalFeedback(null);
    setShowAddModal(true);
  };

  const handleTypeChangeInModal = (type: TafsiliType) => {
    setNewType(type);
    setNewCode(generateNextTafsiliCode(type));
  };

  const handleSaveTafsili = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim()) {
      setModalFeedback({ msg: 'کد و عنوان حساب تفصیلی الزامی است.', isError: true });
      return;
    }

    const res = saveFloatingTafsili({
      code: newCode.trim(),
      title: newTitle.trim(),
      type: newType,
      phone: newPhone.trim() || undefined,
      nationalCode: newNationalCode.trim() || undefined,
      notes: newNotes.trim() || undefined,
      isActive: true
    });

    if (res.success) {
      setTafsiliList(getUnifiedFloatingTafsiliList(clients));
      setShowAddModal(false);
    } else {
      setModalFeedback({ msg: res.message, isError: true });
    }
  };

  const handleOpenStatement = (account: FloatingTafsiliAccount) => {
    const stmt = calculateFloatingTafsiliStatement(account, accountingEntries);
    setSelectedStatement(stmt);
    setCopiedText(false);
  };

  const handleCopyReminder = () => {
    if (!selectedStatement) return;
    const { tafsili, netBalance } = selectedStatement;
    const absBal = Math.abs(netBalance);
    const balFormatted = formatCurrency(absBal, currency);

    let text = '';
    if (netBalance > 0) {
      text = `همکار/مشتری گرامی ${tafsili.title}، با سلام. طبق دفاتر مالی هابینو مانده بدهی شما مبلغ ${balFormatted} می‌باشد. خواهشمند است نسبت به تسویه حساب اقدام فرمایید.`;
    } else if (netBalance < 0) {
      text = `همکار/شریک گرامی ${tafsili.title}، با سلام. طبق دفاتر مالی هابینو مانده بستانکاری شما در سیستم مبلغ ${balFormatted} می‌باشد.`;
    } else {
      text = `همکار گرامی ${tafsili.title}، با سلام. وضعیت حساب شما در سیستم هابینو کاملاً تسویه شده و صفر می‌باشد.`;
    }

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Summary counters
  const totalDebtors = tafsiliWithBalances.filter(t => t.statement.status === 'debtor');
  const totalCreditors = tafsiliWithBalances.filter(t => t.statement.status === 'creditor');
  const sumDebts = totalDebtors.reduce((acc, t) => acc + t.statement.netBalance, 0);
  const sumCredits = totalCreditors.reduce((acc, t) => acc + Math.abs(t.statement.netBalance), 0);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              ماژول تفصیلی شناور اشخاص، شرکا و مراکز هزینه
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                سطح ۴ حسابداری
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              یکپارچه‌سازی گردش چندمعینی (دریافتنی، پرداختنی، جاری شرکا) با حفظ شناسنامه واحد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenAddModal('partner')}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            id="btn-add-partner-tafsili"
          >
            <Plus className="w-4 h-4" />
            تعریف شریک / مرکز هزینه
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            چاپ فهرست
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">کل تفصیلی‌های شناور</p>
            <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
              {toPersianDigits(tafsiliWithBalances.length)} مورد
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Tag className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">مجموع مطالبات (بدهکاران)</p>
            <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
              {formatCurrency(sumDebts, currency)}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            {toPersianDigits(totalDebtors.length)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">مجموع بدهی‌ها (بستانکاران)</p>
            <p className="text-sm font-bold text-rose-700 font-mono mt-0.5">
              {formatCurrency(sumCredits, currency)}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            {toPersianDigits(totalCreditors.length)}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">شرکا و مراکز هزینه</p>
            <p className="text-lg font-bold text-purple-700 font-mono mt-0.5">
              {toPersianDigits(
                tafsiliWithBalances.filter(t => t.type === 'partner' || t.type === 'cost_center').length
              )}{' '}
              حساب
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="جستجو در کد، نام شخص، تلفن یا کد ملی..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>

          <select
            value={selectedTypeFilter}
            onChange={e => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:bg-white cursor-pointer"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            <option value="partner">شرکا و سهامداران</option>
            <option value="client">مشتریان و کارفرمایان</option>
            <option value="supplier">تأمین‌کنندگان</option>
            <option value="personnel">پرسنل و کارمندان</option>
            <option value="cost_center">مراکز هزینه و پروژه‌ها</option>
            <option value="bank_fund">صندوق‌ها و تنخواه‌ها</option>
            <option value="other">متفرقه</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:bg-white cursor-pointer"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="debtor">فقط بدهکاران</option>
            <option value="creditor">فقط بستانکاران</option>
            <option value="settled">تسویه‌شده (مانده صفر)</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          نمایش {toPersianDigits(filteredTafsili.length)} از {toPersianDigits(tafsiliList.length)}
        </span>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3 w-20">کد تفصیلی</th>
                <th className="p-3">عنوان و مشخصات تفصیلی</th>
                <th className="p-3 w-36">نوع حساب</th>
                <th className="p-3 text-left w-36">گردش بدهکار</th>
                <th className="p-3 text-left w-36">گردش بستانکار</th>
                <th className="p-3 text-left w-40">مانده خالص در دفاتر</th>
                <th className="p-3 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTafsili.map(item => {
                const { statement } = item;
                const typeInfo = TAFSILI_TYPE_LABELS[item.type] || TAFSILI_TYPE_LABELS.other;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-purple-700">{item.code}</td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {item.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.phone}
                          </span>
                        )}
                        {item.nationalCode && <span>کد ملی: {item.nationalCode}</span>}
                        {item.notes && <span className="truncate max-w-xs">• {item.notes}</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeInfo.badgeColor}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-slate-700">
                      {statement.totalDebit > 0 ? formatCurrency(statement.totalDebit, currency) : '—'}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-slate-700">
                      {statement.totalCredit > 0 ? formatCurrency(statement.totalCredit, currency) : '—'}
                    </td>
                    <td className="p-3 text-left font-mono font-bold">
                      {statement.status === 'debtor' && (
                        <span className="text-emerald-700 flex items-center justify-end gap-1">
                          {formatCurrency(statement.netBalance, currency)}
                          <span className="text-[10px] font-sans font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            بدهکار
                          </span>
                        </span>
                      )}
                      {statement.status === 'creditor' && (
                        <span className="text-rose-700 flex items-center justify-end gap-1">
                          {formatCurrency(Math.abs(statement.netBalance), currency)}
                          <span className="text-[10px] font-sans font-normal text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            بستانکار
                          </span>
                        </span>
                      )}
                      {statement.status === 'settled' && (
                        <span className="text-slate-400 font-sans font-normal text-[11px]">تسویه (صفر)</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenStatement(item)}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        title="مشاهده کاردکس و گردش در تمام معین‌ها"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        کاردکس
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTafsili.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    موردی با فیلترهای جاری یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statement / Cardex Modal */}
      {selectedStatement && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    کاردکس و صورت‌حساب تفصیلی شناور: {selectedStatement.tafsili.title}
                    <span className="font-mono text-purple-700 px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded text-[11px]">
                      کد {selectedStatement.tafsili.code}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ماتریس گردش در سرفصل‌های معین و ریز آرتیکل‌های اسناد مالی
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReminder}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="کپی پیام اعلام وضعیت حساب"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedText ? 'کپی شد!' : 'کپی متن یادآوری'}
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  چاپ کاردکس
                </button>

                <button
                  onClick={() => setSelectedStatement(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Financial Balance Summary Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-medium">مانده خالص تجمیعی در کل دفاتر:</span>
                  <div className="text-xl font-bold font-mono mt-1 flex items-center gap-2">
                    {formatCurrency(Math.abs(selectedStatement.netBalance), currency)}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-sans font-bold ${
                        selectedStatement.status === 'debtor'
                          ? 'bg-emerald-500 text-white'
                          : selectedStatement.status === 'creditor'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-600 text-slate-200'
                      }`}
                    >
                      {selectedStatement.status === 'debtor'
                        ? 'بدهکار (طلبکارید)'
                        : selectedStatement.status === 'creditor'
                        ? 'بستانکار (بدهکارید)'
                        : 'تسویه کامل'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-300 font-mono">
                  <div>
                    <p className="text-slate-400 text-[10px]">مجموع گردش بدهکار:</p>
                    <p className="font-bold text-white text-sm">{formatCurrency(selectedStatement.totalDebit, currency)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px]">مجموع گردش بستانکار:</p>
                    <p className="font-bold text-white text-sm">{formatCurrency(selectedStatement.totalCredit, currency)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px]">تعداد کل آرتیکل‌ها:</p>
                    <p className="font-bold text-white text-sm">{toPersianDigits(selectedStatement.entries.length)} سند</p>
                  </div>
                </div>
              </div>

              {/* Sub-Section 1: Multi-Moein Breakdown Table (گردش در سرفصل‌های معین) */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  ماتریس گردش در حساب‌های معین مرتبط (Moein Matrix)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2">کد معین</th>
                        <th className="py-2">عنوان سرفصل معین</th>
                        <th className="py-2 text-left">گردش بدهکار</th>
                        <th className="py-2 text-left">گردش بستانکار</th>
                        <th className="py-2 text-left">مانده در این سرفصل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 font-mono">
                      {selectedStatement.moeinBreakdown.map(m => (
                        <tr key={m.moeinCode} className="hover:bg-slate-100/60">
                          <td className="py-2 text-blue-700 font-bold">{m.moeinCode}</td>
                          <td className="py-2 font-sans text-slate-800 font-medium">{m.moeinTitle}</td>
                          <td className="py-2 text-left text-slate-700">{formatCurrency(m.debit, currency)}</td>
                          <td className="py-2 text-left text-slate-700">{formatCurrency(m.credit, currency)}</td>
                          <td className="py-2 text-left font-bold">
                            {m.balance >= 0 ? (
                              <span className="text-emerald-700 font-sans text-[11px]">
                                {formatCurrency(m.balance, currency)} (بد)
                              </span>
                            ) : (
                              <span className="text-rose-700 font-sans text-[11px]">
                                {formatCurrency(Math.abs(m.balance), currency)} (بس)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {selectedStatement.moeinBreakdown.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-slate-400 font-sans">
                            هنوز سندی برای این حساب ثبت نشده است.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-Section 2: Detailed Entries with Running Balance (ریز آرتیکل‌ها با مانده در گردش) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  ریز تراکنش‌ها و اسناد مالی ثبت‌شده (Running Balance)
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="p-2.5 w-24">تاریخ</th>
                        <th className="p-2.5 w-28">شماره سند</th>
                        <th className="p-2.5 w-32">حساب معین</th>
                        <th className="p-2.5">شرح سند</th>
                        <th className="p-2.5 text-left w-28">بدهکار</th>
                        <th className="p-2.5 text-left w-28">بستانکار</th>
                        <th className="p-2.5 text-left w-32 bg-purple-50/40">مانده در گردش</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedStatement.entries.map((entry, idx) => (
                        <tr key={entry.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 text-slate-600">{entry.date}</td>
                          <td className="p-2.5 font-bold text-slate-800">
                            {onNavigateToEntry ? (
                              <button
                                onClick={() => onNavigateToEntry(entry.documentNumber)}
                                className="text-blue-600 hover:underline cursor-pointer"
                              >
                                {entry.documentNumber}
                              </button>
                            ) : (
                              entry.documentNumber
                            )}
                          </td>
                          <td className="p-2.5 font-sans text-slate-700 text-[11px] truncate max-w-xs">
                            {entry.accountTitle}
                          </td>
                          <td className="p-2.5 font-sans text-slate-800 text-[11px]">{entry.description}</td>
                          <td className="p-2.5 text-left font-bold text-slate-700">
                            {entry.debit > 0 ? formatCurrency(entry.debit, currency) : '—'}
                          </td>
                          <td className="p-2.5 text-left font-bold text-slate-700">
                            {entry.credit > 0 ? formatCurrency(entry.credit, currency) : '—'}
                          </td>
                          <td className="p-2.5 text-left font-bold bg-purple-50/30">
                            {entry.runningBalance >= 0 ? (
                              <span className="text-emerald-700 font-sans text-[11px]">
                                {formatCurrency(entry.runningBalance, currency)} (بد)
                              </span>
                            ) : (
                              <span className="text-rose-700 font-sans text-[11px]">
                                {formatCurrency(Math.abs(entry.runningBalance), currency)} (بس)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {selectedStatement.entries.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                            سندی در سیستم یافت نشد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Floating Tafsili Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-800">تعریف حساب تفصیلی شناور جدید (سطح ۴)</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTafsili} className="p-4 space-y-3.5">
              {modalFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                    modalFeedback.isError
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {modalFeedback.msg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نوع ماهیت تفصیلی:</label>
                <select
                  value={newType}
                  onChange={e => handleTypeChangeInModal(e.target.value as TafsiliType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white cursor-pointer"
                >
                  <option value="partner">شریک و سهامدار</option>
                  <option value="cost_center">مرکز هزینه / پروژه</option>
                  <option value="bank_fund">صندوق و تنخواه واسط</option>
                  <option value="personnel">پرسنل و کارمند</option>
                  <option value="client">مشتری و خریدار</option>
                  <option value="supplier">تأمین‌کننده و فروشنده</option>
                  <option value="other">متفرقه و سایر</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">کد تفصیلی یکتا:</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-purple-700 focus:bg-white"
                    placeholder="مثال: 4005"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">شماره تماس (اختیاری):</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white"
                    placeholder="0912..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نام و عنوان تفصیلی (شریک/مرکز/تنخواه):
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                  placeholder="مثال: مهندس رضوانی (شریک پروژه) یا مرکز هزینه انبار غرب"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">کد ملی / شناسه اقتصادی:</label>
                <input
                  type="text"
                  value={newNationalCode}
                  onChange={e => setNewNationalCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white"
                  placeholder="۱۰ رقمی"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">توضیحات و یادداشت:</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                  placeholder="درصد مشارکت، محدوده مسئولیت یا شرایط تسویه..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  ایجاد حساب تفصیلی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
