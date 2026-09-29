import { getSupabaseConfig } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { Invoice, InvoiceSignature } from '../types';
import { offlineOutbox } from './offlineOutboxQueue';

export interface UploadSignatureOptions {
  invoiceId: string;
  invoiceNumber: string;
  blob: Blob;
  dataUrl: string;
  signerName: string;
  signerRole: 'vendor' | 'client' | 'representative';
  signerNationalId?: string;
  tenantId?: string;
  signedAt?: string;
  signatureHash?: string;
}

export interface UploadSignatureResult {
  success: boolean;
  signatureUrl: string;
  signatureRecord: InvoiceSignature;
  shareToken: string;
  message: string;
  cloudPersisted: boolean;
  storagePersisted: boolean;
  syncWarning?: string;
}

/**
 * Generate a cryptographically secure random token for sharing and verification
 */
export function generateSecureShareToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return 'tok_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Generate quick sharing links
 */
export function buildSharingLinks(options: {
  invoiceNumber: string;
  clientName?: string;
  grandTotal: number;
  currencyLabel?: string;
  shareToken: string;
  baseUrl?: string;
}) {
  const { invoiceNumber, clientName, grandTotal, currencyLabel = 'تومان', shareToken, baseUrl } = options;
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const publicUrl = `${origin}/?invoice_token=${shareToken}`;

  const messageText = `سلام و احترام${clientName ? ` خدمت جناب/سرکار ${clientName}` : ''}\nصورت‌حساب / پیش‌فاکتور رسمی به شماره #${invoiceNumber} به مبلغ ${grandTotal.toLocaleString('fa-IR')} ${currencyLabel} صادر گردید.\nجهت مشاهده، چاپ و تایید آنلاین، روی لینک امن زیر کلیک نمایید:\n${publicUrl}\nسامانه حسابداری هابینو`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(`پیش‌فاکتور رسمی شماره #${invoiceNumber}`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`صورت‌حساب رسمی #${invoiceNumber}`)}&body=${encodeURIComponent(messageText)}`;

  return {
    publicUrl,
    whatsappUrl,
    telegramUrl,
    emailUrl,
    messageText
  };
}

/**
 * Upload signature image to Supabase Storage bucket 'invoice-signatures'
 * and permanently sync with database tables to prevent loss on refresh.
 */
export async function uploadAndRecordSignature(
  options: UploadSignatureOptions
): Promise<UploadSignatureResult> {
  const {
    invoiceId,
    invoiceNumber,
    blob,
    dataUrl,
    signerName,
    signerRole,
    signerNationalId,
    tenantId = 'tenant-main',
    signedAt = new Date().toISOString(),
    signatureHash = ''
  } = options;

  const timestamp = Date.now();
  const fileExt = 'png';
  const fileName = `sig_${invoiceId}_${timestamp}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const shareToken = generateSecureShareToken();

  let publicSignatureUrl = '';

  // 1. First attempt: Direct Server API Proxy
  try {
    const apiResponse = await fetch('/api/invoices/signatures/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoiceId,
        invoiceNumber,
        dataUrl,
        signerName,
        signerRole,
        signerNationalId,
        tenantId,
        signedAt,
        signatureHash,
        shareToken,
        fileName
      })
    });

    if (apiResponse.ok) {
      const result = await apiResponse.json();
      if (result.success && result.signatureUrl) {
        return {
          success: true,
          signatureUrl: result.signatureUrl,
          signatureRecord: result.signatureRecord,
          shareToken: result.shareToken || shareToken,
          cloudPersisted: true,
          storagePersisted: true,
          message: 'امضای رسمی با موفقیت در فضای ابری سوپابیس ذخیره و ثبت شد.'
        };
      }
    }
  } catch (serverErr) {
    console.warn('[SignatureService] Server API upload attempt skipped/failed, using client Supabase SDK:', serverErr);
  }

  let dbPersisted = false;
  let bucketPersisted = false;

  // 2. Second attempt: Client-side Supabase SDK with explicit database persistence
  const config = getSupabaseConfig();
  if (config.isConfigured && config.url && config.key) {
    try {
      const supabase = createClient(config.url, config.key);
      const filePath = `invoices/${invoiceId}/${fileName}`;

      // Upload image to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoice-signatures')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (!uploadError && uploadData) {
        bucketPersisted = true;
        const { data: publicUrlData } = supabase.storage
          .from('invoice-signatures')
          .getPublicUrl(filePath);

        publicSignatureUrl = publicUrlData?.publicUrl || '';
      }

      if (publicSignatureUrl) {
        const verificationToken = shareToken;

        // A. Insert signature log into invoice_signatures table
        const { error: insError } = await supabase.from('invoice_signatures').insert({
          invoice_id: invoiceId,
          tenant_id: tenantId,
          signature_url: publicSignatureUrl,
          ip_address: '127.0.0.1',
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Habino-Browser',
          signed_at: signedAt,
          status: 'signed',
          signer_name: signerName,
          signer_national_id: signerNationalId,
          signer_role: signerRole,
          verification_token: verificationToken,
          signature_hash: signatureHash,
          metadata: { clientUploaded: true, timestamp }
        });

        // B. Explicitly update invoices table so state persists on refresh
        const { error: updError } = await supabase
          .from('invoices')
          .update({
            share_token: verificationToken,
            signature_url: publicSignatureUrl,
            is_signed: true,
            signed_at: signedAt,
            signer_info: {
              signer_name: signerName,
              signer_role: signerRole,
              verification_token: verificationToken
            }
          })
          .eq('id', invoiceId);

        if (!insError && !updError) {
          dbPersisted = true;
        }
      }
    } catch (sdkErr) {
      console.warn('[SignatureService] Client Supabase SDK error:', sdkErr);
    }
  }

  // 3. Fallback if cloud storage was bypassed
  if (!publicSignatureUrl) {
    publicSignatureUrl = dataUrl;
  }

  const signatureRecord: InvoiceSignature = {
    id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    invoice_id: invoiceId,
    tenant_id: tenantId,
    signature_url: publicSignatureUrl,
    ip_address: '127.0.0.1',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Habino-Browser',
    signed_at: signedAt,
    status: 'signed',
    signer_name: signerName,
    signer_national_id: signerNationalId,
    signer_role: signerRole,
    verification_token: shareToken,
    signature_hash: signatureHash,
    metadata: {
      clientUploaded: true,
      timestamp,
      persistedToCloud: dbPersisted
    },
    created_at: signedAt,
    updated_at: signedAt
  };

  const isFullyPersisted = dbPersisted && bucketPersisted;

  if (!isFullyPersisted) {
    try {
      offlineOutbox.enqueue('signature', {
        invoiceId,
        invoiceNumber,
        dataUrl,
        signatureUrl: publicSignatureUrl,
        signerName,
        signerRole,
        signerNationalId,
        shareToken,
        signatureRecord
      }, tenantId);
    } catch (e) {
      console.warn('[SignatureService] Failed to enqueue to offlineOutbox:', e);
    }
  }

  return {
    success: true,
    signatureUrl: publicSignatureUrl,
    signatureRecord,
    shareToken,
    cloudPersisted: dbPersisted,
    storagePersisted: bucketPersisted,
    syncWarning: isFullyPersisted ? undefined : 'امضا در حافظه محلی ذخیره شد اما اتصال دیتابیس ابری برقرار نگردید.',
    message: isFullyPersisted
      ? 'امضا با موفقیت در فضای ابری سوپابیس ذخیره و در دیتابیس ثبت شد.'
      : 'امضا در حافظه محلی ثبت شد. پس از برقراری اتصال به سوپابیس همگام‌سازی خواهد گردید.'
  };
}