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
        <h1>bb</h1>
        {profile && <div className="week-badge">W{currentWeek}</div>}
      </header>

      <main ref={mainRef}>
        {renderView()}
      </main>

      <nav className="nav-bottom">
        <button className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')} title="Flow">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L14.5 10L22 12L14.5 14L12 22L9.5 14L2 12L9.5 10L12 2Z" />
              <path d="M12 6L13.5 11L18 12L13.5 13L12 18L10.5 13L6 12L10.5 11L12 6Z" opacity="0.3" fill="white" />
            </svg>
          </span>
        </button>
        <button className={`nav-item ${activeView === 'week' ? 'active' : ''}`} onClick={() => setActiveView('week')} title="Week">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 2 4 8 4 13C4 17.4183 7.58172 21 12 21C16.4183 21 20 17.4183 20 13C20 8 12 2 12 2Z" />
              <path d="M12 6C12 6 7 10 7 13C7 15.7614 9.23858 18 12 18C14.7614 18 17 15.7614 17 13C17 10 12 6 12 6Z" opacity="0.3" fill="white" />
            </svg>
          </span>
        </button>
        <button className={`nav-item ${activeView === 'todo' ? 'active' : ''}`} onClick={() => setActiveView('todo')} title="Plan">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 12L10 16L18 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 12L10 14L16 8" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            </svg>
          </span>
        </button>
        <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')} title="Core">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" />
              <path d="M12 13.5C12.8284 13.5 13.5 12.8284 13.5 12C13.5 11.1716 12.8284 10.5 12 10.5C11.1716 10.5 10.5 11.1716 10.5 12C10.5 12.8284 11.1716 13.5 12 13.5Z" opacity="0.4" fill="white" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill-rule="evenodd" clip-rule="evenodd" opacity="0.2" fill="white" />
            </svg>
          </span>
        </button>
      </nav>
    </div>
  );
}

export default App;
