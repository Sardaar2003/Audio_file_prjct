import { useMemo, useState } from 'react';
import Overview from '../components/Overview';
import UploadPanel from '../components/UploadPanel';
import QAPanel from '../components/QAPanel';
import ManagerPanel from '../components/ManagerPanel';
import AdminPanel from '../components/AdminPanel';
import { useAuth } from '../context/AuthContext';

type TabKey = 'overview' | 'uploads' | 'qa' | 'manager' | 'admin';

const DashboardPage = () => {
  const { user, clearAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  if (!user) return null;

  const tabs = useMemo(() => {
    const items: { key: TabKey; label: string }[] = [{ key: 'overview', label: 'Overview' }];
    if (user.role === 'User') items.push({ key: 'uploads', label: 'Uploads' });
    if (user.role === 'QA1' || user.role === 'QA2') items.push({ key: 'qa', label: 'QA Queue' });
    if (user.role === 'Monitor') items.push({ key: 'manager', label: 'Monitor' });
    if (user.role === 'Admin') {
      items.push({ key: 'uploads', label: 'Uploads' });
      items.push({ key: 'manager', label: 'Monitor' });
      items.push({ key: 'admin', label: 'Admin' });
    }
    return items;
  }, [user.role]);

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'uploads':
        return <UploadPanel />;
      case 'qa':
        return <QAPanel />;
      case 'manager':
        return <ManagerPanel />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Overview user={user} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">Audio QA Suite</div>
          <p style={{ color: 'var(--muted)', margin: '0.25rem 0 1rem' }}>Hello, {user.name}</p>
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <button className="btn secondary" onClick={clearAuth}>
          Logout
        </button>
      </aside>
      <main className="main-content">{renderActivePanel()}</main>
    </div>
  );
};

export default DashboardPage;


