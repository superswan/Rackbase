import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api, API_URL } from '../../../../../lib/api';
import { useApp } from '../../../../../context/AppContext';

export default function Documentation() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareModal, setShareModal] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (orgId && siteId) {
      loadData();
    }
  }, [orgId, siteId]);

  async function loadData() {
    try {
      setLoading(true);
      
      if (!selectedOrg || selectedOrg.id !== orgId) {
        const org = await api.getOrganization(orgId);
        selectOrganization(org);
      }
      
      if (!selectedSite || selectedSite.id !== siteId) {
        const site = await api.getSite(siteId);
        selectSite(site);
      }
      
      const data = await api.getDocumentation({ organization_id: orgId, site_id: siteId });
      // Format the data for display
      const formattedDocs = data.map(doc => ({
        ...doc,
        updated_at: new Date(doc.updated_at).toLocaleDateString(),
      }));
      setDocs(formattedDocs);
    } catch (err) {
      setError('Failed to load documentation: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    try {
      console.log('Creating doc with data:', data);
      const payload = {
        title: data.title,
        category: data.category || 'general',
        description: data.description || '',
        organization_id: orgId,
        site_id: siteId,
      };
      console.log('Payload:', payload);
      await api.createDocumentation(payload);
      await loadData();
    } catch (err) {
      console.error('Create error:', err);
      const errorMessage = err.message || err.detail || (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));
      setError('Failed to create documentation: ' + errorMessage);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteDocumentation(id);
      await loadData();
    } catch (err) {
      const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError('Failed to delete documentation: ' + errorMessage);
    }
  }

  async function handleToggleShare(doc, event) {
    // Prevent event from bubbling up to the row click
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    try {
      const response = await api.request(`/documentation/${doc.id}/share?share=${!doc.is_public}`, {
        method: 'POST'
      });
      await loadData();
      
      // If sharing was enabled, show the share modal with the link
      if (!doc.is_public && response.share_url) {
        const fullUrl = `${window.location.origin}${response.share_url}`;
        setShareModal({
          title: doc.title,
          url: fullUrl,
        });
      }
    } catch (err) {
      setError('Failed to toggle sharing: ' + err.message);
    }
  }

  function handleCopyLink(url) {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function closeShareModal() {
    setShareModal(null);
    setCopied(false);
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'version', label: 'Version' },
    { 
      key: 'is_public', 
      label: 'Shared',
      render: (_, item) => {
        if (item.is_public && item.share_token) {
          const shareUrl = `${window.location.origin}/shared/doc/${item.share_token}`;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#48bb78', fontSize: '12px' }}>
                <i className="fa-solid fa-link" style={{ marginRight: '4px' }}></i>
                Yes
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleCopyLink(shareUrl);
                }}
                style={styles.copyLinkButton}
                title="Copy share link"
              >
                <i className="fa-solid fa-copy"></i>
              </button>
            </div>
          );
        }
        return (
          <span style={{ color: '#a0aec0', fontSize: '12px' }}>
            <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i>
            No
          </span>
        );
      }
    },
    { key: 'updated_at', label: 'Updated' },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (_, item) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={(e) => handleToggleShare(item, e)}
            style={item.is_public ? styles.shareButtonActive : styles.shareButton}
            title={item.is_public ? 'Disable sharing' : 'Enable sharing'}
          >
            <i className={item.is_public ? 'fa-solid fa-link-slash' : 'fa-solid fa-link'}></i>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDelete(item.id);
            }}
            style={styles.deleteButton}
            title="Delete"
          >
            <i className="fa-solid fa-trash"></i>
          </button>
        </div>
      )
    },
  ];

  const createForm = (formData, setFormData) => (
    <>
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Title *</label>
        <input
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          style={formStyles.input}
          required
          placeholder="e.g., Server Setup Guide"
        />
      </div>
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Category</label>
        <select
          value={formData.category || 'general'}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          style={formStyles.input}
        >
          <option value="general">General</option>
          <option value="procedure">Procedure</option>
          <option value="policy">Policy</option>
          <option value="technical">Technical</option>
          <option value="configuration">Configuration</option>
          <option value="troubleshooting">Troubleshooting</option>
          <option value="network">Network</option>
        </select>
      </div>
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Description (Plain Text)</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={formStyles.textarea}
          rows="4"
          placeholder="Brief description or summary..."
        />
      </div>
    </>
  );

  return (
    <Layout requireOrg requireSite>
      <div>
        {error && (
          <div style={styles.error}>
            {error}
            <button onClick={() => setError('')} style={styles.closeError}>×</button>
          </div>
        )}

        <div style={styles.header}>
          <h3 style={styles.title}>Documentation</h3>
          <p style={styles.subtitle}>
            Managing documentation for {selectedSite?.name} in {selectedOrg?.name}
          </p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div onClick={(e) => {
            // Prevent navigation if clicking on action buttons
            if (e.target.closest('button')) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}>
            <DataTable
              columns={columns}
              data={docs}
              onCreate={handleCreate}
              onDelete={handleDelete}
              createForm={createForm}
              title="Document"
              enableView={true}
              viewHref={(item) => `/organizations/${orgId}/sites/${siteId}/documentation/${item.id}`}
              editHref={(item) => `/organizations/${orgId}/sites/${siteId}/documentation/${item.id}?mode=edit`}
            />
          </div>
        )}

        {/* Share Modal */}
        {shareModal && (
          <div style={modalStyles.overlay} onClick={closeShareModal}>
            <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={modalStyles.header}>
                <h3 style={modalStyles.title}>
                  <i className="fa-solid fa-link" style={{ marginRight: '8px', color: '#48bb78' }}></i>
                  Sharing Enabled
                </h3>
                <button onClick={closeShareModal} style={modalStyles.closeButton}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div style={modalStyles.body}>
                <p style={modalStyles.text}>
                  "{shareModal.title}" is now publicly shareable. Anyone with this link can view the document:
                </p>
                <div style={modalStyles.linkContainer}>
                  <input 
                    type="text" 
                    value={shareModal.url} 
                    readOnly 
                    style={modalStyles.linkInput}
                  />
                  <button 
                    onClick={() => handleCopyLink(shareModal.url)}
                    style={modalStyles.copyButton}
                  >
                    {copied ? (
                      <>
                        <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                        Copied!
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-copy" style={{ marginRight: '6px' }}></i>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div style={modalStyles.footer}>
                <button onClick={closeShareModal} style={modalStyles.doneButton}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const styles = {
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
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
  shareButton: {
    padding: '6px 10px',
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  shareButtonActive: {
    padding: '6px 10px',
    backgroundColor: '#48bb78',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  deleteButton: {
    padding: '6px 10px',
    backgroundColor: '#f56565',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  copyLinkButton: {
    padding: '4px 8px',
    backgroundColor: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
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
    fontFamily: 'inherit',
  },
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '90%',
    maxWidth: '500px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#a0aec0',
    cursor: 'pointer',
    padding: '4px',
  },
  body: {
    padding: '20px',
  },
  text: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#4a5568',
  },
  linkContainer: {
    display: 'flex',
    gap: '8px',
  },
  linkInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#f7fafc',
    color: '#4a5568',
  },
  copyButton: {
    padding: '10px 16px',
    backgroundColor: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  doneButton: {
    padding: '8px 16px',
    backgroundColor: '#48bb78',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};
