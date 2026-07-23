'use client';

import React from 'react';
import '../quote-calculator.css';

interface QuoteDetailCalculatorProps {
  calculatorState: any;
  client: any;
  quoteNumber: string;
  quoteDateStr: string;
  validUntilStr: string | null;
}

export default function QuoteDetailCalculator({
  calculatorState,
  client,
  quoteNumber,
  quoteDateStr,
  validUntilStr
}: QuoteDetailCalculatorProps) {
  const {
    businessName = 'I&S General Supplies Ltd',
    margin = 35,
    discount = 0,
    vatOn = false,
    vatRate = 16,
    windowQty = 0,
    doorQty = 0,
    customItems = [],
    windowItems = [],
    doorItems = [],
    userNotes = ''
  } = calculatorState;

  const fmt = (n: number) => "KES " + Math.round(n).toLocaleString("en-KE");

  const wCost = windowItems.reduce((sum: number, item: any) => sum + (item.qty * item.price), 0);
  const dCost = doorItems.reduce((sum: number, item: any) => sum + (item.qty * item.price), 0);

  const linesList: any[] = [];
  if (windowQty > 0) {
    linesList.push({ label: `Window (4ft × 4ft) × ${windowQty}`, cost: wCost * windowQty });
  }
  if (doorQty > 0) {
    linesList.push({ label: `Hinge Door (3ft × 7ft) × ${doorQty}`, cost: dCost * doorQty });
  }
  customItems.forEach((item: any) => {
    if (item.qty > 0) {
      linesList.push({ label: `${item.desc} × ${item.qty}`, cost: item.cost * item.qty });
    }
  });

  const materialsTotal = linesList.reduce((sum, l) => sum + l.cost, 0);
  const profit = materialsTotal * (margin / 100);
  const subtotalBeforeDiscount = materialsTotal + profit;
  const subtotal = Math.max(0, subtotalBeforeDiscount - discount);
  const vat = vatOn ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vat;

  const shareWhatsapp = () => {
    const biz = businessName;
    const custName = client?.name || '';
    const quoteNo = quoteNumber;
    const totalText = fmt(total);

    let msg = `*${biz}*\nQuotation ${quoteNo}${custName ? " for " + custName : ""}\n\n`;
    linesList.forEach(l => {
      msg += `${l.label}: ${fmt(l.cost)}\n`;
    });
    msg += `\n*Total Quote: ${totalText}*`;

    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  };

  return (
    <div className="quote-calc-wrap" style={{ boxShadow: 'none', background: 'transparent', padding: '0 0 20px 0' }}>
      <div className="wrap">
        
        {/* Hero Branding Header */}
        <div className="hero">
          <div className="hero-top">
            <div className="hero-brand">
              <div className="hero-logo">
                <img src="/logo.png" alt="Company logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div>
                <h1>{businessName}</h1>
                <div className="tag">Quotation for glass &amp; aluminium installation</div>
              </div>
            </div>
            <div className="hero-meta">
              <div>{quoteNumber}</div>
              <div>{quoteDateStr ? new Date(quoteDateStr).toDateString() : ''}</div>
              {validUntilStr && <div style={{ fontSize: '11px', opacity: 0.8 }} className="mono">Valid until: {new Date(validUntilStr).toDateString()}</div>}
            </div>
          </div>
          
          <div className="hero-fields">
            <div className="field">
              <label>Business Name</label>
              <input readOnly value={businessName} />
            </div>
            <div className="field">
              <label>Quote No.</label>
              <input readOnly value={quoteNumber} />
            </div>
            <div className="field">
              <label>Date</label>
              <input readOnly value={quoteDateStr} />
            </div>
            <div className="field">
              <label>Customer Name</label>
              <input readOnly value={client?.name || ''} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input readOnly value={client?.phone || 'N/A'} />
            </div>
            <div className="field">
              <label>Site / Location</label>
              <input readOnly value={client?.location || 'N/A'} />
            </div>
          </div>
        </div>

        {/* Job Items list */}
        <div className="panel">
          <h2><span className="icon">▦</span>Job Items</h2>
          <div id="items">
            {/* Window Item */}
            {windowQty > 0 && (
              <div className="item-card">
                <div className="item-top">
                  <div className="item-icon">▭</div>
                  <div className="item-info">
                    <div className="item-name">Window</div>
                    <div className="item-size">4ft × 4ft, Chinese Profile C70 series</div>
                    <div className="item-price">{fmt(wCost)} materials / unit</div>
                  </div>
                  <div className="qty-controls">
                    <span style={{ fontSize: '13.5px', color: 'var(--ink-soft)', marginRight: '6px' }}>Qty:</span>
                    <span className="qty-num">{windowQty}</span>
                  </div>
                </div>
                <details>
                  <summary>View bill of materials</summary>
                  <table className="bom">
                    <tbody>
                      {windowItems.map((it: any, i: number) => (
                        <tr key={i}>
                          <td>{it.name}</td>
                          <td className="num">{it.qty} {it.unit}</td>
                          <td className="num">{fmt(it.qty * it.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </div>
            )}

            {/* Door Item */}
            {doorQty > 0 && (
              <div className="item-card">
                <div className="item-top">
                  <div className="item-icon">🚪</div>
                  <div className="item-info">
                    <div className="item-name">Hinge Door</div>
                    <div className="item-size">3ft × 7ft, standard</div>
                    <div className="item-price">{fmt(dCost)} materials / unit</div>
                  </div>
                  <div className="qty-controls">
                    <span style={{ fontSize: '13.5px', color: 'var(--ink-soft)', marginRight: '6px' }}>Qty:</span>
                    <span className="qty-num">{doorQty}</span>
                  </div>
                </div>
                <details>
                  <summary>View bill of materials</summary>
                  <table className="bom">
                    <tbody>
                      {doorItems.map((it: any, i: number) => (
                        <tr key={i}>
                          <td>{it.name}</td>
                          <td className="num">{it.qty} {it.unit}</td>
                          <td className="num">{fmt(it.qty * it.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </div>
            )}

            {/* Custom Items */}
            {customItems.map((item: any) => (
              <div className="item-card" key={item.id}>
                <div className="item-top">
                  <div className="item-icon">✎</div>
                  <div className="item-info">
                    <div className="item-name">{item.desc}</div>
                    <div className="item-price">{fmt(item.cost)} materials / unit</div>
                  </div>
                  <div className="qty-controls">
                    <span style={{ fontSize: '13.5px', color: 'var(--ink-soft)', marginRight: '6px' }}>Qty:</span>
                    <span className="qty-num">{item.qty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary panel */}
        <div className="panel">
          <h2><span className="icon">✓</span>Quote Summary</h2>
          <div id="summary">
            {linesList.map((l, i) => (
              <div className="summary-line" key={i}>
                <span>{l.label}</span>
                <span>{fmt(l.cost)}</span>
              </div>
            ))}
            <div className="summary-line" style={{ borderTop: '1px solid var(--line)', paddingTop: '10px', marginTop: '10px' }}>
              <span>Materials subtotal</span>
              <span>{fmt(materialsTotal)}</span>
            </div>
            <div className="summary-line">
              <span>Profit ({margin}%)</span>
              <span>{fmt(profit)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-line discount">
                <span>Discount</span>
                <span>-{fmt(discount)}</span>
              </div>
            )}
            {vatOn && (
              <div className="summary-line">
                <span>VAT ({vatRate}%)</span>
                <span>{fmt(vat)}</span>
              </div>
            )}
          </div>
          <div className="total-card">
            <div className="label">Total Quote</div>
            <div className="amount">{fmt(total)}</div>
          </div>

          {/* Notes / Terms */}
          {userNotes && (
            <div style={{ marginTop: '20px', borderTop: '1px dashed var(--line)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Additional Notes / Terms</h4>
              <p style={{ margin: 0, fontSize: '13.5px', whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{userNotes}</p>
            </div>
          )}

          <div className="btn-row no-print" style={{ marginTop: '22px' }}>
            <button type="button" className="btn primary" onClick={() => window.print()}>Print / Save PDF</button>
            <button type="button" className="btn whatsapp" onClick={shareWhatsapp}>Share on WhatsApp</button>
          </div>
        </div>

      </div>
    </div>
  );
}
