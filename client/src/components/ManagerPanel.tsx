import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addComment, deleteComment, fetchRecords, fetchTextContent, getFilePresignedUrl, fetchFilePairDetails, updateFlag, updateStatus } from '../api';
import type { PaginatedResponse } from '../api';
import { RecordComment, FilePair } from '../types';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

// Helper function to format bytes
const formatBytes = (bytes?: number): string => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const ManagerPanel = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [soldStatus, setSoldStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [commentOnly, setCommentOnly] = useState(false);

  useEffect(() => {
    setShowComments(false);
    setComment('');
  }, [selectedId]);

  const recordsQuery = useQuery<PaginatedResponse<FilePair>>({
    queryKey: ['monitorRecords', status, search, soldStatus, page],
    queryFn: async () => {
      const response = await fetchRecords({ status, search, soldStatus, page });
      return response.data;
    },
  });

  const fileDetailsQuery = useQuery({
    queryKey: ['fileDetails', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const response = await fetchFilePairDetails(selectedId);
      return response.data.data;
    },
    enabled: !!selectedId,
  });

  const selectedRecord = fileDetailsQuery.data;

  const textQuery = useQuery({
    queryKey: ['monitorText', selectedRecord?._id],
    queryFn: async () => {
      if (!selectedRecord) return null;
      const response = await fetchTextContent(selectedRecord._id);
      return response.data;
    },
    enabled: !!selectedRecord,
  });

  const audioUrlQuery = useQuery({
    queryKey: ['monitorAudio', selectedRecord?._id],
    queryFn: async () => {
      if (!selectedRecord) return null;
      const response = await getFilePresignedUrl(selectedRecord._id, 'audio');
      return response.data.url;
    },
    enabled: !!selectedRecord,
    staleTime: 3600000,
  });

  const commentMutation = useMutation({
    mutationFn: (payload: { id: string; message: string }) => addComment(payload.id, payload.message),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['fileDetails', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['monitorRecords'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (payload: { filePairId: string; commentId: string }) => deleteComment(payload.filePairId, payload.commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileDetails', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['monitorRecords'] });
    },
  });

  const files = recordsQuery.data?.data ?? [];
  const pagination = recordsQuery.data?.pagination;

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
                {canDelete && cmt._id && selectedId && (
                  <button
                    className="btn secondary"
                    style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem', minWidth: 'auto' }}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this comment?') && cmt._id) {
                        deleteCommentMutation.mutate({ filePairId: selectedId, commentId: cmt._id });
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
        <h2 style={{ margin: 0 }}>Monitor</h2>
        <p style={{ color: 'var(--muted)' }}>Listen to audio, review transcripts, and capture comments across all records.</p>
      </div>

      <div className="card" style={{ background: 'rgba(2,6,23,0.35)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input className="input" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
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
                <th>File</th>
                <th>Size</th>
                <th>Flag</th>
                <th>Status</th>
                <th>Comment</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file: FilePair) => (
                <tr key={file._id}>
                  <td>
                    <button
                      className="nav-link"
                      onClick={() => {
                        setSelectedId(file._id);
                        setCommentOnly(false);
                      }}
                    >
                      {file.baseName}
                    </button>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                    {file.audioAvailable && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>🎵</span>
                        {typeof file.audioSize === 'number' ? formatBytes(file.audioSize) : '0 B'}
                      </div>
                    )}
                    {file.textAvailable && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>📄</span>
                        {typeof file.textSize === 'number' ? formatBytes(file.textSize) : '0 B'}
                      </div>
                    )}
                  </td>
                  <td>
                    <select
                      value={file.flag || 'No Issue'}
                      onChange={async (e) => {
                        const newFlag = e.target.value;
                        try {
                          await updateFlag(file._id, newFlag);
                          queryClient.invalidateQueries({ queryKey: ['monitorRecords'] });
                        } catch (err) {
                          console.error('Failed to update flag', err);
                        }
                      }}
                      style={{
                        padding: '0.25rem',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor:
                          (file.flag || 'No Issue') === 'Issue' ? '#ffebee' :
                            (file.flag || 'No Issue') === 'Warning' ? '#fffde7' : '#e8f5e9',
                        color:
                          (file.flag || 'No Issue') === 'Issue' ? '#c62828' :
                            (file.flag || 'No Issue') === 'Warning' ? '#fbc02d' : '#2e7d32',
                        fontWeight: 'bold',
                      }}
                    >
                      <option value="No Issue">No Issue</option>
                      <option value="Warning">Warning</option>
                      <option value="Issue">Issue</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${file.status === 'Completed' ? 'completed' : 'processing'}`}>
                      {file.status === 'Completed' ? 'Processed' : 'Processing'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn secondary"
                      onClick={() => {
                        setSelectedId(file._id);
                        setShowComments(true);
                        setCommentOnly(true);
                      }}
                    >
                      Comment
                    </button>
                  </td>
                  <td>{dayjs(file.uploadedAt).format('DD-MM-YYYY')}</td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    {recordsQuery.isFetching ? 'Loading...' : 'No records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pagination && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Previous
            </button>
            <span>
              Page {pagination.page} / {pagination.pages}
            </span>
            <button
              className="btn secondary"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedId && selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedId(null)}>
              ×
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>{selectedRecord.baseName}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {!commentOnly && (
                <>
                  <div>
                    <p style={{ color: 'var(--muted)', marginTop: 0, marginBottom: '0.5rem' }}>
                      Status:{' '}
                      <strong>{selectedRecord.status === 'Completed' ? 'Processed' : 'Processing'}</strong>
                    </p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                      {selectedRecord.audioAvailable && typeof selectedRecord.audioSize === 'number' && (
                        <span>Audio Size: {formatBytes(selectedRecord.audioSize)} · </span>
                      )}
                      {selectedRecord.textAvailable && typeof selectedRecord.textSize === 'number' && (
                        <span>Text Size: {formatBytes(selectedRecord.textSize)} · </span>
                      )}
                      Uploaded: {new Date(selectedRecord.uploadedAt).toLocaleString()}
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
                </>
              )}

              <div>
                <p className="panel-title">Comments</p>
                {!showComments ? (
                  <button className="btn secondary" onClick={() => setShowComments(true)} style={{ marginTop: '0.5rem' }}>
                    Comments
                  </button>
                ) : (
                  <>
                    {renderComments(selectedRecord.comments)}
                    <textarea
                      className="textarea"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add monitor remarks..."
                      style={{ marginTop: '1rem' }}
                    />
                    <button
                      className="btn"
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => commentMutation.mutate({ id: selectedRecord._id, message: comment })}
                      disabled={commentMutation.isPending || !comment}
                    >
                      {commentMutation.isPending ? 'Saving...' : 'Save Comment'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            {selectedRecord.status !== 'Completed' ? (
              <button
                onClick={async () => {
                  try {
                    await updateStatus(selectedRecord._id, 'Completed');
                    queryClient.invalidateQueries({ queryKey: ['monitorRecords'] });
                    queryClient.invalidateQueries({ queryKey: ['fileDetails', selectedId] });
                    setSelectedId(null);
                  } catch (err) {
                    console.error('Failed to update status', err);
                  }
                }}
                className="btn"
                style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32', color: 'white' }}
              >
                Mark as Processed
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await updateStatus(selectedRecord._id, 'Processing');
                    queryClient.invalidateQueries({ queryKey: ['monitorRecords'] });
                    queryClient.invalidateQueries({ queryKey: ['fileDetails', selectedId] });
                    setSelectedId(null);
                  } catch (err) {
                    console.error('Failed to update status', err);
                  }
                }}
                className="btn"
                style={{ backgroundColor: '#fbc02d', borderColor: '#fbc02d', color: 'black' }}
              >
                Mark as Processing
              </button>
            )}
            <button onClick={() => setSelectedId(null)} className="btn secondary">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPanel;
