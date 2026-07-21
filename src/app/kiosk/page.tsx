'use client';

import { useEffect, useRef, useState } from 'react';

// Kiosk design mode: opposite of the app. High contrast, huge type,
// full-screen state color, zero navigation, legible from a distance.

type Flash = { kind: 'ok' | 'error' | 'duplicate'; text: string; sub?: string } | null;

const FLASH_BG = { ok: '#0E7D68', error: '#B3402E', duplicate: '#B07A1F' };

export default function KioskPage() {
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [manual, setManual] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [scanning, setScanning] = useState(false);
  const [now, setNow] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    setDeviceKey(localStorage.getItem('kiosk_device_key'));
    const t = setInterval(() => {
      setNow(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  async function submitScan(badgeId: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId, deviceKey: localStorage.getItem('kiosk_device_key') }),
      });
      const body = await res.json();
      if (body.status === 'ok') {
        setFlash({ kind: 'ok', text: body.direction === 'in' ? 'CLOCKED IN' : 'CLOCKED OUT', sub: body.name });
      } else if (body.status === 'duplicate') {
        setFlash({ kind: 'duplicate', text: 'ALREADY SCANNED', sub: body.name });
      } else {
        setFlash({ kind: 'error', text: 'SCAN FAILED', sub: body.message ?? 'Ask HR for help' });
      }
    } catch {
      setFlash({ kind: 'error', text: 'NO CONNECTION', sub: 'Try again in a moment' });
    }
    setTimeout(() => { setFlash(null); busyRef.current = false; }, 3000);
  }

  async function startCamera() {
    if (!('BarcodeDetector' in window)) {
      setFlash({ kind: 'error', text: 'NO CAMERA SCANNER', sub: 'Type the badge code below instead' });
      setTimeout(() => setFlash(null), 4000);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setScanning(true);
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    const tick = async () => {
      if (!videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0 && !busyRef.current) {
          await submitScan(codes[0].rawValue.trim());
        }
      } catch { /* keep scanning */ }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const base: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.75rem',
    padding: '1.5rem',
    textAlign: 'center',
    background: flash ? FLASH_BG[flash.kind] : '#12181D',
    color: '#fff',
    transition: 'background-color 0.15s ease',
  };

  if (deviceKey === null) {
    return (
      <main style={base}>
        <h1 style={{ fontSize: '2rem', color: '#fff' }}>Kiosk setup</h1>
        <p style={{ fontSize: '1.25rem', color: '#B9C4CB' }}>Enter this tablet&apos;s device key (from HR &gt; Kiosks).</p>
        <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem('kiosk_device_key', keyInput.trim()); setDeviceKey(keyInput.trim()); }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input value={keyInput} onChange={(e) => setKeyInput(e.target.value)}
            style={{ fontSize: '1.4rem', padding: '1rem', minWidth: 300 }} autoFocus />
          <button className="btn-primary" style={{ fontSize: '1.4rem', padding: '1rem 2rem' }}>Save key</button>
        </form>
      </main>
    );
  }

  if (flash) {
    return (
      <main style={base} aria-live="assertive">
        <div style={{ fontSize: 'clamp(3rem, 10vw, 5.5rem)', fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.1 }}>
          {flash.kind === 'ok' ? (flash.text === 'CLOCKED IN' ? '\u2713 ' : '\u2192 ') : ''}{flash.text}
        </div>
        {flash.sub && <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 600 }}>{flash.sub}</div>}
      </main>
    );
  }

  return (
    <main style={base}>
      <div style={{ fontSize: '1.125rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7C8B94' }}>
        I&amp;S Attendance
      </div>
      <div className="mono" style={{ fontSize: 'clamp(2.5rem, 9vw, 4rem)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {now || '\u00a0'}
      </div>
      <div style={{ fontSize: '1.5rem', color: '#B9C4CB' }}>Hold your badge to the camera</div>
      <video ref={videoRef} style={{ width: '100%', maxWidth: 440, borderRadius: 14, border: '3px solid #2FBFA4', display: scanning ? 'block' : 'none' }} muted playsInline />
      {!scanning && (
        <button onClick={startCamera}
          style={{ fontSize: '1.75rem', fontWeight: 700, padding: '1.5rem 3.5rem', borderRadius: 12, background: '#0E7D68', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Start scanner
        </button>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { submitScan(manual.trim()); setManual(''); } }}
        style={{ display: 'flex', gap: '0.5rem', opacity: 0.85 }}>
        <input placeholder="Or type badge code" value={manual} onChange={(e) => setManual(e.target.value)}
          style={{ fontSize: '1.25rem', padding: '0.875rem', minWidth: 280 }} />
        <button className="btn-secondary" style={{ fontSize: '1.25rem', padding: '0.875rem 1.5rem' }}>Submit</button>
      </form>
    </main>
  );
}
