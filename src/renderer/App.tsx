import { useState, useEffect } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { ProgressModal } from './components/ProgressModal';
import { DownloadUrlModal } from './components/DownloadUrlModal';
import { FloatingActionButtons } from './components/FloatingActionButtons';
import { MetadataOverlay } from './components/MetadataOverlay';
import { conversionManager } from './conversion-manager';
import type { DownloadProgress as DownloadProgressType } from '../preload/preload.d';
import './App.css';

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

interface VideoData {
  filename: string;
  path: string;
  size: number;
  format: string;
  url: string;
  createdAt: Date;
  modifiedAt: Date;
}

function App() {
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  // Download state
  const [downloadLocation, setDownloadLocation] = useState('');
  const [currentDownload, setCurrentDownload] = useState<DownloadProgressType | null>(null);

  // Conversion state
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [conversionVideoPath, setConversionVideoPath] = useState('');
  const [conversionFormat, setConversionFormat] = useState('');
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'loading' | 'converting' | 'error'>('idle');
  const [conversionError, setConversionError] = useState('');

  // Progress modal state
  const [isProgressModalMinimized, setIsProgressModalMinimized] = useState(false);

  // Download URL modal state
  const [showDownloadUrlModal, setShowDownloadUrlModal] = useState(false);
  const [downloadUrlInitial, setDownloadUrlInitial] = useState('');

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'file' | 'url' | null>(null);

  // Metadata overlay state
  const [showMetadata, setShowMetadata] = useState(false);

  useEffect(() => {
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

  const handleFileSelected = async () => {
    try {
      const fileData = await window.electron.video.selectFile();
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
    } catch (error) {
      console.error('Failed to select file:', error);
    }
  };

  const handleMetadataLoad = (meta: VideoMetadata) => {
    setMetadata(meta);
    // Resize window to match video dimensions (only if we have valid dimensions)
    if (meta.width && meta.height) {
      window.electron.video.resizeWindowToVideo(meta.width, meta.height);
    }
  };

  const handleVideoLoadError = () => {
    // Video failed to load (likely incompatible codecs)
    // Offer conversion
    if (videoData) {
      setConversionVideoPath(videoData.path);
      setConversionFormat(videoData.format);
      setShowConversionDialog(true);
      // Clear the video to stop error display
      setVideoData(null);
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

  const handleDownloadUrl = (url: string, formatId: string, cookiesFromBrowser?: string) => {
    // Generate filename from URL
    const timestamp = Date.now();
    const filename = `video_${timestamp}.mp4`;

    // Start download
    window.electron.download.start({
      url,
      downloadPath: downloadLocation,
      filename,
      format: formatId,
      cookiesFromBrowser,
    });
    setShowDownloadUrlModal(false);
    setDownloadUrlInitial('');
  };

  // Drag & drop handlers
  // eslint-disable-next-line no-undef
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragType(null);

    // Check for files
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // Use webUtils.getPathForFile() for Electron 32+ (File.path was removed)
      const filePath = window.electron.file.getPathForFile(file);

      if (!filePath) {
        console.error('File path is not available');
        return;
      }

      try {
        const metadata = await window.electron.video.getMetadata(filePath);

        // Check if format needs conversion
        if (conversionManager.needsConversion(metadata.format)) {
          setConversionVideoPath(filePath);
          setConversionFormat(metadata.format);
          setShowConversionDialog(true);
        } else {
          const url = `vidmin:${filePath}`;
          setVideoData({
            ...metadata,
            url,
          });
        }
      } catch (error) {
        console.error('Failed to load dropped file:', error);
      }
    }
    // Check for URL text
    else {
      const text = e.dataTransfer.getData('text/plain');
      if (text && isValidUrl(text)) {
        // Open download modal with URL pre-filled
        setDownloadUrlInitial(text);
        setShowDownloadUrlModal(true);
      }
    }
  };

  // eslint-disable-next-line no-undef
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // Detect drag type
    const hasFiles = e.dataTransfer.types.includes('Files');
    const hasText = e.dataTransfer.types.includes('text/plain');

    setIsDragging(true);
    setDragType(hasFiles ? 'file' : hasText ? 'url' : null);
  };

  // eslint-disable-next-line no-undef
  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the entire app div
    if (e.target === e.currentTarget) {
      setIsDragging(false);
      setDragType(null);
    }
  };

  const isValidUrl = (string: string): boolean => {
    try {
      // eslint-disable-next-line no-undef
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <div
      className="app"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag & drop overlay */}
      {isDragging && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-content">
            <div className="drag-drop-icon">
              {dragType === 'file' ? '📁' : dragType === 'url' ? '🔗' : '?'}
            </div>
            <p>
              Drop {dragType === 'file' ? 'video file' : dragType === 'url' ? 'URL' : 'here'} to {dragType === 'file' ? 'play' : 'download'}
            </p>
          </div>
        </div>
      )}

      <div className="video-container">
        {videoData ? (
          <>
            <VideoPlayer
              videoUrl={videoData.url}
              filename={videoData.filename}
              onMetadataLoad={handleMetadataLoad}
              onLoadError={handleVideoLoadError}
            />

            <FloatingActionButtons
              hasVideo={true}
              onOpenFile={handleFileSelected}
              onDownloadUrl={() => setShowDownloadUrlModal(true)}
              onToggleMetadata={() => setShowMetadata(!showMetadata)}
              onCloseVideo={() => setVideoData(null)}
            />

            {showMetadata && metadata && (
              <MetadataOverlay
                metadata={metadata}
                videoData={videoData}
                onClose={() => setShowMetadata(false)}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>Drop a video file or URL here</p>
            <FloatingActionButtons
              hasVideo={false}
              onOpenFile={handleFileSelected}
              onDownloadUrl={() => setShowDownloadUrlModal(true)}
            />
          </div>
        )}
      </div>

      {showConversionDialog && (
        <ProgressModal
          mode="conversion"
          isMinimized={isProgressModalMinimized}
          onMinimize={() => setIsProgressModalMinimized(true)}
          onMaximize={() => setIsProgressModalMinimized(false)}
          onClose={handleCancelConversion}
          onCancel={handleCancelConversion}
          inputPath={conversionVideoPath}
          inputFormat={conversionFormat}
          conversionProgress={conversionProgress}
          conversionStatus={conversionStatus}
          conversionError={conversionError}
          onConvert={handleConvert}
        />
      )}

      {currentDownload && (
        <ProgressModal
          mode="download"
          isMinimized={isProgressModalMinimized}
          onMinimize={() => setIsProgressModalMinimized(true)}
          onMaximize={() => setIsProgressModalMinimized(false)}
          onClose={() => setCurrentDownload(null)}
          onCancel={() => {
            // TODO: Implement download cancellation
            setCurrentDownload(null);
          }}
          downloadProgress={currentDownload}
          onPlayDownloaded={async () => {
            // Load the downloaded video
            if (currentDownload.filename) {
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
            }
          }}
        />
      )}

      {showDownloadUrlModal && (
        <DownloadUrlModal
          onClose={() => {
            setShowDownloadUrlModal(false);
            setDownloadUrlInitial('');
          }}
          onDownload={handleDownloadUrl}
          initialUrl={downloadUrlInitial}
        />
      )}
    </div>
  );
}

export default App;
