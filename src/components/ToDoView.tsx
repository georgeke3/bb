import { useState, useMemo } from 'react';
import { useStore } from '../store';
import type { ToDo } from '../types';
import { GeminiService } from '../services/gemini';
import ErrorBanner from './ErrorBanner';
import Modal from './Modal';

interface ToDoViewProps {
  currentWeek: number;
  geminiService: GeminiService | null;
}

type SubTab = 'critical' | 'nice' | 'complete';

export default function ToDoView({ currentWeek, geminiService }: ToDoViewProps) {
  const { tasks, addTask } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('critical');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processedTasks = useMemo(() => {
    let filtered = [...tasks];
    
    if (activeSubTab === 'complete') {
      filtered = filtered.filter(t => t.isComplete);
    } else {
      filtered = filtered.filter(t => !t.isComplete);
      if (activeSubTab === 'critical') {
        filtered = filtered.filter(t => t.isCritical);
      } else if (activeSubTab === 'nice') {
        filtered = filtered.filter(t => !t.isCritical);
      }
    }

    return filtered.sort((a, b) => {
      const weekA = a.minWeek ?? 0;
      const weekB = b.minWeek ?? 0;
      if (weekA !== weekB) return weekA - weekB;
      const dateA = a.specificDate || '';
      const dateB = b.specificDate || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.title.localeCompare(b.title);
    });
  }, [tasks, activeSubTab]);

  return (
    <div className="todo-view">
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
      
      <div className="card" style={{ padding: 0, marginBottom: 'var(--space-md)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--bg-color)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flex: 1 }}>
            {(['critical', 'nice', 'complete'] as SubTab[]).map(tab => (
              <button 
                key={tab}
                style={{ 
                  flex: 1, padding: '1rem 0.5rem', border: 'none', 
                  background: activeSubTab === tab ? 'var(--card-bg)' : 'transparent',
                  borderBottom: activeSubTab === tab ? `3px solid ${tab === 'critical' ? 'var(--critical)' : tab === 'nice' ? 'var(--primary)' : 'var(--success)'}` : 'none',
                  fontWeight: 700, 
                  fontSize: 'var(--size-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: activeSubTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: activeSubTab === tab ? 1 : 0.4
                }}
                onClick={() => setActiveSubTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ 
              padding: '0 1.5rem', 
              border: 'none', 
              background: 'var(--primary)',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            +
          </button>
        </div>

        <div className="todo-list" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          {processedTasks.map(task => (
            <ToDoItem key={task.id} task={task} currentWeek={currentWeek} geminiService={geminiService} setError={setError} />
          ))}
          {processedTasks.length === 0 && (
            <p className="text-secondary italic" style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
              {tasks.length === 0 ? 'Project plan empty.' : `No ${activeSubTab} items.`}
            </p>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={showAddModal}
        title="Seal New Intention"
        onConfirm={() => {}} // Handle inside form button
        onCancel={() => setShowAddModal(false)}
        confirmText="" // Hide standard confirm text
      >
        <TaskForm 
          onSave={(data) => {
            addTask({ ...data, isComplete: false });
            setShowAddModal(false);
          }} 
          onCancel={() => setShowAddModal(false)}
          initialWeek={currentWeek}
          initialCritical={activeSubTab === 'critical'}
        />
      </Modal>
    </div>
  );
}

function TaskForm({ onSave, onCancel, initialData, initialWeek, initialCritical }: { onSave: (data: any) => void, onCancel?: () => void, initialData?: ToDo, initialWeek?: number, initialCritical?: boolean }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [desc, setDesc] = useState(initialData?.description || '');
  const [isCritical, setIsCritical] = useState(initialData?.isCritical ?? initialCritical ?? true);
  const [minWeek, setMinWeek] = useState<number | undefined>(initialData?.minWeek ?? initialWeek);
  const [specificDate, setSpecificDate] = useState(initialData?.specificDate || '');
  const [type, setType] = useState<'task' | 'appointment'>(initialData?.type || 'task');

  const handleWeekChange = (val: string) => {
    if (val === '') {
      setMinWeek(undefined);
      return;
    }
    const num = parseInt(val);
    if (!isNaN(num)) setMinWeek(Math.max(1, Math.min(42, num)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <button className={type === 'task' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: 'var(--space-sm)' }} onClick={() => setType('task')}>Task</button>
        <button className={type === 'appointment' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: 'var(--space-sm)' }} onClick={() => setType('appointment')}>Appointment</button>
      </div>

      <div>
        <label>Objective</label>
        <input type="text" placeholder="What must be done?" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      
      <div>
        <label>Context</label>
        <textarea placeholder="Additional details..." value={desc} onChange={e => setDesc(e.target.value)} style={{ minHeight: '100px' }} />
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'center' }}>
        {type === 'task' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <label style={{ margin: 0 }}>Start Wk (Optional)</label>
            <input 
              type="number" 
              placeholder="--"
              min="1" max="42" 
              value={minWeek ?? ''} 
              onChange={e => handleWeekChange(e.target.value)} 
              style={{ width: '70px', padding: '0.5rem' }} 
            />
          </div>
        )}
        {type === 'appointment' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <label style={{ margin: 0 }}>Date</label>
            <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)} style={{ width: 'auto', padding: '0.5rem' }} />
          </div>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', cursor: 'pointer', margin: 0 }}>
          <input type="checkbox" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} style={{ width: '16px', height: '16px' }} />
          Critical
        </label>
      </div>
      
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
        {onCancel && <button className="btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>}
        <button className="btn-primary" style={{ flex: 2 }} onClick={() => onSave({ title, description: desc, isCritical, minWeek, specificDate, type })} disabled={!title}>
          {initialData ? 'Update Intention' : 'Seal Intention'}
        </button>
      </div>
    </div>
  );
}

function ToDoItem({ task, currentWeek, geminiService, setError }: { task: ToDo, currentWeek: number, geminiService: GeminiService | null, setError: (msg: string | null) => void }) {
  const { completeTask, splitTask, updateTask, deleteTask } = useStore();
  const [isSplitting, setIsSplitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [splitSuggestions, setSplitSuggestions] = useState<any[] | null>(null);
  
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleToggleComplete = () => {
    if (!task.isComplete) setShowCompleteModal(true);
  };

  const handleSplit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!geminiService) return;
    setIsSplitting(true);
    setError(null);
    try {
      const suggestions = await geminiService.splitTask(task.title, task.description, currentWeek);
      setSplitSuggestions(suggestions.map((s: any) => ({ ...s, selected: true })));
    } catch (e: any) {
      console.error(e);
      setError(`Failed to split: ${e.message}`);
    } finally {
      setIsSplitting(false);
    }
  };

  const confirmSplit = () => {
    if (!splitSuggestions) return;
    const selected = splitSuggestions.filter(s => s.selected).map(({ selected, ...rest }) => rest);
    if (selected.length > 0) {
      splitTask(task.id, selected);
      setIsExpanded(true);
    }
    setSplitSuggestions(null);
  };

  const hasSubtasks = task.subTasks.length > 0;

  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <Modal 
        isOpen={showCompleteModal}
        title="Complete Intention?"
        message="This will lock this path permanently."
        onConfirm={() => { completeTask(task.id); setShowCompleteModal(false); }}
        onCancel={() => setShowCompleteModal(false)}
        confirmText="Complete"
      />

      <Modal 
        isOpen={showDeleteModal}
        title="Sever Path?"
        message={`Are you sure you want to remove "${task.title}"?`}
        onConfirm={() => { deleteTask(task.id); setShowDeleteModal(false); setIsDetailOpen(false); }}
        onCancel={() => setShowDeleteModal(false)}
        confirmText="Delete"
        isDanger={true}
      />

      {/* Detail & Edit Modal */}
      <Modal
        isOpen={isDetailOpen}
        title={isEditing ? "Edit Intention" : task.title}
        onConfirm={() => { if (!isEditing) setIsDetailOpen(false); }}
        onCancel={() => { setIsEditing(false); setIsDetailOpen(false); }}
        confirmText={isEditing ? "" : "Close"}
      >
        {isEditing ? (
          <TaskForm 
            initialData={task} 
            onSave={(data) => { updateTask(task.id, data); setIsEditing(false); setIsDetailOpen(false); }} 
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label>Details</label>
              <p className="text-primary" style={{ lineHeight: 1.5, margin: 0 }}>{task.description || 'No additional context.'}</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
              <div>
                <label>Timing</label>
                <div className="text-sm">{task.type === 'task' ? (task.minWeek ? `Week ${task.minWeek}+` : 'Anytime') : task.specificDate}</div>
              </div>
              <div>
                <label>Priority</label>
                <div className="text-sm">{task.isCritical ? 'Critical Path' : 'Nice to Have'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(true)}>Edit</button>
              <button className="btn-secondary" style={{ flex: 1, color: 'var(--critical)' }} onClick={() => setShowDeleteModal(true)}>Delete</button>
            </div>
          </div>
        )}
      </Modal>

      <div className="todo-card" onClick={() => setIsDetailOpen(true)}>
        <div className="todo-content-wrapper">
          <input 
            type="checkbox" 
            checked={task.isComplete} 
            disabled={task.locked}
            onChange={(e) => { e.stopPropagation(); handleToggleComplete(); }}
            style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }}
          />
          <div className="todo-text-main">
            <div className="todo-title-row">
              {hasSubtasks && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.7rem' }}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}
              <div className={`font-bold truncate ${task.isComplete ? 'text-secondary italic' : ''}`} style={{ textDecoration: task.isComplete ? 'line-through' : 'none' }}>
                {task.title}
              </div>
              {task.type === 'appointment' && <span className="tag tag-primary" style={{ fontSize: '0.6rem' }}>APPT</span>}
            </div>
            <div className="text-xs text-secondary line-clamp-2">{task.description}</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
           <div className="text-xs text-secondary font-bold">
              {task.type === 'task' ? (task.minWeek ? `W${task.minWeek}+` : 'Anytime') : task.specificDate}
           </div>
           {!task.locked && (
             <button 
               className="btn-text" 
               disabled={isSplitting || !geminiService} 
               onClick={handleSplit}
               style={{ fontSize: '0.7rem' }}
             >
               {isSplitting ? '...' : 'AI Split'}
             </button>
           )}
        </div>
      </div>

      {splitSuggestions && (
        <div className="card" style={{ marginTop: 'var(--space-sm)', border: '1px solid var(--primary)', marginLeft: 'var(--space-lg)', padding: 'var(--space-md)' }}>
          <label>AI Guided Paths</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
            {splitSuggestions.map((s, idx) => (
              <label key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', fontSize: 'var(--size-sm)', alignItems: 'flex-start', cursor: 'pointer', textTransform: 'none' }}>
                <input type="checkbox" checked={s.selected} onChange={() => {
                  const next = [...splitSuggestions];
                  next[idx].selected = !next[idx].selected;
                  setSplitSuggestions(next);
                }} />
                <div>
                  <div className="font-bold">{s.title}</div>
                  <div className="text-xs text-secondary italic">W{s.minWeek}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <button className="btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: 'var(--size-xs)' }} onClick={confirmSplit}>Integrate</button>
            <button className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: 'var(--size-xs)' }} onClick={() => setSplitSuggestions(null)}>Cancel</button>
          </div>
        </div>
      )}

      {hasSubtasks && isExpanded && (
        <div style={{ marginLeft: 'var(--space-lg)', borderLeft: '1px solid var(--border)', paddingLeft: 'var(--space-md)' }}>
          {task.subTasks.map(sub => (
            <ToDoItem key={sub.id} task={sub} currentWeek={currentWeek} geminiService={geminiService} setError={setError} />
          ))}
        </div>
      )}
    </div>
  );
}
