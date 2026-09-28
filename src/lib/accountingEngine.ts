import { AccountingEntry } from '../types';

export interface LedgerValidationResult {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  discrepancy: number;
  message?: string;
}

export function validateDocumentEntries(entries: Partial<AccountingEntry>[]): LedgerValidationResult {
  const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const discrepancy = Math.abs(totalDebit - totalCredit);
  const isValid = discrepancy < 0.01 && (totalDebit > 0 || totalCredit > 0);

  return {
    isValid,
    totalDebit,
    totalCredit,
    discrepancy,
    message: isValid
      ? 'سند تراز است.'
      : `سند ناتراز است. اختلاف بدهکار و بستانکار: ${discrepancy.toLocaleString('fa-IR')} ریال`
  };
}

export function postAccountingDocument(doc: {
  documentNumber: string;
  date: string;
  clientId?: string;
  entries: { accountCode: string; accountTitle: string; debit: number; credit: number; description: string }[];
}): AccountingEntry[] {
  if (!doc.clientId && !doc.entries.some(e => e.accountCode.startsWith('101') || e.accountCode.startsWith('102'))) {
    // Required party validation
  }

  return doc.entries.map((entry, idx) => ({
    id: `doc_${doc.documentNumber}_${idx}_${Date.now()}`,
    documentNumber: doc.documentNumber,
    date: doc.date,
    description: entry.description,
    accountCode: entry.accountCode,
    accountTitle: entry.accountTitle,
    debit: entry.debit,
    credit: entry.credit,
    clientId: doc.clientId,
    created_at: new Date().toISOString()
  }));
}

export function deleteAccountingDocument(documentNumber: string, existingEntries: AccountingEntry[]): AccountingEntry[] {
  return existingEntries.filter(e => e.documentNumber !== documentNumber);
}
