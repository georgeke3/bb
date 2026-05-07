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

      {/* Temporary Icon Comparison */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <label>Design Comparison: Favicon Options</label>
        <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md) 0' }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" stroke="#ff8c42" stroke-width="1" stroke-dasharray="2 2" opacity="0.4"/>
              <circle cx="16" cy="16" r="8" fill="url(#grad1)"/>
              <defs>
                <linearGradient id="grad1" x1="8" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#ff8c42"/>
                  <stop offset="100%" stop-color="#e2725b"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="text-xs text-secondary" style={{ marginTop: 'var(--space-xs)' }}>Seed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L19 13L30 16L19 19L16 30L13 19L2 16L13 13L16 2Z" fill="#ff8c42"/>
              <path d="M16 6L18 14L26 16L18 18L16 26L14 18L6 16L14 14L16 6Z" fill="white" fill-opacity="0.3"/>
            </svg>
            <div className="text-xs text-secondary" style={{ marginTop: 'var(--space-xs)' }}>Spark</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="#141211"/>
              <text x="42%" y="62%" dominant-baseline="middle" text-anchor="middle" fill="#ff8c42" font-family="serif" font-weight="700" font-size="15">bb</text>
              <path d="M23 4L24 7.5L27.5 8.5L24 9.5L23 13L22 9.5L18.5 8.5L22 7.5L23 4Z" fill="#ff8c42"/>
            </svg>
            <div className="text-xs text-secondary" style={{ marginTop: 'var(--space-xs)' }}>Mystical bb</div>
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
