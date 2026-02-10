import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../../../components/Layout';
import DataTable from '../../../../../components/DataTable';
import { api, API_URL } from '../../../../../lib/api';
import { copyToClipboard } from '../../../../../lib/clipboard';
import { useApp } from '../../../../../context/AppContext';

export default function Files() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [files, setFiles] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
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
      
      const [filesData, assetsData] = await Promise.all([
        api.getFiles({ organization_id: orgId, site_id: siteId }),
        api.getAssets({ organization_id: orgId, site_id: siteId }),
      ]);
      
      setFiles(filesData);
      setAssets(assetsData);
    } catch (err) {
      setError('Failed to load files: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file, metadata) {
    try {
      setUploading(true);
      await api.uploadFile(file, {
        ...metadata,
        organization_id: orgId,
        site_id: siteId,
      });
      await loadData();
    } catch (err) {
      const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError('Failed to upload file: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteFile(id);
      await loadData();
    } catch (err) {
      setError('Failed to delete file: ' + err.message);
    }
  }

  async function handleDownload(file) {
    try {
      await api.downloadFile(file.id, file.name);
    } catch (err) {
      setError('Failed to download file: ' + err.message);
    }
  }

  async function handleView(file) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/files/${file.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setError('Failed to view file: ' + err.message);
    }
  }

  async function handleToggleShare(file, event) {
    // Prevent event from bubbling up to the row click
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    try {
      const response = await api.request(`/files/${file.id}/share?share=${!file.is_public}`, {
        method: 'POST'
      });
      await loadData();

      // If sharing was enabled, show the share modal with the link
      if (!file.is_public && response.share_url) {
        const fullUrl = `${window.location.origin}${response.share_url}`;
        setShareModal({
          name: file.name,
          url: fullUrl,
        });
      }
    } catch (err) {
      setError('Failed to toggle sharing: ' + err.message);
    }
  }

  async function handleCopyLink(url) {
    if (!url) return;
    try {
      await copyToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Clipboard copy failed. Please copy the link manually.');
    }
  }

  function closeShareModal() {
    setShareModal(null);
    setCopied(false);
  }

  const columns = [
    { key: 'name', label: 'File Name' },
    { key: 'asset_name', label: 'Attached To' },
    { key: 'file_size', label: 'Size' },
    { key: 'mime_type', label: 'Type' },
    { 
      key: 'is_public', 
      label: 'Shared',
      render: (_, item) => {
        if (item.is_public && item.share_token) {
          const shareUrl = `${window.location.origin}/shared/file/${item.share_token}`;
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
    { key: 'created_at', label: 'Uploaded' },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (_, item) => {
        const isViewable = item.mime_type.startsWith('image/') || 
                          item.mime_type === 'application/pdf' ||
                          item.mime_type.startsWith('text/');
        return (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isViewable && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleView(item);
                }}
                style={styles.actionButton}
                title="View in browser"
              >
                <i className="fa-solid fa-eye"></i>
              </button>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDownload(item);
              }}
              style={styles.actionButton}
              title="Download"
            >
              <i className="fa-solid fa-download"></i>
            </button>
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
        );
      }
    },
  ];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAssetName = (assetId) => {
    if (!assetId) return '-';
    const asset = assets.find(a => a.id === assetId);
    return asset ? asset.name : 'Unknown';
  };

  // CreateForm Component - defined inside Files to have access to assets, formatFileSize, etc.
  const CreateForm = ({ formData, setFormData }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setSelectedFile(file);
        // Auto-fill the name field with the original filename (without extension)
        const fileName = file.name;
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        setFormData({ ...formData, file: file, name: nameWithoutExt || fileName });
      }
    };

    return (
      <>
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Select File *</label>
          <input
            type="file"
            onChange={handleFileChange}
            style={formStyles.fileInput}
            required
          />
          {selectedFile && (
            <div style={formStyles.fileInfo}>
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </div>
          )}
        </div>

        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>File Name *</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={formStyles.input}
            placeholder="Enter a friendly name for this file"
            required
          />
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Attach to Asset (Optional)</label>
          <select
            value={formData.asset_id || ''}
            onChange={(e) => setFormData({ ...formData, asset_id: e.target.value || null })}
            style={formStyles.input}
          >
            <option value="">-- No Asset --</option>
            {assets.map(asset => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.asset_type})
              </option>
            ))}
          </select>
        </div>
        
        <div style={formStyles.formGroup}>
          <label style={formStyles.label}>Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={formStyles.input}
            rows="2"
            placeholder="Optional description of the file"
          />
        </div>
      </>
    );
  };

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
          <h3 style={styles.title}>Files & Attachments</h3>
          <p style={styles.subtitle}>
            Upload and manage files for {selectedSite?.name} in {selectedOrg?.name}
          </p>
        </div>

        {uploading && (
          <div style={styles.uploading}>
            Uploading file... Please wait.
          </div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : (
          <DataTable
            columns={columns}
            data={files.map(f => ({
              ...f,
              asset_name: getAssetName(f.asset_id),
              file_size: formatFileSize(f.file_size),
              created_at: new Date(f.created_at).toLocaleDateString(),
            }))}
            onCreate={async (data) => {
              if (data.file && data.name) {
                await handleFileUpload(data.file, {
                  asset_id: data.asset_id,
                  description: data.description,
                  name: data.name,
                });
              }
            }}
            onEdit={null} // Files can't be edited, only deleted
            onDelete={handleDelete}
            CreateForm={CreateForm}
            title="File"
            createButtonText="+ Upload"
          />
        )}

        <div style={styles.info}>
          <h4 style={styles.infoTitle}>Supported File Types</h4>
          <p style={styles.infoText}>
            You can upload configuration files, SQL backups, ISOs, documentation, images, 
            and any other files related to your IT infrastructure. Files are stored securely 
            and can be attached to specific assets for easy organization.
          </p>
        </div>

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
                  "{shareModal.name}" is now publicly shareable. Anyone with this link can download the file:
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
  uploading: {
    backgroundColor: '#bee3f8',
    color: '#2c5282',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  info: {
    marginTop: '32px',
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '8px',
  },
  infoText: {
    fontSize: '14px',
    color: '#718096',
    lineHeight: '1.5',
  },
  actionButton: {
    padding: '6px 10px',
    backgroundColor: '#4299e1',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
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
  },
  fileInput: {
    width: '100%',
    padding: '10px 0',
    fontSize: '14px',
  },
  fileInfo: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#4a5568',
    fontStyle: 'italic',
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
