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
              <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
        </button>
        <button className={`nav-item ${activeView === 'todo' ? 'active' : ''}`} onClick={() => setActiveView('todo')} title="Plan">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="2" rx="1" />
              <rect x="3" y="11" width="18" height="2" rx="1" />
              <rect x="3" y="18" width="18" height="2" rx="1" />
              <circle cx="6" cy="5" r="1" fill="white" />
              <circle cx="6" cy="12" r="1" fill="white" />
              <circle cx="6" cy="19" r="1" fill="white" />
            </svg>
          </span>
        </button>
        <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')} title="Core">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8Z" />
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C12.7831 2 13.5134 2.45788 13.8569 3.16617L14.3051 4.09033C14.5517 4.59868 15.0117 4.97534 15.5606 5.11802L16.5583 5.37736C17.3235 5.57625 17.8943 6.1956 18.0101 6.95353L18.1608 7.94071C18.2437 8.48395 18.5522 8.96676 19.0113 9.27218L19.8458 9.82725C20.4859 10.253 20.8415 10.9781 20.751 11.7512L20.6331 12.7573C20.5683 13.3109 20.7621 13.8687 21.166 14.2917L21.9002 15.0604C22.4633 15.65 22.5694 16.5057 22.17 17.2001L21.6499 18.1044C21.3637 18.6014 20.8521 18.9141 20.2913 18.9649L19.2719 19.0573C18.711 19.1082 18.2045 19.4293 17.8867 19.9329L17.309 20.8483C16.866 21.55 16.0888 21.9141 15.2892 21.8005L14.2486 21.6527C13.676 21.5714 13.0882 21.7584 12.6393 22.1648L11.8234 22.9035C11.1977 23.47 10.2748 23.5042 9.58807 22.9912L8.68884 22.3197C8.19391 21.9501 7.55523 21.8213 6.96022 21.9713L5.8787 22.2439C5.04918 22.4529 4.19532 22.0673 3.82962 21.3149L3.35338 20.3349C3.09131 19.7956 2.5855 19.4187 1.99026 19.317L0.908298 19.1319C0.0783422 18.99 -0.457813 18.1504 -0.369424 17.3192L-0.253966 16.2335C-0.190426 15.636 -0.419163 15.0413 -0.88452 14.6548L-1.73041 13.9525C-2.37913 13.4137 -2.57169 12.5152 -2.19163 11.7779L-1.6963 10.8172C-1.42373 10.2885 -1.42373 9.66418 -1.6963 9.13549L-2.19163 8.17478C-2.57169 7.43746 -2.37913 6.53903 -1.73041 6.00017L-0.88452 5.29783C-0.419163 4.91136 -0.190426 4.31666 -0.253966 3.71913L-0.369424 2.63345C-0.457813 1.80226 0.0783422 0.962638 0.908298 0.820755L1.99026 0.635639C2.5855 0.533934 3.09131 0.157121 3.35338 -0.382145L3.82962 -1.36214C4.19532 -2.11462 5.04918 -2.50022 5.8787 -2.29124L6.96022 -2.01861C7.55523 -1.8686 8.19391 -1.99742 8.68884 -2.36706L9.58807 -3.03857C10.2748 -3.55153 11.1977 -3.51737 11.8234 -2.95085L12.6393 -2.21211C13.0882 -1.80577 13.676 -1.61875 14.2486 -1.70007L15.2892 -1.84784C16.0888 -1.9614 16.866 -1.59733 17.309 -0.895663L17.8867 0.0197475C18.2045 0.523362 18.711 0.844439 19.2719 0.953114L20.2913 1.04547C20.8521 1.09633 21.3637 1.40901 21.6499 1.90595L22.17 2.81023C22.5694 3.50462 22.4633 4.36028 21.9002 4.9499L21.166 5.7186C20.7621 6.1416 20.5683 6.69941 20.6331 7.25302L20.751 8.25906C20.8415 9.03222 20.4859 9.75735 19.8458 10.1831L19.0113 10.7381C18.5522 11.0435 18.2437 11.5263 18.1608 12.0696L18.0101 13.0568C17.8943 13.8147 17.3235 14.4341 16.5583 14.633L15.5606 14.8923C15.0117 15.035 14.5517 15.4117 14.3051 15.92L13.8569 16.8442C13.5134 17.5525 12.7831 18.0104 12 18.0104L12 18V2ZM12 4L11.0818 5.89736C10.1257 7.87321 8.35293 9.33649 6.23661 9.89066L4.17387 10.4312L5.89736 11.0818C7.87321 12.0379 9.33649 13.8106 9.89066 15.927L10.4312 17.9897L11.0818 16.2662C12.0379 14.2904 13.8106 12.8271 15.927 12.273L17.9897 11.7324L16.2662 11.0818C14.2904 10.1257 12.8271 8.35293 12.273 6.23661L11.7324 4.17387L12 4Z" />
            </svg>
          </span>
        </button>
      </nav>
    </div>
  );
}

export default App;
