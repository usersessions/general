import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Called by the kiosk PWA (no user session). Gated by the kiosk device_key,
// which record_attendance_scan validates in the database.
export async function POST(req: Request) {
  const { badgeId, deviceKey } = await req.json().catch(() => ({}));
  if (!badgeId || !deviceKey) {
    return NextResponse.json({ status: 'error', message: 'badgeId and deviceKey required' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('record_attendance_scan', {
    p_badge_id: badgeId,
    p_device_key: deviceKey,
  });
  if (error) return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  return NextResponse.json(data);
}
