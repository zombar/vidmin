import { useState, useEffect } from 'react';
import { FileSelector } from './components/FileSelector';
import { VideoPlayer } from './components/VideoPlayer';
import { UrlInput } from './components/UrlInput';
import { DownloadProgress } from './components/DownloadProgress';
import { ConversionDialog } from './components/ConversionDialog';
import { conversionManager } from './conversion-manager';
import type { VideoFileData, DownloadProgress as DownloadProgressType } from '../preload/preload.d';
import './App.css';

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

type Mode = 'local' | 'download';

function App() {
  const [mode, setMode] = useState<Mode>('local');
  const [videoData, setVideoData] = useState<any>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // Download state
  const [downloadLocation, setDownloadLocation] = useState('');
  const [currentDownload, setCurrentDownload] = useState<DownloadProgressType | null>(null);
  const [ytDlpInstalled, setYtDlpInstalled] = useState(true);

  // Conversion state
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [conversionVideoPath, setConversionVideoPath] = useState('');
  const [conversionFormat, setConversionFormat] = useState('');
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'loading' | 'converting' | 'error'>('idle');
  const [conversionError, setConversionError] = useState('');

  useEffect(() => {
    // Check if yt-dlp is installed
    window.electron.download.checkYtDlp().then(({ isInstalled }: { isInstalled: boolean }) => {
      setYtDlpInstalled(isInstalled);
    });

    // Get default download location
    window.electron.download.getDefaultLocation().then((location: string) => {
      setDownloadLocation(location);
    });

    // Set up download progress listeners
    const cleanupProgress = window.electron.download.onProgress((_id: string, progress: DownloadProgressType) => {
      setCurrentDownload(progress);
    });

    const cleanupComplete = window.electron.download.onComplete(async (_id: string, path: string) => {
      // Auto-load the downloaded video
      try {
        // eslint-disable-next-line no-console
        console.log('[App] Download complete, loading video:', path);
        const metadata = await window.electron.video.getMetadata(path);
        // eslint-disable-next-line no-console
        console.log('[App] Video metadata:', metadata);

        // Check if format needs conversion
        if (conversionManager.needsConversion(metadata.format)) {
          // Show conversion dialog instead of loading directly
          setConversionVideoPath(path);
          setConversionFormat(metadata.format);
          setShowConversionDialog(true);
          setCurrentDownload(null);
        } else {
          // Format is compatible, load directly
          const url = `vidmin:${path}`;
          // eslint-disable-next-line no-console
          console.log('[App] Loading video with URL:', url);
          setVideoData({
            ...metadata,
            url,
          });
          setCurrentDownload(null);
        }
      } catch (error) {
        console.error('Failed to load downloaded video:', error);
      }
    });

    const cleanupError = window.electron.download.onError((_id: string, error: string) => {
      setCurrentDownload((prev) => prev ? { ...prev, status: 'error' as const, error } : null);
    });

    return () => {
      cleanupProgress();
      cleanupComplete();
      cleanupError();
    };
  }, []);

  const handleFileSelected = (fileData: VideoFileData | null) => {
    if (!fileData) {
      setVideoData(null);
      setMetadata(null);
      return;
    }

    // Check if the file format needs conversion
    if (conversionManager.needsConversion(fileData.format)) {
      // eslint-disable-next-line no-console
      console.log('[App] File needs conversion:', fileData.format);
      setConversionVideoPath(fileData.path);
      setConversionFormat(fileData.format);
      setShowConversionDialog(true);
    } else {
      // Format is compatible, load directly
      // eslint-disable-next-line no-console
      console.log('[App] File can play directly:', fileData.format);
      setVideoData(fileData);
      setMetadata(null);
    }
  };

  const handleMetadataLoad = (meta: VideoMetadata) => {
    setMetadata(meta);
  };

  const handleSelectDownloadLocation = async (): Promise<void> => {
    const location = await window.electron.download.selectLocation();
    if (location) {
      setDownloadLocation(location);
    }
  };

  const handleStartDownload = async (url: string, format: string, filename: string) => {
    const result = await window.electron.download.start({
      url,
      downloadPath: downloadLocation,
      filename,
      format,
    });

    if (result.success && result.downloadId) {
      const progress: DownloadProgressType = {
        id: result.downloadId,
        url,
        progress: 0,
        speed: 0,
        eta: 0,
        status: 'pending',
        filename,
      };
      setCurrentDownload(progress);
    }
  };

  const handleCancelDownload = async () => {
    if (currentDownload) {
      await window.electron.download.cancel(currentDownload.id);
    }
  };

  const handlePlayDownloaded = async () => {
    if (!currentDownload || currentDownload.status !== 'completed') return;

    // Get the full path from the download location and filename
    const path = `${downloadLocation}/${currentDownload.filename}`;

    try {
      const metadata = await window.electron.video.getMetadata(path);
      const url = `vidmin:${path}`;
      setVideoData({
        ...metadata,
        url,
      });
      setCurrentDownload(null);
    } catch (error) {
      console.error('Failed to load downloaded video:', error);
    }
  };

  const handleConvert = async (outputFormat: 'mp4' | 'webm', quality: 'high' | 'medium' | 'low') => {
    setConversionStatus('loading');
    setConversionProgress(0);
    setConversionError('');

    try {
      const inputPath = conversionVideoPath;
      const outputPath = inputPath.replace(/\.[^/.]+$/, `.${outputFormat}`);

      await conversionManager.convertVideo({
        inputPath,
        outputPath,
        outputFormat,
        quality,
        onProgress: (progress) => {
          setConversionProgress(progress);
          if (progress > 0) {
            setConversionStatus('converting');
          }
        },
        onComplete: async () => {
          // Load the converted video
          try {
            const metadata = await window.electron.video.getMetadata(outputPath);
            const url = `vidmin:${outputPath}`;
            setVideoData({
              ...metadata,
              url,
            });
            setShowConversionDialog(false);
            setConversionStatus('idle');
          } catch (error) {
            console.error('Failed to load converted video:', error);
            setConversionError('Failed to load converted video');
            setConversionStatus('error');
          }
        },
        onError: (error) => {
          setConversionError(error.message);
          setConversionStatus('error');
        },
      });
    } catch (error) {
      setConversionError((error as Error).message);
      setConversionStatus('error');
    }
  };

  const handleCancelConversion = () => {
    setShowConversionDialog(false);
    setConversionStatus('idle');
    setConversionProgress(0);
    setConversionError('');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="app">
      <header data-testid="app-header" className="app-header">
        <h1>Vidmin Video Player</h1>
        {videoData && (
          <button
            onClick={() => setVideoData(null)}
            className="change-file-button"
            data-testid="change-file-button"
          >
            Change File
          </button>
        )}
      </header>

      {!videoData && (
        <div className="mode-selector">
          <button
            className={`mode-button ${mode === 'local' ? 'active' : ''}`}
            onClick={() => setMode('local')}
          >
            Local File
          </button>
          <button
            className={`mode-button ${mode === 'download' ? 'active' : ''}`}
            onClick={() => setMode('download')}
          >
            Download
          </button>
        </div>
      )}

      <main data-testid="main-container" className="main-container">
        {!videoData ? (
          <>
            {mode === 'local' ? (
              <FileSelector onFileSelected={handleFileSelected} />
            ) : (
              <div className="download-container">
                {!ytDlpInstalled && (
                  <div className="yt-dlp-warning" data-testid="yt-dlp-warning">
                    <h3>yt-dlp is not installed</h3>
                    <p>To download videos, you need to install yt-dlp:</p>
                    <ul>
                      <li>macOS/Linux: <code>brew install yt-dlp</code> or <code>pip install yt-dlp</code></li>
                      <li>Windows: Download from <a href="https://github.com/yt-dlp/yt-dlp/releases" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                    </ul>
                  </div>
                )}

                <div className="download-location-container">
                  <label>Download Location:</label>
                  <div className="location-selector">
                    <span data-testid="download-location-display" className="location-path">
                      {downloadLocation}
                    </span>
                    <button
                      data-testid="select-download-location"
                      onClick={handleSelectDownloadLocation}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <UrlInput
                  onDownloadStart={handleStartDownload}
                  downloadLocation={downloadLocation}
                  disabled={!!currentDownload}
                />

                {currentDownload && (
                  <DownloadProgress
                    progress={currentDownload.progress}
                    speed={currentDownload.speed}
                    eta={currentDownload.eta}
                    status={currentDownload.status}
                    filename={currentDownload.filename}
                    error={currentDownload.error}
                    onCancel={handleCancelDownload}
                    onPlayDownloaded={handlePlayDownloaded}
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <VideoPlayer
              videoUrl={videoData.url}
              filename={videoData.filename}
              onMetadataLoad={handleMetadataLoad}
            />
            {metadata && (
              <div className="video-metadata" data-testid="video-metadata-panel">
                <div className="metadata-item">
                  <span className="metadata-label">Duration</span>
                  <span className="metadata-value" data-testid="video-duration">
                    {formatDuration(metadata.duration)}
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Resolution</span>
                  <span className="metadata-value" data-testid="video-resolution">
                    {metadata.width} x {metadata.height}
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Format</span>
                  <span className="metadata-value" data-testid="video-format">
                    {videoData.format.toUpperCase()}
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Size</span>
                  <span className="metadata-value" data-testid="video-size">
                    {formatFileSize(videoData.size)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showConversionDialog && (
        <ConversionDialog
          inputPath={conversionVideoPath}
          inputFormat={conversionFormat}
          onConvert={handleConvert}
          onCancel={handleCancelConversion}
          progress={conversionProgress}
          status={conversionStatus}
          error={conversionError}
        />
      )}
    </div>
  );
}

export default App;
