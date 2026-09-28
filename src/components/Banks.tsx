import React, { useState } from 'react';
import { useAccounting } from '../lib/store';
import { BankAccount } from '../types';
import { formatCurrency } from '../lib/currencyUtils';
import { Plus, Trash2, Landmark, CreditCard } from 'lucide-react';

export const Banks: React.FC = () => {
  const { bankAccounts, settings, addBankAccount, deleteBankAccount } = useAccounting();
  const [showModal, setShowModal] = useState(false);

  const [bankName, setBankName] = useState('بانک سامان');
  const [accountNumber, setAccountNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [holderName, setHolderName] = useState('فرید تهرانی');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) return;

    await addBankAccount({
      bankName,
      accountNumber,
      cardNumber,
      balance: Number(balance) || 0,
      holderName
    });

    setShowModal(false);
    setAccountNumber('');
    setCardNumber('');
    setBalance(0);
  };

  return (
    <div className="space-y-6" id="banks-module">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">حساب‌های بانکی و صندوق</h2>
          <p className="text-sm text-slate-500">مدیریت کارت‌ها، شماره شبا و موجودی نقد حساب‌های بانکی</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-xs"
        >
          <Plus className="w-4 h-4" />
          افزودن حساب بانکی
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map(b => (
          <div key={b.id} className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg relative space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Landmark className="w-6 h-6 text-blue-400" />
                <span className="font-bold text-base">{b.bankName}</span>
              </div>
              <button
                onClick={() => deleteBankAccount(b.id)}
                className="text-slate-400 hover:text-rose-400 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2">
              <p className="text-xs text-slate-400">شماره کارت / حساب</p>
              <p className="font-mono text-lg tracking-widest font-bold text-slate-100">
                {b.cardNumber || b.accountNumber}
              </p>
            </div>

            <div className="flex justify-between items-end pt-2 border-t border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block">صاحب حساب:</span>
                <span className="font-medium text-slate-200">{b.holderName}</span>
              </div>
              <div className="text-left">
                <span className="text-slate-400 block">موجودی:</span>
                <span className="font-bold text-sm text-emerald-400">{formatCurrency(b.balance, settings.currency)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-3">افزودن حساب بانکی جدید</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">نام بانک *</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">شماره حساب *</label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">شماره کارت (۱۶ رقم)</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="6037-...."
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">صاحب حساب</label>
                <input
                  type="text"
                  value={holderName}
                  onChange={e => setHolderName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">موجودی اولیه</label>
                <input
                  type="number"
                  value={balance || ''}
                  onChange={e => setBalance(Number(e.target.value))}
                  placeholder="۰"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                />
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
                >
                  افزودن حساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
