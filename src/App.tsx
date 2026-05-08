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
              <path d="M12 7C12 7 8 11 8 13.5C8 15.7091 9.79086 17.5 12 17.5C14.2091 17.5 16 15.7091 16 13.5C16 11 12 7 12 7Z" opacity="0.3" fill="white" />
            </svg>
          </span>
        </button>
        <button className={`nav-item ${activeView === 'todo' ? 'active' : ''}`} onClick={() => setActiveView('todo')} title="Plan">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 12L10 16L18 8" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 12L10 14L16 8" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            </svg>
          </span>
        </button>
        <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')} title="Core">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.483.483 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.27.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5s-1.57 3.5-3.5 3.5z" />
              <path d="M12 14c1.1046 0 2-.8954 2-2c0-1.1046-.8954-2-2-2c-1.1046 0-2 .8954-2 2c0 1.1046.8954 2 2 2Z" fill="white" opacity="0.4" />
              <path d="M15.42 12.44c.02-.14.03-.29.03-.44s-.01-.3-.03-.44l.97-.75c.06-.05.08-.13.04-.2l-.92-1.59a.235.235 0 0 0-.28-.11l-1.14.46c-.24-.18-.5-.33-.77-.45l-.17-1.21a.231.231 0 0 0-.23-.2h-1.84a.231.231 0 0 0-.23.2l-.17 1.21c-.28.12-.54.27-.77.45l-1.14-.46a.235.235 0 0 0-.28.11l-.92 1.59c-.04.07-.02.15.04.2l.97.75c-.02.14-.04.3-.04.44s.01.3.03.44l-.97.75a.235.235 0 0 0-.04.2l.92 1.59c.04.07.12.1.18.07l1.14-.46c.24.18.5.33.77.45l.17 1.21c.02.11.12.2.23.2h1.84c.11 0 .21-.09.23-.2l.17-1.21c.28-.12.54-.27.77-.45l1.14.46c.06.03.14 0 .18-.07l.92-1.59a.235.235 0 0 0-.04-.2l-.97-.75z" fill="white" opacity="0.2" fill-rule="evenodd" clip-rule="evenodd" />
            </svg>
          </span>
        </button>
      </nav>
    </div>
  );
}

export default App;
