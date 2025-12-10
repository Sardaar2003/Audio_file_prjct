import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteUser, fetchAdminStats, fetchUsers, updateUserRole } from '../api';
import { AdminStats as AdminStatsType, User } from '../types';

const ROLE_OPTIONS = ['User', 'QA1', 'QA2', 'Monitor', 'Admin'];

const AdminPanel = () => {
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await fetchAdminStats();
      return response.data as AdminStatsType;
    },
  });

  const usersQuery = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const response = await fetchUsers();
      return response.data.data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => updateUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allUsers'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allUsers'] }),
  });

  const analytics = statsQuery.data?.analytics;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>Admin Intelligence Board</h2>
        <p style={{ color: 'var(--muted)' }}>Real-time telemetry across users, uploads, assignments, and QA reviews.</p>
      </div>
      {analytics && (
        <div className="card-grid">
          <div className="card">
            <p className="panel-title">Total users</p>
            <h3>{analytics.totalUsers}</h3>
          </div>
          <div className="card">
            <p className="panel-title">File pairs uploaded</p>
            <h3>{analytics.totalFilePairs}</h3>
          </div>
          <div className="card">
            <p className="panel-title">Processing</p>
            <h3>{analytics.processingCount}</h3>
          </div>
          <div className="card">
            <p className="panel-title">Completed reviews</p>
            <h3>{analytics.completedReviews}</h3>
          </div>
        </div>
      )}

      <div className="card" style={{ background: 'rgba(2,6,23,0.35)' }}>
        <h3>Folder upload metadata</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Uploader</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {statsQuery.data?.uploads.map((upload) => (
                <tr key={upload._id}>
                  <td>{upload.baseName}</td>
                  <td>{upload.uploaderName}</td>
                  <td>{upload.status}</td>
                  <td>{new Date(upload.uploadedAt).toLocaleString()}</td>
                </tr>
              ))}
              {statsQuery.data?.uploads.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No uploads recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ background: 'rgba(2,6,23,0.35)' }}>
        <h3>QA assignment metadata</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>QA</th>
                <th>Team</th>
                <th>Manager</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {statsQuery.data?.assignments.map((assignment) => (
                <tr key={assignment._id}>
                  <td>{assignment.filePair?.baseName}</td>
                  <td>{assignment.assignedToName}</td>
                  <td>{assignment.teamTag}</td>
                  <td>{assignment.assignedByName}</td>
                  <td>{new Date(assignment.assignedAt).toLocaleString()}</td>
                </tr>
              ))}
              {statsQuery.data?.assignments.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No assignments created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ background: 'rgba(2,6,23,0.35)' }}>
        <h3>QA review metadata</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Reviewer</th>
                <th>Team</th>
                <th>Status</th>
                <th>Sold?</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {statsQuery.data?.reviews.map((review) => (
                <tr key={review._id}>
                  <td>{review.filePair?.baseName}</td>
                  <td>{review.reviewerName}</td>
                  <td>{review.teamTag}</td>
                  <td>{review.status}</td>
                  <td>{review.soldStatus}</td>
                  <td>{review.comment}</td>
                </tr>
              ))}
              {statsQuery.data?.reviews.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No reviews logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ background: 'rgba(2,6,23,0.35)' }}>
        <h3>User management</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data?.map((user: User) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      className="select"
                      value={user.role}
                      onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="btn secondary" onClick={() => deleteUserMutation.mutate(user.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {usersQuery.data?.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;


