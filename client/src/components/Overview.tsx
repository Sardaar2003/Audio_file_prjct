import dayjs from 'dayjs';
import { User } from '../types';

const Overview = ({ user }: { user: User }) => {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Control Center</h2>
      <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
        Role-secured workspace. All actions are logged and monitored.
      </p>
      <div className="card-grid" style={{ marginTop: '1.5rem' }}>
        <div className="card" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <p className="panel-title">Current Role</p>
          <h3 style={{ margin: 0 }}>{user.role}</h3>
          <small style={{ color: 'var(--muted)' }}>Role changes apply on next login.</small>
        </div>
        <div className="card" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <p className="panel-title">Session Started</p>
          <h3 style={{ margin: 0 }}>{dayjs().format('ddd, MMM D h:mm A')}</h3>
          <small style={{ color: 'var(--muted)' }}>Stay active for secure uploads and reviews.</small>
        </div>
      </div>
    </div>
  );
};

export default Overview;


