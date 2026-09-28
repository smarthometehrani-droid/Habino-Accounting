import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  UploadCloud,
  X,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  FileText,
  Layers,
  Zap,
  RotateCcw,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';
import {
  ParsedFinancialDocument,
  SAMPLE_OCR_PRESETS,
  saveOcrDocument
} from '../lib/ocrDocumentParser';
import { toPersianDigits, formatCurrency } from '../lib/currencyUtils';

export interface SynapseDocumentCameraScannerProps {
  onDocumentScanned: (doc: ParsedFinancialDocument) => void;
  onClose: () => void;
}

export const SynapseDocumentCameraScanner: React.FC<SynapseDocumentCameraScannerProps> = ({
  onDocumentScanned,
  onClose
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SAMPLE_OCR_PRESETS[0]?.id || '');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // راه‌اندازی دوربین
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        setStream(mediaStream);
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      } else {
        setCameraError('دسترسی به وب‌کم/دوربین در این مرورگر یا محیط پشتیبانی نمی‌شود.');
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('دسترسی به دوربین توسط کاربر رد شد یا در دسترس نیست. می‌توانید تصویر فاکتور را بارگذاری فرمایید.');
      setCameraActive(false);
    }
  };

  // خاموش کردن استریم دوربین
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // ثبت عکس از کادر ویدیو
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
      processOcrImage(dataUrl);
    }
  };

  // بارگذاری فایل تصویر از کامپیوتر یا موبایل
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCapturedImage(result);
        stopCamera();
        processOcrImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // پردازش استخراج سند با هوش مصنوعی و خط لوله Vision OCR
  const processOcrImage = async (imageData: string, customDoc?: ParsedFinancialDocument) => {
    setIsProcessing(true);
    try {
      // شبیه‌سازی تجزیه هوشمند سند یا استفاده از سند انتخابی
      await new Promise(r => setTimeout(r, 1200));

      const matchedPreset = customDoc || SAMPLE_OCR_PRESETS.find(p => p.id === selectedPresetId) || SAMPLE_OCR_PRESETS[0];
      const parsedDoc: ParsedFinancialDocument = {
        ...matchedPreset,
        id: `ocr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        previewImageUrl: imageData || matchedPreset.previewImageUrl,
        date: new Date().toLocaleDateString('fa-IR'),
        status: 'pending'
      };

      saveOcrDocument(parsedDoc);
      onDocumentScanned(parsedDoc);
    } catch (e) {
      console.error('OCR Processing failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  // استفاده مستقیم از الگوهای آماده جهت تست سریع
  const handleUsePreset = (preset: ParsedFinancialDocument) => {
    setSelectedPresetId(preset.id);
    processOcrImage(preset.previewImageUrl || '', preset);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-2xl relative overflow-hidden animate-in fade-in">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>اسکنر دوربین هوشمند اسناد و فاکتورها (Vision OCR)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                Synapse Cam
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              سند یا فاکتور کاغذی را مقابل دوربین قرار دهید تا خط لوله بینایی سیناپس اطلاعات آن را استخراج کند.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title="بستن اسکنر"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Camera Viewfinder (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="relative aspect-video bg-black/80 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
            {cameraActive && !capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Viewfinder Target Box Overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-indigo-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                  <div className="flex justify-between items-center text-[11px] text-indigo-300 font-mono bg-slate-950/70 px-2.5 py-1 rounded-lg backdrop-blur-xs self-start">
                    <span>کادر تراز سند مالی</span>
                  </div>
                  <div className="text-center text-[11px] text-indigo-200 bg-slate-950/70 px-3 py-1 rounded-lg backdrop-blur-xs self-center">
                    فاکتور را به آرامی درون خط‌چین تنظیم کرده و دکمه عکس را بفشارید
                  </div>
                </div>
              </>
            ) : capturedImage ? (
              <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                <img
                  src={capturedImage}
                  alt="Captured invoice"
                  className="max-h-full max-w-full object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <span className="text-xs font-bold text-indigo-200">
                      در حال پردازش هوشمند و استخراج مقادیر فاکتور...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 flex flex-col items-center gap-3">
                <Camera className="w-12 h-12 text-slate-600" />
                <p className="text-xs text-slate-400 max-w-xs">
                  {cameraError || 'دوربین فعال نیست. برای شروع دکمه فعال‌سازی را لمس کنید یا فایل عکس را بارگذاری فرمایید.'}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>تلاش مجدد برای روشن کردن دوربین</span>
                </button>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              {cameraActive && !capturedImage ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>ثبت و اسکن فاکتور</span>
                </button>
              ) : capturedImage ? (
                <button
                  type="button"
                  onClick={() => {
                    setCapturedImage(null);
                    startCamera();
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>عکسبرداری مجدد</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>بارگذاری فایل تصویر</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </div>

        {/* Quick Test Presets (1 col) */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-slate-200">
              تست سریع با نمونه‌های آماده (Presets)
            </h4>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            در صورت عدم دسترسی به دوربین، می‌توانید فوراً یکی از فاکتورهای واقعی زیر را جهت آزمایش عملکرد هوش صوتی سیناپس تزریق کنید:
          </p>

          <div className="space-y-2 mt-1 overflow-y-auto max-h-72">
            {SAMPLE_OCR_PRESETS.slice(0, 3).map(preset => (
              <div
                key={preset.id}
                onClick={() => handleUsePreset(preset)}
                className="p-3 bg-slate-900/80 hover:bg-slate-750 border border-slate-700/80 hover:border-indigo-500 rounded-xl cursor-pointer transition-all text-right group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-indigo-300">
                  <span className="truncate">{preset.documentTitle}</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mr-1" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{preset.counterparty.name}</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formatCurrency(preset.financials.grandTotal, 'IRT')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-2 border-t border-slate-700 text-[10px] text-slate-400 text-center">
            اسناد استخراج‌شده پس از اسکن با تایید صوتی فرید تهرانی به دفاتر دوبل تزریق می‌گردند.
          </div>
        </div>
      </div>
    </div>
  );
};
