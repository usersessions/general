import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { submitInvoiceToEtims } from '@/lib/etims';

const MAX_ATTEMPTS = 8;

// Called by Vercel Cron (vercel.json). Retries failed submissions with
// exponential backoff until success or abandonment (manual review).
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: due } = await supabase
    .from('etims_submissions')
    .select('id, invoice_id, attempts')
    .in('status', ['queued', 'failed'])
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at')
    .limit(10);

  const results: Record<string, string> = {};

  for (const sub of due ?? []) {
    await supabase.from('etims_submissions').update({ status: 'processing' }).eq('id', sub.id);

    const { data: inv } = await supabase
      .from('sales_invoices')
      .select('invoice_number, issued_at, vat_rate, client:clients(name), lines:invoice_line_items(description, qty, unit_price)')
      .eq('id', sub.invoice_id)
      .single();

    try {
      if (!inv) throw new Error('Invoice not found');
      const result = await submitInvoiceToEtims({
        invoiceNumber: inv.invoice_number,
        issuedAt: inv.issued_at ?? new Date().toISOString(),
        clientName: (inv.client as any)?.name ?? 'Walk-in customer',
        vatRate: Number(inv.vat_rate),
        lines: (inv.lines ?? []).map((l: any) => ({
          description: l.description, qty: Number(l.qty), unitPrice: Number(l.unit_price),
        })),
      });
      await supabase.from('sales_invoices').update({
        fiscal_document_number: result.fiscalDocumentNumber,
        etims_qr_url: result.qrUrl,
      }).eq('id', sub.invoice_id);
      await supabase.from('etims_submissions').update({
        status: 'success', attempts: sub.attempts + 1, last_error: null,
      }).eq('id', sub.id);
      results[sub.id] = 'success';
    } catch (e: any) {
      const attempts = sub.attempts + 1;
      const abandoned = attempts >= MAX_ATTEMPTS;
      const backoffMinutes = Math.min(5 * 2 ** attempts, 24 * 60);
      await supabase.from('etims_submissions').update({
        status: abandoned ? 'abandoned' : 'failed',
        attempts,
        last_error: String(e.message ?? e).slice(0, 500),
        next_retry_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
      }).eq('id', sub.id);
      results[sub.id] = abandoned ? 'abandoned' : `retry in ${backoffMinutes}m`;
    }
  }

  return NextResponse.json({ processed: (due ?? []).length, results });
}
