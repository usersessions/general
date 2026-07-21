import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1c2430' },
  header: { marginBottom: 20 },
  company: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  small: { color: '#6b7482' },
  docTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 14 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e5ea', paddingVertical: 5 },
  headRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1c2430', paddingVertical: 5, fontFamily: 'Helvetica-Bold' },
  cDesc: { flex: 5 }, cQty: { flex: 1, textAlign: 'right' }, cPrice: { flex: 2, textAlign: 'right' }, cTotal: { flex: 2, textAlign: 'right' },
  totals: { marginTop: 12, alignSelf: 'flex-end', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grand: { fontFamily: 'Helvetica-Bold', borderTopWidth: 1, borderTopColor: '#1c2430', paddingTop: 4, marginTop: 2 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#6b7482' },
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
        <View style={styles.header}>
          <Text style={styles.company}>I&S General Supplies Ltd</Text>
          <Text style={styles.small}>Aluminium & Glass | Mombasa, Kenya</Text>
          <Text style={styles.docTitle}>{data.kind} {data.number}</Text>
          <Text>Date: {data.date}</Text>
          {data.validUntil ? <Text>Valid until: {data.validUntil}</Text> : null}
          {data.dueDate ? <Text>Due date: {data.dueDate}</Text> : null}
          <Text style={{ marginTop: 8, fontFamily: 'Helvetica-Bold' }}>Bill to:</Text>
          <Text>{data.clientName}</Text>
          {data.clientLocation ? <Text style={styles.small}>{data.clientLocation}</Text> : null}
        </View>

        <View style={styles.headRow}>
          <Text style={styles.cDesc}>Description</Text>
          <Text style={styles.cQty}>Qty</Text>
          <Text style={styles.cPrice}>Unit price</Text>
          <Text style={styles.cTotal}>Total</Text>
        </View>
        {data.lines.map((l, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.cDesc}>{l.description}</Text>
            <Text style={styles.cQty}>{l.qty}</Text>
            <Text style={styles.cPrice}>{kes(l.unit_price)}</Text>
            <Text style={styles.cTotal}>{kes(l.qty * l.unit_price)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text>Subtotal</Text><Text>{kes(subtotal)}</Text></View>
          <View style={styles.totalRow}><Text>VAT ({data.vatRate}%)</Text><Text>{kes(vat)}</Text></View>
          <View style={[styles.totalRow, styles.grand]}><Text>Total</Text><Text>{kes(subtotal + vat)}</Text></View>
        </View>

        {data.notes ? <Text style={{ marginTop: 16 }}>{data.notes}</Text> : null}
        {data.fiscalDocumentNumber ? (
          <Text style={{ marginTop: 10 }}>KRA Fiscal Document Number: {data.fiscalDocumentNumber}</Text>
        ) : null}

        <Text style={styles.footer}>
          I&S General Supplies Ltd | Aluminium & UPVC windows and doors, office partitions,
          stainless steel handrails, toughened glass | Mombasa, Kilifi, Lamu, Taita
        </Text>
      </Page>
    </Document>
  );
}

export async function renderBusinessPdf(data: DocData): Promise<Buffer> {
  return renderToBuffer(<BusinessDocument data={data} />);
}
