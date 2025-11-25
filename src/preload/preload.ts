import { contextBridge, ipcRenderer, webUtils } from 'electron';

interface VideoFileData {
  filename: string;
  path: string;
  size: number;
  format: string;
  url: string;
  createdAt: Date;
  modifiedAt: Date;
}

interface DownloadProgress {
  id: string;
  url: string;
  progress: number;
  speed: number;
  eta: number;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'canceled';
  filename?: string;
  error?: string;
}

interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  format_note?: string;
  vcodec?: string;
  acodec?: string;
}

export type { VideoFileData, DownloadProgress, VideoFormat };

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: unknown[]) => void) => {
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    },
    removeListener: (channel: string, func: (...args: unknown[]) => void) => {
      ipcRenderer.removeListener(channel, func);
    },
  },
  video: {
    selectFile: () => ipcRenderer.invoke('select-video-file') as Promise<VideoFileData | null>,
    getMetadata: (path: string) => ipcRenderer.invoke('get-video-metadata', path),
    resizeWindowToVideo: (width: number, height: number) => ipcRenderer.invoke('resize-window-to-video', width, height) as Promise<void>,
  },
  file: {
    writeFile: (path: string, data: Uint8Array) => ipcRenderer.invoke('write-file', path, data) as Promise<void>,
    // Get the real filesystem path for a File object (required for Electron 32+)
    getPathForFile: (file: globalThis.File) => webUtils.getPathForFile(file),
  },
  download: {
    selectLocation: () => ipcRenderer.invoke('select-download-location') as Promise<string | null>,
    getDefaultLocation: () => ipcRenderer.invoke('get-default-download-location') as Promise<string>,
    checkYtDlp: () => ipcRenderer.invoke('check-yt-dlp') as Promise<{ isInstalled: boolean }>,
    validateUrl: (url: string) => ipcRenderer.invoke('validate-url', url) as Promise<{ isValid: boolean; source: string | null }>,
    fetchFormats: (url: string, cookiesFromBrowser?: string) => ipcRenderer.invoke('fetch-video-formats', url, cookiesFromBrowser) as Promise<VideoFormat[]>,
    start: (options: { url: string; downloadPath: string; filename: string; format: string }) => ipcRenderer.invoke('start-download', options) as Promise<{ success: boolean; downloadId?: string; error?: string }>,
    cancel: (id: string) => ipcRenderer.invoke('cancel-download', id) as Promise<{ success: boolean }>,
    getStatus: (id: string) => ipcRenderer.invoke('get-download-status', id) as Promise<DownloadProgress | null>,
    getAll: () => ipcRenderer.invoke('get-all-downloads') as Promise<DownloadProgress[]>,
    onProgress: (callback: (id: string, progress: DownloadProgress) => void) => {
      const listener = (_event: globalThis.Electron.IpcRendererEvent, id: string, progress: DownloadProgress) => callback(id, progress);
      ipcRenderer.on('download-progress', listener);
      return () => ipcRenderer.removeListener('download-progress', listener);
    },
    onComplete: (callback: (id: string, path: string) => void) => {
      const listener = (_event: globalThis.Electron.IpcRendererEvent, id: string, path: string) => callback(id, path);
      ipcRenderer.on('download-complete', listener);
      return () => ipcRenderer.removeListener('download-complete', listener);
    },
    onError: (callback: (id: string, error: string) => void) => {
      const listener = (_event: globalThis.Electron.IpcRendererEvent, id: string, error: string) => callback(id, error);
      ipcRenderer.on('download-error', listener);
      return () => ipcRenderer.removeListener('download-error', listener);
    },
  },
});
