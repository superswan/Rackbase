import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../../../components/Layout';
import MarkdownEditorSimple from '../../../../../../components/MarkdownEditorSimple';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { api } from '../../../../../../lib/api';
import { copyToClipboard } from '../../../../../../lib/clipboard';
import { useApp } from '../../../../../../context/AppContext';

export default function DocumentView() {
  const router = useRouter();
  const { orgId, siteId, docId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(() => {
    // Check if we're in edit mode from URL query parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('mode') === 'edit';
    }
    return false;
  });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgId && siteId && docId) {
      loadData();
    }
  }, [orgId, siteId, docId]);

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
      
      const docData = await api.getDocumentationItem(docId);
      setDoc(docData);
      setEditForm(docData);
    } catch (err) {
      setError('Failed to load document: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Apply syntax highlighting and copy buttons after content is rendered
  useEffect(() => {
    if (!isEditing && doc?.content) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        // Highlight code
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
        
        // Add click handlers to copy buttons
        document.querySelectorAll('.copy-code-btn').forEach((btn) => {
          btn.addEventListener('click', handleCopyCode);
        });
      }, 100);
    }
  }, [doc, isEditing]);

  // Copy code to clipboard
  const handleCopyCode = async (e) => {
    const button = e.currentTarget || e.target;
    const codeId = button.getAttribute('data-code-id');
    const codeElement = document.getElementById(`code-${codeId}`);
    if (!codeElement) return;

    const code = codeElement.textContent;
    try {
      await copyToClipboard(code);
      const originalText = button.innerHTML;
      button.innerHTML = '<i className="fa-solid fa-check"></i> Copied!';
      button.style.backgroundColor = '#48bb78';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = '#4a5568';
      }, 2000);
    } catch (err) {
      setError('Clipboard copy failed. Please copy the code manually.');
    }
  };

  async function handleSave() {
    try {
      setSaving(true);
      await api.updateDocumentation(docId, editForm);
      setIsEditing(false);
      await loadData();
    } catch (err) {
      setError('Failed to save document: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout requireOrg requireSite>
        <div style={styles.loading}>Loading document...</div>
      </Layout>
    );
  }

  if (!doc) {
    return (
      <Layout requireOrg requireSite>
        <div style={styles.error}>
          Document not found
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
              <span style={styles.docIcon}><i className="fa-solid fa-file-lines"></i></span>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  style={styles.titleInput}
                />
              ) : (
                doc.title
              )}
            </h2>
            <div style={styles.breadcrumbs}>
              <Link href={`/organizations/${orgId}/sites/${siteId}/documentation`} style={styles.breadcrumbLink}>
                ← Back to Documentation
              </Link>
            </div>
          </div>
          <div style={styles.headerRight}>
            {isEditing ? (
              <>
                <button onClick={handleSave} style={styles.saveButton} disabled={saving}>
                  {saving ? 'Saving...' : <><i className="fa-solid fa-floppy-disk"></i> Save</>}
                </button>
                <button onClick={() => {setIsEditing(false); setEditForm(doc);}} style={styles.cancelButton}>
                  <i className="fa-solid fa-xmark"></i> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} style={styles.editButton}>
                <i className="fa-solid fa-pen-to-square"></i> Edit
              </button>
            )}
          </div>
        </div>

        {/* Metadata Bar */}
        <div style={styles.metadataBar}>
          {isEditing ? (
            <>
              <div style={styles.metadataItem}>
                <label>Category:</label>
                <select 
                  value={editForm.category || 'general'} 
                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                  style={styles.metadataSelect}
                >
                  <option value="general">General</option>
                  <option value="procedure">Procedure</option>
                  <option value="policy">Policy</option>
                  <option value="technical">Technical</option>
                  <option value="configuration">Configuration</option>
                  <option value="troubleshooting">Troubleshooting</option>
                  <option value="network">Network</option>
                </select>
              </div>
              <div style={styles.metadataItem}>
                <label>Version:</label>
                <input 
                  type="text" 
                  value={editForm.version || '1.0'} 
                  onChange={(e) => setEditForm({...editForm, version: e.target.value})}
                  style={styles.metadataInput}
                />
              </div>
            </>
          ) : (
            <>
              <div style={styles.metadataItem}>
                <span style={styles.metadataLabel}>Category:</span>
                <span style={styles.metadataValue}>{doc.category}</span>
              </div>
              <div style={styles.metadataItem}>
                <span style={styles.metadataLabel}>Version:</span>
                <span style={styles.metadataValue}>{doc.version || '1.0'}</span>
              </div>
              <div style={styles.metadataItem}>
                <span style={styles.metadataLabel}>Updated:</span>
                <span style={styles.metadataValue}>{new Date(doc.updated_at).toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div style={styles.editorArea}>
          {isEditing ? (
            <div style={styles.editContainer}>
              <div style={styles.editSection}>
                <label style={styles.sectionLabel}>Summary</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  style={styles.summaryTextarea}
                  rows="2"
                  placeholder="Brief summary or description..."
                />
              </div>
              
              <div style={styles.editSection}>
                <MarkdownEditorSimple
                  value={editForm.content || ''}
                  onChange={(value) => setEditForm({...editForm, content: value})}
                  height={500}
                />
              </div>
            </div>
          ) : (
            <div style={styles.viewContainer}>
              {doc.description && (
                <div style={styles.summaryBox}>
                  <h4 style={styles.summaryTitle}>Summary</h4>
                  <p style={styles.summaryText}>{doc.description}</p>
                </div>
              )}
              
              <div style={styles.contentBox}>
                <div 
                  style={styles.markdownContent}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content || '') }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Simple markdown renderer with better formatting
function renderMarkdown(text) {
  if (!text) return '<p style="color: #718096; font-style: italic;">No content</p>';
  
  // Split into lines for processing
  const lines = text.split('\n');
  let html = [];
  let inList = false;
  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const code = codeBlockContent.join('\n');
        const langClass = codeBlockLang ? `language-${codeBlockLang}` : '';
        const codeId = `cb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        html.push(`<div style="position: relative; margin: 16px 0;"><button class="copy-code-btn" data-code-id="${codeId}" style="position: absolute; top: 8px; right: 8px; background: #4a5568; color: #fff; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; z-index: 10;">Copy</button><pre style="background: #1e1e1e; color: #d4d4d4; padding: 0; border-radius: 6px; overflow-x: auto; margin: 0;"><code id="code-${codeId}" class="hljs ${langClass}" style="display: block; padding: 16px; padding-top: 40px; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px;">${escapeHtml(code)}</code></pre></div>`);
        codeBlockContent = [];
        inCodeBlock = false;
        codeBlockLang = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLang = line.replace(/```/, '').trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Empty line
    if (line.trim() === '') {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      continue;
    }
    
    // Headers
    if (line.startsWith('# ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h1 style="margin: 32px 0 16px; color: #2d3748; font-size: 30px; font-weight: 700; border-bottom: 3px solid #e2e8f0; padding-bottom: 10px;">${renderInline(line.substring(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h2 style="margin: 28px 0 14px; color: #2d3748; font-size: 26px; font-weight: 600; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">${renderInline(line.substring(3))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h3 style="margin: 24px 0 12px; color: #2d3748; font-size: 22px; font-weight: 600;">${renderInline(line.substring(4))}</h3>`);
      continue;
    }
    
    // List items
    if (line.match(/^\*\s+/) || line.match(/^-\s+/)) {
      if (!inList) {
        html.push('<ul style="margin: 16px 0; padding-left: 24px; list-style-type: disc;">');
        inList = true;
      }
      const content = line.replace(/^\*\s+/, '').replace(/^-\s+/, '');
      html.push(`<li style="margin-bottom: 8px; line-height: 1.6;">${renderInline(content)}</li>`);
      continue;
    }
    
    // End list if we hit a non-list line
    if (inList && !line.match(/^\*\s+/) && !line.match(/^-\s+/)) {
      html.push('</ul>');
      inList = false;
    }
    
    // Images (standalone)
    if (line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)) {
      const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      html.push(`<img src="${match[2]}" alt="${match[1]}" style="max-width: 100%; height: auto; margin: 16px 0; display: block;" />`);
      continue;
    }
    
    // Regular paragraph
    html.push(`<p style="margin: 16px 0; line-height: 1.6;">${renderInline(line)}</p>`);
  }
  
  // Close any open list
  if (inList) {
    html.push('</ul>');
  }
  
  // Close any open code block
  if (inCodeBlock) {
    const code = codeBlockContent.join('\n');
    const langClass = codeBlockLang ? `language-${codeBlockLang}` : '';
    const codeId = `cb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    html.push(`<div style="position: relative; margin: 16px 0;"><button class="copy-code-btn" data-code-id="${codeId}" style="position: absolute; top: 8px; right: 8px; background: #4a5568; color: #fff; border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px; cursor: pointer; z-index: 10;">Copy</button><pre style="background: #1e1e1e; color: #d4d4d4; padding: 0; border-radius: 6px; overflow-x: auto; margin: 0;"><code id="code-${codeId}" class="hljs ${langClass}" style="display: block; padding: 16px; padding-top: 40px; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px;">${escapeHtml(code)}</code></pre></div>`);
  }
  
  return html.join('\n');
}

// Render inline elements (bold, italic, links, images, code)
function renderInline(text) {
  let html = text;
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background: #f7fafc; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 14px; color: #e53e3e;">$1</code>');
  
  // Bold (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 700;">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong style="font-weight: 700;">$1</strong>');
  
  // Italic (*text*)
  html = html.replace(/\*([^*]+)\*/g, '<em style="font-style: italic;">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em style="font-style: italic;">$1</em>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 8px 0;" />');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #4299e1; text-decoration: none; font-weight: 500;">$1</a>');
  
  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const styles = {
  container: {
    maxWidth: '1200px',
    height: 'calc(100vh - 200px)',
    display: 'flex',
    flexDirection: 'column',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
    fontSize: '18px',
  },
  error: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
    padding: '20px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '16px',
  },
  errorBanner: {
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
  },
  backButton: {
    marginLeft: '20px',
    padding: '8px 16px',
    backgroundColor: '#e2e8f0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexShrink: 0,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  titleInput: {
    fontSize: '28px',
    fontWeight: '600',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    width: '500px',
  },
  docIcon: {
    fontSize: '32px',
  },
  breadcrumbs: {
    fontSize: '14px',
  },
  breadcrumbLink: {
    color: '#4299e1',
    textDecoration: 'none',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#ed8936',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#48bb78',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  metadataBar: {
    display: 'flex',
    gap: '24px',
    padding: '12px 16px',
    backgroundColor: '#f7fafc',
    borderRadius: '6px',
    marginBottom: '16px',
    flexShrink: 0,
  },
  metadataItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  metadataLabel: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: '14px',
    color: '#2d3748',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metadataSelect: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: '#fff',
  },
  metadataInput: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
    width: '80px',
  },
  editorArea: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  editContainer: {
    padding: '24px',
    overflow: 'auto',
    flex: 1,
  },
  editSection: {
    marginBottom: '24px',
  },
  sectionLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '8px',
  },
  summaryTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  editorWrapper: {
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
  },
  viewContainer: {
    padding: '32px',
    overflow: 'auto',
    flex: 1,
  },
  summaryBox: {
    backgroundColor: '#f0fff4',
    border: '1px solid #9ae6b4',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#22543d',
    margin: '0 0 8px 0',
  },
  summaryText: {
    fontSize: '14px',
    color: '#276749',
    lineHeight: '1.6',
    margin: 0,
  },
  contentBox: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '24px',
  },
  markdownContent: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#2d3748',
  },
};
