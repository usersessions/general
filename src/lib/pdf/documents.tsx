import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font, renderToBuffer,
} from '@react-pdf/renderer';

// Brand faces for outgoing documents. Falls back to Helvetica if the
// remote font cannot be fetched at render time.
try {
  Font.register({
    family: 'Archivo',
    src: 'https://cdn.jsdelivr.net/fontsource/fonts/archivo@latest/latin-600-normal.ttf',
    fontWeight: 600,
  });
  Font.register({
    family: 'PlexMono',
    src: 'https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-400-normal.ttf',
  });
} catch { /* fall back to built-in fonts */ }

const GUNMETAL = '#1F282E';
const ANODITE = '#5A6A72';
const GLASS = '#0E7D68';
const LINE = '#DCE0E2';

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 64, paddingHorizontal: 0, fontSize: 9.5, fontFamily: 'Helvetica', color: GUNMETAL },
  band: { backgroundColor: GUNMETAL, paddingVertical: 22, paddingHorizontal: 40 },
  company: { fontFamily: 'Archivo', fontWeight: 600, fontSize: 15, color: '#FFFFFF' },
  tagline: { fontFamily: 'PlexMono', fontSize: 7, color: '#8FA0A9', letterSpacing: 1.5, marginTop: 3, textTransform: 'uppercase' },
  glassRule: { height: 3, backgroundColor: GLASS },
  body: { paddingHorizontal: 40, paddingTop: 24 },
  docTitle: { fontFamily: 'Archivo', fontWeight: 600, fontSize: 19, letterSpacing: 0.5 },
  docNumber: { fontFamily: 'PlexMono', fontSize: 11, color: ANODITE, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 20 },
  metaLabel: { fontSize: 7, color: ANODITE, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  metaValue: { fontSize: 10 },
  metaMono: { fontFamily: 'PlexMono', fontSize: 9.5 },
  headRow: { flexDirection: 'row', borderBottomWidth: 1.2, borderBottomColor: GUNMETAL, paddingVertical: 6 },
  headCell: { fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.8, color: ANODITE },
  row: { flexDirection: 'row', borderBottomWidth: 0.6, borderBottomColor: LINE, paddingVertical: 6 },
  cDesc: { flex: 5 }, cQty: { flex: 1, textAlign: 'right' }, cPrice: { flex: 2, textAlign: 'right' }, cTotal: { flex: 2, textAlign: 'right' },
  amount: { fontFamily: 'PlexMono', fontSize: 9 },
  totals: { marginTop: 14, alignSelf: 'flex-end', width: 230 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grand: { borderTopWidth: 1.2, borderTopColor: GUNMETAL, paddingTop: 5, marginTop: 3 },
  grandText: { fontFamily: 'Archivo', fontWeight: 600, fontSize: 11 },
  notes: { marginTop: 20, fontSize: 9, color: ANODITE },
  fdn: { marginTop: 12, fontFamily: 'PlexMono', fontSize: 8.5 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 0.6, borderTopColor: LINE,
    paddingVertical: 14, paddingHorizontal: 40,
    fontSize: 7.5, color: ANODITE,
  },
});

const kes = (n: number) =>
  'KES ' + n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface DocLine { description: string; qty: number; unit_price: number }
export interface DocData {
  kind: 'QUOTATION' | 'INVOICE';
  number: string;
  date: string;
  validUntil?: string | null;
  dueDate?: string | null;
  clientName: string;
  clientLocation?: string | null;
  lines: DocLine[];
  vatRate: number;
  notes?: string | null;
  fiscalDocumentNumber?: string | null;
}

function BusinessDocument({ data }: { data: DocData }) {
  const subtotal = data.lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
  const vat = subtotal * data.vatRate / 100;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.band}>
          <Text style={styles.company}>I&S General Supplies Ltd</Text>
          <Text style={styles.tagline}>Aluminium · Glass · Fabrication — Mombasa, Kenya</Text>
        </View>
        <View style={styles.glassRule} />

        <View style={styles.body}>
          <Text style={styles.docTitle}>{data.kind}</Text>
          <Text style={styles.docNumber}>{data.number}</Text>

          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Bill to</Text>
              <Text style={styles.metaValue}>{data.clientName}</Text>
              {data.clientLocation ? <Text style={{ fontSize: 9, color: ANODITE }}>{data.clientLocation}</Text> : null}
            </View>
            <View>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaMono}>{data.date}</Text>
            </View>
            {data.validUntil ? (
              <View>
                <Text style={styles.metaLabel}>Valid until</Text>
                <Text style={styles.metaMono}>{data.validUntil}</Text>
              </View>
            ) : null}
            {data.dueDate ? (
              <View>
                <Text style={styles.metaLabel}>Due date</Text>
                <Text style={styles.metaMono}>{data.dueDate}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.headRow}>
            <Text style={[styles.headCell, styles.cDesc]}>Description</Text>
            <Text style={[styles.headCell, styles.cQty]}>Qty</Text>
            <Text style={[styles.headCell, styles.cPrice]}>Unit price</Text>
            <Text style={[styles.headCell, styles.cTotal]}>Total</Text>
          </View>
          {data.lines.map((l, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cDesc}>{l.description}</Text>
              <Text style={[styles.cQty, styles.amount]}>{l.qty}</Text>
              <Text style={[styles.cPrice, styles.amount]}>{kes(l.unit_price)}</Text>
              <Text style={[styles.cTotal, styles.amount]}>{kes(l.qty * l.unit_price)}</Text>
            </View>
          ))}

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={{ color: ANODITE }}>Subtotal</Text>
              <Text style={styles.amount}>{kes(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ color: ANODITE }}>VAT ({data.vatRate}%)</Text>
              <Text style={styles.amount}>{kes(vat)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grand]}>
              <Text style={styles.grandText}>Total</Text>
              <Text style={[styles.grandText, { fontFamily: 'PlexMono' }]}>{kes(subtotal + vat)}</Text>
            </View>
          </View>

          {data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}
          {data.fiscalDocumentNumber ? (
            <Text style={styles.fdn}>KRA Fiscal Document Number: {data.fiscalDocumentNumber}</Text>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            I&S General Supplies Ltd · Aluminium & UPVC windows and doors, office partitions,
            stainless steel handrails, toughened glass · Serving Mombasa, Kilifi, Lamu and Taita
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderBusinessPdf(data: DocData): Promise<Buffer> {
  return renderToBuffer(<BusinessDocument data={data} />);
}
