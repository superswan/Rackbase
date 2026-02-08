import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';

export default function GlobalSearch() {
  const router = useRouter();
  const { selectedOrg, selectedSite } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const searchQuery = query;
      setLoading(true);
      try {
        const params = { q: searchQuery, limit: 10 };
        if (selectedOrg) {
          params.organization_id = selectedOrg.id;
        }
        const data = await api.get('/search', params);
        // Only update if this is still the latest query
        if (searchQuery === query) {
          setResults(data.results || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        if (searchQuery === query) {
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedOrg]);

  const handleResultClick = (result) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    router.push(result.url);
  };

  const getIcon = (type) => {
    const icons = {
      asset: 'fa-desktop',
      service: 'fa-gear',
      file: 'fa-file',
      person: 'fa-user',
      documentation: 'fa-file-lines',
    };
    return icons[type] || 'fa-magnifying-glass';
  };

  return (
    <div ref={searchRef} style={styles.container}>
      {/* Search Input */}
      <div style={styles.inputWrapper}>
        <span style={styles.searchIcon}><i className={`fa-solid ${getIcon('')}`}></i></span>
        <input
          id="global-search-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search devices, services, people, docs..."
          style={styles.input}
        />
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div style={styles.dropdown}>
          {loading && (
            <div style={styles.loading}>Searching...</div>
          )}
          
          {!loading && results.length === 0 && query.length >= 2 && (
            <div style={styles.noResults}>No results found for &quot;{query}&quot;</div>
          )}
          
          {results.length > 0 && (
            <div style={styles.resultsList}>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  style={styles.resultItem}
                  onClick={() => handleResultClick(result)}
                >
                  <span style={styles.resultIcon}><i className={`fa-solid ${getIcon(result.type)}`}></i></span>
                  <div style={styles.resultContent}>
                    <div style={styles.resultTitle}>{result.title}</div>
                    <div style={styles.resultSubtitle}>{result.subtitle}</div>
                  </div>
                  <span style={styles.resultType}>{result.type}</span>
                </button>
              ))}
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    flex: 1,
    maxWidth: '500px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '14px',
    color: '#718096',
  },
  input: {
    width: '100%',
    padding: '10px 12px 10px 36px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#f7fafc',
    outline: 'none',
    transition: 'all 0.2s',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '8px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    zIndex: 1000,
    maxHeight: '400px',
    overflow: 'auto',
    border: '1px solid #e2e8f0',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '14px',
  },
  noResults: {
    padding: '20px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  resultsList: {
    padding: '8px 0',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    width: '100%',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s',
  },
  resultIcon: {
    fontSize: '20px',
    marginRight: '12px',
    width: '24px',
    textAlign: 'center',
  },
  resultContent: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resultSubtitle: {
    fontSize: '12px',
    color: '#718096',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '2px',
  },
  resultType: {
    fontSize: '11px',
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginLeft: '8px',
  },
};
