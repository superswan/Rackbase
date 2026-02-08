import { useState } from 'react';

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  itemType 
}) {
  const [confirmText, setConfirmText] = useState('');
  
  if (!isOpen) return null;
  
  const isConfirmed = confirmText === itemName;
  
  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setConfirmText('');
    }
  };
  
  const handleClose = () => {
    setConfirmText('');
    onClose();
  };
  
  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.warningIcon}>⚠️</span>
          <h3 style={styles.title}>Delete {itemType}</h3>
        </div>
        
        <p style={styles.message}>
          This action <strong>cannot be undone</strong>. This will permanently delete the {itemType.toLowerCase()} 
          <strong style={styles.itemName}> {itemName}</strong> and all associated data.
        </p>
        
        <p style={styles.instruction}>
          Please type <strong>{itemName}</strong> to confirm:
        </p>
        
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          style={styles.input}
          placeholder={`Type ${itemName} to confirm`}
          autoFocus
        />
        
        <div style={styles.actions}>
          <button 
            onClick={handleConfirm}
            disabled={!isConfirmed}
            style={{
              ...styles.deleteButton,
              opacity: isConfirmed ? 1 : 0.5,
              cursor: isConfirmed ? 'pointer' : 'not-allowed',
            }}
          >
            I understand the consequences, delete this {itemType.toLowerCase()}
          </button>
          <button 
            onClick={handleClose}
            style={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
  },
  warningIcon: {
    fontSize: '24px',
    marginRight: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#c53030',
    margin: 0,
  },
  message: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  itemName: {
    color: '#c53030',
  },
  instruction: {
    fontSize: '14px',
    color: '#2d3748',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    marginBottom: '20px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  deleteButton: {
    backgroundColor: '#f56565',
    color: '#fff',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
};
