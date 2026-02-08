import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function SharedFile() {
  const router = useRouter();
  const { token } = router.query;
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileContent, setFileContent] = useState(null);

  useEffect(() => {
    if (token) {
      loadFile();
    }
  }, [token]);

  async function loadFile() {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088';
      
      // First, try to fetch file metadata by making a HEAD request or checking the file
      const response = await fetch(`${apiUrl}/shared/file/${token}`);
      
      if (!response.ok) {
        throw new Error('File not found or no longer available');
      }
      
      // Get file info from headers
      const contentType = response.headers.get('content-type');
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'shared-file';
      
      if (contentDisposition) {
        // Try filename*=UTF-8'' format first (RFC 5987)
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match) {
          filename = decodeURIComponent(utf8Match[1]);
        } else {
          // Try regular filename="..." format
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) {
            filename = match[1];
          }
        }
      }
      
      const blob = await response.blob();
      const fileSize = blob.size;
      
      setFileInfo({
        name: filename,
        mime_type: contentType,
        size: fileSize,
      });
      
      // For viewable files, load the content
      const isImage = contentType?.startsWith('image/');
      const isPDF = contentType === 'application/pdf';
      const isText = contentType?.startsWith('text/');
      
      if (isImage || isPDF || isText) {
        const url = URL.createObjectURL(blob);
        setFileContent({
          type: isImage ? 'image' : isPDF ? 'pdf' : 'text',
          url: url,
          blob: blob,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (fileContent?.url) {
      const a = document.createElement('a');
      a.href = fileContent.url;
      a.download = fileInfo?.name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Direct download via API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088';
      window.location.href = `${apiUrl}/shared/file/${token}`;
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <Head>
          <title>Loading File...</title>
        </Head>
        <p>Loading file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <Head>
          <title>File Not Found</title>
        </Head>
        <h1>File Not Available</h1>
        <p>{error}</p>
      </div>
    );
  }

  const isViewable = fileContent !== null;

  return (
    <>
      <Head>
        <title>{fileInfo?.name || 'Shared File'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.fileInfo}>
            <h1 style={styles.title}>{fileInfo?.name}</h1>
            <p style={styles.meta}>
              {fileInfo?.mime_type} • {formatFileSize(fileInfo?.size || 0)}
            </p>
          </div>
          <div style={styles.actions}>
            <button onClick={handleDownload} style={styles.downloadButton}>
              <i className="fa-solid fa-download" style={{ marginRight: '8px' }}></i>
              Download
            </button>
          </div>
        </div>

        {/* File Content */}
        {isViewable ? (
          <div style={styles.content}>
            {fileContent.type === 'image' && (
              <img 
                src={fileContent.url} 
                alt={fileInfo?.name}
                style={styles.image}
              />
            )}
            {fileContent.type === 'pdf' && (
              <iframe
                src={fileContent.url}
                style={styles.pdf}
                title={fileInfo?.name}
              />
            )}
            {fileContent.type === 'text' && (
              <pre style={styles.text}>
                <code>Loading text content...</code>
              </pre>
            )}
          </div>
        ) : (
          <div style={styles.noPreview}>
            <i className="fa-solid fa-file" style={styles.noPreviewIcon}></i>
            <p>This file type cannot be previewed.</p>
            <button onClick={handleDownload} style={styles.downloadButtonLarge}>
              <i className="fa-solid fa-download" style={{ marginRight: '8px' }}></i>
              Download File
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p>Shared via Rackbase</p>
        </div>
      </div>

      {/* Font Awesome for icons */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
      />

      {/* Load text content if needed */}
      {fileContent?.type === 'text' && (
        <script dangerouslySetInnerHTML={{
          __html: `
            fetch('${fileContent.url}')
              .then(r => r.text())
              .then(text => {
                document.querySelector('pre code').textContent = text;
              });
          `
        }} />
      )}
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textAlign: 'center',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e1e4e8',
    gap: '20px',
    flexWrap: 'wrap',
  },
  fileInfo: {
    flex: 1,
    minWidth: '200px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#24292e',
    wordBreak: 'break-word',
  },
  meta: {
    margin: 0,
    color: '#586069',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
  },
  downloadButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#2ea44f',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  downloadButtonLarge: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#2ea44f',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    marginTop: '20px',
  },
  content: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#f6f8fa',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '80vh',
    objectFit: 'contain',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  pdf: {
    width: '100%',
    height: '80vh',
    border: 'none',
    borderRadius: '4px',
  },
  text: {
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  noPreview: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f8fa',
    borderRadius: '8px',
    padding: '60px 20px',
    marginBottom: '30px',
    color: '#586069',
  },
  noPreviewIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    color: '#959da5',
  },
  footer: {
    textAlign: 'center',
    color: '#959da5',
    fontSize: '14px',
    paddingTop: '20px',
    borderTop: '1px solid #e1e4e8',
  },
};
