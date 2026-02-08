import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api } from '../../../../../lib/api';
import { useApp } from '../../../../../context/AppContext';

export default function Software() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [software, setSoftware] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingSoftware, setViewingSoftware] = useState(null);
  const [showView, setShowView] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

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
      
      const data = await api.getSoftware();
      setSoftware(data);
    } catch (err) {
      setError('Failed to load software: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    try {
      await api.createSoftware(data);
      await loadData();
    } catch (err) {
      setError('Failed to create software: ' + err.message);
    }
  }

  async function handleEdit(id, data) {
    try {
      await api.updateSoftware(id, data);
      await loadData();
    } catch (err) {
      setError('Failed to update software: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteSoftware(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete software: ' + err.message);
    }
  }

  const handleView = (item) => {
    setViewingSoftware(item);
    setShowView(true);
  };

  const handleCopyLicense = (licenseKey, id) => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'version', label: 'Version' },
    { 
      key: 'license_key', 
      label: 'License Key',
      render: (_, item) => (
        item.license_key ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{item.license_key.substring(0, 12)}...</span>
            <button
              onClick={() => handleCopyLicense(item.license_key, item.id)}
              style={styles.copyButton}
              title="Copy to clipboard"
            >
              {copiedId === item.id ? (
                <i className="fa-solid fa-check" style={{ color: '#48bb78' }}></i>
              ) : (
                <i className="fa-regular fa-copy"></i>
              )}
            </button>
          </div>
        ) : '-'
      )
    },
    { key: 'license_expiry', label: 'License Expiry' },
  ];

  const createForm = (formData, setFormData) => (
    <>
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Name *</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={formStyles.input}
          required
          placeholder="e.g., Microsoft Office 365, Adobe Photoshop"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Vendor *</label>
        <input
          type="text"
          value={formData.vendor || ''}
          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
          style={formStyles.input}
          required
          placeholder="Microsoft, Adobe, etc."
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Version</label>
        <input
          type="text"
          value={formData.version || ''}
          onChange={(e) => setFormData({ ...formData, version: e.target.value })}
          style={formStyles.input}
          placeholder="2023, 1.0.0, latest, etc."
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>License Key</label>
        <input
          type="text"
          value={formData.license_key || ''}
          onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
          style={formStyles.input}
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>License Expiry</label>
        <input
          type="date"
          value={formData.license_expiry || ''}
          onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={formStyles.input}
          rows="2"
          placeholder="Software description, features, notes"
        />
      </div>
    </>
  );

  const editForm = (formData, setFormData) => (
    <>
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
        <label style={formStyles.label}>Vendor *</label>
        <input
          type="text"
          value={formData.vendor || ''}
          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
          style={formStyles.input}
          required
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Version</label>
        <input
          type="text"
          value={formData.version || ''}
          onChange={(e) => setFormData({ ...formData, version: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>License Key</label>
        <input
          type="text"
          value={formData.license_key || ''}
          onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>License Expiry</label>
        <input
          type="date"
          value={formData.license_expiry || ''}
          onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={formStyles.input}
          rows="2"
        />
      </div>
    </>
  );

  // Format data for display
  const displayData = software.map(item => ({
    ...item,
    license_expiry: item.license_expiry 
      ? new Date(item.license_expiry).toLocaleDateString()
      : '-',
  }));

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
          <h3 style={styles.title}>Software Catalog</h3>
          <p style={styles.subtitle}>
            Managing software definitions for {selectedSite?.name} in {selectedOrg?.name}
          </p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <DataTable
            columns={columns}
            data={displayData}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
            createForm={createForm}
            editForm={editForm}
            title="Software"
            enableView={true}
            onView={handleView}
          />
        )}

        {/* View Modal */}
        {showView && viewingSoftware && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h3 style={styles.modalTitle}>{viewingSoftware.name}</h3>
              
              <div style={styles.detailGrid}>
                <div style={styles.detailItem}>
                  <label style={styles.detailLabel}>Vendor</label>
                  <span style={styles.detailValue}>{viewingSoftware.vendor || '-'}</span>
                </div>
                <div style={styles.detailItem}>
                  <label style={styles.detailLabel}>Version</label>
                  <span style={styles.detailValue}>{viewingSoftware.version || '-'}</span>
                </div>
                <div style={styles.detailItem}>
                  <label style={styles.detailLabel}>License Expiry</label>
                  <span style={styles.detailValue}>
                    {viewingSoftware.license_expiry 
                      ? new Date(viewingSoftware.license_expiry).toLocaleDateString()
                      : 'No expiration'}
                  </span>
                </div>
              </div>

              {viewingSoftware.license_key && (
                <div style={styles.licenseSection}>
                  <label style={styles.detailLabel}>License Key</label>
                  <div style={styles.licenseKeyBox}>
                    <code style={styles.licenseKey}>{viewingSoftware.license_key}</code>
                    <button
                      onClick={() => handleCopyLicense(viewingSoftware.license_key, 'modal')}
                      style={styles.copyButtonLarge}
                    >
                      {copiedId === 'modal' ? (
                        <><i className="fa-solid fa-check"></i> Copied!</>
                      ) : (
                        <><i className="fa-regular fa-copy"></i> Copy</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {viewingSoftware.description && (
                <div style={styles.descriptionSection}>
                  <label style={styles.detailLabel}>Description</label>
                  <p style={styles.descriptionText}>{viewingSoftware.description}</p>
                </div>
              )}

              <div style={styles.modalActions}>
                <button onClick={() => setShowView(false)} style={styles.closeButton}>
                  Close
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
  copyButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#718096',
    fontSize: '14px',
  },
  modal: {
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
  modalContent: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    margin: '0 0 24px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#2d3748',
    fontWeight: '500',
  },
  licenseSection: {
    marginBottom: '20px',
  },
  licenseKeyBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '12px',
    marginTop: '8px',
  },
  licenseKey: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#2d3748',
    wordBreak: 'break-all',
  },
  copyButtonLarge: {
    backgroundColor: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  descriptionSection: {
    marginBottom: '20px',
  },
  descriptionText: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.5',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  closeButton: {
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    cursor: 'pointer',
    fontWeight: '600',
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
};
