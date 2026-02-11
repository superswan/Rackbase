import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api } from '../../../../../lib/api';
import { copyToClipboard } from '../../../../../lib/clipboard';
import { useApp } from '../../../../../context/AppContext';

export default function Credentials() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [credentials, setCredentials] = useState([]);
  const [assets, setAssets] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingCredential, setViewingCredential] = useState(null);
  const [showView, setShowView] = useState(false);
  const [showPassword, setShowPassword] = useState({});
  const [copiedField, setCopiedField] = useState(null);

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
      
      // Load credentials, assets, and services
      const [credentialsData, assetsData, servicesData] = await Promise.all([
        api.getCredentials({ organization_id: orgId, site_id: siteId }),
        api.getAssets({ organization_id: orgId, site_id: siteId }),
        api.getServices({ organization_id: orgId, site_id: siteId }),
      ]);
      
      setCredentials(credentialsData);
      setAssets(assetsData);
      setServices(servicesData);
    } catch (err) {
      setError('Failed to load credentials: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    try {
      const credentialData = { 
        ...data, 
        organization_id: orgId, 
        site_id: siteId,
        credential_type: data.credential_type || 'password'
      };
      await api.createCredential(credentialData);
      await loadData();
    } catch (err) {
      setError('Failed to create credential: ' + err.message);
    }
  }

  async function handleEdit(id, data) {
    try {
      await api.updateCredential(id, data);
      await loadData();
    } catch (err) {
      setError('Failed to update credential: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteCredential(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete credential: ' + err.message);
    }
  }

  async function handleView(credential) {
    try {
      const data = await api.getCredential(credential.id);
      setViewingCredential(data);
      setCopiedField(null);
      setShowView(true);
    } catch (err) {
      setError('Failed to load credential details: ' + err.message);
    }
  }

  const handleCopyValue = async (value, field) => {
    if (!value) return;
    try {
      await copyToClipboard(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      setError('Clipboard copy failed. Please copy manually.');
    }
  };


  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'credential_type', label: 'Type' },
    { key: 'username', label: 'Username' },
    { key: 'assigned_to', label: 'Assigned To' },
  ];

  const credentialTypes = [
    { value: 'password', label: 'Password' },
    { value: 'ssh_key', label: 'SSH Key' },
    { value: 'api_key', label: 'API Key' },
    { value: 'token', label: 'Token' },
    { value: 'certificate', label: 'Certificate' },
  ];

  const getAssetName = (assetId) => {
    if (!assetId) return null;
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };

  const getServiceName = (serviceId) => {
    if (!serviceId) return null;
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const getAssignedTo = (item) => {
    const assetName = getAssetName(item.asset_id);
    const serviceName = getServiceName(item.service_id);
    
    if (assetName && serviceName) {
      return `${assetName} / ${serviceName}`;
    } else if (assetName) {
      return assetName;
    } else if (serviceName) {
      return serviceName;
    }
    return 'Unassigned';
  };

  const createForm = (formData, setFormData) => {
    const isPassword = formData.credential_type === 'password' || !formData.credential_type;
    const isSshKey = formData.credential_type === 'ssh_key';
    const showValue = showPassword[`create`] || false;
    
    return (
      <>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Name *</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={formStyles.input}
            required
            placeholder="e.g., Database Admin Password"
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Type *</label>
          <select
            value={formData.credential_type || 'password'}
            onChange={(e) => setFormData({ ...formData, credential_type: e.target.value })}
            style={formStyles.input}
            required
          >
            {credentialTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>
            {isPassword ? 'Password' : isSshKey ? 'Private Key' : 'Secret Value'} *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showValue ? 'text' : 'password'}
              value={formData.value || ''}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              style={{ ...formStyles.input, paddingRight: '40px', fontFamily: 'monospace' }}
              required
              placeholder={
                isSshKey ? '-----BEGIN OPENSSH PRIVATE KEY-----' :
                isPassword ? 'Enter password' : 'Enter API key, token, or certificate'
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword({ ...showPassword, create: !showPassword[`create`] })}
              style={styles.togglePassword}
              title={showPassword[`create`] ? 'Hide' : 'Show'}
            >
              <i className={showPassword[`create`] ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
            </button>
          </div>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Username</label>
          <input
            type="text"
            value={formData.username || ''}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            style={formStyles.input}
            placeholder="e.g., admin, root"
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={formStyles.input}
            rows="2"
            placeholder="Optional description or notes"
          />
        </div>
        
        <div style={formStyles.row}>
          <div style={formStyles.formGroup}>
            <label style={formStyles.label}>Asset</label>
            <select
              value={formData.asset_id || ''}
              onChange={(e) => setFormData({ ...formData, asset_id: e.target.value || null })}
              style={formStyles.input}
            >
              <option value="">None</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
            
          <div style={formStyles.formGroup}>
            <label style={formStyles.label}>Service</label>
            <select
              value={formData.service_id || ''}
              onChange={(e) => setFormData({ ...formData, service_id: e.target.value || null })}
              style={formStyles.input}
            >
              <option value="">None</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Expires At</label>
          <input
            type="datetime-local"
            value={formData.expires_at || ''}
            onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
            style={formStyles.input}
          />
        </div>
      </>
    );
  };

  const editForm = (formData, setFormData) => {
    const isPassword = formData.credential_type === 'password';
    const isSshKey = formData.credential_type === 'ssh_key';
    const showValue = showPassword[`edit_${formData.id}`] || false;
    
    return (
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
          <label style={formStyles.label}>Type</label>
          <select
            value={formData.credential_type || 'password'}
            onChange={(e) => setFormData({ ...formData, credential_type: e.target.value })}
            style={formStyles.input}
            disabled
          >
            {credentialTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <small style={formStyles.hint}>Type cannot be changed after creation</small>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>
            {isPassword ? 'Password' : isSshKey ? 'Private Key' : 'Secret Value'}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showValue ? 'text' : 'password'}
              value={formData.value || ''}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              style={{ ...formStyles.input, paddingRight: '40px', fontFamily: 'monospace' }}
              placeholder="Leave empty to keep current value"
            />
            <button
              type="button"
              onClick={() => setShowPassword({ ...showPassword, [`edit_${formData.id}`]: !showPassword[`edit_${formData.id}`] })}
              style={styles.togglePassword}
              title={showPassword[`edit_${formData.id}`] ? 'Hide' : 'Show'}
            >
              <i className={showPassword[`edit_${formData.id}`] ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
            </button>
          </div>
          <small style={formStyles.hint}>Leave empty to keep the current encrypted value</small>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Username</label>
          <input
            type="text"
            value={formData.username || ''}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
        
        <div style={formStyles.row}>
          <div style={formStyles.formGroup}>
            <label style={formStyles.label}>Asset</label>
            <select
              value={formData.asset_id || ''}
              onChange={(e) => setFormData({ ...formData, asset_id: e.target.value || null })}
              style={formStyles.input}
            >
              <option value="">None</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
            
          <div style={formStyles.formGroup}>
            <label style={formStyles.label}>Service</label>
            <select
              value={formData.service_id || ''}
              onChange={(e) => setFormData({ ...formData, service_id: e.target.value || null })}
              style={formStyles.input}
            >
              <option value="">None</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Expires At</label>
          <input
            type="datetime-local"
            value={formData.expires_at ? formData.expires_at.slice(0, 16) : ''}
            onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
            style={formStyles.input}
          />
        </div>
      </>
    );
  };

  // Format data for display
  const displayData = credentials.map(c => ({
    ...c,
    assigned_to: getAssignedTo(c),
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
          <h3 style={styles.title}>Credentials</h3>
          <p style={styles.subtitle}>
            Managing credentials for {selectedSite?.name} in {selectedOrg?.name}
          </p>
        </div>

        <div style={styles.warningBanner}>
          <i className="fa-solid fa-triangle-exclamation" style={styles.warningIcon}></i>
          <div style={styles.warningContent}>
            <strong style={styles.warningTitle}>Beta Feature</strong>
            <p style={styles.warningText}>
              This credential manager feature is incomplete and untested. For production use, 
              it is recommended to use a dedicated professional credential manager such as 
              Bitwarden, 1Password, or HashiCorp Vault.
            </p>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={displayData}
              onView={handleView}
              enableView
              onCreate={handleCreate}
              onEdit={handleEdit}
              onDelete={handleDelete}
              createForm={createForm}
              editForm={editForm}
              title="Credential"
              createDefaults={{ credential_type: 'password' }}
            />

            {credentials.map(credential => (
              <button
                key={credential.id}
                onClick={() => handleView(credential)}
                style={{ display: 'none' }}
                data-view={credential.id}
              />
            ))}
          </>
        )}

        {showView && viewingCredential && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h3>View Credential</h3>
              <div style={formStyles.formGroup}>
                <label style={formStyles.label}>Name</label>
                <input type="text" value={viewingCredential.name} style={formStyles.input} readOnly />
              </div>
              <div style={formStyles.formGroup}>
                <label style={formStyles.label}>Type</label>
                <input 
                  type="text" 
                  value={credentialTypes.find(t => t.value === viewingCredential.credential_type)?.label || viewingCredential.credential_type} 
                  style={formStyles.input} 
                  readOnly 
                />
              </div>
              <div style={formStyles.formGroup}>
                <label style={formStyles.label}>Username</label>
                <div style={styles.copyRow}>
                  <input
                    type="text"
                    value={viewingCredential.username || '-'}
                    style={{ ...formStyles.input, flex: 1, width: 'auto', minWidth: 0 }}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyValue(viewingCredential.username, 'username')}
                    style={styles.copyButton}
                    title="Copy username"
                    disabled={!viewingCredential.username}
                  >
                    {copiedField === 'username' ? (
                      <><i className="fa-solid fa-check"></i> Copied</>
                    ) : (
                      <><i className="fa-regular fa-copy"></i> Copy</>
                    )}
                  </button>
                </div>
              </div>
              <div style={formStyles.formGroup}>
                <label style={formStyles.label}>
                  {viewingCredential.credential_type === 'ssh_key' ? 'Private Key' : 
                   viewingCredential.credential_type === 'password' ? 'Password' : 'Secret Value'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword[`view_${viewingCredential.id}`] ? 'text' : 'password'}
                    value={viewingCredential.value || ''}
                    style={{ ...formStyles.input, paddingRight: '40px', fontFamily: 'monospace' }}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, [`view_${viewingCredential.id}`]: !showPassword[`view_${viewingCredential.id}`] })}
                    style={styles.togglePassword}
                    title={showPassword[`view_${viewingCredential.id}`] ? 'Hide' : 'Show'}
                  >
                    <i className={showPassword[`view_${viewingCredential.id}`] ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
                  </button>
                </div>
                <div style={styles.copyActions}>
                  <button
                    type="button"
                    onClick={() => handleCopyValue(viewingCredential.value, 'secret')}
                    style={styles.copyButton}
                    title="Copy secret"
                    disabled={!viewingCredential.value}
                  >
                    {copiedField === 'secret' ? (
                      <><i className="fa-solid fa-check"></i> Copied</>
                    ) : (
                      <><i className="fa-regular fa-copy"></i> Copy Secret</>
                    )}
                  </button>
                </div>
              </div>
              {viewingCredential.asset_id && (
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Asset</label>
                  <input
                    type="text"
                    value={getAssetName(viewingCredential.asset_id)}
                    style={{ ...formStyles.input, ...styles.readOnlyField }}
                    disabled
                  />
                </div>
              )}
              {viewingCredential.service_id && (
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Service</label>
                  <input type="text" value={getServiceName(viewingCredential.service_id)} style={formStyles.input} readOnly />
                </div>
              )}
              {viewingCredential.description && (
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Description</label>
                  <textarea value={viewingCredential.description} style={formStyles.input} rows="2" readOnly />
                </div>
              )}
              {viewingCredential.expires_at && (
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Expires At</label>
                  <input type="text" value={new Date(viewingCredential.expires_at).toLocaleString()} style={formStyles.input} readOnly />
                </div>
              )}
              <div style={formStyles.formGroup}>
                <label style={formStyles.label}>Created</label>
                <input type="text" value={new Date(viewingCredential.created_at).toLocaleString()} style={formStyles.input} readOnly />
              </div>
              <div style={styles.formActions}>
                <button onClick={() => setShowView(false)} style={styles.cancelButton}>Close</button>
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
  warningBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
  },
  warningIcon: {
    fontSize: '20px',
    color: '#d97706',
    marginTop: '2px',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '4px',
  },
  warningText: {
    margin: 0,
    fontSize: '13px',
    color: '#a16207',
    lineHeight: '1.5',
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
  },
  search: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    width: '300px',
    fontSize: '14px',
  },
  createButton: {
    backgroundColor: '#48bb78',
    color: '#fff',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
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
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
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
  copyRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  copyActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  copyButton: {
    backgroundColor: '#4299e1',
    color: '#fff',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  readOnlyField: {
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    cursor: 'not-allowed',
  },
  togglePassword: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#718096',
    padding: '4px',
  },
};

const formStyles = {
  formGroup: {
    marginBottom: '16px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
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
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#718096',
    marginTop: '4px',
  },
};
