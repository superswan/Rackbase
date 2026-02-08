import { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [sites, setSites] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOrg = localStorage.getItem('selectedOrg');
      const savedSite = localStorage.getItem('selectedSite');
      if (savedOrg) setSelectedOrg(JSON.parse(savedOrg));
      if (savedSite) setSelectedSite(JSON.parse(savedSite));
    }
  }, []);

  // Save to localStorage when selection changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedOrg) {
        localStorage.setItem('selectedOrg', JSON.stringify(selectedOrg));
      } else {
        localStorage.removeItem('selectedOrg');
      }
      
      if (selectedSite) {
        localStorage.setItem('selectedSite', JSON.stringify(selectedSite));
      } else {
        localStorage.removeItem('selectedSite');
      }
    }
  }, [selectedOrg, selectedSite]);

  const selectOrganization = (org) => {
    setSelectedOrg(org);
    setSelectedSite(null); // Reset site when org changes
    setSites([]); // Clear sites list when org changes
  };

  const selectSite = (site) => {
    setSelectedSite(site);
  };

  const clearSelection = () => {
    setSelectedOrg(null);
    setSelectedSite(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedOrg');
      localStorage.removeItem('selectedSite');
    }
  };

  // Helper functions to check if selections exist
  const hasSelectedOrg = () => selectedOrg !== null;
  const hasSelectedSite = () => selectedSite !== null;
  const isReady = () => hasSelectedOrg() && hasSelectedSite();

  // Get current context values for API calls
  const getContextParams = () => ({
    organization_id: selectedOrg?.id,
    site_id: selectedSite?.id,
  });

  return (
    <AppContext.Provider value={{
      selectedOrg,
      selectedSite,
      organizations,
      sites,
      setOrganizations,
      setSites,
      selectOrganization,
      selectSite,
      clearSelection,
      hasSelectedOrg,
      hasSelectedSite,
      isReady,
      getContextParams,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
