/**
 * Habino Guild Form Strategies - Strategy Pattern
 * پیاده‌سازی منطق صنف‌های مختلف مستأجر در قالب استراتژی‌های مجزا
 * بر اساس الزامات معماری هابینو برای اصناف:
 * ۱. نصاب‌ها و ابنیه (متراژ، ضریب سختی، پرت)
 * ۲. مواد مصرفی، غذایی و دارویی (تاریخ انقضا، شماره سری/بچ، شرایط نگهداری)
 * ۳. طلا و جواهر (وزن گرمی، عیار، اجرت ساخت)
 * ۴. فناوری اطلاعات و شبکه (سریال قطعه، مدت لایسنس، SLA)
 * ۵. قطعات خودرو (مدل خودرو، کد فنی OEM، کیلومتر گارانتی)
 * ۶. خدمات و مهندسی عمومی (پیش‌فرض)
 */

import { FormCompositeGroup, FormFieldLeaf } from './formBuilderComposite';
import { InvoiceItem } from '../types';

export interface IGuildFormStrategy {
  guildKey: string;
  guildTitle: string;
  description: string;
  badge: string;

  /**
   * ساخت فرم درختی اقلام کالا/خدمت فاکتور متناسب با این صنف
   */
  buildItemFormComposite(initialValues?: Record<string, any>): FormCompositeGroup;

  /**
   * ساخت فرم درختی اطلاعات سربرگ سند متناسب با این صنف
   */
  buildDocumentHeaderComposite(initialValues?: Record<string, any>): FormCompositeGroup;

  /**
   * محاسبه خودکار مقادیر ردیف فاکتور (تعداد، قیمت واحد و ...) بر اساس پارامترهای تخصصی صنف
   */
  calculateDerivedRow(
    metadataValues: Record<string, any>, 
    currentRow: Partial<InvoiceItem>
  ): Partial<InvoiceItem>;

  /**
   * اعتبارسنجی مقادیر متادیتای صنف
   */
  validateItemMetadata(metadata: Record<string, any>): { valid: boolean; errors: Record<string, string> };
}

/**
 * ۱. استراتژی نصاب‌ها، تأسیسات و ساختمان (متراژ، ضریب سختی، درصد پرت)
 */
export class InstallationConstructionStrategy implements IGuildFormStrategy {
  public guildKey = 'installation_construction';
  public guildTitle = 'تأسیسات، ابنیه و دکوراسیون (متراژ و نصب)';
  public description = 'شامل فیلدهای متراژ دقیق، ضریب سختی کار در ارتفاع و درصد پرت مصالح';
  public badge = 'صنف نصابان و عمران';

  public buildItemFormComposite(): FormCompositeGroup {
    const group = new FormCompositeGroup(
      'installation-meta-group',
      'installation_params',
      'مشخصات متراژ و شرایط اجرای کارگاه',
      'محاسبه خودکار حجم کار بر اساس ابعاد هندسی و شرایط محیطی',
      'ویژه نصابان'
    );

    group.add(new FormFieldLeaf({
      id: 'field-area-sqm',
      name: 'area_sqm',
      label: 'متراژ کار / مساحت اجرا',
      fieldType: 'number',
      unit: 'متر مربع (m²)',
      placeholder: 'مثلاً: ۴۵.۵',
      rules: { required: false, min: 0 }
    }));

    group.add(new FormFieldLeaf({
      id: 'field-difficulty-coeff',
      name: 'difficulty_coeff',
      label: 'ضریب سختی کار / ارتفاع',
      fieldType: 'select',
      defaultValue: '1.0',
      options: [
        { label: 'عادی و استاندارد (ضریب ۱.۰)', value: '1.0' },
        { label: 'سختی متوسط / کار در ارتفاع تا ۳ متر (ضریب ۱.۱۵)', value: '1.15' },
        { label: 'سختی بالا / داربست و سقف کاذب (ضریب ۱.۳۰)', value: '1.30' },
        { label: 'شرایط ویژه و ابزار دقیق صنعتی (ضریب ۱.۵۰)', value: '1.50' }
      ]
    }));

    group.add(new FormFieldLeaf({
      id: 'field-waste-percent',
      name: 'waste_percent',
      label: 'درصد پرت مصالح',
      fieldType: 'number',
      unit: 'درصد (%)',
      defaultValue: 0,
      placeholder: 'مثلاً: ۵'
    }));

    group.add(new FormFieldLeaf({
      id: 'field-execution-scope',
      name: 'execution_scope',
      label: 'بخش اجرایی کارگاه',
      fieldType: 'text',
      placeholder: 'مثلاً: پذیرایی طبقه ۳، تیغه غربی یا اتاق سرور'
    }));

    return group;
  }

  public buildDocumentHeaderComposite(): FormCompositeGroup {
    const headerGroup = new FormCompositeGroup(
      'installation-doc-header',
      'project_site_info',
      'اطلاعات نشانی و تحویل کارگاه ساختمانی'
    );

    headerGroup.add(new FormFieldLeaf({
      id: 'site-supervisor-name',
      name: 'site_supervisor',
      label: 'مهندس ناظر / سرپرست کارگاه',
      fieldType: 'text',
      placeholder: 'نام و سمت مهندس ناظر'
    }));

    headerGroup.add(new FormFieldLeaf({
      id: 'site-permit-code',
      name: 'building_permit_code',
      label: 'شماره پروانه ساختمانی / پلاک ثبتی',
      fieldType: 'text'
    }));

    return headerGroup;
  }

  public calculateDerivedRow(
    metadataValues: Record<string, any>, 
    currentRow: Partial<InvoiceItem>
  ): Partial<InvoiceItem> {
    const area = Number(metadataValues['area_sqm']);
    const coeff = Number(metadataValues['difficulty_coeff']) || 1.0;
    const waste = Number(metadataValues['waste_percent']) || 0;

    const updates: Partial<InvoiceItem> = {};

    if (!isNaN(area) && area > 0) {
      // اگر متراژ وارد شده باشد، مقدار تعداد بر اساس متراژ + درصد پرت به روز می‌شود
      const effectiveArea = Math.round((area * (1 + waste / 100)) * 100) / 100;
      updates.quantity = effectiveArea;

      // اگر قیمت پایه مشخص شده باشد، ضریب سختی کار نیز اعمال می‌شود
      if (currentRow.unitPrice && currentRow.unitPrice > 0 && coeff !== 1.0) {
        updates.unitPrice = Math.round(currentRow.unitPrice * coeff);
      }
    }

    return updates;
  }

  public validateItemMetadata(metadata: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    return { valid: true, errors: {} };
  }
}

/**
 * ۲. استراتژی مواد مصرفی، غذایی، دارویی و بهداشتی (تاریخ انقضا، شماره سری ساخت، شرایط نگهداری)
 */
export class ConsumablesFoodHealthStrategy implements IGuildFormStrategy {
  public guildKey = 'consumables_food_health';
  public guildTitle = 'مواد مصرفی، بهداشتی و غذایی (کنترل بچ و انقضا)';
  public description = 'شامل تاریخ انقضای مصرف، شماره پارت/بچ و زنجیره دمایی نگهداری';
  public badge = 'صنف بهداشتی و مواد مصرفی';

  public buildItemFormComposite(): FormCompositeGroup {
    const group = new FormCompositeGroup(
      'consumable-meta-group',
      'consumable_params',
      'مشخصات سلامت، بچ تولید و تاریخ انقضا',
      'ردیابی زنجیره تأمین و استانداردهای بهداشتی',
      'کنترل انقضا'
    );

    group.add(new FormFieldLeaf({
      id: 'field-batch-number',
      name: 'batch_number',
      label: 'شماره پارت / سری ساخت (Lot/Batch)',
      fieldType: 'text',
      placeholder: 'مثلاً: LOT-2026-B88',
      rules: { required: false }
    }));

    group.add(new FormFieldLeaf({
      id: 'field-expiry-date',
      name: 'expiry_date',
      label: 'تاریخ انقضا / تاریخ مصرف',
      fieldType: 'text',
      placeholder: 'مثال: ۱۴۰۵/۱۱/۲۰'
    }));

    group.add(new FormFieldLeaf({
      id: 'field-storage-temp',
      name: 'storage_temp',
      label: 'شرایط نگهداری و زنجیره دما',
      fieldType: 'select',
      defaultValue: 'room_temp',
      options: [
        { label: 'دمای معمول اتاق (۱۵ تا ۲۵ درجه)', value: 'room_temp' },
        { label: 'یخچال و خنک (۲ تا ۸ درجه)', value: 'refrigerated' },
        { label: 'انجماد عمیق و فریزر (زیر منفی ۱۸)', value: 'frozen' },
        { label: 'دور از نور مستقیم و رطوبت', value: 'dark_dry' }
      ]
    }));

    group.add(new FormFieldLeaf({
      id: 'field-health-code',
      name: 'health_license_code',
      label: 'شماره پروانه بهداشت / شناسه IRC',
      fieldType: 'text',
      placeholder: 'کد ثبت سامانه غذا و دارو'
    }));

    return group;
  }

  public buildDocumentHeaderComposite(): FormCompositeGroup {
    const header = new FormCompositeGroup('consumable-doc-header', 'health_inspection', 'گواهی سلامت و حمل بهداشتی');
    header.add(new FormFieldLeaf({
      id: 'health-transport-code',
      name: 'transport_health_permit',
      label: 'شماره مجوز حمل خودروی یخچال‌دار',
      fieldType: 'text'
    }));
    return header;
  }

  public calculateDerivedRow(
    _metadataValues: Record<string, any>, 
    _currentRow: Partial<InvoiceItem>
  ): Partial<InvoiceItem> {
    return {};
  }

  public validateItemMetadata(metadata: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    if (metadata['expiry_date'] && !/^\d{4}\/\d{2}\/\d{2}$/.test(metadata['expiry_date'])) {
      // فرمت پیشنهادی تاریخ
    }
    return { valid: true, errors };
  }
}

/**
 * ۳. استراتژی صنف طلا، جواهر و فلزات گرانبها (وزن بر حسب گرم، عیار، اجرت ساخت و سود)
 */
export class GoldJewelryStrategy implements IGuildFormStrategy {
  public guildKey = 'gold_jewelry';
  public guildTitle = 'طلا، جواهر و مصنوعات زرگری';
  public description = 'محاسبه دقیق قیمت بر اساس وزن گرمی، عیار ۷۵۰، اجرت ساخت و سود مغازه';
  public badge = 'صنف طلا و جواهر';

  public buildItemFormComposite(): FormCompositeGroup {
    const group = new FormCompositeGroup(
      'gold-meta-group',
      'gold_params',
      'مشخصات فیزیکی طلا، وزن و اجرت ساخت',
      'فرمول استاندارد اتحادیه طلا و جواهر'
    );

    group.add(new FormFieldLeaf({
      id: 'gold-weight-grams',
      name: 'weight_grams',
      label: 'وزن خالص طلا (گرم)',
      fieldType: 'number',
      unit: 'گرم',
      placeholder: 'مثلاً: ۱۲.۴۵',
      rules: { required: false, min: 0 }
    }));

    group.add(new FormFieldLeaf({
      id: 'gold-carat',
      name: 'carat',
      label: 'عیار استاندارد',
      fieldType: 'select',
      defaultValue: '750',
      options: [
        { label: '۱۸ عیار استاندارد (۷۵۰)', value: '750' },
        { label: '۲۱ عیار (۸۷۵)', value: '875' },
        { label: '۲۴ عیار / شمش سرمایه‌گذاری (۹۹۹)', value: '999' },
        { label: '۱۷ عیار (۷۰۵)', value: '705' }
      ]
    }));

    group.add(new FormFieldLeaf({
      id: 'gold-ojrat',
      name: 'ojrat_per_gram',
      label: 'اجرت ساخت هر گرم (تومان)',
      fieldType: 'number',
      placeholder: 'مثلاً: ۲۵۰,۰۰۰'
    }));

    group.add(new FormFieldLeaf({
      id: 'gold-gem-carat',
      name: 'gem_weight',
      label: 'وزن نگین یا سنگ‌های قیمتی (سوت / قیراط)',
      fieldType: 'text',
      placeholder: 'مثلاً: ۲۵ سوت برلیان اصل'
    }));

    return group;
  }

  public buildDocumentHeaderComposite(): FormCompositeGroup {
    const header = new FormCompositeGroup('gold-doc-header', 'daily_gold_price', 'نرخ مرجع اتحادیه');
    header.add(new FormFieldLeaf({
      id: 'daily-gold-raw-price',
      name: 'daily_raw_gold_price',
      label: 'قیمت هر گرم طلای ۱۸ عیار خام روز (تومان)',
      fieldType: 'number'
    }));
    return header;
  }

  public calculateDerivedRow(
    metadataValues: Record<string, any>, 
    currentRow: Partial<InvoiceItem>
  ): Partial<InvoiceItem> {
    const weight = Number(metadataValues['weight_grams']);
    const ojrat = Number(metadataValues['ojrat_per_gram']) || 0;

    const updates: Partial<InvoiceItem> = {};
    if (!isNaN(weight) && weight > 0) {
      updates.quantity = weight;
      if (ojrat > 0 && currentRow.unitPrice) {
        // اضافه شدن اجرت ساخت به فی گرم طلا
        updates.unitPrice = currentRow.unitPrice + ojrat;
      }
    }
    return updates;
  }

  public validateItemMetadata(_metadata: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    return { valid: true, errors: {} };
  }
}

/**
 * ۴. استراتژی فناوری اطلاعات، نرم‌افزار، سرور و شبکه
 */
export class ItDigitalServicesStrategy implements IGuildFormStrategy {
  public guildKey = 'it_digital';
  public guildTitle = 'فناوری اطلاعات، شبکه و دیجیتال';
  public description = 'فیلدهای شماره سریال، MAC Address، مدت اعتبار لایسنس و سطح تعهد SLA';
  public badge = 'صنف IT و شبکه';

  public buildItemFormComposite(): FormCompositeGroup {
    const group = new FormCompositeGroup(
      'it-meta-group',
      'it_params',
      'مشخصات سریال قطعه، لایسنس و SLA',
      'ویژه تجهیزات شبکه و خدمات نرم‌افزاری'
    );

    group.add(new FormFieldLeaf({
      id: 'it-serial-number',
      name: 'serial_number',
      label: 'شماره سریال / MAC یا لایسنس Key',
      fieldType: 'text',
      placeholder: 'مثلاً: CISCO-2960-SN-88231 یا License Key'
    }));

    group.add(new FormFieldLeaf({
      id: 'it-license-duration',
      name: 'license_duration_months',
      label: 'مدت پشتیبانی / گارانتی (ماه)',
      fieldType: 'number',
      defaultValue: 12,
      placeholder: '۱۲'
    }));

    group.add(new FormFieldLeaf({
      id: 'it-sla-level',
      name: 'sla_level',
      label: 'سطح قرارداد سطح خدمات (SLA)',
      fieldType: 'select',
      defaultValue: 'business_hours',
      options: [
        { label: 'استاندارد ساعت اداری (۸×۵)', value: 'business_hours' },
        { label: 'پشتیبانی پیشرفته ۱۲ ساعته (۱۲×۶)', value: 'extended' },
        { label: 'بحرانی و آنی ۲۴/۷ (Mission Critical)', value: 'critical_24_7' }
      ]
    }));

    return group;
  }

  public buildDocumentHeaderComposite(): FormCompositeGroup {
    const header = new FormCompositeGroup('it-doc-header', 'project_topology', 'اطلاعات هاستینگ یا زیرساخت کارفرما');
    header.add(new FormFieldLeaf({
      id: 'it-datacenter-ip',
      name: 'datacenter_ip_range',
      label: 'دامنه یا آدرس سرور / رک پذیرنده',
      fieldType: 'text'
    }));
    return header;
  }

  public calculateDerivedRow(
    _metadataValues: Record<string, any>, 
    _currentRow: Partial<InvoiceItem>
  ): Partial<InvoiceItem> {
    return {};
  }

  public validateItemMetadata(_metadata: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    return { valid: true, errors: {} };
  }
}

/**
 * ۵. استراتژی خودرو، تعمیرگاه و قطعات یدکی
 */
export class AutomotivePartsStrategy implements IGuildFormStrategy {
  public guildKey = 'automotive_parts';
  public guildTitle = 'خودرو، مکانیکی و قطعات یدکی';
  public description = 'مدل خودرو، کد فنی OEM سازنده، شماره پلاک و گارانتی پیمایش';
  public badge = 'صنف خودرو';

  public buildItemFormComposite(): FormCompositeGroup {
    const group = new FormCompositeGroup(
      'auto-meta-group',
      'auto_params',
      'مشخصات خودرو، کد فنی قطعه و گارانتی',
      'اطلاعات فنی خودرو و قطعه یدکی'
    );

    group.add(new FormFieldLeaf({
      id: 'auto-oem-code',
      name: 'oem_part_code',
      label: 'کد فنی قطعه (OEM / Part Number)',
      fieldType: 'text',
      placeholder: 'مثلاً: 21410-1EA0A'
    }));

    group.add(new FormFieldLeaf({
      id: 'auto-vehicle-model',
      name: 'vehicle_model',
      label: 'مدل و سال ساخت خودرو',
      fieldType: 'text',
      placeholder: 'مثلاً: پژو ۲۰۶ تیپ ۵ یا تارا اتوماتیک'
    }));

    group.add(new FormFieldLeaf({
      id: 'auto-warranty-km',
      name: 'warranty_km',
      label: 'گارانتی کارکرد (کیلومتر)',
      fieldType: 'number',
      placeholder: 'مثلاً: ۲۰,۰۰۰'
    }));

    return group;
  }

  public buildDocumentHeaderComposite(): FormCompositeGroup {
    const header = new FormCompositeGroup('auto-doc-header', 'vehicle_info', 'مشخصات اتومبیل پذیرش‌شده');
    header.add(new FormFieldLeaf({
      id: 'vehicle-license-plate',
      name: 'license_plate',
      label: 'شماره پلاک خودرو',
      fieldType: 'text',
      placeholder: 'مثال: ۶۸ ب ۳۵۱ ایران ۷۷'
    }));
    header.add(new FormFieldLeaf({
      id: 'vehicle-current-odometer',
      name: 'current_odometer_km',
      label: 'کیلومتر کارکرد فعلی',
      fieldType: 'number'
    }));
    return header;
  }

  public calculateDerivedRow(
    _metadataValues: Record<string, any>, 
    _currentRow: Partial<InvoiceItem>
  ): Partial<InvoiceItem> {
    return {};
  }

  public validateItemMetadata(_metadata: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    return { valid: true, errors: {} };
  }
}

/**
 * ۶. استراتژی پیش‌فرض: خدمات مهندسی و بازرگانی عمومی
 */
export class GeneralServiceStandardStrategy implements IGuildFormStrategy {
  public guildKey = 'general_standard';
  public guildTitle = 'خدمات، بازرگانی و مشاوره عمومی';
  public description = 'فیلدهای عمومی ثبت قرارداد، تحویل پروژه و زمان‌بندی';
  public badge = 'عمومی و خدماتی';

  public buildItemFormComposite(): FormCompositeGroup {
    const group = new FormCompositeGroup(
      'general-meta-group',
      'general_params',
      'پارامترهای تکمیلی ردیف سند',
      'توضیحات تکمیلی پروژه و نحوه تحویل'
    );

    group.add(new FormFieldLeaf({
      id: 'general-delivery-days',
      name: 'delivery_lead_time_days',
      label: 'مدت زمان تحویل یا اجرای این ردیف (روز کاری)',
      fieldType: 'number',
      placeholder: 'مثلاً: ۳'
    }));

    group.add(new FormFieldLeaf({
      id: 'general-technical-notes',
      name: 'technical_spec',
      label: 'مشخصات فنی یا استاندارد رفرنس',
      fieldType: 'text',
      placeholder: 'ارجاع به نقشه، رفرنس یا شرایط فازبندی'
    }));

    return group;
  }

  public buildDocumentHeaderComposite(): FormCompositeGroup {
    return new FormCompositeGroup('general-doc-header', 'general_contract', 'مشخصات قرارداد');
  }

  public calculateDerivedRow(
    _metadataValues: Record<string, any>, 
    _currentRow: Partial<InvoiceItem>
  ): Partial<InvoiceItem> {
    return {};
  }

  public validateItemMetadata(_metadata: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    return { valid: true, errors: {} };
  }
}

/**
 * Resolver مرکزی استراتژی صنف
 * تشخیص هوشمند استراتژی متناسب بر اساس صنف ثبت‌شده در تنظیمات یا نوع کسب‌وکار
 */
export class GuildStrategyResolver {
  private static strategies: Record<string, IGuildFormStrategy> = {
    installation_construction: new InstallationConstructionStrategy(),
    consumables_food_health: new ConsumablesFoodHealthStrategy(),
    gold_jewelry: new GoldJewelryStrategy(),
    it_digital: new ItDigitalServicesStrategy(),
    automotive_parts: new AutomotivePartsStrategy(),
    general_standard: new GeneralServiceStandardStrategy()
  };

  /**
   * پیدا کردن استراتژی مناسب بر اساس عنوان یا کلید صنف
   */
  public static resolve(guildTitleOrKey?: string): IGuildFormStrategy {
    if (!guildTitleOrKey) {
      return this.strategies.general_standard;
    }

    const title = guildTitleOrKey.toLowerCase();

    // ۱. نصاب‌ها، تأسیسات و ساختمان
    if (
      title.includes('تأسیسات') || 
      title.includes('ساختمان') || 
      title.includes('دکوراسیون') || 
      title.includes('نصب') || 
      title.includes('کاشی') || 
      title.includes('ابنیه') || 
      title.includes('چوب') ||
      title.includes('آهن') ||
      title.includes('installation')
    ) {
      return this.strategies.installation_construction;
    }

    // ۲. مواد مصرفی، غذایی، پزشکی و بهداشتی
    if (
      title.includes('غذا') || 
      title.includes('پزشکی') || 
      title.includes('آزمایشگاه') || 
      title.includes('کشاورزی') || 
      title.includes('بهداشتی') || 
      title.includes('مصرفی') ||
      title.includes('consumable')
    ) {
      return this.strategies.consumables_food_health;
    }

    // ۳. طلا و جواهر
    if (
      title.includes('طلا') || 
      title.includes('جواهر') || 
      title.includes('ساعت') || 
      title.includes('زرگری') || 
      title.includes('gold')
    ) {
      return this.strategies.gold_jewelry;
    }

    // ۴. فناوری اطلاعات و IT
    if (
      title.includes('شبکه') || 
      title.includes('it') || 
      title.includes('نرم‌افزار') || 
      title.includes('رایانه') || 
      title.includes('دیجیتال') || 
      title.includes('هوش مصنوعی')
    ) {
      return this.strategies.it_digital;
    }

    // ۵. خودرو و قطعات
    if (
      title.includes('خودرو') || 
      title.includes('مکانیک') || 
      title.includes('یدکی') || 
      title.includes('لاستیک') || 
      title.includes('auto')
    ) {
      return this.strategies.automotive_parts;
    }

    // پیش‌فرض
    return this.strategies.general_standard;
  }

  public static getAllStrategies(): IGuildFormStrategy[] {
    return Object.values(this.strategies);
  }
}
