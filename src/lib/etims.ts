// KRA eTIMS OSCU client.
//
// NOTE: this is a deliberately thin wrapper so it can be replaced by the
// open-source @paybilldev/kra-etims-sdk (or an equivalent maintained library)
// after verifying it is still maintained and covers OSCU mode. Only
// submitInvoiceToEtims() is used elsewhere; swapping the implementation is a
// one-file change. Sandbox certification with KRA must happen in parallel
// with the real business registration - this cannot be fully tested without it.

export interface EtimsInvoicePayload {
  invoiceNumber: string;
  issuedAt: string;
  clientName: string;
  clientPin?: string | null;
  vatRate: number;
  lines: { description: string; qty: number; unitPrice: number }[];
}

export interface EtimsResult {
  fiscalDocumentNumber: string;
  qrUrl: string | null;
}

export async function submitInvoiceToEtims(payload: EtimsInvoicePayload): Promise<EtimsResult> {
  const baseUrl = process.env.ETIMS_API_URL;
  if (!baseUrl) throw new Error('ETIMS_API_URL not configured');

  const subtotal = payload.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const taxAmount = subtotal * payload.vatRate / 100;

  const res = await fetch(`${baseUrl}/trnsSales/saveSales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      tin: process.env.ETIMS_TIN ?? '',
      bhfId: process.env.ETIMS_BRANCH_ID ?? '00',
      cmcKey: process.env.ETIMS_CMC_KEY ?? '',
    },
    body: JSON.stringify({
      invcNo: payload.invoiceNumber,
      salesDt: payload.issuedAt.slice(0, 10).replace(/-/g, ''),
      custNm: payload.clientName,
      custTin: payload.clientPin ?? null,
      taxblAmtB: subtotal.toFixed(2),
      taxAmtB: taxAmount.toFixed(2),
      totAmt: (subtotal + taxAmount).toFixed(2),
      itemList: payload.lines.map((l, i) => ({
        itemSeq: i + 1,
        itemNm: l.description.slice(0, 200),
        qty: l.qty,
        prc: l.unitPrice.toFixed(2),
        splyAmt: (l.qty * l.unitPrice).toFixed(2),
        taxTyCd: 'B', // standard-rated 16%
      })),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.resultCd && body.resultCd !== '000')) {
    throw new Error(`eTIMS rejection: ${body.resultMsg ?? res.status}`);
  }

  const data = body.data ?? body;
  const fdn = data.curRcptNo ?? data.rcptNo ?? data.intrlData;
  if (!fdn) throw new Error('eTIMS response missing fiscal document number');
  return {
    fiscalDocumentNumber: String(fdn),
    qrUrl: data.qrCodeUrl ?? data.rcptSign ?? null,
  };
}
