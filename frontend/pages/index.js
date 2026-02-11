import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApp } from '../context/AppContext';

export default function Home() {
  const router = useRouter();
  const { hasSelectedOrg, hasSelectedSite, selectedOrg, selectedSite } = useApp();

  useEffect(() => {
    if (!hasSelectedOrg()) {
      // No organization selected, redirect to organization selector
      router.push('/organizations');
    } else if (!hasSelectedSite()) {
      // Organization selected but no site, redirect to site selector
      router.push(`/organizations/${selectedOrg.id}/dashboard`);
    } else {
      // Both selected, redirect to dashboard
      router.push(`/organizations/${selectedOrg.id}/sites/${selectedSite.id}/dashboard`);
    }
  }, [router, hasSelectedOrg, hasSelectedSite, selectedOrg, selectedSite]);

  return (
    <div style={styles.loading}>
      Redirecting...
    </div>
  );
}

const styles = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#4a5568',
  },
};
