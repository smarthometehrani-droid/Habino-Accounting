import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAccounting } from '../lib/store';
import { InventoryItem, BarcodeScanRecord } from '../types';
import { formatCurrency, toPersianDigits } from '../lib/currencyUtils';
import {
  playScanBeep,
  playErrorBeep,
  detectBarcodeFormat,
  generateCode128Svg,
  getStoredBarcodeScanHistory,
  saveStoredBarcodeScanHistory,
  addBarcodeScanRecord
} from '../lib/barcodeEngine';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';
import { CompositeBarcodeScanner } from '../lib/scannerStrategy';
import { parseSayadQrCode, SayadCheckQrData } from '../lib/sayadBarcodeParser';
import { SayadCheckScannerModal } from './SayadCheckScannerModal';
import {
  ScanLine,
  Camera,
  CameraOff,
  Upload,
  Keyboard,
  Printer,
  History,
  Volume2,
  VolumeX,
  Zap,
  RefreshCw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  FileText,
  Copy,
  Trash2,
  Download,
  Share2,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  Laptop,
  Smartphone,
  SwitchCamera,
  FlipHorizontal,
  Monitor,
  ExternalLink,
  HelpCircle,
  ShieldAlert,
  Lock,
  CreditCard,
  Building2,
  Gauge
} from 'lucide-react';

interface BarcodeScannerStudioProps {
  onNavigateToInvoice?: (prefilledItemId?: string) => void;
  onNavigateToInventory?: (prefilledBarcode?: string) => void;
  onNavigateToChecks?: (prefilledSayad?: SayadCheckQrData) => void;
  embeddedMode?: boolean;
  onBarcodeDetected?: (code: string, matchedItem?: InventoryItem) => void;
}

export const BarcodeScannerStudio: React.FC<BarcodeScannerStudioProps> = ({
  onNavigateToInvoice,
  onNavigateToInventory,
  onNavigateToChecks,
  embeddedMode = false,
  onBarcodeDetected
}) => {
  const { inventory, updateInventoryItem, addInventoryItem, addInvoice, settings, clients } = useAccounting();

  // Active Main Tab
  const [activeTab, setActiveTabState] = useState<'camera' | 'sayad' | 'hardware' | 'upload' | 'generator' | 'history'>(() => {
    const saved = localStorage.getItem('habino_barcode_subtab');
    if (saved && ['camera', 'sayad', 'hardware', 'upload', 'generator', 'history'].includes(saved)) {
      return saved as any;
    }
    return 'camera';
  });

  const setActiveTab = (tab: 'camera' | 'sayad' | 'hardware' | 'upload' | 'generator' | 'history') => {
    setActiveTabState(tab);
    localStorage.setItem('habino_barcode_subtab', tab);
  };

  // Audio Beep Setting
  const [beepEnabled, setBeepEnabled] = useState<boolean>(() => {
    return localStorage.getItem('habino_barcode_beep') !== 'false';
  });

  // Continuous Scan Mode
  const [continuousMode, setContinuousMode] = useState<boolean>(true);

  // Scan History
  const [scanHistory, setScanHistory] = useState<BarcodeScanRecord[]>(() => getStoredBarcodeScanHistory());

  // Camera Scanner States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [showWindowsGuide, setShowWindowsGuide] = useState<boolean>(false);

  // Check if inside iframe (common in AI Studio sandbox preview)
  const isInsideIframe = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  // Device Detection: Mobile vs Laptop/Desktop
  const isMobileDevice = useMemo(() => {
    return typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Camera Mode: 'environment' (Mobile rear/back camera) vs 'user' (Laptop webcam / Front camera)
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>(() => {
    return isMobileDevice ? 'environment' : 'user';
  });

  // Mirror view toggle for laptop webcam (makes aiming barcodes in front of screen natural)
  const [isMirrored, setIsMirrored] = useState<boolean>(() => {
    return !isMobileDevice;
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const compositeScannerRef = useRef<CompositeBarcodeScanner>(new CompositeBarcodeScanner());
  const scanLoopActiveRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);

  // High-performance metrics
  const [scanLatencyMs, setScanLatencyMs] = useState<number | null>(null);
  const [activeEngineName, setActiveEngineName] = useState<string>('Native BarcodeDetector (شتاب‌یافته)');
  const [showSayadModal, setShowSayadModal] = useState<boolean>(false);

  // Last Scanned Result & Matched Inventory Item
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);
  const [scanSuccessFeedback, setScanSuccessFeedback] = useState<boolean>(false);

  // Parsed Sayad QR Data if current scanned code is a Sayad Check
  const sayadData: SayadCheckQrData | null = useMemo(() => {
    if (!lastScannedCode) return null;
    const parsed = parseSayadQrCode(lastScannedCode);
    return parsed.isValidSayadId ? parsed : null;
  }, [lastScannedCode]);

  // Hardware Scanner / Manual Input States
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [hardwareGunPulse, setHardwareGunPulse] = useState<boolean>(false);

  // Uploaded Image State
  const [isDecodingFile, setIsDecodingFile] = useState<boolean>(false);
  const [fileDecodeError, setFileDecodeError] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // Barcode Generator States
  const [genSelectedItemId, setGenSelectedItemId] = useState<string>('');
  const [genCustomCode, setGenCustomCode] = useState<string>('6261029384751');
  const [genCustomName, setGenCustomName] = useState<string>('روتر میکروتیک hEX S');
  const [genCustomPrice, setGenCustomPrice] = useState<number>(4200000);
  const [genPrintCopies, setGenPrintCopies] = useState<number>(4);

  // Quick Stock Adjustment Modal
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [stockDelta, setStockDelta] = useState<number>(1);
  const [stockActionSuccess, setStockActionSuccess] = useState<string | null>(null);

  // Quick Item Creation Modal when barcode is unknown
  const [showNewItemModal, setShowNewItemModal] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemBuyPrice, setNewItemBuyPrice] = useState<number>(0);
  const [newItemSellPrice, setNewItemSellPrice] = useState<number>(0);
  const [newItemStock, setNewItemStock] = useState<number>(10);
  const [newItemUnit, setNewItemUnit] = useState<string>('عدد');

  // Toggle Audio Beep
  const toggleBeep = () => {
    setBeepEnabled(prev => {
      const next = !prev;
      localStorage.setItem('habino_barcode_beep', String(next));
      return next;
    });
  };

  // Find item in inventory by code or barcode
  const findInventoryItem = useCallback((code: string): InventoryItem | null => {
    const clean = code.trim().toLowerCase();
    const found = inventory.find(i => {
      const itemCode = (i.code || '').trim().toLowerCase();
      const itemBarcode = (i.barcode || '').trim().toLowerCase();
      return itemCode === clean || itemBarcode === clean;
    });
    return found || null;
  }, [inventory]);

  // Handle successful code detection (from camera, gun, file, or manual)
  const handleCodeDetected = useCallback((code: string, source: 'camera' | 'usb_gun' | 'image_upload' | 'manual') => {
    const clean = code.trim();
    if (!clean) return;

    if (beepEnabled) {
      playScanBeep();
    }

    setLastScannedCode(clean);
    setScanSuccessFeedback(true);
    setTimeout(() => setScanSuccessFeedback(false), 2000);

    const item = findInventoryItem(clean);
    setMatchedItem(item);

    const record = addBarcodeScanRecord(
      clean,
      source,
      item?.id,
      item?.name,
      item?.sellPrice,
      item?.stock
    );

    setScanHistory(prev => [record, ...prev.slice(0, 49)]);

    if (onBarcodeDetected) {
      onBarcodeDetected(clean, item || undefined);
    }
  }, [beepEnabled, findInventoryItem, onBarcodeDetected]);

  // ----------------------------------------------------
  // Camera Management & ZXing Scanner
  // ----------------------------------------------------
  useEffect(() => {
    // Enumerate video devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          setVideoDevices(videoInputs);
        })
        .catch(err => {
          console.debug('Failed to list video devices:', err);
        });
    }
  }, []);

  const stopCamera = useCallback(() => {
    scanLoopActiveRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.debug('Error resetting reader:', err);
      }
      codeReaderRef.current = null;
    }

    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => track.stop());
      currentStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setTorchEnabled(false);
    setIsTorchSupported(false);
  }, []);

  const startCamera = useCallback(async (
    targetDeviceId?: string,
    targetMode?: 'environment' | 'user'
  ) => {
    stopCamera();
    setCameraError(null);
    setIsStartingCamera(true);

    const activeMode = targetMode || cameraMode;
    const activeDeviceId = targetDeviceId !== undefined ? targetDeviceId : selectedDeviceId;

    try {
      // 1. Check MediaDevices support and Secure Context (HTTPS or localhost)
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setCameraError('دسترسی به دوربین طبق قوانین مرورگر و سیستم‌عامل فقط در بستر امن HTTPS یا localhost مجاز است.');
        setIsStartingCamera(false);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('مرورگر شما یا محیط فعلی از دسترسی مستقیم به دوربین/وب‌کم پشتیبانی نمی‌کند.');
        setIsStartingCamera(false);
        return;
      }

      const hints = new Map();
      const formats = [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.ITF
      ];
      hints.set(2, formats); // DecodeHintType.POSSIBLE_FORMATS = 2

      const reader = new BrowserMultiFormatReader(hints, 250);
      codeReaderRef.current = reader;

      // Direct, robust constraints for Windows webcam / Android / iOS
      let stream: MediaStream | null = null;

      // Attempt 1: Target device ID if chosen
      if (activeDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: activeDeviceId } }
          });
        } catch (devErr) {
          console.warn('Exact deviceId failed, attempting ideal deviceId:', devErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { ideal: activeDeviceId } }
            });
          } catch {
            stream = null;
          }
        }
      }

      // Attempt 2: FacingMode requested (Mobile rear vs Laptop front)
      if (!stream && activeMode) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: activeMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } catch (modeErr) {
          console.warn('FacingMode with resolution failed, attempting relaxed facingMode:', modeErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: activeMode }
            });
          } catch {
            stream = null;
          }
        }
      }

      // Attempt 3: Ultimate universal fallback: simple `{ video: true }`
      if (!stream) {
        console.info('Attempting ultimate universal video stream request...');
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (!stream) {
        throw new Error('ناتوانی در دریافت استریم ویدیویی وب‌کم');
      }

      currentStreamRef.current = stream;

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as unknown as { torch?: boolean };
        setIsTorchSupported(!!capabilities.torch);
      }

      // Re-enumerate devices now that camera permission is granted to get real labels
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          setVideoDevices(videoInputs);
        }).catch(() => {});
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.setAttribute('muted', 'true');
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play warning:', playErr);
        }
      }

      setIsCameraActive(true);
      setIsStartingCamera(false);

      // Start high-performance sub-200ms scan loop using CompositeBarcodeScanner
      let lastScannedTime = 0;
      let lastDecodedText = '';
      scanLoopActiveRef.current = true;
      let lastFrameTime = 0;

      const scanLoop = async (timestamp: number) => {
        if (!scanLoopActiveRef.current || !videoRef.current) return;

        // Execute scan cycle every ~70ms for real-time sub-200ms detection without UI thread starvation
        if (timestamp - lastFrameTime >= 70) {
          lastFrameTime = timestamp;
          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const startTime = performance.now();
            const detectResult = await compositeScannerRef.current.detect(videoRef.current);
            const duration = Math.round(performance.now() - startTime);

            if (detectResult && detectResult.text) {
              const text = detectResult.text.trim();
              const now = Date.now();

              // Debounce same code to prevent continuous spamming (2.5 seconds pause between identical reads)
              if (!(text === lastDecodedText && now - lastScannedTime < 2500)) {
                lastScannedTime = now;
                lastDecodedText = text;
                setScanLatencyMs(duration);
                setActiveEngineName(detectResult.engineName);
                handleCodeDetected(text, 'camera');

                if (!continuousMode) {
                  stopCamera();
                  return;
                }
              }
            }
          }
        }

        if (scanLoopActiveRef.current) {
          animFrameIdRef.current = requestAnimationFrame(scanLoop);
        }
      };

      animFrameIdRef.current = requestAnimationFrame(scanLoop);
    } catch (err: unknown) {
      console.warn('Handled camera start issue:', err);
      setIsStartingCamera(false);
      setIsCameraActive(false);

      const errorObj = err as { name?: string; message?: string };
      const errName = errorObj?.name || '';
      const msg = errorObj?.message || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError('دسترسی به دوربین توسط مرورگر یا سیستم‌عامل ویندوز مسدود شده است. لطفاً تنظیمات مجوز دوربین را در مرورگر یا ویندوز فعال فرمایید.');
        setShowWindowsGuide(true);
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('هیچ دستگاه دوربینی (وب‌کم یا دوربین متصل) روی سیستم شما شناسایی نشد.');
        setShowWindowsGuide(true);
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError' || msg.includes('video source') || msg.includes('in use')) {
        setCameraError('وب‌کم در حال حاضر توسط نرم‌افزار دیگری در ویندوز (مانند Zoom، Teams، اسکایپ، یا تب دیگر مرورگر) در حال استفاده است یا درایور آن پاسخگو نیست.');
        setShowWindowsGuide(true);
      } else if (errName === 'OverconstrainedError') {
        setCameraError('قیدهای تنظیم رزولوشن یا لنز توسط وب‌کم پشتیبانی نشد. لطفاً مجدداً با حالت پیش‌فرض امتحان کنید.');
      } else if (errName === 'SecurityError') {
        setCameraError('محدودیت امنیتی فریم (iFrame) یا مرورگر مانع از فراخوانی وب‌کم شد. لطفاً برنامه را در برگه جدید (New Tab) باز کنید.');
        setShowWindowsGuide(true);
      } else {
        setCameraError(`عدم امکان برقراری ارتباط با وب‌کم: ${msg || 'خطای ناشناخته'}`);
      }
    }
  }, [cameraMode, selectedDeviceId, stopCamera, handleCodeDetected, continuousMode]);

  // Quick flip between front / back camera
  const handleFlipCamera = () => {
    const nextMode = cameraMode === 'environment' ? 'user' : 'environment';
    setCameraMode(nextMode);
    setSelectedDeviceId('');
    setIsMirrored(nextMode === 'user');
    startCamera('', nextMode);
  };

  // Switch to specific camera mode (mobile rear vs laptop webcam)
  const handleSwitchMode = (mode: 'environment' | 'user') => {
    setCameraMode(mode);
    setSelectedDeviceId('');
    setIsMirrored(mode === 'user');
    if (isCameraActive) {
      startCamera('', mode);
    }
  };

  // Device selection from dropdown
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId, cameraMode);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!currentStreamRef.current) return;
    const track = currentStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorchState = !torchEnabled;
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newTorchState }]
      });
      setTorchEnabled(newTorchState);
    } catch (err) {
      console.debug('Failed to toggle torch:', err);
    }
  };

  // Clean up camera on unmount or tab change
  useEffect(() => {
    if (activeTab !== 'camera' && isCameraActive) {
      stopCamera();
    }
  }, [activeTab, isCameraActive, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ----------------------------------------------------
  // Hardware Barcode Gun USB / Wireless Listener
  // ----------------------------------------------------
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in a standard text input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.id !== 'hardware-barcode-input-listener') {
        return;
      }

      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      // Barcode scanners type very rapidly (typically < 45ms per character)
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          const capturedCode = buffer.trim();
          buffer = '';
          setHardwareGunPulse(true);
          setTimeout(() => setHardwareGunPulse(false), 1200);
          handleCodeDetected(capturedCode, 'usb_gun');
        } else {
          buffer = '';
        }
        return;
      }

      // If typing interval is too slow (> 150ms), reset buffer unless it's the start
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
  }, [handleCodeDetected]);

  // ----------------------------------------------------
  // File / Image Barcode Decoding
  // ----------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingFile(true);
    setFileDecodeError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setUploadedImagePreview(dataUrl);

      try {
        const zxingReader = new BrowserMultiFormatReader();
        const result = await zxingReader.decodeFromImageUrl(dataUrl);
        if (result) {
          handleCodeDetected(result.getText(), 'image_upload');
        } else {
          setFileDecodeError('هیچ بارکد یا QR کد معتبری در تصویر شناسایی نشد.');
          if (beepEnabled) playErrorBeep();
        }
      } catch (err: unknown) {
        console.debug('Failed to decode image:', err);
        setFileDecodeError('بارکد در تصویر خوانده نشد. لطفاً از کیفیت و زاویه مناسب تصویر اطمینان حاصل کنید.');
        if (beepEnabled) playErrorBeep();
      } finally {
        setIsDecodingFile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // Stock Adjustment Handler
  // ----------------------------------------------------
  const handleAdjustStock = async (isIncrement: boolean) => {
    if (!matchedItem) return;
    const currentStock = matchedItem.stock || 0;
    const qty = Math.max(1, stockDelta);
    const newStock = isIncrement ? currentStock + qty : Math.max(0, currentStock - qty);

    await updateInventoryItem(matchedItem.id, { stock: newStock });
    setMatchedItem({ ...matchedItem, stock: newStock });
    setStockActionSuccess(`موجودی کالا با موفقیت به ${toPersianDigits(newStock)} ${matchedItem.unit} تغییر یافت.`);
    setTimeout(() => {
      setStockActionSuccess(null);
      setShowStockModal(false);
    }, 2000);
  };

  // ----------------------------------------------------
  // Quick Create New Item for Scanned Barcode
  // ----------------------------------------------------
  const handleCreateNewItemWithBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastScannedCode || !newItemName.trim()) return;

    const newItem = await addInventoryItem({
      name: newItemName.trim(),
      code: `SKU-${Date.now().toString().slice(-4)}`,
      barcode: lastScannedCode,
      unit: newItemUnit,
      buyPrice: newItemBuyPrice,
      sellPrice: newItemSellPrice,
      stock: newItemStock,
      type: 'good'
    });

    setMatchedItem(newItem);
    setShowNewItemModal(false);
    setScanSuccessFeedback(true);
    setTimeout(() => setScanSuccessFeedback(false), 2000);
  };

  // ----------------------------------------------------
  // Quick Create Invoice with Scanned Item
  // ----------------------------------------------------
  const handleQuickAddInvoice = async () => {
    if (!matchedItem) return;

    if (onNavigateToInvoice) {
      onNavigateToInvoice(matchedItem.id);
      return;
    }

    const firstClient = clients[0];
    const unitPrice = matchedItem.sellPrice || 0;
    const taxRate = settings.defaultTaxRate || 10;
    const tax = Math.round((unitPrice * taxRate) / 100);
    const grandTotal = unitPrice + tax;

    await addInvoice({
      invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
      clientId: firstClient ? firstClient.id : 'c1',
      clientName: firstClient ? firstClient.name : 'مشتری آزاد / بارکدی',
      type: 'sale',
      status: 'pending',
      template: 'professional',
      date: new Date().toLocaleDateString('fa-IR'),
      dueDate: new Date(Date.now() + 86400000 * 7).toLocaleDateString('fa-IR'),
      items: [
        {
          id: `item-${Date.now()}`,
          itemId: matchedItem.id,
          description: matchedItem.name,
          quantity: 1,
          unitPrice,
          discount: 0,
          taxRate,
          total: grandTotal
        }
      ],
      subtotal: unitPrice,
      totalDiscount: 0,
      totalTax: tax,
      grandTotal,
      amountPaid: 0,
      remainingAmount: grandTotal,
      notes: `فاکتور سریع ثبت‌شده از طریق اسکن بارکد (${lastScannedCode})`
    });

    alert(`فاکتور فروش جدید با کالای «${matchedItem.name}» با موفقیت ایجاد شد.`);
  };

  // ----------------------------------------------------
  // Barcode Label Print Handler
  // ----------------------------------------------------
  const handlePrintLabels = () => {
    window.print();
  };

  // Metadata of the current scanned code
  const codeMeta = useMemo(() => {
    if (!lastScannedCode) return null;
    return detectBarcodeFormat(lastScannedCode);
  }, [lastScannedCode]);

  // Generated SVG for Generator tab
  const generatedSvg = useMemo(() => {
    return generateCode128Svg(genCustomCode, 280, 85, true);
  }, [genCustomCode]);

  return (
    <div id="barcode-scanner-studio-container" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <ScanLine className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">ماژول بارکدخوان و اسکنر هوشمند هابینو</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                سیستم‌عامل تجارت و انبار
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              اسکن زنده دوربین با هوش مصنوعی، بارکدخوان‌های تفنگی USB، تولید برچسب‌های Code 128 و ایران‌کد اصناف
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="toggle-audio-beep-btn"
            onClick={toggleBeep}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              beepEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
            title="صدای بوق تأیید اسکن"
          >
            {beepEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4" />}
            <span>{beepEnabled ? 'صدای بیپ فعال' : 'بیپ بی‌صدا'}</span>
          </button>

          <button
            id="toggle-continuous-mode-btn"
            onClick={() => setContinuousMode(!continuousMode)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              continuousMode
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
            title="اسکن پیاپی برای انبارگردانی سریع"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>{continuousMode ? 'اسکن پیوسته انبار' : 'تک‌اسکن'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-medium">
        <button
          id="tab-camera-btn"
          onClick={() => setActiveTab('camera')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'camera'
              ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>اسکنر زنده کالا</span>
        </button>

        <button
          id="tab-sayad-btn"
          onClick={() => setActiveTab('sayad')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'sayad'
              ? 'border-purple-600 text-purple-700 font-bold bg-purple-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>اسکنر چک صیادی (QR)</span>
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">زیر ۲۰۰ms</span>
        </button>

        <button
          id="tab-hardware-btn"
          onClick={() => setActiveTab('hardware')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'hardware'
              ? 'border-blue-600 text-blue-700 font-bold bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          <span>بارکدخوان تفنگی USB</span>
          {hardwareGunPulse && (
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          )}
        </button>

        <button
          id="tab-upload-btn"
          onClick={() => setActiveTab('upload')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>بارگذاری عکس بارکد</span>
        </button>

        <button
          id="tab-generator-btn"
          onClick={() => setActiveTab('generator')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'generator'
              ? 'border-amber-600 text-amber-700 font-bold bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>تولید و چاپ برچسب کالا</span>
        </button>

        <button
          id="tab-history-btn"
          onClick={() => setActiveTab('history')}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'history'
              ? 'border-slate-800 text-slate-900 font-bold bg-slate-100 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>تاریخچه اسکن‌ها ({toPersianDigits(scanHistory.length)})</span>
        </button>
      </div>

      {/* Main Grid Content: Left Scanner / Right Matched Product Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Primary Action Area (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div id="camera-scan-card" className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-800">اسکن آنی بارکد با دوربین دستگاه</h2>
                      {scanLatencyMs !== null && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80 flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-emerald-600" />
                          <span>{toPersianDigits(scanLatencyMs)} میلی‌ثانیه ({activeEngineName})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">سازگار با انواع گوشی‌های هوشمند، تبلت و وب‌کم لپ‌تاپ با موتور شتاب‌یافته</p>
                  </div>
                </div>

                {/* Mobile / Laptop Mode Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('environment')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      cameraMode === 'environment'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="استفاده از دوربین پشت موبایل یا تبلت جهت اسکن مستقیم برچسب کالا"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>دوربین پشت (موبایل)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchMode('user')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      cameraMode === 'user'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="استفاده از وب‌کم داخلی لپ‌تاپ یا دوربین روبرو"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>وب‌کم لپ‌تاپ (روبرو)</span>
                  </button>
                </div>
              </div>

              {/* Viewfinder Window */}
              <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner">
                {/* Live Video Element - Always mounted to avoid zero-dimension and WebKit playback issues */}
                <video
                  ref={videoRef}
                  id="barcode-video-element"
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isMirrored ? 'scale-x-[-1]' : ''
                  }`}
                  playsInline
                  autoPlay
                  muted
                />

                {/* Idle / Inactive Overlay */}
                {!isCameraActive && (
                  <div className="absolute inset-0 bg-slate-950/95 z-10 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-lg">
                      {cameraMode === 'environment' ? (
                        <Smartphone className="w-8 h-8" />
                      ) : (
                        <Laptop className="w-8 h-8" />
                      )}
                    </div>

                    <div className="max-w-md">
                      <p className="text-sm font-bold text-slate-100">
                        {cameraMode === 'environment'
                          ? 'آماده‌سازی دوربین پشت گوشی (مناسب کالاها)'
                          : 'آماده‌سازی وب‌کم لپ‌تاپ (اسکن از روبرو)'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {cameraMode === 'environment'
                          ? 'بارکد کالا یا فاکتور را در کادر دوربین موبایل قرار دهید تا به طور خودکار شناسایی شود.'
                          : 'کالا را روبروی وب‌کم لپ‌تاپ بگیرید. برای سهولت کار قابلیت آینه‌ای نیز فعال است.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        id="start-camera-btn"
                        disabled={isStartingCamera}
                        onClick={() => startCamera()}
                        className={`px-6 py-3 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                          isStartingCamera
                            ? 'bg-slate-700 cursor-not-allowed opacity-80'
                            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-900/30'
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>
                          {isStartingCamera
                            ? 'در حال برقراری ارتباط با وب‌کم...'
                            : cameraMode === 'environment'
                            ? 'روشن کردن دوربین پشت موبایل'
                            : 'روشن کردن وب‌کم ویندوز / لپ‌تاپ'}
                        </span>
                      </button>

                      {/* Direct Test with simple video true */}
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          navigator.mediaDevices?.getUserMedia({ video: true })
                            .then(stream => {
                              currentStreamRef.current = stream;
                              if (videoRef.current) {
                                videoRef.current.srcObject = stream;
                                videoRef.current.play();
                              }
                              setIsCameraActive(true);
                              setCameraError(null);
                            })
                            .catch(err => {
                              console.warn('Direct webcam test failed:', err);
                              setCameraError(`خطای وب‌کم: ${err?.message || 'مجوز داده نشد'}`);
                              setShowWindowsGuide(true);
                            });
                        }}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="تست سریع و مستقیم وب‌کم ویندوز با فراخوانی مستقیم API سیستم‌عامل"
                      >
                        <Monitor className="w-4 h-4 text-blue-400" />
                        <span>تست مستقیم وب‌کم</span>
                      </button>
                    </div>

                    {/* iFrame Notice if inside preview frame */}
                    {isInsideIframe && (
                      <div className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-800/60 px-3.5 py-2 rounded-xl flex items-center gap-2 max-w-md text-right">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          نکته: در محیط پیش‌نمایش، به دلیل محدودیت فریم امنیتی، در صورت عدم نمایش پاپ‌آپ مجوز مرورگر، برنامه را با دکمه بالا در برگه جدید (New Tab) باز فرمایید.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Viewfinder Overlays & Reticle */}
                {isCameraActive && (
                  <>
                    {/* Targeting Laser Line */}
                    <div className="absolute inset-x-12 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite] pointer-events-none z-10" />

                    {/* Corner Reticles */}
                    <div className="absolute inset-8 pointer-events-none flex flex-col justify-between z-10">
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      </div>
                      <div className="flex justify-between">
                        <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      </div>
                    </div>

                    {/* Camera Status Pill */}
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 flex items-center gap-2 text-[11px] text-emerald-400 font-mono z-20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{cameraMode === 'environment' ? 'REAR CAM' : 'LAPTOP WEBCAM'}</span>
                    </div>

                    {/* Fast Overlay Controls (Top Right) */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                      {/* Flip Camera Button */}
                      <button
                        type="button"
                        onClick={handleFlipCamera}
                        className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700/80 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        title="چرخش و تغییر دوربین بین پشت و جلو"
                      >
                        <SwitchCamera className="w-4 h-4 text-emerald-400" />
                        <span className="hidden sm:inline">چرخش دوربین</span>
                      </button>

                      {/* Mirror Toggle (especially for laptop webcam) */}
                      <button
                        type="button"
                        onClick={() => setIsMirrored(!isMirrored)}
                        className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                          isMirrored
                            ? 'bg-blue-600/90 border-blue-500 text-white'
                            : 'bg-slate-950/80 hover:bg-slate-900 border-slate-700/80 text-slate-300'
                        }`}
                        title="حالت آینه‌ای برای مشاهده طبیعی کالا روبروی وب‌کم"
                      >
                        <FlipHorizontal className="w-4 h-4" />
                        <span className="hidden sm:inline">آینه</span>
                      </button>

                      {/* Torch Flashlight Toggle */}
                      {isTorchSupported && (
                        <button
                          id="toggle-torch-btn"
                          type="button"
                          onClick={toggleTorch}
                          className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                            torchEnabled
                              ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                              : 'bg-slate-950/80 hover:bg-slate-900 border-slate-700/80 text-slate-300'
                          }`}
                          title="روشن/خاموش کردن چراغ قوه موبایل"
                        >
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className="hidden sm:inline">{torchEnabled ? 'فلاش روشن' : 'فلاش'}</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Camera Error Alert & Windows Troubleshooting */}
              {cameraError && (
                <div className="rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-900 text-xs overflow-hidden shadow-xs">
                  <div className="p-4 flex items-start justify-between gap-3 border-b border-rose-200/70">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-rose-950 text-sm">وضعیت وب‌کم / دوربین در سیستم شما</div>
                        <div className="mt-1 leading-relaxed text-rose-800">{cameraError}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startCamera()}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                      >
                        تلاش مجدد
                      </button>
                    </div>
                  </div>

                  {/* Windows Specific Step-by-Step Guide */}
                  <div className="p-4 bg-white/80 space-y-3 text-slate-700">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>راهنمای ۳ مرحله‌ای رفع عدم نمایش وب‌کم در ویندوز ۱۰ و ۱۱:</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Step 1: Localhost vs Local IP / HTTPS Security */}
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                          <span>۱. تست محلی (Localhost در برابر IP شبکه)</span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          در تست لوکال، آدرس حتماً باید <span className="font-mono bg-amber-200/80 px-1 rounded text-amber-950">http://localhost:3000</span> باشد. اگر با IP شبکه (مثل <span className="font-mono text-amber-950">192.168.x.x</span>) باز کنید، مرورگر به دلایل امنیتی وب‌کم را کاملاً مسدود می‌کند و پنجره مجوز باز نمی‌شود.
                        </p>
                      </div>

                      {/* Step 2: Browser Lock Icon */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                          <Lock className="w-3.5 h-3.5 text-blue-600" />
                          <span>۲. آیکون قفل کنار آدرس مرورگر</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          روی آیکون قفل یا تنظیمات سایت (کنار URL بالای صفحه) کلیک کنید. در قسمت Camera گزینه را از Block به <strong className="text-emerald-700">Allow (مجاز)</strong> تغییر دهید و صفحه را تازه‌سازی کنید.
                        </p>
                      </div>

                      {/* Step 3: Windows Privacy Settings */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                          <Monitor className="w-3.5 h-3.5 text-purple-600" />
                          <span>۳. حریم خصوصی ویندوز (Privacy)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          در ویندوز به <span className="font-mono bg-slate-200 px-1 rounded text-slate-800">Settings &gt; Privacy &gt; Camera</span> بروید و کلید <strong className="text-slate-900">Let desktop apps access your camera</strong> را روی On (روشن) بگذارید.
                        </p>
                      </div>

                      {/* Step 4: Hardware Switch / Another App */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                          <span>۴. کلید سخت‌افزاری یا برنامه موازی</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          برخی لپ‌تاپ‌های لنوو، ایسوس و اچ‌پی کلید فیزیکی یا کلید Fn برای قطع وب‌کم دارند یا برنامه‌ای مثل تلگرام، واتساپ یا تب دیگری وب‌کم را درگیر نگه داشته است.
                        </p>
                      </div>
                    </div>

                    {/* Open in New Tab action for iframe sandbox permissions */}
                    {isInsideIframe && (
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-500">
                          اگر پیام درخواست مجوز را در کادر فعلی مشاهده نمی‌کنید، اجرای برنامه در برگه جداگانه مرورگر تمامی محدودیت‌ها را برطرف می‌کند:
                        </span>
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>باز کردن در برگه جدید (New Tab)</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Camera Controls & Device Selector */}
              {isCameraActive && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 text-xs">
                    {videoDevices.length > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 whitespace-nowrap">انتخاب سورس لنز:</span>
                        <select
                          id="select-camera-device"
                          value={selectedDeviceId}
                          onChange={(e) => handleSelectDevice(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        >
                          <option value="">انتخاب خودکار بر اساس حالت ({cameraMode === 'environment' ? 'پشت' : 'وب‌کم'})</option>
                          {videoDevices.map((d, idx) => (
                            <option key={d.deviceId || idx} value={d.deviceId}>
                              {d.label || `دوربین شماره ${toPersianDigits(idx + 1)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      {cameraMode === 'environment' ? (
                        <>
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>حالت بهینه‌شده برای موبایل: فاصله ۱۰ تا ۲۰ سانتی‌متر از بارکد</span>
                        </>
                      ) : (
                        <>
                          <Laptop className="w-3.5 h-3.5 text-blue-600" />
                          <span>حالت بهینه‌شده برای لپ‌تاپ: بارکد کالا را روبروی لنز وب‌کم بگیرید</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    id="stop-camera-btn"
                    onClick={stopCamera}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CameraOff className="w-4 h-4 text-slate-500" />
                    <span>خاموش کردن دوربین</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: Sayad Check Scanner (m-baz-06) */}
          {activeTab === 'sayad' && (
            <div id="sayad-scan-tab-card" className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">اسکنر بارکد دوبعدی چک‌های صیادی (QR Sayad)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">استخراج خودکار شناسه ۱۶ رقمی، بانک صادرکننده، شماره شبا و سررسید</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                  <span>سرعت اسکن زیر ۲۰۰ میلی‌ثانیه</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
                <div className="text-xs text-purple-900 font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>راهنمای اسکن چک‌های بنفش صیادی:</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  کد QR مندرج در گوشه پایین برگه چک صیادی را روبروی دوربین قرار دهید. سیستم با موتور بهینه‌شده، شناسه ۱۶ رقمی را در کمتر از ۲۰۰ میلی‌ثانیه خوانده، ساختار آن را اعتبارسنجی نموده و مستقیماً به ماژول چک‌ها متصل می‌کند.
                </p>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSayadModal(true)}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>باز کردن دوربین اختصاصی اسکن چک صیاد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('camera');
                      startCamera();
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ScanLine className="w-4 h-4" />
                    <span>اسکن در همین صفحه با وب‌کم</span>
                  </button>
                </div>
              </div>

              {/* Quick Sayad Manual Lookup */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700">یا ورود دستی شناسه ۱۶ رقمی صیاد:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={16}
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualCodeInput.trim()) {
                        handleCodeDetected(manualCodeInput.trim(), 'manual');
                        setManualCodeInput('');
                      }
                    }}
                    placeholder="مثال: 1234567890123456"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono tracking-widest focus:ring-2 focus:ring-purple-500 outline-hidden dir-ltr text-center"
                  />
                  <button
                    onClick={() => {
                      if (manualCodeInput.trim()) {
                        handleCodeDetected(manualCodeInput.trim(), 'manual');
                        setManualCodeInput('');
                      }
                    }}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>بررسی</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Hardware Barcode Gun USB */}
          {activeTab === 'hardware' && (
            <div id="hardware-gun-card" className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-800">اسکنر تفنگی سخت‌افزاری (USB و بلوتوث)</h2>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  hardwareGunPulse
                    ? 'bg-blue-600 text-white border-blue-700 scale-105'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>آماده شلیک بارکدخوان</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2 leading-relaxed">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>شنودگر جهانی سخت‌افزاری فعال است:</span>
                </div>
                <p>
                  بارکدخوان‌های متداول فروشگاهی و انبارداری (Datalogic, Honeywell, Zebra, Symcode) پس از شلیک پرتو، اطلاعات بارکد را با سرعت بالا تایپ کرده و در انتها کلید Enter را ارسال می‌کنند.
                </p>
                <p className="text-blue-700 font-medium">
                  نیازی به کلیک یا فوکوس در فیلد خاصی نیست؛ کافیست بارکد را مقابل دستگاه شلیک کنید! سیستم‌عامل هابینو خودکار آن را ثبت و شناسایی می‌کند.
                </p>
              </div>

              {/* Manual Input Fallback */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700">یا ورود دستی بارکد / شناسه کالا (SKU):</label>
                <div className="flex gap-2">
                  <input
                    id="hardware-barcode-input-listener"
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualCodeInput.trim()) {
                        handleCodeDetected(manualCodeInput.trim(), 'manual');
                        setManualCodeInput('');
                      }
                    }}
                    placeholder="مثال: 6261029384751 یا NET-03..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <button
                    id="manual-search-barcode-btn"
                    onClick={() => {
                      if (manualCodeInput.trim()) {
                        handleCodeDetected(manualCodeInput.trim(), 'manual');
                        setManualCodeInput('');
                      }
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Search className="w-4 h-4" />
                    <span>بررسی</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: File / Image Upload */}
          {activeTab === 'upload' && (
            <div id="image-upload-card" className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-800">بارگذاری تصویر بارکد یا فاکتور</h2>
              </div>

              <label
                id="barcode-dropzone"
                htmlFor="barcode-file-input"
                className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-indigo-50/20 group"
              >
                <input
                  id="barcode-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-all mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="text-sm font-bold text-slate-800">تصویر بارکد را اینجا بکشید یا کلیک کنید</div>
                <div className="text-xs text-slate-500 mt-1">پشتیبانی از فرمت‌های PNG, JPG, WEBP تا سقف ۱۰ مگابایت</div>
              </label>

              {isDecodingFile && (
                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال پردازش و استخراج بارکد از تصویر...</span>
                </div>
              )}

              {fileDecodeError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{fileDecodeError}</span>
                </div>
              )}

              {uploadedImagePreview && (
                <div className="mt-3 p-3 bg-slate-100 rounded-xl flex items-center justify-center">
                  <img
                    src={uploadedImagePreview}
                    alt="Uploaded Barcode"
                    className="max-h-48 object-contain rounded-lg border border-slate-200"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Barcode Generator & Printable Label */}
          {activeTab === 'generator' && (
            <div id="barcode-generator-card" className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base font-bold text-slate-800">تولیدکننده بارکد استاندارد و چاپ لیبل</h2>
                </div>
                <button
                  id="print-label-btn"
                  onClick={handlePrintLabels}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ برچسب‌ها</span>
                </button>
              </div>

              {/* Form to select item or custom code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">انتخاب از انبار کالاهای هابینو:</label>
                  <select
                    id="select-item-for-barcode"
                    value={genSelectedItemId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setGenSelectedItemId(id);
                      const itm = inventory.find(i => i.id === id);
                      if (itm) {
                        setGenCustomCode(itm.barcode || itm.code || 'SKU-1001');
                        setGenCustomName(itm.name);
                        setGenCustomPrice(itm.sellPrice);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 outline-hidden"
                  >
                    <option value="">-- کالای دلخواه / دستی --</option>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">کد بارکد (EAN-13 یا Code 128):</label>
                  <input
                    type="text"
                    value={genCustomCode}
                    onChange={(e) => setGenCustomCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">عنوان کالا روی برچسب:</label>
                  <input
                    type="text"
                    value={genCustomName}
                    onChange={(e) => setGenCustomName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">قیمت مصرف‌کننده (تومان):</label>
                  <input
                    type="number"
                    value={genCustomPrice}
                    onChange={(e) => setGenCustomPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Printable Sticker Label Preview */}
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-700 mb-2">پیش‌نمایش لیبل چاپی برچسب کالا:</div>
                <div className="p-6 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <div
                    id="printable-barcode-label"
                    className="w-72 bg-white rounded-xl p-4 border border-slate-300 shadow-md text-center space-y-2"
                  >
                    <div className="text-[11px] font-bold text-slate-700 truncate">{genCustomName}</div>
                    <div
                      className="flex items-center justify-center py-1"
                      dangerouslySetInnerHTML={{ __html: generatedSvg }}
                    />
                    <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-1.5">
                      <span>{settings.name || 'پلتفرم تجارت هابینو'}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(genCustomPrice, 'IRT')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Scan History Logs */}
          {activeTab === 'history' && (
            <div id="barcode-history-card" className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-800" />
                  <h2 className="text-base font-bold text-slate-800">تاریخچه اسکن‌ها و گزارش انبارگردانی</h2>
                </div>

                {scanHistory.length > 0 && (
                  <button
                    id="clear-barcode-history-btn"
                    onClick={() => {
                      if (window.confirm('آیا از پاک کردن کل تاریخچه اسکن‌های این نشست اطمینان دارید؟')) {
                        saveStoredBarcodeScanHistory([]);
                        setScanHistory([]);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>پاکسازی نشست</span>
                  </button>
                )}
              </div>

              {scanHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  هنوز هیچ بارکدی در این نشست اسکن نشده است.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">زمان</th>
                        <th className="py-2.5 px-3">بارکد</th>
                        <th className="py-2.5 px-3">منبع</th>
                        <th className="py-2.5 px-3">کالای تطبیق‌یافته</th>
                        <th className="py-2.5 px-3">قیمت فروش</th>
                        <th className="py-2.5 px-3">موجودی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scanHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 font-mono">{rec.timestamp}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{rec.code}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {rec.source === 'camera' && 'دوربین'}
                              {rec.source === 'usb_gun' && 'بارکدخوان تفنگی'}
                              {rec.source === 'image_upload' && 'تصویر'}
                              {rec.source === 'manual' && 'دستی'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {rec.matchedItemName || (
                              <span className="text-amber-600">کالای ثبت‌نشده</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {rec.price ? formatCurrency(rec.price, 'IRT') : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            {rec.stock !== undefined ? (
                              <span className="font-semibold text-emerald-700">{toPersianDigits(rec.stock)}</span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Current Scanned Item & Instant Business Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Result Card */}
          <div
            id="scanned-result-detail-card"
            className={`bg-white rounded-2xl p-6 border shadow-sm transition-all ${
              scanSuccessFeedback ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200/90'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>نتیجه آخرین اسکن</span>
              </h3>

              {lastScannedCode && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(lastScannedCode);
                    alert('بارکد کپی شد!');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                  title="کپی بارکد"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {lastScannedCode ? (
              <div className="space-y-4">
                {/* Code & Symbology Meta */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="text-[11px] text-slate-500">کد اسکن‌شده:</div>
                  <div className="text-lg font-mono font-bold text-slate-900 tracking-wider mt-0.5">
                    {lastScannedCode}
                  </div>
                  {codeMeta && (
                    <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{codeMeta.label}</span>
                      <span className="text-slate-500">{codeMeta.countryOrStandard}</span>
                    </div>
                  )}
                </div>

                {/* If Scanned Code is a Sayad Check QR code */}
                {sayadData ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-purple-50/90 border border-purple-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-purple-700" />
                          <span>چک معتبر صیادی کشف شد</span>
                        </span>
                        <span className="text-[10px] font-bold bg-purple-200/80 text-purple-800 px-2 py-0.5 rounded-full">
                          تأیید اصالت ۱۶ رقمی
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-purple-100 text-center space-y-1">
                        <div className="text-[11px] text-slate-500">شناسه ۱۶ رقمی صیاد:</div>
                        <div className="font-mono text-base font-extrabold text-purple-950 tracking-widest dir-ltr">
                          {sayadData.formattedSayadId || sayadData.sayadId}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-slate-500">بانک صادرکننده: </span>
                          <span className="font-bold text-purple-900">{sayadData.bankName || 'مرکزی / شتاب'}</span>
                        </div>
                        {sayadData.amount ? (
                          <div>
                            <span className="text-slate-500">مبلغ چک: </span>
                            <span className="font-bold text-emerald-800">{formatCurrency(sayadData.amount, 'IRT')}</span>
                          </div>
                        ) : null}
                        {sayadData.dueDate ? (
                          <div>
                            <span className="text-slate-500">تاریخ سررسید: </span>
                            <span className="font-bold text-slate-800">{sayadData.dueDate}</span>
                          </div>
                        ) : null}
                        {sayadData.iban ? (
                          <div className="col-span-2">
                            <span className="text-slate-500">شماره شبا: </span>
                            <span className="font-mono text-[11px] text-slate-800">{sayadData.iban}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      id="save-sayad-check-btn"
                      onClick={() => {
                        if (onNavigateToChecks) {
                          onNavigateToChecks(sayadData);
                        } else {
                          navigator.clipboard.writeText(sayadData.sayadId);
                          alert(`شناسه صیادی ${sayadData.sayadId} کپی شد. به ماژول چک‌ها مراجعه فرمایید.`);
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>انتقال و ثبت در دفتر چک‌های صیادی</span>
                    </button>
                  </div>
                ) : matchedItem ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900">{matchedItem.name}</span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          موجود در انبار
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-slate-500">کد کالا: </span>
                          <span className="font-mono font-bold text-slate-800">{matchedItem.code}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">موجودی فعلی: </span>
                          <span className="font-bold text-emerald-800">{toPersianDigits(matchedItem.stock)} {matchedItem.unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">قیمت فروش: </span>
                          <span className="font-bold text-slate-900">{formatCurrency(matchedItem.sellPrice, 'IRT')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">قیمت خرید: </span>
                          <span className="text-slate-700">{formatCurrency(matchedItem.buyPrice, 'IRT')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions on Matched Item */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        id="quick-add-to-invoice-btn"
                        onClick={handleQuickAddInvoice}
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-4 h-4" />
                        <span>صدور فاکتور کالا</span>
                      </button>

                      <button
                        id="open-stock-modal-btn"
                        onClick={() => setShowStockModal(true)}
                        className="w-full py-2.5 px-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Layers className="w-4 h-4" />
                        <span>ورود / خروج انبار</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* When item is unknown */
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>این بارکد در انبار کالاها ثبت نشده است</span>
                      </div>
                      <p className="text-amber-800 mt-1">
                        می‌توانید بلافاصله این بارکد را به عنوان کالای جدید در سیستم تعریف کنید.
                      </p>
                    </div>

                    <button
                      id="create-new-item-from-barcode-btn"
                      onClick={() => {
                        setNewItemName('');
                        setNewItemBuyPrice(0);
                        setNewItemSellPrice(0);
                        setNewItemStock(10);
                        setShowNewItemModal(true);
                      }}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>تعریف کالای جدید با این بارکد</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <ScanLine className="w-8 h-8 mx-auto text-slate-300" />
                <div className="text-xs">بارکدی اسکن نشده است. دوربین را فعال کرده یا بارکدخوان تفنگی را شلیک کنید.</div>
              </div>
            )}
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm text-xs text-slate-600 space-y-2.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>استانداردهای بارکد پشتیبانی‌شده در هابینو</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li><strong className="text-slate-700">ایران‌کد (GS1 IRAN):</strong> پیش‌شماره ملی ۶۲۶ کالاهای تولید داخل.</li>
              <li><strong className="text-slate-700">ایران‌کد اصناف:</strong> شناسه ۱۶ رقمی کالا و خدمات وزارت صمت.</li>
              <li><strong className="text-slate-700">کدهای لجستیک Code 128 / Code 39:</strong> بارکدهای خطی انبارداری و ردیابی.</li>
              <li><strong className="text-slate-700">کدهای QR صیادی و تراکنش:</strong> اتصال مستقیم به چک‌ها و اسناد.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {showStockModal && matchedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">تنظیم موجودی انبار: {matchedItem.name}</h3>
            <p className="text-xs text-slate-500">
              موجودی فعلی: <span className="font-bold text-slate-900">{toPersianDigits(matchedItem.stock)} {matchedItem.unit}</span>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">تعداد تغییر (ورود یا خروج):</label>
              <input
                type="number"
                min="1"
                value={stockDelta}
                onChange={(e) => setStockDelta(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {stockActionSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-lg font-medium">
                {stockActionSuccess}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                id="stock-in-btn"
                onClick={() => handleAdjustStock(true)}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                + ثبت ورود به انبار
              </button>
              <button
                id="stock-out-btn"
                onClick={() => handleAdjustStock(false)}
                className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
              >
                - ثبت خروج از انبار
              </button>
            </div>

            <button
              onClick={() => setShowStockModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl mt-2"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* New Item Creation with Barcode Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewItemWithBarcode}
            className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900">ثبت کالای جدید با بارکد اسکن‌شده</h3>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800">
              بارکد: {lastScannedCode}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">نام کالا / خدمت:</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="مثال: روتر سیسکو یا کابل شبکه Cat6"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">قیمت خرید (تومان):</label>
                  <input
                    type="number"
                    value={newItemBuyPrice}
                    onChange={(e) => setNewItemBuyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">قیمت فروش (تومان):</label>
                  <input
                    type="number"
                    value={newItemSellPrice}
                    onChange={(e) => setNewItemSellPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">موجودی اولیه:</label>
                  <input
                    type="number"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">واحد سنجش:</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="عدد / دستگاه / متر"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="submit"
                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                ثبت در انبار
              </button>
              <button
                type="button"
                onClick={() => setShowNewItemModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sayad Check Scanner Dedicated Modal (m-baz-06) */}
      {showSayadModal && (
        <SayadCheckScannerModal
          isOpen={showSayadModal}
          onClose={() => setShowSayadModal(false)}
          onScanComplete={(parsedSayad) => {
            setShowSayadModal(false);
            setLastScannedCode(parsedSayad.sayadId);
            setScanSuccessFeedback(true);
            setTimeout(() => setScanSuccessFeedback(false), 1500);
            if (onNavigateToChecks) {
              onNavigateToChecks(parsedSayad);
            }
          }}
        />
      )}
    </div>
  );
};

export default BarcodeScannerStudio;
