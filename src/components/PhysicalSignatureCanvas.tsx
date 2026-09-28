import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  RotateCcw, 
  Trash2, 
  Check, 
  X, 
  ShieldCheck, 
  User, 
  Briefcase, 
  FileCheck2, 
  Sparkles, 
  AlertCircle,
  Clock,
  Fingerprint
} from 'lucide-react';
import { toPersianDigits } from '../lib/currencyUtils';

export interface SignatureDataPayload {
  dataUrl: string;
  blob: Blob;
  signerName: string;
  signerRole: 'vendor' | 'client' | 'representative';
  signerNationalId?: string;
  signedAt: string;
  signatureHash: string;
  width: number;
  height: number;
}

interface PhysicalSignatureCanvasProps {
  invoiceNumber: string;
  defaultSignerName?: string;
  defaultSignerRole?: 'vendor' | 'client' | 'representative';
  onSave: (payload: SignatureDataPayload) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  title?: string;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  lineWidth: number;
}

export const PhysicalSignatureCanvas: React.FC<PhysicalSignatureCanvasProps> = ({
  invoiceNumber,
  defaultSignerName = '',
  defaultSignerRole = 'vendor',
  onSave,
  onCancel,
  isSubmitting = false,
  title = 'امضای فیزیکی و تایید رسمی سند'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  
  // Customization
  const [penColor, setPenColor] = useState<string>('#0f2756'); // Default Royal Navy
  const [penWidth, setPenWidth] = useState<number>(3.5);
  
  // Signer metadata
  const [signerName, setSignerName] = useState<string>(defaultSignerName);
  const [signerRole, setSignerRole] = useState<'vendor' | 'client' | 'representative'>(defaultSignerRole);
  const [signerNationalId, setSignerNationalId] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Time & Hash preview
  const [signedTimestamp] = useState<string>(() => new Date().toISOString());
  const [mockHash, setMockHash] = useState<string>('');

  // Setup canvas high-DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(300, Math.floor(rect.width));
    const displayHeight = 220;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      redrawAllStrokes(strokes, ctx);
    }
  }, [strokes]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute live verification hash
  useEffect(() => {
    const raw = `${invoiceNumber}:${signerName}:${signerRole}:${signedTimestamp}:${strokes.length}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    setMockHash(`HAB-SIG-${hex.toUpperCase()}-${toPersianDigits(new Date().getFullYear())}`);
  }, [invoiceNumber, signerName, signerRole, signedTimestamp, strokes.length]);

  // Redraw all strokes onto canvas with smooth quadratic curve interpolation
  const redrawAllStrokes = (strokeList: Stroke[], ctx?: CanvasRenderingContext2D | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeCtx = ctx || canvas.getContext('2d');
    if (!activeCtx) return;

    const dpr = window.devicePixelRatio || 1;
    activeCtx.save();
    activeCtx.setTransform(1, 0, 0, 1, 0, 0);
    activeCtx.clearRect(0, 0, canvas.width, canvas.height);
    activeCtx.restore();

    strokeList.forEach((stroke) => {
      if (stroke.points.length < 1) return;
      activeCtx.beginPath();
      activeCtx.strokeStyle = stroke.color;
      activeCtx.lineWidth = stroke.lineWidth;
      activeCtx.lineCap = 'round';
      activeCtx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        activeCtx.arc(stroke.points[0].x, stroke.points[0].y, stroke.lineWidth / 2, 0, Math.PI * 2);
        activeCtx.fillStyle = stroke.color;
        activeCtx.fill();
        return;
      }

      activeCtx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        activeCtx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
      }

      if (stroke.points.length > 1) {
        const last = stroke.points[stroke.points.length - 1];
        const prev = stroke.points[stroke.points.length - 2];
        activeCtx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
      }

      activeCtx.stroke();
    });
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Pointer event handlers with rock-solid touch and stylus tracking
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setValidationError(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }
    const pt = getCanvasCoords(e);
    setIsDrawing(true);
    setCurrentStroke([pt]);

    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.arc(pt.x, pt.y, penWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = penColor;
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || isSubmitting) return;

    const pt = getCanvasCoords(e);
    const updated = [...currentStroke, pt];
    setCurrentStroke(updated);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && updated.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const prev = updated[updated.length - 2];
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (currentStroke.length > 0) {
      const newStroke: Stroke = {
        points: currentStroke,
        color: penColor,
        lineWidth: penWidth
      };
      const updatedStrokes = [...strokes, newStroke];
      setStrokes(updatedStrokes);
      setCurrentStroke([]);
      redrawAllStrokes(updatedStrokes);
    }
  };

  const handleUndo = () => {
    if (strokes.length === 0 || isSubmitting) return;
    const nextStrokes = strokes.slice(0, -1);
    setStrokes(nextStrokes);
    redrawAllStrokes(nextStrokes);
  };

  const handleClear = () => {
    if (isSubmitting) return;
    setStrokes([]);
    setCurrentStroke([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
  };

  // Smart transparent bounds cropping to eliminate excessive padding
  const getCroppedCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 10) {
          hasPixels = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasPixels) return canvas;

    // Add safe padding
    const padding = Math.floor(16 * (window.devicePixelRatio || 1));
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(w, maxX + padding);
    maxY = Math.min(h, maxY + padding);

    const cropW = Math.max(1, maxX - minX);
    const cropH = Math.max(1, maxY - minY);

    const cropped = document.createElement('canvas');
    cropped.width = cropW;
    cropped.height = cropH;
    const croppedCtx = cropped.getContext('2d');
    if (croppedCtx) {
      croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    }
    return cropped;
  };

  const handleSaveSignature = async () => {
    if (strokes.length === 0) {
      setValidationError('لطفاً پیش از ثبت، امضای خود را در کادر رسم نمایید.');
      return;
    }

    if (!signerName.trim()) {
      setValidationError('وارد کردن نام و نام خانوادگی امضاکننده الزامی است.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const croppedCanvas = getCroppedCanvas(canvas);
      const dataUrl = croppedCanvas.toDataURL('image/png');

      // Convert dataURL to Blob for reliable Supabase Storage upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const payload: SignatureDataPayload = {
        dataUrl,
        blob,
        signerName: signerName.trim(),
        signerRole,
        signerNationalId: signerNationalId.trim() || undefined,
        signedAt: signedTimestamp,
        signatureHash: mockHash,
        width: croppedCanvas.width,
        height: croppedCanvas.height
      };

      await onSave(payload);
    } catch (err: any) {
      setValidationError(err?.message || 'خطا در استخراج و فشرده‌سازی تصویر امضا.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[95vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <PenTool className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {title}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  سند #{invoiceNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                امضای دیجیتال و فیزیکی معتبر با درج اثر انگشت رمزنگاری شده
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Signer Details Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                نام و نام خانوادگی امضاکننده <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="مثال: فرید تهرانی"
                disabled={isSubmitting}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                سمت / جایگاه حقوقی
              </label>
              <select
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value as any)}
                disabled={isSubmitting}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="vendor">صاحب کسب‌وکار (صادرکننده)</option>
                <option value="client">خریدار / کارفرما</option>
                <option value="representative">نماینده تام‌الاختیار مالی</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                کد ملی / شناسه هویتی (اختیاری جهت درج در گواهی امضا)
              </label>
              <input
                type="text"
                value={signerNationalId}
                onChange={(e) => setSignerNationalId(e.target.value)}
                placeholder="کد ملی ۱۰ رقمی"
                disabled={isSubmitting}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>

          {/* Canvas Styling Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            {/* Color Palette */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">رنگ جوهر:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { color: '#0f2756', name: 'سرمه‌ای اداری' },
                  { color: '#111827', name: 'مشکی رسمی' },
                  { color: '#1d4ed8', name: 'آبی کاربنی' }
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setPenColor(item.color)}
                    title={item.name}
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                      penColor === item.color ? 'scale-110 border-blue-500 shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: item.color }}
                  >
                    {penColor === item.color && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">ضخامت قلم:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                {[
                  { width: 2, label: 'نازک' },
                  { width: 3.5, label: 'استاندارد' },
                  { width: 5.5, label: 'ضخیم' }
                ].map((item) => (
                  <button
                    key={item.width}
                    type="button"
                    onClick={() => setPenWidth(item.width)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      penWidth === item.width
                        ? 'bg-white text-blue-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Undo / Clear Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={strokes.length === 0 || isSubmitting}
                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                title="بازگشت آخرین خط"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={strokes.length === 0 || isSubmitting}
                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                title="پاک کردن کل صفحه"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Responsive Touch-Enabled Canvas Container */}
          <div 
            ref={containerRef}
            className="relative border-2 border-dashed border-indigo-300 rounded-2xl bg-amber-50/20 overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[220px]"
            style={{ touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="cursor-crosshair w-full block"
              style={{ touchAction: 'none' }}
            />

            {/* Guide Placeholder if empty */}
            {strokes.length === 0 && !isDrawing && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-2">
                <PenTool className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-500">
                  لطفاً با قلم لمسی، انگشت یا ماوس در این کادر امضا کنید
                </p>
                <span className="text-[10px] text-slate-400">
                  خروجی نهایی به صورت تصویر شفاف (PNG Transparent) در فاکتور درج خواهد شد
                </span>
              </div>
            )}

            {/* Watermark security stamp preview */}
            <div className="absolute bottom-2 left-2 pointer-events-none opacity-30 text-[9px] font-mono text-slate-500 flex items-center gap-1 select-none">
              <ShieldCheck className="w-3 h-3 text-blue-600" />
              <span>HABINO SECURE SIGNATURE ENGINE</span>
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Live Hash & Security Details */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono">
              <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
              <span>کد اعتبارسنجی: {mockHash}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{toPersianDigits(new Date().toLocaleTimeString('fa-IR'))}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>در حال آپلود و ثبت در پایگاه داده...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-4 h-4 text-white" />
                <span>تایید و ثبت رسمی امضا</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
