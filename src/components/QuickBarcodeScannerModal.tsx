import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';
import { Camera, CameraOff, X, Zap, ScanLine, AlertCircle, Smartphone, Laptop, SwitchCamera, FlipHorizontal, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';
import { playScanBeep } from '../lib/barcodeEngine';
import { CompositeBarcodeScanner } from '../lib/scannerStrategy';
import { toPersianDigits } from '../lib/currencyUtils';

interface QuickBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  description?: string;
  continuous?: boolean;
}

export const QuickBarcodeScannerModal: React.FC<QuickBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'اسکن بارکد با دوربین',
  description = 'بارکد کالا یا جعبه را مقابل لنز دوربین قرار دهید',
  continuous = false
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const isMobileDevice = useMemo(() => {
    return typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>(() => {
    return isMobileDevice ? 'environment' : 'user';
  });

  const [isMirrored, setIsMirrored] = useState<boolean>(() => {
    return !isMobileDevice;
  });

  const [cameraRetryCount, setCameraRetryCount] = useState<number>(0);
  const [scanSpeedMs, setScanSpeedMs] = useState<number | null>(null);
  const [activeEngine, setActiveEngine] = useState<string>('BarcodeDetector API');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const compositeScannerRef = useRef<CompositeBarcodeScanner | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);

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

  const stopCamera = () => {
    isScanningActiveRef.current = false;
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (compositeScannerRef.current) {
      compositeScannerRef.current.reset();
      compositeScannerRef.current = null;
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
    setTorchEnabled(false);
    setIsTorchSupported(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isSubscribed = true;
    setCameraError(null);

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isSubscribed) setCameraError('مرورگر از دوربین پشتیبانی نمی‌کند.');
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
        hints.set(2, formats);

        const reader = new BrowserMultiFormatReader(hints, 250);
        codeReaderRef.current = reader;

        // Initialize Hardware Barcode Detector Composite Strategy (<50ms)
        compositeScannerRef.current = new CompositeBarcodeScanner();
        await compositeScannerRef.current.getBestStrategy();
        setActiveEngine(compositeScannerRef.current.getActiveStrategyName());

        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? {
                deviceId: { ideal: selectedDeviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            : {
                facingMode: { ideal: cameraMode },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
        };

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

        // Attempt 3: Ultimate universal video: true (ideal for Windows webcams)
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (!stream) {
          throw new Error('ناتوانی در دریافت تصویر از وب‌کم');
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

        // Re-enumerate devices to get labels
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
            console.warn('QuickScanner video play warning:', playErr);
          }
        }

        let lastTime = 0;
        let lastCode = '';

        // Hardware-Accelerated Fast Scan Loop (<50ms via Native BarcodeDetector)
        isScanningActiveRef.current = true;
        let lastNativeScanTs = 0;

        const fastScanLoop = async () => {
          if (!isScanningActiveRef.current || !videoRef.current) return;
          const now = performance.now();
          if (now - lastNativeScanTs > 60 && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
            lastNativeScanTs = now;
            if (compositeScannerRef.current) {
              try {
                const res = await compositeScannerRef.current.scanFrame(videoRef.current);
                if (res && res.text) {
                  const nowWall = Date.now();
                  if (res.text === lastCode && nowWall - lastTime < 2200) {
                    // debounce
                  } else {
                    lastTime = nowWall;
                    lastCode = res.text;
                    setScanSpeedMs(res.detectionSpeedMs);
                    setLastScanned(res.text);
                    playScanBeep();
                    onScan(res.text);
                    if (!continuous) {
                      stopCamera();
                      onClose();
                      return;
                    }
                  }
                }
              } catch (loopErr) {
                console.debug('Fast scan loop error:', loopErr);
              }
            }
          }

          if (isScanningActiveRef.current) {
            scanLoopRef.current = requestAnimationFrame(fastScanLoop);
          }
        };

        scanLoopRef.current = requestAnimationFrame(fastScanLoop);

        reader.decodeFromVideoElementContinuously(videoRef.current!, (result, error) => {
          if (result) {
            const text = result.getText().trim();
            const now = Date.now();

            // Debounce identical scans in continuous mode
            if (text === lastCode && now - lastTime < 2200) {
              return;
            }

            lastTime = now;
            lastCode = text;
            setScanSpeedMs(150);
            setLastScanned(text);
            playScanBeep();
            onScan(text);

            if (!continuous) {
              stopCamera();
              onClose();
            }
          }
        });
      } catch (err: unknown) {
        console.warn('Camera error in QuickScanner handled:', err);
        const errorObj = err as { name?: string; message?: string };
        const msg = errorObj?.message || '';
        if (isSubscribed) {
          if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
            setCameraError('دسترسی به دوربین داده نشد. لطفاً در مرورگر دسترسی دوربین را فعال کنید.');
          } else if (errorObj?.name === 'NotReadableError' || errorObj?.name === 'TrackStartError' || msg.includes('video source') || msg.includes('in use')) {
            setCameraError('سخت‌افزار دوربین در حال حاضر توسط برنامه دیگری در حال استفاده است یا امکان شروع ندارد.');
          } else {
            setCameraError(`خطا در ارتباط با دوربین: ${msg || 'نامشخص'}`);
          }
        }
      }
    };

    startCamera();

    return () => {
      isSubscribed = false;
      stopCamera();
    };
  }, [isOpen, selectedDeviceId, cameraMode, continuous, onScan, onClose, cameraRetryCount]);

  const handleFlipCamera = () => {
    const nextMode = cameraMode === 'environment' ? 'user' : 'environment';
    setCameraMode(nextMode);
    setSelectedDeviceId('');
    setIsMirrored(nextMode === 'user');
  };

  const toggleTorch = async () => {
    if (!currentStreamRef.current) return;
    const track = currentStreamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newState = !torchEnabled;
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newState }]
      });
      setTorchEnabled(newState);
    } catch (err) {
      console.debug('Failed to toggle torch:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-emerald-400 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {scanSpeedMs ? `${toPersianDigits(scanSpeedMs)}ms` : '< ۲۰۰ms'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Switch Mode */}
            <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setCameraMode('environment');
                  setSelectedDeviceId('');
                  setIsMirrored(false);
                }}
                className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  cameraMode === 'environment'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="دوربین پشت موبایل"
              >
                <Smartphone className="w-3 h-3" />
                <span className="hidden sm:inline">پشت</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraMode('user');
                  setSelectedDeviceId('');
                  setIsMirrored(true);
                }}
                className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  cameraMode === 'user'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="وب‌کم لپ‌تاپ / دوربین جلو"
              >
                <Laptop className="w-3 h-3" />
                <span className="hidden sm:inline">لپ‌تاپ</span>
              </button>
            </div>

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Video Area */}
        <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              isMirrored ? 'scale-x-[-1]' : ''
            }`}
            playsInline
            autoPlay
            muted
          />

          {/* Laser targeting line */}
          <div className="absolute inset-x-8 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite] pointer-events-none z-10" />

          {/* Corner Guides */}
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

          {/* Top Floating Controls */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-auto">
            {/* Status indicator */}
            <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{cameraMode === 'environment' ? 'REAR CAM' : 'LAPTOP WEBCAM'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Flip camera */}
              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs flex items-center gap-1 cursor-pointer"
                title="چرخش دوربین"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
              </button>

              {/* Mirror toggle */}
              <button
                type="button"
                onClick={() => setIsMirrored(!isMirrored)}
                className={`p-1.5 rounded-lg backdrop-blur-md border text-xs flex items-center gap-1 cursor-pointer ${
                  isMirrored
                    ? 'bg-blue-600/80 border-blue-400 text-white'
                    : 'bg-black/60 hover:bg-black/80 border-white/20 text-slate-300'
                }`}
                title="حالت آینه‌ای"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Torch button */}
              {isTorchSupported && (
                <button
                  onClick={toggleTorch}
                  className={`p-1.5 rounded-lg backdrop-blur-md border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    torchEnabled
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                  title="چراغ‌قوه"
                >
                  <Zap className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Last scanned code banner */}
          {lastScanned && (
            <div className="absolute bottom-4 inset-x-4 bg-emerald-950/90 border border-emerald-500/80 rounded-xl p-2.5 text-center text-xs text-emerald-200 backdrop-blur-md z-20">
              <span className="font-medium">بارکد شناسایی شد: </span>
              <span className="font-mono font-bold text-white text-sm">{lastScanned}</span>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {cameraError && (
          <div className="p-3 bg-rose-950/90 border-t border-rose-800 text-rose-300 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{cameraError}</div>
              </div>
              <button
                onClick={() => setCameraRetryCount(c => c + 1)}
                className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer"
              >
                تلاش مجدد
              </button>
            </div>
            {/* If inside iframe, offer open in new tab */}
            <div className="flex items-center justify-between pt-1 border-t border-rose-900/50 text-[11px] text-rose-200">
              <span>عدم مشاهده پنجره تایید مجوز در ویندوز؟</span>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>برگه جدید</span>
              </a>
            </div>
          </div>
        )}

        {/* Footer controls */}
        <div className="p-3 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between gap-2 text-xs">
          {videoDevices.length > 1 ? (
            <select
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-xs outline-hidden max-w-[160px]"
            >
              <option value="">انتخاب خودکار لنز</option>
              {videoDevices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `دوربین ${idx + 1}`}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] text-slate-400">
              {cameraMode === 'environment' ? 'دوربین پشت فعال' : 'وب‌کم لپ‌تاپ فعال'}
            </span>
          )}

          <div className="text-[11px] text-slate-400 hidden sm:block">
            {continuous ? 'حالت اسکن پیوسته' : 'پس از خواندن بسته می‌شود'}
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
