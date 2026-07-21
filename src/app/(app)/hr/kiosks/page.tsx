import { createClient } from '@/lib/supabase/server';
import KioskManager from './kiosk-manager';

export default async function KiosksPage() {
  const supabase = await createClient();
  const { data: kiosks } = await supabase.from('kiosk_devices').select('*').order('created_at');
  return (
    <>
      <h1>Kiosk devices</h1>
      <p className="muted">
        Open /kiosk on the workshop tablet and enter the device key once. Add the page to the
        home screen for fullscreen kiosk mode.
      </p>
      <KioskManager kiosks={kiosks ?? []} />
    </>
  );
}
