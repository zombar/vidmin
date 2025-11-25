# Phase 2: Basic Video Player (Local Files)

## Overview
Implement a fully functional video player using Vidstack Player that can play local video files with complete playback controls. This phase uses Test-Driven Development to ensure all features work correctly.

## Dependencies
- Phase 1 must be completed
- Vidstack Player (@vidstack/react)
- Electron dialog API for file selection

## Goals
- Integrate Vidstack Player component
- Implement file selection dialog
- Add playback controls (play, pause, seek, volume)
- Support common video formats (MP4, WebM, MKV, AVI, MOV)
- Display video metadata (duration, resolution, format)

---

## TDD Test Specifications (Write Tests First)

### 2.1 Playwright E2E Tests

Create `e2e/video-player.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Video Player - File Selection', () => {
  test('should display file selection button', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    const selectButton = window.locator('[data-testid="select-file-button"]');
    await expect(selectButton).toBeVisible();
    await expect(selectButton).toContainText(/select.*file/i);

    await app.close();
  });

  test('should open file dialog when button clicked', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    // Monitor for dialog opening
    const dialogPromise = app.evaluate(async ({ dialog }) => {
      return new Promise((resolve) => {
        const original = dialog.showOpenDialog;
        dialog.showOpenDialog = async (options) => {
          resolve(options);
          return { canceled: true, filePaths: [] };
        };
      });
    });

    const selectButton = window.locator('[data-testid="select-file-button"]');
    await selectButton.click();

    const dialogOptions = await dialogPromise;
    expect(dialogOptions).toBeTruthy();

    await app.close();
  });

  test('should accept only video file types in dialog', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    let capturedFilters: any;
    await app.evaluate(({ dialog }) => {
      const original = dialog.showOpenDialog;
      dialog.showOpenDialog = async (options: any) => {
        capturedFilters = options.filters;
        return { canceled: true, filePaths: [] };
      };
    });

    const selectButton = window.locator('[data-testid="select-file-button"]');
    await selectButton.click();

    await window.waitForTimeout(100);

    const filters = await app.evaluate(() => (global as any).capturedFilters);
    expect(filters).toBeDefined();
    expect(filters[0].name).toMatch(/video/i);
    expect(filters[0].extensions).toContain('mp4');
    expect(filters[0].extensions).toContain('webm');

    await app.close();
  });
});

test.describe('Video Player - Playback Controls', () => {
  const testVideoPath = path.join(__dirname, '../test-assets/sample-video.mp4');

  test.beforeEach(async () => {
    // Ensure test video exists (will be created in setup)
  });

  test('should load and display video player when file selected', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    // Mock file selection
    await app.evaluate(({ dialog }, testPath) => {
      const original = dialog.showOpenDialog;
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [testPath] };
      };
    }, testVideoPath);

    const selectButton = window.locator('[data-testid="select-file-button"]');
    await selectButton.click();

    // Wait for player to appear
    const player = window.locator('[data-testid="video-player"]');
    await expect(player).toBeVisible({ timeout: 5000 });

    await app.close();
  });

  test('should display play/pause button', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const playButton = window.locator('[data-testid="play-button"]');
    await expect(playButton).toBeVisible();

    await app.close();
  });

  test('should play video when play button clicked', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const playButton = window.locator('[data-testid="play-button"]');
    await playButton.click();

    // Check if video is playing
    const isPlaying = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video && !video.paused;
    });

    expect(isPlaying).toBe(true);

    await app.close();
  });

  test('should pause video when pause button clicked', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    // Play first
    const playButton = window.locator('[data-testid="play-button"]');
    await playButton.click();
    await window.waitForTimeout(500);

    // Then pause
    const pauseButton = window.locator('[data-testid="pause-button"]');
    await pauseButton.click();

    const isPaused = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video && video.paused;
    });

    expect(isPaused).toBe(true);

    await app.close();
  });

  test('should display video duration', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const duration = window.locator('[data-testid="video-duration"]');
    await expect(duration).toBeVisible();
    await expect(duration).not.toHaveText('00:00');

    await app.close();
  });

  test('should display current time during playback', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const playButton = window.locator('[data-testid="play-button"]');
    await playButton.click();

    await window.waitForTimeout(1500);

    const currentTime = window.locator('[data-testid="current-time"]');
    const timeText = await currentTime.textContent();

    expect(timeText).not.toBe('00:00');

    await app.close();
  });

  test('should seek video using slider', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const seekSlider = window.locator('[data-testid="seek-slider"]');
    await expect(seekSlider).toBeVisible();

    // Seek to middle
    await seekSlider.click({ position: { x: 50, y: 5 } });

    const currentTimeAfterSeek = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.currentTime : 0;
    });

    expect(currentTimeAfterSeek).toBeGreaterThan(0);

    await app.close();
  });

  test('should adjust volume using volume slider', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const volumeSlider = window.locator('[data-testid="volume-slider"]');
    await expect(volumeSlider).toBeVisible();

    // Set volume to 50%
    await volumeSlider.click({ position: { x: 25, y: 5 } });

    const volume = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.volume : 0;
    });

    expect(volume).toBeGreaterThan(0);
    expect(volume).toBeLessThan(1);

    await app.close();
  });

  test('should toggle fullscreen', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const fullscreenButton = window.locator('[data-testid="fullscreen-button"]');
    await fullscreenButton.click();

    // Wait a bit for fullscreen transition
    await window.waitForTimeout(500);

    const isFullscreen = await window.evaluate(() => {
      return document.fullscreenElement !== null;
    });

    expect(isFullscreen).toBe(true);

    // Exit fullscreen
    await window.evaluate(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    });

    await app.close();
  });

  test('should toggle mute/unmute', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const muteButton = window.locator('[data-testid="mute-button"]');
    await muteButton.click();

    const isMuted = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.muted : false;
    });

    expect(isMuted).toBe(true);

    await app.close();
  });
});

test.describe('Video Player - Metadata Display', () => {
  const testVideoPath = path.join(__dirname, '../test-assets/sample-video.mp4');

  test('should display video filename', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const filename = window.locator('[data-testid="video-filename"]');
    await expect(filename).toBeVisible();
    await expect(filename).toContainText('sample-video.mp4');

    await app.close();
  });

  test('should display video resolution', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    // Wait for metadata to load
    await window.waitForTimeout(1000);

    const resolution = window.locator('[data-testid="video-resolution"]');
    await expect(resolution).toBeVisible();

    const resText = await resolution.textContent();
    expect(resText).toMatch(/\d+\s*x\s*\d+/);

    await app.close();
  });

  test('should display video format', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const format = window.locator('[data-testid="video-format"]');
    await expect(format).toBeVisible();

    await app.close();
  });
});

test.describe('Video Player - Keyboard Shortcuts', () => {
  const testVideoPath = path.join(__dirname, '../test-assets/sample-video.mp4');

  test('should play/pause with spacebar', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    // Press spacebar to play
    await window.keyboard.press('Space');
    await window.waitForTimeout(100);

    const isPlaying = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video && !video.paused;
    });

    expect(isPlaying).toBe(true);

    // Press spacebar to pause
    await window.keyboard.press('Space');
    await window.waitForTimeout(100);

    const isPaused = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video && video.paused;
    });

    expect(isPaused).toBe(true);

    await app.close();
  });

  test('should seek forward with arrow right', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const initialTime = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.currentTime : 0;
    });

    await window.keyboard.press('ArrowRight');
    await window.waitForTimeout(100);

    const newTime = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.currentTime : 0;
    });

    expect(newTime).toBeGreaterThan(initialTime);

    await app.close();
  });

  test('should seek backward with arrow left', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    // Seek forward first
    await window.evaluate(() => {
      const video = document.querySelector('video');
      if (video) video.currentTime = 5;
    });

    await window.waitForTimeout(100);

    const timeBeforeSeek = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.currentTime : 0;
    });

    await window.keyboard.press('ArrowLeft');
    await window.waitForTimeout(100);

    const timeAfterSeek = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.currentTime : 0;
    });

    expect(timeAfterSeek).toBeLessThan(timeBeforeSeek);

    await app.close();
  });

  test('should toggle fullscreen with F key', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    await window.keyboard.press('f');
    await window.waitForTimeout(300);

    const isFullscreen = await window.evaluate(() => {
      return document.fullscreenElement !== null;
    });

    expect(isFullscreen).toBe(true);

    // Exit
    await window.evaluate(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    });

    await app.close();
  });

  test('should toggle mute with M key', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    await window.keyboard.press('m');
    await window.waitForTimeout(100);

    const isMuted = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.muted : false;
    });

    expect(isMuted).toBe(true);

    await app.close();
  });
});

// Helper function
async function loadTestVideo(app: any, window: any, videoPath: string) {
  await app.evaluate(({ dialog }, testPath) => {
    dialog.showOpenDialog = async () => {
      return { canceled: false, filePaths: [testPath] };
    };
  }, videoPath);

  const selectButton = window.locator('[data-testid="select-file-button"]');
  await selectButton.click();
  await window.waitForTimeout(1000);
}
```

### 2.2 Vitest Unit Tests

Create `src/renderer/components/VideoPlayer.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoPlayer } from './VideoPlayer';

describe('VideoPlayer Component', () => {
  it('should render player container', () => {
    render(<VideoPlayer />);
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
  });

  it('should display controls', () => {
    render(<VideoPlayer />);
    expect(screen.getByTestId('video-controls')).toBeInTheDocument();
  });

  it('should show play button when paused', () => {
    render(<VideoPlayer />);
    expect(screen.getByTestId('play-button')).toBeInTheDocument();
  });

  it('should display metadata panel', () => {
    render(<VideoPlayer videoUrl="test.mp4" filename="test.mp4" />);
    expect(screen.getByTestId('video-metadata')).toBeInTheDocument();
  });
});
```

Create `src/renderer/hooks/useVideoPlayer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoPlayer } from './useVideoPlayer';

describe('useVideoPlayer Hook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useVideoPlayer());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.volume).toBe(1);
  });

  it('should toggle play state', () => {
    const { result } = renderHook(() => useVideoPlayer());

    act(() => {
      result.current.togglePlay();
    });

    expect(result.current.isPlaying).toBe(true);
  });

  it('should update volume', () => {
    const { result } = renderHook(() => useVideoPlayer());

    act(() => {
      result.current.setVolume(0.5);
    });

    expect(result.current.volume).toBe(0.5);
  });

  it('should toggle mute', () => {
    const { result } = renderHook(() => useVideoPlayer());

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(true);
  });
});
```

Create `src/main/file-manager.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { dialog } from 'electron';
import { selectVideoFile, getVideoMetadata } from './file-manager';

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

describe('File Manager', () => {
  it('should open file dialog with correct options', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['/path/to/video.mp4'],
    });

    const result = await selectVideoFile();

    expect(dialog.showOpenDialog).toHaveBeenCalledWith({
      properties: ['openFile'],
      filters: expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringMatching(/video/i),
          extensions: expect.arrayContaining(['mp4', 'webm', 'mkv']),
        }),
      ]),
    });

    expect(result).toBe('/path/to/video.mp4');
  });

  it('should return null when dialog canceled', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const result = await selectVideoFile();
    expect(result).toBeNull();
  });

  it('should extract video metadata', async () => {
    const metadata = await getVideoMetadata('/path/to/video.mp4');

    expect(metadata).toHaveProperty('filename');
    expect(metadata).toHaveProperty('path');
    expect(metadata).toHaveProperty('size');
  });
});
```

---

## Implementation Steps (Red-Green-Refactor)

### Step 1: Install Dependencies

```bash
npm install @vidstack/react
npm install hls.js
npm install media-icons
```

### Step 2: Create Test Video Asset

Create `test-assets/create-test-video.js`:

```javascript
// Script to generate a simple test video using canvas
// Run with: node test-assets/create-test-video.js
// Or download a sample video: https://sample-videos.com/
```

Download a sample MP4 video to `test-assets/sample-video.mp4` for testing.

### Step 3: Implement File Manager (Main Process)

Create `src/main/file-manager.ts`:

```typescript
import { dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export async function selectVideoFile(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Video Files',
        extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v'],
      },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

export async function getVideoMetadata(filePath: string) {
  const stats = await fs.stat(filePath);
  const filename = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase().slice(1);

  return {
    filename,
    path: filePath,
    size: stats.size,
    format: extension,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  };
}

export function getVideoFileUrl(filePath: string): string {
  // Convert file path to file:// URL
  return `file://${filePath}`;
}
```

### Step 4: Update IPC Handlers

Update `src/main/ipc-handlers.ts`:

```typescript
import { ipcMain } from 'electron';
import { selectVideoFile, getVideoMetadata, getVideoFileUrl } from './file-manager';

export function setupIpcHandlers() {
  // Existing ping handler
  ipcMain.handle('ping', async () => {
    return 'pong';
  });

  // Video file selection
  ipcMain.handle('select-video-file', async () => {
    const filePath = await selectVideoFile();
    if (!filePath) {
      return null;
    }

    const metadata = await getVideoMetadata(filePath);
    const url = getVideoFileUrl(filePath);

    return {
      ...metadata,
      url,
    };
  });

  // Get video metadata
  ipcMain.handle('get-video-metadata', async (event, filePath: string) => {
    return await getVideoMetadata(filePath);
  });
}
```

### Step 5: Update Preload API

Update `src/preload/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

export interface VideoFileData {
  filename: string;
  path: string;
  size: number;
  format: string;
  url: string;
  createdAt: Date;
  modifiedAt: Date;
}

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, func);
    },
  },
  video: {
    selectFile: () => ipcRenderer.invoke('select-video-file') as Promise<VideoFileData | null>,
    getMetadata: (path: string) => ipcRenderer.invoke('get-video-metadata', path),
  },
});
```

Update `src/preload/preload.d.ts`:

```typescript
import { VideoFileData } from './preload';

export interface IElectronAPI {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, func: (...args: any[]) => void) => void;
    removeListener: (channel: string, func: (...args: any[]) => void) => void;
  };
  video: {
    selectFile: () => Promise<VideoFileData | null>;
    getMetadata: (path: string) => Promise<VideoFileData>;
  };
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
```

### Step 6: Create Video Player Hook

Create `src/renderer/hooks/useVideoPlayer.ts`:

```typescript
import { useState, useCallback } from 'react';

interface UseVideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
}

export function useVideoPlayer() {
  const [state, setState] = useState<UseVideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
  });

  const togglePlay = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const setCurrentTime = useCallback((time: number) => {
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const setDuration = useCallback((duration: number) => {
    setState((prev) => ({ ...prev, duration }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setState((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  const seek = useCallback((time: number) => {
    setState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  return {
    ...state,
    togglePlay,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleMute,
    toggleFullscreen,
    seek,
  };
}
```

### Step 7: Create Video Player Component

Create `src/renderer/components/VideoPlayer.tsx`:

```typescript
import { useRef, useEffect } from 'react';
import { MediaPlayer, MediaProvider, useMediaStore } from '@vidstack/react';
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
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoUrl) return;

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
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

  return (
    <div className="video-player-container" data-testid="video-player" ref={playerRef}>
      <MediaPlayer
        src={videoUrl}
        autoPlay={false}
        className="video-player"
        onLoadedMetadata={(event) => {
          const target = event.target as HTMLVideoElement;
          if (onMetadataLoad) {
            onMetadataLoad({
              duration: target.duration,
              width: target.videoWidth,
              height: target.videoHeight,
            });
          }
        }}
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
```

Create `src/renderer/components/VideoPlayer.css`:

```css
.video-player-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  position: relative;
}

.video-player {
  flex: 1;
  width: 100%;
  height: 100%;
}

.video-player-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  color: #888;
  font-size: 1.2rem;
}

.video-info {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  color: #fff;
  font-size: 0.9rem;
  pointer-events: none;
  z-index: 10;
}

.video-metadata {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #2a2a2a;
  border-top: 1px solid #3a3a3a;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metadata-label {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
}

.metadata-value {
  font-size: 0.9rem;
  color: #fff;
}
```

### Step 8: Create File Selector Component

Create `src/renderer/components/FileSelector.tsx`:

```typescript
import { useState } from 'react';
import './FileSelector.css';

interface FileSelectorProps {
  onFileSelected: (fileData: any) => void;
}

export function FileSelector({ onFileSelected }: FileSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectFile = async () => {
    setIsSelecting(true);
    try {
      const fileData = await window.electron.video.selectFile();
      if (fileData) {
        onFileSelected(fileData);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="file-selector" data-testid="file-selector">
      <button
        onClick={handleSelectFile}
        disabled={isSelecting}
        data-testid="select-file-button"
        className="select-file-button"
      >
        {isSelecting ? 'Selecting...' : 'Select Video File'}
      </button>
      <p className="file-selector-hint">
        Supported formats: MP4, WebM, MKV, AVI, MOV
      </p>
    </div>
  );
}
```

Create `src/renderer/components/FileSelector.css`:

```css
.file-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
}

.select-file-button {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  background: #0066ff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.select-file-button:hover:not(:disabled) {
  background: #0052cc;
}

.select-file-button:disabled {
  background: #555;
  cursor: not-allowed;
}

.file-selector-hint {
  font-size: 0.875rem;
  color: #888;
  margin: 0;
}
```

### Step 9: Update App Component

Update `src/renderer/App.tsx`:

```typescript
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
        <h1>Vidmin Player</h1>
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
```

Update `src/renderer/App.css`:

```css
.app {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.app-header {
  padding: 1rem 2rem;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.change-file-button {
  padding: 0.5rem 1rem;
  background: #444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.change-file-button:hover {
  background: #555;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.video-metadata {
  display: flex;
  gap: 2rem;
  padding: 1rem 2rem;
  background: #2a2a2a;
  border-top: 1px solid #3a3a3a;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metadata-label {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metadata-value {
  font-size: 0.95rem;
  color: #fff;
  font-weight: 500;
}
```

---

## Acceptance Criteria

- [ ] File selection dialog opens with video file filters
- [ ] Selected video loads and displays in Vidstack player
- [ ] Play/pause buttons work correctly
- [ ] Seek slider allows navigation through video
- [ ] Volume slider controls audio level
- [ ] Mute/unmute button toggles audio
- [ ] Fullscreen button toggles fullscreen mode
- [ ] Video metadata displays (filename, duration, resolution, format, size)
- [ ] Keyboard shortcuts work (Space, Arrow keys, F, M)
- [ ] All Playwright E2E tests pass
- [ ] All Vitest unit tests pass
- [ ] TypeScript compilation succeeds with no errors
- [ ] Supports MP4, WebM, MKV, AVI, MOV formats

---

## Test Execution

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/video-player.spec.ts

# Debug tests
npx playwright test --debug
```

---

## Success Metrics

1. **All tests green**: 100% pass rate for E2E and unit tests
2. **Smooth playback**: Video plays without stuttering
3. **Responsive controls**: UI responds to user input within 100ms
4. **Accurate metadata**: All video information displayed correctly
5. **Keyboard navigation**: All shortcuts functional

---

## Next Phase

Once all tests pass and acceptance criteria are met, proceed to [Phase 3: URL Input & Download System](./phase3-downloads.md).
