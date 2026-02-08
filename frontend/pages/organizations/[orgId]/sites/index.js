import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../components/Layout';
import DeleteConfirmationModal from '../../../../components/DeleteConfirmationModal';
import { api } from '../../../../lib/api';
import { useApp } from '../../../../context/AppContext';

export default function SiteSelector() {
  const router = useRouter();
  const { orgId } = router.query;
  const { selectedOrg, selectSite, selectOrganization, setSites } = useApp();
  const [sites, setLocalSites] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, site: null });
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (orgId) {
      console.log('DEBUG: orgId from router.query:', orgId, 'type:', typeof orgId);
      loadData();
    }
  }, [orgId]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      
      // Always clear sites first
      setLocalSites([]);
      setSites([]);
      
      // Small delay to ensure state update completes
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // If we don't have the org in context, fetch it
      let org = selectedOrg;
      if (!org || org.id !== orgId) {
        org = await api.getOrganization(orgId);
        selectOrganization(org);
      }
      setOrganization(org);
      
      // Load sites for this organization
      const sitesData = await api.getSites({ organization_id: orgId });
      
      // Only update if we're still on the same org
      if (orgId === router.query.orgId) {
        setLocalSites(sitesData);
        setSites(sitesData);
      }
    } catch (err) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.createSite({
        ...formData,
        organization_id: orgId,
      });
      setFormData({});
      setShowCreate(false);
      await loadData();
    } catch (err) {
      setError('Failed to create site: ' + err.message);
    }
  }

  function handleEditClick(e, site) {
    e.stopPropagation();
    setEditingSite(site);
    setFormData({
      name: site.name,
      location: site.location || '',
      description: site.description || '',
    });
    setShowEdit(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await api.updateSite(editingSite.id, {
        ...formData,
        organization_id: orgId,
      });
      setFormData({});
      setShowEdit(false);
      setEditingSite(null);
      await loadData();
    } catch (err) {
      setError('Failed to update site: ' + err.message);
    }
  }

  function handleDeleteClick(e, site) {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, site });
  }

  async function handleDeleteConfirm() {
    try {
      await api.deleteSite(deleteModal.site.id);
      setDeleteModal({ isOpen: false, site: null });
      await loadData();
    } catch (err) {
      setError('Failed to delete site: ' + err.message);
      setDeleteModal({ isOpen: false, site: null });
    }
  }

  function handleCloseEdit() {
    setShowEdit(false);
    setEditingSite(null);
    setFormData({});
  }

  function handleSelectSite(site) {
    selectSite(site);
    // Navigate to dashboard for this site
    router.push(`/organizations/${orgId}/sites/${site.id}/dashboard`);
  }

  function handleBack() {
    router.push('/organizations');
  }

  return (
    <Layout requireOrg>
      <div>
        <div style={styles.header}>
          <div>
            <button onClick={handleBack} style={styles.backButton}>
              ← Back to Organizations
            </button>
            <h3 style={styles.title}>
              Select a Site in {organization?.name || 'Organization'}
            </h3>
          </div>
          <button onClick={() => setShowCreate(true)} style={styles.createButton}>
            + Create Site
          </button>
        </div>
        
        <p style={styles.description}>
          Choose a site to manage its resources. Each site contains hosts, networks, 
          software, devices, users, and documentation.
        </p>
        
        {error && (
          <div style={styles.error}>
            {error}
            <button onClick={() => setError('')} style={styles.closeError}>×</button>
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>Loading sites...</div>
        ) : (
          <div style={styles.grid}>
            {sites.length === 0 ? (
              <div style={styles.empty}>
                <p>No sites found for this organization.</p>
                <p>Create your first site to get started.</p>
              </div>
            ) : (
              sites.map(site => (
                <div 
                  key={site.id} 
                  style={styles.card}
                  onClick={() => handleSelectSite(site)}
                >
                  <div style={styles.cardActions}>
                    <button
                      onClick={(e) => handleEditClick(e, site)}
                      style={styles.actionButton}
                      title="Edit site"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, site)}
                      style={styles.actionButton}
                      title="Delete site"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  <div style={styles.cardIcon}><i className="fa-solid fa-location-dot"></i></div>
                  <h4 style={styles.cardTitle}>{site.name}</h4>
                  <p style={styles.cardDescription}>
                    {site.location || 'No location specified'}
                  </p>
                  {site.description && (
                    <p style={styles.cardSecondaryDescription}>
                      {site.description.length > 100 
                        ? site.description.substring(0, 100) + '...' 
                        : site.description}
                    </p>
                  )}
                  <div style={styles.cardId}>ID: {site.id}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreate && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
              <h3>Create Site in {organization?.name}</h3>
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
                  <label style={formStyles.label}>Location</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={formStyles.input}
                    placeholder="e.g., Building A, Floor 3"
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

        {/* Edit Modal */}
        {showEdit && editingSite && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
              <h3>Edit Site</h3>
              <form onSubmit={handleEdit}>
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
                  <label style={formStyles.label}>Location</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={formStyles.input}
                    placeholder="e.g., Building A, Floor 3"
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
                  <button type="submit" style={formStyles.submitButton}>Update</button>
                  <button 
                    type="button" 
                    onClick={handleCloseEdit}
                    style={formStyles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, site: null })}
          onConfirm={handleDeleteConfirm}
          itemName={deleteModal.site?.name}
          itemType="Site"
        />
      </div>
    </Layout>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#4299e1',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    marginBottom: '8px',
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
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px',
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
    paddingRight: '70px',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 8px 0',
  },
  cardSecondaryDescription: {
    fontSize: '13px',
    color: '#a0aec0',
    margin: '0 0 12px 0',
    fontStyle: 'italic',
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
