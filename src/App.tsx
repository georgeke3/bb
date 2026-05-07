import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from './store';
import { calculateCurrentWeek } from './utils/dateHelpers';
import { GeminiService } from './services/gemini';
import './index.css';

// Components
import Dashboard from './components/Dashboard';
import ToDoView from './components/ToDoView';
import WeekView from './components/WeekView';
import Settings from './components/Settings';

export type View = 'dashboard' | 'week' | 'todo' | 'settings';

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const { profile, geminiApiKey } = useStore();
  const mainRef = useRef<HTMLElement>(null);
  
  const currentWeek = useMemo(() => {
    return profile?.birthDate ? calculateCurrentWeek(profile.birthDate) : 1;
  }, [profile?.birthDate]);

  const [viewingWeek, setViewingWeek] = useState<number>(currentWeek);

  // Sync viewingWeek when currentWeek changes or when switching to 'week' tab if unset
  useEffect(() => {
    if (activeView === 'week' && viewingWeek === 0) {
      setViewingWeek(currentWeek);
    }
  }, [activeView, currentWeek]);

  // Reset scroll when switching tabs
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeView]);

  const geminiService = useMemo(() => {
    return geminiApiKey ? new GeminiService(geminiApiKey, profile?.globalContext) : null;
  }, [geminiApiKey, profile?.globalContext]);

  const navigateToWeek = (week: number) => {
    setViewingWeek(week);
    setActiveView('week');
  };

  const renderView = () => {
    if (!profile && activeView !== 'settings') {
      return (
        <div className="card">
          <h2>Welcome to BB</h2>
          <p>Please set up your profile and API key in Settings to get started.</p>
          <button className="btn-primary" onClick={() => setActiveView('settings')}>Go to Settings</button>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard currentWeek={currentWeek} geminiService={geminiService} onNavigateToWeek={navigateToWeek} />;
      case 'week':
        return <WeekView currentWeek={currentWeek} viewingWeek={viewingWeek || currentWeek} setViewingWeek={setViewingWeek} geminiService={geminiService} />;
      case 'todo':
        return <ToDoView currentWeek={currentWeek} geminiService={geminiService} />;
      case 'settings':
        return <Settings />;
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>BB</h1>
        {profile && <div className="week-badge">W{currentWeek}</div>}
      </header>

      <main ref={mainRef}>
        {renderView()}
      </main>

      <nav className="nav-bottom">
        <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')} title="Flow">
          <span className="nav-icon">✧</span>
        </button>
        <button className={`nav-item ${activeView === 'week' ? 'active' : ''}`} onClick={() => setActiveView('week')} title="Week">
          <span className="nav-icon">◈</span>
        </button>
        <button className={`nav-item ${activeView === 'todo' ? 'active' : ''}`} onClick={() => setActiveView('todo')} title="Plan">
          <span className="nav-icon">☷</span>
        </button>
        <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')} title="Core">
          <span className="nav-icon">⚙</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
