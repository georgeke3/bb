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
        <label>Plan Icon Options</label>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md) 0' }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            <div className="text-xs text-secondary">Classic</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="10" opacity="0.2" />
            </svg>
            <div className="text-xs text-secondary">Circled</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              <path d="M12 2L13.5 4.5L16 5L14.5 7L15 9.5L12 8.5L9 9.5L9.5 7L8 5L10.5 4.5L12 2Z" opacity="0.5" />
            </svg>
            <div className="text-xs text-secondary">Mystic</div>
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
