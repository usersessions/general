'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import '../quote-calculator.css';

interface BOMItem {
  product_id?: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

interface CustomItem {
  id: number;
  product_id?: string;
  desc: string;
  cost: number;
  qty: number;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // DB client selection and general info
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState(''); // user notes
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Business info
  const [businessName, setBusinessName] = useState('I&S General Supplies Ltd');
  const [quoteNo, setQuoteNo] = useState('Q-Auto');
  const [quoteDate, setQuoteDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Business settings
  const [margin, setMargin] = useState(35);
  const [discount, setDiscount] = useState(0);
  const [vatOn, setVatOn] = useState(false);
  const [vatRate, setVatRate] = useState(16);

  // Job items counts
  const [windowQty, setWindowQty] = useState(1);
  const [doorQty, setDoorQty] = useState(0);
  
  // Custom items list
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [customIdCounter, setCustomIdCounter] = useState(1);
  const [customDesc, setCustomDesc] = useState('');
  const [customCost, setCustomCost] = useState('');

  // BOM items lists (loaded from standard)
  const [windowItems, setWindowItems] = useState<BOMItem[]>([
    { name: "Top Track", qty: 4, unit: "ft", price: 188.10 },
    { name: "Bottom Track", qty: 4, unit: "ft", price: 188.10 },
    { name: "Side Track", qty: 8, unit: "ft", price: 188.10 },
    { name: "Locking", qty: 8, unit: "ft", price: 140.48 },
    { name: "Meeting", qty: 8, unit: "ft", price: 140.48 },
    { name: "Sash", qty: 8, unit: "ft", price: 140.48 },
    { name: "U-Rubber", qty: 7.5, unit: "m", price: 50 },
    { name: "Woolfile", qty: 7.5, unit: "m", price: 50 },
    { name: "Glass", qty: 16, unit: "sqft", price: 185 },
    { name: "Guiders", qty: 8, unit: "pcs", price: 15 },
    { name: "Rollers", qty: 4, unit: "pcs", price: 70 },
    { name: "Crescent Lock", qty: 1, unit: "pcs", price: 150 },
    { name: "Wood Screw", qty: 6, unit: "pcs", price: 10 },
    { name: "Wall Plug", qty: 6, unit: "pcs", price: 2 },
    { name: "Self Tapping", qty: 12, unit: "pcs", price: 3 },
    { name: "Sausage", qty: 1, unit: "pcs", price: 500 },
  ]);

  const [doorItems, setDoorItems] = useState<BOMItem[]>([
    { name: "Closetube", qty: 1, unit: "length", price: 3600 },
    { name: "Gsd1", qty: 1, unit: "length", price: 3600 },
    { name: "Gsd1 Beadings", qty: 1, unit: "length", price: 1000 },
    { name: "TDI", qty: 3, unit: "ft", price: 1333.33 },
    { name: "Fixed Rubber", qty: 7, unit: "m", price: 50 },
    { name: "Glass", qty: 21, unit: "sqft", price: 185 },
    { name: "Rivets", qty: 40, unit: "pcs", price: 3 },
    { name: "Angle Line", qty: 1, unit: "ft", price: 150 },
    { name: "Hinges", qty: 3, unit: "pcs", price: 150 },
    { name: "Latchlock", qty: 1, unit: "pcs", price: 2500 },
    { name: "Wood Screw", qty: 6, unit: "pcs", price: 10 },
    { name: "Wall Plug", qty: 6, unit: "pcs", price: 2 },
    { name: "Sausage", qty: 1, unit: "pcs", price: 500 },
  ]);

  useEffect(() => {
    supabase.from('clients')
      .select('id, name, location, email, phone')
      .order('name')
      .then(({ data }) => setClients(data ?? []));
      
    supabase.from('v_product_stock')
      .select('id, name, unit_type, standard_cost, tracking_mode')
      .order('name')
      .then(({ data }) => setProducts(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedClientObj = clients.find(c => c.id === clientId);

  const fmt = (n: number) => "KES " + Math.round(n).toLocaleString("en-KE");

  const wCost = windowItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const dCost = doorItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

  const linesList: { label: string; cost: number; type: string; qty: number; baseCost: number }[] = [];
  if (windowQty > 0) {
    linesList.push({ label: `Window (4ft × 4ft) × ${windowQty}`, cost: wCost * windowQty, type: 'window', qty: windowQty, baseCost: wCost });
  }
  if (doorQty > 0) {
    linesList.push({ label: `Hinge Door (3ft × 7ft) × ${doorQty}`, cost: dCost * doorQty, type: 'door', qty: doorQty, baseCost: dCost });
  }
  customItems.forEach(item => {
    if (item.qty > 0) {
      linesList.push({ label: `${item.desc} × ${item.qty}`, cost: item.cost * item.qty, type: 'custom', qty: item.qty, baseCost: item.cost });
    }
  });

  const materialsTotal = linesList.reduce((sum, l) => sum + l.cost, 0);
  const profit = materialsTotal * (margin / 100);
  const subtotalBeforeDiscount = materialsTotal + profit;
  const subtotal = Math.max(0, subtotalBeforeDiscount - discount);
  const vat = vatOn ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vat;

  const handleItemChange = (listType: 'window' | 'door', index: number, field: keyof BOMItem, value: any) => {
    const list = listType === 'window' ? [...windowItems] : [...doorItems];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        list[index].product_id = prod.id;
        list[index].name = prod.name;
        list[index].unit = prod.unit_type;
        list[index].price = Number(prod.standard_cost) || 0;
      } else {
        list[index].product_id = undefined;
      }
    } else if (field === 'qty' || field === 'price') {
      list[index][field] = Number(value) || 0;
    } else if (field === 'name' || field === 'unit') {
      list[index][field] = value;
    }
    listType === 'window' ? setWindowItems(list) : setDoorItems(list);
  };

  const addCustomItem = (e: React.MouseEvent) => {
    e.preventDefault();
    const cost = parseFloat(customCost);
    if (!customDesc.trim() || isNaN(cost) || cost <= 0) return;
    setCustomItems([...customItems, { id: customIdCounter, desc: customDesc.trim(), cost, qty: 1 }]);
    setCustomIdCounter(customIdCounter + 1);
    setCustomDesc('');
    setCustomCost('');
  };

  const removeCustomItem = (id: number) => {
    setCustomItems(customItems.filter(item => item.id !== id));
  };

  const changeCustomQty = (id: number, delta: number) => {
    setCustomItems(customItems.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }
      return item;
    }));
  };

  const resetAll = () => {
    setWindowQty(1);
    setDoorQty(0);
    setCustomItems([]);
    setMargin(35);
    setDiscount(0);
    setVatOn(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const calculatorState = {
      calculator: true,
      businessName,
      quoteDate,
      margin,
      discount,
      vatOn,
      vatRate,
      windowQty,
      doorQty,
      customItems,
      windowItems,
      doorItems,
      userNotes: notes
    };

    const { data: q, error: qErr } = await supabase
      .from('quotations')
      .insert({
        client_id: clientId,
        valid_until: validUntil || null,
        vat_rate: vatOn ? vatRate : 0,
        notes: JSON.stringify(calculatorState)
      })
      .select('id')
      .single();

    if (qErr || !q) {
      setError(qErr?.message ?? 'Failed to save quotation.');
      setSubmitting(false);
      return;
    }

    const ratio = subtotalBeforeDiscount > 0 ? subtotal / subtotalBeforeDiscount : 0;

    const itemsToInsert = linesList.map(l => {
      const itemUnitPrice = l.baseCost * (1 + margin / 100) * ratio;
      return {
        quotation_id: q.id,
        description: l.label,
        qty: l.qty,
        unit_price: Number(itemUnitPrice.toFixed(2))
      };
    });

    if (itemsToInsert.length > 0) {
      const { error: linesErr } = await supabase.from('quotation_line_items').insert(itemsToInsert);
      if (linesErr) {
        setError(linesErr.message);
        setSubmitting(false);
        return;
      }
    }

    router.push(`/sales/quotations/${q.id}`);
  }

  return (
    <div className="quote-calc-wrap">
      <div className="wrap">
        <form onSubmit={submit}>
          {error && <div className="panel" style={{ color: 'var(--score)', borderColor: 'var(--score)' }}>{error}</div>}

          {/* Client Selection (Supabase-linked) */}
          <div className="panel">
            <h2><span className="icon">👤</span>Select Client</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', alignItems: 'end' }}>
              <div className="field">
                <label>Client Name <span style={{ color: 'var(--score)' }}>*</span></label>
                <select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Select client...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Valid Until</label>
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Hero Branding Header */}
          <div className="hero">
            <div className="hero-top">
              <div className="hero-brand">
                <div className="hero-logo">
                  <img src="/logo.png" alt="Company logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <div>
                  <h1>{businessName || 'General Supplies Ltd'}</h1>
                  <div className="tag">Quotation for glass &amp; aluminium installation</div>
                </div>
              </div>
              <div className="hero-meta">
                <div>{quoteNo}</div>
                <div>{quoteDate ? new Date(quoteDate).toDateString() : ''}</div>
              </div>
            </div>
            <div className="hero-fields">
              <div className="field">
                <label>Business Name</label>
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="field">
                <label>Quote No.</label>
                <input value={quoteNo} onChange={(e) => setQuoteNo(e.target.value)} />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Customer Name</label>
                <input readOnly value={selectedClientObj ? selectedClientObj.name : ''} placeholder="Auto-populated from select" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input readOnly value={selectedClientObj?.phone || ''} placeholder="Auto-populated" />
              </div>
              <div className="field">
                <label>Site / Location</label>
                <input readOnly value={selectedClientObj?.location || ''} placeholder="Auto-populated" />
              </div>
            </div>
          </div>

          {/* Job Items list */}
          <div className="panel">
            <h2><span className="icon">▦</span>Job Items</h2>
            <div id="items">
              {/* Window Item */}
              <div className="item-card">
                <div className="item-top">
                  <div className="item-icon">▭</div>
                  <div className="item-info">
                    <div className="item-name">Window</div>
                    <div className="item-size">4ft × 4ft, Chinese Profile C70 series</div>
                    <div className="item-price">{fmt(wCost)} materials / unit</div>
                  </div>
                  <div className="qty-controls no-print">
                    <button type="button" className="qty-btn" onClick={() => setWindowQty(Math.max(0, windowQty - 1))}>−</button>
                    <span className="qty-num">{windowQty}</span>
                    <button type="button" className="qty-btn" onClick={() => setWindowQty(windowQty + 1)}>+</button>
                  </div>
                </div>
                <details>
                  <summary>View bill of materials</summary>
                  <table className="bom">
                    <tbody>
                      {windowItems.map((it, i) => (
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

              {/* Door Item */}
              <div className="item-card">
                <div className="item-top">
                  <div className="item-icon">🚪</div>
                  <div className="item-info">
                    <div className="item-name">Hinge Door</div>
                    <div className="item-size">3ft × 7ft, standard</div>
                    <div className="item-price">{fmt(dCost)} materials / unit</div>
                  </div>
                  <div className="qty-controls no-print">
                    <button type="button" className="qty-btn" onClick={() => setDoorQty(Math.max(0, doorQty - 1))}>−</button>
                    <span className="qty-num">{doorQty}</span>
                    <button type="button" className="qty-btn" onClick={() => setDoorQty(doorQty + 1)}>+</button>
                  </div>
                </div>
                <details>
                  <summary>View bill of materials</summary>
                  <table className="bom">
                    <tbody>
                      {doorItems.map((it, i) => (
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

              {/* Custom Items */}
              {customItems.map((item) => (
                <div className="item-card" key={item.id}>
                  <div className="item-top">
                    <div className="item-icon">✎</div>
                    <div className="item-info">
                      <div className="item-name">{item.desc}</div>
                      <div className="item-price">{fmt(item.cost)} materials / unit</div>
                    </div>
                    <div className="qty-controls no-print">
                      <button type="button" className="qty-btn" onClick={() => changeCustomQty(item.id, -1)}>−</button>
                      <span className="qty-num">{item.qty}</span>
                      <button type="button" className="qty-btn" onClick={() => changeCustomQty(item.id, 1)}>+</button>
                      <button type="button" className="remove-x no-print" onClick={() => removeCustomItem(item.id)}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Item Inputs */}
            <div className="add-custom no-print">
              <div className="field">
                <label>Add custom item</label>
                <input value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} placeholder="e.g. Toilet frosted glass 3x2ft" />
              </div>
              <div className="field" style={{ maxWidth: 130 }}>
                <label>Materials cost</label>
                <input type="number" value={customCost} onChange={(e) => setCustomCost(e.target.value)} placeholder="KES" />
              </div>
              <button type="button" className="btn" onClick={addCustomItem}>+ Add</button>
            </div>
          </div>

          {/* Summary panel */}
          <div className="panel">
            <h2><span className="icon">✓</span>Quote Summary</h2>
            <div id="summary">
              {linesList.length === 0 ? (
                <div className="empty">No items yet — add a window, door, or custom item above.</div>
              ) : (
                linesList.map((l, i) => (
                  <div className="summary-line" key={i}>
                    <span>{l.label}</span>
                    <span>{fmt(l.cost)}</span>
                  </div>
                ))
              )}
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

            {/* Note text area for general terms/notes */}
            <div style={{ marginTop: '16px' }}>
              <label className="field">
                <span style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)' }}>Additional Notes / Terms</span>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  rows={3} 
                  style={{ width: '100%', font: 'inherit', padding: '0.45rem', border: '1px solid var(--line)', borderRadius: 9, marginTop: '6px' }} 
                  placeholder="e.g. 50% deposit, balance on completion. Standard sizes apply."
                />
              </label>
            </div>

            <div className="btn-row no-print" style={{ marginTop: '22px' }}>
              <button type="submit" className="btn primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create & Save Quotation'}
              </button>
              <button type="button" className="btn ghost" onClick={resetAll}>Reset</button>
            </div>
            <p className="note">
              Standard sizes: window 4ft×4ft, door 3ft×7ft. Window profile bars are costed as a fraction of a 21ft length
              since offcuts carry over to other jobs; door profile bars are costed as one full length each. Every quantity,
              unit, and price below is editable — open "Business Settings" to update them as supplier prices or standard
              sizes change. Custom sizing isn't auto-calculated yet — add non-standard jobs as a custom item for now.
            </p>
          </div>

          {/* Business Settings & BOM editor */}
          <div className="panel no-print">
            <h2><span className="icon">⚙</span>Business Settings</h2>
            <div className="settings-row">
              <span>Profit margin</span>
              <input type="number" value={margin} onChange={(e) => setMargin(Math.max(0, parseFloat(e.target.value) || 0))} min="0" step="1" />
              <span>%</span>
              <span style={{ marginLeft: 14 }}>Discount</span>
              <input type="number" value={discount} onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} min="0" step="1" />
              <span>KES</span>
              <label style={{ marginLeft: 14 }}>
                <input type="checkbox" checked={vatOn} onChange={(e) => setVatOn(e.target.checked)} /> Add VAT
              </label>
              <input type="number" value={vatRate} onChange={(e) => setVatRate(Math.max(0, parseFloat(e.target.value) || 0))} min="0" step="1" style={{ width: 50 }} />
              <span>%</span>
            </div>

            <details>
              <summary>Window bill of materials — edit quantity, unit &amp; price</summary>
              <table className="editbom">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Price/unit (KES)</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {windowItems.map((it, idx) => (
                    <tr key={idx}>
                      <td className="iname">
                        <select 
                          className="product-select"
                          value={it.product_id || ''}
                          onChange={(e) => handleItemChange('window', idx, 'product_id', e.target.value)}
                        >
                          <option value="">{it.name} (Custom)</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input 
                          className="qty" 
                          type="number" 
                          step="any" 
                          value={it.qty} 
                          onChange={(e) => handleItemChange('window', idx, 'qty', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          className="unit" 
                          type="text" 
                          value={it.unit} 
                          onChange={(e) => handleItemChange('window', idx, 'unit', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          className="price" 
                          type="number" 
                          step="any" 
                          value={it.price} 
                          onChange={(e) => handleItemChange('window', idx, 'price', e.target.value)} 
                        />
                      </td>
                      <td className="linetotal">{fmt(it.qty * it.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bom-subtotal">Window materials subtotal: {fmt(wCost)}</div>
            </details>

            <details style={{ marginTop: 16 }}>
              <summary>Door bill of materials — edit quantity, unit &amp; price</summary>
              <table className="editbom">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Price/unit (KES)</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {doorItems.map((it, idx) => (
                    <tr key={idx}>
                      <td className="iname">
                        <select 
                          className="product-select"
                          value={it.product_id || ''}
                          onChange={(e) => handleItemChange('door', idx, 'product_id', e.target.value)}
                        >
                          <option value="">{it.name} (Custom)</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input 
                          className="qty" 
                          type="number" 
                          step="any" 
                          value={it.qty} 
                          onChange={(e) => handleItemChange('door', idx, 'qty', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          className="unit" 
                          type="text" 
                          value={it.unit} 
                          onChange={(e) => handleItemChange('door', idx, 'unit', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          className="price" 
                          type="number" 
                          step="any" 
                          value={it.price} 
                          onChange={(e) => handleItemChange('door', idx, 'price', e.target.value)} 
                        />
                      </td>
                      <td className="linetotal">{fmt(it.qty * it.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bom-subtotal">Door materials subtotal: {fmt(dCost)}</div>
            </details>
          </div>
        </form>
      </div>
    </div>
  );
}
