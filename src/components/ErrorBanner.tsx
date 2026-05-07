export default function ErrorBanner({ message, onClose }: { message: string, onClose: () => void }) {
  return (
    <div className="card" style={{ 
      border: '1px solid var(--critical-color)', 
      color: 'var(--critical-color)', 
      backgroundColor: '#fff5f5',
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span><strong>Error:</strong> {message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
    </div>
  );
}
