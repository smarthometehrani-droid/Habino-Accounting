/**
 * Habino Accounting - JSONB Metadata Schema Engine
 * 
 * Implements:
 * 1. Strategy Pattern: For guild-specific business rules and domain logic (Service, Retail/Barcode, Payroll, Gold, General).
 * 2. Composite Pattern: For hierarchical tree-based form structures and dynamic JSONB attributes.
 * 3. Schema Drift Protection: Enforces strict data types, prevents corrupt JSONB mutations, and prevents reconciliation errors.
 */

// ==========================================
// 1. COMPOSITE PATTERN: Form Schema Nodes
// ==========================================

export type FormFieldType = 'string' | 'number' | 'boolean' | 'date' | 'select' | 'array';

export interface FormValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => string | null;
}

export abstract class FormCompositeNode {
  constructor(
    public readonly id: string,
    public readonly titleFa: string,
    public readonly descriptionFa?: string
  ) {}

  abstract isComposite(): boolean;
  abstract validate(input: any): { valid: boolean; errors: string[] };
  abstract sanitize(input: any): any;
  abstract toSchemaDefinition(): any;
}

export class FormFieldLeaf extends FormCompositeNode {
  constructor(
    id: string,
    titleFa: string,
    public readonly fieldType: FormFieldType,
    public readonly rules: FormValidationRule = {},
    public readonly options?: { label: string; value: any }[],
    descriptionFa?: string
  ) {
    super(id, titleFa, descriptionFa);
  }

  isComposite(): boolean {
    return false;
  }

  validate(value: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required check
    if (this.rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`فیلد «${this.titleFa}» الزامی است.`);
      return { valid: false, errors };
    }

    if (value === undefined || value === null || value === '') {
      return { valid: true, errors: [] };
    }

    // Type checks
    switch (this.fieldType) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`مقدار فیلد «${this.titleFa}» باید عدد معتبر باشد.`);
        } else {
          if (this.rules.min !== undefined && value < this.rules.min) {
            errors.push(`مقدار «${this.titleFa}» نمی‌تواند کمتر از ${this.rules.min} باشد.`);
          }
          if (this.rules.max !== undefined && value > this.rules.max) {
            errors.push(`مقدار «${this.titleFa}» نمی‌تواند بیشتر از ${this.rules.max} باشد.`);
          }
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          errors.push(`مقدار فیلد «${this.titleFa}» باید متن باشد.`);
        } else if (this.rules.pattern && !this.rules.pattern.test(value)) {
          errors.push(`فرمت فیلد «${this.titleFa}» نامعتبر است.`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`مقدار فیلد «${this.titleFa}» باید صحیح/غلط باشد.`);
        }
        break;

      case 'select':
        if (this.options && this.options.length > 0) {
          const matched = this.options.some(opt => opt.value === value);
          if (!matched) {
            errors.push(`گزینه انتخاب‌شده برای «${this.titleFa}» در لیست مجاز وجود ندارد.`);
          }
        }
        break;
    }

    if (this.rules.customValidator) {
      const customErr = this.rules.customValidator(value);
      if (customErr) errors.push(customErr);
    }

    return { valid: errors.length === 0, errors };
  }

  sanitize(value: any): any {
    if (value === undefined || value === null) return null;

    switch (this.fieldType) {
      case 'number': {
        const parsed = Number(value);
        return isNaN(parsed) ? null : parsed;
      }
      case 'string':
        return String(value).trim();
      case 'boolean':
        return Boolean(value);
      case 'date':
        return String(value).trim();
      default:
        return value;
    }
  }

  toSchemaDefinition(): any {
    return {
      id: this.id,
      titleFa: this.titleFa,
      type: this.fieldType,
      isComposite: false,
      rules: this.rules,
      options: this.options,
      descriptionFa: this.descriptionFa
    };
  }
}

export class FormSectionComposite extends FormCompositeNode {
  private children: FormCompositeNode[] = [];

  constructor(id: string, titleFa: string, descriptionFa?: string) {
    super(id, titleFa, descriptionFa);
  }

  isComposite(): boolean {
    return true;
  }

  add(node: FormCompositeNode): this {
    this.children.push(node);
    return this;
  }

  getChildren(): FormCompositeNode[] {
    return [...this.children];
  }

  validate(input: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const data = input && typeof input === 'object' ? input : {};

    for (const child of this.children) {
      const childValue = data[child.id];
      const childResult = child.validate(childValue);
      if (!childResult.valid) {
        errors.push(...childResult.errors);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  sanitize(input: any): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const data = input && typeof input === 'object' ? input : {};

    for (const child of this.children) {
      const rawValue = data[child.id];
      if (rawValue !== undefined) {
        sanitized[child.id] = child.sanitize(rawValue);
      }
    }

    return sanitized;
  }

  toSchemaDefinition(): any {
    return {
      id: this.id,
      titleFa: this.titleFa,
      isComposite: true,
      descriptionFa: this.descriptionFa,
      children: this.children.map(c => c.toSchemaDefinition())
    };
  }
}

// ==========================================
// 2. STRATEGY PATTERN: Guild & Business Rules
// ==========================================

export type EntityType = 'invoice' | 'inventory' | 'client' | 'transaction';

export interface GuildValidationResult {
  valid: boolean;
  sanitized: Record<string, any>;
  errors: string[];
}

export interface GuildMetadataStrategy {
  guildId: string;
  guildNameFa: string;
  descriptionFa: string;
  getFormSchema(entityType: EntityType): FormSectionComposite;
  validateAndSanitize(entityType: EntityType, metadata: any): GuildValidationResult;
}

/**
 * Strategy 1: دفاتر فنی، مهندسی و پیمانکاری خدمات
 */
export class ServiceTechnicalGuildStrategy implements GuildMetadataStrategy {
  guildId = 'service_technical';
  guildNameFa = 'دفاتر فنی، مهندسی و خدمات پیمانکاری';
  descriptionFa = 'متادیتای ساعات کارکرد، کارشناس مسئول، گارانتی خدمات و فازهای پروژه';

  getFormSchema(entityType: EntityType): FormSectionComposite {
    const root = new FormSectionComposite('service_meta', 'مشخصات اختصاصی خدمات فنی');

    if (entityType === 'invoice') {
      root
        .add(new FormFieldLeaf('technicianName', 'نام کارشناس/مهندس ناظر', 'string'))
        .add(new FormFieldLeaf('laborHours', 'مجموع ساعات کارکرد مستقیم', 'number', { min: 0 }))
        .add(new FormFieldLeaf('warrantyMonths', 'مدت گارانتی خدمات (ماه)', 'number', { min: 0, max: 120 }))
        .add(new FormFieldLeaf('projectMilestone', 'مرحله/مایل‌استون تسویل', 'string'));
    } else if (entityType === 'inventory') {
      root
        .add(new FormFieldLeaf('serviceLevel', 'سطح تخصصی خدمت', 'select', {}, [
          { label: 'پایه و عمومی', value: 'standard' },
          { label: 'تخصصی ارشد', value: 'senior' },
          { label: 'فوق‌تخصصی / مشاوره', value: 'expert' }
        ]))
        .add(new FormFieldLeaf('standardExecutionHours', 'مدت زمان استاندارد اجرا (ساعت)', 'number', { min: 0.25 }));
    } else if (entityType === 'client') {
      root
        .add(new FormFieldLeaf('contractNumber', 'شماره قرارداد مرجع', 'string'))
        .add(new FormFieldLeaf('slaType', 'سطح پشتیبانی (SLA)', 'select', {}, [
          { label: 'برنز (عادی)', value: 'bronze' },
          { label: 'نقره‌ای (۲۴ ساعته)', value: 'silver' },
          { label: 'طلایی (بلادرنگ VIP)', value: 'gold' }
        ]));
    }

    return root;
  }

  validateAndSanitize(entityType: EntityType, metadata: any): GuildValidationResult {
    const schema = this.getFormSchema(entityType);
    const { valid, errors } = schema.validate(metadata);
    const sanitized = schema.sanitize(metadata);
    return { valid, sanitized, errors };
  }
}

/**
 * Strategy 2: اصناف فروشگاهی و کالاهای بارکدی
 */
export class RetailBarcodeGuildStrategy implements GuildMetadataStrategy {
  guildId = 'retail_barcode';
  guildNameFa = 'فروشگاه‌ها و اصناف مبتنی بر بارکد و ردیابی کالا';
  descriptionFa = 'متادیتای شماره سریال، بچ تولید، تاریخ انقضا و موقعیت قفسه';

  getFormSchema(entityType: EntityType): FormSectionComposite {
    const root = new FormSectionComposite('retail_meta', 'مشخصات رهگیری بارکد و انبار');

    if (entityType === 'inventory') {
      root
        .add(new FormFieldLeaf('barcodeFormat', 'استاندارد بارکد', 'select', {}, [
          { label: 'EAN-13 (استاندارد کالا)', value: 'EAN13' },
          { label: 'Code-128 (صنعتی)', value: 'CODE128' },
          { label: 'QR Code (محتوایی)', value: 'QR' }
        ]))
        .add(new FormFieldLeaf('batchNumber', 'شماره بهر/بچ تولید (Batch No)', 'string'))
        .add(new FormFieldLeaf('expirationDate', 'تاریخ انقضا (شمسی/میلادی)', 'string'))
        .add(new FormFieldLeaf('shelfLocation', 'موقعیت فیزیکی قفسه/انبار', 'string'));
    } else if (entityType === 'invoice') {
      root
        .add(new FormFieldLeaf('scannedGunSessionId', 'شناسه جلسه اسکن بارکدخوان', 'string'))
        .add(new FormFieldLeaf('posTerminalId', 'شناسه پایانه کارتخوان متصل', 'string'));
    }

    return root;
  }

  validateAndSanitize(entityType: EntityType, metadata: any): GuildValidationResult {
    const schema = this.getFormSchema(entityType);
    const { valid, errors } = schema.validate(metadata);
    const sanitized = schema.sanitize(metadata);
    return { valid, sanitized, errors };
  }
}

/**
 * Strategy 3: کارگاه‌ها، پرسنل و حقوق و دستمزد
 */
export class PayrollGuildStrategy implements GuildMetadataStrategy {
  guildId = 'payroll';
  guildNameFa = 'کارگاه‌ها و حقوق و دستمزد پرسنلی';
  descriptionFa = 'متادیتای بیمه تأمین اجتماعی، سرفصل حقوق، اضافه‌کاری و مالیات پرسنل';

  getFormSchema(entityType: EntityType): FormSectionComposite {
    const root = new FormSectionComposite('payroll_meta', 'متادیتای حقوق و دستمزد');

    if (entityType === 'transaction') {
      root
        .add(new FormFieldLeaf('payrollMonth', 'ماه عملکرد حقوق (مثال: فروردین ۱۴۰۵)', 'string', { required: false }))
        .add(new FormFieldLeaf('employeeNationalId', 'کد ملی پرسنل', 'string'))
        .add(new FormFieldLeaf('insuranceDeduction', 'کسورات بیمه تأمین اجتماعی (تومان)', 'number', { min: 0 }))
        .add(new FormFieldLeaf('taxDeduction', 'کسورات مالیات بر حقوق (تومان)', 'number', { min: 0 }))
        .add(new FormFieldLeaf('overtimePay', 'مبلغ اضافه‌کاری (تومان)', 'number', { min: 0 }));
    }

    return root;
  }

  validateAndSanitize(entityType: EntityType, metadata: any): GuildValidationResult {
    const schema = this.getFormSchema(entityType);
    const { valid, errors } = schema.validate(metadata);
    const sanitized = schema.sanitize(metadata);
    return { valid, sanitized, errors };
  }
}

/**
 * Strategy 4: اصناف طلا، جواهر و فلزات گرانبها
 */
export class GoldJewelryGuildStrategy implements GuildMetadataStrategy {
  guildId = 'gold_jewelry';
  guildNameFa = 'صنف طلا، جواهر و فلزات گرانبها';
  descriptionFa = 'متادیتای عیار ۷۵۰، وزن گرمی، درصد سود قانونی و اجرت ساخت';

  getFormSchema(entityType: EntityType): FormSectionComposite {
    const root = new FormSectionComposite('gold_meta', 'مشخصات فاکتور طلا و جواهر');

    if (entityType === 'invoice' || entityType === 'inventory') {
      root
        .add(new FormFieldLeaf('carat', 'عیار طلا', 'number', { required: true, min: 300, max: 999 }))
        .add(new FormFieldLeaf('weightGrams', 'وزن خالص طلا (گرم)', 'number', { required: true, min: 0.001 }))
        .add(new FormFieldLeaf('wagePerGram', 'اجرت ساخت در هر گرم (تومان)', 'number', { min: 0 }))
        .add(new FormFieldLeaf('profitPercent', 'درصد سود قانونی فروشنده', 'number', { min: 0, max: 100 }))
        .add(new FormFieldLeaf('stoneValue', 'ارزش سنگ/نگین (تومان)', 'number', { min: 0 }));
    }

    return root;
  }

  validateAndSanitize(entityType: EntityType, metadata: any): GuildValidationResult {
    const schema = this.getFormSchema(entityType);
    const { valid, errors } = schema.validate(metadata);
    const sanitized = schema.sanitize(metadata);
    return { valid, sanitized, errors };
  }
}

/**
 * Strategy 5: استراتژی عمومی و پیش‌فرض استاندارد
 */
export class StandardDefaultGuildStrategy implements GuildMetadataStrategy {
  guildId = 'general_standard';
  guildNameFa = 'عمومی و استاندارد حسابداری هابینو';
  descriptionFa = 'فیلدهای عمومی برچسب‌گذاری، شناسه پیگیری خارجی و یادداشت سیستمی';

  getFormSchema(_entityType: EntityType): FormSectionComposite {
    const root = new FormSectionComposite('general_meta', 'اطلاعات تکمیلی سند');
    root
      .add(new FormFieldLeaf('externalReference', 'شماره پیگیری / مرجع بانکی', 'string'))
      .add(new FormFieldLeaf('departmentTag', 'واحد / بخش سازمانی', 'string'))
      .add(new FormFieldLeaf('customAuditNote', 'یادداشت حسابرسی اختصاصی', 'string'));
    return root;
  }

  validateAndSanitize(entityType: EntityType, metadata: any): GuildValidationResult {
    const schema = this.getFormSchema(entityType);
    const { valid, errors } = schema.validate(metadata);
    const sanitized = schema.sanitize(metadata);
    return { valid, sanitized, errors };
  }
}

// ==========================================
// 3. REGISTRY & SELF-HEALING ENGINE
// ==========================================

export class MetadataSchemaEngine {
  private static strategies: Map<string, GuildMetadataStrategy> = new Map([
    ['service_technical', new ServiceTechnicalGuildStrategy()],
    ['retail_barcode', new RetailBarcodeGuildStrategy()],
    ['payroll', new PayrollGuildStrategy()],
    ['gold_jewelry', new GoldJewelryGuildStrategy()],
    ['general_standard', new StandardDefaultGuildStrategy()]
  ]);

  public static getStrategy(guildId: string): GuildMetadataStrategy {
    return this.strategies.get(guildId) || this.strategies.get('general_standard')!;
  }

  public static registerStrategy(strategy: GuildMetadataStrategy): void {
    this.strategies.set(strategy.guildId, strategy);
  }

  public static getAllStrategies(): GuildMetadataStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Sanitizes and validates JSONB metadata against the appropriate guild strategy.
   * Auto-heals schema drift, removes forbidden keys, and prevents NaN / corrupt values.
   */
  public static sanitizeAndValidateMetadata(
    entityType: EntityType,
    guildId: string = 'general_standard',
    rawMetadata?: Record<string, any>
  ): { valid: boolean; sanitized: Record<string, any>; errors: string[] } {
    if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
      return { valid: true, sanitized: {}, errors: [] };
    }

    // Protection against prototype pollution
    const cleanRaw: Record<string, any> = {};
    for (const [k, v] of Object.entries(rawMetadata)) {
      if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
        cleanRaw[k] = v;
      }
    }

    const strategy = this.getStrategy(guildId);
    const res = strategy.validateAndSanitize(entityType, cleanRaw);

    // Merge any unrecognized non-colliding extra safe keys
    const finalSanitized = { ...res.sanitized };
    for (const [key, val] of Object.entries(cleanRaw)) {
      if (!(key in finalSanitized) && (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean')) {
        if (typeof val === 'number' && isNaN(val)) continue;
        finalSanitized[key] = val;
      }
    }

    return {
      valid: res.valid,
      sanitized: finalSanitized,
      errors: res.errors
    };
  }

  /**
   * Audits and auto-heals an array of records with JSONB metadata to eliminate schema drift
   */
  public static auditAndHealEntities<T extends { id: string; metadata?: Record<string, any> }>(
    entities: T[],
    entityType: EntityType,
    guildId: string = 'general_standard'
  ): { healedEntities: T[]; repairedCount: number } {
    let repairedCount = 0;

    const healedEntities = entities.map(entity => {
      if (!entity.metadata) return entity;

      const { sanitized } = this.sanitizeAndValidateMetadata(entityType, guildId, entity.metadata);
      const isDifferent = JSON.stringify(sanitized) !== JSON.stringify(entity.metadata);

      if (isDifferent) {
        repairedCount++;
        return {
          ...entity,
          metadata: sanitized
        };
      }
      return entity;
    });

    return { healedEntities, repairedCount };
  }
}
