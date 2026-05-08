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
  
  const [selectedDay, setSelectedDay] = useState<{ date: Date, events: ContextEvent[], completedTasks: ToDo[] } | null>(null);

  const selectedDayWeek = useMemo(() => {
    if (!selectedDay || !profile?.birthDate) return 1;
    const dueDate = parseISO(profile.birthDate);
    const conceptionDate = subWeeks(startOfDay(dueDate), 40);
    const diff = differenceInDays(startOfDay(selectedDay.date), conceptionDate);
    return Math.floor(diff / 7) + 1;
  }, [selectedDay, profile?.birthDate]);

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
    const selected = recommendations.filter(r => r.selected).map(({ selected, ...rest }) => rest);
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

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <label>Week Icon: Gua Sha / Organic Pins</label>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md) 0' }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C12 22 20 16 20 10C20 5.58 16.42 2 12 2C7.58 2 4 5.58 4 10C4 16 12 22 12 22ZM12 13C10.34 13 9 11.66 9 10C9 8.34 10.34 7 12 7C13.66 7 15 8.34 15 10C15 11.66 13.66 13 12 13Z" opacity="0.3" />
              <path d="M12 6C12 6 15 9 12 12C9 15 12 18 12 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="text-xs text-secondary">Fluid</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 2C13 2 10 5 10 9C10 14 12 22 12 22C12 22 21 15 21 9C21 5 19 2 17 2Z" opacity="0.4" />
              <path d="M8 4C5 4 2 7 2 11C2 16 4 22 4 22C4 22 10 16 10 11C10 7 9 4 8 4Z" opacity="0.6" />
            </svg>
            <div className="text-xs text-secondary">Gua Sha</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8 2 4 6 4 10C4 15 12 22 12 22C12 22 20 15 20 10C20 6 16 2 12 2Z" opacity="0.2" />
              <circle cx="12" cy="10" r="3" fill="white" />
              <path d="M12 4L12 16" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
            </svg>
            <div className="text-xs text-secondary">Natural</div>
          </div>
        </div>

        <label style={{ marginTop: 'var(--space-md)' }}>Plan Icon: Cloud / Curved Checks</label>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md) 0' }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13C5 13 7.5 15.5 10 13C12.5 10.5 19 7 19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-xs text-secondary">Cloud</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12C4 12 7 16 10 16C13 16 20 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 16C11 14 13 13 15 13" opacity="0.3" strokeLinecap="round" />
            </svg>
            <div className="text-xs text-secondary">Curved</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.5 14.5L5.5 10.5L4 12L9.5 17.5L20 7L18.5 5.5L9.5 14.5Z" />
              <circle cx="10" cy="14" r="4" opacity="0.2" />
            </svg>
            <div className="text-xs text-secondary">Soft</div>
          </div>
        </div>
      </div>

      <HeatMap 
        currentWeek={currentWeek} 
        onDayClick={(date, dayEvents, dayTasks) => setSelectedDay({ date, events: dayEvents, completedTasks: dayTasks })}
        onWeekClick={onNavigateToWeek}
      />

      <Modal 
        isOpen={!!selectedDay}
        title={selectedDay ? format(selectedDay.date, 'EEEE, MMMM do') : ''}
        onConfirm={() => setSelectedDay(null)}
        onCancel={() => setSelectedDay(null)}
        confirmText="Dismiss"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {selectedDay && (
            <button className="btn-text" onClick={() => { onNavigateToWeek(selectedDayWeek); setSelectedDay(null); }}>
              View Week {selectedDayWeek} Insights
            </button>
          )}

          {selectedDay?.events.length === 0 && selectedDay?.completedTasks.length === 0 && (
            <p className="text-secondary italic">No activity recorded.</p>
          )}
          
          {selectedDay && selectedDay.events.length > 0 && (
            <div>
              <label>Daily Journal</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {selectedDay.events.map(e => (
                  <div key={e.id} className="card" style={{ padding: 'var(--space-md)', marginBottom: 0, borderRadius: 'var(--radius-md)', background: 'var(--card-bg-elevated)' }}>
                    <div className="font-bold">{e.aiSummary}</div>
                    <div className="text-xs text-secondary italic" style={{ marginTop: 'var(--space-xs)' }}>"{e.rawInput}"</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDay && selectedDay.completedTasks.length > 0 && (
            <div>
              <label>Completed Acts</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {selectedDay.completedTasks.map(t => (
                  <div key={t.id} className="list-item" style={{ padding: 'var(--space-xs) 0' }}>
                    <div className="text-sm"><span style={{ color: 'var(--primary)', marginRight: 'var(--space-sm)' }}>✦</span>{t.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <div className="card">
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
