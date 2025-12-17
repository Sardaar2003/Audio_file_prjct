import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from '../api';
import { deleteUser, fetchAdminStats, fetchUsers, updateUserRole, fetchAdminFilePairs, deleteFilePairAdmin, fetchFilePairDetails, fetchTextContent, getFilePresignedUrl, addComment, deleteComment } from '../api';
import { AdminStats as AdminStatsType, FilePair, User, RecordComment } from '../types';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = ['User', 'Agent', 'QA1', 'QA2', 'Monitor', 'Admin'];

const AdminPanel = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [fileStatus, setFileStatus] = useState('');
  const [soldStatus, setSoldStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
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

  useEffect(() => {
    setShowComments(false);
    setComment('');
  }, [selectedFileId]);

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

  const fileDetailsQuery = useQuery({
    queryKey: ['adminFileDetails', selectedFileId],
    queryFn: async () => {
      if (!selectedFileId) return null;
      const response = await fetchFilePairDetails(selectedFileId);
      return response.data.data;
    },
    enabled: !!selectedFileId,
  });

  const selectedFile = fileDetailsQuery.data;

  const textQuery = useQuery({
    queryKey: ['adminText', selectedFile?._id],
    queryFn: async () => {
      if (!selectedFile) return null;
      const response = await fetchTextContent(selectedFile._id);
      return response.data;
    },
    enabled: !!selectedFile,
  });

  const audioUrlQuery = useQuery({
    queryKey: ['adminAudio', selectedFile?._id],
    queryFn: async () => {
      if (!selectedFile) return null;
      const response = await getFilePresignedUrl(selectedFile._id, 'audio');
      return response.data.url;
    },
    enabled: !!selectedFile,
    staleTime: 3600000,
  });

  const commentMutation = useMutation({
    mutationFn: (payload: { id: string; message: string }) => addComment(payload.id, payload.message),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['adminFileDetails', selectedFileId] });
      queryClient.invalidateQueries({ queryKey: ['adminFilePairs'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (payload: { filePairId: string; commentId: string }) => deleteComment(payload.filePairId, payload.commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFileDetails', selectedFileId] });
      queryClient.invalidateQueries({ queryKey: ['adminFilePairs'] });
    },
  });

  const renderComments = (comments?: RecordComment[]) => {
    if (!comments?.length) return <p style={{ color: 'var(--muted)' }}>No comments yet.</p>;
    return (
      <div className="comment-list">
        {comments.map((cmt, idx) => {
          const canDelete = user && (user.id === cmt.author || user.role === 'Admin');
          return (
            <div key={cmt._id || `${cmt.createdAt}-${idx}`} className="comment-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong>{cmt.authorName || 'Anon'}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{new Date(cmt.createdAt).toLocaleString()}</span>
                  </div>
                  <small style={{ color: 'var(--muted)' }}>{cmt.role}</small>
                  <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>{cmt.message}</p>
                </div>
                {canDelete && cmt._id && selectedFileId && (
                  <button
                    className="btn secondary"
                    style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem', minWidth: 'auto' }}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this comment?') && cmt._id) {
                        deleteCommentMutation.mutate({ filePairId: selectedFileId, commentId: cmt._id });
                      }
                    }}
                    disabled={deleteCommentMutation.isPending}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
                <th>Agent Tag</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filesQuery.data?.data.map((file: FilePair) => (
                <tr key={file._id}>
                  <td>
                    <button className="nav-link" onClick={() => setSelectedFileId(file._id)} style={{ padding: '0.25rem 0.5rem' }}>
                      {file.baseName}
                    </button>
                  </td>
                  <td>{file.uploaderName}</td>
                  <td>{file.soldStatus}</td>
                  <td>{file.agentTag || '—'}</td>
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
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>
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

      {selectedFileId && selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFileId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedFileId(null)}>
              ×
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>{selectedFile.baseName}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p style={{ color: 'var(--muted)', marginTop: 0, marginBottom: '0.5rem' }}>
                  Uploader: <strong>{selectedFile.uploaderName}</strong> · Status:{' '}
                  <strong>{selectedFile.status}</strong> · Sold:{' '}
                  <strong>{selectedFile.soldStatus || 'Unsold'}</strong>
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  Audio available: {selectedFile.audioAvailable ? 'Yes' : 'No'} · Text available: {selectedFile.textAvailable ? 'Yes' : 'No'} · Agent tag:{' '}
                  {selectedFile.agentTag || '—'} · Uploaded: {new Date(selectedFile.uploadedAt).toLocaleString()}
                </p>
              </div>

              {audioUrlQuery.isLoading ? (
                <p style={{ color: 'var(--muted)' }}>Loading audio...</p>
              ) : audioUrlQuery.data ? (
                <div>
                  <p className="panel-title">Audio</p>
                  <audio className="audio-player" controls src={audioUrlQuery.data}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <p style={{ color: '#f87171' }}>Audio not available</p>
              )}

              <div>
                <p className="panel-title">Transcript</p>
                <div className="text-viewer" style={{ maxHeight: '300px' }}>
                  {textQuery.isLoading ? 'Loading text...' : textQuery.data?.textContent || 'No transcript available'}
                </div>
              </div>

              <div>
                <p className="panel-title">Comments</p>
                {!showComments ? (
                  <button className="btn secondary" onClick={() => setShowComments(true)} style={{ marginTop: '0.5rem' }}>
                    Comments
                  </button>
                ) : (
                  <>
                    {renderComments(selectedFile.comments)}
                    <textarea
                      className="textarea"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add admin comment..."
                      style={{ marginTop: '1rem' }}
                    />
                    <button
                      className="btn"
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => commentMutation.mutate({ id: selectedFile._id, message: comment })}
                      disabled={commentMutation.isPending || !comment}
                    >
                      {commentMutation.isPending ? 'Saving...' : 'Save Comment'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;


