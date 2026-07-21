import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderBusinessPdf } from '@/lib/pdf/documents';
import { sendDocumentEmail } from '@/lib/email';
import { loadQuotationDoc } from '@/lib/sales-data';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await loadQuotationDoc(supabase, id);
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const email = result.record.client?.email;
  if (!email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });

  const pdf = await renderBusinessPdf(result.doc);
  try {
    await sendDocumentEmail({
      to: email,
      subject: `Quotation ${result.doc.number} - I&S General Supplies Ltd`,
      text: `Dear ${result.doc.clientName},\n\nPlease find attached quotation ${result.doc.number}.\n\nRegards,\nI&S General Supplies Ltd`,
      filename: `${result.doc.number}.pdf`,
      pdf,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
  if (result.record.status === 'draft') {
    await supabase.from('quotations').update({ status: 'sent' }).eq('id', id);
  }
  return NextResponse.json({ ok: true });
}
