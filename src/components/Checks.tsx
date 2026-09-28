import React, { useState, useMemo, useEffect } from 'react';
import { useAccounting } from '../lib/store';
import { Check, CheckType, CheckStatus } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import {
  CreditCard,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  ScanLine,
  X
} from 'lucide-react';
import { SearchableClientSelect } from './SearchableClientSelect';
import { SayadCheckScannerModal } from './SayadCheckScannerModal';
import { SayadCheckQrData } from '../lib/sayadBarcodeParser';
import { validateInvoiceClientId } from './Invoices';

interface ChecksProps {
  initialSayadData?: SayadCheckQrData | null;
}

export const Checks: React.FC<ChecksProps> = ({ initialSayadData }) => {
  const { checks, addCheck, updateCheck, deleteCheck, clients, settings, activeTenant } = useAccounting();
  const [showModal, setShowModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'receivable' | 'payable'>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'pending' | 'cleared' | 'bounced'>('all');

  // Form State
  const [type, setType] = useState<CheckType>('receivable');
  const [checkNumber, setCheckNumber] = useState('');
  const [sayadNumber, setSayadNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSayadDetected = (data: SayadCheckQrData) => {
    setSayadNumber(data.formattedSayadId);
    if (data.bankName) setBankName(data.bankName);
    if (data.amount) setAmount(data.amount);
    if (data.dueDate) setDueDate(data.dueDate);
    if (data.serial) setCheckNumber(data.serial);
    setShowModal(true);
  };

  useEffect(() => {
    if (initialSayadData) {
      handleSayadDetected(initialSayadData);
    } else {
      const stored = localStorage.getItem('habino_pending_sayad_qr');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localStorage.removeItem('habino_pending_sayad_qr');
          handleSayadDetected(parsed);
        } catch {
          localStorage.removeItem('habino_pending_sayad_qr');
        }
      }
    }
  }, [initialSayadData]);

  // Filtered checks list
  const filteredChecks = useMemo(() => {
    return checks.filter(chk => {
      // Type filter
      if (activeTypeFilter !== 'all' && chk.type !== activeTypeFilter) return false;
      // Status filter
      if (activeStatusFilter !== 'all' && chk.status !== activeStatusFilter) return false;

      // Search query across client name, check number, sayad ID, bank name, notes
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const clientMatch = (chk.clientName || '').toLowerCase().includes(q);
        const checkNumMatch = (chk.checkNumber || '').toLowerCase().includes(q);
        const sayadMatch = (chk.sayadNumber || '').toLowerCase().includes(q);
        const bankMatch = (chk.bankName || '').toLowerCase().includes(q);
        const notesMatch = (chk.notes || '').toLowerCase().includes(q);

        if (!clientMatch && !checkNumMatch && !sayadMatch && !bankMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [checks, activeTypeFilter, activeStatusFilter, searchQuery]);

  // Financial KPI sums
  const stats = useMemo(() => {
    const receivablePending = checks
      .filter(c => c.type === 'receivable' && c.status === 'pending')
      .reduce((s, c) => s + c.amount, 0);

    const payablePending = checks
      .filter(c => c.type === 'payable' && c.status === 'pending')
      .reduce((s, c) => s + c.amount, 0);

    const bouncedTotal = checks
      .filter(c => c.status === 'bounced')
      .reduce((s, c) => s + c.amount, 0);

    return { receivablePending, payablePending, bouncedTotal };
  }, [checks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clientValidation = validateInvoiceClientId(clientId, clients, {
      tenantId: activeTenant?.id
    });
    if (!clientValidation.isValid) {
      alert(clientValidation.errorFa || 'ثبت سند بدون مخاطب مجاز نیست.');
      return;
    }

    const client = clientValidation.client || clients.find(c => c.id === clientId);

    addCheck({
      checkNumber,
      sayadNumber,
      bankName,
      amount,
      issueDate: new Date().toLocaleDateString('fa-IR'),
      dueDate,
      type,
      status: 'pending',
      clientId: clientValidation.clientId || clientId,
      clientName: client?.name || 'مشتری نامشخص',
      notes,
      description: notes
    });

    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setCheckNumber('');
    setSayadNumber('');
    setBankName('');
    setAmount(0);
    setDueDate('');
    setClientId('');
    setNotes('');
  };

  const handleStatusChange = (id: string, newStatus: CheckStatus) => {
    updateCheck(id, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            مدیریت چک‌های صیادی و اسناد تجاری
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ردیابی سررسید، استعلام سامانه صیاد و تسویه خودکار حساب اشخاص
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            <ScanLine className="w-4 h-4 text-slate-950" />
            <span>اسکن بارکد چک صیاد</span>
            <span className="text-[10px] bg-slate-950/15 px-1.5 py-0.5 rounded-full font-mono">P1</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            ثبت چک جدید
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              چک‌های دریافتی در جریان وصول
            </span>
            <span className="text-[11px] font-mono text-emerald-600 font-semibold">
              {toPersianDigits(checks.filter(c => c.type === 'receivable' && c.status === 'pending').length)} فقره
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-emerald-900">
            {formatCurrency(stats.receivablePending, settings.currency)}
          </div>
        </div>

        <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
              چک‌های پرداختی متعهد در سررسید
            </span>
            <span className="text-[11px] font-mono text-rose-600 font-semibold">
              {toPersianDigits(checks.filter(c => c.type === 'payable' && c.status === 'pending').length)} فقره
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-rose-900">
            {formatCurrency(stats.payablePending, settings.currency)}
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              چک‌های برگشتی و حقوقی
            </span>
            <span className="text-[11px] font-mono text-amber-600 font-semibold">
              {toPersianDigits(checks.filter(c => c.status === 'bounced').length)} فقره
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-amber-900">
            {formatCurrency(stats.bouncedTotal, settings.currency)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              activeTypeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            همه نوع
          </button>
          <button
            onClick={() => setActiveTypeFilter('receivable')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              activeTypeFilter === 'receivable'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            دریافتی
          </button>
          <button
            onClick={() => setActiveTypeFilter('payable')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              activeTypeFilter === 'payable'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            پرداختی
          </button>

          <span className="w-px h-4 bg-slate-200 mx-1" />

          <button
            onClick={() => setActiveStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
              activeStatusFilter === 'all'
                ? 'bg-slate-200 text-slate-800 font-bold'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            همه وضعیت‌ها
          </button>
          <button
            onClick={() => setActiveStatusFilter('pending')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
              activeStatusFilter === 'pending'
                ? 'bg-amber-100 text-amber-800 font-bold'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            در جریان وصول
          </button>
          <button
            onClick={() => setActiveStatusFilter('cleared')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
              activeStatusFilter === 'cleared'
                ? 'bg-emerald-100 text-emerald-800 font-bold'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            وصول شده
          </button>
          <button
            onClick={() => setActiveStatusFilter('bounced')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
              activeStatusFilter === 'bounced'
                ? 'bg-rose-100 text-rose-800 font-bold'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            برگشت خورده
          </button>
        </div>

        {/* Global Search Box */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجوی سریع طرف‌حساب، شناسه صیاد، شماره چک یا بانک..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* Checks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <th className="p-4">نوع</th>
              <th className="p-4">شماره صیاد / سریال چک</th>
              <th className="p-4">بانک عامل</th>
              <th className="p-4">طرف‌حساب</th>
              <th className="p-4">تاریخ سررسید</th>
              <th className="p-4">مبلغ چک</th>
              <th className="p-4">وضعیت صیادی</th>
              <th className="p-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredChecks.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                  موردی مطابق با فیلترها و عبارت جستجوی مورد نظر یافت نشد.
                </td>
              </tr>
            ) : (
              filteredChecks.map(chk => (
                <tr key={chk.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      chk.type === 'receivable' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {chk.type === 'receivable' ? 'دریافتی' : 'پرداختی'}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-mono font-bold text-slate-900">#{chk.checkNumber}</p>
                    {chk.sayadNumber && (
                      <p className="font-mono text-[11px] text-slate-400 mt-0.5 tracking-wider">
                        صیاد: {chk.sayadNumber}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-slate-700 font-medium">{chk.bankName}</td>
                  <td className="p-4 font-bold text-slate-900">{chk.clientName}</td>
                  <td className="p-4 text-xs font-mono font-semibold text-slate-700">{chk.dueDate}</td>
                  <td className="p-4 font-bold text-slate-900">{formatCurrency(chk.amount, settings.currency)}</td>
                  <td className="p-4">
                    <select
                      value={chk.status}
                      onChange={e => handleStatusChange(chk.id, e.target.value as CheckStatus)}
                      className={`text-xs font-semibold rounded-xl px-2.5 py-1.5 border transition-colors cursor-pointer ${
                        chk.status === 'cleared' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                        chk.status === 'bounced' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                        'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="pending">در جریان وصول</option>
                      <option value="cleared">وصول و تسویه شده</option>
                      <option value="bounced">برگشت خورده (عدم پاس)</option>
                      <option value="cancelled">باطل / عودت داده شده</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => deleteCheck(chk.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف چک"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Check Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-600" />
                ثبت چک صیادی جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="بستن فرم چک (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>بستن فرم</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">نوع سند چک *</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as CheckType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="receivable">دریافتی از مشتری</option>
                    <option value="payable">پرداختی به تامین‌کننده</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">بانک عامل صادرکننده *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بانک ملت، ملی، پاسارگاد"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Searchable Client Select */}
              <div>
                <SearchableClientSelect
                  clients={clients}
                  value={clientId}
                  onChange={setClientId}
                  label={type === 'receivable' ? 'صاحب چک / پرداخت‌کننده (طرف‌حساب)' : 'دریافت‌کننده چک (طرف‌حساب)'}
                  placeholder="جستجو و انتخاب طرف‌حساب چک..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">شماره سریال چک *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ۹۸۷۶۵۴"
                    value={checkNumber}
                    onChange={e => setCheckNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-600 block">شناسه ۱۶ رقمی صیاد</label>
                    <button
                      type="button"
                      onClick={() => setShowScannerModal(true)}
                      className="text-[11px] text-amber-600 hover:text-amber-700 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>اسکن با دوربین</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="شناسه یکتای صیادی"
                    value={sayadNumber}
                    onChange={e => setSayadNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono tracking-wider"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">مبلغ چک ({settings.currency}) *</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="مبلغ به عدد"
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">تاریخ سررسید چک *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ۱۴۰۳/۰۸/۱۵"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">شرح و بابت (یادداشت)</label>
                <input
                  type="text"
                  placeholder="مثال: بابت پیش‌پرداخت قرارداد طراحی معماری"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  ثبت قطعی چک
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sayad Check QR Camera Scanner Modal */}
      <SayadCheckScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onSayadDetected={handleSayadDetected}
      />
    </div>
  );
};
