import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { ToDo } from '../types';
import { addWeeks, format, parseISO, endOfWeek, startOfDay } from 'date-fns';
import Modal from './Modal';
import { calculateProgress } from '../utils/progressHelpers';
import { GeminiService } from '../services/gemini';
import { getAnniversaryDate, getWeekForDate, getTrimester } from '../utils/dateHelpers';

interface WeekViewProps {
  currentWeek: number;
  viewingWeek: number;
  setViewingWeek: (week: number) => void;
  geminiService: GeminiService | null;
}

export default function WeekView({ currentWeek, viewingWeek, setViewingWeek, geminiService }: WeekViewProps) {
  const { tasks, events, profile, deleteEvent, addTask } = useStore();
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isNudging, setIsNudging] = useState(false);
  const [recommendations, setRecommendations] = useState<any[] | null>(null);

  const anniversaryDate = useMemo(() => {
    if (!profile?.birthDate) return null;
    return getAnniversaryDate(profile.birthDate);
  }, [profile?.birthDate]);

  const { globalProgress, weeklyProgress } = calculateProgress(tasks, viewingWeek);

  const getWeekRange = (week: number) => {
    if (!anniversaryDate) return '';
    const weekStart = addWeeks(anniversaryDate, week - 1);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 6 });
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  const getItemsForWeek = (week: number) => {
    const weekTasks: ToDo[] = [];
    const weekAppts: ToDo[] = [];
    
    const traverse = (t: ToDo) => {
      if (t.type === 'appointment' && t.specificDate) {
        const apptDate = startOfDay(parseISO(t.specificDate));
        if (anniversaryDate) {
          const apptWeek = getWeekForDate(apptDate, anniversaryDate);
          if (apptWeek === week) weekAppts.push(t);
        }
      } else if (t.minWeek === week) {
        weekTasks.push(t);
      }
      t.subTasks.forEach(traverse);
    };
    tasks.forEach(traverse);

    const weekEvents = events.filter(e => {
      if (!anniversaryDate) return false;
      const eventDate = startOfDay(parseISO(e.timestamp));
      const diffWeek = getWeekForDate(eventDate, anniversaryDate);
      return diffWeek === week;
    });

    return { weekTasks, weekAppts, weekEvents };
  };

  const { weekTasks, weekAppts, weekEvents } = getItemsForWeek(viewingWeek);
  const isCurrent = viewingWeek === currentWeek;

  const handleManualNudge = async () => {
    if (!geminiService) return;
    setIsNudging(true);
    setRecommendations(null);
    try {
      const flatIncomplete = (tasks: any[]): any[] => {
        return tasks.reduce((acc, t) => {
          if (!t.isComplete) acc.push(t);
          acc.push(...flatIncomplete(t.subTasks));
          return acc;
        }, []);
      };

      const suggestions = await geminiService.getRecommendations(
        currentWeek,
        events,
        flatIncomplete(tasks)
      );
      setRecommendations(suggestions.map((s: any) => ({ ...s, selected: true })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsNudging(false);
    }
  };

  const confirmRecommendations = () => {
    if (!recommendations) return;
    const selected = recommendations.filter(r => r.selected).map(({ selected: _, ...rest }) => rest);
    selected.forEach(s => addTask({ ...s, isComplete: false }));
    setRecommendations(null);
  };

  return (
    <div className="week-view">
      <Modal 
        isOpen={!!eventToDelete}
        title="Remove Record"
        message="Are you sure you want to delete this historical entry?"
        onConfirm={() => {
          if (eventToDelete) deleteEvent(eventToDelete);
          setEventToDelete(null);
        }}
        onCancel={() => setEventToDelete(null)}
        confirmText="Remove"
        isDanger={true}
      />

      <div className="card">
        <label>Journey Alignment</label>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}>
          <span className="text-xs text-secondary">Global Critical Progress</span>
          <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{Math.round(globalProgress)}%</span>
        </div>
        <div className="progress-bar-container" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="progress-bar-fill" style={{ width: `${globalProgress}%` }}></div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
          <span className="text-xs text-secondary">Week {viewingWeek} Attainment</span>
          <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{Math.round(weeklyProgress)}%</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${weeklyProgress}%` }}></div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 'var(--space-lg)',
          borderBottom: '1px solid var(--border)',
          background: isCurrent ? 'var(--primary-soft)' : 'transparent'
        }}>
          <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }} disabled={viewingWeek <= 1} onClick={() => setViewingWeek(viewingWeek - 1)}>
            ←
          </button>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-xs)' }}>
              <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Week {viewingWeek}</h3>
              <span className="tag" style={{ fontSize: '0.6rem', opacity: 0.8 }}>T{getTrimester(viewingWeek)}</span>
            </div>
            <div className="text-xs text-secondary" style={{ marginTop: '2px' }}>{getWeekRange(viewingWeek)}</div>
          </div>

          <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }} disabled={viewingWeek >= 42} onClick={() => setViewingWeek(viewingWeek + 1)}>
            →
          </button>
        </div>

        {!isCurrent && (
          <div style={{ padding: 'var(--space-sm)', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg-color)' }}>
            <button className="btn-text" onClick={() => setViewingWeek(currentWeek)}>Align to Today</button>
          </div>
        )}

        <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {weekAppts.length > 0 && (
            <div>
              <label>Celestial Appointments</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                {weekAppts.map(a => (
                  <div key={a.id} className="card" style={{ padding: 'var(--space-md)', marginBottom: 0, borderRadius: 'var(--radius-md)', background: 'rgba(255, 140, 66, 0.05)', border: '1px solid rgba(255, 140, 66, 0.2)', display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.2rem' }}>◈</span>
                    <div>
                      <div className="font-bold text-sm">{a.title}</div>
                      <div className="text-xs text-secondary" style={{ marginTop: '2px' }}>{a.specificDate ? format(parseISO(a.specificDate), 'EEEE, MMM d') : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label>Active Intentions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              {weekTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm) 0' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.isComplete ? 'var(--success)' : (t.isCritical ? 'var(--primary)' : 'var(--text-muted)') }}></div>
                  <span className={`text-sm ${t.isComplete ? 'text-secondary italic' : 'text-primary'}`} style={{ textDecoration: t.isComplete ? 'line-through' : 'none' }}>{t.title}</span>
                </div>
              ))}
              {weekTasks.length === 0 && <div className="text-sm text-secondary italic">No intentions scheduled.</div>}
            </div>
          </div>

          <div>
            <label>Chronicle of Events</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              {weekEvents.map(e => (
                <div key={e.id} className="card" style={{ padding: 'var(--space-md)', marginBottom: 0, borderRadius: 'var(--radius-md)', background: 'var(--card-bg-elevated)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div className="text-xs text-secondary" style={{ marginBottom: '4px' }}>{format(parseISO(e.timestamp), 'EEEE, MMM d · h:mm a')}</div>
                    <div className="text-sm font-bold">{e.aiSummary}</div>
                  </div>
                  <button onClick={() => setEventToDelete(e.id)} className="btn-text" style={{ color: 'var(--critical)', textDecoration: 'none', fontSize: '0.7rem' }}>Remove</button>
                </div>
              ))}
              {weekEvents.length === 0 && <div className="text-sm text-secondary italic">No events recorded.</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Proactive Harmony</h3>
        <p className="text-xs text-secondary" style={{ marginBottom: 'var(--space-md)' }}>Receive AI-guided intentions for this week.</p>
        <button className="btn-secondary" style={{ width: '100%' }} disabled={isNudging || !geminiService} onClick={handleManualNudge}>
          {isNudging ? 'Listening...' : 'Seek Guidance'}
        </button>

        {recommendations && (
          <div style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {recommendations.map((r, idx) => (
                <label key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start', cursor: 'pointer', textTransform: 'none' }}>
                  <input type="checkbox" checked={r.selected} onChange={() => {
                    const next = [...recommendations];
                    next[idx].selected = !next[idx].selected;
                    setRecommendations(next);
                  }} style={{ width: '18px', height: '18px', marginTop: '2px' }} />
                  <div>
                    <div className="font-bold text-sm">{r.title}</div>
                    <div className="text-xs text-secondary">{r.description}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={confirmRecommendations}>Integrate</button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setRecommendations(null)}>Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
