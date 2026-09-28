/**
 * Habino Barcode & QR Scanner Strategy & Composite Architecture
 * Conforms to Strategy & Composite Pattern
 * 
 * Provides:
 * 1. NativeBarcodeDetectorStrategy (Modern Chrome, Android CafeBazaar WebView, Edge) - < 50ms detection
 * 2. ZXingBarcodeDetectorStrategy (Cross-platform WebAssembly fallback) - ~150-250ms
 * 3. CompositeBarcodeScanner - Orchestrates strategies to fulfill the < 200ms KPI
 */

import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';

export interface BarcodeScanResult {
  text: string;
  format: string;
  detectionSpeedMs: number;
  engine: 'native_barcode_detector' | 'zxing_wasm';
  confidence?: number;
}

export interface IBarcodeDetectionStrategy {
  readonly name: string;
  isSupported(): Promise<boolean>;
  detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<BarcodeScanResult | null>;
  reset?(): void;
}

/**
 * Strategy 1: Native Barcode Detection API
 * Extremely fast (<50ms) hardware-accelerated detection implemented in Blink/Chromium
 */
export class NativeBarcodeDetectorStrategy implements IBarcodeDetectionStrategy {
  readonly name = 'Native BarcodeDetector API';
  private detector: any = null;
  private supported: boolean | null = null;

  async isSupported(): Promise<boolean> {
    if (this.supported !== null) return this.supported;

    if (typeof window === 'undefined' || !(window as any).BarcodeDetector) {
      this.supported = false;
      return false;
    }

    try {
      const getSupportedFormats = (window as any).BarcodeDetector.getSupportedFormats;
      if (typeof getSupportedFormats === 'function') {
        const formats = await getSupportedFormats();
        this.supported = Array.isArray(formats) && formats.length > 0;
      } else {
        this.supported = true;
      }
    } catch {
      this.supported = true;
    }

    return this.supported;
  }

  private async getDetector(): Promise<any> {
    if (this.detector) return this.detector;

    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    const requestedFormats = [
      'qr_code',
      'ean_13',
      'ean_8',
      'code_128',
      'code_39',
      'data_matrix',
      'upc_a',
      'upc_e'
    ];

    try {
      this.detector = new BarcodeDetectorClass({ formats: requestedFormats });
    } catch {
      // Fallback without explicit format list
      this.detector = new BarcodeDetectorClass();
    }

    return this.detector;
  }

  async detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<BarcodeScanResult | null> {
    const isAvailable = await this.isSupported();
    if (!isAvailable) return null;

    const startTime = performance.now();
    try {
      const detector = await this.getDetector();
      const barcodes = await detector.detect(source);

      if (barcodes && barcodes.length > 0) {
        const first = barcodes[0];
        const elapsed = Math.round(performance.now() - startTime);

        return {
          text: (first.rawValue || '').trim(),
          format: first.format || 'UNKNOWN',
          detectionSpeedMs: elapsed,
          engine: 'native_barcode_detector'
        };
      }
    } catch (err) {
      // Frame may be transiently incomplete or camera resetting
      console.debug('Native BarcodeDetector detection error:', err);
    }

    return null;
  }

  reset(): void {
    this.detector = null;
  }
}

/**
 * Strategy 2: ZXing Library WebAssembly / JS Engine
 * Broad compatibility across iOS Safari, older WebViews, and desktop Firefox
 */
export class ZXingBarcodeDetectorStrategy implements IBarcodeDetectionStrategy {
  readonly name = 'ZXing MultiFormatReader';
  private reader: BrowserMultiFormatReader | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  async isSupported(): Promise<boolean> {
    return true; // Universally supported in modern JS environments
  }

  private getReader(): BrowserMultiFormatReader {
    if (this.reader) return this.reader;

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
    hints.set(2, formats); // DecodeHintType.POSSIBLE_FORMATS

    this.reader = new BrowserMultiFormatReader(hints, 200);
    return this.reader;
  }

  async detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<BarcodeScanResult | null> {
    const startTime = performance.now();
    const reader = this.getReader();

    try {
      // If source is HTMLVideoElement, decode directly
      if (source instanceof HTMLVideoElement) {
        if (source.readyState < 2 || source.videoWidth === 0) return null;

        // Extract canvas snapshot for precise decoding
        if (!this.canvas) {
          this.canvas = document.createElement('canvas');
        }
        const w = source.videoWidth;
        const h = source.videoHeight;
        this.canvas.width = w;
        this.canvas.height = h;

        if (!this.ctx) {
          this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }
        if (!this.ctx) return null;

        this.ctx.drawImage(source, 0, 0, w, h);
        const result = reader.decode(this.canvas as any);

        if (result) {
          const elapsed = Math.round(performance.now() - startTime);
          return {
            text: result.getText().trim(),
            format: BarcodeFormat[result.getBarcodeFormat()] || 'CODE_128',
            detectionSpeedMs: elapsed,
            engine: 'zxing_wasm'
          };
        }
      } else if (source instanceof HTMLCanvasElement) {
        const result = reader.decode(source as any);
        if (result) {
          const elapsed = Math.round(performance.now() - startTime);
          return {
            text: result.getText().trim(),
            format: BarcodeFormat[result.getBarcodeFormat()] || 'CODE_128',
            detectionSpeedMs: elapsed,
            engine: 'zxing_wasm'
          };
        }
      }
    } catch {
      // Not found in this frame - normal behavior
    }

    return null;
  }

  reset(): void {
    if (this.reader) {
      try {
        this.reader.reset();
      } catch {}
      this.reader = null;
    }
    this.canvas = null;
    this.ctx = null;
  }
}

/**
 * Composite Barcode Scanner
 * Implements Composite Pattern to run the fastest available strategy
 * and fallback gracefully, ensuring < 200ms KPI
 */
export class CompositeBarcodeScanner {
  private strategies: IBarcodeDetectionStrategy[] = [];
  private activeStrategyName: string = '';

  constructor() {
    this.strategies = [
      new NativeBarcodeDetectorStrategy(),
      new ZXingBarcodeDetectorStrategy()
    ];
  }

  /**
   * Initializes and detects the best available strategy
   */
  async getBestStrategy(): Promise<IBarcodeDetectionStrategy> {
    for (const strategy of this.strategies) {
      const supported = await strategy.isSupported();
      if (supported) {
        this.activeStrategyName = strategy.name;
        return strategy;
      }
    }
    return this.strategies[1]; // ZXing default fallback
  }

  getActiveStrategyName(): string {
    return this.activeStrategyName;
  }

  /**
   * Scans a video element or canvas using composite logic
   */
  async scanFrame(source: HTMLVideoElement | HTMLCanvasElement): Promise<BarcodeScanResult | null> {
    // Try primary strategy (Native BarcodeDetector first)
    for (const strategy of this.strategies) {
      const supported = await strategy.isSupported();
      if (!supported) continue;

      const result = await strategy.detect(source);
      if (result) {
        this.activeStrategyName = strategy.name;
        return result;
      }
    }

    return null;
  }

  /**
   * Universal detect method satisfying callers expecting detect(source) with engineName
   */
  async detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<(BarcodeScanResult & { engineName: string }) | null> {
    const res = await this.scanFrame(source as any);
    if (!res) return null;
    return {
      ...res,
      engineName: this.activeStrategyName || (res.engine === 'native_barcode_detector' ? 'Barcode Detection API (سخت‌افزاری)' : 'ZXing Engine')
    };
  }

  reset(): void {
    this.strategies.forEach(s => s.reset?.());
  }
}
