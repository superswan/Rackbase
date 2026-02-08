import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api } from '../../../../../lib/api';
import { useApp } from '../../../../../context/AppContext';

export default function People() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [people, setPeople] = useState([]);
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
      
      const data = await api.getPeople({ organization_id: orgId, site_id: siteId });
      setPeople(data);
    } catch (err) {
      setError('Failed to load people: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(data) {
    try {
      await api.createPerson({ ...data, organization_id: orgId, site_id: siteId });
      await loadData();
    } catch (err) {
      setError('Failed to create person: ' + err.message);
    }
  }

  async function handleEdit(id, data) {
    try {
      await api.updatePerson(id, data);
      await loadData();
    } catch (err) {
      setError('Failed to update person: ' + err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deletePerson(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete person: ' + err.message);
    }
  }

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'job_title', label: 'Job Title' },
    { key: 'phone', label: 'Phone' },
  ];

  const createForm = (formData, setFormData) => (
    <>
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>First Name *</label>
          <input
            type="text"
            value={formData.first_name || ''}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            style={formStyles.input}
            required
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Last Name *</label>
          <input
            type="text"
            value={formData.last_name || ''}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            style={formStyles.input}
            required
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Email *</label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={formStyles.input}
          required
          placeholder="user@company.com"
        />
      </div>
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Department</label>
          <input
            type="text"
            value={formData.department || ''}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            style={formStyles.input}
            placeholder="IT, HR, Finance, etc."
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Job Title</label>
          <input
            type="text"
            value={formData.job_title || ''}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            style={formStyles.input}
            placeholder="Manager, Technician, etc."
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Phone</label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          style={formStyles.input}
          placeholder="+1 (555) 123-4567"
        />
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Notes</label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          style={formStyles.input}
          rows="2"
          placeholder="Additional information about this person"
        />
      </div>
    </>
  );

  const editForm = (formData, setFormData) => (
    <>
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>First Name *</label>
          <input
            type="text"
            value={formData.first_name || ''}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            style={formStyles.input}
            required
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Last Name *</label>
          <input
            type="text"
            value={formData.last_name || ''}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            style={formStyles.input}
            required
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Email *</label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={formStyles.input}
          required
        />
      </div>
      
      <div style={formStyles.row}>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Department</label>
          <input
            type="text"
            value={formData.department || ''}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            style={formStyles.input}
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Job Title</label>
          <input
            type="text"
            value={formData.job_title || ''}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            style={formStyles.input}
          />
        </div>
      </div>
      
      <div style={formStyles.formGroup}>
        <label style={formStyles.label}>Phone</label>
        <input
          type="tel"
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          style={formStyles.input}
        />
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

  // Combine first_name and last_name for display
  const displayData = people.map(person => ({
    ...person,
    full_name: `${person.first_name} ${person.last_name}`,
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
          <h3 style={styles.title}>People</h3>
          <p style={styles.subtitle}>
            Managing client employees for {selectedSite?.name} in {selectedOrg?.name}
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
            title="Person"
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
