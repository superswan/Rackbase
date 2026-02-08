import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function SharedDoc() {
  const router = useRouter();
  const { token } = router.query;
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      loadDoc();
    }
  }, [token]);

  async function loadDoc() {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088'}/shared/doc/${token}`);
      
      if (!response.ok) {
        throw new Error('Document not found or no longer available');
      }
      
      const data = await response.json();
      setDoc(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleSavePDF() {
    // Use browser's print to PDF functionality
    const originalTitle = document.title;
    document.title = doc?.title || 'Document';
    window.print();
    document.title = originalTitle;
  }

  // Simple markdown to HTML converter
  function renderMarkdown(content) {
    if (!content) return '';
    
    // Load marked.js from CDN dynamically
    if (typeof window !== 'undefined' && !window.marked) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
      script.onload = () => {
        // Re-render after script loads
        setDoc({ ...doc });
      };
      document.head.appendChild(script);
      return '<p>Loading...</p>';
    }
    
    if (typeof window !== 'undefined' && window.marked) {
      return window.marked.parse(content);
    }
    
    return '<p>Loading...</p>';
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <Head>
          <title>Loading Document...</title>
        </Head>
        <p>Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <Head>
          <title>Document Not Found</title>
        </Head>
        <h1>Document Not Available</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{doc?.title || 'Shared Document'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={styles.container}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <h1 style={styles.title}>{doc?.title}</h1>
            {doc?.category && (
              <span style={styles.category}>{doc.category}</span>
            )}
          </div>
          <div style={styles.toolbarRight}>
            <button onClick={handlePrint} style={styles.button}>
              <i className="fa-solid fa-print" style={{ marginRight: '6px' }}></i>
              Print
            </button>
            <button onClick={handleSavePDF} style={styles.button}>
              <i className="fa-solid fa-file-pdf" style={{ marginRight: '6px' }}></i>
              Save as PDF
            </button>
          </div>
        </div>

        {/* Description */}
        {doc?.description && (
          <div style={styles.description}>
            {doc.description}
          </div>
        )}

        {/* Content */}
        <div 
          style={styles.content}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(doc?.content) }}
        />

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

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
        
        /* Markdown styles */
        .markdown-body h1 { font-size: 2em; margin-bottom: 0.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        .markdown-body h2 { font-size: 1.5em; margin-bottom: 0.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        .markdown-body h3 { font-size: 1.25em; margin-bottom: 0.5em; }
        .markdown-body h4 { font-size: 1em; margin-bottom: 0.5em; }
        .markdown-body p { margin-bottom: 1em; line-height: 1.6; }
        .markdown-body ul, .markdown-body ol { margin-bottom: 1em; padding-left: 2em; }
        .markdown-body li { margin-bottom: 0.25em; }
        .markdown-body code { background-color: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
        .markdown-body pre { background-color: #f6f8fa; padding: 1em; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; }
        .markdown-body pre code { background: none; padding: 0; }
        .markdown-body blockquote { border-left: 4px solid #dfe2e5; padding-left: 1em; margin-left: 0; color: #6a737d; }
        .markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        .markdown-body th, .markdown-body td { border: 1px solid #dfe2e5; padding: 6px 13px; }
        .markdown-body th { background-color: #f6f8fa; }
        .markdown-body a { color: #0366d6; text-decoration: none; }
        .markdown-body a:hover { text-decoration: underline; }
        .markdown-body img { max-width: 100%; height: auto; }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.6',
    color: '#24292e',
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
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e1e4e8',
    gap: '20px',
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    flex: 1,
    minWidth: '200px',
  },
  toolbarRight: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#24292e',
  },
  category: {
    display: 'inline-block',
    backgroundColor: '#e1e4e8',
    color: '#586069',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: '1px solid #d1d5da',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#24292e',
    transition: 'all 0.2s',
  },
  buttonHover: {
    backgroundColor: '#f6f8fa',
  },
  description: {
    fontSize: '16px',
    color: '#586069',
    marginBottom: '30px',
    padding: '15px 20px',
    backgroundColor: '#f6f8fa',
    borderRadius: '6px',
    borderLeft: '4px solid #0366d6',
  },
  content: {
    fontSize: '16px',
    lineHeight: '1.8',
  },
  footer: {
    marginTop: '60px',
    paddingTop: '20px',
    borderTop: '1px solid #e1e4e8',
    textAlign: 'center',
    color: '#959da5',
    fontSize: '14px',
  },
};
