import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api } from '../../../../../lib/api';
import { useApp } from '../../../../../context/AppContext';

export default function Networks() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      
      const data = await api.getNetworks({ organization_id: orgId, site_id: siteId });
      setNetworks(data);
    } catch (err) {
      setError('Failed to load networks: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    try {
      await api.createNetwork({ ...data, organization_id: orgId, site_id: siteId });
      await loadData();
    } catch (err) {
      setError('Failed to create network: ' + err.message);
    }
  }

  async function handleEdit(id, data) {
    try {
      await api.updateNetwork(id, data);
      await loadData();
    } catch (err) {
      setError('Failed to update network: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteNetwork(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete network: ' + err.message);
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'cidr', label: 'CIDR' },
    { key: 'vlan_id', label: 'VLAN' },
    { key: 'gateway', label: 'Gateway' },
    { key: 'dns_servers', label: 'DNS Servers' },
    { key: 'dhcp_enabled', label: 'DHCP' },
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
          placeholder="e.g., Production LAN, Guest WiFi"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>CIDR *</label>
        <input
          type="text"
          value={formData.cidr || ''}
          onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
          style={formStyles.input}
          required
          placeholder="192.168.1.0/24"
        />
      </div>
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>VLAN ID</label>
          <input
            type="number"
            value={formData.vlan_id || ''}
            onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value ? parseInt(e.target.value) : null })}
            style={formStyles.input}
            placeholder="100"
            min="1"
            max="4094"
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Gateway</label>
          <input
            type="text"
            value={formData.gateway || ''}
            onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
            style={formStyles.input}
            placeholder="192.168.1.1"
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>DNS Servers</label>
        <input
          type="text"
          value={formData.dns_servers || ''}
          onChange={(e) => setFormData({ ...formData, dns_servers: e.target.value })}
          style={formStyles.input}
          placeholder="8.8.8.8, 8.8.4.4 (comma-separated)"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.dhcp_enabled || false}
            onChange={(e) => setFormData({ ...formData, dhcp_enabled: e.target.checked })}
            style={formStyles.checkbox}
          />
          DHCP Enabled
        </label>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Description</label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={formStyles.input}
          rows="2"
          placeholder="Network description and notes"
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
        <label style={formStyles.label}>CIDR *</label>
        <input
          type="text"
          value={formData.cidr || ''}
          onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
          style={formStyles.input}
          required
        />
      </div>
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>VLAN ID</label>
          <input
            type="number"
            value={formData.vlan_id || ''}
            onChange={(e) => setFormData({ ...formData, vlan_id: e.target.value ? parseInt(e.target.value) : null })}
            style={formStyles.input}
            min="1"
            max="4094"
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Gateway</label>
          <input
            type="text"
            value={formData.gateway || ''}
            onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
            style={formStyles.input}
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>DNS Servers</label>
        <input
          type="text"
          value={formData.dns_servers || ''}
          onChange={(e) => setFormData({ ...formData, dns_servers: e.target.value })}
          style={formStyles.input}
          placeholder="8.8.8.8, 8.8.4.4"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.dhcp_enabled || false}
            onChange={(e) => setFormData({ ...formData, dhcp_enabled: e.target.checked })}
            style={formStyles.checkbox}
          />
          DHCP Enabled
        </label>
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
  const displayData = networks.map(network => ({
    ...network,
    dhcp_enabled: network.dhcp_enabled ? 'Yes' : 'No',
    vlan_id: network.vlan_id || '-',
    gateway: network.gateway || '-',
    dns_servers: network.dns_servers || '-',
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
          <h3 style={styles.title}>Networks</h3>
          <p style={styles.subtitle}>
            Managing networks for {selectedSite?.name} in {selectedOrg?.name}
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
            title="Network"
          />
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    cursor: 'pointer',
  },
  checkbox: {
    marginRight: '8px',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
};
