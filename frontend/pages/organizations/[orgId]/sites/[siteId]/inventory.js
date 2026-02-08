import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api } from '../../../../../lib/api';
import { useApp } from '../../../../../context/AppContext';

export default function Inventory() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [items, setItems] = useState([]);
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
      
      const data = await api.getInventory({ organization_id: orgId, site_id: siteId });
      setItems(data);
    } catch (err) {
      setError('Failed to load inventory: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    try {
      await api.createInventory({ ...data, organization_id: orgId, site_id: siteId });
      await loadData();
    } catch (err) {
      setError('Failed to create inventory item: ' + err.message);
    }
  }

  async function handleEdit(id, data) {
    try {
      await api.updateInventory(id, data);
      await loadData();
    } catch (err) {
      setError('Failed to update inventory item: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteInventory(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete inventory item: ' + err.message);
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'model', label: 'Model' },
    { key: 'serial_number', label: 'Serial #' },
    { key: 'quantity', label: 'Qty' },
    { key: 'status', label: 'Status' },
  ];

  const categories = [
    { value: 'peripheral', label: 'Peripheral' },
    { value: 'spare_hardware', label: 'Spare Hardware' },
    { value: 'cable', label: 'Cable' },
    { value: 'component', label: 'Component' },
    { value: 'other', label: 'Other' },
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
          placeholder="e.g., USB-C Cable, RAM Stick"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Category *</label>
        <select
          value={formData.category || ''}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          style={formStyles.input}
          required
        >
          <option value="">Select Category</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
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
            placeholder="Brand name"
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Model</label>
          <input
            type="text"
            value={formData.model || ''}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            style={formStyles.input}
            placeholder="Model number"
          />
        </div>
      </div>
      
      <div style={formStyles.row}>
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
          <label style={formStyles.label}>Quantity *</label>
          <input
            type="number"
            value={formData.quantity || ''}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            style={formStyles.input}
            required
            min="0"
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Location Note</label>
        <input
          type="text"
          value={formData.location_note || ''}
          onChange={(e) => setFormData({ ...formData, location_note: e.target.value })}
          style={formStyles.input}
          placeholder="Storage room A, Shelf B3, etc."
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Status</label>
        <select
          value={formData.status || 'available'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          style={formStyles.input}
        >
          <option value="available">Available</option>
          <option value="in_use">In Use</option>
          <option value="reserved">Reserved</option>
          <option value="defective">Defective</option>
          <option value="disposed">Disposed</option>
        </select>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Notes</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          style={formStyles.input}
          rows="2"
          placeholder="Additional details"
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
        <label style={formStyles.label}>Category</label>
        <select
          value={formData.category || ''}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          style={formStyles.input}
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
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
      
      <div style={formStyles.row}>
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
          <label style={formStyles.label}>Quantity *</label>
          <input
            type="number"
            value={formData.quantity || ''}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            style={formStyles.input}
            required
            min="0"
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Location Note</label>
        <input
          type="text"
          value={formData.location_note || ''}
          onChange={(e) => setFormData({ ...formData, location_note: e.target.value })}
          style={formStyles.input}
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Status</label>
        <select
          value={formData.status || 'available'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          style={formStyles.input}
        >
          <option value="available">Available</option>
          <option value="in_use">In Use</option>
          <option value="reserved">Reserved</option>
          <option value="defective">Defective</option>
          <option value="disposed">Disposed</option>
        </select>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Notes</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
          <h3 style={styles.title}>Inventory</h3>
          <p style={styles.subtitle}>
            Managing inventory items for {selectedSite?.name} in {selectedOrg?.name}
          </p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <DataTable
            columns={columns}
            data={items}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
            createForm={createForm}
            editForm={editForm}
            title="Inventory Item"
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
};
