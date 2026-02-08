import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../../components/Layout';
import { api } from '../../../../../lib/api';
import { useApp } from '../../../../../context/AppContext';

export default function Dashboard() {
  const router = useRouter();
  const { orgId, siteId } = router.query;
  const { selectedOrg, selectedSite, selectOrganization, selectSite } = useApp();
  const [stats, setStats] = useState({
    assets: 0,
    networks: 0,
    software: 0,
    people: 0,
    inventory: 0,
    services: 0,
    credentials: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orgId && siteId) {
      loadDashboardData();
    }
  }, [orgId, siteId]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      
      // Verify context matches URL, update if needed
      if (!selectedOrg || selectedOrg.id !== orgId) {
        const org = await api.getOrganization(orgId);
        selectOrganization(org);
      }
      
      if (!selectedSite || selectedSite.id !== siteId) {
        const site = await api.getSite(siteId);
        selectSite(site);
      }
      
      // Load stats for this site
      const siteStats = await api.getSiteStats({ organization_id: orgId, site_id: siteId });
      setStats(siteStats);
    } catch (err) {
      const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError('Failed to load dashboard: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout requireOrg requireSite>
        <div style={styles.loading}>Loading dashboard...</div>
      </Layout>
    );
  }

  return (
    <Layout requireOrg requireSite>
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
          <h3 style={styles.welcomeTitle}>
            Welcome to {selectedSite?.name || 'Site'}
          </h3>
          <p style={styles.welcomeSubtitle}>
            Organization: {selectedOrg?.name || 'Organization'}
          </p>
        </div>

        <h4 style={styles.sectionTitle}>Resource Overview</h4>
        <div style={styles.grid}>
          <StatCard 
            title="Assets" 
            value={stats.assets} 
            color="#4299e1"
            icon="fa-box"
            href={`/organizations/${orgId}/sites/${siteId}/assets`}
          />
          <StatCard 
            title="Networks" 
            value={stats.networks} 
            color="#9f7aea"
            icon="fa-globe"
            href={`/organizations/${orgId}/sites/${siteId}/networks`}
          />
          <StatCard 
            title="Software" 
            value={stats.software} 
            color="#38b2ac"
            icon="fa-compact-disc"
            href={`/organizations/${orgId}/sites/${siteId}/software`}
          />
          <StatCard 
            title="People" 
            value={stats.people} 
            color="#ed8936"
            icon="fa-users"
            href={`/organizations/${orgId}/sites/${siteId}/people`}
          />
          <StatCard 
            title="Inventory" 
            value={stats.inventory} 
            color="#48bb78"
            icon="fa-box"
            href={`/organizations/${orgId}/sites/${siteId}/inventory`}
          />
          <StatCard 
            title="Services" 
            value={stats.services} 
            color="#f56565"
            icon="fa-gear"
            href={`/organizations/${orgId}/sites/${siteId}/services`}
          />
        </div>

        <h4 style={styles.sectionTitle}>Quick Actions</h4>
        <div style={styles.actionsContainer}>
          <div style={styles.actions}>
          <Link href={`/organizations/${orgId}/sites/${siteId}/assets`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#4299e1'}}><i className="fa-solid fa-desktop"></i></span>
            <div>
              <div style={styles.actionTitle}>Manage Assets</div>
              <div style={styles.actionDesc}>Servers, workstations, firewalls, switches</div>
            </div>
          </Link>
          <Link href={`/organizations/${orgId}/sites/${siteId}/networks`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#9f7aea'}}><i className="fa-solid fa-globe"></i></span>
            <div>
              <div style={styles.actionTitle}>Manage Networks</div>
              <div style={styles.actionDesc}>Subnets, VLANs, IP ranges</div>
            </div>
          </Link>
          <Link href={`/organizations/${orgId}/sites/${siteId}/software`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#38b2ac'}}><i className="fa-solid fa-compact-disc"></i></span>
            <div>
              <div style={styles.actionTitle}>Manage Software</div>
              <div style={styles.actionDesc}>Applications, licenses</div>
            </div>
          </Link>
          <Link href={`/organizations/${orgId}/sites/${siteId}/people`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#ed8936'}}><i className="fa-solid fa-users"></i></span>
            <div>
              <div style={styles.actionTitle}>Manage People</div>
              <div style={styles.actionDesc}>Site personnel, contacts</div>
            </div>
          </Link>
          <Link href={`/organizations/${orgId}/sites/${siteId}/inventory`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#48bb78'}}><i className="fa-solid fa-box"></i></span>
            <div>
              <div style={styles.actionTitle}>Manage Inventory</div>
              <div style={styles.actionDesc}>Spare hardware, peripherals</div>
            </div>
          </Link>
          <Link href={`/organizations/${orgId}/sites/${siteId}/files`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#4299e1'}}><i className="fa-solid fa-folder"></i></span>
            <div>
              <div style={styles.actionTitle}>Manage Files</div>
              <div style={styles.actionDesc}>Configs, backups, ISOs, docs</div>
            </div>
          </Link>
          <Link href={`/organizations/${orgId}/sites/${siteId}/services`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#f56565'}}><i className="fa-solid fa-gear"></i></span>
            <div>
              <div style={styles.actionTitle}>Manage Services</div>
              <div style={styles.actionDesc}>Web interfaces, SSH, RDP</div>
            </div>
          </Link>
          <Link href={`/organizations/${orgId}/sites/${siteId}/credentials`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#48bb78'}}><i className="fa-solid fa-key"></i></span>
            <div>
              <div style={styles.actionTitle}>Manage Credentials</div>
              <div style={styles.actionDesc}>Passwords, SSH keys, API keys</div>
            </div>
          </Link>
          <Link href={`/organizations/${orgId}/sites/${siteId}/documentation`} style={styles.actionCard}>
            <span style={{...styles.actionIcon, color: '#9f7aea'}}><i className="fa-solid fa-file-lines"></i></span>
            <div>
              <div style={styles.actionTitle}>Documentation</div>
              <div style={styles.actionDesc}>Docs, notes, procedures</div>
            </div>
          </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, color, icon, href }) {
  return (
    <Link href={href} style={{...styles.card, borderTop: `4px solid ${color}`, textDecoration: 'none'}}>
      <div style={styles.cardHeader}>
        <span style={{...styles.cardIcon, color}}><i className={`fa-solid ${icon}`}></i></span>
        <div style={{...styles.cardValue, color}}>{value}</div>
      </div>
      <div style={styles.cardTitle}>{title}</div>
    </Link>
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
    lineHeight: 1,
    marginLeft: '8px',
  },
  retryButton: {
    backgroundColor: '#c53030',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  welcome: {
    marginBottom: '32px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0,
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '32px 0 16px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'block',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardIcon: {
    fontSize: '24px',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: '14px',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 'calc((200px * 6) + (20px * 5))', // Match Resource Overview: 6 cards × 200px + 5 gaps × 20px
  },
  actions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: '#2d3748',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  actionIcon: {
    fontSize: '28px',
  },
  actionTitle: {
    fontWeight: '600',
    fontSize: '16px',
    marginBottom: '4px',
  },
  actionDesc: {
    fontSize: '13px',
    color: '#718096',
  },
};
