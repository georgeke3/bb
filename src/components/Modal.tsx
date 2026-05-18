
interface ModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onAlt?: () => void;
  confirmText?: string;
  cancelText?: string;
  altText?: string;
  isDanger?: boolean;
  children?: React.ReactNode;
}

export default function Modal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  onAlt,
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  altText,
  isDanger = false,
  children
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000, /* Above everything */
      padding: '1rem'
    }}>
      <div className="card" style={{ 
        maxWidth: '400px', 
        width: '100%', 
        margin: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>{title}</h3>
        {message && <p style={{ marginBottom: '1.5rem', color: 'var(--accent-color)' }}>{message}</p>}
        {children}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {onAlt && altText && (
            <button className="btn-secondary" onClick={onAlt} style={{ marginRight: 'auto' }}>{altText}</button>
          )}
          <button className="btn-secondary" onClick={onCancel}>{cancelText}</button>
          <button 
            className="btn-primary" 
            style={isDanger ? { backgroundColor: 'var(--critical-color)' } : {}}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
