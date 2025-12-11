import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from '../api';
import { deleteUser, fetchAdminStats, fetchUsers, updateUserRole, fetchAdminFilePairs, deleteFilePairAdmin } from '../api';
import { AdminStats as AdminStatsType, FilePair, User } from '../types';

const ROLE_OPTIONS = ['User', 'QA1', 'QA2', 'Monitor', 'Admin'];

const AdminPanel = () => {
  const queryClient = useQueryClient();
  const [fileStatus, setFileStatus] = useState('');
  const [soldStatus, setSoldStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    setPage(1);
  }, [fileStatus, soldStatus, search]);

  const filesQuery = useQuery<PaginatedResponse<FilePair>>({
    queryKey: ['adminFilePairs', fileStatus, soldStatus, search, page],
    queryFn: async () => {
      const response = await fetchAdminFilePairs({ status: fileStatus, soldStatus, search, page });
      return response.data;
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (filePairId: string) => deleteFilePairAdmin(filePairId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFilePairs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });

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
        <h3>All file pairs</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input className="input" placeholder="Search filename" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" value={fileStatus} onChange={(e) => setFileStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
          </select>
          <select className="select" value={soldStatus} onChange={(e) => setSoldStatus(e.target.value)}>
            <option value="">Sold + Unsold</option>
            <option value="Sold">Sold</option>
            <option value="Unsold">Unsold</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Uploader</th>
                <th>Sold?</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filesQuery.data?.data.map((file: FilePair) => (
                <tr key={file._id}>
                  <td>{file.baseName}</td>
                  <td>{file.uploaderName}</td>
                  <td>{file.soldStatus}</td>
                  <td>{file.status}</td>
                  <td>{new Date(file.uploadedAt).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn secondary"
                      onClick={() => {
                        const confirmDelete = window.confirm(`Delete ${file.baseName}? This will remove files and related reviews.`);
                        if (confirmDelete) {
                          deleteFileMutation.mutate(file._id);
                        }
                      }}
                      disabled={deleteFileMutation.isPending}
                    >
                      {deleteFileMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
              {filesQuery.data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    {filesQuery.isFetching ? 'Loading...' : 'No files found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filesQuery.data?.pagination && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Previous
            </button>
            <span>
              Page {filesQuery.data.pagination.page} / {filesQuery.data.pagination.pages}
            </span>
            <button
              className="btn secondary"
              disabled={filesQuery.data.pagination.page >= filesQuery.data.pagination.pages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        )}
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


