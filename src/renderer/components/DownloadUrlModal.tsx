import { useState, useEffect } from 'react';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import type { VideoFormat } from '../../preload/preload.d';
import './DownloadUrlModal.css';

interface DownloadUrlModalProps {
  onClose: () => void;
  onDownload: (url: string, formatId: string, cookiesFromBrowser?: string) => void;
  initialUrl?: string;
}

export function DownloadUrlModal({ onClose, onDownload, initialUrl = '' }: DownloadUrlModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [formats, setFormats] = useState<VideoFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  // Initialize from localStorage synchronously to avoid race condition
   
  const [selectedBrowser, setSelectedBrowser] = useState<string>(() => {
    // eslint-disable-next-line no-undef
    return localStorage.getItem('preferred-browser') || 'none';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialUrl) {
      handleFetchFormats(initialUrl, selectedBrowser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  // Auto-download if only one format is available
  useEffect(() => {
    if (formats.length === 1 && selectedFormat) {
      // Automatically trigger download if only one format
      onDownload(url, selectedFormat, selectedBrowser !== 'none' ? selectedBrowser : undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formats, selectedFormat]);

  const handleFetchFormats = async (videoUrl: string, browser?: string) => {
    if (!videoUrl) return;

    setLoading(true);
    setError('');
    setFormats([]);
    setSelectedFormat('');

    try {
      // Pass cookies from browser to help with YouTube bot detection
      const cookiesParam = browser && browser !== 'none' ? browser : undefined;
      const fetchedFormats = await window.electron.download.fetchFormats(videoUrl, cookiesParam);
      setFormats(fetchedFormats);

      // Auto-select the best format
      if (fetchedFormats.length > 0) {
        const bestFormat = fetchedFormats[0];
        setSelectedFormat(bestFormat.format_id);
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to fetch video formats';
      // Provide helpful guidance if it's a YouTube bot detection error
      if (errorMsg.includes('bot') || errorMsg.includes('Sign in')) {
        setError('YouTube requires authentication. Please select a browser above where you are logged into YouTube, then try again.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-undef
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setError('');
  };

  const handleBrowserChange = (browser: string) => {
    setSelectedBrowser(browser);
    // Save browser preference to localStorage
    // eslint-disable-next-line no-undef
    localStorage.setItem('preferred-browser', browser);
  };

  const handleFetchClick = () => {
    handleFetchFormats(url, selectedBrowser);
  };

  const handleDownloadClick = () => {
    if (!url || !selectedFormat) return;
    onDownload(url, selectedFormat, selectedBrowser !== 'none' ? selectedBrowser : undefined);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="download-url-modal-backdrop" onClick={onClose}>
      <div className="download-url-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Download Video from URL</h3>
          <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <CloseIcon />
          </IconButton>
        </div>

        <div className="modal-content">
          <div className="url-input-section">
            <label htmlFor="video-url">Video URL</label>
            <div className="url-input-group">
              <input
                id="video-url"
                type="text"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://youtube.com/watch?v=..."
                disabled={loading}
              />
              <button
                className="btn-fetch"
                onClick={handleFetchClick}
                disabled={!url || loading}
              >
                {loading ? 'Loading...' : 'Fetch'}
              </button>
            </div>
          </div>

          <div className="browser-selector-section">
            <label htmlFor="browser-selector">Use Cookies From Browser</label>
            <select
              id="browser-selector"
              value={selectedBrowser}
              onChange={(e) => handleBrowserChange(e.target.value)}
              disabled={loading}
              className="browser-select"
            >
              <option value="none">None</option>
              <option value="chrome">Chrome</option>
              <option value="chromium">Chromium</option>
              <option value="firefox">Firefox</option>
              <option value="safari">Safari</option>
              <option value="edge">Edge</option>
              <option value="brave">Brave</option>
              <option value="opera">Opera</option>
            </select>
            <p className="browser-help-text">
              Your selection is saved. Enables downloading videos requiring login.
            </p>
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {formats.length > 0 && (
            <div className="formats-section">
              <label>Select Quality</label>
              <div className="formats-list">
                {formats.map((format) => (
                  <div
                    key={format.format_id}
                    className={`format-option ${selectedFormat === format.format_id ? 'selected' : ''}`}
                    onClick={() => setSelectedFormat(format.format_id)}
                  >
                    <div className="format-info">
                      <span className="format-quality">{format.format_note || format.resolution || 'Unknown'}</span>
                      <span className="format-details">
                        {format.ext.toUpperCase()} · {formatFileSize(format.filesize)}
                      </span>
                    </div>
                    <div className="format-radio">
                      {selectedFormat === format.format_id && <div className="radio-dot" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleDownloadClick}
            disabled={!url || !selectedFormat || loading}
          >
            <CloudDownloadIcon sx={{ mr: 0.5, fontSize: 20 }} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
