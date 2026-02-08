import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api } from '../../../../../lib/api';
import { useApp } from '../../../../../context/AppContext';

// Default ports for protocols
const defaultPorts = {
  http: 80,
  https: 443,
  ssh: 22,
  rdp: 3389,
  smb: 445,
  ftp: 21,
  sftp: 22,
  snmp: 161,
  other: null,
};

export default function Services() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [services, setServices] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      
      // Load services for this site and assets for the dropdown
      const [servicesData, assetsData] = await Promise.all([
        api.getServices({ organization_id: orgId, site_id: siteId }),
        api.getAssets({ organization_id: orgId, site_id: siteId }),
      ]);
      
      setServices(servicesData);
      setAssets(assetsData);
    } catch (err) {
      setError('Failed to load services: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    try {
      await api.createService({ ...data, organization_id: orgId, site_id: siteId });
      await loadData();
    } catch (err) {
      setError('Failed to create service: ' + err.message);
    }
  }

  async function handleEdit(id, data) {
    try {
      await api.updateService(id, data);
      await loadData();
    } catch (err) {
      setError('Failed to update service: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteService(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete service: ' + err.message);
    }
  }

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'asset_name', label: 'Asset' },
    { key: 'protocol', label: 'Protocol' },
    { key: 'port', label: 'Port' },
    { 
      key: 'url', 
      label: 'URL',
      render: (value, row) => {
        if (!value) return '-';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#3182ce', textDecoration: 'none' }}
              onClick={(e) => {
                // Prevent row click from triggering
                e.stopPropagation();
              }}
            >
              {value.length > 40 ? value.substring(0, 40) + '...' : value}
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(value, row.id);
              }}
              style={styles.copyButton}
              title="Copy URL to clipboard"
            >
              {copiedId === row.id ? <><i className="fa-solid fa-check"></i></> : <><i className="fa-solid fa-clipboard"></i></>}
            </button>
          </div>
        );
      }
    },
    { key: 'authentication_type', label: 'Auth Type' },
  ];

  const protocols = [
    { value: 'http', label: 'HTTP', defaultPort: 80 },
    { value: 'https', label: 'HTTPS', defaultPort: 443 },
    { value: 'ssh', label: 'SSH', defaultPort: 22 },
    { value: 'rdp', label: 'RDP', defaultPort: 3389 },
    { value: 'smb', label: 'SMB', defaultPort: 445 },
    { value: 'ftp', label: 'FTP', defaultPort: 21 },
    { value: 'sftp', label: 'SFTP', defaultPort: 22 },
    { value: 'snmp', label: 'SNMP', defaultPort: 161 },
    { value: 'other', label: 'Other' },
  ];

  const authTypes = [
    { value: 'none', label: 'None' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'api_key', label: 'API Key' },
    { value: 'oauth', label: 'OAuth' },
    { value: 'ldap', label: 'LDAP' },
    { value: 'sso', label: 'SSO' },
    { value: 'other', label: 'Other' },
  ];

  const getAssetName = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown Asset';
  };

  // Build URL from protocol, asset IP, port, and path
  const buildUrl = (protocol, assetId, port, path) => {
    if (!protocol || !['http', 'https'].includes(protocol)) return null;
    
    const asset = assets.find(a => a.id === assetId);
    if (!asset || !asset.ip_address) return null;
    
    const defaultPort = protocol === 'https' ? 443 : 80;
    const portSuffix = port && port !== defaultPort ? `:${port}` : '';
    const pathSuffix = path ? (path.startsWith('/') ? path : `/${path}`) : '';
    
    return `${protocol}://${asset.ip_address}${portSuffix}${pathSuffix}`;
  };

  const handleProtocolChange = (protocol, formData, setFormData) => {
    const defaultPort = defaultPorts[protocol];
    const updates = { protocol };
    
    // Only set default port if port field is empty
    if (!formData.port && defaultPort) {
      updates.port = defaultPort;
    }
    
    // Auto-generate URL for http/https
    const newPort = updates.port || formData.port;
    if (['http', 'https'].includes(protocol)) {
      const url = buildUrl(protocol, formData.asset_id, newPort, formData.path);
      if (url) {
        updates.url = url;
      }
    }
    
    setFormData({ ...formData, ...updates });
  };

  const createForm = (formData, setFormData) => (
    <>
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Asset *</label>
        <select
          value={formData.asset_id || ''}
          onChange={(e) => {
            const newAssetId = e.target.value;
            const updates = { asset_id: newAssetId };
            
            // Auto-update URL for http/https when asset changes
            if (['http', 'https'].includes(formData.protocol)) {
              const url = buildUrl(formData.protocol, newAssetId, formData.port, formData.path);
              if (url) {
                updates.url = url;
              }
            }
            
            setFormData({ ...formData, ...updates });
          }}
          style={formStyles.input}
          required
        >
          <option value="">Select Asset</option>
          {assets.map(asset => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.asset_type || asset.asset_category})
            </option>
          ))}
        </select>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Service Name *</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={formStyles.input}
          required
          placeholder="e.g., Proxmox Web UI, SSH Access"
        />
      </div>
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Protocol *</label>
          <select
            value={formData.protocol || 'http'}
            onChange={(e) => handleProtocolChange(e.target.value, formData, setFormData)}
            style={formStyles.input}
            required
          >
            {protocols.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <small style={formStyles.hint}>
            {formData.protocol && defaultPorts[formData.protocol] && 
              `Default port: ${defaultPorts[formData.protocol]}`}
          </small>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Port *</label>
          <input
            type="number"
            value={formData.port || ''}
            onChange={(e) => {
              const newPort = parseInt(e.target.value);
              const updates = { port: newPort };
              
              // Auto-update URL for http/https when port changes
              if (['http', 'https'].includes(formData.protocol)) {
                const url = buildUrl(formData.protocol, formData.asset_id, newPort, formData.path);
                if (url) {
                  updates.url = url;
                }
              }
              
              setFormData({ ...formData, ...updates });
            }}
            style={formStyles.input}
            required
            placeholder="e.g., 80, 443, 22"
            min="1"
            max="65535"
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Path</label>
        <input
          type="text"
          value={formData.path || ''}
          onChange={(e) => {
            const newPath = e.target.value;
            const updates = { path: newPath };
            
            // Auto-update URL for http/https when path changes
            if (['http', 'https'].includes(formData.protocol)) {
              const url = buildUrl(formData.protocol, formData.asset_id, formData.port, newPath);
              if (url) {
                updates.url = url;
              }
            }
            
            setFormData({ ...formData, ...updates });
          }}
          style={formStyles.input}
          placeholder="e.g., /admin, /ui (optional)"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>URL</label>
        <input
          type="text"
          value={formData.url || ''}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          style={formStyles.input}
          placeholder="e.g., https://192.168.1.100:8006 (auto-generated if empty)"
        />
        <small style={formStyles.hint}>
          Full URL to access the service. Auto-generated from protocol, asset IP, port and path if empty.
        </small>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Authentication Type</label>
        <select
          value={formData.authentication_type || 'none'}
          onChange={(e) => setFormData({ ...formData, authentication_type: e.target.value })}
          style={formStyles.input}
        >
          {authTypes.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Description</label>
        <input
          type="text"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={formStyles.input}
          placeholder="Brief description of the service"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Notes</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          style={formStyles.input}
          rows="2"
          placeholder="Additional notes"
        />
      </div>
    </>
  );

  const editForm = (formData, setFormData) => createForm(formData, setFormData);

  // Format data for display
  const displayData = services.map(s => ({
    ...s,
    asset_name: getAssetName(s.asset_id),
    authentication_type: authTypes.find(a => a.value === s.authentication_type)?.label || s.authentication_type,
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
          <h3 style={styles.title}>Services</h3>
          <p style={styles.subtitle}>
            Manage services and web interfaces for assets in {selectedSite?.name}
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
            title="Service"
          />
        )}
      </div>
    </Layout>
  );
}

const styles = {
  error: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeError: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#c53030',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
  },
  copyButton: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
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
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#718096',
    marginTop: '4px',
  },
};
