import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAccounting } from '../lib/store';
import { InventoryItem } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import { playScanBeep, playErrorBeep, detectBarcodeFormat } from '../lib/barcodeEngine';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';
import {
  PackagePlus,
  ScanLine,
  Camera,
  CameraOff,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Printer,
  Zap,
  ArrowDownLeft,
  Search,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';

interface StockInItemRecord {
  id: string;
  itemId: string;
  itemName: string;
  code: string;
  barcode: string;
  quantityAdded: number;
  newTotalStock: number;
  unit: string;
  buyPrice: number;
  time: string;
}

interface StockInBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
}

export const StockInBarcodeModal: React.FC<StockInBarcodeModalProps> = ({
  isOpen,
  onClose,
  preselectedItemId
}) => {
  const { inventory, updateInventoryItem, addInventoryItem, settings } = useAccounting();

  // Intake batch settings
  const [defaultBatchQty, setDefaultBatchQty] = useState<number>(1);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [intakeLog, setIntakeLog] = useState<StockInItemRecord[]>([]);
  const [lastProcessedFeedback, setLastProcessedFeedback] = useState<{
    status: 'success' | 'not_found' | 'error';
    message: string;
    itemName?: string;
  } | null>(null);

  // Live Camera inside modal
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Modal for creating item if scanned barcode not found in inventory
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [showCreateUnknownModal, setShowCreateUnknownModal] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemBuyPrice, setNewItemBuyPrice] = useState<number>(0);
  const [newItemSellPrice, setNewItemSellPrice] = useState<number>(0);
  const [newItemUnit, setNewItemUnit] = useState<string>('عدد');

  // Input ref to auto focus
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.debug('Error resetting reader:', err);
      }
      codeReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setTorchEnabled(false);
    setIsTorchSupported(false);
  };

  // Process barcode for Stock-In
  const handleProcessBarcode = async (codeStr: string, qtyToAdd: number = defaultBatchQty) => {
    const clean = codeStr.trim();
    if (!clean) return;

    // Search inventory by barcode or SKU code
    const target = inventory.find(i => {
      const b = (i.barcode || '').trim().toLowerCase();
      const c = (i.code || '').trim().toLowerCase();
      const q = clean.toLowerCase();
      return b === q || c === q;
    });

    if (target) {
      const currentStock = target.stock || 0;
      const newStock = currentStock + qtyToAdd;

      await updateInventoryItem(target.id, { stock: newStock });
      playScanBeep();

      const newRecord: StockInItemRecord = {
        id: `in-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        itemId: target.id,
        itemName: target.name,
        code: target.code,
        barcode: target.barcode || clean,
        quantityAdded: qtyToAdd,
        newTotalStock: newStock,
        unit: target.unit || 'عدد',
        buyPrice: target.buyPrice || 0,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setIntakeLog(prev => [newRecord, ...prev]);
      setLastProcessedFeedback({
        status: 'success',
        message: `ورود ${toPersianDigits(qtyToAdd)} ${target.unit} کالای «${target.name}» به انبار ثبت شد. موجودی جدید: ${toPersianDigits(newStock)}`,
        itemName: target.name
      });
      setTimeout(() => setLastProcessedFeedback(null), 3500);
    } else {
      playErrorBeep();
      setUnknownBarcode(clean);
      setNewItemName('');
      setNewItemBuyPrice(0);
      setNewItemSellPrice(0);
      setShowCreateUnknownModal(true);
      setLastProcessedFeedback({
        status: 'not_found',
        message: `بارکد «${clean}» در انبار کالا یافت نشد. می‌توانید فوراً آن را ثبت و وارد انبار کنید.`
      });
    }

    setBarcodeInput('');
    if (manualInputRef.current && !isCameraActive) {
      manualInputRef.current.focus();
    }
  };

  // Start live camera
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('مرورگر از دوربین پشتیبانی نمی‌کند.');
        return;
      }

      const hints = new Map();
      const formats = [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.QR_CODE
      ];
      hints.set(2, formats);

      const reader = new BrowserMultiFormatReader(hints, 300);
      codeReaderRef.current = reader;

      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' } }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Environment facingMode camera failed in StockIn, falling back to generic video stream:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as unknown as { torch?: boolean };
        setIsTorchSupported(!!capabilities.torch);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);

      let lastScannedTime = 0;
      let lastScannedText = '';

      reader.decodeFromVideoElementContinuously(videoRef.current!, (result, error) => {
        if (result) {
          const text = result.getText().trim();
          const now = Date.now();

          // Debounce same item by 2 seconds
          if (text === lastScannedText && now - lastScannedTime < 2200) {
            return;
          }

          lastScannedTime = now;
          lastScannedText = text;
          handleProcessBarcode(text, defaultBatchQty);
        }
      });
    } catch (err: unknown) {
      console.warn('Camera error in StockIn handled:', err);
      const errorObj = err as { name?: string; message?: string };
      const msg = errorObj?.message || '';
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setCameraError('دسترسی به دوربین توسط مرورگر مسدود شده است. لطفاً دسترسی دوربین را مجاز فرمایید.');
      } else if (errorObj?.name === 'NotReadableError' || errorObj?.name === 'TrackStartError' || msg.includes('video source') || msg.includes('in use')) {
        setCameraError('سخت‌افزار دوربین توسط برنامه دیگری در حال استفاده است یا امکان شروع ندارد.');
      } else {
        setCameraError(`عدم امکان برقراری ارتباط با دوربین: ${msg || 'نامشخص'}`);
      }
      setIsCameraActive(false);
    }
  };

  // Hardware scanner listener
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow typing in modal input
      if (target && target.tagName === 'INPUT' && target.id !== 'stock-in-barcode-listener-input') {
        return;
      }

      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          const captured = buffer.trim();
          buffer = '';
          handleProcessBarcode(captured, defaultBatchQty);
        } else {
          buffer = '';
        }
        return;
      }

      if (interval > 150 && buffer.length > 0) {
        buffer = '';
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, defaultBatchQty, inventory]);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  // Create new item if barcode wasn't found
  const handleSaveUnknownItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unknownBarcode || !newItemName.trim()) return;

    const initialStock = Math.max(1, defaultBatchQty);
    const addedItem = await addInventoryItem({
      name: newItemName.trim(),
      code: `SKU-${Date.now().toString().slice(-4)}`,
      barcode: unknownBarcode,
      unit: newItemUnit,
      buyPrice: newItemBuyPrice,
      sellPrice: newItemSellPrice,
      stock: initialStock,
      type: 'good'
    });

    playScanBeep();
    setShowCreateUnknownModal(false);

    const newRecord: StockInItemRecord = {
      id: `in-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      itemId: addedItem.id,
      itemName: addedItem.name,
      code: addedItem.code,
      barcode: addedItem.barcode || unknownBarcode,
      quantityAdded: initialStock,
      newTotalStock: initialStock,
      unit: addedItem.unit || 'عدد',
      buyPrice: addedItem.buyPrice || 0,
      time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setIntakeLog(prev => [newRecord, ...prev]);
    setLastProcessedFeedback({
      status: 'success',
      message: `کالای جدید «${addedItem.name}» با موفقیت تعریف و ${toPersianDigits(initialStock)} ${addedItem.unit} وارد انبار شد.`,
      itemName: addedItem.name
    });
    setUnknownBarcode(null);
  };

  // Calculations of this session
  const totalItemsCount = useMemo(() => {
    return intakeLog.reduce((sum, r) => sum + r.quantityAdded, 0);
  }, [intakeLog]);

  const totalValueAdded = useMemo(() => {
    return intakeLog.reduce((sum, r) => sum + (r.quantityAdded * (r.buyPrice || 0)), 0);
  }, [intakeLog]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">ورود کالا به انبار با بارکدخوان (رسید انبار هوشمند)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                  شنود زنده فعال
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                اسکن پیوسته بارکد با دستگاه تفنگی USB یا دوربین زنده جهت افزایش خودکار موجودی انبار
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Control Strip: Batch Qty & Camera Toggle */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">تعداد ورودی به ازای هر اسکن:</span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                {[1, 5, 10, 20].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDefaultBatchQty(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      defaultBatchQty === val
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {toPersianDigits(val)} عدد
                  </button>
                ))}
                <div className="flex items-center gap-1 pr-1 border-r border-slate-200">
                  <span className="text-[11px] text-slate-400">دستی:</span>
                  <input
                    type="number"
                    min="1"
                    value={defaultBatchQty}
                    onChange={e => setDefaultBatchQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 px-1.5 py-0.5 text-xs font-bold text-center border border-slate-200 rounded-md font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Camera Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isCameraActive) {
                    stopCamera();
                  } else {
                    startCamera();
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isCameraActive
                    ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                {isCameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                <span>{isCameraActive ? 'توقف اسکنر دوربین' : 'فعال‌سازی اسکن دوربین'}</span>
              </button>
            </div>
          </div>

          {/* Camera Viewfinder (if active) */}
          {isCameraActive && (
            <div className="relative aspect-video max-h-56 w-full bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-emerald-500 shadow-md">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-x-8 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite]" />
              <div className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-[11px] text-emerald-400 font-mono">
                CAMERA SCANNER READY
              </div>
            </div>
          )}

          {cameraError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Barcode Input / Hardware listener area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-emerald-600" />
                <span>اسکن با بارکدخوان تفنگی یا درج دستی بارکد:</span>
              </label>
              <span className="text-[11px] text-slate-500">
                (شلیک بارکدخوان تفنگی USB خودکار ثبت می‌گردد)
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="stock-in-barcode-listener-input"
                  ref={manualInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && barcodeInput.trim()) {
                      e.preventDefault();
                      handleProcessBarcode(barcodeInput.trim(), defaultBatchQty);
                    }
                  }}
                  placeholder="بارکد کالا را اسکن کنید یا بنویسید (مانند: 6260123456789)..."
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-emerald-200 focus:border-emerald-600 rounded-2xl text-xs font-mono text-slate-900 focus:bg-white outline-hidden transition-all shadow-inner"
                  autoFocus
                />
                <ScanLine className="w-4 h-4 text-emerald-600 absolute left-3 top-3.5" />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (barcodeInput.trim()) {
                    handleProcessBarcode(barcodeInput.trim(), defaultBatchQty);
                  }
                }}
                className="px-6 py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>ثبت ورود کالا</span>
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {lastProcessedFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 animate-fade-in ${
                lastProcessedFeedback.status === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {lastProcessedFeedback.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <span className="font-semibold">{lastProcessedFeedback.message}</span>
              </div>
            </div>
          )}

          {/* Intake Session Statistics & Log Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800">
                  اقلام وارد شده در این نوبت ({toPersianDigits(intakeLog.length)} ردیف - {toPersianDigits(totalItemsCount)} واحد کالا)
                </h4>
              </div>

              {intakeLog.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    ارزش کل ورودی: <strong className="text-slate-900 font-mono">{formatCurrency(totalValueAdded, settings.currency)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    title="چاپ رسید انبار"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>چاپ رسید انبار</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntakeLog([])}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md text-xs cursor-pointer"
                    title="پاکسازی لیست نشست"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {intakeLog.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                هنوز کالایی در این نشست اسکن نشده است. بارکد کالاها را اسکن کنید تا ورود آنها به انبار ثبت گردد.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">زمان</th>
                      <th className="py-2.5 px-3">عنوان کالا</th>
                      <th className="py-2.5 px-3">کد کالا / بارکد</th>
                      <th className="py-2.5 px-3 text-center">مقدار افزوده</th>
                      <th className="py-2.5 px-3 text-center">موجودی جدید انبار</th>
                      <th className="py-2.5 px-3">بهای تمام‌شده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {intakeLog.map(record => (
                      <tr key={record.id} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{record.time}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{record.itemName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {record.barcode || record.code}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                            +{toPersianDigits(record.quantityAdded)} {record.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          {toPersianDigits(record.newTotalStock)} {record.unit}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {formatCurrency(record.buyPrice, settings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            سیستم ثبت رسید انبارداری هوشمند هابینو با ثبت آنی در دفاتر کالا
          </span>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            اتمام و بستن رسید انبار
          </button>
        </div>
      </div>

      {/* Sub-modal: Create unknown item with scanned barcode */}
      {showCreateUnknownModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-slate-800 text-sm">تعریف و ورود کالای جدید با بارکد</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUnknownModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnknownItem} className="space-y-3 text-xs">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-mono flex items-center justify-between">
                <span>بارکد اسکن‌شده:</span>
                <strong className="text-sm">{unknownBarcode}</strong>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">نام کامل کالا *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="مثال: کابل شبکه Cat6 نگزنس"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">قیمت خرید (تومان)</label>
                  <input
                    type="number"
                    value={newItemBuyPrice || ''}
                    onChange={e => setNewItemBuyPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">قیمت فروش (تومان)</label>
                  <input
                    type="number"
                    value={newItemSellPrice || ''}
                    onChange={e => setNewItemSellPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">واحد سنجش</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تعداد ورودی اولیه</label>
                  <input
                    type="number"
                    min="1"
                    value={defaultBatchQty}
                    onChange={e => setDefaultBatchQty(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  ثبت کالا و ورود به انبار
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUnknownModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
