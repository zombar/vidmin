export interface VideoFileData {
  filename: string;
  path: string;
  size: number;
  format: string;
  url: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface DownloadProgress {
  id: string;
  url: string;
  progress: number;
  speed: number;
  eta: number;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'canceled';
  filename?: string;
  error?: string;
}

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  format_note?: string;
  vcodec?: string;
  acodec?: string;
}

export interface IElectronAPI {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    on: (channel: string, func: (...args: unknown[]) => void) => void;
    removeListener: (channel: string, func: (...args: unknown[]) => void) => void;
  };
  video: {
    selectFile: () => Promise<VideoFileData | null>;
    getMetadata: (path: string) => Promise<VideoFileData>;
    resizeWindowToVideo: (width: number, height: number) => Promise<void>;
  };
  file: {
    writeFile: (path: string, data: Uint8Array) => Promise<void>;
    getPathForFile: (file: globalThis.File) => string;
  };
  download: {
    selectLocation: () => Promise<string | null>;
    getDefaultLocation: () => Promise<string>;
    checkYtDlp: () => Promise<{ isInstalled: boolean }>;
    validateUrl: (url: string) => Promise<{ isValid: boolean; source: string | null }>;
    fetchFormats: (url: string, cookiesFromBrowser?: string) => Promise<VideoFormat[]>;
    start: (options: { url: string; downloadPath: string; filename: string; format: string; cookiesFromBrowser?: string }) => Promise<{ success: boolean; downloadId?: string; error?: string }>;
    cancel: (id: string) => Promise<{ success: boolean }>;
    getStatus: (id: string) => Promise<DownloadProgress | null>;
    getAll: () => Promise<DownloadProgress[]>;
    onProgress: (callback: (id: string, progress: DownloadProgress) => void) => () => void;
    onComplete: (callback: (id: string, path: string) => void) => () => void;
    onError: (callback: (id: string, error: string) => void) => () => void;
  };
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
