import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocData } from '@/lib/pdf/documents';

export async function loadQuotationDoc(supabase: SupabaseClient, id: string) {
  const { data: q } = await supabase
    .from('quotations')
    .select('*, client:clients(name, email, location, phone), lines:quotation_line_items(description, qty, unit_price)')
    .eq('id', id)
    .single();
  if (!q) return null;

  // Try to parse calculator state from the notes JSON blob
  let calcState: any = null;
  let userNotes: string | null = q.notes;
  try {
    const parsed = JSON.parse(q.notes ?? '');
    if (parsed?.calculator) {
      calcState = parsed;
      userNotes = parsed.userNotes || null;
    }
  } catch { /* plain text notes, use as-is */ }

  let lines: { description: string; qty: number; unit_price: number }[];
  let discount = 0;
  let margin = 0;

  if (calcState) {
    // Reconstruct the exact selling lines from the calculator state
    const windowItems: any[] = calcState.windowItems ?? [];
    const doorItems: any[] = calcState.doorItems ?? [];
    const customItems: any[] = calcState.customItems ?? [];

    const wCost = windowItems.reduce((s: number, it: any) => s + it.qty * it.price, 0);
    const dCost = doorItems.reduce((s: number, it: any) => s + it.qty * it.price, 0);

    const rawLines: { label: string; cost: number; qty: number; baseCost: number }[] = [];
    if ((calcState.windowQty ?? 0) > 0) {
      rawLines.push({ label: `Window (4ft × 4ft) × ${calcState.windowQty}`, cost: wCost * calcState.windowQty, qty: calcState.windowQty, baseCost: wCost });
    }
    if ((calcState.doorQty ?? 0) > 0) {
      rawLines.push({ label: `Hinge Door (3ft × 7ft) × ${calcState.doorQty}`, cost: dCost * calcState.doorQty, qty: calcState.doorQty, baseCost: dCost });
    }
    customItems.forEach((item: any) => {
      if (item.qty > 0) {
        rawLines.push({ label: `${item.desc} × ${item.qty}`, cost: item.cost * item.qty, qty: item.qty, baseCost: item.cost });
      }
    });

    margin = calcState.margin ?? 35;
    discount = calcState.discount ?? 0;
    const vatOn = calcState.vatOn ?? false;

    const materialsTotal = rawLines.reduce((s, l) => s + l.cost, 0);
    const subtotalBeforeDiscount = materialsTotal * (1 + margin / 100);
    const subtotal = Math.max(0, subtotalBeforeDiscount - discount);
    const ratio = subtotalBeforeDiscount > 0 ? subtotal / subtotalBeforeDiscount : 0;

    lines = rawLines.map(l => ({
      description: l.label,
      qty: 1,   // already multiplied in label, show as single line item
      unit_price: Number((l.baseCost * (1 + margin / 100) * ratio * l.qty).toFixed(2)),
    }));
  } else {
    // Standard quotation: use stored line items
    lines = (q.lines ?? []).map((l: any) => ({
      description: l.description,
      qty: Number(l.qty),
      unit_price: Number(l.unit_price),
    }));
  }

  const doc: DocData = {
    kind: 'QUOTATION',
    number: q.quote_number,
    date: new Date(q.created_at).toISOString().slice(0, 10),
    validUntil: q.valid_until,
    clientName: q.client?.name ?? 'Client',
    clientLocation: q.client?.location,
    clientPhone: q.client?.phone ?? null,
    lines,
    vatRate: calcState?.vatOn ? Number(calcState.vatRate) : Number(q.vat_rate),
    notes: userNotes,
    discount: discount > 0 ? discount : null,
    margin: margin > 0 ? margin : null,
  };
  return { record: q, doc };
}

export async function loadInvoiceDoc(supabase: SupabaseClient, id: string) {
  const { data: inv } = await supabase
    .from('sales_invoices')
    .select('*, client:clients(name, email, location, phone), lines:invoice_line_items(description, qty, unit_price)')
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
    clientPhone: inv.client?.phone ?? null,
    lines: (inv.lines ?? []).map((l: any) => ({ description: l.description, qty: Number(l.qty), unit_price: Number(l.unit_price) })),
    vatRate: Number(inv.vat_rate),
    notes: inv.notes,
    fiscalDocumentNumber: (inv as any).fiscal_document_number ?? null,
  };
  return { record: inv, doc };
}
