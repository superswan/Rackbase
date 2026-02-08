import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';

export default function OrganizationSelector() {
  const router = useRouter();
  const { selectOrganization, setOrganizations } = useApp();
  const [organizations, setLocalOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({});
  
  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  // Delete confirmation state
  const [showDelete, setShowDelete] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    try {
      setLoading(true);
      const data = await api.getOrganizations();
      setLocalOrganizations(data);
      setOrganizations(data);
    } catch (err) {
      setError('Failed to load organizations: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.createOrganization(formData);
      setFormData({});
      setShowCreate(false);
      await loadOrganizations();
    } catch (err) {
      setError('Failed to create organization: ' + err.message);
    }
  }

  function handleSelectOrg(org) {
    selectOrganization(org);
    // Navigate to site selection for this organization
    router.push(`/organizations/${org.id}/sites`);
  }

  function handleEditClick(e, org) {
    e.stopPropagation();
    setEditingOrg(org);
    setEditFormData({ name: org.name, description: org.description || '' });
    setShowEdit(true);
  }

  function handleDeleteClick(e, org) {
    e.stopPropagation();
    setOrgToDelete(org);
    setShowDelete(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await api.updateOrganization(editingOrg.id, editFormData);
      setShowEdit(false);
      setEditingOrg(null);
      setEditFormData({});
      await loadOrganizations();
    } catch (err) {
      setError('Failed to update organization: ' + err.message);
    }
  }

  async function handleDeleteConfirm() {
    try {
      await api.deleteOrganization(orgToDelete.id);
      setShowDelete(false);
      setOrgToDelete(null);
      await loadOrganizations();
    } catch (err) {
      setError('Failed to delete organization: ' + err.message);
    }
  }

  return (
    <Layout>
      <div>
        <div style={styles.header}>
          <h3 style={styles.title}>Select an Organization</h3>
          <button onClick={() => setShowCreate(true)} style={styles.createButton}>
            + Create Organization
          </button>
        </div>
        
        <p style={styles.description}>
          Choose an organization to manage its sites and resources. 
          Each organization contains multiple sites with their own inventory.
        </p>
        
        {error && (
          <div style={styles.error}>
            {error}
            <button onClick={() => setError('')} style={styles.closeError}>×</button>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>Loading organizations...</div>
        ) : (
          <div style={styles.grid}>
            {organizations.length === 0 ? (
              <div style={styles.empty}>
                <p>No organizations found.</p>
                <p>Create your first organization to get started.</p>
              </div>
            ) : (
              organizations.map(org => (
                <div 
                  key={org.id} 
                  style={styles.card}
                  onClick={() => handleSelectOrg(org)}
                >
                  <div style={styles.cardActions}>
                    <button 
                      onClick={(e) => handleEditClick(e, org)} 
                      style={styles.actionButton}
                      title="Edit organization"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button 
                      onClick={(e) => handleDeleteClick(e, org)} 
                      style={styles.actionButton}
                      title="Delete organization"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  <div style={styles.cardIcon}><i className="fa-solid fa-building"></i></div>
                  <h4 style={styles.cardTitle}>{org.name}</h4>
                  <p style={styles.cardDescription}>{org.description || 'No description'}</p>
                  <div style={styles.cardId}>ID: {org.id}</div>
                </div>
              ))
            )}
          </div>
        )}

        {showCreate && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
              <h3>Create Organization</h3>
              <form onSubmit={handleCreate}>
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={formStyles.input}
                    required
                  />
                </div>
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={formStyles.textarea}
                    rows="3"
                  />
                </div>
                <div style={formStyles.actions}>
                  <button type="submit" style={formStyles.submitButton}>Create</button>
                  <button 
                    type="button" 
                    onClick={() => setShowCreate(false)} 
                    style={formStyles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEdit && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
              <h3>Edit Organization</h3>
              <form onSubmit={handleEdit}>
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Name *</label>
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    style={formStyles.input}
                    required
                  />
                </div>
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Description</label>
                  <textarea
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    style={formStyles.textarea}
                    rows="3"
                  />
                </div>
                <div style={formStyles.actions}>
                  <button type="submit" style={formStyles.submitButton}>Update</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEdit(false);
                      setEditingOrg(null);
                    }} 
                    style={formStyles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <DeleteConfirmationModal
          isOpen={showDelete}
          onClose={() => {
            setShowDelete(false);
            setOrgToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          itemName={orgToDelete?.name}
          itemType="Organization"
        />
      </div>
    </Layout>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '24px',
  },
  createButton: {
    backgroundColor: '#48bb78',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  error: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeError: {
    background: 'none',
    border: 'none',
    color: '#c53030',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: 1,
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  empty: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px',
    color: '#718096',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '2px dashed #e2e8f0',
  },
  card: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #e2e8f0',
    position: 'relative',
  },
  cardActions: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  cardIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 12px 0',
    minHeight: '40px',
  },
  cardId: {
    fontSize: '12px',
    color: '#a0aec0',
    fontFamily: 'monospace',
  },
};

const modalStyles = {
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
};

const formStyles = {
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  submitButton: {
    backgroundColor: '#48bb78',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};
