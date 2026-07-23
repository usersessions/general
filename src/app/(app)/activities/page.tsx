import { createClient } from '@/lib/supabase/server';
import ActivitiesCalendar from './activities-calendar';
import './activities.css';

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('id, full_name, role').eq('id', user.id).single();
  
  let staffList: any[] = [];
  const isManager = ['admin', 'super_admin', 'hr'].includes(profile?.role || '');
  
  if (isManager) {
    const { data: allProfiles } = await supabase.from('profiles').select('id, full_name').order('full_name');
    if (allProfiles) staffList = allProfiles;
  }

  return (
    <div className="activities-wrap">
      <ActivitiesCalendar 
        currentUserId={user.id} 
        isManager={isManager}
        staffList={staffList}
      />
    </div>
  );
}
