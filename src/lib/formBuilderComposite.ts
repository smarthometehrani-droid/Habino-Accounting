/**
 * Habino Form Builder - Composite Pattern
 * ساختار درختی فرم‌ساز پویا بر اساس الگوی Composite
 * امکان ترکیب فیلدهای مجزا (Leaf) و گروه‌های تودرتو/بخش‌ها (Composite)
 * با قابلیت اعتبارسنجی سلسله‌مراتبی و استخراج خودکار متادیتا (JSONB)
 */

export type FormFieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'boolean' 
  | 'textarea';

export interface FormValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any, allValues: Record<string, any>) => string | null;
}

export interface FormFieldOption {
  label: string;
  value: string | number;
}

/**
 * گره پایه در الگوی Composite
 */
export abstract class FormNode {
  public id: string;
  public name: string;
  public label: string;
  public description?: string;
  public isComposite: boolean = false;

  constructor(id: string, name: string, label: string, description?: string) {
    this.id = id;
    this.name = name;
    this.label = label;
    this.description = description;
  }

  public abstract validate(values: Record<string, any>): { valid: boolean; errors: Record<string, string> };
  public abstract exportMetadata(values: Record<string, any>, target: Record<string, any>): void;
}

/**
 * گره برگ (Leaf) در الگوی Composite - فیلدهای تکی ورودی
 */
export class FormFieldLeaf extends FormNode {
  public fieldType: FormFieldType;
  public defaultValue: any;
  public unit?: string;
  public placeholder?: string;
  public options?: FormFieldOption[];
  public rules?: FormValidationRule;

  constructor(config: {
    id: string;
    name: string;
    label: string;
    fieldType: FormFieldType;
    defaultValue?: any;
    unit?: string;
    placeholder?: string;
    options?: FormFieldOption[];
    rules?: FormValidationRule;
    description?: string;
  }) {
    super(config.id, config.name, config.label, config.description);
    this.fieldType = config.fieldType;
    this.defaultValue = config.defaultValue;
    this.unit = config.unit;
    this.placeholder = config.placeholder;
    this.options = config.options;
    this.rules = config.rules;
    this.isComposite = false;
  }

  public validate(values: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const val = values[this.name];
    const errors: Record<string, string> = {};

    if (this.rules?.required && (val === undefined || val === null || val === '')) {
      errors[this.name] = `فیلد «${this.label}» الزامی است.`;
      return { valid: false, errors };
    }

    if (this.fieldType === 'number' && val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (isNaN(num)) {
        errors[this.name] = `مقدار «${this.label}» باید عددی باشد.`;
        return { valid: false, errors };
      }
      if (this.rules?.min !== undefined && num < this.rules.min) {
        errors[this.name] = `حداقل مقدار «${this.label}» باید ${this.rules.min} باشد.`;
        return { valid: false, errors };
      }
      if (this.rules?.max !== undefined && num > this.rules.max) {
        errors[this.name] = `حداکثر مقدار «${this.label}» می‌تواند ${this.rules.max} باشد.`;
        return { valid: false, errors };
      }
    }

    if (this.rules?.customValidator) {
      const customErr = this.rules.customValidator(val, values);
      if (customErr) {
        errors[this.name] = customErr;
        return { valid: false, errors };
      }
    }

    return { valid: true, errors: {} };
  }

  public exportMetadata(values: Record<string, any>, target: Record<string, any>): void {
    if (values[this.name] !== undefined) {
      target[this.name] = values[this.name];
    } else if (this.defaultValue !== undefined) {
      target[this.name] = this.defaultValue;
    }
  }
}

/**
 * گره ترکیبی (Composite) - گروه یا بخش شامل چندین گره (فیلد یا زیرگروه)
 */
export class FormCompositeGroup extends FormNode {
  public children: FormNode[] = [];
  public iconName?: string;
  public badge?: string;

  constructor(id: string, name: string, label: string, description?: string, badge?: string) {
    super(id, name, label, description);
    this.isComposite = true;
    this.badge = badge;
  }

  public add(node: FormNode): this {
    this.children.push(node);
    return this;
  }

  public remove(id: string): this {
    this.children = this.children.filter(child => child.id !== id);
    return this;
  }

  public getChildren(): FormNode[] {
    return this.children;
  }

  public validate(values: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    let allValid = true;
    const aggregatedErrors: Record<string, string> = {};

    for (const child of this.children) {
      const childResult = child.validate(values);
      if (!childResult.valid) {
        allValid = false;
        Object.assign(aggregatedErrors, childResult.errors);
      }
    }

    return { valid: allValid, errors: aggregatedErrors };
  }

  public exportMetadata(values: Record<string, any>, target: Record<string, any>): void {
    for (const child of this.children) {
      child.exportMetadata(values, target);
    }
  }
}
