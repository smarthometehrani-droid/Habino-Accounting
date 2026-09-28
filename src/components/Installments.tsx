import React, { useState } from 'react';
import { useAccounting } from '../lib/store';
import { Installment } from '../types';
import { formatCurrency } from '../lib/currencyUtils';
import { Plus, Trash2, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { validateInvoiceClientId } from './Invoices';

export const Installments: React.FC = () => {
  const { installments, invoices, clients, settings, addInstallment, updateInstallment, deleteInstallment } = useAccounting();
  const [showModal, setShowModal] = useState(false);

  const [invoiceId, setInvoiceId] = useState('');
  const [installmentNumber, setInstallmentNumber] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(3);
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [clientId, setClientId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientValidation = validateInvoiceClientId(clientId, clients);
    if (!clientValidation.isValid) {
      alert(clientValidation.errorFa || 'ثبت قسط بدون انتخاب مخاطب مجاز نیست.');
      return;
    }
    const client = clientValidation.client || clients.find(c => c.id === clientId);

    await addInstallment({
      invoiceId: invoiceId || `inv-manual-${Date.now()}`,
      installmentNumber: Number(installmentNumber),
      totalInstallments: Number(totalInstallments),
      amount: Number(amount),
      dueDate,
      status: 'pending',
      clientId: clientValidation.clientId || clientId,
      clientName: client?.name || ''
    });

    setShowModal(false);
    setAmount(0);
    setDueDate('');
  };

  const handleMarkPaid = async (id: string) => {
    await updateInstallment(id, {
      status: 'paid',
      paidDate: new Date().toLocaleDateString('fa-IR')
    });
  };

  return (
    <div className="space-y-6" id="installments-module">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">مدیریت اقساط و تعهدات تقسیط‌شده</h2>
          <p className="text-sm text-slate-500">زمان‌بندی وصول اقساط فاکتورها و اتصال مستقیم به چک‌ها و اسناد</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-xs"
        >
          <Plus className="w-4 h-4" />
          ثبت قسط جدید
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <th className="p-4">نوبت قسط</th>
              <th className="p-4">طرف‌حساب</th>
              <th className="p-4">سررسید</th>
              <th className="p-4">مبلغ قسط</th>
              <th className="p-4">وضعیت</th>
              <th className="p-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {installments.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  هیچ قسطی در سامانه ثبت نشده است.
                </td>
              </tr>
            ) : (
              installments.map(inst => (
                <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4 font-mono font-medium text-slate-700">
                    قسط {inst.installmentNumber} از {inst.totalInstallments}
                  </td>
                  <td className="p-4 font-bold text-slate-800">{inst.clientName}</td>
                  <td className="p-4 text-xs font-mono text-slate-600">{inst.dueDate}</td>
                  <td className="p-4 font-bold text-slate-900">{formatCurrency(inst.amount, settings.currency)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      inst.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {inst.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3 text-amber-500" />}
                      {inst.status === 'paid' ? `پرداخت شده (${inst.paidDate || ''})` : 'در انتظار سررسید'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {inst.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(inst.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium"
                        >
                          ثبت پرداخت
                        </button>
                      )}
                      <button
                        onClick={() => deleteInstallment(inst.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-3">ثبت قسط جدید</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">طرف‌حساب *</label>
                <select
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                >
                  <option value="">انتخاب مشتری...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">شماره قسط</label>
                  <input
                    type="number"
                    min="1"
                    value={installmentNumber}
                    onChange={e => setInstallmentNumber(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl text-center font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">تعداد کل اقساط</label>
                  <input
                    type="number"
                    min="1"
                    value={totalInstallments}
                    onChange={e => setTotalInstallments(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl text-center font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">مبلغ قسط *</label>
                  <input
                    type="number"
                    required
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value))}
                    placeholder="۰"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">تاریخ سررسید *</label>
                  <input
                    type="text"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    placeholder="۱۴۰۳/۰۸/۰۱"
                    className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
                >
                  ثبت قسط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
