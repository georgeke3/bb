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
        <label>Refined Week Icons (Single Shape)</label>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md) 0' }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 2 4 8 4 13C4 17.4183 7.58172 21 12 21C16.4183 21 20 17.4183 20 13C20 8 12 2 12 2Z" strokeLinejoin="round" />
              <path d="M12 9C12 9 14 11 12 13C10 15 12 17 12 17" opacity="0.4" />
            </svg>
            <div className="text-xs text-secondary">Stone</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--primary)" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.5C12 21.5 19 14.5 19 9.5C19 5.35786 15.866 2 12 2C8.13401 2 5 5.35786 5 9.5C5 14.5 12 21.5 12 21.5ZM12 12C10.6193 12 9.5 10.8807 9.5 9.5C9.5 8.11929 10.6193 7 12 7C13.3807 7 14.5 8.11929 14.5 9.5C14.5 10.8807 13.3807 12 12 12Z" fillRule="evenodd" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-secondary">Droplet</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 3C15 3 12 6 12 10C12 15 14 21 14 21C14 21 5 16 5 10C5 6 8 3 11 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-xs text-secondary">Gua Sha</div>
          </div>
        </div>

        <label style={{ marginTop: 'var(--space-md)' }}>Refined Plan Icons (Single Stroke)</label>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md) 0' }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12.5C4 12.5 7 16 10 16C13 16 20 7.5 20 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-xs text-secondary">Fluid</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 11.5C5 11.5 7 15 11 15C15 15 19 6 19 6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.5 4" strokeDashcap="round" />
              <path d="M5 11.5C5 11.5 7 15 11 15C15 15 19 6 19 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-xs text-secondary">Cloud</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 13C6 13 8 15 11 15C14 15 18 5 18 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-xs text-secondary">Sleek</div>
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
