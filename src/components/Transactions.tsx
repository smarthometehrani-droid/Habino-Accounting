import React, { useState, useMemo } from 'react';
import { useAccounting } from '../lib/store';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  X
} from 'lucide-react';
import { categorizeTransaction } from '../services/geminiService';
import { SearchableClientSelect } from './SearchableClientSelect';

export const Transactions: React.FC = () => {
  const { transactions, clients, settings, addTransaction, deleteTransaction } = useAccounting();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState('درآمد خدمات');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('fa-IR'));
  const [clientId, setClientId] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const clientMatch = (tx.clientName || '').toLowerCase().includes(q);
        const catMatch = (tx.category || '').toLowerCase().includes(q);
        if (!descMatch && !clientMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const netBalance = totalIncome - totalExpense;

    return { totalIncome, totalExpense, netBalance };
  }, [transactions]);

  const handleSmartCategorize = async () => {
    if (!description) return;
    setIsCategorizing(true);
    const suggested = await categorizeTransaction(description, amount, type);
    setCategory(suggested);
    setIsCategorizing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const client = clients.find(c => c.id === clientId);

    await addTransaction({
      description,
      amount: Number(amount) || 0,
      type,
      category,
      date,
      clientId,
      clientName: client?.name || ''
    });

    setShowModal(false);
    setDescription('');
    setAmount(0);
    setClientId('');
  };

  return (
    <div className="space-y-6" id="transactions-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            تراکنش‌های مالی و جریان وجوه نقد
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ثبت دریافت‌ها و پرداخت‌های روزانه، دسته‌بندی هوشمند با سیناپس و گزارش تراز نقدی
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          ثبت تراکنش جدید
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              مجموع کل دریافتی‌ها و درآمدها
            </span>
            <span className="text-[11px] font-mono text-emerald-600 font-semibold">
              {toPersianDigits(transactions.filter(t => t.type === 'income').length)} تراکنش
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-emerald-900 font-mono">
            {formatCurrency(stats.totalIncome, settings.currency)}
          </div>
        </div>

        <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              مجموع کل پرداختی‌ها و هزینه‌ها
            </span>
            <span className="text-[11px] font-mono text-rose-600 font-semibold">
              {toPersianDigits(transactions.filter(t => t.type === 'expense').length)} تراکنش
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-rose-900 font-mono">
            {formatCurrency(stats.totalExpense, settings.currency)}
          </div>
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-blue-600" />
              تراز خالص نقدینگی دفاتر
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">
              دریافت منفی پرداخت
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-blue-900 font-mono">
            {formatCurrency(stats.netBalance, settings.currency)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            همه گردش‌ها ({toPersianDigits(transactions.length)})
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              typeFilter === 'income'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            درآمدها (+)
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              typeFilter === 'expense'
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            هزینه‌ها (-)
          </button>
        </div>

        {/* Global Search Box */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجوی سریع شرح، طرف‌حساب، یا دسته‌بندی..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <th className="p-4">نوع</th>
              <th className="p-4">شرح تراکنش</th>
              <th className="p-4">دسته‌بندی حساب</th>
              <th className="p-4">طرف‌حساب</th>
              <th className="p-4">تاریخ ثبت</th>
              <th className="p-4">مبلغ تراکنش</th>
              <th className="p-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                  هیچ تراکنشی مطابق با عبارت جستجو یافت نشد.
                </td>
              </tr>
            ) : (
              filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4">
                    <div className={`p-1.5 rounded-lg inline-block ${
                      tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-slate-900">{tx.description}</td>
                  <td className="p-4 text-xs">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
                      {tx.category}
                    </span>
                  </td>
                  <td className="p-4 text-slate-700 font-medium text-xs">{tx.clientName || '—'}</td>
                  <td className="p-4 text-slate-400 text-xs font-mono">{tx.date}</td>
                  <td className={`p-4 font-bold font-mono ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, settings.currency)}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف تراکنش"
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

      {/* Modal for New Transaction */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                ثبت تراکنش مالی جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="بستن فرم تراکنش (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>بستن فرم</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategory('درآمد خدمات'); }}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                    type === 'income' ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-xs' : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  دریافت / درآمد (+)
                </button>
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategory('هزینه جاری'); }}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                    type === 'expense' ? 'bg-rose-50 border-rose-600 text-rose-700 shadow-xs' : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  پرداخت / هزینه (-)
                </button>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">شرح تراکنش *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="مثال: واریز پیش‌پرداخت قرارداد / خرید تجهیزات کارگاه"
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleSmartCategorize}
                    disabled={isCategorizing || !description}
                    className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl flex items-center gap-1 font-bold disabled:opacity-50 cursor-pointer"
                    title="تشخیص هوشمند دسته‌بندی با هوش مصنوعی سیناپس"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isCategorizing ? '...' : 'سیناپس'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">مبلغ ({settings.currency}) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">دسته‌بندی حساب</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
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
                  label="طرف‌حساب مرتبط (اختیاری)"
                  placeholder="جستجو و انتخاب طرف‌حساب..."
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">تاریخ تراکنش</label>
                <input
                  type="text"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  ثبت در دفاتر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
