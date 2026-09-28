/**
 * ==============================================================================
 * HABINO ACCOUNTING - JSONB SCHEMA VALIDATOR & GUARDRAIL ENGINE
 * ==============================================================================
 * اعتبارسنجی ساختار، انواع داده و محدودیت‌های فیلدهای JSONB در متادیتا و اقلام فاکتور
 * جلوگیری از نفوذ داده‌های مخرب یا نامعتبر به PostgreSQL و سوپابیس
 * انطباق کامل با الگوهای Strategy اصناف و Composite فرم‌ساز هابینو
 * ==============================================================================
 */

import { MetadataSchemaEngine, EntityType } from './metadataSchemaEngine';

export interface JSONBValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: Record<string, any>;
}

export class HabinoJsonbSchemaValidator {
  private static readonly MAX_DEPTH = 4;
  private static readonly MAX_JSON_STRING_LENGTH = 500 * 1024; // 500 KB limit
  private static readonly FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'eval', 'script']);

  /**
   * بررسی و اعتبارسنجی یکپارچه متادیتای هر موجودیت (فاکتور، انبار، شخص، تراکنش)
   * با استفاده از استراتژی صنف و الگوهای کامپوزیت
   */
  public static validateEntityMetadata(
    entityType: EntityType,
    guildType: string | undefined,
    rawMetadata: any
  ): JSONBValidationResult {
    const res = MetadataSchemaEngine.sanitizeAndValidateMetadata(entityType, guildType || 'general_standard', rawMetadata);
    return {
      isValid: res.valid,
      errors: res.errors,
      sanitizedData: res.sanitized
    };
  }

  /**
   * بررسی امنیتی اولیه و پالایش فیلدهای ممنوعه (Sanitization & Prototype Pollution Guard)
   */
  public static sanitizeObject(raw: any, depth = 0): { clean: Record<string, any>; errors: string[] } {
    const errors: string[] = [];
    if (raw === null || raw === undefined) {
      return { clean: {}, errors };
    }

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      return { clean: {}, errors: ['متادیتا باید یک آبجکت ساختاریافته (JSON Object) باشد.'] };
    }

    if (depth > this.MAX_DEPTH) {
      return { clean: {}, errors: ['عمق تودرتویی آبجکت متادیتا فراتر از حد مجاز (۴ لایه) است.'] };
    }

    try {
      const serialized = JSON.stringify(raw);
      if (serialized.length > this.MAX_JSON_STRING_LENGTH) {
        return { clean: {}, errors: ['حجم آبجکت متادیتا فراتر از ۵۰۰ کیلوبایت است.'] };
      }
    } catch {
      return { clean: {}, errors: ['داده‌های متادیتا ساختار نامعتبر دارند.'] };
    }

    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (this.FORBIDDEN_KEYS.has(key)) {
        errors.push(`کلید امنیتی غیرمجاز «${key}» حذف شد.`);
        continue;
      }

      if (val === null || val === undefined) {
        continue;
      }

      if (typeof val === 'object' && !Array.isArray(val)) {
        const sub = this.sanitizeObject(val, depth + 1);
        errors.push(...sub.errors);
        clean[key] = sub.clean;
      } else if (Array.isArray(val)) {
        clean[key] = val.filter(v => typeof v !== 'function').slice(0, 100);
      } else {
        clean[key] = val;
      }
    }

    return { clean, errors };
  }

  /**
   * اعتبارسنجی متادیتای صنف بر اساس الگوهای Strategy
   */
  public static validateGuildMetadata(
    guildType: string | undefined,
    rawMetadata: any
  ): JSONBValidationResult {
    const { clean, errors } = this.sanitizeObject(rawMetadata);

    if (!guildType) {
      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData: clean
      };
    }

    switch (guildType) {
      case 'construction_renovation':
      case 'construction':
        if (clean.area_sqm !== undefined) {
          const area = Number(clean.area_sqm);
          if (isNaN(area) || area < 0) {
            errors.push('مقدار متراژ (area_sqm) در صنف ساختمان باید عددی مثبت باشد.');
          } else {
            clean.area_sqm = area;
          }
        }
        if (clean.difficulty_coefficient !== undefined) {
          const coef = Number(clean.difficulty_coefficient);
          if (isNaN(coef) || coef < 0.5 || coef > 5.0) {
            errors.push('ضریب سختی کار باید بین ۰.۵ تا ۵.۰ باشد.');
          } else {
            clean.difficulty_coefficient = coef;
          }
        }
        break;

      case 'food_pharma':
      case 'food':
        if (clean.temperature_celsius !== undefined) {
          const temp = Number(clean.temperature_celsius);
          if (isNaN(temp)) {
            errors.push('دمای نگهداری دارو/غذا باید یک مقدار عددی معتبر باشد.');
          } else {
            clean.temperature_celsius = temp;
          }
        }
        break;

      case 'gold_jewelry':
      case 'gold':
        if (clean.weight_grams !== undefined) {
          const weight = Number(clean.weight_grams);
          if (isNaN(weight) || weight <= 0) {
            errors.push('وزن طلا/جواهر (weight_grams) باید عددی بزرگتر از صفر باشد.');
          } else {
            clean.weight_grams = weight;
          }
        }
        if (clean.carat !== undefined) {
          const carat = Number(clean.carat);
          if (isNaN(carat) || carat < 9 || carat > 24) {
            errors.push('عیار طلا باید عددی بین ۹ تا ۲۴ باشد.');
          } else {
            clean.carat = carat;
          }
        }
        break;

      case 'tech_hardware':
      case 'tech':
        if (clean.warranty_months !== undefined) {
          const warranty = Number(clean.warranty_months);
          if (isNaN(warranty) || warranty < 0) {
            errors.push('مدت گارانتی باید عددی نامنفی باشد.');
          } else {
            clean.warranty_months = warranty;
          }
        }
        break;

      default:
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: clean
    };
  }

  /**
   * اعتبارسنجی آرایه اقلام فاکتور و متادیتای هر ردیف
   */
  public static validateInvoiceItems(items: any[]): { isValid: boolean; errors: string[]; sanitizedItems: any[] } {
    const errors: string[] = [];
    if (!Array.isArray(items) || items.length === 0) {
      return {
        isValid: false,
        errors: ['فاکتور باید دارای حداقل یک قلم کالا یا خدمات باشد.'],
        sanitizedItems: []
      };
    }

    const sanitizedItems = items.map((item, idx) => {
      const lineNum = idx + 1;
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discount = Number(item.discount || 0);
      const taxRate = Number(item.taxRate || 0);

      if (isNaN(qty) || qty <= 0) {
        errors.push(`ردیف ${lineNum}: تعداد کالا/خدمات باید عددی مثبت باشد.`);
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        errors.push(`ردیف ${lineNum}: قیمت واحد نمی‌تواند منفی باشد.`);
      }

      let sanitizedMeta: Record<string, any> = {};
      if (item.metadata) {
        const metaRes = this.sanitizeObject(item.metadata);
        if (metaRes.errors.length > 0) {
          errors.push(`ردیف ${lineNum} متادیتا: ${metaRes.errors.join('، ')}`);
        }
        sanitizedMeta = metaRes.clean;
      }

      const calculatedTotal = Math.max(0, qty * unitPrice - discount + (qty * unitPrice - discount) * (taxRate / 100));

      return {
        ...item,
        quantity: isNaN(qty) ? 1 : qty,
        unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
        discount: isNaN(discount) ? 0 : discount,
        taxRate: isNaN(taxRate) ? 0 : taxRate,
        total: item.total !== undefined ? Number(item.total) : calculatedTotal,
        metadata: sanitizedMeta
      };
    });

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedItems
    };
  }
}
