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
