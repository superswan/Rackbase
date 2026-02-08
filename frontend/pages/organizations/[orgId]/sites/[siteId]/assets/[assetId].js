import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../../../components/Layout';
import { api } from '../../../../../../lib/api';
import { useApp } from '../../../../../../context/AppContext';

export default function AssetView() {
  const router = useRouter();
  const { orgId, siteId, assetId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [asset, setAsset] = useState(null);
  const [associatedData, setAssociatedData] = useState({
    files: [],
    credentials: [],
    services: [],
    people: [],
    networks: [],
    software: [],
    childVms: [],
    parentAsset: null,
    allAssets: [],
    allNetworks: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [mappingNetwork, setMappingNetwork] = useState(false);
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [networkIpAddress, setNetworkIpAddress] = useState('');
  
  // Service editing state
  const [editingService, setEditingService] = useState(null);
  const [serviceEditForm, setServiceEditForm] = useState({});

  useEffect(() => {
    if (orgId && siteId && assetId) {
      loadData();
      
      // Check for tab query parameter
      if (router.query.tab) {
        setActiveTab(router.query.tab);
      }
    }
  }, [orgId, siteId, assetId, router.query.tab]);

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
      
      const assetData = await api.get(`/assets/${assetId}/details`);
      setAsset(assetData.asset);
      setEditForm(assetData.asset);
      
      // Load all assets for VM parent selection and all networks for mapping
      const [allAssets, allNetworks] = await Promise.all([
        api.getAssets({ organization_id: orgId, site_id: siteId }),
        api.getNetworks({ organization_id: orgId, site_id: siteId }),
      ]);
      
      setAssociatedData({
        files: assetData.files || [],
        credentials: assetData.credentials || [],
        services: assetData.services || [],
        people: assetData.people || [],
        networks: assetData.networks || [],
        software: assetData.software || [],
        childVms: assetData.child_vms || [],
        parentAsset: assetData.parent_asset || null,
        allAssets: allAssets.filter(a => a.id !== assetId),
        allNetworks: allNetworks,
      });
    } catch (err) {
      setError('Failed to load asset: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await api.updateAsset(assetId, editForm);
      setIsEditing(false);
      await loadData();
    } catch (err) {
      setError('Failed to save asset: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMapNetwork() {
    try {
      await api.post('/asset-networks', {
        asset_id: assetId,
        network_id: selectedNetworkId,
        ip_address: networkIpAddress || null,
      });
      setMappingNetwork(false);
      setSelectedNetworkId('');
      setNetworkIpAddress('');
      await loadData();
    } catch (err) {
      setError('Failed to map network: ' + err.message);
    }
  }

  async function handleUnmapNetwork(networkId) {
    try {
      await api.delete(`/asset-networks/${assetId}/${networkId}`);
      await loadData();
    } catch (err) {
      setError('Failed to unmap network: ' + err.message);
    }
  }

  // Service editing functions
  const openServiceEdit = (service) => {
    setEditingService(service);
    setServiceEditForm({ ...service });
  };

  const closeServiceEdit = () => {
    setEditingService(null);
    setServiceEditForm({});
  };

  const handleSaveService = async () => {
    try {
      await api.updateService(editingService.id, serviceEditForm);
      closeServiceEdit();
      await loadData();
    } catch (err) {
      setError('Failed to update service: ' + err.message);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await api.deleteService(serviceId);
        await loadData();
      } catch (err) {
        setError('Failed to delete service: ' + err.message);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#48bb78',
      inactive: '#718096',
      maintenance: '#ed8936',
      retired: '#e53e3e',
    };
    return colors[status] || '#718096';
  };

  const isVm = asset?.asset_type === 'vm';
  const isHypervisor = asset?.asset_type === 'hypervisor';
  const hasChildVms = associatedData.childVms.length > 0;

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

  if (loading) {
    return (
      <Layout requireOrg requireSite>
        <div style={styles.loading}>Loading asset details...</div>
      </Layout>
    );
  }

  if (!asset) {
    return (
      <Layout requireOrg requireSite>
        <div style={styles.error}>
          Asset not found
          <button onClick={() => router.back()} style={styles.backButton}>
            ← Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout requireOrg requireSite>
      <div style={styles.container}>
        {error && (
          <div style={styles.errorBanner}>
            {error}
            <button onClick={() => setError('')} style={styles.closeError}>×</button>
          </div>
        )}

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 style={styles.title}>
              <span style={styles.assetIcon}><i className={isVm ? 'fa-solid fa-desktop' : 'fa-solid fa-server'}></i></span>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={styles.titleInput}
                />
              ) : (
                asset.name
              )}
            </h2>
            <div style={styles.breadcrumbs}>
              <Link href={`/organizations/${orgId}/sites/${siteId}/assets`} style={styles.breadcrumbLink}>
                ← Back to Assets
              </Link>
            </div>
          </div>
          <div style={styles.headerRight}>
            {isEditing ? (
              <>
                <button onClick={handleSave} style={styles.saveButton} disabled={saving}>
                  {saving ? 'Saving...' : <><i className="fa-solid fa-floppy-disk"></i> Save</>}
                </button>
                <button onClick={() => {setIsEditing(false); setEditForm(asset);}} style={styles.cancelButton}>
                  <i className="fa-solid fa-xmark"></i> Cancel
                </button>
              </>
            ) : (
              <>
                <span style={{...styles.statusBadge, backgroundColor: getStatusColor(asset.status)}}>
                  {asset.status}
                </span>
                <button onClick={() => setIsEditing(true)} style={styles.editButton}>
                  <i className="fa-solid fa-pen-to-square"></i> Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button style={activeTab === 'overview' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('overview')}>
            Overview
          </button>
          <button style={activeTab === 'services' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('services')}>
            Services ({associatedData.services.length})
          </button>
          <button style={activeTab === 'credentials' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('credentials')}>
            Credentials ({associatedData.credentials.length})
          </button>
          <button style={activeTab === 'files' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('files')}>
            Files ({associatedData.files.length})
          </button>
          <button style={activeTab === 'networks' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('networks')}>
            Networks ({associatedData.networks.length})
          </button>
          {(isHypervisor || hasChildVms) && (
            <button style={activeTab === 'vms' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('vms')}>
              VMs ({associatedData.childVms.length})
            </button>
          )}
          <button style={activeTab === 'people' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('people')}>
            People ({associatedData.people.length})
          </button>
          <button style={activeTab === 'software' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('software')}>
            Software ({associatedData.software.length})
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'overview' && (
            <div style={styles.overview}>
              <div style={styles.infoCard}>
                <div style={styles.sectionHeader}>
                  <h3 style={styles.sectionTitle}>Asset Information</h3>
                </div>
                
                {isVm && associatedData.parentAsset && (
                  <div style={styles.parentBanner}>
                    <span>Hosted on: </span>
                    <Link href={`/organizations/${orgId}/sites/${siteId}/assets/${associatedData.parentAsset.id}`} style={styles.parentLink}>
                      {associatedData.parentAsset.name} ({associatedData.parentAsset.asset_type})
                    </Link>
                  </div>
                )}

                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Name</label>
                    {isEditing ? (
                      <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} style={styles.editInput} />
                    ) : (
                      <span style={styles.infoValue}>{asset.name}</span>
                    )}
                  </div>
                  
                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Type</label>
                    {isEditing ? (
                      <select value={editForm.asset_type || ''} onChange={(e) => setEditForm({...editForm, asset_type: e.target.value})} style={styles.editSelect}>
                        {getFilteredAssetTypes(editForm.asset_category).map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={styles.infoValue}>{asset.asset_type}</span>
                    )}
                  </div>
                  
                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Category</label>
                    {isEditing ? (
                      <select value={editForm.asset_category || ''} onChange={(e) => setEditForm({...editForm, asset_category: e.target.value, asset_type: ''})} style={styles.editSelect}>
                        {assetCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={styles.infoValue}>{asset.asset_category}</span>
                    )}
                  </div>

                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>IP Address</label>
                    {isEditing ? (
                      <input type="text" value={editForm.ip_address || ''} onChange={(e) => setEditForm({...editForm, ip_address: e.target.value})} style={styles.editInput} />
                    ) : (
                      <span style={styles.infoValue}>{asset.ip_address || '-'}</span>
                    )}
                  </div>

                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>MAC Address</label>
                    {isEditing ? (
                      <input type="text" value={editForm.mac_address || ''} onChange={(e) => setEditForm({...editForm, mac_address: e.target.value})} style={styles.editInput} />
                    ) : (
                      <span style={styles.infoValue}>{asset.mac_address || '-'}</span>
                    )}
                  </div>

                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Manufacturer</label>
                    {isEditing ? (
                      <input type="text" value={editForm.manufacturer || ''} onChange={(e) => setEditForm({...editForm, manufacturer: e.target.value})} style={styles.editInput} />
                    ) : (
                      <span style={styles.infoValue}>{asset.manufacturer || '-'}</span>
                    )}
                  </div>

                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Model</label>
                    {isEditing ? (
                      <input type="text" value={editForm.model || ''} onChange={(e) => setEditForm({...editForm, model: e.target.value})} style={styles.editInput} />
                    ) : (
                      <span style={styles.infoValue}>{asset.model || '-'}</span>
                    )}
                  </div>

                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Serial Number</label>
                    {isEditing ? (
                      <input type="text" value={editForm.serial_number || ''} onChange={(e) => setEditForm({...editForm, serial_number: e.target.value})} style={styles.editInput} />
                    ) : (
                      <span style={styles.infoValue}>{asset.serial_number || '-'}</span>
                    )}
                  </div>

                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Operating System</label>
                    {isEditing ? (
                      <input type="text" value={editForm.operating_system || ''} onChange={(e) => setEditForm({...editForm, operating_system: e.target.value})} style={styles.editInput} />
                    ) : (
                      <span style={styles.infoValue}>{asset.operating_system || '-'}</span>
                    )}
                  </div>

                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Status</label>
                    {isEditing ? (
                      <select value={editForm.status || 'active'} onChange={(e) => setEditForm({...editForm, status: e.target.value})} style={styles.editSelect}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="retired">Retired</option>
                      </select>
                    ) : (
                      <span style={{...styles.infoValue, color: getStatusColor(asset.status)}}>{asset.status}</span>
                    )}
                  </div>

                  {isEditing && isVm && (
                    <div style={styles.infoItem}>
                      <label style={styles.infoLabel}>Parent (Hypervisor)</label>
                      <select 
                        value={editForm.parent_asset_id || ''} 
                        onChange={(e) => setEditForm({...editForm, parent_asset_id: e.target.value || null})}
                        style={styles.editSelect}
                      >
                        <option value="">None (Standalone)</option>
                        {associatedData.allAssets
                          .filter(a => a.asset_type === 'hypervisor')
                          .map(hypervisor => (
                            <option key={hypervisor.id} value={hypervisor.id}>
                              {hypervisor.name} ({hypervisor.ip_address || 'No IP'})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Last Seen</label>
                    <span style={styles.infoValue}>
                      {asset.last_seen ? new Date(asset.last_seen).toLocaleString() : '-'}
                    </span>
                  </div>
                  
                  <div style={styles.infoItem}>
                    <label style={styles.infoLabel}>Created</label>
                    <span style={styles.infoValue}>
                      {new Date(asset.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.infoLabel}>Description</label>
                      <textarea 
                        value={editForm.description || ''} 
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        style={styles.editTextarea}
                        rows="3"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.infoLabel}>Notes</label>
                      <textarea 
                        value={editForm.notes || ''} 
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                        style={styles.editTextarea}
                        rows="3"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {asset.description && (
                      <div style={styles.description}>
                        <label style={styles.infoLabel}>Description</label>
                        <p style={styles.descriptionText}>{asset.description}</p>
                      </div>
                    )}
                    {asset.notes && (
                      <div style={styles.description}>
                        <label style={styles.infoLabel}>Notes</label>
                        <p style={styles.descriptionText}>{asset.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Summary Cards */}
              <div style={styles.summaryGrid}>
              <SummaryCard icon="fa-gear" title="Services" count={associatedData.services.length} onClick={() => setActiveTab('services')} />
              <SummaryCard icon="fa-key" title="Credentials" count={associatedData.credentials.length} onClick={() => setActiveTab('credentials')} />
              <SummaryCard icon="fa-folder" title="Files" count={associatedData.files.length} onClick={() => setActiveTab('files')} />
              <SummaryCard icon="fa-globe" title="Networks" count={associatedData.networks.length} onClick={() => setActiveTab('networks')} />
              {isHypervisor && (
                <SummaryCard icon="fa-desktop" title="VMs" count={associatedData.childVms.length} onClick={() => setActiveTab('vms')} />
              )}
              <SummaryCard icon="fa-compact-disc" title="Software" count={associatedData.software.length} onClick={() => setActiveTab('software')} />
              </div>
            </div>
          )}

          {activeTab === 'networks' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Network Connections</h3>
                <button onClick={() => setMappingNetwork(true)} style={styles.addButton}>
                  + Map Network
                </button>
              </div>

              {mappingNetwork && (
                <div style={styles.mappingForm}>
                  <select 
                    value={selectedNetworkId} 
                    onChange={(e) => setSelectedNetworkId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Select Network...</option>
                    {associatedData.allNetworks
                      .filter(n => !associatedData.networks.some(an => an.id === n.id))
                      .map(network => (
                        <option key={network.id} value={network.id}>
                          {network.name} ({network.cidr})
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    placeholder="IP Address (optional)"
                    value={networkIpAddress}
                    onChange={(e) => setNetworkIpAddress(e.target.value)}
                    style={styles.input}
                  />
                  <button onClick={handleMapNetwork} style={styles.saveButton} disabled={!selectedNetworkId}>
                    Map
                  </button>
                  <button onClick={() => setMappingNetwork(false)} style={styles.cancelButton}>
                    Cancel
                  </button>
                </div>
              )}

              {associatedData.networks.length === 0 ? (
                <div style={styles.emptyState}>No network connections for this asset</div>
              ) : (
                <div style={styles.list}>
                  {associatedData.networks.map(network => (
                    <div key={network.id} style={styles.listItem}>
                      <div style={styles.listItemHeader}>
                        <span style={styles.listItemTitle}>{network.name}</span>
                        <span style={styles.listItemBadge}>{network.cidr}</span>
                        {network.vlan_id && <span style={styles.listItemBadge}>VLAN {network.vlan_id}</span>}
                      </div>
                      <div style={styles.listItemContent}>
                        <p style={styles.listItemDescription}>
                          IP: {network.ip_address || asset.ip_address || 'Not assigned'}
                        </p>
                        {network.gateway && <p style={styles.listItemDescription}>Gateway: {network.gateway}</p>}
                      </div>
                      <button 
                        onClick={() => handleUnmapNetwork(network.id)}
                        style={styles.removeButton}
                      >
                        Unmap
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vms' && (isHypervisor || hasChildVms) && (
            <div style={styles.tabContent}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Virtual Machines</h3>
                <Link href={`/organizations/${orgId}/sites/${siteId}/assets`} style={styles.addButton}>
                  + Create VM
                </Link>
              </div>
              {associatedData.childVms.length === 0 ? (
                <div style={styles.emptyState}>No VMs hosted on this asset</div>
              ) : (
                <div style={styles.list}>
                  {associatedData.childVms.map(vm => (
                    <div key={vm.id} style={styles.listItem}>
                      <div style={styles.listItemHeader}>
                        <span style={styles.listItemTitle}>{vm.name}</span>
                        <span style={styles.listItemBadge}>{vm.asset_type}</span>
                        <span style={{...styles.statusBadge, backgroundColor: getStatusColor(vm.status), fontSize: '11px'}}>
                          {vm.status}
                        </span>
                      </div>
                      <div style={styles.listItemContent}>
                        <p style={styles.listItemDescription}>
                          IP: {vm.ip_address || 'No IP'} • OS: {vm.operating_system || 'Unknown'}
                        </p>
                      </div>
                      <Link href={`/organizations/${orgId}/sites/${siteId}/assets/${vm.id}`}>
                        <button style={styles.viewButton}>View VM</button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other tabs remain the same - services, credentials, files, people, software */}
          {activeTab === 'services' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Services</h3>
                <Link href={`/organizations/${orgId}/sites/${siteId}/services?asset_id=${assetId}`} style={styles.addButton}>+ Add Service</Link>
              </div>
              {associatedData.services.length === 0 ? (
                <div style={styles.emptyState}>No services associated with this asset</div>
              ) : (
                <div style={styles.list}>
                  {associatedData.services.map(service => (
                    <div key={service.id} style={styles.listItem}>
                      <div style={styles.listItemHeader}>
                        <span style={styles.listItemTitle}>{service.name}</span>
                        <span style={styles.listItemBadge}>{service.protocol}</span>
                        <span style={styles.listItemBadge}>Port {service.port}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                          <button onClick={() => openServiceEdit(service)} style={styles.editButtonSmall}>Edit</button>
                          <button onClick={() => handleDeleteService(service.id)} style={styles.deleteButtonSmall}>Delete</button>
                        </div>
                      </div>
                      {service.url && <a href={service.url} target="_blank" rel="noopener noreferrer" style={styles.link}>{service.url}</a>}
                      {service.description && <p style={styles.listItemDescription}>{service.description}</p>}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Service Edit Modal */}
              {editingService && (
                <div style={styles.modal}>
                  <div style={styles.modalContent}>
                    <h3 style={styles.modalTitle}>Edit Service</h3>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Name *</label>
                      <input
                        type="text"
                        value={serviceEditForm.name || ''}
                        onChange={(e) => setServiceEditForm({ ...serviceEditForm, name: e.target.value })}
                        style={styles.formInput}
                        required
                      />
                    </div>
                    
                    <div style={styles.formRow}>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Protocol *</label>
                        <select
                          value={serviceEditForm.protocol || ''}
                          onChange={(e) => setServiceEditForm({ ...serviceEditForm, protocol: e.target.value })}
                          style={styles.formInput}
                          required
                        >
                          <option value="http">HTTP</option>
                          <option value="https">HTTPS</option>
                          <option value="ssh">SSH</option>
                          <option value="rdp">RDP</option>
                          <option value="smb">SMB</option>
                          <option value="ftp">FTP</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Port *</label>
                        <input
                          type="number"
                          value={serviceEditForm.port || ''}
                          onChange={(e) => setServiceEditForm({ ...serviceEditForm, port: parseInt(e.target.value) })}
                          style={styles.formInput}
                          min="1"
                          max="65535"
                          required
                        />
                      </div>
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>URL</label>
                      <input
                        type="text"
                        value={serviceEditForm.url || ''}
                        onChange={(e) => setServiceEditForm({ ...serviceEditForm, url: e.target.value })}
                        style={styles.formInput}
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Authentication Type</label>
                      <select
                        value={serviceEditForm.authentication_type || 'none'}
                        onChange={(e) => setServiceEditForm({ ...serviceEditForm, authentication_type: e.target.value })}
                        style={styles.formInput}
                      >
                        <option value="none">None</option>
                        <option value="password">Password</option>
                        <option value="ldap">LDAP</option>
                        <option value="sso">SSO</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Description</label>
                      <input
                        type="text"
                        value={serviceEditForm.description || ''}
                        onChange={(e) => setServiceEditForm({ ...serviceEditForm, description: e.target.value })}
                        style={styles.formInput}
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Notes</label>
                      <textarea
                        value={serviceEditForm.notes || ''}
                        onChange={(e) => setServiceEditForm({ ...serviceEditForm, notes: e.target.value })}
                        style={styles.formTextarea}
                        rows="3"
                      />
                    </div>
                    
                    <div style={styles.modalActions}>
                      <button onClick={handleSaveService} style={styles.saveButton}>Save</button>
                      <button onClick={closeServiceEdit} style={styles.cancelButton}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'credentials' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Credentials</h3>
                <Link href={`/organizations/${orgId}/sites/${siteId}/credentials?asset_id=${assetId}`} style={styles.addButton}>+ Add Credential</Link>
              </div>
              {associatedData.credentials.length === 0 ? (
                <div style={styles.emptyState}>No credentials associated with this asset</div>
              ) : (
                <div style={styles.list}>
                  {associatedData.credentials.map(cred => (
                    <div key={cred.id} style={styles.listItem}>
                      <div style={styles.listItemHeader}>
                        <span style={styles.listItemTitle}>{cred.name}</span>
                        <span style={styles.listItemBadge}>{cred.credential_type}</span>
                      </div>
                      {cred.username && <p style={styles.listItemDescription}>Username: {cred.username}</p>}
                      {cred.description && <p style={styles.listItemDescription}>{cred.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Files & Attachments</h3>
                <Link href={`/organizations/${orgId}/sites/${siteId}/files?asset_id=${assetId}`} style={styles.addButton}>+ Upload File</Link>
              </div>
              {associatedData.files.length === 0 ? (
                <div style={styles.emptyState}>No files attached to this asset</div>
              ) : (
                <div style={styles.list}>
                  {associatedData.files.map(file => (
                    <div key={file.id} style={styles.listItem}>
                      <div style={styles.listItemHeader}>
                        <span style={styles.listItemTitle}>{file.name}</span>
                        <span style={styles.listItemBadge}>{formatFileSize(file.file_size)}</span>
                        <span style={styles.listItemBadge}>{file.mime_type}</span>
                      </div>
                      <p style={styles.listItemDescription}>Uploaded: {new Date(file.created_at).toLocaleDateString()}</p>
                      {file.description && <p style={styles.listItemDescription}>{file.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'people' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Associated People</h3>
                <Link href={`/organizations/${orgId}/sites/${siteId}/people`} style={styles.addButton}>Manage People</Link>
              </div>
              {associatedData.people.length === 0 ? (
                <div style={styles.emptyState}>No people associated with this asset</div>
              ) : (
                <div style={styles.list}>
                  {associatedData.people.map(person => (
                    <div key={person.id} style={styles.listItem}>
                      <div style={styles.listItemHeader}>
                        <span style={styles.listItemTitle}>{person.first_name} {person.last_name}</span>
                        {person.job_title && <span style={styles.listItemBadge}>{person.job_title}</span>}
                      </div>
                      {person.email && <p style={styles.listItemDescription}>{person.email}</p>}
                      {person.department && <p style={styles.listItemDescription}>{person.department}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'software' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Installed Software</h3>
                <Link href={`/organizations/${orgId}/sites/${siteId}/software`} style={styles.addButton}>Manage Software</Link>
              </div>
              {associatedData.software.length === 0 ? (
                <div style={styles.emptyState}>No software installed on this asset</div>
              ) : (
                <div style={styles.list}>
                  {associatedData.software.map(software => (
                    <div key={software.id} style={styles.listItem}>
                      <div style={styles.listItemHeader}>
                        <span style={styles.listItemTitle}>{software.name}</span>
                        {software.version && <span style={styles.listItemBadge}>v{software.version}</span>}
                      </div>
                      {software.vendor && <p style={styles.listItemDescription}>Vendor: {software.vendor}</p>}
                      {software.installation_path && <p style={styles.listItemDescription}>Path: {software.installation_path}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function SummaryCard({ icon, title, count, onClick }) {
  return (
    <button onClick={onClick} style={styles.summaryCard}>
      <span style={styles.summaryIcon}><i className={`fa-solid ${icon}`}></i></span>
      <div style={styles.summaryInfo}>
        <span style={styles.summaryCount}>{count}</span>
        <span style={styles.summaryTitle}>{title}</span>
      </div>
    </button>
  );
}

const styles = {
  container: { maxWidth: '1200px' },
  loading: { textAlign: 'center', padding: '40px', color: '#718096', fontSize: '18px' },
  error: { backgroundColor: '#fed7d7', color: '#c53030', padding: '20px', borderRadius: '6px', marginBottom: '20px', fontSize: '16px' },
  errorBanner: { backgroundColor: '#fed7d7', color: '#c53030', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeError: { background: 'none', border: 'none', color: '#c53030', cursor: 'pointer', fontSize: '20px' },
  backButton: { marginLeft: '20px', padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  headerLeft: { flex: 1 },
  headerRight: { display: 'flex', gap: '12px', alignItems: 'center' },
  title: { fontSize: '28px', fontWeight: '600', color: '#2d3748', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' },
  titleInput: { fontSize: '28px', fontWeight: '600', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', width: '400px' },
  assetIcon: { fontSize: '32px' },
  breadcrumbs: { fontSize: '14px' },
  breadcrumbLink: { color: '#4299e1', textDecoration: 'none' },
  statusBadge: { padding: '6px 12px', borderRadius: '4px', color: '#fff', fontSize: '14px', fontWeight: '500', textTransform: 'uppercase' },
  editButton: { padding: '8px 16px', backgroundColor: '#ed8936', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  saveButton: { padding: '8px 16px', backgroundColor: '#48bb78', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  cancelButton: { padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  tabs: { display: 'flex', gap: '4px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', flexWrap: 'wrap' },
  tab: { padding: '12px 20px', border: 'none', background: 'none', color: '#718096', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  activeTab: { padding: '12px 20px', border: 'none', background: 'none', color: '#3182ce', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: '2px solid #3182ce', marginBottom: '-2px' },
  content: { backgroundColor: '#fff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  overview: { display: 'flex', flexDirection: 'column', gap: '24px' },
  infoCard: { backgroundColor: '#f7fafc', padding: '20px', borderRadius: '8px' },
  parentBanner: { backgroundColor: '#bee3f8', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  parentLink: { color: '#2b6cb0', fontWeight: '600', textDecoration: 'none' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: '0 0 16px 0' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' },
  infoItem: { display: 'flex', flexDirection: 'column' },
  infoLabel: { fontSize: '12px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  infoValue: { fontSize: '16px', fontWeight: '500', color: '#2d3748' },
  editInput: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', width: '100%' },
  editSelect: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', width: '100%', backgroundColor: '#fff' },
  editTextarea: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', width: '100%', resize: 'vertical' },
  formGroup: { marginTop: '16px' },
  description: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' },
  descriptionText: { fontSize: '14px', color: '#4a5568', lineHeight: '1.6', margin: '8px 0 0 0' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  summaryCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' },
  summaryIcon: { fontSize: '24px' },
  summaryInfo: { display: 'flex', flexDirection: 'column' },
  summaryCount: { fontSize: '24px', fontWeight: '700', color: '#2d3748' },
  summaryTitle: { fontSize: '14px', color: '#718096' },
  tabContent: { minHeight: '300px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  addButton: { padding: '8px 16px', backgroundColor: '#48bb78', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#718096', fontStyle: 'italic', backgroundColor: '#f7fafc', borderRadius: '8px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  listItem: { padding: '16px', backgroundColor: '#f7fafc', borderRadius: '6px', border: '1px solid #e2e8f0' },
  listItemHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
  listItemTitle: { fontSize: '16px', fontWeight: '600', color: '#2d3748' },
  listItemBadge: { padding: '2px 8px', backgroundColor: '#bee3f8', color: '#2a4365', borderRadius: '4px', fontSize: '12px', fontWeight: '500' },
  listItemContent: { marginBottom: '8px' },
  listItemDescription: { fontSize: '14px', color: '#718096', margin: '4px 0 0 0' },
  link: { color: '#4299e1', fontSize: '14px', textDecoration: 'none', display: 'block', marginTop: '8px' },
  viewButton: { padding: '6px 12px', backgroundColor: '#4299e1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  removeButton: { padding: '6px 12px', backgroundColor: '#f56565', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  mappingForm: { display: 'flex', gap: '12px', marginBottom: '20px', padding: '16px', backgroundColor: '#f7fafc', borderRadius: '6px', alignItems: 'center', flexWrap: 'wrap' },
  select: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', minWidth: '200px' },
  input: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', minWidth: '150px' },
  editButtonSmall: { padding: '4px 8px', backgroundColor: '#ed8936', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  deleteButtonSmall: { padding: '4px 8px', backgroundColor: '#f56565', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#2d3748' },
  formGroup: { marginBottom: '16px' },
  formLabel: { display: 'block', fontSize: '14px', fontWeight: '500', color: '#4a5568', marginBottom: '6px' },
  formInput: { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
  formTextarea: { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  modalActions: { display: 'flex', gap: '12px', marginTop: '24px' },
};
