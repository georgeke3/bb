import { useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { addWeeks, addDays, format, parseISO, isSameDay, getMonth } from 'date-fns';
import type { ToDo, ContextEvent } from '../types';
import { getAnniversaryDate, getTrimester } from '../utils/dateHelpers';

interface HeatMapProps {
  currentWeek: number;
  onDayClick: (date: Date, events: ContextEvent[], completedTasks: ToDo[], appointments: ToDo[]) => void;
  onWeekClick: (week: number) => void;
}

export default function HeatMap({ currentWeek, onDayClick, onWeekClick }: HeatMapProps) {
  const { profile, events, tasks } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

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
        const dayAppts = flatTasks.filter(t => t.type === 'appointment' && t.specificDate && isSameDay(parseISO(t.specificDate), date));
        
        const intensity = dayEvents.length + dayCompletedTasks.length + dayAppts.length + dayEvents.reduce((acc, e) => acc + e.symptoms.length, 0);
        
        return { date, events: dayEvents, completedTasks: dayCompletedTasks, appointments: dayAppts, intensity };
      });
    });
  }, [anniversaryDate, events, flatTasks]);

  const CELL_SIZE = 18;
  const GAP = 2;
  const COLUMN_WIDTH = CELL_SIZE + GAP;

  const handleTouch = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target instanceof HTMLElement && target.hasAttribute('data-day-cell')) {
      const weekIdx = parseInt(target.getAttribute('data-week-idx') || '0');
      const dayIdx = parseInt(target.getAttribute('data-day-idx') || '0');
      const dayData = gridData[weekIdx][dayIdx];
      setHoveredDay(dayData.date.toISOString());
      onDayClick(dayData.date, dayData.events, dayData.completedTasks, dayData.appointments);
    }
  };

  const handleTouchEnd = () => {
    setHoveredDay(null);
  };

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
    <div className="heatmap-container" style={{ margin: '0 0 2rem 0' }}>
      <label style={{ marginLeft: 'var(--space-xs)', marginBottom: 'var(--space-sm)', display: 'block' }}>Story Map</label>
      <div 
        ref={scrollRef}
        style={{ 
          overflowX: 'auto', 
          padding: '1.5rem 1.25rem', 
          background: 'var(--card-bg)',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        <div style={{ position: 'relative', display: 'flex', width: 'max-content' }}>
          
          {/* Frozen Y-Axis Labels Column */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            position: 'sticky',
            left: '-1.25rem',
            backgroundColor: 'var(--card-bg)',
            zIndex: 100,
            paddingRight: '8px',
            paddingLeft: '0.5rem',
            marginRight: '4px',
            borderRight: '1px solid var(--border)'
          }}>
            <div style={{ height: '14px', marginBottom: '4px' }} />
            {dayNames.map((d, i) => (
              <div key={i} style={{ 
                width: '14px', 
                height: `${CELL_SIZE}px`, 
                fontSize: '0.5rem', 
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
          <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '2rem' }}>
            
            {/* Grid Area */}
            <div style={{ display: 'flex', gap: `${GAP}px` }}>
              {gridData.map((weekData, idx) => {
                const weekNum = idx + 1;
                const isCurrent = weekNum === currentWeek;
                const trimester = getTrimester(weekNum);
                const triColor = trimester === 1 ? '#ff8c42' : trimester === 2 ? '#4cc9f0' : '#7209b7';

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
                        fontSize: '0.45rem', 
                        color: isCurrent ? 'white' : 'var(--text-secondary)', 
                        cursor: 'pointer',
                        fontWeight: 800,
                        padding: '0',
                        borderRadius: '2px',
                        width: `${CELL_SIZE}px`,
                        borderBottom: `2px solid ${triColor}`
                      }}
                    >
                      {weekNum}
                    </button>

                    {weekData.map((dayData, dIndex) => {
                      const intensity = dayData.intensity;
                      const hasAppt = dayData.appointments.length > 0;
                      const isToday = isSameDay(dayData.date, new Date());
                      const isHovered = hoveredDay === dayData.date.toISOString();
                      
                      let color = '#25211f';
                      if (intensity > 0) color = '#4d3b2e';
                      if (intensity > 3) color = '#7d583e';
                      if (intensity > 6) color = '#b37e4c';
                      if (intensity > 10) color = 'var(--primary)';
                      
                      return (
                        <div 
                          key={dIndex}
                          data-day-cell="true"
                          data-week-idx={idx}
                          data-day-idx={dIndex}
                          onClick={() => onDayClick(dayData.date, dayData.events, dayData.completedTasks, dayData.appointments)}
                          onTouchStart={() => {
                            setHoveredDay(dayData.date.toISOString());
                            onDayClick(dayData.date, dayData.events, dayData.completedTasks, dayData.appointments);
                          }}
                          onTouchMove={handleTouch}
                          onTouchEnd={handleTouchEnd}
                          onMouseEnter={() => setHoveredDay(dayData.date.toISOString())}
                          onMouseLeave={() => setHoveredDay(null)}
                          style={{ 
                            width: `${CELL_SIZE}px`, 
                            height: `${CELL_SIZE}px`, 
                            backgroundColor: color, 
                            borderRadius: '2px',
                            cursor: 'pointer',
                            outline: isToday ? '2px solid white' : (isCurrent ? '1px solid rgba(255, 140, 66, 0.3)' : 'none'),
                            outlineOffset: '-1px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            zIndex: isHovered || isToday ? 100 : 1,
                            touchAction: 'none',
                            transition: 'transform 0.1s ease-out',
                            transform: isHovered ? 'scale(1.8)' : 'scale(1)',
                            boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.5)' : 'none'
                          }}
                        >
                          {hasAppt && (
                            <div style={{ 
                              width: '4px', 
                              height: '4px', 
                              backgroundColor: 'white', 
                              borderRadius: '50%',
                              boxShadow: '0 0 2px rgba(0,0,0,0.5)',
                              pointerEvents: 'none'
                            }}></div>
                          )}
                        </div>
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
