import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { selectedOrg, hasSelectedOrg } = useApp();
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Global Settings State
  const [users, setUsers] = useState([]);
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    storagePath: './uploads',
    maxFileSize: 50,
    allowedFileTypes: 'pdf,doc,docx,xls,xlsx,png,jpg,jpeg,gif,txt,md,json,xml,zip',
  });
  
  // UI Preferences State
  const [uiPreferences, setUiPreferences] = useState({
    theme: 'light',
    defaultLandingPage: 'dashboard',
  });

  // Database Configuration State
  const [dbConfig, setDbConfig] = useState({
    type: 'sqlite',
    sqlitePath: './inventory.db',
    postgresHost: 'localhost',
    postgresPort: 5432,
    postgresDatabase: 'rackbase',
    postgresUsername: '',
    postgresPassword: '',
  });
  const [dbStatus, setDbStatus] = useState({ connected: true, type: 'sqlite', size: '0 MB' });
  const [backups, setBackups] = useState([]);

  // Organization Settings State
  const [orgSettings, setOrgSettings] = useState({
    name: '',
    description: '',
    defaultContactEmail: '',
    defaultContactPhone: '',
    defaultSitePreferences: '',
  });

  // Service Protocols State
  const [serviceProtocols, setServiceProtocols] = useState([
    'http', 'https', 'ssh', 'rdp', 'smb', 'vnc', 'other'
  ]);
  const [newProtocol, setNewProtocol] = useState('');

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);

  // New User Form State
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  // Load data on mount
  useEffect(() => {
    loadUsers();
    loadOrganizations();
    loadSystemSettings();
    loadUiPreferences();
    loadDatabaseConfig();
    loadBackups();
    if (hasSelectedOrg()) {
      loadOrgSettings();
      loadServiceProtocols();
      loadAuditLogs();
    }
  }, [selectedOrg]);

  const loadUsers = async () => {
    try {
      const data = await api.get('/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadOrganizations = async () => {
    try {
      const data = await api.get('/organizations');
      setOrganizations(data);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const data = await api.get('/settings/system');
      if (data) setSystemSettings(data);
    } catch (err) {
      // Use defaults if not available
    }
  };

  const loadUiPreferences = async () => {
    try {
      const data = await api.get('/settings/ui');
      if (data) setUiPreferences(data);
    } catch (err) {
      // Use defaults if not available
    }
  };

  const loadDatabaseConfig = async () => {
    try {
      const data = await api.get('/settings/database');
      if (data) {
        setDbConfig({
          type: data.type || 'sqlite',
          sqlitePath: data.sqlite_path || './inventory.db',
          postgresHost: data.postgres_host || 'localhost',
          postgresPort: data.postgres_port || 5432,
          postgresDatabase: data.postgres_database || 'rackbase',
          postgresUsername: data.postgres_username || '',
          postgresPassword: '',
        });
        setDbStatus(data.status || { connected: true, type: 'sqlite', size: '0 MB' });
      }
    } catch (err) {
      console.error('Failed to load database config:', err);
    }
  };

  const loadBackups = async () => {
    try {
      const data = await api.get('/database/backups');
      setBackups(data || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  const loadOrgSettings = async () => {
    if (!selectedOrg) return;
    try {
      const data = await api.get(`/organizations/${selectedOrg.id}`);
      setOrgSettings({
        name: data.name || '',
        description: data.description || '',
        defaultContactEmail: data.contact_email || '',
        defaultContactPhone: data.contact_phone || '',
        defaultSitePreferences: data.default_site_preferences || '',
      });
    } catch (err) {
      console.error('Failed to load org settings:', err);
    }
  };

  const loadServiceProtocols = async () => {
    if (!selectedOrg) return;
    try {
      const data = await api.get(`/settings/protocols?organization_id=${selectedOrg.id}`);
      if (data && data.protocols) {
        setServiceProtocols(data.protocols);
      }
    } catch (err) {
      // Use defaults if not available
    }
  };

  const loadAuditLogs = async () => {
    if (!selectedOrg) return;
    try {
      const data = await api.get(`/audit?organization_id=${selectedOrg.id}`);
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  // User Management Functions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        email: newUser.email,
        password: newUser.password,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
      });
      setShowUserModal(false);
      setNewUser({ email: '', password: '', firstName: '', lastName: '' });
      loadUsers();
      showMessage('User created successfully');
    } catch (err) {
      showMessage('Failed to create user: ' + err.message);
    }
  };

  const handleToggleUser = async (userId, isActive) => {
    try {
      await api.put(`/users/${userId}`, { is_active: !isActive });
      loadUsers();
      showMessage(`User ${isActive ? 'disabled' : 'enabled'} successfully`);
    } catch (err) {
      showMessage('Failed to update user: ' + err.message);
    }
  };

  const handleAddUserToOrg = async (userId, orgId, role) => {
    try {
      await api.post('/user-organizations', {
        user_id: userId,
        organization_id: orgId,
        role: role,
      });
      loadUsers();
      showMessage('User added to organization');
    } catch (err) {
      showMessage('Failed to add user to organization: ' + err.message);
    }
  };

  const handleRemoveUserFromOrg = async (membershipId) => {
    try {
      await api.delete(`/user-organizations/${membershipId}`);
      loadUsers();
      showMessage('User removed from organization');
    } catch (err) {
      showMessage('Failed to remove user from organization: ' + err.message);
    }
  };

  // System Settings Functions
  const handleSaveSystemSettings = async () => {
    try {
      await api.put('/settings/system', systemSettings);
      showMessage('System settings saved');
    } catch (err) {
      showMessage('Failed to save system settings: ' + err.message);
    }
  };

  // UI Preferences Functions
  const handleSaveUiPreferences = async () => {
    try {
      await api.put('/settings/ui', uiPreferences);
      showMessage('UI preferences saved');
    } catch (err) {
      showMessage('Failed to save UI preferences: ' + err.message);
    }
  };

  // Database Configuration Functions
  const handleSaveDbConfig = async () => {
    try {
      await api.put('/settings/database', {
        type: dbConfig.type,
        sqlite_path: dbConfig.sqlitePath,
        postgres_host: dbConfig.postgresHost,
        postgres_port: dbConfig.postgresPort,
        postgres_database: dbConfig.postgresDatabase,
        postgres_username: dbConfig.postgresUsername,
        postgres_password: dbConfig.postgresPassword,
      });
      showMessage('Database configuration saved. Restart server to apply changes.');
    } catch (err) {
      showMessage('Failed to save database config: ' + err.message);
    }
  };

  const handleCreateBackup = async () => {
    try {
      await api.post('/database/backup');
      showMessage('Backup created successfully');
      loadBackups();
    } catch (err) {
      showMessage('Failed to create backup: ' + err.message);
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const response = await api.get(`/database/backup/${filename}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showMessage('Failed to download backup: ' + err.message);
    }
  };

  const handleRestoreBackup = async (filename) => {
    if (!confirm(`Are you sure you want to restore from backup ${filename}? This will replace all current data.`)) {
      return;
    }
    try {
      await api.post(`/database/restore`, { filename });
      showMessage('Database restored successfully. Please refresh the page.');
    } catch (err) {
      showMessage('Failed to restore backup: ' + err.message);
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (!confirm(`Are you sure you want to delete backup ${filename}?`)) {
      return;
    }
    try {
      await api.delete(`/database/backup/${filename}`);
      showMessage('Backup deleted successfully');
      loadBackups();
    } catch (err) {
      showMessage('Failed to delete backup: ' + err.message);
    }
  };

  // Organization Settings Functions
  const handleSaveOrgSettings = async () => {
    if (!selectedOrg) return;
    try {
      await api.put(`/organizations/${selectedOrg.id}`, {
        name: orgSettings.name,
        description: orgSettings.description,
        contact_email: orgSettings.defaultContactEmail,
        contact_phone: orgSettings.defaultContactPhone,
        default_site_preferences: orgSettings.defaultSitePreferences,
      });
      showMessage('Organization settings saved');
    } catch (err) {
      showMessage('Failed to save organization settings: ' + err.message);
    }
  };

  // Service Protocols Functions
  const handleAddProtocol = () => {
    if (newProtocol && !serviceProtocols.includes(newProtocol.toLowerCase())) {
      const updated = [...serviceProtocols, newProtocol.toLowerCase()];
      setServiceProtocols(updated);
      setNewProtocol('');
      saveProtocols(updated);
    }
  };

  const handleRemoveProtocol = (protocol) => {
    const updated = serviceProtocols.filter(p => p !== protocol);
    setServiceProtocols(updated);
    saveProtocols(updated);
  };

  const saveProtocols = async (protocols) => {
    if (!selectedOrg) return;
    try {
      await api.put('/settings/protocols', {
        organization_id: selectedOrg.id,
        protocols: protocols,
      });
      showMessage('Service protocols updated');
    } catch (err) {
      showMessage('Failed to update protocols: ' + err.message);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const openUserDetail = (user) => {
    setSelectedUser(user);
    setShowUserDetailModal(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout>
      <div style={styles.container}>
        {/* Tab Navigation */}
        <div style={styles.tabContainer}>
          <button
            style={activeTab === 'global' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('global')}
          >
            🌍 Global Settings
          </button>
          <button
            style={activeTab === 'organization' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('organization')}
            disabled={!hasSelectedOrg()}
          >
            🏢 Organization Settings
            {!hasSelectedOrg() && <span style={styles.disabledNote}> (Select org first)</span>}
          </button>
        </div>

        {/* Message Toast */}
        {message && (
          <div style={styles.messageToast}>{message}</div>
        )}

        {/* Global Settings */}
        {activeTab === 'global' && (
          <div style={styles.settingsPanel}>
            {/* Users Section */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}><i className="fa-solid fa-users"></i> Users</h3>
                <button style={styles.addButton} onClick={() => setShowUserModal(true)}>
                  + Create User
                </button>
              </div>
              <p style={styles.sectionDescription}>
                Users are global to the system. Manage users and their organization memberships here.
              </p>
              
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Organizations</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} style={styles.tr}>
                        <td style={styles.td}>
                          {user.first_name} {user.last_name}
                        </td>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>
                          <span style={user.is_active ? styles.activeBadge : styles.inactiveBadge}>
                            {user.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {user.organizations?.length || 0} org(s)
                        </td>
                        <td style={styles.td}>
                          <button
                            style={styles.actionButton}
                            onClick={() => openUserDetail(user)}
                          >
                            Manage
                          </button>
                          <button
                            style={user.is_active ? styles.disableButton : styles.enableButton}
                            onClick={() => handleToggleUser(user.id, user.is_active)}
                          >
                            {user.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Database Configuration Section */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}><i className="fa-solid fa-database"></i> Database Configuration</h3>
              <p style={styles.sectionDescription}>
                Configure database connection. Changes require server restart to take effect.
              </p>
              
              {/* Current Status */}
              <div style={styles.statusBox}>
                <div style={styles.statusRow}>
                  <span style={styles.statusLabel}>Current Database:</span>
                  <span style={dbStatus.connected ? styles.statusValueGood : styles.statusValueBad}>
                    {dbStatus.type.toUpperCase()} {dbStatus.connected ? '(Connected)' : '(Disconnected)'}
                  </span>
                </div>
                <div style={styles.statusRow}>
                  <span style={styles.statusLabel}>Database Size:</span>
                  <span style={styles.statusValue}>{dbStatus.size}</span>
                </div>
              </div>
              
              {/* Database Type Selection */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Database Type</label>
                <select
                  value={dbConfig.type}
                  onChange={(e) => setDbConfig({...dbConfig, type: e.target.value})}
                  style={styles.select}
                >
                  <option value="sqlite">SQLite (File-based, easiest for small deployments)</option>
                  <option value="postgresql">PostgreSQL (Recommended for production)</option>
                </select>
              </div>
              
              {dbConfig.type === 'sqlite' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>SQLite Database File Path</label>
                  <input
                    type="text"
                    value={dbConfig.sqlitePath}
                    onChange={(e) => setDbConfig({...dbConfig, sqlitePath: e.target.value})}
                    style={styles.input}
                    placeholder="./inventory.db"
                  />
                  <p style={styles.helpText}>Relative to application root directory</p>
                </div>
              )}
              
              {dbConfig.type === 'postgresql' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Host</label>
                    <input
                      type="text"
                      value={dbConfig.postgresHost}
                      onChange={(e) => setDbConfig({...dbConfig, postgresHost: e.target.value})}
                      style={styles.input}
                      placeholder="localhost"
                    />
                  </div>
                  <div style={styles.formRow}>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.label}>Port</label>
                      <input
                        type="number"
                        value={dbConfig.postgresPort}
                        onChange={(e) => setDbConfig({...dbConfig, postgresPort: parseInt(e.target.value)})}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.label}>Database Name</label>
                      <input
                        type="text"
                        value={dbConfig.postgresDatabase}
                        onChange={(e) => setDbConfig({...dbConfig, postgresDatabase: e.target.value})}
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Username</label>
                    <input
                      type="text"
                      value={dbConfig.postgresUsername}
                      onChange={(e) => setDbConfig({...dbConfig, postgresUsername: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Password</label>
                    <input
                      type="password"
                      value={dbConfig.postgresPassword}
                      onChange={(e) => setDbConfig({...dbConfig, postgresPassword: e.target.value})}
                      style={styles.input}
                      placeholder="Leave empty to keep current password"
                    />
                  </div>
                </>
              )}
              
              <button style={styles.saveButton} onClick={handleSaveDbConfig}>
                Save Database Configuration
              </button>
              <p style={styles.warningText}>
                <i className="fa-solid fa-triangle-exclamation"></i> Warning: Changing database type will require manual data migration. Please backup your data first.
              </p>
            </section>

            {/* Database Backup Section */}
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}><i className="fa-solid fa-floppy-disk"></i> Database Backup</h3>
                <button style={styles.addButton} onClick={handleCreateBackup}>
                  + Create Backup
                </button>
              </div>
              <p style={styles.sectionDescription}>
                Create and manage database backups. Backups are stored on the server and can be downloaded or restored.
              </p>
              
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Filename</th>
                      <th style={styles.th}>Size</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={styles.emptyCell}>
                          No backups available. Click "Create Backup" to create your first backup.
                        </td>
                      </tr>
                    ) : (
                      backups.map((backup) => (
                        <tr key={backup.filename} style={styles.tr}>
                          <td style={styles.td}>{backup.filename}</td>
                          <td style={styles.td}>{formatFileSize(backup.size)}</td>
                          <td style={styles.td}>{formatDate(backup.created_at)}</td>
                          <td style={styles.td}>
                            <button
                              style={styles.actionButton}
                              onClick={() => handleDownloadBackup(backup.filename)}
                            >
                              Download
                            </button>
                            <button
                              style={styles.warningButton}
                              onClick={() => handleRestoreBackup(backup.filename)}
                            >
                              Restore
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDeleteBackup(backup.filename)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* System Section */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}><i className="fa-solid fa-folder"></i> File Storage</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Attachment Storage Path</label>
                <input
                  type="text"
                  value={systemSettings.storagePath}
                  onChange={(e) => setSystemSettings({...systemSettings, storagePath: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Max File Size (MB)</label>
                <input
                  type="number"
                  value={systemSettings.maxFileSize}
                  onChange={(e) => setSystemSettings({...systemSettings, maxFileSize: parseInt(e.target.value)})}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Allowed File Types (comma-separated)</label>
                <input
                  type="text"
                  value={systemSettings.allowedFileTypes}
                  onChange={(e) => setSystemSettings({...systemSettings, allowedFileTypes: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <button style={styles.saveButton} onClick={handleSaveSystemSettings}>
                Save System Settings
              </button>
            </section>

            {/* UI Preferences Section */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>🎨 UI Preferences</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Theme</label>
                <select
                  value={uiPreferences.theme}
                  onChange={(e) => setUiPreferences({...uiPreferences, theme: e.target.value})}
                  style={styles.select}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Default Landing Page</label>
                <select
                  value={uiPreferences.defaultLandingPage}
                  onChange={(e) => setUiPreferences({...uiPreferences, defaultLandingPage: e.target.value})}
                  style={styles.select}
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="organizations">Organizations</option>
                  <option value="assets">Assets</option>
                  <option value="documentation">Documentation</option>
                </select>
              </div>
              
              <button style={styles.saveButton} onClick={handleSaveUiPreferences}>
                Save UI Preferences
              </button>
            </section>
          </div>
        )}

        {/* Organization Settings */}
        {activeTab === 'organization' && hasSelectedOrg() && (
          <div style={styles.settingsPanel}>
            {/* General Section */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}><i className="fa-solid fa-clipboard-list"></i> General</h3>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Organization Name</label>
                <input
                  type="text"
                  value={orgSettings.name}
                  onChange={(e) => setOrgSettings({...orgSettings, name: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={orgSettings.description}
                  onChange={(e) => setOrgSettings({...orgSettings, description: e.target.value})}
                  style={styles.textarea}
                  rows={3}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Default Contact Email</label>
                <input
                  type="email"
                  value={orgSettings.defaultContactEmail}
                  onChange={(e) => setOrgSettings({...orgSettings, defaultContactEmail: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Default Contact Phone</label>
                <input
                  type="tel"
                  value={orgSettings.defaultContactPhone}
                  onChange={(e) => setOrgSettings({...orgSettings, defaultContactPhone: e.target.value})}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Default Site Preferences</label>
                <textarea
                  value={orgSettings.defaultSitePreferences}
                  onChange={(e) => setOrgSettings({...orgSettings, defaultSitePreferences: e.target.value})}
                  style={styles.textarea}
                  rows={2}
                  placeholder="Default settings for new sites..."
                />
              </div>
              
              <button style={styles.saveButton} onClick={handleSaveOrgSettings}>
                Save Organization Settings
              </button>
            </section>

            {/* Service Protocols Section */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}><i className="fa-solid fa-globe"></i> Service Protocols</h3>
              <p style={styles.sectionDescription}>
                Manage allowed protocols when creating services. These are the options available in the protocol dropdown.
              </p>
              
              <div style={styles.protocolList}>
                {serviceProtocols.map((protocol) => (
                  <div key={protocol} style={styles.protocolTag}>
                    <span>{protocol}</span>
                    <button
                      style={styles.removeProtocolButton}
                      onClick={() => handleRemoveProtocol(protocol)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <div style={styles.addProtocolForm}>
                <input
                  type="text"
                  value={newProtocol}
                  onChange={(e) => setNewProtocol(e.target.value)}
                  placeholder="New protocol (e.g., ftp)"
                  style={styles.input}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddProtocol()}
                />
                <button style={styles.addButton} onClick={handleAddProtocol}>
                  Add Protocol
                </button>
              </div>
            </section>

            {/* Audit Log Section */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>🧾 Audit Log</h3>
              <p style={styles.sectionDescription}>
                Read-only log of actions performed in this organization.
              </p>
              
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Action</th>
                      <th style={styles.th}>Target</th>
                      <th style={styles.th}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={styles.emptyCell}>
                          No audit logs available
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} style={styles.tr}>
                          <td style={styles.td}>{log.user_email || 'System'}</td>
                          <td style={styles.td}>
                            <span style={styles.actionBadge}>{log.action}</span>
                          </td>
                          <td style={styles.td}>{log.target_type}: {log.target_name || log.target_id}</td>
                          <td style={styles.td}>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Create User Modal */}
        {showUserModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>Create New User</h3>
              <form onSubmit={handleCreateUser}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>First Name</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Last Name</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.modalActions}>
                  <button type="button" style={styles.cancelButton} onClick={() => setShowUserModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.saveButton}>
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {showUserDetailModal && selectedUser && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>
                Manage User: {selectedUser.first_name} {selectedUser.last_name}
              </h3>
              <p style={styles.modalSubtitle}>{selectedUser.email}</p>
              
              <div style={styles.section}>
                <h4 style={styles.subsectionTitle}>Organization Memberships</h4>
                {selectedUser.organizations?.length === 0 ? (
                  <p style={styles.emptyText}>User is not assigned to any organizations.</p>
                ) : (
                  <div style={styles.membershipList}>
                    {selectedUser.organizations?.map((membership) => (
                      <div key={membership.id} style={styles.membershipItem}>
                        <div>
                          <strong>{membership.organization_name}</strong>
                          <span style={styles.roleBadge}>{membership.role}</span>
                        </div>
                        <button
                          style={styles.removeButton}
                          onClick={() => handleRemoveUserFromOrg(membership.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={styles.section}>
                <h4 style={styles.subsectionTitle}>Add to Organization</h4>
                <div style={styles.addMembershipForm}>
                  <select
                    id="orgSelect"
                    style={styles.select}
                    defaultValue=""
                  >
                    <option value="">Select organization...</option>
                    {organizations
                      .filter(org => !selectedUser.organizations?.some(m => m.organization_id === org.id))
                      .map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                  </select>
                  <select
                    id="roleSelect"
                    style={styles.select}
                    defaultValue="technician"
                  >
                    <option value="orgadmin">Org Admin</option>
                    <option value="technician">Technician</option>
                    <option value="readonly">Read-Only</option>
                  </select>
                  <button
                    style={styles.addButton}
                    onClick={() => {
                      const orgId = document.getElementById('orgSelect').value;
                      const role = document.getElementById('roleSelect').value;
                      if (orgId) {
                        handleAddUserToOrg(selectedUser.id, orgId, role);
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div style={styles.modalActions}>
                <button style={styles.cancelButton} onClick={() => setShowUserDetailModal(false)}>
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
  container: {
    maxWidth: '1200px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '16px',
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: '#f7fafc',
    color: '#4a5568',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  activeTab: {
    padding: '12px 24px',
    border: 'none',
    backgroundColor: '#3182ce',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  disabledNote: {
    fontSize: '12px',
    color: '#a0aec0',
    fontWeight: 'normal',
  },
  messageToast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#48bb78',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease',
  },
  settingsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '16px',
    marginTop: '8px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #e2e8f0',
    color: '#4a5568',
    fontWeight: '600',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px',
    color: '#2d3748',
  },
  activeBadge: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  inactiveBadge: {
    backgroundColor: '#fed7d7',
    color: '#742a2a',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  actionButton: {
    padding: '4px 12px',
    backgroundColor: '#3182ce',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '8px',
  },
  warningButton: {
    padding: '4px 12px',
    backgroundColor: '#ed8936',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '8px',
  },
  deleteButton: {
    padding: '4px 12px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  disableButton: {
    padding: '4px 12px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  enableButton: {
    padding: '4px 12px',
    backgroundColor: '#48bb78',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroupHalf: {
    flex: 1,
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
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#3182ce',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#48bb78',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  protocolList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  protocolTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#e2e8f0',
    borderRadius: '20px',
    fontSize: '14px',
  },
  removeProtocolButton: {
    background: 'none',
    border: 'none',
    color: '#e53e3e',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '0',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProtocolForm: {
    display: 'flex',
    gap: '8px',
  },
  actionBadge: {
    backgroundColor: '#bee3f8',
    color: '#2a4365',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  modalOverlay: {
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
  modal: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '24px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '12px',
  },
  membershipList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  membershipItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f7fafc',
    borderRadius: '6px',
  },
  roleBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: '#bee3f8',
    color: '#2a4365',
    borderRadius: '4px',
    fontSize: '12px',
    textTransform: 'lowercase',
  },
  removeButton: {
    padding: '4px 12px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  addMembershipForm: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  emptyText: {
    color: '#a0aec0',
    fontStyle: 'italic',
    fontSize: '14px',
  },
  statusBox: {
    backgroundColor: '#f7fafc',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: '14px',
    color: '#2d3748',
    fontWeight: '600',
  },
  statusValueGood: {
    fontSize: '14px',
    color: '#48bb78',
    fontWeight: '600',
  },
  statusValueBad: {
    fontSize: '14px',
    color: '#e53e3e',
    fontWeight: '600',
  },
  helpText: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '4px',
  },
  warningText: {
    fontSize: '13px',
    color: '#ed8936',
    marginTop: '12px',
    fontWeight: '500',
  },
};
