import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { GeminiService } from '../services/gemini';
import ErrorBanner from './ErrorBanner';
import Modal from './Modal';
import HeatMap from './HeatMap';
import { format, differenceInDays, parseISO, subWeeks, startOfDay } from 'date-fns';
import type { ToDo, ContextEvent } from '../types';

interface DashboardProps {
  currentWeek: number;
  geminiService: GeminiService | null;
  onNavigateToWeek: (week: number) => void;
}

export default function Dashboard({ currentWeek, geminiService, onNavigateToWeek }: DashboardProps) {
  const { tasks, events, addEvent, addTask, profile } = useStore();
  const [rawInput, setRawInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  
  const [activeDay, setActiveDay] = useState<{ date: Date, events: ContextEvent[], completedTasks: ToDo[], appointments: ToDo[] } | null>(null);

  // Initialize activeDay to today if not set
  useMemo(() => {
    if (!activeDay) {
      const today = new Date();
      const dayEvents = events.filter(e => isSameDay(parseISO(e.timestamp), today));
      const flat = (taskList: ToDo[]): ToDo[] => taskList.reduce((acc: ToDo[], t) => [...acc, t, ...flat(t.subTasks)], []);
      const allTasks = flat(tasks);
      const dayTasks = allTasks.filter(t => t.isComplete && t.completedAt && isSameDay(parseISO(t.completedAt), today));
      const dayAppts = allTasks.filter(t => t.type === 'appointment' && t.specificDate && isSameDay(parseISO(t.specificDate), today));
      setActiveDay({ date: today, events: dayEvents, completedTasks: dayTasks, appointments: dayAppts });
    }
  }, [events, tasks, activeDay]);

  const activeDayWeek = useMemo(() => {
    if (!activeDay || !profile?.birthDate) return 1;
    const dueDate = parseISO(profile.birthDate);
    const conceptionDate = subWeeks(startOfDay(dueDate), 40);
    const diff = differenceInDays(startOfDay(activeDay.date), conceptionDate);
    return Math.floor(diff / 7) + 1;
  }, [activeDay, profile?.birthDate]);

  const flatIncomplete = (tasks: any[]): any[] => {
    return tasks.reduce((acc, t) => {
      if (!t.isComplete) acc.push(t);
      acc.push(...flatIncomplete(t.subTasks));
      return acc;
    }, []);
  };

  const handleEventSubmit = async () => {
    if (!rawInput.trim() || !geminiService) return;
    
    setIsParsing(true);
    setIsNudging(true);
    setError(null);
    setRecommendations(null);

    try {
      const parsed = await geminiService.parseDailyEvent(rawInput);
      const newEvent = {
        timestamp: new Date().toISOString(),
        rawInput,
        ...parsed,
      };
      addEvent(newEvent);
      setRawInput('');

      const suggestions = await geminiService.getRecommendations(
        currentWeek,
        [newEvent, ...events],
        flatIncomplete(tasks)
      );

      setRecommendations(suggestions.map((s: any) => ({ ...s, selected: true })));
    } catch (e: any) {
      console.error(e);
      setError(`Failed to process: ${e.message}`);
    } finally {
      setIsParsing(false);
      setIsNudging(false);
    }
  };

  const confirmRecommendations = () => {
    if (!recommendations) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const selected = recommendations.filter(r => r.selected).map(({ selected: _, ...rest }) => rest);
    selected.forEach(s => addTask({ ...s, isComplete: false }));
    setRecommendations(null);
  };

  const handleDeepLink = () => {
    const query = encodeURIComponent(`I'm currently at week ${currentWeek} of my partner's pregnancy. Recent events: ${events[0]?.rawInput || 'None'}. Help me with some advice.`);
    window.open(`https://gemini.google.com/app?q=${query}`, '_blank');
  };

  return (
    <div className="dashboard-view">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      <HeatMap 
        currentWeek={currentWeek} 
        onDayClick={(date, dayEvents, dayTasks, dayAppts) => setActiveDay({ date, events: dayEvents, completedTasks: dayTasks, appointments: dayAppts })}
        onWeekClick={onNavigateToWeek}
      />

      {activeDay && (
        <div className="card animate-fade-in" style={{ marginTop: '-1rem', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none', background: 'var(--card-bg-elevated)', boxShadow: 'none', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {isSameDay(activeDay.date, new Date()) ? 'Today · ' : ''}
              {format(activeDay.date, 'EEEE, MMM do')}
            </h4>
            <button className="btn-text" style={{ fontSize: '0.7rem' }} onClick={() => onNavigateToWeek(activeDayWeek)}>
              View Week {activeDayWeek} →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {activeDay.events.length === 0 && activeDay.completedTasks.length === 0 && activeDay.appointments.length === 0 && (
              <p className="text-secondary italic" style={{ fontSize: '0.8rem', margin: 0 }}>No records for this day.</p>
            )}

            {activeDay.appointments.length > 0 && (
              <div>
                <label style={{ fontSize: '0.6rem', marginBottom: '4px' }}>Scheduled</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {activeDay.appointments.map(t => (
                    <div key={t.id} className="text-sm" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--primary)' }}>◈</span>
                      <span className={t.isComplete ? 'text-secondary italic line-through' : ''}>{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeDay.events.length > 0 && (
              <div>
                <label style={{ fontSize: '0.6rem', marginBottom: '4px' }}>Journal</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeDay.events.map(e => (
                    <div key={e.id} style={{ borderLeft: '2px solid var(--border)', paddingLeft: '8px' }}>
                      <div className="text-sm font-bold">{e.aiSummary}</div>
                      <div className="text-xs text-secondary italic" style={{ marginTop: '2px' }}>"{e.rawInput}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDay.completedTasks.length > 0 && (
              <div>
                <label style={{ fontSize: '0.6rem', marginBottom: '4px' }}>Completed</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {activeDay.completedTasks.map(t => (
                    <div key={t.id} className="tag" style={{ fontSize: '0.65rem', background: 'rgba(76, 201, 240, 0.1)', color: 'var(--primary)' }}>
                      ✦ {t.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-sm)' }}>How is she today?</h3>
        <p className="text-xs text-secondary" style={{ marginBottom: 'var(--space-md)' }}>
          Describe a symptom, a mood, or a small milestone.
        </p>
        <textarea 
          placeholder="E.g. She's glowing today, but a bit tired from the walk." 
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          style={{ marginBottom: 'var(--space-lg)' }}
        />
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button 
            className="btn-primary" 
            style={{ flex: 1 }}
            disabled={isParsing || isNudging || !geminiService} 
            onClick={handleEventSubmit}
          >
            {isParsing ? 'Capturing...' : isNudging ? 'Analyzing...' : 'Log & Harmonize'}
          </button>
          <button className="btn-secondary" onClick={handleDeepLink} title="Consult Gemini">
            ✧
          </button>
        </div>
      </div>

      {recommendations && (
        <div className="card" style={{ borderColor: 'var(--primary)', borderWidth: '2px' }}>
          <h3 className="card-title">Suggested Harmony</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            {recommendations.map((r, idx) => (
              <label key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start', cursor: 'pointer', textTransform: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={r.selected} 
                  onChange={() => {
                    const next = [...recommendations];
                    next[idx].selected = !next[idx].selected;
                    setRecommendations(next);
                  }}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
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
  );
}
