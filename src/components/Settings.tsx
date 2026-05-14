import { useState } from 'react';
import { useStore } from '../store';
import ErrorBanner from './ErrorBanner';
import Modal from './Modal';

export default function Settings() {
  const { profile, geminiApiKey, setProfile, setApiKey, exportData, importData, resetData } = useStore();
  
  const [name, setName] = useState(profile?.partnerName || '');
  const [birthDate, setBirthDate] = useState(profile?.birthDate || '');
  const [globalContext, setGlobalContext] = useState(profile?.globalContext || '');
  const [apiKey, setLocalApiKey] = useState(geminiApiKey || '');
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleSaveProfile = () => {
    setProfile({
      partnerName: name,
      birthDate: birthDate,
      preferences: profile?.preferences || [],
      globalContext: globalContext,
    });
    alert('Core parameters updated.');
  };

  const handleSaveApiKey = () => {
    setApiKey(apiKey);
    alert('API Key updated.');
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bb-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          importData(content);
          alert('Data merged successfully.');
        } catch (err: any) {
          setError(`Import failed: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  return (
    <div className="settings-view">
      <Modal 
        isOpen={showResetModal}
        title="Reset All Data?"
        message="This will permanently delete all your profile data, events, and tasks. This cannot be undone."
        onConfirm={() => {
          resetData();
          setShowResetModal(false);
        }}
        onCancel={() => setShowResetModal(false)}
        confirmText="Reset Everything"
        isDanger={true}
      />

      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
      
      <div className="card">
        <h3>User Profile</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600 }}>Partner's Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              style={{ width: '100%', marginTop: '0.25rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600 }}>Target Delivery Date</label>
            <input 
              type="date" 
              value={birthDate} 
              onChange={(e) => setBirthDate(e.target.value)} 
              style={{ width: '100%', marginTop: '0.25rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 600 }}>Global Context (Memory)</label>
            <textarea 
              placeholder="Allergies, preferences, history..." 
              value={globalContext} 
              onChange={(e) => setGlobalContext(e.target.value)} 
              style={{ width: '100%', marginTop: '0.25rem', minHeight: '100px' }}
            />
          </div>
          <button className="btn-primary" onClick={handleSaveProfile}>Save Profile</button>
        </div>
      </div>

      <div className="card">
        <h3>Gemini API</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <input 
            type="password" 
            placeholder="Enter API Key" 
            value={apiKey} 
            onChange={(e) => setLocalApiKey(e.target.value)} 
            style={{ width: '100%' }}
          />
          <button className="btn-primary" onClick={handleSaveApiKey}>Save API Key</button>
        </div>
      </div>

      <div className="card">
        <h3>Data Management</h3>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }} onClick={handleExport}>Export JSON</button>
          <label className="btn-secondary" style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            Import JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
        <button 
          className="btn-secondary" 
          style={{ backgroundColor: 'transparent', color: 'var(--critical-color)', borderColor: 'var(--critical-color)', width: '100%', marginTop: '0.75rem' }} 
          onClick={handleReset}
        >
          Reset All Data
        </button>
      </div>
    </div>
  );
}
