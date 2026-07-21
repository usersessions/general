import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocData } from '@/lib/pdf/documents';

export async function loadQuotationDoc(supabase: SupabaseClient, id: string) {
  const { data: q } = await supabase
    .from('quotations')
    .select('*, client:clients(name, email, location), lines:quotation_line_items(description, qty, unit_price)')
    .eq('id', id)
    .single();
  if (!q) return null;
  const doc: DocData = {
    kind: 'QUOTATION',
    number: q.quote_number,
    date: new Date(q.created_at).toISOString().slice(0, 10),
    validUntil: q.valid_until,
    clientName: q.client?.name ?? 'Client',
    clientLocation: q.client?.location,
    lines: (q.lines ?? []).map((l: any) => ({ description: l.description, qty: Number(l.qty), unit_price: Number(l.unit_price) })),
    vatRate: Number(q.vat_rate),
    notes: q.notes,
  };
  return { record: q, doc };
}

export async function loadInvoiceDoc(supabase: SupabaseClient, id: string) {
  const { data: inv } = await supabase
    .from('sales_invoices')
    .select('*, client:clients(name, email, location), lines:invoice_line_items(description, qty, unit_price)')
    .eq('id', id)
    .single();
  if (!inv) return null;
  const doc: DocData = {
    kind: 'INVOICE',
    number: inv.invoice_number,
    date: (inv.issued_at ?? inv.created_at).slice(0, 10),
    dueDate: inv.due_date,
    clientName: inv.client?.name ?? 'Client',
    clientLocation: inv.client?.location,
    lines: (inv.lines ?? []).map((l: any) => ({ description: l.description, qty: Number(l.qty), unit_price: Number(l.unit_price) })),
    vatRate: Number(inv.vat_rate),
    notes: inv.notes,
    fiscalDocumentNumber: (inv as any).fiscal_document_number ?? null,
  };
  return { record: inv, doc };
}
