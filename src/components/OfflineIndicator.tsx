import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database, Check, RefreshCw, HardDrive } from 'lucide-react';
import { useAccounting } from '../lib/store';
import { toPersianDigits } from '../lib/currencyUtils';
import { IndexedDbStorageStats } from '../lib/indexedDbEngine';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { getIndexedDbStats, persistToIndexedDbNow } = useAccounting();
  const [stats, setStats] = useState<IndexedDbStorageStats | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      getIndexedDbStats().then(setStats).catch(() => {});
    }
  }, [isOnline]);

  const handleManualPersist = async () => {
    setIsPersisting(true);
    try {
      await persistToIndexedDbNow();
      const updated = await getIndexedDbStats();
      setStats(updated);
    } catch (e) {
      console.warn('Manual persist error:', e);
    } finally {
      setIsPersisting(false);
    }
  };

  if (isOnline) return null;

  return (
    <aside
      aria-label="وضعیت اتصال شبکه"
      id="pwa-offline-banner"
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 rounded-2xl bg-amber-600 text-white p-3.5 shadow-2xl backdrop-blur-md border border-amber-400/30"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-700/60 rounded-xl shrink-0 mt-0.5">
          <WifiOff className="w-5 h-5 text-amber-100" />
        </div>
        <div className="flex-1 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold flex items-center gap-1.5">
              <span>حالت آفلاین (مقاوم در برابر قطعی اینترنت)</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] underline text-amber-200 hover:text-white cursor-pointer"
            >
              {showDetails ? 'بستن جزئیات' : 'وضعیت حافظه'}
            </button>
          </div>
          <p className="text-amber-100 text-[11px] mt-0.5 leading-relaxed">
            تمامی تغییرات در دیتابیس بومی IndexedDB ذخیره شده و هیچ داده‌ای از بین نخواهد رفت.
          </p>

          {showDetails && stats && (
            <div className="mt-2.5 pt-2 border-t border-amber-500/50 space-y-1.5 text-[11px] bg-amber-700/40 p-2.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-amber-200" />
                  رکوردهای ثبت‌شده محلی:
                </span>
                <span className="font-bold font-mono text-white">{toPersianDigits(stats.totalRecords)} سند</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-amber-200" />
                  حجم اشغال شده IndexedDB:
                </span>
                <span className="font-mono text-amber-200">{toPersianDigits(stats.estimatedSizeKb)} کیلوبایت</span>
              </div>
              <div className="pt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleManualPersist}
                  disabled={isPersisting}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isPersisting ? 'animate-spin' : ''}`} />
                  {isPersisting ? 'در حال ذخیره‌سازی...' : 'بروزرسانی فوری دیتابیس محلی'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
