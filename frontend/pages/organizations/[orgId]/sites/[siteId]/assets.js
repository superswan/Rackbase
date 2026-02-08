import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api } from '../../../../../lib/api';
import { useApp } from '../../../../../context/AppContext';

export default function Assets() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [assets, setAssets] = useState([]);
  const [hypervisors, setHypervisors] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importOptions, setImportOptions] = useState({
    default_asset_category: 'computer',
    default_asset_type: 'other',
    update_asset_names: true,
  });
  const [importResult, setImportResult] = useState(null);

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
      
      const data = await api.getAssets({ organization_id: orgId, site_id: siteId });
      setAssets(data);
      
      // Fetch all assets for VM parent selection (any asset can host VMs)
      const allSiteAssets = await api.getAssets({ organization_id: orgId, site_id: siteId });
      setHypervisors(allSiteAssets);
      
      // Fetch networks for asset-network assignment
      const networksData = await api.getNetworks({ organization_id: orgId, site_id: siteId });
      setNetworks(networksData);
    } catch (err) {
      setError('Failed to load assets: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    try {
      // Extract network_id before sending to API - it's not an Asset field
      const { network_id, ...assetData } = data;
      
      // Clean up the data - convert empty strings to null for UUID fields
      const cleanedData = { ...assetData };
      if (cleanedData.parent_asset_id === '') {
        cleanedData.parent_asset_id = null;
      }
      
      // Add org/site IDs
      const payload = { ...cleanedData, organization_id: orgId, site_id: siteId };
      
      const createdAsset = await api.createAsset(payload);
      
      // If network_id is provided, create the asset-network mapping
      if (network_id) {
        await api.post('/asset-networks', {
          asset_id: createdAsset.id,
          network_id: network_id,
          ip_address: cleanedData.ip_address || null,
        });
      }
      
      await loadData();
    } catch (err) {
      const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError('Failed to create asset: ' + errorMessage);
    }
  }

  async function handleEdit(id, data) {
    try {
      await api.updateAsset(id, data);
      await loadData();
    } catch (err) {
      setError('Failed to update asset: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteAsset(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete asset: ' + err.message);
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'asset_category', label: 'Category' },
    { key: 'asset_type', label: 'Type' },
    { key: 'ip_address', label: 'IP Address' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'model', label: 'Model' },
    { key: 'status', label: 'Status' },
  ];

  const assetCategories = [
    { value: 'computer', label: 'Computer' },
    { value: 'network', label: 'Network' },
    { value: 'storage', label: 'Storage' },
    { value: 'peripheral', label: 'Peripheral' },
  ];

  const assetTypes = [
    { value: 'server', label: 'Server', category: 'computer' },
    { value: 'workstation', label: 'Workstation', category: 'computer' },
    { value: 'vm', label: 'Virtual Machine', category: 'computer' },
    { value: 'firewall', label: 'Firewall', category: 'network' },
    { value: 'switch', label: 'Switch', category: 'network' },
    { value: 'ap', label: 'Access Point', category: 'network' },
    { value: 'nas', label: 'NAS', category: 'storage' },
    { value: 'hypervisor', label: 'Hypervisor', category: 'computer' },
    { value: 'printer', label: 'Printer', category: 'peripheral' },
    { value: 'other', label: 'Other', category: null },
  ];

  const getFilteredAssetTypes = (category) => {
    if (!category) return assetTypes;
    return assetTypes.filter(type => type.category === category || type.value === 'other');
  };

  async function handleImportSubmit(e) {
    e.preventDefault();
    if (!importFile) {
      setError('Please select an Nmap XML file to import.');
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const result = await api.importNmapScan(importFile, {
        organization_id: orgId,
        site_id: siteId,
        default_asset_category: importOptions.default_asset_category,
        default_asset_type: importOptions.default_asset_type,
        update_asset_names: importOptions.update_asset_names,
      });

      setImportResult(result);
      await loadData();
    } catch (err) {
      setError('Failed to import Nmap scan: ' + err.message);
    } finally {
      setImporting(false);
    }
  }

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
          placeholder="e.g., Server-01, Firewall-Main"
        />
      </div>
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Asset Category *</label>
          <select
            value={formData.asset_category || ''}
            onChange={(e) => setFormData({ ...formData, asset_category: e.target.value, asset_type: '' })}
            style={formStyles.input}
            required
          >
            <option value="">Select Category</option>
            {assetCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Asset Type *</label>
          <select
            value={formData.asset_type || ''}
            onChange={(e) => setFormData({ ...formData, asset_type: e.target.value, parent_asset_id: '' })}
            style={formStyles.input}
            required
            disabled={!formData.asset_category}
          >
            <option value="">Select Type</option>
            {getFilteredAssetTypes(formData.asset_category).map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {formData.asset_type === 'vm' && (
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Parent Asset (Host)</label>
          <select
            value={formData.parent_asset_id || ''}
            onChange={(e) => setFormData({ ...formData, parent_asset_id: e.target.value })}
            style={formStyles.input}
          >
            <option value="">Select Parent Asset (optional)</option>
            {hypervisors.filter(hv => hv.asset_type !== 'vm').map(hv => (
              <option key={hv.id} value={hv.id}>{hv.name} ({hv.asset_type})</option>
            ))}
          </select>
        </div>
      )}
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>IP Address</label>
        <input
          type="text"
          value={formData.ip_address || ''}
          onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
          style={formStyles.input}
          placeholder="192.168.1.100"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Network (Optional)</label>
        <select
          value={formData.network_id || ''}
          onChange={(e) => setFormData({ ...formData, network_id: e.target.value })}
          style={formStyles.input}
        >
          <option value="">-- Select Network --</option>
          {networks.map(network => (
            <option key={network.id} value={network.id}>{network.name} ({network.cidr})</option>
          ))}
        </select>
      </div>
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Manufacturer</label>
          <input
            type="text"
            value={formData.manufacturer || ''}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            style={formStyles.input}
            placeholder="Dell, HP, Cisco, etc."
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Model</label>
          <input
            type="text"
            value={formData.model || ''}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            style={formStyles.input}
            placeholder="Model number or name"
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Serial Number</label>
        <input
          type="text"
          value={formData.serial_number || ''}
          onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Operating System</label>
        <input
          type="text"
          value={formData.operating_system || ''}
          onChange={(e) => setFormData({ ...formData, operating_system: e.target.value })}
          style={formStyles.input}
          placeholder="Windows Server 2022, Ubuntu 22.04, etc."
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Status</label>
        <select
          value={formData.status || 'active'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          style={formStyles.input}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={formStyles.input}
          rows="2"
          placeholder="Additional details about this asset"
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
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Asset Category</label>
          <select
            value={formData.asset_category || ''}
            onChange={(e) => setFormData({ ...formData, asset_category: e.target.value, asset_type: '' })}
            style={formStyles.input}
          >
            {assetCategories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Asset Type</label>
          <select
            value={formData.asset_type || ''}
            onChange={(e) => setFormData({ ...formData, asset_type: e.target.value, parent_asset_id: '' })}
            style={formStyles.input}
          >
            {getFilteredAssetTypes(formData.asset_category).map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {formData.asset_type === 'vm' && (
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Parent Asset (Host)</label>
          <select
            value={formData.parent_asset_id || ''}
            onChange={(e) => setFormData({ ...formData, parent_asset_id: e.target.value })}
            style={formStyles.input}
          >
            <option value="">Select Parent Asset (optional)</option>
            {hypervisors.filter(hv => hv.asset_type !== 'vm').map(hv => (
              <option key={hv.id} value={hv.id}>{hv.name} ({hv.asset_type})</option>
            ))}
          </select>
        </div>
      )}
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>IP Address</label>
        <input
          type="text"
          value={formData.ip_address || ''}
          onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Manufacturer</label>
          <input
            type="text"
            value={formData.manufacturer || ''}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            style={formStyles.input}
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Model</label>
          <input
            type="text"
            value={formData.model || ''}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            style={formStyles.input}
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Serial Number</label>
        <input
          type="text"
          value={formData.serial_number || ''}
          onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Operating System</label>
        <input
          type="text"
          value={formData.operating_system || ''}
          onChange={(e) => setFormData({ ...formData, operating_system: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Status</label>
        <select
          value={formData.status || 'active'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          style={formStyles.input}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
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
          <div style={styles.headerRow}>
            <div>
              <h3 style={styles.title}>Assets</h3>
              <p style={styles.subtitle}>
                Managing assets for {selectedSite?.name} in {selectedOrg?.name}
              </p>
            </div>
            <div style={styles.headerActions}>
              <button onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setImportOptions({
                  default_asset_category: 'computer',
                  default_asset_type: 'other',
                  update_asset_names: true,
                });
                setShowImport(true);
              }} style={styles.importButton}>
                Import Nmap Scan
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <DataTable
            columns={columns}
            data={assets}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
            createForm={createForm}
            editForm={editForm}
            title="Asset"
            enableView={true}
            viewHref={(item) => `/organizations/${orgId}/sites/${siteId}/assets/${item.id}`}
          />
        )}

        {showImport && (
          <div style={modalStyles.overlay}>
            <div style={modalStyles.content}>
              <h3 style={modalStyles.title}>Import Nmap Scan</h3>
              <p style={modalStyles.help}>
                Upload an Nmap XML output file (generated with `nmap ... -oX scan.xml`). This will upsert assets and services.
              </p>

              <form onSubmit={handleImportSubmit}>
                <div style={formStyles.formGroup}>
                  <label style={formStyles.label}>Nmap XML File *</label>
                  <input
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    style={formStyles.input}
                    required
                  />
                  {importFile && (
                    <div style={modalStyles.fileHint}>Selected: {importFile.name}</div>
                  )}
                </div>

                <div style={formStyles.row}>
                  <div style={formStyles.formGroup}>
                    <label style={formStyles.label}>Default Asset Category</label>
                    <select
                      value={importOptions.default_asset_category}
                      onChange={(e) => {
                        const nextCategory = e.target.value;
                        const validTypes = getFilteredAssetTypes(nextCategory);
                        const nextType = validTypes.some(t => t.value === importOptions.default_asset_type)
                          ? importOptions.default_asset_type
                          : 'other';
                        setImportOptions({
                          ...importOptions,
                          default_asset_category: nextCategory,
                          default_asset_type: nextType,
                        });
                      }}
                      style={formStyles.input}
                    >
                      {assetCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={formStyles.formGroup}>
                    <label style={formStyles.label}>Default Asset Type</label>
                    <select
                      value={importOptions.default_asset_type}
                      onChange={(e) => setImportOptions({ ...importOptions, default_asset_type: e.target.value })}
                      style={formStyles.input}
                    >
                      {getFilteredAssetTypes(importOptions.default_asset_category).map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={modalStyles.checkboxRow}>
                  <input
                    id="update-asset-names"
                    type="checkbox"
                    checked={!!importOptions.update_asset_names}
                    onChange={(e) => setImportOptions({ ...importOptions, update_asset_names: e.target.checked })}
                  />
                  <label htmlFor="update-asset-names" style={modalStyles.checkboxLabel}>
                    Update asset name from hostname (if asset name is empty or equals IP)
                  </label>
                </div>

                {importResult && (
                  <div style={modalStyles.resultBox}>
                    <div style={modalStyles.resultTitle}>Import Complete</div>
                    <div style={modalStyles.resultGrid}>
                      <div>Hosts processed</div><div style={modalStyles.resultValue}>{importResult.hosts_processed}</div>
                      <div>Assets created</div><div style={modalStyles.resultValue}>{importResult.assets_created}</div>
                      <div>Assets updated</div><div style={modalStyles.resultValue}>{importResult.assets_updated}</div>
                      <div>Services created</div><div style={modalStyles.resultValue}>{importResult.services_created}</div>
                      <div>Services updated</div><div style={modalStyles.resultValue}>{importResult.services_updated}</div>
                    </div>
                    <div style={modalStyles.resultHint}>
                      View discovered services in the Services page.
                    </div>
                  </div>
                )}

                <div style={modalStyles.actions}>
                  <button type="submit" style={modalStyles.primaryButton} disabled={importing}>
                    {importing ? 'Importing...' : 'Import'}
                  </button>
                  <button type="button" onClick={() => setShowImport(false)} style={modalStyles.cancelButton} disabled={importing}>
                    Close
                  </button>
                </div>
              </form>
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
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
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
  importButton: {
    backgroundColor: '#2b6cb0',
    color: '#fff',
    padding: '10px 14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    whiteSpace: 'nowrap',
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
    padding: '24px',
    borderRadius: '10px',
    width: '100%',
    maxWidth: '620px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    color: '#2d3748',
  },
  help: {
    margin: '0 0 18px 0',
    fontSize: '13px',
    color: '#718096',
    lineHeight: 1.4,
  },
  fileHint: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#718096',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '6px',
    marginBottom: '16px',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: '#4a5568',
    lineHeight: 1.35,
  },
  resultBox: {
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '14px',
    marginTop: '14px',
  },
  resultTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '10px',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '6px 12px',
    fontSize: '13px',
    color: '#4a5568',
  },
  resultValue: {
    fontFamily: 'monospace',
    color: '#2d3748',
  },
  resultHint: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#718096',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '18px',
  },
  primaryButton: {
    backgroundColor: '#2b6cb0',
    color: '#fff',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
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
};
