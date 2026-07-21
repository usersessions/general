'use client';

import { useEffect, useRef, useState } from 'react';

type Flash = { kind: 'ok' | 'error' | 'duplicate'; text: string } | null;

export default function KioskPage() {
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [manual, setManual] = useState('');
  const [flash, setFlash] = useState<Flash>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    setDeviceKey(localStorage.getItem('kiosk_device_key'));
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
        setFlash({ kind: 'ok', text: `${body.name} clocked ${body.direction.toUpperCase()}` });
      } else if (body.status === 'duplicate') {
        setFlash({ kind: 'duplicate', text: `${body.name}: already scanned` });
      } else {
        setFlash({ kind: 'error', text: body.message ?? 'Scan failed' });
      }
    } catch {
      setFlash({ kind: 'error', text: 'Network error' });
    }
    setTimeout(() => { setFlash(null); busyRef.current = false; }, 3000);
  }

  async function startCamera() {
    if (!('BarcodeDetector' in window)) {
      setFlash({ kind: 'error', text: 'Camera scanning unsupported on this device; use manual entry' });
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

  if (deviceKey === null) {
    return (
      <main className="pending" style={{ background: '#12202f', color: '#fff' }}>
        <h1>Kiosk setup</h1>
        <p>Enter this tablet&apos;s device key (from HR &gt; Kiosks).</p>
        <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem('kiosk_device_key', keyInput.trim()); setDeviceKey(keyInput.trim()); }}
          style={{ display: 'flex', gap: '0.5rem' }}>
          <input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} style={{ fontSize: '1.2rem', padding: '0.75rem' }} />
          <button className="btn-primary" style={{ fontSize: '1.2rem' }}>Save</button>
        </form>
      </main>
    );
  }

  const flashColors = { ok: '#1e8e3e', error: '#c0392b', duplicate: '#b7791f' };

  return (
    <main style={{ minHeight: '100vh', background: '#12202f', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '1.5rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem' }}>I&amp;S Attendance</h1>
      {flash && (
        <div style={{ background: flashColors[flash.kind], padding: '1.5rem 2rem', borderRadius: 12, fontSize: '1.8rem', fontWeight: 700 }}>
          {flash.text}
        </div>
      )}
      <video ref={videoRef} style={{ width: '100%', maxWidth: 420, borderRadius: 12, display: scanning ? 'block' : 'none' }} muted playsInline />
      {!scanning && (
        <button className="btn-primary" style={{ fontSize: '1.6rem', padding: '1.25rem 2.5rem' }} onClick={startCamera}>
          Start scanning
        </button>
      )}
      <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { submitScan(manual.trim()); setManual(''); } }}
        style={{ display: 'flex', gap: '0.5rem' }}>
        <input placeholder="Or type badge code" value={manual} onChange={(e) => setManual(e.target.value)}
          style={{ fontSize: '1.2rem', padding: '0.75rem', minWidth: 260 }} />
        <button className="btn-secondary" style={{ fontSize: '1.2rem' }}>Scan</button>
      </form>
    </main>
  );
}
