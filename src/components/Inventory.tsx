import React, { useState, useMemo } from 'react';
import { useAccounting } from '../lib/store';
import { InventoryItem } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import {
  Plus,
  Trash2,
  Package,
  Wrench,
  Search,
  Edit2,
  AlertTriangle,
  Layers,
  Sparkles,
  Check,
  ScanLine,
  X,
  PackagePlus,
  Camera,
  RefreshCw,
  Cloud
} from 'lucide-react';
import { BarcodeScannerStudio } from './BarcodeScannerStudio';
import { StockInBarcodeModal } from './StockInBarcodeModal';
import { QuickBarcodeScannerModal } from './QuickBarcodeScannerModal';

export const Inventory: React.FC = () => {
  const {
    inventory,
    settings,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    syncFromSupabase,
    pushToSupabase,
    isSupabaseLive
  } = useAccounting();
  const [showModal, setShowModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showCameraBarcodeModal, setShowCameraBarcodeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'service' | 'good'>('all');
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSyncCloud = async () => {
    setSyncingCloud(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncFromSupabase();
      if (res.success) {
        setSyncStatusMsg({
          text: `همگام‌سازی با سوپابیس با موفقیت انجام شد (${toPersianDigits(inventory.length)} قلم آیتم فعال)`,
          isError: false
        });
      } else {
        setSyncStatusMsg({ text: res.message || 'خطا در دریافت اطلاعات', isError: true });
      }
    } catch (e: any) {
      setSyncStatusMsg({ text: e.message || 'خطا در اتصال به سوپابیس', isError: true });
    } finally {
      setSyncingCloud(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  const handlePushCloud = async () => {
    setSyncingCloud(true);
    setSyncStatusMsg(null);
    try {
      const res = await pushToSupabase();
      if (res.success) {
        setSyncStatusMsg({
          text: `ارسال موفق اطلاعات انبار به سوپابیس (${toPersianDigits(inventory.length)} قلم ذخیره شد)`,
          isError: false
        });
      } else {
        setSyncStatusMsg({ text: res.message || 'خطا در ارسال اطلاعات', isError: true });
      }
    } catch (e: any) {
      setSyncStatusMsg({ text: e.message || 'خطا در ارسال اطلاعات به سوپابیس', isError: true });
    } finally {
      setSyncingCloud(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('ساعت');
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(100);
  const [type, setType] = useState<'service' | 'good'>('service');

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const codeMatch = (item.code || '').toLowerCase().includes(q);
        const barcodeMatch = (item.barcode || '').toLowerCase().includes(q);
        const unitMatch = (item.unit || '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !barcodeMatch && !unitMatch) return false;
      }

      return true;
    });
  }, [inventory, typeFilter, searchQuery]);

  // Inventory KPI statistics
  const stats = useMemo(() => {
    const totalServices = inventory.filter(i => i.type === 'service').length;
    const totalGoods = inventory.filter(i => i.type === 'good').length;
    const totalGoodsValue = inventory
      .filter(i => i.type === 'good')
      .reduce((sum, item) => sum + (item.stock * item.buyPrice), 0);

    return { totalServices, totalGoods, totalGoodsValue };
  }, [inventory]);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setCode(`SKU-${Date.now().toString().slice(-4)}`);
    setBarcode('');
    setUnit('ساعت / پروژه');
    setBuyPrice(0);
    setSellPrice(0);
    setStock(100);
    setType('service');
    setShowModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setBarcode(item.barcode || '');
    setUnit(item.unit);
    setBuyPrice(item.buyPrice);
    setSellPrice(item.sellPrice);
    setStock(item.stock);
    setType(item.type);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      await updateInventoryItem(editingItem.id, {
        name,
        code,
        barcode: barcode.trim() || undefined,
        unit,
        buyPrice: Number(buyPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        stock: Number(stock) || 0,
        type
      });
    } else {
      await addInventoryItem({
        name,
        code: code || `SKU-${Date.now().toString().slice(-4)}`,
        barcode: barcode.trim() || undefined,
        unit,
        buyPrice: Number(buyPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        stock: Number(stock) || 0,
        type
      });
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6" id="inventory-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              تعرفه خدمات و انبار کالا
            </h2>
            {isSupabaseLive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title="متصل به دیتابیس زنده سوپابیس">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                سوپابیس ابری
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                حافظه محلی
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت تعرفه خدمات تخصصی، بهای تمام‌شده و کنترل موجودی انبار هابینو
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="sync-inventory-from-supabase-btn"
            onClick={handleSyncCloud}
            disabled={syncingCloud}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200/80 transition-all cursor-pointer disabled:opacity-50"
            title="دریافت و ادغام آخرین اطلاعات کالاها، قیمت‌ها و موجودی از سوپابیس"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${syncingCloud ? 'animate-spin' : ''}`} />
            <span>{syncingCloud ? 'در حال همگام‌سازی...' : 'همگام‌سازی سوپابیس'}</span>
          </button>
          <button
            id="push-inventory-to-supabase-btn"
            onClick={handlePushCloud}
            disabled={syncingCloud}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="ارسال کلیه اقلام انبار به دیتابیس سوپابیس"
          >
            <Cloud className="w-3.5 h-3.5 text-slate-500" />
            <span>ارسال به سوپابیس</span>
          </button>
          <button
            id="open-stock-in-barcode-btn"
            onClick={() => setShowStockInModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <PackagePlus className="w-4 h-4 text-emerald-200" />
            <span>ورود کالا با بارکدخوان (رسید انبار)</span>
          </button>
          <button
            id="open-barcode-scanner-inventory-btn"
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
            <span>اسکن بارکد</span>
          </button>
          <button
            id="open-create-item-modal-btn"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            تعریف کالای جدید
          </button>
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncStatusMsg && (
        <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
          syncStatusMsg.isError
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {syncStatusMsg.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{syncStatusMsg.text}</span>
          </div>
          <button
            onClick={() => setSyncStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-blue-600" />
              خدمات تخصصی فعال
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">
              {toPersianDigits(stats.totalServices)} عنوان
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-blue-900">
            تعرفه‌گذاری و حق‌الزحمه ساعتی / پروژه‌ای
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" />
              کالاهای فیزیکی انبار
            </span>
            <span className="text-[11px] font-mono text-amber-600 font-semibold">
              {toPersianDigits(stats.totalGoods)} قلم کالا
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-amber-900">
            {toPersianDigits(inventory.reduce((acc, i) => acc + (i.type === 'good' ? i.stock : 0), 0))} واحد کل موجودی
          </div>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              ارزش ریالی موجودی انبار
            </span>
            <span className="text-[11px] font-mono text-emerald-600 font-semibold">
              بهای تمام‌شده
            </span>
          </div>
          <div className="mt-2 text-lg font-bold text-emerald-900">
            {formatCurrency(stats.totalGoodsValue, settings.currency)}
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
            همه موارد ({toPersianDigits(inventory.length)})
          </button>
          <button
            onClick={() => setTypeFilter('service')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              typeFilter === 'service'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            خدمات تخصصی ({toPersianDigits(stats.totalServices)})
          </button>
          <button
            onClick={() => setTypeFilter('good')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              typeFilter === 'good'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            کالای فیزیکی ({toPersianDigits(stats.totalGoods)})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجوی سریع عنوان کالا یا خدمت، کد SKU، یا واحد..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <th className="p-4">نوع</th>
              <th className="p-4">کد کالا (SKU)</th>
              <th className="p-4">عنوان خدمت / کالا</th>
              <th className="p-4">واحد سنجش</th>
              <th className="p-4">قیمت خرید / بهای تمام‌شده</th>
              <th className="p-4">قیمت فروش / تعرفه</th>
              <th className="p-4">موجودی / ظرفیت</th>
              <th className="p-4 text-center">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                  موردی با شرایط فیلتر و جستجوی کنونی یافت نشد.
                </td>
              </tr>
            ) : (
              filteredInventory.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      item.type === 'service' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.type === 'service' ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                      {item.type === 'service' ? 'خدمت' : 'کالا'}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-medium text-slate-600">{item.code}</td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    {item.barcode && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 font-mono">
                        <ScanLine className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{item.barcode}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 text-xs">{item.unit}</td>
                  <td className="p-4 text-slate-600 font-mono">{formatCurrency(item.buyPrice, settings.currency)}</td>
                  <td className="p-4 font-bold text-slate-900 font-mono">{formatCurrency(item.sellPrice, settings.currency)}</td>
                  <td className="p-4 font-mono text-slate-700">
                    {item.type === 'good' ? (
                      <span className={item.stock <= 5 ? 'text-rose-600 font-bold' : ''}>
                        {toPersianDigits(item.stock)} {item.unit}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">نامحدود</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.type === 'good' && (
                        <button
                          onClick={() => {
                            setShowStockInModal(true);
                          }}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="ورود کالا به انبار با بارکدخوان (افزایش موجودی)"
                        >
                          <PackagePlus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                        title="ویرایش کالا / خدمت"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteInventoryItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="حذف کالا / خدمت"
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

      {/* Modal for Add / Edit Item */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                {editingItem ? 'ویرایش کالا یا خدمت' : 'افزودن خدمت یا کالای جدید'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">نوع ماهیت آیتم</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setType('service'); setUnit('ساعت / پروژه'); }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      type === 'service' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    خدمات تخصصی
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType('good'); setUnit('عدد'); }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      type === 'good' ? 'bg-amber-50 border-amber-600 text-amber-700 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    کالای فیزیکی
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">عنوان کامل خدمت یا کالا *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: خدمات طراحی و مدلسازی BIM یا سرور فیزیکی"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">کد آیتم (SKU)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="کد کالا"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-600 text-xs">بارکد (EAN / ایران‌کد)</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCameraBarcodeModal(true)}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 cursor-pointer"
                        title="اسکن مستقیم بارکد کالا با دوربین"
                      >
                        <Camera className="w-3 h-3" />
                        <span>اسکن دوربین</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const randomIranCode = '626' + Math.floor(100000000 + Math.random() * 900000000).toString();
                          setBarcode(randomIranCode);
                        }}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium underline cursor-pointer"
                      >
                        تولید ایران‌کد
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      placeholder="مثال: 6260123456789"
                      className="w-full p-2.5 pl-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                    <ScanLine className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">واحد سنجش</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="مثال: ساعت، نفرروز، عدد، متر، کارتن"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">قیمت خرید / بهای تمام‌شده</label>
                  <input
                    type="number"
                    value={buyPrice || ''}
                    onChange={e => setBuyPrice(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">قیمت فروش / تعرفه مصوب</label>
                  <input
                    type="number"
                    value={sellPrice || ''}
                    onChange={e => setSellPrice(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {type === 'good' && (
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">موجودی اولیه در انبار</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={e => setStock(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              )}

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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {editingItem ? 'ذخیره تغییرات' : 'افزودن به انبار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">اسکنر بارکد و انبارگردانی سریع هابینو</h3>
              </div>
              <button
                id="close-scanner-modal-btn"
                onClick={() => setShowScannerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <BarcodeScannerStudio
              embeddedMode={true}
              onBarcodeDetected={(code, matched) => {
                if (matched) {
                  setSearchQuery(matched.code);
                }
              }}
              onNavigateToInventory={(prefilledBarcode) => {
                setShowScannerModal(false);
                openCreateModal();
                if (prefilledBarcode) {
                  setBarcode(prefilledBarcode);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Stock In via Barcode Scanner Modal */}
      <StockInBarcodeModal
        isOpen={showStockInModal}
        onClose={() => setShowStockInModal(false)}
      />

      {/* Quick Camera Barcode Scanner for Item Form */}
      <QuickBarcodeScannerModal
        isOpen={showCameraBarcodeModal}
        onClose={() => setShowCameraBarcodeModal(false)}
        onScan={(scannedCode) => {
          setBarcode(scannedCode);
          // if code is SKU empty, also fill with SKU prefix
          if (!code) {
            setCode(`SKU-${scannedCode.slice(-4)}`);
          }
        }}
        title="اسکن بارکد کالا با دوربین"
        description="بارکد چاپ‌شده روی بسته کالا را مقابل دوربین نگه دارید"
      />
    </div>
  );
};
