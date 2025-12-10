import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyUploads, uploadFolder, getFilePresignedUrl, updateSoldStatus } from '../api';
import type { PaginatedResponse } from '../api';
import { FilePair, UploadSummary } from '../types';

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Helper function to calculate upload speed
const calculateUploadSpeed = (loaded: number, total: number, startTime: number): string => {
  if (loaded === 0 || startTime === 0) return '';
  const elapsed = (Date.now() - startTime) / 1000; // seconds
  if (elapsed < 1) return 'Starting...';
  const speed = loaded / elapsed; // bytes per second
  const remaining = total - loaded;
  const eta = remaining / speed; // seconds
  if (eta < 1) return 'Finishing...';
  if (eta < 60) return `~${Math.round(eta)}s remaining`;
  return `~${Math.round(eta / 60)}m remaining`;
};

// Helper component for downloading files using presigned URLs
const FileDownloadButton = ({ filePairId, type, label }: { filePairId: string; type: 'audio' | 'text' | 'review'; label: string }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await getFilePresignedUrl(filePairId, type);
      // Open presigned URL in new tab to trigger download
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('Failed to get download URL:', error);
      alert('Failed to generate download link. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button className="btn secondary" onClick={handleDownload} disabled={downloading}>
      {downloading ? 'Loading...' : label}
    </button>
  );
};

const UploadPanel = () => {
  const queryClient = useQueryClient();
  const mp3InputRef = useRef<HTMLInputElement | null>(null);
  const txtInputRef = useRef<HTMLInputElement | null>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [soldStatus, setSoldStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0 });
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [textFiles, setTextFiles] = useState<File[]>([]);

  useEffect(() => {
    const setDirAttrs = (el: HTMLInputElement | null) => {
      if (!el) return;
      el.setAttribute('webkitdirectory', 'true');
      el.setAttribute('mozdirectory', 'true');
      el.setAttribute('directory', 'true');
    };
    setDirAttrs(mp3InputRef.current);
    setDirAttrs(txtInputRef.current);
  }, []);

  const uploadsQuery = useQuery<PaginatedResponse<FilePair>>({
    queryKey: ['myUploads', status, search, soldStatus, page],
    queryFn: async () => {
      const response = await fetchMyUploads({ status, search, soldStatus, page });
      return response.data;
    },
  });

  const soldMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: 'Sold' | 'Unsold' }) => updateSoldStatus(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myUploads'] });
    },
  });

  const handleMp3Select = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setAudioFiles(Array.from(files));
  };

  const handleTxtSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setTextFiles(Array.from(files));
  };

  const handleUpload = async () => {
    const combined = [...audioFiles, ...textFiles];
    if (!combined.length) return;

    const totalSize = combined.reduce((sum, file) => sum + file.size, 0);
    const formData = new FormData();
    combined.forEach((file) => formData.append('files', file));

    try {
      setUploading(true);
      uploadStartTimeRef.current = Date.now();
      setUploadProgress({ loaded: 0, total: totalSize });

      const response = await uploadFolder(formData, (progressEvent) => {
        setUploadProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total || totalSize,
        });
      });

      setSummary(response.data.summary);
      setDuplicates(response.data.duplicatesSkipped);
      await uploadsQuery.refetch();

      // Optional hard refresh to guarantee latest view (helps if cache is stale)
      setTimeout(() => window.location.reload(), 300);

      setTimeout(() => {
        setUploadProgress({ loaded: 0, total: 0 });
        setAudioFiles([]);
        setTextFiles([]);
        uploadStartTimeRef.current = 0;
      }, 2000);
    } catch (error) {
      console.error(error);
      setUploadProgress({ loaded: 0, total: 0 });
      setAudioFiles([]);
      setTextFiles([]);
      uploadStartTimeRef.current = 0;
    } finally {
      setUploading(false);
      if (mp3InputRef.current) mp3InputRef.current.value = '';
      if (txtInputRef.current) txtInputRef.current.value = '';
    }
  };

  const tableRows = useMemo(() => uploadsQuery.data?.data ?? [], [uploadsQuery.data]);
  const pagination = uploadsQuery.data?.pagination;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>Bulk Audio/Text Upload</h2>
        <p style={{ color: 'var(--muted)' }}>
          Step 1: choose your .mp3 folder. Step 2: choose your .txt folder. We map by filename; if a counterpart is missing, it is saved as NA.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label className="btn" style={{ width: 'fit-content' }}>
          <input
            ref={mp3InputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            accept=".mp3"
            onChange={handleMp3Select}
            disabled={uploading}
          />
          {audioFiles.length ? `Selected ${audioFiles.length} mp3` : 'Select .mp3 folder'}
        </label>
        <label className="btn secondary" style={{ width: 'fit-content' }}>
          <input
            ref={txtInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            accept=".txt"
            onChange={handleTxtSelect}
            disabled={uploading}
          />
          {textFiles.length ? `Selected ${textFiles.length} txt` : 'Select .txt folder'}
        </label>
        <button className="btn" onClick={handleUpload} disabled={uploading || (!audioFiles.length && !textFiles.length)}>
          {uploading ? `Uploading ${audioFiles.length + textFiles.length} files...` : 'Upload selected'}
        </button>
        {!uploading && (audioFiles.length || textFiles.length) ? (
          <span style={{ color: 'var(--muted)' }}>
            Ready: {audioFiles.length} mp3 + {textFiles.length} txt
          </span>
        ) : null}
      </div>

      {/* Upload Progress Bar */}
      {uploading && uploadProgress.total > 0 && (
        <div className="card" style={{ background: 'rgba(2,6,23,0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Uploading {fileCount} file{fileCount !== 1 ? 's' : ''}...
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              {Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%
            </span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${(uploadProgress.loaded / uploadProgress.total) * 100}%`,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
            <span>
              {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}
            </span>
            <span>{calculateUploadSpeed(uploadProgress.loaded, uploadProgress.total, uploadStartTimeRef.current)}</span>
          </div>
        </div>
      )}

      {summary && (
        <div className="card-grid">
          <div className="card">
            <p className="panel-title">Total files uploaded</p>
            <h3>{summary.totalFiles}</h3>
          </div>
          <div className="card">
            <p className="panel-title">Unique filenames</p>
            <h3>{summary.uniqueFilenames}</h3>
          </div>
          <div className="card">
            <p className="panel-title">Records created</p>
            <h3>{summary.uploadedRecords}</h3>
          </div>
          <div className="card">
            <p className="panel-title">Fully mapped</p>
            <h3>{summary.fullyMapped}</h3>
          </div>
          <div className="card">
            <p className="panel-title">Audio only</p>
            <h3>{summary.audioOnly}</h3>
          </div>
          <div className="card">
            <p className="panel-title">Text only</p>
            <h3>{summary.textOnly}</h3>
          </div>
        </div>
      )}
      {duplicates.length > 0 && (
        <div className="card" style={{ borderColor: '#f97316' }}>
          <strong>Skipped duplicates:</strong> {duplicates.join(', ')}
        </div>
      )}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search filename..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
      <div className="card" style={{ background: 'rgba(2,6,23,0.35)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>.mp3 file</th>
                <th>.txt file</th>
                <th>Sold?</th>
                <th>Status</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((file: FilePair) => (
                <tr key={file._id}>
                  <td>{new Date(file.uploadedAt).toLocaleString()}</td>
                  <td>{file.audioAvailable ? `${file.baseName}.mp3` : 'NA'}</td>
                  <td>{file.textAvailable ? `${file.baseName}.txt` : 'NA'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn secondary"
                        style={{
                          background: file.soldStatus === 'Sold' ? '#15803d' : undefined,
                          color: file.soldStatus === 'Sold' ? '#fff' : undefined,
                        }}
                        onClick={() => soldMutation.mutate({ id: file._id, value: 'Sold' })}
                        disabled={soldMutation.isPending}
                      >
                        Mark Sold
                      </button>
                      <button
                        className="btn secondary"
                        style={{
                          background: file.soldStatus !== 'Sold' ? '#ef4444' : undefined,
                          color: file.soldStatus !== 'Sold' ? '#fff' : undefined,
                        }}
                        onClick={() => soldMutation.mutate({ id: file._id, value: 'Unsold' })}
                        disabled={soldMutation.isPending}
                      >
                        Mark Unsold
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${file.status === 'Completed' ? 'completed' : 'processing'}`}>{file.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <FileDownloadButton filePairId={file._id} type="audio" label=".mp3" />
                      <FileDownloadButton filePairId={file._id} type="text" label=".txt" />
                    </div>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    {uploadsQuery.isFetching ? 'Loading...' : 'No uploads yet'}
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
              Page {pagination.page} of {pagination.pages}
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
    </div>
  );
};

export default UploadPanel;


