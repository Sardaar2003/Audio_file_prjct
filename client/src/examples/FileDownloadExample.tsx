/**
 * Example component demonstrating how to use presigned S3 URLs
 * for downloading text files and streaming audio files
 */

import { useQuery } from '@tanstack/react-query';
import { getFilePresignedUrl } from '../api';

interface FileDownloadExampleProps {
  filePairId: string; // MongoDB FilePair ID
}

export const FileDownloadExample = ({ filePairId }: FileDownloadExampleProps) => {
  // Example 1: Get presigned URL for text file download
  const textUrlQuery = useQuery({
    queryKey: ['fileUrl', filePairId, 'text'],
    queryFn: () => getFilePresignedUrl(filePairId, 'text'),
    enabled: !!filePairId,
    staleTime: 3600000, // Cache for 1 hour (URL expires in 1 hour)
  });

  // Example 2: Get presigned URL for audio streaming
  const audioUrlQuery = useQuery({
    queryKey: ['fileUrl', filePairId, 'audio'],
    queryFn: () => getFilePresignedUrl(filePairId, 'audio'),
    enabled: !!filePairId,
    staleTime: 3600000,
  });

  // Example 3: Get presigned URL for review text (filename.F.txt)
  const reviewUrlQuery = useQuery({
    queryKey: ['fileUrl', filePairId, 'review'],
    queryFn: () => getFilePresignedUrl(filePairId, 'review'),
    enabled: !!filePairId,
    staleTime: 3600000,
  });

  // Method 1: Download text file using window.location.href
  const handleDownloadText = () => {
    if (textUrlQuery.data?.data.url) {
      window.location.href = textUrlQuery.data.data.url;
    }
  };

  // Method 2: Download text file using window.open
  const handleDownloadTextNewTab = () => {
    if (textUrlQuery.data?.data.url) {
      window.open(textUrlQuery.data.data.url, '_blank');
    }
  };

  // Method 3: Download text file using anchor element
  const handleDownloadTextAnchor = () => {
    if (textUrlQuery.data?.data.url) {
      const link = document.createElement('a');
      link.href = textUrlQuery.data.data.url;
      link.download = textUrlQuery.data.data.filename || 'download.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>File Download Examples</h2>

      {/* Example 1: Audio Streaming */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Audio Streaming (Presigned URL)</h3>
        {audioUrlQuery.isLoading ? (
          <p>Loading audio...</p>
        ) : audioUrlQuery.data?.data.url ? (
          <div>
            <audio controls src={audioUrlQuery.data.data.url} style={{ width: '100%', maxWidth: '600px' }}>
              Your browser does not support the audio element.
            </audio>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
              URL expires in: {audioUrlQuery.data.data.expiresIn} seconds
            </p>
          </div>
        ) : (
          <p style={{ color: '#f87171' }}>Failed to load audio</p>
        )}
      </div>

      {/* Example 2: Text File Download - Method 1 */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Text File Download - Method 1 (window.location.href)</h3>
        <button onClick={handleDownloadText} disabled={!textUrlQuery.data?.data.url}>
          Download Text File
        </button>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
          Opens in same tab, triggers download
        </p>
      </div>

      {/* Example 3: Text File Download - Method 2 */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Text File Download - Method 2 (window.open)</h3>
        <button onClick={handleDownloadTextNewTab} disabled={!textUrlQuery.data?.data.url}>
          Download Text File (New Tab)
        </button>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
          Opens in new tab
        </p>
      </div>

      {/* Example 4: Text File Download - Method 3 */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Text File Download - Method 3 (Anchor Element)</h3>
        <button onClick={handleDownloadTextAnchor} disabled={!textUrlQuery.data?.data.url}>
          Download Text File (Anchor)
        </button>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
          Programmatic download with custom filename
        </p>
      </div>

      {/* Example 5: Direct Link */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Direct Link (HTML anchor)</h3>
        {textUrlQuery.data?.data.url ? (
          <a href={textUrlQuery.data.data.url} download target="_blank" rel="noreferrer">
            Download Text File (Direct Link)
          </a>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      {/* Example 6: Review Text Download */}
      <div style={{ marginBottom: '2rem' }}>
        <h3>Review Text Download (filename.F.txt)</h3>
        {reviewUrlQuery.isLoading ? (
          <p>Loading...</p>
        ) : reviewUrlQuery.data?.data.url ? (
          <a href={reviewUrlQuery.data.data.url} download target="_blank" rel="noreferrer">
            Download Review Text
          </a>
        ) : (
          <p style={{ color: '#666' }}>Review text not available</p>
        )}
      </div>

      {/* Debug Info */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
        <h4>Debug Information</h4>
        <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
          {JSON.stringify(
            {
              textUrl: textUrlQuery.data?.data.url ? '***URL_GENERATED***' : null,
              audioUrl: audioUrlQuery.data?.data.url ? '***URL_GENERATED***' : null,
              reviewUrl: reviewUrlQuery.data?.data.url ? '***URL_GENERATED***' : null,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
};

/**
 * USAGE EXAMPLES:
 *
 * 1. Audio Streaming in React:
 *    const { data } = useQuery({
 *      queryKey: ['audioUrl', fileId],
 *      queryFn: () => getFilePresignedUrl(fileId, 'audio'),
 *    });
 *    <audio controls src={data?.data.url} />
 *
 * 2. Text Download on Click:
 *    const handleDownload = async () => {
 *      const { data } = await getFilePresignedUrl(fileId, 'text');
 *      window.location.href = data.url;
 *    };
 *
 * 3. Direct Link:
 *    const { data } = useQuery({
 *      queryKey: ['textUrl', fileId],
 *      queryFn: () => getFilePresignedUrl(fileId, 'text'),
 *    });
 *    <a href={data?.data.url} download>Download</a>
 */

