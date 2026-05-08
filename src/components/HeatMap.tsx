import { useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { addWeeks, addDays, format, parseISO, isSameDay, getMonth } from 'date-fns';
import type { ToDo, ContextEvent } from '../types';
import { getAnniversaryDate } from '../utils/dateHelpers';

interface HeatMapProps {
  currentWeek: number;
  onDayClick: (date: Date, events: ContextEvent[], completedTasks: ToDo[]) => void;
  onWeekClick: (week: number) => void;
}

export default function HeatMap({ currentWeek, onDayClick, onWeekClick }: HeatMapProps) {
  const { profile, events, tasks } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const anniversaryDate = useMemo(() => {
    if (!profile?.birthDate) return null;
    return getAnniversaryDate(profile.birthDate);
  }, [profile?.birthDate]);

  const flatTasks = useMemo(() => {
    const list: ToDo[] = [];
    const traverse = (t: ToDo) => {
      list.push(t);
      t.subTasks.forEach(traverse);
    };
    tasks.forEach(traverse);
    return list;
  }, [tasks]);

  const weeksRange = Array.from({ length: 42 }, (_, i) => i + 1);
  
  // Day labels start on the anniversary weekday (Sat)
  const dayNames = useMemo(() => {
    if (!anniversaryDate) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(anniversaryDate, i);
      return format(date, 'EEEEEE');
    });
  }, [anniversaryDate]);

  const gridData = useMemo(() => {
    if (!anniversaryDate) return [];
    
    return weeksRange.map(weekNum => {
      const weekStart = addWeeks(anniversaryDate, weekNum - 1);
      return Array.from({ length: 7 }, (_, dayIndex) => {
        const date = addDays(weekStart, dayIndex);
        const dayEvents = events.filter(e => isSameDay(parseISO(e.timestamp), date));
        const dayCompletedTasks = flatTasks.filter(t => t.isComplete && t.completedAt && isSameDay(parseISO(t.completedAt), date));
        const intensity = dayEvents.length + dayCompletedTasks.length + dayEvents.reduce((acc, e) => acc + e.symptoms.length, 0);
        
        return { date, events: dayEvents, completedTasks: dayCompletedTasks, intensity };
      });
    });
  }, [anniversaryDate, events, flatTasks]);

  const CELL_SIZE = 14;
  const GAP = 1;
  const COLUMN_WIDTH = CELL_SIZE + GAP;

  const monthLabels = useMemo(() => {
    if (!anniversaryDate) return [];
    const labels: { label: string, column: number }[] = [];
    let lastMonth = -1;
    
    weeksRange.forEach((weekNum, weekIdx) => {
      const weekStart = addWeeks(anniversaryDate, weekNum - 1);
      // Check every day in this week to see if a month starts here
      for (let d = 0; d < 7; d++) {
        const date = addDays(weekStart, d);
        const monthIdx = getMonth(date);
        if (monthIdx !== lastMonth) {
          // If the month changes, this week column gets the label
          labels.push({ 
            label: format(date, 'MMM').toUpperCase(), 
            column: weekIdx 
          });
          lastMonth = monthIdx;
          break;
        }
      }
    });
    return labels;
  }, [anniversaryDate]);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const currentWeekEl = container.querySelector(`[data-week="${currentWeek}"]`);
      if (currentWeekEl) {
        const offset = (currentWeekEl as HTMLElement).offsetLeft - 45; 
        container.scrollTo({ left: Math.max(0, offset), behavior: 'auto' });
      }
    }
  }, [currentWeek]);

  if (!anniversaryDate) return null;

  return (
    <div className="heatmap-container" style={{ margin: '0 0 1.5rem 0' }}>
      <label style={{ marginLeft: 'var(--space-xs)', marginBottom: 'var(--space-xs)', display: 'block' }}>Story Map</label>
      <div 
        ref={scrollRef}
        style={{ 
          overflowX: 'auto', 
          padding: '1.25rem 1rem', 
          background: 'var(--card-bg)',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ position: 'relative', display: 'flex', width: 'max-content' }}>
          
          {/* Frozen Y-Axis Labels Column */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            position: 'sticky',
            left: '-1rem',
            backgroundColor: 'var(--card-bg)',
            zIndex: 100,
            paddingRight: '6px',
            paddingLeft: '0.5rem',
            marginRight: '2px',
            borderRight: '1px solid var(--border)'
          }}>
            <div style={{ height: '14px', marginBottom: '4px' }} />
            {dayNames.map((d, i) => (
              <div key={i} style={{ 
                width: '14px', 
                height: `${CELL_SIZE}px`, 
                fontSize: '0.55rem', 
                color: 'var(--text-secondary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 600,
                marginBottom: `${GAP}px`
              }}>
                {d}
              </div>
            ))}
            <div style={{ height: '14px', marginTop: '4px' }} />
          </div>

          {/* Scrollable Content */}
          <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '1.5rem' }}>
            
            {/* Grid Area */}
            <div style={{ display: 'flex', gap: `${GAP}px` }}>
              {gridData.map((weekData, idx) => {
                const weekNum = idx + 1;
                const isCurrent = weekNum === currentWeek;
                return (
                  <div 
                    key={idx} 
                    data-week={weekNum}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: `${GAP}px`,
                      position: 'relative'
                    }}
                  >
                    <button 
                      onClick={() => onWeekClick(weekNum)}
                      style={{ 
                        height: '14px',
                        marginBottom: '4px',
                        border: 'none', 
                        background: isCurrent ? 'var(--primary)' : 'none', 
                        fontSize: '0.5rem', 
                        color: isCurrent ? 'white' : 'var(--text-secondary)', 
                        cursor: 'pointer',
                        fontWeight: 800,
                        padding: '0',
                        borderRadius: '2px',
                        width: `${CELL_SIZE}px`
                      }}
                    >
                      {weekNum}
                    </button>

                    {weekData.map((dayData, dIndex) => {
                      const intensity = dayData.intensity;
                      let color = '#25211f';
                      if (intensity > 0) color = '#4d3b2e';
                      if (intensity > 3) color = '#7d583e';
                      if (intensity > 6) color = '#b37e4c';
                      if (intensity > 10) color = 'var(--primary)';
                      
                      return (
                        <div 
                          key={dIndex}
                          onClick={() => onDayClick(dayData.date, dayData.events, dayData.completedTasks)}
                          style={{ 
                            width: `${CELL_SIZE}px`, 
                            height: `${CELL_SIZE}px`, 
                            backgroundColor: color, 
                            borderRadius: '1px',
                            cursor: 'pointer',
                            outline: isCurrent ? '1px solid var(--primary)' : 'none',
                            outlineOffset: '-1px'
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Month Labels Row */}
            <div style={{ position: 'relative', height: '14px', marginTop: '4px' }}>
              {monthLabels.map((m, i) => (
                <div 
                  key={i} 
                  style={{ 
                    position: 'absolute', 
                    left: `${m.column * COLUMN_WIDTH}px`, 
                    fontSize: '0.55rem', 
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.05em'
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
