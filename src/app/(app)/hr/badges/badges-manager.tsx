'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { createClient } from '@/lib/supabase/client';

export default function BadgesManager({ profiles, badges }: {
  profiles: { id: string; full_name: string; email: string }[];
  badges: { id: string; profile_id: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [showQr, setShowQr] = useState<string | null>(null);

  const badgeFor = (profileId: string) => badges.find((b) => b.profile_id === profileId);

  async function issueBadge(profileId: string) {
    setError(null);
    // Revoke any existing active badge, then issue a fresh one.
    await supabase.from('employee_badges').update({ active: false }).eq('profile_id', profileId).eq('active', true);
    const { error } = await supabase.from('employee_badges').insert({ profile_id: profileId });
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <div className="card">
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Employee</th><th>Badge</th><th></th></tr></thead>
        <tbody>
          {profiles.map((p) => {
            const badge = badgeFor(p.id);
            return (
              <tr key={p.id}>
                <td>{p.full_name || p.email}</td>
                <td>
                  {badge ? (
                    showQr === badge.id ? (
                      <div style={{ padding: '0.5rem', background: '#fff', display: 'inline-block' }}>
                        <QRCodeSVG value={badge.id} size={160} />
                        <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', margin: '0.25rem 0 0' }}>{badge.id}</p>
                      </div>
                    ) : (
                      <button className="btn-secondary" onClick={() => setShowQr(badge.id)}>Show QR</button>
                    )
                  ) : (
                    <span className="muted">No badge</span>
                  )}
                </td>
                <td>
                  <button className="btn-primary" onClick={() => issueBadge(p.id)}>
                    {badge ? 'Reissue (revokes old)' : 'Issue badge'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
