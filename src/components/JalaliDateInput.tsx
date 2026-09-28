/**
 * Persian (Jalali) Masked Date Input Component
 * کامپوننت هوشمند ورودی تاریخ شمسی با ماسک خودکار، اعتبارسنجی ارقام و تمیزکاری خودکار
 * ورودی‌های کاربر را به ساختار استاندارد YYYY/MM/DD قالب‌بندی و اعتبارسنجی می‌کند.
 */

import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Check } from 'lucide-react';
import { cleanDateStr, toPostgresDate, getCurrentJalaliDate } from '../lib/dateUtils';

interface JalaliDateInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  showTodayButton?: boolean;
}

export const JalaliDateInput: React.FC<JalaliDateInputProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = 'مثال: ۱۴۰۵/۰۶/۲۴',
  required = false,
  className = '',
  disabled = false,
  showTodayButton = true
}) => {
  const [internalValue, setInternalValue] = useState<string>(value || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  // اعتبارسنجی تاریخ جلالی (سال بین ۱۲۰۰ تا ۱۶۰۰، ماه ۱ تا ۱۲، روز ۱ تا ۳۱)
  const validateJalali = (raw: string): boolean => {
    const clean = cleanDateStr(raw);
    if (!clean) {
      if (required) {
        setError('ورود تاریخ الزامی است.');
        return false;
      }
      setError(null);
      return true;
    }

    const match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!match) {
      setError('فرمت تاریخ باید به صورت چهار رقمی سال/ماه/روز باشد (مانند ۱۴۰۵/۰۶/۲۴)');
      return false;
    }

    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);

    if (y < 1200 || y > 1600) {
      setError('سال وارد شده نامعتبر است (بین ۱۲۰۰ تا ۱۶۰۰ مجاز است)');
      return false;
    }

    if (m < 1 || m > 12) {
      setError('ماه وارد شده نامعتبر است (بین ۰۱ تا ۱۲)');
      return false;
    }

    const maxDays = m <= 6 ? 31 : (m <= 11 ? 30 : 29);
    if (d < 1 || d > maxDays) {
      setError(`روز برای ماه ${m} باید بین ۰۱ تا ${maxDays} باشد`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // ارقام فارسی و عربی را به انگلیسی تبدیل و کاراکترهای غیرمجاز را حذف می‌کنیم
    const cleaned = cleanDateStr(raw);
    // فقط اعداد و اسلش مجاز است
    const filtered = cleaned.replace(/[^0-9\/]/g, '');

    // اعمال ماسک خودکار: افزودن خودکار اسلش بعد از سال (۴ رقم) و ماه (۲ رقم بعدی)
    let masked = filtered;
    const digitsOnly = filtered.replace(/\//g, '');
    if (digitsOnly.length > 4 && !filtered.includes('/')) {
      masked = `${digitsOnly.slice(0, 4)}/${digitsOnly.slice(4)}`;
    }
    const parts = masked.split('/');
    if (parts.length === 2 && parts[1].length > 2) {
      masked = `${parts[0]}/${parts[1].slice(0, 2)}/${parts[1].slice(2)}`;
    }

    setInternalValue(masked);
    onChange(masked);
    if (masked.length >= 8) {
      validateJalali(masked);
    } else if (!masked && !required) {
      setError(null);
    }
  };

  const handleBlur = () => {
    // هنگام خروج از فیلد، در صورت فرمت ناقص سال/ماه/روز، پد کردن انجام شود
    if (!internalValue) {
      if (required) setError('ورود تاریخ الزامی است.');
      return;
    }
    const clean = cleanDateStr(internalValue);
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      const y = parts[0].padStart(4, '0');
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      const normalized = `${y}/${m}/${d}`;
      setInternalValue(normalized);
      onChange(normalized);
      validateJalali(normalized);
    } else {
      validateJalali(clean);
    }
  };

  const setToday = () => {
    const today = getCurrentJalaliDate();
    setInternalValue(today);
    onChange(today);
    setError(null);
  };

  const isValid = !error && internalValue && internalValue.length >= 8;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-600">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {showTodayButton && !disabled && (
            <button
              type="button"
              onClick={setToday}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
            >
              امروز
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={10}
          dir="ltr"
          className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-mono transition-all text-center focus:outline-hidden ${
            error 
              ? 'border-rose-300 focus:ring-2 focus:ring-rose-400 bg-rose-50/50 text-rose-900' 
              : isValid 
                ? 'border-emerald-300 focus:ring-2 focus:ring-blue-500 text-slate-800'
                : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800'
          }`}
        />
        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
          <Calendar className="w-4 h-4" />
        </div>
        {isValid && (
          <div className="absolute left-3 top-2.5 pointer-events-none text-emerald-500">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};
