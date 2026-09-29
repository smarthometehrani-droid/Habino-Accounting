import React, { useState, useEffect, useRef } from 'react';
import { CloudUpload, RefreshCw, CheckCircle2, AlertCircle, HardDrive, ShieldCheck, Check, Database } from 'lucide-react';
import { offlineOutbox, OutboxItem } from '../lib/offlineOutboxQueue';
import { toPersianDigits } from '../lib/currencyUtils';

interface OutboxSyncBadgeProps {
  variant?: 'navbar' | 'taskbar' | 'compact';
}

export const OutboxSyncBadge: React.FC<OutboxSyncBadgeProps> = ({ variant = 'navbar' }) => {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = offlineOutbox.subscribe(updatedItems => {
      setItems(updatedItems);
    });
    return unsubscribe;
  }, []);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'syncing' || i.status === 'failed' || i.status === 'conflict');
  const pendingCount = pendingItems.length;
  const isSyncing = items.some(i => i.status === 'syncing');
  const hasFailed = items.some(i => i.status === 'failed');
  const hasConflict = items.some(i => i.status === 'conflict');

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFlushing || pendingCount === 0) return;
    setIsFlushing(true);
    try {
      await offlineOutbox.flushQueue();
    } finally {
      setIsFlushing(false);
    }
  };

  const getTypeNameFa = (type: OutboxItem['type']) => {
    switch (type) {
      case 'signature':
        return 'امضای فاکتور';
      case 'invoice':
        return 'فاکتور مالی';
      case 'transaction':
        return 'تراکنش بانکی';
      case 'check':
        return 'چک صیادی';
      case 'client':
        return 'اطلاعات طرف‌حساب';
      case 'inventory':
        return 'موجودی انبار';
      case 'installment':
        return 'قسط مالی';
      case 'entry':
        return 'سند دفتر کل';
      default:
        return 'سند مالی';
    }
  };

  // Rendering for taskbar variant (Dark desktop style)
  if (variant === 'taskbar') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all cursor-pointer ${
            hasConflict
              ? 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
              : hasFailed
              ? 'bg-amber-950/80 text-amber-300 border-amber-800 hover:bg-amber-900'
              : isSyncing || isFlushing
              ? 'bg-blue-950/80 text-blue-300 border-blue-800 hover:bg-blue-900'
              : pendingCount > 0
              ? 'bg-amber-950/60 text-amber-200 border-amber-800/80 hover:bg-amber-900/80'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
          }`}
          title={`صف ارسال آفلاین IndexedDB (${toPersianDigits(pendingCount)} سند در صف)`}
        >
          <CloudUpload
            className={`w-3.5 h-3.5 ${
              isSyncing || isFlushing
                ? 'animate-bounce text-blue-400'
                : hasConflict || hasFailed
                ? 'text-rose-400'
                : pendingCount > 0
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          />
          <span className="text-[10px] hidden xl:inline">
            {pendingCount === 0 ? 'صف همگام' : 'صف آفلاین'}
          </span>
          {pendingCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                hasConflict || hasFailed ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {toPersianDigits(pendingCount)}
            </span>
          )}
        </button>

        {showDropdown && renderDropdownPanel(true)}
      </div>
    );
  }

  // Rendering for navbar / compact variant (Light header style)
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer border ${
          hasConflict
            ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse'
            : hasFailed
            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            : isSyncing || isFlushing
            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            : pendingCount > 0
            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            : 'bg-slate-50 text-slate-700 border-slate-200/90 hover:bg-slate-100'
        }`}
        title={`صف همگام‌سازی آفلاین IndexedDB (${toPersianDigits(pendingCount)} سند در صف)`}
      >
        <CloudUpload
          className={`w-3.5 h-3.5 ${
            isSyncing || isFlushing
              ? 'animate-bounce text-blue-600'
              : hasConflict || hasFailed
              ? 'text-rose-600'
              : pendingCount > 0
              ? 'text-amber-600'
              : 'text-emerald-600'
          }`}
        />
        <span className="hidden md:inline">
          {pendingCount === 0 ? 'صف همگام' : 'صف آفلاین'}
        </span>
        {pendingCount > 0 ? (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              hasConflict || hasFailed ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {toPersianDigits(pendingCount)}
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 hidden sm:inline-block"></span>
        )}
      </button>

      {showDropdown && renderDropdownPanel(false)}
    </div>
  );

  function renderDropdownPanel(isDarkTheme: boolean) {
    return (
      <div
        className={`absolute ${
          isDarkTheme ? 'bottom-full mb-2 left-0 sm:left-auto sm:right-0' : 'top-full mt-2 left-0 sm:left-auto sm:right-0'
        } w-80 sm:w-96 rounded-2xl shadow-2xl border p-4 z-50 text-right font-sans ${
          isDarkTheme ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
        dir="rtl"
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between pb-3 border-b ${
            isDarkTheme ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-500" />
            <div>
              <span className="text-xs font-bold block">صف ارسال آفلاین (IndexedDB)</span>
              <span className="text-[10px] text-slate-400 block">ظرفیت نامحدود اسناد و تصاویر امضا</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isFlushing || pendingCount === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold disabled:opacity-40 disabled:hover:bg-blue-600 cursor-pointer transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isFlushing ? 'animate-spin' : ''}`} />
            <span>ارسال فوری</span>
          </button>
        </div>

        {/* OCC and Storage Banner */}
        <div
          className={`my-2 p-2 rounded-xl text-[10px] flex items-center justify-between ${
            isDarkTheme ? 'bg-slate-800/80 border border-slate-700' : 'bg-blue-50/70 border border-blue-100 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>کنترل همزمانی خوش‌بینانه (OCC) فعال است</span>
          </div>
          <span className="font-mono text-[9px] opacity-75">IndexedDB Native</span>
        </div>

        {/* Items List */}
        <div className="py-1 max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
          {items.length === 0 ? (
            <div className="text-center py-7 text-slate-400 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <span className="font-semibold">کلیه اسناد با سرور و پایگاه‌داده همگام هستند.</span>
              <span className="text-[10px] text-slate-400">سند منتظری در صف محلی دستگاه وجود ندارد.</span>
            </div>
          ) : (
            items.slice(0, 15).map(item => (
              <div
                key={item.id}
                className={`p-2 rounded-xl border text-[11px] transition-colors ${
                  item.status === 'conflict'
                    ? isDarkTheme
                      ? 'bg-rose-950/40 border-rose-800'
                      : 'bg-rose-50 border-rose-200'
                    : item.status === 'failed'
                    ? isDarkTheme
                      ? 'bg-rose-950/30 border-rose-800/80'
                      : 'bg-rose-50/80 border-rose-200'
                    : item.status === 'syncing'
                    ? isDarkTheme
                      ? 'bg-blue-950/40 border-blue-800'
                      : 'bg-blue-50 border-blue-200'
                    : isDarkTheme
                    ? 'bg-slate-800/60 border-slate-750'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{getTypeNameFa(item.type)}</span>
                    {item.version && (
                      <span className="text-[9px] px-1 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                        v{item.version}
                      </span>
                    )}
                  </div>
                  <div>
                    {item.status === 'synced' && (
                      <span className="text-emerald-500 flex items-center gap-1 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ارسال شد</span>
                      </span>
                    )}
                    {item.status === 'syncing' && (
                      <span className="text-blue-500 flex items-center gap-1 text-[10px] font-bold">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>در حال ارسال...</span>
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="text-amber-500 text-[10px] font-bold">در صف ارسال</span>
                    )}
                    {item.status === 'conflict' && (
                      <span className="text-rose-500 flex items-center gap-1 text-[10px] font-bold" title={item.errorMessage}>
                        <AlertCircle className="w-3 h-3" />
                        <span>تداخل نسخه (OCC)</span>
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="text-rose-500 flex items-center gap-1 text-[10px] font-bold" title={item.errorMessage}>
                        <AlertCircle className="w-3 h-3" />
                        <span>خطای اتصال ({toPersianDigits(item.attempts)})</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">
                    {new Date(item.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {item.errorMessage && (
                    <span className="text-rose-500 truncate max-w-[180px]" title={item.errorMessage}>
                      {item.errorMessage}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className={`pt-2.5 mt-2 border-t flex justify-between items-center text-[10px] ${
              isDarkTheme ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            <span className="text-slate-400">
              {toPersianDigits(items.length)} سند در تاریخچه صف
            </span>
            <div className="flex items-center gap-2">
              {items.some(i => i.status === 'synced') && (
                <button
                  type="button"
                  onClick={() => offlineOutbox.clearCompleted()}
                  className="text-blue-500 hover:text-blue-600 underline cursor-pointer"
                >
                  پاکسازی ارسال‌شده‌ها
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
};
