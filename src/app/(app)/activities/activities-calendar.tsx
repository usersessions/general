'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Activity {
  id: string;
  title: string;
  description: string;
  scheduled_date: string;
  status: 'pending' | 'completed';
  outcome_report: string | null;
}

export default function ActivitiesCalendar({ currentUserId, isManager, staffList }: { 
  currentUserId: string; 
  isManager: boolean; 
  staffList: {id: string, full_name: string}[] 
}) {
  const supabase = createClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState(currentUserId);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // Side panel form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadActivities = async () => {
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('staff_activities')
      .select('*')
      .eq('profile_id', selectedStaff)
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .order('scheduled_date');
      
    if (data) setActivities(data as Activity[]);
  };

  useEffect(() => {
    loadActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, selectedStaff]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calendar logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
  
  const blanks = Array.from({ length: firstDayIndex === 0 ? 6 : firstDayIndex - 1 }).map((_, i) => <div key={`blank-${i}`} className="calendar-day empty"></div>);
  
  const days = Array.from({ length: daysInMonth }).map((_, i) => {
    const dateNum = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
    const dayActs = activities.filter(a => a.scheduled_date === dateStr);
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    return (
      <div key={dateNum} className={`calendar-day ${isToday ? 'today' : ''}`} onClick={() => setSelectedDay(new Date(year, month, dateNum))}>
        <span className="day-number">{dateNum}</span>
        {dayActs.map(act => (
          <div key={act.id} className={`day-activity ${act.status}`}>
            {act.title}
          </div>
        ))}
      </div>
    );
  });

  const selectedDateStr = selectedDay ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}` : '';
  const selectedActs = activities.filter(a => a.scheduled_date === selectedDateStr);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const { error } = await supabase.from('staff_activities').insert({
      profile_id: selectedStaff,
      title: newTitle.trim(),
      description: newDesc.trim(),
      scheduled_date: selectedDateStr
    });
    
    if (!error) {
      setNewTitle('');
      setNewDesc('');
      loadActivities();
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    await supabase.from('staff_activities').update({ status: newStatus }).eq('id', id);
    loadActivities();
  };

  const updateOutcome = async (id: string, val: string) => {
    await supabase.from('staff_activities').update({ outcome_report: val }).eq('id', id);
    loadActivities();
  };

  return (
    <>
      <div className="activities-header">
        <h1>{isManager && selectedStaff !== currentUserId ? 'Staff Activities' : 'My Activities'}</h1>
        
        <div className="month-nav">
          <button className="btn-secondary" style={{padding: '6px 12px'}} onClick={prevMonth}>&larr;</button>
          <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <button className="btn-secondary" style={{padding: '6px 12px'}} onClick={nextMonth}>&rarr;</button>
        </div>

        <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
          <a 
            href={`/activities/report?month=${year}-${String(month + 1).padStart(2, '0')}&staff=${selectedStaff}`} 
            className="btn-primary" 
            target="_blank"
            style={{textDecoration: 'none'}}
          >
            Generate Report
          </a>

          {isManager && (
            <select 
              className="select-staff" 
              value={selectedStaff} 
              onChange={(e) => setSelectedStaff(e.target.value)}
            >
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.full_name || 'Unnamed'} {s.id === currentUserId ? '(Me)' : ''}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="calendar-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="calendar-header-day">{d}</div>
        ))}
        {blanks}
        {days}
      </div>

      {selectedDay && (
        <>
          <div className="side-panel-overlay" onClick={() => setSelectedDay(null)}></div>
          <div className="side-panel">
            <div className="panel-header">
              <h2>{selectedDay.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}</h2>
              <button className="close-btn" onClick={() => setSelectedDay(null)}>&times;</button>
            </div>
            
            <div className="panel-body">
              {/* Only allow adding if it's the current user, or if manager wants to assign? Usually managers can assign. */}
              <form className="add-form" onSubmit={handleAdd}>
                <h3>Schedule Activity</h3>
                <div className="form-group">
                  <label>Title</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Stock Count" required />
                </div>
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}></textarea>
                </div>
                <button type="submit" className="btn-primary" style={{width: '100%'}}>Add Activity</button>
              </form>

              <div className="activities-list">
                {selectedActs.length === 0 ? (
                  <p style={{color: 'var(--stone)', fontSize: 14, textAlign: 'center'}}>No activities scheduled.</p>
                ) : (
                  selectedActs.map(act => (
                    <div key={act.id} className="activity-card">
                      <div className="status-toggle" onClick={() => toggleStatus(act.id, act.status)}>
                        <input type="checkbox" checked={act.status === 'completed'} readOnly style={{width: 18, height: 18, accentColor: 'var(--success)'}} />
                        <span style={{textDecoration: act.status === 'completed' ? 'line-through' : 'none', color: act.status === 'completed' ? 'var(--stone)' : 'var(--ink)'}}>
                          {act.title}
                        </span>
                      </div>
                      {act.description && <p>{act.description}</p>}
                      
                      {act.status === 'completed' && (
                        <div className="outcome-box">
                          <label style={{fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4}}>Outcome Report:</label>
                          <textarea 
                            defaultValue={act.outcome_report || ''}
                            onBlur={(e) => updateOutcome(act.id, e.target.value)}
                            placeholder="What were the results?"
                          ></textarea>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
