// Helper to accurately convert oklch(...) to rgb(...) string for canvas & print rendering
export function parseAndConvertOklchToRgb(colorStr: string): string {
  if (!colorStr || !colorStr.includes('oklch')) return colorStr;

  return colorStr.replace(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+(?:deg)?)(?:\s*\/\s*([0-9.]+%?))?\s*\)/gi, (match, lStr, cStr, hStr, aStr) => {
    let l = parseFloat(lStr);
    if (lStr.includes('%')) l = l / 100;
    const c = parseFloat(cStr);
    let h = parseFloat(hStr);
    if (isNaN(h)) h = 0;
    
    // Convert OKLCH to OKLab
    const hRad = (h * Math.PI) / 180;
    const aLab = c * Math.cos(hRad);
    const bLab = c * Math.sin(hRad);
    
    // OKLab to linear sRGB
    const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
    const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
    const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;

    const lLinear = l_ * l_ * l_;
    const mLinear = m_ * m_ * m_;
    const sLinear = s_ * s_ * s_;

    let rLin = +4.0767439362 * lLinear - 3.3077115913 * mLinear + 0.2309699292 * sLinear;
    let gLin = -1.2684380046 * lLinear + 2.6097574011 * mLinear - 0.3413193965 * sLinear;
    let bLin = -0.0041960863 * lLinear - 0.7034186147 * mLinear + 1.7076147010 * sLinear;

    // Gamma correction to sRGB
    const toSrgb = (x: number) => {
      const clamped = Math.max(0, Math.min(1, x));
      return clamped <= 0.0031308
        ? Math.round(clamped * 12.92 * 255)
        : Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255);
    };

    const r = toSrgb(rLin);
    const g = toSrgb(gLin);
    const b = toSrgb(bLin);

    if (aStr !== undefined) {
      let alpha = parseFloat(aStr);
      if (aStr.includes('%')) alpha = alpha / 100;
      if (isNaN(alpha)) alpha = 1;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return `rgb(${r}, ${g}, ${b})`;
  });
}
