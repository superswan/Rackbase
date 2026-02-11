import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { api } from '../../../lib/api';
import { useApp } from '../../../context/AppContext';

export default function OrganizationDashboard() {
  const router = useRouter();
  const { orgId } = router.query;
  const { selectedOrg, selectOrganization, selectSite } = useApp();
  const [orgDetails, setOrgDetails] = useState(null);
  const [sites, setSites] = useState([]);
  const [stats, setStats] = useState({
    assets: 0,
    networks: 0,
    software: 0,
    inventory: 0,
    people: 0,
    services: 0,
    credentials: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orgId) {
      loadDashboardData();
    }
  }, [orgId]);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const [org, siteList, orgStats] = await Promise.all([
        api.getOrganization(orgId),
        api.getSites({ organization_id: orgId }),
        api.getSiteStats({ organization_id: orgId }),
      ]);

      setOrgDetails(org);
      selectOrganization(org);
      setSites(siteList || []);
      setStats(orgStats || {});
    } catch (err) {
      const message = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError('Failed to load organization dashboard: ' + message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={styles.loading}>Loading organization dashboard...</div>
      </Layout>
    );
  }

  const orgName = orgDetails?.name || selectedOrg?.name || 'Organization';

  return (
    <Layout>
      <div>
        {error && (
          <div style={styles.error}>
            <span>{error}</span>
            <div>
              <button onClick={() => { setError(''); loadDashboardData(); }} style={styles.retryButton}>
                Retry
              </button>
              <button onClick={() => setError('')} style={styles.closeError}>×</button>
            </div>
          </div>
        )}

        <div style={styles.welcome}>
          <h3 style={styles.welcomeTitle}>{orgName.toUpperCase()}</h3>
        </div>

        <h4 style={styles.sectionTitle}>Organization Details</h4>
        <div style={styles.detailsCard}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Name</span>
            <span style={styles.detailValue}>{orgDetails?.name || '-'}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Description</span>
            <span style={styles.detailValue}>{orgDetails?.description || '-'}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Default Contact Email</span>
            <span style={styles.detailValue}>{orgDetails?.contact_email || '-'}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Default Contact Phone</span>
            <span style={styles.detailValue}>{orgDetails?.contact_phone || '-'}</span>
          </div>
        </div>

        <h4 style={styles.sectionTitle}>Resource Overview</h4>
        <div style={styles.grid}>
          <StatCard title="Assets" value={stats.assets || 0} color="#4299e1" icon="fa-desktop" />
          <StatCard title="Networks" value={stats.networks || 0} color="#9f7aea" icon="fa-globe" />
          <StatCard title="Services" value={stats.services || 0} color="#f56565" icon="fa-gear" />
          <StatCard title="People" value={stats.people || 0} color="#ed8936" icon="fa-users" />
        </div>

        <div style={styles.sectionHeader}>
          <h4 style={styles.sectionTitle}>Sites</h4>
          <Link href={`/organizations/${orgId}/sites`} style={styles.selectSiteLink}>
            Select Site
          </Link>
        </div>
        {sites.length === 0 ? (
          <div style={styles.empty}>No sites found for this organization.</div>
        ) : (
          <div style={styles.siteGrid}>
            {sites.map((site) => (
              <Link
                key={site.id}
                href={`/organizations/${orgId}/sites/${site.id}/dashboard`}
                style={styles.siteCard}
                onClick={() => selectSite(site)}
              >
                <div style={styles.siteName}>{site.name}</div>
                <div style={styles.siteMeta}>{site.location || site.address || 'No location set'}</div>
                <div style={styles.siteDesc}>{site.description || 'No description'}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
      <div style={styles.cardHeader}>
        <span style={{ ...styles.cardIcon, color }}><i className={`fa-solid ${icon}`}></i></span>
        <div style={{ ...styles.cardValue, color }}>{value}</div>
      </div>
      <div style={styles.cardTitle}>{title}</div>
    </div>
  );
}

const styles = {
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
  },
  error: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
  },
  retryButton: {
    marginRight: '8px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  closeError: {
    background: 'none',
    border: 'none',
    color: '#c53030',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: 1,
  },
  welcome: {
    marginBottom: '16px',
  },
  welcomeTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#a0aec0',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    margin: '0 0 6px 0',
  },
  welcomeSubtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '24px 0 12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '12px',
  },
  selectSiteLink: {
    fontSize: '13px',
    color: '#3182ce',
    textDecoration: 'none',
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    padding: '16px 20px',
    width: '100%',
    maxWidth: '720px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #edf2f7',
  },
  detailLabel: {
    fontSize: '13px',
    color: '#718096',
  },
  detailValue: {
    fontSize: '13px',
    color: '#2d3748',
    maxWidth: '60%',
    textAlign: 'right',
    whiteSpace: 'pre-wrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  cardIcon: {
    fontSize: '20px',
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: '13px',
    color: '#718096',
    fontWeight: '600',
  },
  siteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  siteCard: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '16px',
    textDecoration: 'none',
    color: '#2d3748',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #edf2f7',
  },
  siteName: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '6px',
  },
  siteMeta: {
    fontSize: '12px',
    color: '#718096',
    marginBottom: '6px',
  },
  siteDesc: {
    fontSize: '12px',
    color: '#4a5568',
  },
  empty: {
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    color: '#718096',
    fontSize: '13px',
  },
};
