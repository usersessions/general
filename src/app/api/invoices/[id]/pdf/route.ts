import { createClient } from '@/lib/supabase/server';
import { renderBusinessPdf } from '@/lib/pdf/documents';
import { loadInvoiceDoc } from '@/lib/sales-data';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await loadInvoiceDoc(supabase, id);
  if (!result) return new Response('Not found', { status: 404 });
  const pdf = await renderBusinessPdf(result.doc);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${result.doc.number}.pdf"`,
    },
  });
}
