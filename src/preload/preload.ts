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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
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
