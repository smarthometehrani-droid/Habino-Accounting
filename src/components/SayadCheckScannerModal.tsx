import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Camera, CameraOff, X, Zap, ScanLine, AlertCircle, Smartphone, Laptop, SwitchCamera, CheckCircle2, Copy, ArrowRight, ShieldCheck, CreditCard, Building2, Calendar, Hash } from 'lucide-react';
import { playScanBeep, playErrorBeep } from '../lib/barcodeEngine';
import { CompositeBarcodeScanner, BarcodeScanResult } from '../lib/scannerStrategy';
import { parseSayadQrCode, SayadCheckQrData, formatSayadId, validateSayadIdStructure } from '../lib/sayadBarcodeParser';
import { toPersianDigits, formatCurrency } from '../lib/currencyUtils';

interface SayadCheckScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSayadDetected?: (data: SayadCheckQrData) => void;
  onScanComplete?: (data: SayadCheckQrData) => void;
  defaultMode?: 'environment' | 'user';
}

export const SayadCheckScannerModal: React.FC<SayadCheckScannerModalProps> = ({
  isOpen,
  onClose,
  onSayadDetected,
  onScanComplete,
  defaultMode
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [activeEngine, setActiveEngine] = useState<string>('BarcodeDetector API');
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  // Scanned result before user confirms or auto-confirms
  const [scannedResult, setScannedResult] = useState<SayadCheckQrData | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const isMobileDevice = useMemo(() => {
    return typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>(() => {
    if (defaultMode) return defaultMode;
    return isMobileDevice ? 'environment' : 'user';
  });

  const [isMirrored, setIsMirrored] = useState<boolean>(() => !isMobileDevice);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<CompositeBarcodeScanner | null>(null);
  const scanningLoopRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);

  // Enumerate video devices
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  const stopCamera = useCallback(() => {
    isScanningActiveRef.current = false;
    if (scanningLoopRef.current) {
      cancelAnimationFrame(scanningLoopRef.current);
      scanningLoopRef.current = null;
    }

    if (scannerRef.current) {
      scannerRef.current.reset();
      scannerRef.current = null;
    }

    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => track.stop());
      currentStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setTorchEnabled(false);
    setIsTorchSupported(false);
  }, []);

  const handleDetectedCode = useCallback((rawText: string, scanResult?: BarcodeScanResult) => {
    const sayadData = parseSayadQrCode(rawText);

    if (scanResult) {
      setLastLatencyMs(scanResult.detectionSpeedMs);
      setActiveEngine(scanResult.engine === 'native_barcode_detector' ? 'Barcode Detection API (سخت‌افزاری)' : 'ZXing Engine');
    }

    if (sayadData && sayadData.isValidSayadId) {
      // Audio Affirmation
      playScanBeep();

      // Haptic Vibration feedback on mobile
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([40, 60, 40]);
        }
      } catch {}

      setScannedResult(sayadData);
    } else {
      // Scanned non-Sayad code or invalid format
      playErrorBeep();
      setCameraError('بارکد اسکن‌شده فاقد شناسه معتبر ۱۶ رقمی صیادی است. لطفاً بارکد QR روی برگ چک صیاد را اسکن نمایید.');
      setTimeout(() => setCameraError(null), 3500);
    }
  }, []);

  // Main camera start & scanning loop
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedResult(null);
      return;
    }

    let isSubscribed = true;
    setCameraError(null);
    setScannedResult(null);

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isSubscribed) setCameraError('مرورگر یا محیط فعلی از دسترسی مستقیم به دوربین پشتیبانی نمی‌کند.');
          return;
        }

        scannerRef.current = new CompositeBarcodeScanner();
        await scannerRef.current.getBestStrategy();
        setActiveEngine(scannerRef.current.getActiveStrategyName());

        let stream: MediaStream | null = null;

        // Attempt 1: Target selected device ID
        if (selectedDeviceId) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: selectedDeviceId } }
            });
          } catch {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { ideal: selectedDeviceId } }
              });
            } catch {
              stream = null;
            }
          }
        }

        // Attempt 2: FacingMode with resolution
        if (!stream && cameraMode) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: cameraMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
          } catch {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraMode }
              });
            } catch {
              stream = null;
            }
          }
        }

        // Attempt 3: Ultimate universal video: true (ideal for laptop webcams)
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!stream) {
          throw new Error('ناتوانی در دریافت تصویر از دوربین');
        }

        if (!isSubscribed) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        currentStreamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as unknown as { torch?: boolean };
          setIsTorchSupported(!!capabilities.torch);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.setAttribute('muted', 'true');
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('SayadScanner video play warning:', playErr);
          }
        }

        // Begin ultra-fast scanning loop (<200ms target)
        isScanningActiveRef.current = true;
        let lastScanTimestamp = 0;

        const scanLoop = async () => {
          if (!isScanningActiveRef.current || !videoRef.current) return;

          const now = performance.now();
          // Scan every ~60-80ms for instant detection while saving battery
          if (now - lastScanTimestamp > 70 && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
            lastScanTimestamp = now;

            if (scannerRef.current) {
              try {
                const result = await scannerRef.current.scanFrame(videoRef.current);
                if (result && result.text) {
                  isScanningActiveRef.current = false;
                  handleDetectedCode(result.text, result);
                  return;
                }
              } catch (scanErr) {
                console.debug('Scan frame error:', scanErr);
              }
            }
          }

          if (isScanningActiveRef.current) {
            scanningLoopRef.current = requestAnimationFrame(scanLoop);
          }
        };

        scanningLoopRef.current = requestAnimationFrame(scanLoop);

      } catch (err: any) {
        if (!isSubscribed) return;
        console.error('Sayad camera error:', err);
        setCameraError(err.message || 'خطا در فعال‌سازی دوربین. دسترسی به دوربین را در مرورگر مجاز نمایید.');
      }
    };

    startCamera();

    return () => {
      isSubscribed = false;
      stopCamera();
    };
  }, [isOpen, selectedDeviceId, cameraMode, handleDetectedCode, stopCamera]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!currentStreamRef.current || !isTorchSupported) return;
    const track = currentStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchEnabled;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchEnabled(nextState);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Switch Camera Front / Rear
  const switchCamera = () => {
    setCameraMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    setIsMirrored(prev => !prev);
  };

  // Confirm and insert
  const handleConfirmSayad = () => {
    if (scannedResult) {
      if (onSayadDetected) onSayadDetected(scannedResult);
      if (onScanComplete) onScanComplete(scannedResult);
      onClose();
    }
  };

  // Scan again
  const handleScanAgain = () => {
    setScannedResult(null);
    setCameraError(null);
    isScanningActiveRef.current = true;
    if (videoRef.current) {
      const scanLoop = async () => {
        if (!isScanningActiveRef.current || !videoRef.current) return;
        if (scannerRef.current && videoRef.current.readyState >= 2) {
          try {
            const result = await scannerRef.current.scanFrame(videoRef.current);
            if (result && result.text) {
              isScanningActiveRef.current = false;
              handleDetectedCode(result.text, result);
              return;
            }
          } catch {}
        }
        if (isScanningActiveRef.current) {
          scanningLoopRef.current = requestAnimationFrame(scanLoop);
        }
      };
      scanningLoopRef.current = requestAnimationFrame(scanLoop);
    }
  };

  // Copy 16 digits
  const copySayadId = () => {
    if (!scannedResult) return;
    navigator.clipboard.writeText(scannedResult.sayadId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">اسکنر هوشمند بارکد دوبعدی چک صیاد</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {lastLatencyMs ? `${toPersianDigits(lastLatencyMs)}ms` : '< ۲۰۰ms'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                کادر QR روی برگ چک صیادی را مقابل لنز دوربین موبایل بگیرید
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Viewport / Scanner View */}
        <div className="relative bg-black flex-1 min-h-[280px] max-h-[400px] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
            playsInline
            muted
            autoPlay
          />

          {/* Sayad Check Optical Framing Overlay */}
          {!scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Outer dimmed mask with transparent center */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl border-2 border-amber-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
                {/* 4 Corner Markers */}
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl"></div>
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl"></div>

                {/* Laser scan line animation */}
                <div className="absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-[bounce_2s_infinite]"></div>

                {/* Center target icon */}
                <div className="text-white/40 flex flex-col items-center gap-1">
                  <CreditCard className="w-10 h-10 stroke-[1.5]" />
                  <span className="text-[10px] font-mono tracking-wider text-amber-200/70">SAYAD QR SCANNER</span>
                </div>
              </div>

              <div className="mt-4 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[11px] font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>موتور پردازش تصویر: {activeEngine}</span>
              </div>
            </div>
          )}

          {/* Successful Scan Card Overlay */}
          {scannedResult && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md p-5 flex flex-col items-center justify-center text-center animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <span className="text-xs text-emerald-400 font-bold mb-1">
                چک صیادی با موفقیت تشخیص داده شد
              </span>

              {/* 16-Digit Formatted Sayad ID */}
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3 my-2 w-full max-w-sm">
                <span className="text-[10px] text-slate-400 block mb-1">شناسه یکتای ۱۶ رقمی صیاد</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base sm:text-lg font-mono font-black text-amber-300 tracking-widest dir-ltr">
                    {scannedResult.formattedSayadId}
                  </span>
                  <button
                    type="button"
                    onClick={copySayadId}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                    title="کپی شناسه صیاد"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copiedId && (
                  <span className="text-[10px] text-emerald-400 block mt-1">شناسه کپی شد</span>
                )}
              </div>

              {/* Extracted Metadata Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 my-2 text-[11px]">
                {scannedResult.bankName && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300">
                    <Building2 className="w-3 h-3" />
                    <span>{scannedResult.bankName}</span>
                  </div>
                )}

                {scannedResult.iban && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                    <CreditCard className="w-3 h-3" />
                    <span>{scannedResult.iban.slice(0, 10)}...</span>
                  </div>
                )}

                {scannedResult.amount && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                    <span>مبلغ: {scannedResult.amount.toLocaleString('fa-IR')}</span>
                  </div>
                )}

                {scannedResult.dueDate && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <Calendar className="w-3 h-3" />
                    <span>سررسید: {toPersianDigits(scannedResult.dueDate)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4 w-full max-w-sm">
                <button
                  type="button"
                  onClick={handleConfirmSayad}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تایید و درج در فرم چک</span>
                </button>

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                >
                  اسکن مجدد
                </button>
              </div>
            </div>
          )}

          {/* Camera Error Banner */}
          {cameraError && (
            <div className="absolute top-3 inset-x-3 bg-rose-950/90 border border-rose-700/80 rounded-2xl p-3 text-rose-200 text-xs flex items-start gap-2 shadow-xl z-20">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">خطای دسترسی یا اسکن</p>
                <p className="text-[11px] text-rose-300 mt-0.5">{cameraError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls & Quick Test */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Switch Camera */}
            <button
              type="button"
              onClick={switchCamera}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
              title="تغییر دوربین پشت/جلو"
            >
              <SwitchCamera className="w-4 h-4" />
              <span className="hidden sm:inline">{cameraMode === 'environment' ? 'دوربین پشت' : 'دوربین جلو'}</span>
            </button>

            {/* Flashlight Torch */}
            {isTorchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                  torchEnabled
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="فلاش / پروژکتور دوربین"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">فلاش</span>
              </button>
            )}
          </div>

          {/* Device selector if multiple */}
          {videoDevices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs max-w-[150px] truncate"
            >
              <option value="">دوربین خودکار</option>
              {videoDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId}>
                  {dev.label || `دوربین ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Fallback Simulation Button for Testing without Physical Camera */}
          <button
            type="button"
            onClick={() => {
              const testSayad = `7928${Math.floor(100000000000 + Math.random() * 900000000000)}`;
              handleDetectedCode(testSayad);
            }}
            className="text-[11px] text-slate-400 hover:text-amber-300 underline cursor-pointer transition-colors"
          >
            تست دمو صیاد
          </button>
        </div>
      </div>
    </div>
  );
};
