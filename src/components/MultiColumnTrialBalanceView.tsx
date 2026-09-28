import React, { useState, useMemo } from 'react';
import {
  AccountingEntry,
  CurrencyType,
  TrialBalanceColumnMode,
  TrialBalanceLevel
} from '../types';
import { computeMultiColumnTrialBalance } from '../lib/trialBalanceEngine';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import {
  Scale,
  Calendar,
  Layers,
  Filter,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  HelpCircle
} from 'lucide-react';

interface Props {
  accountingEntries: AccountingEntry[];
  currency: CurrencyType;
  tafsiliAccounts?: { code: string; title: string; entityId?: string }[];
}

export const MultiColumnTrialBalanceView: React.FC<Props> = ({
  accountingEntries,
  currency,
  tafsiliAccounts = []
}) => {
  const [columnMode, setColumnMode] = useState<TrialBalanceColumnMode>('4_col');
  const [level, setLevel] = useState<TrialBalanceLevel>('moein');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const trialResult = useMemo(() => {
    return computeMultiColumnTrialBalance({
      entries: accountingEntries,
      mode: columnMode,
      level,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      tafsiliAccounts
    });
  }, [accountingEntries, columnMode, level, startDate, endDate, tafsiliAccounts]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return trialResult.rows;
    const q = searchQuery.trim().toLowerCase();
    return trialResult.rows.filter(
      r => r.code.includes(q) || r.title.toLowerCase().includes(q)
    );
  }, [trialResult.rows, searchQuery]);

  const handleExportCSV = () => {
    let headers: string[] = ['کد حساب', 'عنوان سرفصل'];
    if (columnMode === '6_col') {
      headers.push(
        'ابتدای دوره بدهکار',
        'ابتدای دوره بستانکار',
        'طی دوره بدهکار',
        'طی دوره بستانکار',
        'پایان دوره بدهکار',
        'پایان دوره بستانکار'
      );
    } else if (columnMode === '4_col') {
      headers.push('گردش بدهکار', 'گردش بستانکار', 'مانده بدهکار', 'مانده بستانکار');
    } else {
      headers.push('مانده بدهکار', 'مانده بستانکار');
    }

    const csvRows = [headers.join(',')];

    filteredRows.forEach(r => {
      let rowData: (string | number)[] = [r.code, `"${r.title.replace(/"/g, '""')}"`];
      if (columnMode === '6_col') {
        rowData.push(
          r.openingDebit,
          r.openingCredit,
          r.periodDebit,
          r.periodCredit,
          r.closingDebit,
          r.closingCredit
        );
      } else if (columnMode === '4_col') {
        rowData.push(r.periodDebit, r.periodCredit, r.closingDebit, r.closingCredit);
      } else {
        rowData.push(r.closingDebit, r.closingCredit);
      }
      csvRows.push(rowData.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Habino_Trial_Balance_${columnMode}_${level}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header & Balance Status */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              گزارش تراز آزمایشی ۲، ۴ و ۶ ستونی هابینو
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                موازنه قطعی دفاتر
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              ارزیابی موازنه گردش و مانده حساب‌ها در سطوح گروه، کل، معین و تفصیلی شناور
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {trialResult.isBalanced ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              دفاتر کاملاً تراز و متوازن است
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              هشدار ناترازی دفاتر: {formatCurrency(trialResult.difference, currency)}
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            خروجی اکسل (CSV)
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            چاپ رسمی تراز
          </button>
        </div>
      </div>

      {/* Control Switchers: Mode (2, 4, 6 col) & Level (Group, Kol, Moein, Tafsili) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Column Mode Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 ml-1">تعداد ستون‌ها:</span>
          <button
            onClick={() => setColumnMode('2_col')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              columnMode === '2_col'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            تراز ۲ ستونی (فقط مانده‌ها)
          </button>
          <button
            onClick={() => setColumnMode('4_col')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              columnMode === '4_col'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            تراز ۴ ستونی (گردش + مانده)
          </button>
          <button
            onClick={() => setColumnMode('6_col')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              columnMode === '6_col'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            تراز ۶ ستونی (ابتدای دوره + طی دوره + پایان)
          </button>
        </div>

        {/* Accounting Level Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 ml-1">سطح گزارش:</span>
          <button
            onClick={() => setLevel('kol')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              level === 'kol'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            سطح کل (۲ رقمی)
          </button>
          <button
            onClick={() => setLevel('moein')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              level === 'moein'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            سطح معین (استاندارد)
          </button>
          <button
            onClick={() => setLevel('group')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              level === 'group'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            سطح گروه (۱ رقمی)
          </button>
          <button
            onClick={() => setLevel('tafsili')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              level === 'tafsili'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            سطح تفصیلی شناور
          </button>
        </div>
      </div>

      {/* Secondary Search & Date Filters */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            placeholder="جستجوی کد یا نام حساب در ردیف‌های تراز..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full max-w-sm pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>از تاریخ:</span>
          <input
            type="text"
            placeholder="1403/01/01"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center"
          />
          <span>تا تاریخ:</span>
          <input
            type="text"
            placeholder="1403/12/29"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-[11px] text-rose-600 hover:underline cursor-pointer"
            >
              حذف فیلتر تاریخ
            </button>
          )}
        </div>
      </div>

      {/* Trial Balance Multi-Column Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              {/* Complex Header for 4 and 6 Column Modes */}
              {columnMode === '6_col' && (
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                  <th rowSpan={2} className="p-3 text-right w-20 border-l border-slate-200">کد</th>
                  <th rowSpan={2} className="p-3 text-right border-l border-slate-200">عنوان سرفصل حسابداری</th>
                  <th colSpan={2} className="p-2 bg-amber-50/70 text-amber-900 border-l border-slate-200">
                    گردش ابتدای دوره (قبل از بازه)
                  </th>
                  <th colSpan={2} className="p-2 bg-blue-50/70 text-blue-900 border-l border-slate-200">
                    گردش طی دوره مالی
                  </th>
                  <th colSpan={2} className="p-2 bg-emerald-50/70 text-emerald-900">
                    مانده پایان دوره مالی
                  </th>
                </tr>
              )}

              {columnMode === '4_col' && (
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                  <th rowSpan={2} className="p-3 text-right w-20 border-l border-slate-200">کد</th>
                  <th rowSpan={2} className="p-3 text-right border-l border-slate-200">عنوان سرفصل حسابداری</th>
                  <th colSpan={2} className="p-2 bg-blue-50/70 text-blue-900 border-l border-slate-200">
                    گردش عملیات (طی دوره)
                  </th>
                  <th colSpan={2} className="p-2 bg-emerald-50/70 text-emerald-900">
                    مانده نهایی حساب
                  </th>
                </tr>
              )}

              {/* Sub-Header Columns */}
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-left">
                {columnMode === '2_col' && (
                  <>
                    <th className="p-3 text-right w-24 border-l border-slate-200">کد حساب</th>
                    <th className="p-3 text-right border-l border-slate-200">عنوان سرفصل حسابداری</th>
                  </>
                )}

                {columnMode === '6_col' && (
                  <>
                    <th className="p-2.5 text-left w-32 bg-amber-50/30">بدهکار</th>
                    <th className="p-2.5 text-left w-32 bg-amber-50/30 border-l border-slate-200">بستانکار</th>
                  </>
                )}

                {(columnMode === '4_col' || columnMode === '6_col') && (
                  <>
                    <th className="p-2.5 text-left w-32 bg-blue-50/30">بدهکار</th>
                    <th className="p-2.5 text-left w-32 bg-blue-50/30 border-l border-slate-200">بستانکار</th>
                  </>
                )}

                <th className="p-2.5 text-left w-32 bg-emerald-50/30">مانده بدهکار</th>
                <th className="p-2.5 text-left w-32 bg-emerald-50/30">مانده بستانکار</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredRows.map(row => (
                <tr key={row.code} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-2.5 font-bold text-blue-700 border-l border-slate-100">{row.code}</td>
                  <td className="p-2.5 font-sans font-medium text-slate-800 border-l border-slate-100">
                    {row.title}
                  </td>

                  {/* 6_col: Opening Balances */}
                  {columnMode === '6_col' && (
                    <>
                      <td className="p-2.5 text-left text-slate-700 bg-amber-50/15">
                        {row.openingDebit > 0 ? formatCurrency(row.openingDebit, currency) : '—'}
                      </td>
                      <td className="p-2.5 text-left text-slate-700 bg-amber-50/15 border-l border-slate-100">
                        {row.openingCredit > 0 ? formatCurrency(row.openingCredit, currency) : '—'}
                      </td>
                    </>
                  )}

                  {/* 4_col and 6_col: Period Turnovers */}
                  {(columnMode === '4_col' || columnMode === '6_col') && (
                    <>
                      <td className="p-2.5 text-left text-slate-700 font-bold bg-blue-50/15">
                        {row.periodDebit > 0 ? formatCurrency(row.periodDebit, currency) : '—'}
                      </td>
                      <td className="p-2.5 text-left text-slate-700 font-bold bg-blue-50/15 border-l border-slate-100">
                        {row.periodCredit > 0 ? formatCurrency(row.periodCredit, currency) : '—'}
                      </td>
                    </>
                  )}

                  {/* Closing Balances */}
                  <td className="p-2.5 text-left text-emerald-700 font-bold bg-emerald-50/15">
                    {row.closingDebit > 0 ? formatCurrency(row.closingDebit, currency) : '—'}
                  </td>
                  <td className="p-2.5 text-left text-rose-700 font-bold bg-emerald-50/15">
                    {row.closingCredit > 0 ? formatCurrency(row.closingCredit, currency) : '—'}
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columnMode === '6_col' ? 8 : columnMode === '4_col' ? 6 : 4}
                    className="p-8 text-center text-slate-400 font-sans text-xs"
                  >
                    داده‌ای برای نمایش تراز با فیلترهای انتخابی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Grand Totals Footer */}
            <tfoot>
              <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                <td colSpan={2} className="p-3 text-center font-sans border-l border-slate-200">
                  جمع کل ستون‌های تراز:
                </td>

                {columnMode === '6_col' && (
                  <>
                    <td className="p-2.5 text-left text-amber-900 font-mono bg-amber-100/60">
                      {formatCurrency(trialResult.totals.openingDebit, currency)}
                    </td>
                    <td className="p-2.5 text-left text-amber-900 font-mono bg-amber-100/60 border-l border-slate-300">
                      {formatCurrency(trialResult.totals.openingCredit, currency)}
                    </td>
                  </>
                )}

                {(columnMode === '4_col' || columnMode === '6_col') && (
                  <>
                    <td className="p-2.5 text-left text-blue-900 font-mono bg-blue-100/60">
                      {formatCurrency(trialResult.totals.periodDebit, currency)}
                    </td>
                    <td className="p-2.5 text-left text-blue-900 font-mono bg-blue-100/60 border-l border-slate-300">
                      {formatCurrency(trialResult.totals.periodCredit, currency)}
                    </td>
                  </>
                )}

                <td className="p-2.5 text-left text-emerald-900 font-mono bg-emerald-100/60">
                  {formatCurrency(trialResult.totals.closingDebit, currency)}
                </td>
                <td className="p-2.5 text-left text-rose-900 font-mono bg-emerald-100/60">
                  {formatCurrency(trialResult.totals.closingCredit, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
