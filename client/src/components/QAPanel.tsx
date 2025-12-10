import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addComment, fetchRecords, fetchTextContent, getFilePresignedUrl, saveReviewText } from '../api';
import type { PaginatedResponse } from '../api';
import { RecordComment, FilePair } from '../types';

type TextPayload = {
  success: boolean;
  textContent: string;
  reviewContent: string;
  originalPath: string;
  editorPath: string;
};

const QAPanel = () => {
  const queryClient = useQueryClient();
  const [soldFilter, setSoldFilter] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [editorText, setEditorText] = useState('');

  const recordsQuery = useQuery<PaginatedResponse<FilePair>>({
    queryKey: ['qaRecords', soldFilter, status, search, page],
    queryFn: async () => {
      const response = await fetchRecords({ soldStatus: soldFilter || undefined, status, search, page });
      return response.data;
    },
  });

  const selectedRecord = useMemo(
    () => recordsQuery.data?.data.find((item) => item._id === selectedId) ?? recordsQuery.data?.data?.[0],
    [recordsQuery.data, selectedId]
  );

  const textQuery = useQuery<TextPayload | null>({
    queryKey: ['qaText', selectedRecord?._id],
    queryFn: async () => {
      if (!selectedRecord) return null;
      const response = await fetchTextContent(selectedRecord._id);
      return response.data;
    },
    enabled: !!selectedRecord,
  });

  useEffect(() => {
    if (textQuery.data) {
      setEditorText(textQuery.data.reviewContent || '');
    }
  }, [textQuery.data]);

  const audioUrlQuery = useQuery({
    queryKey: ['qaAudio', selectedRecord?._id],
    queryFn: async () => {
      if (!selectedRecord) return null;
      const response = await getFilePresignedUrl(selectedRecord._id, 'audio');
      return response.data.url;
    },
    enabled: !!selectedRecord,
    staleTime: 3600000,
  });

  const saveTextMutation = useMutation({
    mutationFn: (content: string) => saveReviewText(selectedRecord!._id, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qaText'] }),
  });

  const commentMutation = useMutation({
    mutationFn: (payload: { id: string; message: string }) => addComment(payload.id, payload.message),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['qaRecords'] });
    },
  });

  const files = recordsQuery.data?.data ?? [];
  const pagination = recordsQuery.data?.pagination;

  const renderComments = (comments?: RecordComment[]) => {
    if (!comments?.length) return <p style={{ color: 'var(--muted)' }}>No comments yet.</p>;
    return (
      <div className="comment-list">
        {comments.map((cmt, idx) => (
          <div key={`${cmt.createdAt}-${idx}`} className="comment-item">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{cmt.authorName || 'Anon'}</strong>
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{new Date(cmt.createdAt).toLocaleString()}</span>
            </div>
            <small style={{ color: 'var(--muted)' }}>{cmt.role}</small>
            <p style={{ marginTop: '0.25rem' }}>{cmt.message}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>QA Workspace</h2>
        <p style={{ color: 'var(--muted)' }}>See all sold/unsold uploads, listen to audio, read transcripts, and leave comments.</p>
      </div>

      <div className="card" style={{ background: 'rgba(2,6,23,0.35)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input className="input" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
          </select>
          <select className="select" value={soldFilter} onChange={(e) => setSoldFilter(e.target.value)}>
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
                <th>Uploader</th>
                <th>Sold</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file: FilePair) => (
                <tr key={file._id} className={selectedRecord?._id === file._id ? 'active-row' : ''}>
                  <td>
                    <button className="nav-link" onClick={() => setSelectedId(file._id)}>
                      {file.baseName}
                    </button>
                  </td>
                  <td>{file.uploaderName}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className="badge completed">{file.soldStatus || 'Unsold'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${file.status === 'Completed' ? 'completed' : 'processing'}`}>{file.status}</span>
                  </td>
                  <td>{new Date(file.uploadedAt).toLocaleString()}</td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    {recordsQuery.isFetching ? 'Loading...' : 'No records'}
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

      {selectedRecord && (
        <div className="card" style={{ background: 'rgba(2,6,23,0.6)' }}>
          <h3 style={{ marginTop: 0 }}>{selectedRecord.baseName}</h3>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>
            Audio available: {selectedRecord.audioAvailable ? 'Yes' : 'No'} · Text available: {selectedRecord.textAvailable ? 'Yes' : 'No'}
          </p>

          {audioUrlQuery.isLoading ? (
            <p style={{ color: 'var(--muted)' }}>Loading audio...</p>
          ) : audioUrlQuery.data ? (
            <audio className="audio-player" controls src={audioUrlQuery.data}>
              Your browser does not support the audio element.
            </audio>
          ) : (
            <p style={{ color: '#f87171' }}>Audio not available</p>
          )}

          <div style={{ marginTop: '1rem' }}>
            <p className="panel-title">Transcript</p>
            <div className="text-viewer">{textQuery.isLoading ? 'Loading text...' : textQuery.data?.textContent}</div>
          </div>

          <div className="card" style={{ background: 'rgba(2,6,23,0.35)', marginTop: '1rem' }}>
            <h4 style={{ marginTop: 0 }}>filename.F.txt Editor</h4>
            <textarea className="textarea" value={editorText} onChange={(e) => setEditorText(e.target.value)} placeholder="Edit QA friendly transcript here..." />
            <button className="btn secondary" style={{ alignSelf: 'flex-start', marginTop: '0.75rem' }} onClick={() => saveTextMutation.mutate(editorText)} disabled={saveTextMutation.isPending}>
              {saveTextMutation.isPending ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <p className="panel-title">Comments</p>
            {renderComments(selectedRecord.comments)}
            <textarea className="textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add QA comment..." />
            <button
              className="btn"
              style={{ marginTop: '0.75rem', alignSelf: 'flex-start' }}
              onClick={() => commentMutation.mutate({ id: selectedRecord._id, message: comment })}
              disabled={commentMutation.isPending || !comment}
            >
              {commentMutation.isPending ? 'Saving...' : 'Save Comment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QAPanel;


