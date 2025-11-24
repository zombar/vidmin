import { useState } from 'react';
import { FileSelector } from './components/FileSelector';
import { VideoPlayer } from './components/VideoPlayer';
import './App.css';

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

function App() {
  const [videoData, setVideoData] = useState<any>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  const handleFileSelected = (fileData: any) => {
    setVideoData(fileData);
    setMetadata(null); // Reset metadata
  };

  const handleMetadataLoad = (meta: VideoMetadata) => {
    setMetadata(meta);
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

      <main data-testid="main-container" className="main-container">
        {!videoData ? (
          <FileSelector onFileSelected={handleFileSelected} />
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
    </div>
  );
}

export default App;
