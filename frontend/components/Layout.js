import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import GlobalSearch from './GlobalSearch';

export default function Layout({ children, requireOrg = false, requireSite = false }) {
  const router = useRouter();
  const { selectedOrg, selectedSite, clearSelection, hasSelectedOrg, hasSelectedSite } = useApp();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (!token && router.pathname !== '/login') {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [router]);

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect if required org/site not selected
  useEffect(() => {
    if (!loading && router.pathname !== '/login') {
      if (requireOrg && !hasSelectedOrg()) {
        router.push('/organizations');
        return;
      }
      if (requireSite && !hasSelectedSite()) {
        if (hasSelectedOrg()) {
          router.push(`/organizations/${selectedOrg.id}/sites`);
        } else {
          router.push('/organizations');
        }
        return;
      }
    }
  }, [loading, requireOrg, requireSite, hasSelectedOrg, hasSelectedSite, router, selectedOrg]);

  const handleLogout = () => {
    clearSelection();
    api.logout();
  };

  const handleChangeOrg = () => {
    clearSelection();
    router.push('/organizations');
    setMobileMenuOpen(false);
  };

  const handleChangeSite = () => {
    if (selectedOrg) {
      router.push(`/organizations/${selectedOrg.id}/sites`);
      setMobileMenuOpen(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navigateToSettings = () => {
    router.push('/settings');
    setMobileMenuOpen(false);
  };

  if (loading && router.pathname !== '/login') {
    return <div style={styles.loading}>Loading...</div>;
  }

  // Don't show layout on login page
  if (router.pathname === '/login') {
    return children;
  }

  const isResourcePage = router.pathname.includes('/assets') || 
                         router.pathname.includes('/networks') || 
                         router.pathname.includes('/software') || 
                         router.pathname.includes('/files') || 
                         router.pathname.includes('/people') || 
                         router.pathname.includes('/inventory') || 
                         router.pathname.includes('/documentation') ||
                         router.pathname.includes('/credentials') ||
                         router.pathname.includes('/services');

  const orgNavHref = hasSelectedOrg()
    ? `/organizations/${selectedOrg.id}/dashboard`
    : '/organizations';
  const orgNavLabel = hasSelectedOrg() ? 'Organization' : 'Organizations';

  const sidebarWidth = sidebarCollapsed ? '60px' : '280px';

  return (
    <div style={styles.container}>
      {/* Mobile Header */}
      {isMobile && (
        <header style={styles.mobileHeader}>
          <button onClick={toggleMobileMenu} style={styles.hamburgerButton}>
            <i className="fa-solid fa-bars"></i>
          </button>
          <span style={styles.mobileLogo}>Rackbase</span>
          <div style={styles.mobileSpacer} />
        </header>
      )}

      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <div style={styles.mobileOverlay} onClick={closeMobileMenu} />
      )}

      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        width: isMobile ? (mobileMenuOpen ? '280px' : '0') : sidebarWidth,
        transform: isMobile && !mobileMenuOpen ? 'translateX(-100%)' : 'translateX(0)',
      }}>
        {/* Logo Section */}
        <div style={{
          ...styles.logo,
          padding: sidebarCollapsed ? '20px 16px' : '24px 20px',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        }}>
          {!sidebarCollapsed && <h1 style={styles.logoText}>Rackbase</h1>}
          {sidebarCollapsed && <span style={styles.logoIcon}>R</span>}
          {!isMobile && (
            <button onClick={toggleSidebar} style={styles.collapseButton}>
              {sidebarCollapsed ? '→' : '←'}
            </button>
          )}
        </div>
        
        {/* Hierarchy Display */}
        {!sidebarCollapsed && (
          <div style={styles.hierarchy}>
            {hasSelectedOrg() && (
              <div style={styles.hierarchyItem}>
                <span style={styles.hierarchyLabel}>Organization</span>
                <div style={styles.hierarchyValue}>
                  {selectedOrg.name}
                  <button onClick={handleChangeOrg} style={styles.changeButton}>Change</button>
                </div>
              </div>
            )}
            
            {hasSelectedSite() && (
              <div style={styles.hierarchyItem}>
                <span style={styles.hierarchyLabel}>Site</span>
                <div style={styles.hierarchyValue}>
                  {selectedSite.name}
                  <button onClick={handleChangeSite} style={styles.changeButton}>Change</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav style={styles.nav}>
          {/* Always show Organization link */}
          <Link href={orgNavHref} style={getLinkStyle(router, orgNavHref, isMobile || sidebarCollapsed)} onClick={closeMobileMenu}>
            {isMobile || sidebarCollapsed ? <i className="fa-solid fa-building" style={styles.navIcon}></i> : orgNavLabel}
          </Link>
          
          {/* Show Site Selection link if org selected but no site */}
          {hasSelectedOrg() && !hasSelectedSite() && (
            <Link 
              href={`/organizations/${selectedOrg.id}/sites`} 
              style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites`, isMobile || sidebarCollapsed)}
              onClick={closeMobileMenu}
            >
              {isMobile || sidebarCollapsed ? <i className="fa-solid fa-location-dot" style={styles.navIcon}></i> : 'Select Site'}
            </Link>
          )}
          
          {/* Show Dashboard and Resource links only when site is selected */}
          {hasSelectedSite() && (
            <>
              <Link 
                href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/dashboard`} 
                style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/dashboard`, isMobile || sidebarCollapsed)}
                onClick={closeMobileMenu}
              >
                {isMobile || sidebarCollapsed ? <i className="fa-solid fa-chart-line" style={styles.navIcon}></i> : 'Dashboard'}
              </Link>
              
              <div style={isMobile || sidebarCollapsed ? styles.resourceSectionCollapsed : styles.resourceSection}>
                {(!isMobile && !sidebarCollapsed) && <span style={styles.resourceLabel}>Resources</span>}
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/assets`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/assets`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-desktop" style={styles.navIcon}></i> : 'Assets'}
                </Link>
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/networks`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/networks`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-globe" style={styles.navIcon}></i> : 'Networks'}
                </Link>
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/software`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/software`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-compact-disc" style={styles.navIcon}></i> : 'Software'}
                </Link>
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/files`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/files`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-folder" style={styles.navIcon}></i> : 'Files'}
                </Link>
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/people`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/people`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-users" style={styles.navIcon}></i> : 'People'}
                </Link>
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/inventory`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/inventory`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-box" style={styles.navIcon}></i> : 'Inventory'}
                </Link>
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/documentation`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/documentation`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-file-lines" style={styles.navIcon}></i> : 'Documentation'}
                </Link>
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/credentials`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/credentials`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-key" style={styles.navIcon}></i> : 'Credentials'}
                </Link>
                <Link 
                  href={`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/services`} 
                  style={getLinkStyle(router, `/organizations/${selectedOrg.id}/sites/${selectedSite.id}/services`, isMobile || sidebarCollapsed)}
                  onClick={closeMobileMenu}
                >
                  {isMobile || sidebarCollapsed ? <i className="fa-solid fa-gear" style={styles.navIcon}></i> : 'Services'}
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* Bottom Section - Settings & Logout */}
        <div style={styles.bottomSection}>
          {/* Settings Button - Sticky */}
          <button onClick={navigateToSettings} style={{
            ...styles.settingsButton,
            justifyContent: isMobile || sidebarCollapsed ? 'center' : 'flex-start',
          }}>
            {isMobile || sidebarCollapsed ? <i className="fa-solid fa-cog" style={styles.navIcon}></i> : (
              <>
                <i className="fa-solid fa-cog" style={styles.settingsIcon}></i>
                <span>Settings</span>
              </>
            )}
          </button>
          
          {/* Logout Button */}
          <button onClick={handleLogout} style={{
            ...styles.logoutButton,
            justifyContent: isMobile || sidebarCollapsed ? 'center' : 'flex-start',
          }}>
            {isMobile || sidebarCollapsed ? <i className="fa-solid fa-arrow-right-from-bracket" style={styles.navIcon}></i> : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        ...styles.main,
        marginLeft: isMobile ? '0' : sidebarWidth,
        marginTop: isMobile ? '60px' : '0',
      }}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {/* Breadcrumbs */}
            <div style={styles.breadcrumbs}>
              {hasSelectedOrg() && (
                <>
                  <span style={styles.breadcrumbItem}>{selectedOrg.name}</span>
                  {hasSelectedSite() && (
                    <>
                      <span style={styles.breadcrumbSeparator}>/</span>
                      <span style={styles.breadcrumbItem}>{selectedSite.name}</span>
                    </>
                  )}
                  {isResourcePage && (
                    <>
                      <span style={styles.breadcrumbSeparator}>/</span>
                      <span style={styles.breadcrumbCurrent}>{getPageTitle(router)}</span>
                    </>
                  )}
                </>
              )}
              {!hasSelectedOrg() && (
                <span style={styles.breadcrumbCurrent}>{getPageTitle(router)}</span>
              )}
            </div>
            <h2 style={styles.pageTitle}>{getPageTitle(router)}</h2>
          </div>
          
          {/* Global Search */}
          <div style={styles.headerRight}>
            <GlobalSearch />
          </div>
        </header>
        <div style={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}

function getLinkStyle(router, path, collapsed) {
  const isActive = router.pathname === path || router.asPath === path;
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '12px 8px' : '12px 16px',
    color: isActive ? '#fff' : '#a0aec0',
    backgroundColor: isActive ? '#4a5568' : 'transparent',
    textDecoration: 'none',
    borderRadius: '6px',
    marginBottom: '4px',
    fontSize: collapsed ? '18px' : '14px',
    transition: 'all 0.2s',
    minHeight: collapsed ? '44px' : 'auto',
  };
}

function getPageTitle(router) {
  const path = router.pathname;
  
  // Dynamic route titles
  if (path === '/organizations/[orgId]/dashboard') return 'Organization Dashboard';
  if (path.includes('/dashboard')) return 'Dashboard';
  if (path.includes('/assets')) return 'Assets';
  if (path.includes('/networks')) return 'Networks';
  if (path.includes('/software')) return 'Software';
  if (path.includes('/files')) return 'Files';
  if (path.includes('/people')) return 'People';
  if (path.includes('/inventory')) return 'Inventory';
  if (path.includes('/documentation')) return 'Documentation';
  if (path.includes('/credentials')) return 'Credentials';
  if (path.includes('/services')) return 'Services';
  if (path.includes('/sites') && !path.includes('/sites/')) return 'Select Site';
  if (path.includes('/settings')) return 'Settings';
  
  // Static routes
  const titles = {
    '/organizations': 'Select Organization',
    '/login': 'Login',
  };
  
  return titles[path] || 'Rackbase';
}

const styles = {
  container: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: '#1a202c',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 1000,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  hamburgerButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
  },
  mobileLogo: {
    fontSize: '18px',
    fontWeight: '600',
  },
  mobileSpacer: {
    width: '40px',
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  sidebar: {
    backgroundColor: '#1a202c',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    zIndex: 999,
    boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #2d3748',
    position: 'relative',
    flexShrink: 0,
  },
  logoText: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
  },
  logoIcon: {
    fontSize: '24px',
    fontWeight: '700',
    width: '28px',
    height: '28px',
    backgroundColor: '#3182ce',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButton: {
    position: 'absolute',
    right: '8px',
    backgroundColor: '#2d3748',
    border: 'none',
    color: '#a0aec0',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hierarchy: {
    padding: '16px 20px',
    borderBottom: '1px solid #2d3748',
    flexShrink: 0,
  },
  hierarchyItem: {
    marginBottom: '12px',
  },
  hierarchyLabel: {
    fontSize: '11px',
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '4px',
  },
  hierarchyValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeButton: {
    backgroundColor: 'transparent',
    border: '1px solid #4a5568',
    color: '#a0aec0',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  nav: {
    flex: 1,
    padding: '20px 12px',
    overflowY: 'auto',
    minHeight: 0,
  },
  navIcon: {
    fontSize: '18px',
    width: '20px',
    textAlign: 'center',
  },
  resourceSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #2d3748',
  },
  resourceSectionCollapsed: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #2d3748',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  resourceLabel: {
    fontSize: '11px',
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '0 16px',
    marginBottom: '8px',
    display: 'block',
  },
  bottomSection: {
    padding: '16px 12px',
    borderTop: '1px solid #2d3748',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
  settingsButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#2d3748',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  settingsIcon: {
    fontSize: '16px',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    backgroundColor: '#f7fafc',
    height: '100%',
    transition: 'margin-left 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#fff',
    padding: '20px 30px',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '24px',
    flexShrink: 0,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    flex: 1,
    maxWidth: '500px',
    flexShrink: 0,
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#718096',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  breadcrumbItem: {
    color: '#4299e1',
  },
  breadcrumbSeparator: {
    color: '#a0aec0',
  },
  breadcrumbCurrent: {
    color: '#2d3748',
    fontWeight: '500',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  content: {
    padding: '30px',
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
    width: '100%',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    fontSize: '18px',
    color: '#4a5568',
  },
};
