import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function DataTable({ 
  columns, 
  data, 
  onCreate, 
  onEdit, 
  onDelete, 
  onView,
  viewHref,
  editHref,
  createForm,
  CreateForm,
  editForm,
  title,
  enableView = false,
  enableEdit = true,
  createButtonText = "+ Create New",
  pageSize = 10,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = true,
  createDefaults = {},
}) {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({...createDefaults});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Column filtering state
  const [columnFilters, setColumnFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Reset pagination when data changes
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];
    
    // Global search
    if (searchTerm) {
      result = result.filter(item => {
        return columns.some(col => {
          const value = item[col.key];
          if (value == null) return false;
          return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }
    
    // Column-specific filters
    if (enableFiltering) {
      Object.entries(columnFilters).forEach(([key, filterValue]) => {
        if (filterValue) {
          result = result.filter(item => {
            const value = item[key];
            if (value == null) return false;
            return value.toString().toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      });
    }
    
    // Sorting
    if (enableSorting && sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
        
        // Compare values
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          comparison = aVal === bVal ? 0 : aVal ? 1 : -1;
        } else {
          comparison = aVal.toString().localeCompare(bVal.toString());
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return result;
  }, [data, columns, searchTerm, columnFilters, sortColumn, sortDirection, enableSorting, enableFiltering]);

  // Pagination
  const totalItems = processedData.length;
  const totalPages = enablePagination ? Math.ceil(totalItems / itemsPerPage) : 1;
  const startIndex = enablePagination ? (currentPage - 1) * itemsPerPage : 0;
  const endIndex = enablePagination ? Math.min(startIndex + itemsPerPage, totalItems) : totalItems;
  const paginatedData = enablePagination ? processedData.slice(startIndex, endIndex) : processedData;

  const handleSort = (columnKey) => {
    if (!enableSorting) return;
    
    if (sortColumn === columnKey) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    resetPagination();
  };

  const handleColumnFilterChange = (columnKey, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
    resetPagination();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    console.log('DataTable: handleCreate called with formData:', formData);
    try {
      await onCreate(formData);
      console.log('DataTable: onCreate succeeded');
      setFormData({});
      setShowCreate(false);
    } catch (err) {
      // Error handling is done in parent component
      console.error('DataTable: Create failed:', err);
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    onEdit(editingItem.id, formData);
    setFormData({});
    setShowEdit(false);
    setEditingItem(null);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setShowEdit(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      onDelete(id);
    }
  };

  // Render create form - support both old function style and new component style
  const renderCreateForm = () => {
    if (CreateForm) {
      return <CreateForm formData={formData} setFormData={setFormData} />;
    } else if (createForm) {
      return createForm(formData, setFormData);
    }
    return null;
  };

  // Render edit form
  const renderEditForm = () => {
    if (editForm) {
      return editForm(formData, setFormData);
    }
    return null;
  };

  // Get view URL for an item
  const getViewHref = (item) => {
    if (typeof viewHref === 'function') {
      return viewHref(item);
    }
    return viewHref ? viewHref.replace(':id', item.id) : null;
  };

  // Get edit URL for an item
  const getEditHref = (item) => {
    if (typeof editHref === 'function') {
      return editHref(item);
    }
    return editHref ? editHref.replace(':id', item.id) : null;
  };

  // Get unique values for a column (for filter dropdown)
  const getUniqueValues = (columnKey) => {
    const values = new Set(data.map(item => item[columnKey]).filter(v => v != null));
    return Array.from(values).sort();
  };

  // Check if parent already defined an actions column
  const hasCustomActions = columns.some(col => col.key === 'actions');

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              resetPagination();
            }}
            style={styles.search}
          />
          {enableFiltering && (
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              style={showFilters ? styles.filterButtonActive : styles.filterButton}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          )}
        </div>
        <button onClick={() => setShowCreate(true)} style={styles.createButton}>
          {createButtonText}
        </button>
      </div>

      {showFilters && enableFiltering && (
        <div style={styles.filterPanel}>
          <h4 style={styles.filterTitle}>Column Filters</h4>
          <div style={styles.filterGrid}>
            {columns.map(col => (
              <div key={col.key} style={styles.filterGroup}>
                <label style={styles.filterLabel}>{col.label}</label>
                <input
                  type="text"
                  placeholder={`Filter ${col.label}...`}
                  value={columnFilters[col.key] || ''}
                  onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                  style={styles.filterInput}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.tableWrapper}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th 
                    key={col.key} 
                    style={styles.th}
                    onClick={() => handleSort(col.key)}
                    className={enableSorting ? 'sortable' : ''}
                  >
                    <div style={styles.thContent}>
                      {col.label}
                      {enableSorting && sortColumn === col.key && (
                        <span style={styles.sortIndicator}>
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {!hasCustomActions && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={styles.empty}>
                  No data found
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const viewUrl = getViewHref(item);
                const editUrl = getEditHref(item);
                const isClickable = viewUrl || onView;
                const isHovered = hoveredRow === item.id;
                
                const handleRowClick = (e) => {
                  // Don't trigger if clicking on a button or link
                  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
                    return;
                  }
                  if (onView) {
                    onView(item);
                  }
                };
                
                return (
                  <tr 
                    key={item.id} 
                    style={{
                      ...styles.tr,
                      ...(isHovered ? styles.trHover : {}),
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                    onMouseEnter={() => setHoveredRow(item.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={handleRowClick}
                  >
                    {columns.map(col => (
                      <td key={col.key} style={viewUrl ? styles.tdClickable : styles.td}>
                        {viewUrl ? (
                          <Link href={viewUrl} style={styles.cellLink}>
                            {col.render ? col.render(item[col.key], item) : item[col.key]}
                          </Link>
                        ) : (
                          col.render ? col.render(item[col.key], item) : item[col.key]
                        )}
                      </td>
                    ))}
                    {!hasCustomActions && (
                      <td style={styles.td}>
                        {enableView && (
                          onView ? (
                            <button 
                              onClick={() => onView(item)} 
                              style={styles.viewButton}
                            >
                              View
                            </button>
                          ) : viewUrl ? (
                            <Link href={viewUrl}>
                              <button style={styles.viewButton}>
                                View
                              </button>
                            </Link>
                          ) : null
                        )}
                        {editUrl ? (
                          <Link href={editUrl}>
                            <button style={styles.editButton}>
                              Edit
                            </button>
                          </Link>
                        ) : (
                          enableEdit && (
                            <button 
                              onClick={() => openEdit(item)} 
                              style={styles.editButton}
                            >
                              Edit
                            </button>
                          )
                        )}
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
          </div>
        </div>

      {enablePagination && totalPages > 1 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} items
          </div>
          <div style={styles.paginationControls}>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={styles.pageSizeSelect}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            
            <div style={styles.pageButtons}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={currentPage === 1 ? styles.pageButtonDisabled : styles.pageButton}
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={currentPage === 1 ? styles.pageButtonDisabled : styles.pageButton}
              >
                Prev
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={currentPage === pageNum ? styles.pageButtonActive : styles.pageButton}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={currentPage === totalPages ? styles.pageButtonDisabled : styles.pageButton}
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={currentPage === totalPages ? styles.pageButtonDisabled : styles.pageButton}
              >
                Last
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Create {title}</h3>
            <form onSubmit={(e) => { console.log('Form submit triggered'); handleCreate(e); }}>
              {renderCreateForm()}
              <div style={styles.formActions}>
                <button type="button" style={styles.submitButton} onClick={() => {
                  console.log('Button clicked, calling handleCreate manually');
                  handleCreate({ preventDefault: () => {} });
                }}>Create</button>
                <button type="button" onClick={() => setShowCreate(false)} style={styles.cancelButton}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Edit {title}</h3>
            <form onSubmit={handleEdit}>
              {renderEditForm()}
              <div style={styles.formActions}>
                <button type="submit" style={styles.submitButton}>Update</button>
                <button type="button" onClick={() => setShowEdit(false)} style={styles.cancelButton}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  searchContainer: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  search: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    width: '300px',
    fontSize: '14px',
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  filterButtonActive: {
    padding: '8px 16px',
    backgroundColor: '#4299e1',
    color: '#fff',
    border: '1px solid #4299e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  filterPanel: {
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
  },
  filterTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#4a5568',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  filterLabel: {
    fontSize: '12px',
    color: '#718096',
    marginBottom: '4px',
  },
  filterInput: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '13px',
  },
  createButton: {
    backgroundColor: '#48bb78',
    color: '#fff',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  tableWrapper: {
    overflow: 'auto',
    maxWidth: '100%',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableContainer: {
    backgroundColor: '#fff',
    minWidth: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '600px',
  },
  th: {
    backgroundColor: '#f7fafc',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    color: '#4a5568',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    userSelect: 'none',
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  sortIndicator: {
    color: '#4299e1',
    fontSize: '12px',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.15s',
  },
  trHover: {
    backgroundColor: '#f7fafc',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#2d3748',
  },
  tdClickable: {
    padding: '0',
    fontSize: '14px',
  },
  cellLink: {
    display: 'block',
    padding: '12px 16px',
    color: '#2d3748',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#718096',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  pageSizeSelect: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
  },
  pageButtons: {
    display: 'flex',
    gap: '4px',
  },
  pageButton: {
    padding: '6px 12px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#4a5568',
    minWidth: '36px',
  },
  pageButtonActive: {
    padding: '6px 12px',
    backgroundColor: '#4299e1',
    border: '1px solid #4299e1',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#fff',
    minWidth: '36px',
  },
  pageButtonDisabled: {
    padding: '6px 12px',
    backgroundColor: '#edf2f7',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    cursor: 'not-allowed',
    fontSize: '14px',
    color: '#a0aec0',
    minWidth: '36px',
  },
  viewButton: {
    backgroundColor: '#4299e1',
    color: '#fff',
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '8px',
    fontSize: '12px',
  },
  editButton: {
    backgroundColor: '#ed8936',
    color: '#fff',
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '8px',
    fontSize: '12px',
  },
  deleteButton: {
    backgroundColor: '#f56565',
    color: '#fff',
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  modal: {
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
  modalContent: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '500px',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  submitButton: {
    backgroundColor: '#48bb78',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};
