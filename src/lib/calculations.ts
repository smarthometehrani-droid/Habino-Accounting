import { InvoiceItem } from '../types';

export function calculateItemTotal(item: InvoiceItem): number {
  const base = Math.max(0, (item.quantity * item.unitPrice) - (item.discount || 0));
  const tax = base * ((item.taxRate || 0) / 100);
  return base + tax;
}

export function calculateSubtotal(items: InvoiceItem[]): number {
  return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
}

export function calculateTotalDiscount(items: InvoiceItem[]): number {
  return items.reduce((acc, item) => acc + (item.discount || 0), 0);
}

export function calculateTotalTax(items: InvoiceItem[]): number {
  return items.reduce((acc, item) => {
    const base = Math.max(0, (item.quantity * item.unitPrice) - (item.discount || 0));
    return acc + (base * ((item.taxRate || 0) / 100));
  }, 0);
}

export function calculateTotal(items: InvoiceItem[]): number {
  return items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
}
