import { useRef, useEffect } from 'react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import './VideoPlayer.css';

interface VideoPlayerProps {
  videoUrl?: string;
  filename?: string;
  onMetadataLoad?: (metadata: { duration: number; width: number; height: number }) => void;
}

export function VideoPlayer({ videoUrl, filename, onMetadataLoad }: VideoPlayerProps) {
  const playerRef = useRef<globalThis.HTMLDivElement | null>(null);

  useEffect(() => {
    if (!videoUrl) return;

    // Keyboard shortcuts
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const target = e.target as globalThis.HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const player = playerRef.current?.querySelector('video');
      if (!player) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (player.paused) {
            player.play();
          } else {
            player.pause();
          }
          break;
        case 'arrowright':
          player.currentTime = Math.min(player.duration, player.currentTime + 5);
          break;
        case 'arrowleft':
          player.currentTime = Math.max(0, player.currentTime - 5);
          break;
        case 'f':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            playerRef.current?.requestFullscreen();
          }
          break;
        case 'm':
          player.muted = !player.muted;
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [videoUrl]);

  if (!videoUrl) {
    return (
      <div className="video-player-empty" data-testid="video-player-empty">
        <p>No video loaded</p>
      </div>
    );
  }

  const handleLoadedMetadata = (nativeEvent: globalThis.Event) => {
    const target = nativeEvent.target as globalThis.HTMLVideoElement;
    // eslint-disable-next-line no-console
    console.log('[VideoPlayer] Loaded metadata:', {
      duration: target.duration,
      width: target.videoWidth,
      height: target.videoHeight,
      src: videoUrl,
    });
    if (onMetadataLoad) {
      onMetadataLoad({
        duration: target.duration,
        width: target.videoWidth,
        height: target.videoHeight,
      });
    }
  };

  const handleError = (detail: unknown, nativeEvent: globalThis.Event) => {
    console.error('[VideoPlayer] Error loading video:', {
      url: videoUrl,
      detail,
      nativeEvent,
    });
    if (nativeEvent.target && 'error' in nativeEvent.target) {
      const mediaError = (nativeEvent.target as globalThis.HTMLVideoElement).error;
      if (mediaError) {
        console.error('[VideoPlayer] Media error details:', {
          code: mediaError.code,
          message: mediaError.message,
        });
      }
    }
  };

  return (
    <div className="video-player-container" data-testid="video-player" ref={playerRef}>
      <MediaPlayer
        src={videoUrl}
        autoplay={false}
        className="video-player"
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      {filename && (
        <div className="video-info" data-testid="video-metadata">
          <span data-testid="video-filename">{filename}</span>
        </div>
      )}
    </div>
  );
}
